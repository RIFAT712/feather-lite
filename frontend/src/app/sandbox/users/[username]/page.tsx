"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";
import { MOCK_ARTICLES } from "@/app/sandbox/_lib/mock-data";

export default function SandboxUserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const decoded = decodeURIComponent(username);
  const { t, n } = useI18n();

  const stats = [
    { label: t("feather-contest-submitted"), value: 26 },
    { label: t("feather-contest-filter-accepted"), value: 24 },
    { label: t("feather-contest-col-words"), value: 18420 },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Link
        href="/sandbox"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>{t("feather-nav-contests")}</span>
      </Link>

      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-semibold uppercase text-foreground">
          {decoded.slice(0, 1)}
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{decoded}</h1>
          <p className="text-xs text-muted-foreground">Wikimedia Contributor</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 p-4 space-y-1">
            <div className="text-xl font-semibold tabular-nums">{n(s.value)}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Recent Contributions</h2>
        <div className="rounded-xl border border-border/50 divide-y divide-border/40">
          {MOCK_ARTICLES.map((art) => (
            <div key={art.id} className="flex items-center justify-between px-4 py-3 text-xs">
              <span className="font-medium text-foreground">{art.title}</span>
              <span className="text-muted-foreground tabular-nums">{n(art.word_count)} words</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
