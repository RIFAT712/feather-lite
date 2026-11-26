"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { GlobalUserProfile } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart3, Calendar } from "lucide-react";
import {
  FEATHER_CHART_COLORS,
  FeatherChartTooltip,
  truncateAxisLabel,
} from "@/components/charts/FeatherChartPrimitives";

interface UserProfileChartsProps {
  profile: GlobalUserProfile;
}

export default function UserProfileCharts({ profile }: UserProfileChartsProps) {
  const { t, n } = useI18n();

  const contestData = useMemo(() => {
    return profile.participated_contests
      .map((c) => {
        const valid = (c.articles || []).filter((a) => a.status !== "validation_failed");
        const accepted = valid.filter((a) => a.status === "accepted").length;
        const pending = valid.filter((a) => a.status === "pending").length;
        const rejected = valid.filter((a) => a.status === "rejected").length;
        return {
          code: c.code,
          name: c.name,
          shortName: truncateAxisLabel(c.code || c.name, 12),
          accepted,
          pending,
          rejected,
          total: accepted + pending + rejected,
        };
      })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [profile.participated_contests]);

  const monthlyData = useMemo(() => {
    const byMonth = new Map<string, { month: string; submissions: number; reviews: number }>();

    for (const c of profile.participated_contests) {
      for (const art of c.articles || []) {
        if (!art.submitted_at || art.status === "validation_failed") continue;
        const monthKey = art.submitted_at.slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;
        const item = byMonth.get(monthKey) || { month: monthKey, submissions: 0, reviews: 0 };
        item.submissions += 1;
        byMonth.set(monthKey, item);
      }
    }

    for (const jc of profile.judged_contests) {
      for (const rev of jc.reviews || []) {
        if (!rev.reviewed_at) continue;
        const monthKey = rev.reviewed_at.slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;
        const item = byMonth.get(monthKey) || { month: monthKey, submissions: 0, reviews: 0 };
        item.reviews += 1;
        byMonth.set(monthKey, item);
      }
    }

    return Array.from(byMonth.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
  }, [profile.participated_contests, profile.judged_contests]);

  if (contestData.length === 0 && monthlyData.length === 0) {
    return null;
  }

  return (
    <div
      className={`grid grid-cols-1 ${
        contestData.length > 0 && monthlyData.length > 0 ? "lg:grid-cols-2" : ""
      } gap-4`}
    >
      {contestData.length > 0 && (
        <Card className="border-border shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <div>
                <CardTitle className="text-sm font-semibold">
                  {t("feather-profile-chart-contests-title")}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {t("feather-profile-chart-contests-desc")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={contestData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => n(Number(v))}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }}
                    content={<FeatherChartTooltip labelKey="name" />}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar
                    dataKey="accepted"
                    stackId="sub"
                    name={t("feather-stats-col-accepted")}
                    fill={FEATHER_CHART_COLORS.emerald}
                    barSize={24}
                    animationDuration={350}
                  />
                  <Bar
                    dataKey="pending"
                    stackId="sub"
                    name={t("feather-stats-col-pending")}
                    fill={FEATHER_CHART_COLORS.amber}
                    barSize={24}
                    animationDuration={350}
                  />
                  <Bar
                    dataKey="rejected"
                    stackId="sub"
                    name={t("feather-stats-col-rejected")}
                    fill={FEATHER_CHART_COLORS.rose}
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                    animationDuration={350}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {monthlyData.length > 0 && (
        <Card className="border-border shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-500" />
              <div>
                <CardTitle className="text-sm font-semibold">
                  {t("feather-profile-chart-timeline-title")}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {t("feather-profile-chart-timeline-desc")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => n(Number(v))}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }}
                    content={<FeatherChartTooltip />}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar
                    dataKey="submissions"
                    name={t("feather-profile-submissions-heading")}
                    fill={FEATHER_CHART_COLORS.sky}
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                    animationDuration={350}
                  />
                  {profile.judged_contests.length > 0 && (
                    <Bar
                      dataKey="reviews"
                      name={t("feather-profile-chart-reviews-label")}
                      fill={FEATHER_CHART_COLORS.indigo}
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                      animationDuration={350}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
