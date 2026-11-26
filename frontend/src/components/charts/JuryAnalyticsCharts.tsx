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
import { JuryMemberProgress } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, Award } from "lucide-react";
import {
  FEATHER_CHART_COLORS,
  FeatherChartTooltip,
  truncateAxisLabel,
} from "@/components/charts/FeatherChartPrimitives";

interface JuryAnalyticsChartsProps {
  juries: JuryMemberProgress[];
}

export default function JuryAnalyticsCharts({ juries }: JuryAnalyticsChartsProps) {
  const { t, n } = useI18n();

  const chartData = useMemo(() => {
    return [...juries]
      .sort((a, b) => b.assigned - a.assigned || b.judged - a.judged)
      .slice(0, 12)
      .map((j) => ({
        username: j.username,
        shortName: truncateAxisLabel(j.username, 12),
        judged: j.judged,
        remaining: j.remaining,
        accepted: j.accepted,
        rejected: j.rejected,
        skipped: j.skipped,
      }));
  }, [juries]);

  if (!juries || juries.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart 1: Queue Distribution by Judge */}
      <Card className="border-border/80 shadow-2xs bg-card/60 overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/15">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-xs sm:text-sm font-semibold">
                {t("feather-jury-chart-workload-title")}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {t("feather-jury-chart-workload-desc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
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
                  width={40}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }}
                  content={<FeatherChartTooltip labelKey="username" />}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar
                  dataKey="judged"
                  stackId="queue"
                  name={t("feather-jury-col-judged")}
                  fill={FEATHER_CHART_COLORS.primary}
                  radius={[0, 0, 0, 0]}
                  barSize={24}
                  animationDuration={350}
                />
                <Bar
                  dataKey="remaining"
                  stackId="queue"
                  name={t("feather-jury-col-remaining")}
                  fill={FEATHER_CHART_COLORS.amber}
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                  animationDuration={350}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Chart 2: Verdict Outcomes by Judge */}
      <Card className="border-border/80 shadow-2xs bg-card/60 overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/15">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <CardTitle className="text-xs sm:text-sm font-semibold">
                {t("feather-jury-chart-decisions-title")}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {t("feather-jury-chart-decisions-desc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
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
                  width={40}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }}
                  content={<FeatherChartTooltip labelKey="username" />}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar
                  dataKey="accepted"
                  stackId="verdicts"
                  name={t("feather-jury-col-accepted")}
                  fill={FEATHER_CHART_COLORS.emerald}
                  barSize={24}
                  animationDuration={350}
                />
                <Bar
                  dataKey="rejected"
                  stackId="verdicts"
                  name={t("feather-jury-col-rejected")}
                  fill={FEATHER_CHART_COLORS.rose}
                  barSize={24}
                  animationDuration={350}
                />
                <Bar
                  dataKey="skipped"
                  stackId="verdicts"
                  name={t("feather-jury-col-skipped")}
                  fill={FEATHER_CHART_COLORS.slate}
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                  animationDuration={350}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
