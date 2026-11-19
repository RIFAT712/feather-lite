"use client";

import React, { useMemo } from "react";
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

export default function PlatformPulse() {
  const { t, n } = useI18n();

  const { data, isLoading } = useQuery<PlatformOverview>({
    queryKey: ["platformOverview"],
    queryFn: fetchPlatformOverview,
    staleTime: 60 * 1000,
  });

  const maxDaily = useMemo(() => {
    if (!data?.trend || data.trend.length === 0) return 1;
    return Math.max(1, ...data.trend.map((t) => t.count));
  }, [data?.trend]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs p-5 sm:p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
          {/* Col 1 Skeleton */}
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <Skeleton className="h-6 w-20 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2 Skeleton */}
          <div className="pt-6 lg:pt-0 lg:pl-8 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
            <div className="space-y-3.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <Skeleton className="h-6 w-24 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-3 border-t border-border/40 space-y-2">
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
    <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs p-5 sm:p-6 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
        {/* Column 1: All Time (সব সময়) */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-tight select-none">
            <InfinityIcon className="h-4 w-4 stroke-[2.5]" />
            <span>{t("feather-pulse-all-time")}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {/* Words Accepted */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <AlignJustify className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
                  {n(data?.totals?.words ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground font-medium truncate">
                  {t("feather-pulse-words-accepted")}
                </div>
              </div>
            </div>

            {/* Articles Accepted */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
                  {n(data?.totals?.articles ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground font-medium truncate">
                  {t("feather-pulse-articles-accepted")}
                </div>
              </div>
            </div>

            {/* Contributors */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
                  {n(data?.totals?.people ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground font-medium truncate">
                  {t("feather-pulse-contributors")}
                </div>
              </div>
            </div>

            {/* Wikis */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Globe className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
                  {n(data?.totals?.wikis ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground font-medium truncate">
                  {t("feather-pulse-wikis")}
                </div>
              </div>
            </div>

            {/* Public Contests */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
                  {n(data?.totals?.contests ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground font-medium truncate">
                  {t("feather-pulse-public-events")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: This Month (এই মাসে) */}
        <div className="pt-6 lg:pt-0 lg:pl-8 space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-tight select-none">
            <Calendar className="h-4 w-4" />
            <span>{t("feather-pulse-this-month")}</span>
          </div>

          <div className="space-y-3.5">
            {/* Monthly Submissions */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Upload className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
                  {n(data?.month?.entries ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground font-medium truncate">
                  {t("feather-pulse-submissions")}
                </div>
              </div>
            </div>

            {/* Monthly Words Accepted */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <AlignJustify className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
                  {n(data?.month?.words ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground font-medium truncate">
                  {t("feather-pulse-words-accepted")}
                </div>
              </div>
            </div>

            {/* Monthly Contributors */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
                  {n(data?.month?.people ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground font-medium truncate">
                  {t("feather-pulse-contributors")}
                </div>
              </div>
            </div>
          </div>

          {/* 30-Day Activity Sparkline Histogram */}
          <div className="mt-5 pt-3 border-t border-border/40">
            <div
              className="flex items-end gap-1 sm:gap-1.5 h-12 w-full pt-1"
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
                        className="flex-1 bg-primary/75 hover:bg-primary rounded-t-[2px] transition-all min-h-[3px] cursor-pointer"
                        style={{ height: `${heightPercent}%` }}
                        title={`${item.date}: ${n(item.count)}`}
                      />
                    );
                  })
                : [...Array(30)].map((_, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-primary/30 rounded-t-[2px] h-[6%]"
                    />
                  ))}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground font-medium">
              {t("feather-pulse-sparkline-caption")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
