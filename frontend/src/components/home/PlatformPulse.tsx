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
} from "lucide-react";

/**
 * Silky smooth cubic ease-out counter matching 60 FPS performance
 * Curve: 1 - Math.pow(1 - progress, 3) over 900ms
 */
function SmoothCount({ value, formatFn }: { value: number; formatFn: (v: number) => string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!value || value <= 0) {
      setDisplayValue(0);
      return;
    }

    let startTime: number | null = null;
    const duration = 900; // ms

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease-out
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(value * easeOut);
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

  return <>{formatFn(displayValue)}</>;
}

export default function PlatformPulse() {
  const { t, n } = useI18n();

  const { data, isLoading } = useQuery<PlatformOverview>({
    queryKey: ["platformOverview"],
    queryFn: fetchPlatformOverview,
    staleTime: 60 * 1000,
  });

  const maxDaily = useMemo(() => {
    if (!data?.trend || data.trend.length === 0) return 1;
    return Math.max(1, ...data.trend.map((item) => item.count));
  }, [data?.trend]);

  if (isLoading) {
    return (
      <div className="w-full my-6 py-6 px-4 sm:px-8 rounded-2xl bg-card/40 border border-border/50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 divide-y lg:divide-y-0 lg:divide-x divide-border/50">
          {/* Col 1 Skeleton */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3.5 ${
                    i === 5 ? "col-span-2 lg:col-span-1" : ""
                  }`}
                >
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <Skeleton className="h-7 w-20 sm:w-24 rounded" />
                    <Skeleton className="h-3 w-14 sm:w-16 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2 Skeleton */}
          <div className="pt-8 lg:pt-0 lg:pl-12 space-y-5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 lg:space-y-4 lg:gap-0">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3.5 text-center sm:text-left"
                >
                  <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-full shrink-0" />
                  <div className="space-y-1.5 min-w-0 flex-1 w-full text-center sm:text-left">
                    <Skeleton className="h-6 sm:h-7 w-12 sm:w-24 mx-auto sm:mx-0 rounded" />
                    <Skeleton className="h-3 w-16 mx-auto sm:mx-0 rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 space-y-2">
              <div className="flex items-end gap-1 h-12">
                {[...Array(30)].map((_, i) => (
                  <Skeleton key={i} className="flex-1 rounded-t-[2px] h-[30%]" />
                ))}
              </div>
              <Skeleton className="h-3 w-36 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="w-full my-6 py-6 px-4 sm:px-8 rounded-2xl bg-card/40 border border-border/50">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 divide-y lg:divide-y-0 lg:divide-x divide-border/50">
        {/* Column 1: All Time (সব সময়) */}
        <div className="space-y-5 sm:space-y-6">
          <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-tight select-none">
            <InfinityIcon className="h-4 w-4 stroke-[2.5]" />
            <span>{t("feather-pulse-all-time")}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-6">
            {/* 1. Words Accepted */}
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-blue-500/12 text-blue-600 dark:text-blue-400">
                <AlignJustify className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <b className="block text-2xl sm:text-[1.75rem] font-black tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.totals?.words ?? 0} formatFn={n} />
                </b>
                <small className="block text-xs text-muted-foreground font-medium mt-1 truncate">
                  {t("feather-pulse-words-accepted")}
                </small>
              </div>
            </div>

            {/* 2. Articles Accepted */}
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <b className="block text-2xl sm:text-[1.75rem] font-black tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.totals?.articles ?? 0} formatFn={n} />
                </b>
                <small className="block text-xs text-muted-foreground font-medium mt-1 truncate">
                  {t("feather-pulse-articles-accepted")}
                </small>
              </div>
            </div>

            {/* 3. Contributors */}
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-rose-500/12 text-rose-600 dark:text-rose-400">
                <Users className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <b className="block text-2xl sm:text-[1.75rem] font-black tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.totals?.people ?? 0} formatFn={n} />
                </b>
                <small className="block text-xs text-muted-foreground font-medium mt-1 truncate">
                  {t("feather-pulse-contributors")}
                </small>
              </div>
            </div>

            {/* 4. Wikis */}
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-cyan-500/12 text-cyan-600 dark:text-cyan-400">
                <Globe className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <b className="block text-2xl sm:text-[1.75rem] font-black tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.totals?.wikis ?? 0} formatFn={n} />
                </b>
                <small className="block text-xs text-muted-foreground font-medium mt-1 truncate">
                  {t("feather-pulse-wikis")}
                </small>
              </div>
            </div>

            {/* 5. Public Events (Spans 2 columns on mobile so no awkward orphan blank, exactly 1 column on PC) */}
            <div className="col-span-2 lg:col-span-1 flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-indigo-500/12 text-indigo-600 dark:text-indigo-400">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <b className="block text-2xl sm:text-[1.75rem] font-black tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.totals?.contests ?? 0} formatFn={n} />
                </b>
                <small className="block text-xs text-muted-foreground font-medium mt-1 truncate">
                  {t("feather-pulse-public-events")}
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: This Month (এই মাসে) */}
        <div className="pt-6 lg:pt-0 lg:pl-12 space-y-4 sm:space-y-5">
          <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-tight select-none">
            <Calendar className="h-4 w-4" />
            <span>{t("feather-pulse-this-month")}</span>
          </div>

          {/* On mobile: 3-column compact horizontal row; on desktop: exact vertical stack of Image 2 */}
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 sm:gap-4 lg:space-y-4 lg:gap-0">
            {/* 1. Monthly Submissions */}
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3.5 text-center sm:text-left min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 bg-blue-500/12 text-blue-600 dark:text-blue-400">
                <Upload className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
              <div className="min-w-0 w-full">
                <b className="block text-xl sm:text-2xl lg:text-[1.75rem] font-black tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.month?.entries ?? 0} formatFn={n} />
                </b>
                <small className="block text-[10px] sm:text-xs text-muted-foreground font-medium mt-1 truncate">
                  {t("feather-pulse-submissions")}
                </small>
              </div>
            </div>

            {/* 2. Monthly Words Accepted */}
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3.5 text-center sm:text-left min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                <AlignJustify className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
              <div className="min-w-0 w-full">
                <b className="block text-xl sm:text-2xl lg:text-[1.75rem] font-black tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.month?.words ?? 0} formatFn={n} />
                </b>
                <small className="block text-[10px] sm:text-xs text-muted-foreground font-medium mt-1 truncate">
                  {t("feather-pulse-words-accepted")}
                </small>
              </div>
            </div>

            {/* 3. Monthly Contributors */}
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3.5 text-center sm:text-left min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 bg-rose-500/12 text-rose-600 dark:text-rose-400">
                <Users className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
              <div className="min-w-0 w-full">
                <b className="block text-xl sm:text-2xl lg:text-[1.75rem] font-black tracking-tight tabular-nums text-foreground leading-none">
                  <SmoothCount value={data?.month?.people ?? 0} formatFn={n} />
                </b>
                <small className="block text-[10px] sm:text-xs text-muted-foreground font-medium mt-1 truncate">
                  {t("feather-pulse-contributors")}
                </small>
              </div>
            </div>
          </div>

          {/* 30-Day Activity Sparkline Histogram */}
          <div className="pt-2 sm:pt-4 space-y-2">
            <div
              className="flex items-end gap-1 sm:gap-1.5 h-10 sm:h-12 w-full pt-1"
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
                        className="flex-1 bg-primary/75 hover:bg-primary rounded-t-[2px] transition-all duration-300 min-h-[3px] cursor-pointer"
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
            <div className="mt-2 text-[11px] text-muted-foreground font-medium select-none">
              {t("feather-pulse-sparkline-caption")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
