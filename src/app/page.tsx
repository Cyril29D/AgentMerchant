"use client";

import Image from "next/image";
import {
  useEffect,
  useState,
} from "react";

import type {
  ContentPlan,
  Evidence,
} from "@/lib/schemas/content-plan";

interface ApiError {
  error?: string;
  details?: string;
}

const LOADING_STEPS = [
  {
    title: "Analyse du commerce",
    description:
      "Lecture du profil et des informations vérifiées.",
  },
  {
    title: "Récupération du contexte local",
    description:
      "Météo, calendrier et actualités pertinentes.",
  },
  {
    title: "Sélection des visuels",
    description:
      "Classement des photos par sujet et catégorie.",
  },
  {
    title: "Rédaction et validation",
    description:
      "Génération locale et contrôle des affirmations.",
  },
];

const EVIDENCE_LABELS: Record<
  Evidence["sourceType"],
  string
> = {
  merchant_profile: "Profil commerçant",
  product: "Produit vérifié",
  service: "Service vérifié",
  photo: "Photothèque",
  weather: "Météo locale",
  news: "Actualité locale",
  season: "Calendrier",
};

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(
    2,
    "0",
  );

  return `${year}-${month}-${day}`;
}

function getTomorrowDateString(): string {
  const tomorrow = new Date();

  tomorrow.setDate(
    tomorrow.getDate() + 1,
  );

  return getLocalDateString(tomorrow);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}

function getContextLabels(
  evidence: Evidence[],
): string[] {
  const labels = new Set<string>();

  for (const item of evidence) {
    if (item.sourceType === "weather") {
      labels.add("Météo");
    }

    if (item.sourceType === "season") {
      labels.add("Calendrier");
    }

    if (item.sourceType === "news") {
      labels.add("Actualité");
    }
  }

  return [...labels];
}

function BrandMark() {
  return (
    <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-900/15">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="size-6"
      >
        <path
          d="M5 10.5V19h14v-8.5M4 10.5l2-5h12l2 5M8 19v-5h4v5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 10.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0M5 10.5a2 2 0 0 0 2 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="size-4"
    >
      <path
        d="m5 10 3 3 7-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlanImage({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  const [hasFailed, setHasFailed] =
    useState(false);

  if (!src || hasFailed) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-500">
        Aucun fichier image disponible pour ce visuel.
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover transition duration-500 hover:scale-[1.02]"
        sizes="(max-width: 1024px) 100vw, 50vw"
        onError={() => setHasFailed(true)}
      />
    </div>
  );
}

