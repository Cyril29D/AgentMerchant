import type { Evidence } from "@/lib/schemas/content-plan";

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

export function EvidenceAccordion({
  evidence,
}: {
  evidence: Evidence[];
}) {
  return (
    <details className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white open:bg-slate-50">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-800 marker:hidden">
        <span className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-600">
            {evidence.length}
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
        {evidence.map((item) => (
          <div
            key={`${item.sourceType}-${item.sourceId}`}
            className="rounded-xl border border-slate-200 bg-white p-3.5 text-sm"
          >
            <p className="font-bold text-slate-800">
              {EVIDENCE_LABELS[item.sourceType]}
            </p>
            <p className="mt-1.5 leading-6 text-slate-600">
              {item.claim}
            </p>
            {item.sourceName && (
              <p className="mt-2 text-xs text-slate-500">
                Source : {item.sourceName}
              </p>
            )}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
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
  );
}
