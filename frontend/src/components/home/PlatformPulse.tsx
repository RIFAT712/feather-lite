"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPlatformOverview, PlatformOverview } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Infinity as InfinityIcon,
  Calendar,
  AlignJustify,
  FileText,
  Users,
  Globe,
  Upload,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/**
 * Silky smooth cubic ease-out counter matching 60 FPS performance.
 * Initializes immediately to SSR value to prevent jarring 0-count flashes.
 * Curve: startVal + (value - startVal) * (1 - Math.pow(1 - progress, 3)) over 650ms.
 */
function SmoothCount({ value, formatFn }: { value: number; formatFn: (v: number) => string }) {
  const [displayValue, setDisplayValue] = useState<number>(() => value || 0);
  const animRef = useRef<number | null>(null);
  const prevValueRef = useRef<number>(value || 0);
  const hasMountedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      prevValueRef.current = value || 0;
      setDisplayValue(value || 0);
      return;
    }

    if (!value || value <= 0) {
      setDisplayValue(0);
      prevValueRef.current = 0;
      return;
    }

    if (value === prevValueRef.current) {
      return;
    }

    const startVal = prevValueRef.current || 0;
    prevValueRef.current = value;
    let startTime: number | null = null;
    const duration = 650; // ms

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease-out
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (value - startVal) * easeOut);
      setDisplayValue(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [value]);

  return <span suppressHydrationWarning>{formatFn(displayValue)}</span>;
}

export interface PlatformPulseProps {
  initialOverview?: PlatformOverview | null;
}

