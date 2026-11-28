"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { PlatformOverview } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";

interface SandboxPlatformPulseProps {
  overview: PlatformOverview;
}

export default function SandboxPlatformPulse({ overview }: SandboxPlatformPulseProps) {
  const { t, n } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const maxDaily = useMemo(() => {
    if (!overview.trend || overview.trend.length === 0) return 1;
    return Math.max(1, ...overview.trend.map((d) => d.count));
  }, [overview.trend]);

  const metrics = [
    { label: t("feather-pulse-words-accepted"), value: overview.totals.words },
    { label: t("feather-pulse-articles-accepted"), value: overview.totals.articles },
    { label: t("feather-pulse-contributors"), value: overview.totals.people },
    { label: t("feather-pulse-wikis"), value: overview.totals.wikis },
    { label: t("feather-pulse-public-events"), value: overview.totals.contests },
  ];

  return (
    <section
      aria-label={t("feather-pulse-summary")}
      className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3.5 sm:px-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Clean Typographic Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6 flex-1">
          {metrics.map((m) => (
            <div key={m.label} className="min-w-0">
              <div className="text-lg sm:text-xl font-semibold tracking-tight tabular-nums text-foreground leading-none">
                {n(m.value)}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground truncate">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Subtle 30-day Sparkline + Expand Toggle */}
        <div className="flex items-center justify-between lg:justify-end gap-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40 shrink-0">
          {overview.trend && overview.trend.length > 0 && (
            <div className="flex items-end gap-[2px] h-7 w-28 sm:w-32" aria-hidden="true">
              {overview.trend.slice(-24).map((pt) => {
                const pct = Math.max(12, Math.round((pt.count / maxDaily) * 100));
                return (
                  <div
                    key={pt.date}
                    title={`${pt.date}: ${pt.count}`}
                    className="flex-1 rounded-t-[2px] bg-foreground/20 hover:bg-foreground/60 transition-colors"
                    style={{ height: `${pct}%` }}
                  />
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <span>{expanded ? t("feather-pulse-collapse") : t("feather-pulse-this-month")}</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Optional Monthly Breakdown */}
      {expanded && overview.month && (
        <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t("feather-pulse-this-month")}:</span>
          <span>
            <strong className="font-semibold text-foreground tabular-nums">{n(overview.month.words)}</strong>{" "}
            {t("feather-pulse-words-accepted")}
          </span>
          <span>
            <strong className="font-semibold text-foreground tabular-nums">{n(overview.month.entries)}</strong>{" "}
            {t("feather-pulse-articles-accepted")}
          </span>
          <span>
            <strong className="font-semibold text-foreground tabular-nums">{n(overview.month.people)}</strong>{" "}
            {t("feather-pulse-contributors")}
          </span>
        </div>
      )}
    </section>
  );
}
