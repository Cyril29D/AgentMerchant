"use client";

import Image from "next/image";
import { useState } from "react";

import type { ContentPlan } from "@/lib/schemas/content-plan";

interface ApiError {
  error?: string;
  details?: string;
}

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTomorrowDateString(): string {
  const tomorrow = new Date();

  tomorrow.setDate(
    tomorrow.getDate() + 1,
  );

  return getLocalDateString(tomorrow);
}

function PlanImage({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  const [hasFailed, setHasFailed] = useState(false);

  if (!src || hasFailed) {
    return (
      <div className="flex h-52 items-center justify-center bg-zinc-100 px-6 text-center text-sm text-zinc-500">
        Aucun fichier image disponible pour ce visuel.
      </div>
    );
  }

  return (
    <div className="relative h-52 overflow-hidden bg-zinc-100">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
        onError={() => setHasFailed(true)}
      />
    </div>
  );
}

export default function Home() {
  const [startDate, setStartDate] = useState(
    getTomorrowDateString(),
  );

  const [contentPlan, setContentPlan] =
    useState<ContentPlan | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generatePlan(): Promise<void> {
    setIsLoading(true);
    setError(null);
    setContentPlan(null);

    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
        }),
      });

      const result = (await response.json()) as ContentPlan | ApiError;

      if (!response.ok) {
        const apiError = result as ApiError;

        throw new Error(
          apiError.details ??
            apiError.error ??
            "Le planning n’a pas pu être généré.",
        );
      }

      setContentPlan(result as ContentPlan);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Une erreur inconnue est survenue.";

      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Agent merchant
          </p>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Cinq jours de contenu pour un commerce local
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600">
            Le prototype analyse les informations vérifiées du
            commerçant, prépare un planning éditorial et sélectionne
            les visuels les plus pertinents.
          </p>

          <div className="mt-10 flex max-w-xl flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-2 text-sm font-medium">
              Date de début

              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <button
              type="button"
              onClick={generatePlan}
              disabled={isLoading || !startDate}
              className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {isLoading
                ? "Génération..."
                : "Générer le planning"}
            </button>
          </div>

          {error && (
            <div className="mt-6 max-w-xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p className="font-semibold">
                La génération a échoué
              </p>

              <p className="mt-1">{error}</p>
            </div>
          )}
        </div>
      </section>

      {contentPlan ? (
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-8">
            <p className="text-sm font-medium text-zinc-500">
              Planning généré pour
            </p>

            <h2 className="mt-1 text-3xl font-bold">
              {contentPlan.merchantName}
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              {contentPlan.posts.length} propositions de contenu
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span
                className={
                  contentPlan.contextStatus.weather === "available"
                    ? "rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800"
                    : "rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800"
                }
              >
                Météo:{" "}
                {contentPlan.contextStatus.weather === "available"
                  ? "disponible"
                  : "indisponible"}
              </span>

              <span className="rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-800">
                Calendrier : disponible
              </span>

              <span className="text-zinc-500">
                {
                  contentPlan.contextStatus
                    .calendarContextCount
                } publication(s) liée(s) au calendrier
              </span>

              <span
                className={
                  contentPlan.contextStatus.news ===
                  "available"
                    ? "rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800"
                    : "rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800"
                }
              >
                Actualités :{" "}
                {contentPlan.contextStatus.news ===
                "available"
                  ? "disponibles"
                  : "indisponibles"}
              </span>

              <span className="text-zinc-500">
                {
                  contentPlan.contextStatus
                    .newsCandidateCount
                } article(s) analysé(s)
              </span>

              <span className="text-zinc-500">
                {
                  contentPlan.contextStatus
                    .newsContextCount
                } publication(s) enrichie(s)
              </span>

              <span
                className={
                  contentPlan.contextStatus.writer ===
                  "ollama"
                    ? "rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-800"
                    : "rounded-full bg-zinc-200 px-3 py-1 font-medium text-zinc-700"
                }
              >
                Rédaction :{" "}
                {contentPlan.contextStatus.writer ===
                "ollama"
                  ? `IA locale · ${
                      contentPlan.contextStatus
                        .writerModel ??
                      "Ollama"
                    }`
                  : "mode de secours"}
              </span>

              <span className="text-zinc-500">
                {contentPlan.contextStatus.weatherContextCount} publication(s)
                enrichie(s)
              </span>
            </div>

            {contentPlan.contextStatus.warnings.map((warning) => (
              <p
                key={warning}
                className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
              >
                {warning}
              </p>
            ))}
          </div>

          <div className="grid gap-7 lg:grid-cols-2">
            {contentPlan.posts.map((post) => {
              const isApproved =
                post.validation.status === "approved";

              return (
                <article
                  key={`${post.day}-${post.date}`}
                  className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
                >
                  <PlanImage
                    src={post.imagePath}
                    alt={post.topic}
                  />

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-blue-700">
                          Jour {post.day} · {post.date}
                        </p>

                        <h3 className="mt-1 text-2xl font-bold">
                          {post.topic}
                        </h3>
                      </div>

                      <span
                        className={
                          isApproved
                            ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
                            : "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800"
                        }
                      >
                        {isApproved ? "Validé" : "Rejeté"}
                      </span>
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Objectif
                      </p>

                      <p className="mt-1 text-sm text-zinc-700">
                        {post.objective}
                      </p>
                    </div>

                    {post.context.length > 0 && (
                      <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">
                          Contexte local utilisé
                        </p>

                        <ul className="mt-2 space-y-1 text-sm text-sky-900">
                          {post.context.map((context) => (
                            <li key={context}>{context}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-5 rounded-xl bg-zinc-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Publication proposée
                      </p>

                      <p className="mt-2 leading-7 text-zinc-800">
                        {post.caption}
                      </p>
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Visuel sélectionné
                      </p>

                      <p className="mt-1 text-sm text-zinc-700">
                        {post.imageReason}
                      </p>
                    </div>

                    <details className="mt-5 rounded-xl border border-zinc-200 p-4">
                      <summary className="cursor-pointer text-sm font-semibold">
                        Voir les preuves utilisées
                      </summary>

                      <div className="mt-4 space-y-3">
                        {post.evidence.map((evidence) => (
                          <div
                            key={`${evidence.sourceType}-${evidence.sourceId}`}
                            className="rounded-lg bg-zinc-50 p-3 text-sm"
                          >
                            <p className="font-semibold text-zinc-800">
                              {evidence.sourceType}
                            </p>

                            <p className="mt-1 text-zinc-600">
                              {evidence.claim}
                            </p>

                            {evidence.sourceName && (
                              <p className="mt-2 text-xs text-zinc-500">
                                Source : {evidence.sourceName}
                              </p>
                            )}

                            {evidence.sourceUrl && (
                              <a
                                href={evidence.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline"
                              >
                                Consulter la source
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>

                    {!isApproved && (
                      <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-semibold text-red-800">
                          Problèmes détectés
                        </p>

                        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-700">
                          {post.validation.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
            <h2 className="text-xl font-semibold">
              Aucun planning généré
            </h2>

            <p className="mt-2 text-zinc-500">
              Choisis une date puis clique sur « Générer le planning ».
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
