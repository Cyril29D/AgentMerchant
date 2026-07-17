"use client";

import Image from "next/image";
import { useState } from "react";

import { CheckIcon } from "@/components/planning/check-icon";
import { EvidenceAccordion } from "@/components/planning/evidence-accordion";

import type {
  ContentPost,
  Evidence,
} from "@/lib/schemas/content-plan";

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

export function PostCard({
  post,
}: {
  post: ContentPost;
}) {
  const isApproved =
    post.validation.status === "approved";
  const contextLabels = getContextLabels(
    post.evidence,
  );

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/8">
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

        <EvidenceAccordion evidence={post.evidence} />

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
}
