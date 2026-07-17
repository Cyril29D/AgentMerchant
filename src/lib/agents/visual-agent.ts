import type {
  Photo,
  PhotoCategory,
} from "@/lib/schemas/photo";

export interface VisualSelection {
  photo: Photo;
  score: number;
  reason: string;
  reused: boolean;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR");
}

function extractKeywords(
  value: string,
): string[] {
  const ignoredWords = new Set([
    "avec",
    "chez",
    "dans",
    "pour",
    "cette",
    "notre",
    "votre",
    "mettre",
    "avant",
    "presenter",
    "produit",
    "service",
    "commerce",
    "aujourd",
    "hui",
    "rendez",
    "vous",
  ]);

  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3)
    .filter(
      (word) =>
        !ignoredWords.has(word),
    );
}

function calculatePhotoScore(
  photo: Photo,
  searchText: string,
  preferredCategory: PhotoCategory,
): number {
  const keywords =
    extractKeywords(searchText);

  const normalizedDescription =
    normalize(photo.description);

  const normalizedFilename =
    normalize(photo.filename);

  const normalizedTags =
    photo.tags.map(normalize);

  let score = 0;

  if (
    photo.category ===
    preferredCategory
  ) {
    score += 10;
  }

  for (const keyword of keywords) {
    if (
      normalizedTags.some(
        (tag) =>
          tag === keyword ||
          tag.includes(keyword) ||
          keyword.includes(tag),
      )
    ) {
      score += 4;
    }

    if (
      normalizedDescription.includes(
        keyword,
      )
    ) {
      score += 2;
    }

    if (
      normalizedFilename.includes(
        keyword,
      )
    ) {
      score += 1;
    }
  }

  return score;
}

function rankPhotos(
  photos: Photo[],
  searchText: string,
  preferredCategory: PhotoCategory,
): Array<{
  photo: Photo;
  score: number;
}> {
  return photos
    .map((photo) => ({
      photo,
      score: calculatePhotoScore(
        photo,
        searchText,
        preferredCategory,
      ),
    }))
    .sort(
      (first, second) =>
        second.score - first.score,
    );
}

export function selectBestPhoto(
  photos: Photo[],
  searchText: string,
  usedPhotoIds: Set<string>,
  preferredCategory: PhotoCategory,
): VisualSelection {
  if (photos.length === 0) {
    throw new Error(
      "La bibliothèque de photos est vide.",
    );
  }

  const unusedPhotos =
    photos.filter(
      (photo) =>
        !usedPhotoIds.has(photo.id),
    );

  const rankedUnusedPhotos =
    rankPhotos(
      unusedPhotos,
      searchText,
      preferredCategory,
    );

  const bestUnusedPhoto =
    rankedUnusedPhotos[0];

  /*
   * On choisit d’abord une photo inédite,
   * à condition qu’elle possède une
   * correspondance minimale.
   */
  if (
    bestUnusedPhoto &&
    bestUnusedPhoto.score > 0
  ) {
    return {
      photo: bestUnusedPhoto.photo,
      score: bestUnusedPhoto.score,
      reused: false,
      reason:
        "Ce visuel correspond au sujet, à la catégorie attendue et aux mots-clés de la publication.",
    };
  }

  /*
   * Si aucune image inédite n’est pertinente,
   * on autorise la réutilisation du meilleur
   * visuel disponible.
   */
  const rankedAllPhotos =
    rankPhotos(
      photos,
      searchText,
      preferredCategory,
    );

  const selectedPhoto =
    rankedAllPhotos[0];

  if (!selectedPhoto) {
    throw new Error(
      "Aucun visuel n’a pu être sélectionné.",
    );
  }

  return {
    photo: selectedPhoto.photo,
    score: selectedPhoto.score,
    reused:
      usedPhotoIds.has(
        selectedPhoto.photo.id,
      ),
    reason:
      usedPhotoIds.has(
        selectedPhoto.photo.id,
      )
        ? "Ce visuel est réutilisé car aucune autre image disponible n’était suffisamment pertinente."
        : "Ce visuel est le plus pertinent parmi les images disponibles.",
  };
}
