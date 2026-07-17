import { CheckIcon } from "@/components/planning/check-icon";

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

export const LOADING_STEP_COUNT =
  LOADING_STEPS.length;

export function LoadingPanel({
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