function LoadingPanel({
  activeStep,
}: {
  activeStep: number;
}) {
  return (
    <section
      aria-live="polite"
      aria-busy="true"
      className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
        <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-6 sm:px-8">
          <div className="flex items-center gap-4">
            <span className="relative flex size-11 items-center justify-center rounded-full bg-blue-600 text-white">
              <span className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20" />
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="size-5 animate-spin"
              >
                <path
                  d="M12 3a9 9 0 1 1-9 9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            <div>
              <p className="text-sm font-semibold text-blue-700">
                Pipeline multi-agents en cours
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
                Création de votre planning éditorial
              </h2>
            </div>
          </div>
        </div>

        <ol className="space-y-1 p-4 sm:p-6">
          {LOADING_STEPS.map((step, index) => {
            const isComplete = index < activeStep;
            const isActive = index === activeStep;

            return (
              <li
                key={step.title}
                className={`flex gap-4 rounded-2xl px-4 py-4 transition-colors ${
                  isActive
                    ? "bg-blue-50"
                    : "bg-transparent"
                }`}
              >
                <span
                  className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                    isComplete
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : isActive
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {isComplete ? (
                    <CheckIcon />
                  ) : (
                    index + 1
                  )}
                </span>

                <div>
                  <p
                    className={`font-semibold ${
                      isActive
                        ? "text-blue-950"
                        : isComplete
                          ? "text-slate-700"
                          : "text-slate-400"
                    }`}
                  >
                    {step.title}…
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default function Home() {
  const [startDate, setStartDate] = useState(
    getTomorrowDateString(),
  );
  const [contentPlan, setContentPlan] =
    useState<ContentPlan | null>(null);
  const [isLoading, setIsLoading] =
    useState(false);
  const [loadingStep, setLoadingStep] =
    useState(0);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingStep((currentStep) =>
        Math.min(
          currentStep + 1,
          LOADING_STEPS.length - 1,
        ),
      );
    }, 900);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  async function generatePlan(): Promise<void> {
    setIsLoading(true);
    setLoadingStep(0);
    setError(null);
    setContentPlan(null);

    try {
      const response = await fetch(
        "/api/generate-plan",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            startDate,
          }),
        },
      );

      const result =
        (await response.json()) as
          | ContentPlan
          | ApiError;

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

  const approvedPostCount =
    contentPlan?.posts.filter(
      (post) =>
        post.validation.status === "approved",
    ).length ?? 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <header className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_48%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.10),_transparent_42%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between border-b border-slate-100 py-5">
            <div className="flex items-center gap-3">
              <BrandMark />
              <div>
                <p className="text-lg font-bold tracking-tight">
                  AgentMerchant
                </p>
                <p className="text-xs font-medium text-slate-500">
                  Communication locale augmentée
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 sm:flex">
              <span className="size-2 rounded-full bg-emerald-500" />
              IA locale · données vérifiées
            </div>
          </nav>

          <div className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-800">
                <span className="size-1.5 rounded-full bg-blue-600" />
                Planning multi-agents
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-[-0.035em] text-slate-950 sm:text-5xl lg:text-6xl lg:leading-[1.08]">
                Votre planning éditorial,
                <span className="text-blue-700">
                  {" "}généré et vérifié
                </span>
                {" "}en quelques secondes.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Cinq publications prêtes à être relues, fondées sur les données réelles de votre commerce, le contexte local et votre propre photothèque.
              </p>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600">
                {["Contenus vérifiés", "Visuels pertinents", "Mode de secours intégré"].map(
                  (benefit) => (
                    <span
                      key={benefit}
                      className="flex items-center gap-2"
                    >
                      <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <CheckIcon />
                      </span>
                      {benefit}
                    </span>
                  ),
                )}
              </div>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                    Configuration du planning
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                    Préparer les 5 prochains jours
                  </h2>
                </div>
                <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                  5 jours
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Commerce
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    Boulangerie Martin
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Ville
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    Montpellier
                  </p>
                </div>
              </div>

              <label className="mt-5 block text-sm font-semibold text-slate-800">
                Date de début
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(event.target.value)
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <button
                type="button"
                onClick={generatePlan}
                disabled={isLoading || !startDate}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-slate-400 disabled:shadow-none"
              >
                {isLoading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Génération en cours
                  </>
                ) : (
                  <>
                    Générer mon planning
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                Aucun contenu n’est affiché sans validation préalable.
              </p>

              {error && (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                  <p className="font-bold">
                    La génération a échoué
                  </p>
                  <p className="mt-1 leading-6">
                    {error}
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </header>

      {isLoading ? (
        <LoadingPanel activeStep={loadingStep} />
      ) : contentPlan ? (
        <section
          id="planning"
          className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
        >
          <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                Planning prêt à être relu
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {contentPlan.merchantName}
              </h2>
              <p className="mt-3 text-sm text-slate-500">
                {contentPlan.posts.length} publications générées · {approvedPostCount} validées
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
              <span className="flex size-9 items-center justify-center rounded-full bg-emerald-600 text-white">
                <CheckIcon />
              </span>
              <div>
                <p className="text-xs font-medium text-emerald-700">
                  Contrôle qualité
                </p>
                <p className="text-sm font-bold">
                  {approvedPostCount}/{contentPlan.posts.length} contenus approuvés
                </p>
              </div>
            </div>
          </div>

          <div className="my-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">
                Agent météo
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {contentPlan.contextStatus.weather === "available"
                  ? "Contexte disponible"
                  : "Mode dégradé"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {contentPlan.contextStatus.weatherContextCount} contenu(s) enrichi(s)
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">
                Agent calendrier
              </p>
              <p className="mt-1 font-bold text-slate-900">
                Calendrier analysé
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {contentPlan.contextStatus.calendarContextCount} contenu(s) enrichi(s)
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">
                Agent actualités
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {contentPlan.contextStatus.newsCandidateCount} article(s) analysé(s)
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {contentPlan.contextStatus.newsContextCount} contenu(s) enrichi(s)
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">
                Agent rédacteur
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {contentPlan.contextStatus.writer === "ollama"
                  ? "IA locale"
                  : "Mode sécurisé"}
              </p>
              <p className="mt-2 truncate text-xs text-slate-500">
                {contentPlan.contextStatus.writerModel ?? "Textes déterministes"}
              </p>
            </div>
          </div>

          {contentPlan.contextStatus.warnings.length > 0 && (
            <div className="mb-8 space-y-3">
              {contentPlan.contextStatus.warnings.map(
                (warning) => (
                  <p
                    key={warning}
                    className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
                  >
                    {warning}
                  </p>
                ),
              )}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {contentPlan.posts.map((post) => {
              const isApproved =
                post.validation.status ===
                "approved";
              const contextLabels =
                getContextLabels(post.evidence);

              return (
                <article
                  key={`${post.day}-${post.date}`}
                  className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/8"
                >
                  <div className="relative">
                    <PlanImage
                      src={post.imagePath}
                      alt={post.topic}
                    />
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-slate-950/65 to-transparent p-4 sm:p-5">
                      <span className="rounded-full border border-white/30 bg-slate-950/45 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                        Jour {post.day} · {formatDate(post.date)}
                      </span>
                      <span
                        className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur ${
                          isApproved
                            ? "bg-emerald-500 text-white"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {isApproved && <CheckIcon />}
                        {isApproved ? "Validé" : "À revoir"}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                        {post.objective}
                      </span>
                      {contextLabels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800"
                        >
                          {label}
                        </span>
                      ))}
                    </div>

                    <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
                      {post.topic}
                    </h3>

                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                          Légende proposée
                        </p>
                        <span className="text-xs text-slate-400">
                          {post.caption.length} caractères
                        </span>
                      </div>
                      <p className="mt-3 text-[15px] leading-7 text-slate-800">
                        {post.caption}
                      </p>
                    </div>

                    {post.context.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-800">
                          Contexte local utilisé
                        </p>
                        <ul className="mt-2 space-y-1.5 text-sm leading-6 text-sky-950">
                          {post.context.map((context) => (
                            <li
                              key={context}
                              className="flex gap-2"
                            >
                              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sky-500" />
                              {context}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 flex items-start gap-3 rounded-2xl bg-blue-50/70 p-4">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          fill="none"
                          className="size-4"
                        >
                          <path
                            d="M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5v-9Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="m4 14 4-4 2.5 2.5 2-2L16 14M13.5 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">
                          Choix du visuel
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          {post.imageReason}
                        </p>
                      </div>
                    </div>

                    <details className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white open:bg-slate-50">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-800 marker:hidden">
                        <span className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-600">
                            {post.evidence.length}
                          </span>
                          Preuves utilisées
                        </span>
                        <span
                          aria-hidden="true"
                          className="text-slate-400"
                        >
                          +
                        </span>
                      </summary>

                      <div className="space-y-3 border-t border-slate-200 p-4">
                        {post.evidence.map((evidence) => (
                          <div
                            key={`${evidence.sourceType}-${evidence.sourceId}`}
                            className="rounded-xl border border-slate-200 bg-white p-3.5 text-sm"
                          >
                            <p className="font-bold text-slate-800">
                              {EVIDENCE_LABELS[evidence.sourceType]}
                            </p>
                            <p className="mt-1.5 leading-6 text-slate-600">
                              {evidence.claim}
                            </p>
                            {evidence.sourceName && (
                              <p className="mt-2 text-xs text-slate-500">
                                Source : {evidence.sourceName}
                              </p>
                            )}
                            {evidence.sourceUrl && (
                              <a
                                href={evidence.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex min-h-8 items-center text-sm font-bold text-blue-700 hover:underline"
                              >
                                Consulter la source ↗
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>

                    {!isApproved && (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-bold text-red-900">
                          Points à revoir
                        </p>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-red-800">
                          {post.validation.warnings.map(
                            (warning) => (
                              <li key={warning}>
                                {warning}
                              </li>
                            ),
                          )}
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
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Contexte analysé",
                text: "Le commerce, la météo, le calendrier et les actualités sont croisés.",
              },
              {
                number: "02",
                title: "Contenu composé",
                text: "Chaque jour reçoit un objectif, une légende et un visuel pertinent.",
              },
              {
                number: "03",
                title: "Affirmations vérifiées",
                text: "Les preuves sont contrôlées avant l’affichage du planning final.",
              },
            ].map((item) => (
              <article
                key={item.number}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <span className="text-xs font-bold tracking-[0.16em] text-blue-700">
                  ÉTAPE {item.number}
                </span>
                <h2 className="mt-3 text-lg font-bold text-slate-950">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>AgentMerchant · Prototype multi-agents local</p>
          <p>Les contenus restent soumis à validation humaine.</p>
        </div>
      </footer>
    </main>
  );
}
