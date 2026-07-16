import type { Photo } from "@/lib/schemas/photo";

export interface VisualSelection {
  photo: Photo;
  score: number;
  reason: string;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR");
}

function extractKeywords(value: string): string[] {
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
  ]);

  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3)
    .filter((word) => !ignoredWords.has(word));
}

function calculatePhotoScore(
  photo: Photo,
  searchText: string,
  alreadyUsed: boolean,
): number {
  const keywords = extractKeywords(searchText);
  const normalizedDescription = normalize(photo.description);
  const normalizedFilename = normalize(photo.filename);
  const normalizedTags = photo.tags.map(normalize);

  let score = 0;

  for (const keyword of keywords) {
    if (
      normalizedTags.some(
        (tag) => tag === keyword || tag.includes(keyword) || keyword.includes(tag),
      )
    ) {
      score += 4;
    }

    if (normalizedDescription.includes(keyword)) {
      score += 2;
    }

    if (normalizedFilename.includes(keyword)) {
      score += 1;
    }
  }

  if (alreadyUsed) {
    score -= 3;
  }

  return score;
}

export function selectBestPhoto(
  photos: Photo[],
  searchText: string,
  usedPhotoIds: Set<string>,
): VisualSelection {
  if (photos.length === 0) {
    throw new Error("La bibliothèque de photos est vide.");
  }

  const rankedPhotos = photos
    .map((photo) => ({
      photo,
      score: calculatePhotoScore(
        photo,
        searchText,
        usedPhotoIds.has(photo.id),
      ),
    }))
    .sort((first, second) => second.score - first.score);

  const selectedPhoto = rankedPhotos[0];

  return {
    photo: selectedPhoto.photo,
    score: selectedPhoto.score,
    reason:
      selectedPhoto.score > 0
        ? "Le contenu, la description et les tags de cette photo correspondent au sujet."
        : "Aucune correspondance forte trouvée : utilisation du meilleur visuel disponible.",
  };
}
