"use client";

import {
  useEffect,
  useState,
} from "react";

import { CheckIcon } from "@/components/planning/check-icon";
import {
  LoadingPanel,
  LOADING_STEP_COUNT,
} from "@/components/planning/loading-panel";
import { PostCard } from "@/components/planning/post-card";

import type { ContentPlan } from "@/lib/schemas/content-plan";

interface ApiError {
  error?: string;
  details?: string;
}

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
          LOADING_STEP_COUNT - 1,
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
            {contentPlan.posts.map((post) => (
              <PostCard
                key={`${post.day}-${post.date}`}
                post={post}
              />
            ))}
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