export default function PlatformPulse({ initialOverview }: PlatformPulseProps) {
  const { t, n } = useI18n();
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Initialize collapse state from localStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("feather_pulse_collapsed");
      if (saved === "true") {
        setCollapsed(true);
      }
    } catch {
      // Ignore localStorage read errors in private browsing
    }
  }, []);

  const toggleCollapse = (next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem("feather_pulse_collapsed", String(next));
    } catch {
      // Ignore localStorage write errors
    }
  };

  const { data, isLoading } = useQuery<PlatformOverview>({
    queryKey: ["platformOverview"],
    queryFn: fetchPlatformOverview,
    initialData: initialOverview || undefined,
    initialDataUpdatedAt: initialOverview ? Date.now() : undefined,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const maxDaily = useMemo(() => {
    if (!data?.trend || data.trend.length === 0) return 1;
    return Math.max(1, ...data.trend.map((item) => item.count));
  }, [data?.trend]);

  // Collapsed Minimalist Bar
  if (collapsed) {
    return (
      <aside
        aria-label={t("feather-pulse-summary")}
        className="w-full my-2.5 py-2 px-3.5 sm:px-4 rounded-xl bg-card/40 border border-border/50 flex items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2 min-w-0 overflow-x-auto no-scrollbar py-0.5 text-muted-foreground">
          <span className="flex items-center gap-1.5 font-semibold text-foreground shrink-0">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span>{t("feather-pulse-summary")}</span>
          </span>
          <span className="text-border shrink-0">·</span>
          <span className="shrink-0">
            <strong className="text-foreground font-semibold">
              {n(data?.totals?.words ?? 0)}
            </strong>{" "}
            {t("feather-pulse-words-accepted")}
          </span>
          <span className="text-border shrink-0">·</span>
          <span className="shrink-0">
            <strong className="text-foreground font-semibold">
              {n(data?.totals?.articles ?? 0)}
            </strong>{" "}
            {t("feather-pulse-articles-accepted")}
          </span>
          <span className="text-border shrink-0">·</span>
          <span className="shrink-0">
            <strong className="text-foreground font-semibold">
              {n(data?.totals?.people ?? 0)}
            </strong>{" "}
            {t("feather-pulse-contributors")}
          </span>
          <span className="text-border shrink-0">·</span>
          <span className="shrink-0">
            <strong className="text-foreground font-semibold">
              {n(data?.totals?.wikis ?? 0)}
            </strong>{" "}
            {t("feather-pulse-wikis")}
          </span>
          <span className="text-border shrink-0">·</span>
          <span className="shrink-0">
            <strong className="text-foreground font-semibold">
              {n(data?.totals?.contests ?? 0)}
            </strong>{" "}
            {t("feather-pulse-public-events")}
          </span>
        </div>
        <button
          onClick={() => toggleCollapse(false)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground shrink-0 px-2 py-0.5 rounded hover:bg-muted/60 transition-colors cursor-pointer"
          title={t("feather-pulse-expand")}
          aria-label={t("feather-pulse-expand")}
        >
          <span className="hidden sm:inline">{t("feather-pulse-expand")}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </aside>
    );
  }

  // Loading Skeleton State
  if (isLoading) {
    return (
      <aside
        aria-label={t("feather-pulse-summary")}
        className="w-full my-3 py-3 px-3.5 sm:px-5 rounded-xl bg-card/40 border border-border/50"
      >
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
            <Skeleton className="h-3.5 w-24 rounded" />
          </div>
          <Skeleton className="h-4 w-14 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 divide-y lg:divide-y-0 lg:divide-x divide-border/40">
          {/* Col 1 Skeleton */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 sm:gap-2.5 ${
                    i === 5 ? "col-span-2 sm:col-span-1" : ""
                  }`}
                >
                  <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shrink-0" />
                  <div className="space-y-1 min-w-0 flex-1">
                    <Skeleton className="h-4 w-14 rounded" />
                    <Skeleton className="h-2.5 w-10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2 Skeleton */}
          <div className="pt-3 lg:pt-0 lg:pl-6 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shrink-0" />
                  <div className="space-y-1 min-w-0 flex-1">
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="h-2.5 w-10 rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2 space-y-1">
              <div className="flex items-end gap-1 h-6">
                {[...Array(30)].map((_, i) => (
                  <Skeleton key={i} className="flex-1 rounded-t-[2px] h-[35%]" />
                ))}
              </div>
              <Skeleton className="h-2.5 w-28 rounded" />
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Expanded Compact Hero Card (~135px height on desktop, ~160px on mobile)
  return (
    <aside
      aria-label={t("feather-pulse-summary")}
      className="w-full my-3 py-3 px-3.5 sm:px-5 rounded-xl bg-card/40 border border-border/50 relative"
    >
      {/* Sleek Top Header Bar with Collapse Action */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border/40">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span>{t("feather-pulse-summary")}</span>
        </div>
        <button
          onClick={() => toggleCollapse(true)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-muted/60 transition-colors cursor-pointer"
          title={t("feather-pulse-collapse")}
          aria-label={t("feather-pulse-collapse")}
        >
          <span className="hidden sm:inline">{t("feather-pulse-collapse")}</span>
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 divide-y lg:divide-y-0 lg:divide-x divide-border/40">
        {/* Column 1: All Time (সব সময়) */}
        <div className="space-y-2 sm:space-y-2.5">
          <div className="flex items-center gap-1.5 text-primary font-bold text-xs tracking-tight select-none">
            <InfinityIcon className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>{t("feather-pulse-all-time")}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-2.5">
            {/* 1. Words Accepted */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-500/12 text-blue-600 dark:text-blue-400">
                <AlignJustify className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0">
                <b className="block text-base sm:text-lg font-bold tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.totals?.words ?? 0} formatFn={n} />
                </b>
                <small className="block text-[10px] sm:text-[11px] text-muted-foreground font-medium mt-0.5 truncate">
                  {t("feather-pulse-words-accepted")}
                </small>
              </div>
            </div>

            {/* 2. Articles Accepted */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0">
                <b className="block text-base sm:text-lg font-bold tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.totals?.articles ?? 0} formatFn={n} />
                </b>
                <small className="block text-[10px] sm:text-[11px] text-muted-foreground font-medium mt-0.5 truncate">
                  {t("feather-pulse-articles-accepted")}
                </small>
              </div>
            </div>

            {/* 3. Contributors */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 bg-rose-500/12 text-rose-600 dark:text-rose-400">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0">
                <b className="block text-base sm:text-lg font-bold tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.totals?.people ?? 0} formatFn={n} />
                </b>
                <small className="block text-[10px] sm:text-[11px] text-muted-foreground font-medium mt-0.5 truncate">
                  {t("feather-pulse-contributors")}
                </small>
              </div>
            </div>

            {/* 4. Wikis */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 bg-cyan-500/12 text-cyan-600 dark:text-cyan-400">
                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0">
                <b className="block text-base sm:text-lg font-bold tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.totals?.wikis ?? 0} formatFn={n} />
                </b>
                <small className="block text-[10px] sm:text-[11px] text-muted-foreground font-medium mt-0.5 truncate">
                  {t("feather-pulse-wikis")}
                </small>
              </div>
            </div>

            {/* 5. Public Events */}
            <div className="col-span-2 sm:col-span-1 flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 bg-indigo-500/12 text-indigo-600 dark:text-indigo-400">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0">
                <b className="block text-base sm:text-lg font-bold tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.totals?.contests ?? 0} formatFn={n} />
                </b>
                <small className="block text-[10px] sm:text-[11px] text-muted-foreground font-medium mt-0.5 truncate">
                  {t("feather-pulse-public-events")}
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: This Month (এই মাসে) */}
        <div className="pt-3 lg:pt-0 lg:pl-6 space-y-2 sm:space-y-2.5">
          <div className="flex items-center gap-1.5 text-primary font-bold text-xs tracking-tight select-none">
            <Calendar className="h-3.5 w-3.5" />
            <span>{t("feather-pulse-this-month")}</span>
          </div>

          {/* 3 Monthly Stats Inline in 3 Columns */}
          <div className="grid grid-cols-3 gap-2">
            {/* 1. Monthly Submissions */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-500/12 text-blue-600 dark:text-blue-400">
                <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0">
                <b className="block text-base sm:text-lg font-bold tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.month?.entries ?? 0} formatFn={n} />
                </b>
                <small className="block text-[10px] sm:text-[11px] text-muted-foreground font-medium mt-0.5 truncate">
                  {t("feather-pulse-submissions")}
                </small>
              </div>
            </div>

            {/* 2. Monthly Words Accepted */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                <AlignJustify className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0">
                <b className="block text-base sm:text-lg font-bold tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.month?.words ?? 0} formatFn={n} />
                </b>
                <small className="block text-[10px] sm:text-[11px] text-muted-foreground font-medium mt-0.5 truncate">
                  {t("feather-pulse-words-accepted")}
                </small>
              </div>
            </div>

            {/* 3. Monthly Contributors */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 bg-rose-500/12 text-rose-600 dark:text-rose-400">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0">
                <b className="block text-base sm:text-lg font-bold tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.month?.people ?? 0} formatFn={n} />
                </b>
                <small className="block text-[10px] sm:text-[11px] text-muted-foreground font-medium mt-0.5 truncate">
                  {t("feather-pulse-contributors")}
                </small>
              </div>
            </div>
          </div>

          {/* 30-Day Activity Sparkline Histogram (Compact) */}
          <div className="pt-1.5 space-y-1">
            <div
              className="flex items-end gap-0.5 sm:gap-1 h-6 sm:h-7 w-full"
              role="img"
              aria-label={t("feather-pulse-sparkline-caption")}
            >
              {data?.trend && data.trend.length > 0
                ? data.trend.map((item, idx) => {
                    const heightPercent =
                      item.count === 0 ? 6 : Math.max(8, Math.round((item.count / maxDaily) * 100));
                    return (
                      <div
                        key={item.date || idx}
                        className="flex-1 bg-primary/75 hover:bg-primary rounded-t-[2px] transition-all duration-300 min-h-[2px] cursor-pointer"
                        style={{ height: `${heightPercent}%` }}
                        title={`${item.date}: ${n(item.count)}`}
                      />
                    );
                  })
                : [...Array(30)].map((_, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-primary/25 rounded-t-[2px] h-[6%]"
                    />
                  ))}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium select-none truncate">
              {t("feather-pulse-sparkline-caption")}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
