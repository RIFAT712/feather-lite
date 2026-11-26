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
import { Contest } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart3, Globe } from "lucide-react";
import {
  FEATHER_CHART_COLORS,
  FeatherChartTooltip,
  truncateAxisLabel,
} from "@/components/charts/FeatherChartPrimitives";

interface AdminAnalyticsChartsProps {
  contests: Contest[];
}

interface StatusDatum {
  status: string;
  label: string;
  count: number;
  fill: string;
}

interface StatusBarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: StatusDatum;
}

function StatusBarShape({ x = 0, y = 0, width = 0, height = 0, payload }: StatusBarShapeProps) {
  if (width <= 0 || height <= 0) return null;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={4}
      ry={4}
      fill={payload?.fill || FEATHER_CHART_COLORS.primary}
    />
  );
}

export default function AdminAnalyticsCharts({ contests }: AdminAnalyticsChartsProps) {
  const { t, n } = useI18n();

  const statusData = useMemo<StatusDatum[]>(() => {
    const counts = {
      active: 0,
      pending_approval: 0,
      ended: 0,
      rejected: 0,
      deleted: 0,
    };

    for (const c of contests) {
      if (c.status === "active") counts.active++;
      else if (c.status === "pending_approval") counts.pending_approval++;
      else if (c.status === "ended") counts.ended++;
      else if (c.status === "rejected") counts.rejected++;
      else if (c.status === "deleted") counts.deleted++;
    }

    return [
      {
        status: "active",
        label: t("feather-admin-status-active"),
        count: counts.active,
        fill: FEATHER_CHART_COLORS.emerald,
      },
      {
        status: "pending_approval",
        label: t("feather-admin-status-pending"),
        count: counts.pending_approval,
        fill: FEATHER_CHART_COLORS.amber,
      },
      {
        status: "ended",
        label: t("feather-admin-status-ended"),
        count: counts.ended,
        fill: FEATHER_CHART_COLORS.indigo,
      },
      {
        status: "rejected",
        label: t("feather-admin-status-rejected"),
        count: counts.rejected,
        fill: FEATHER_CHART_COLORS.rose,
      },
      {
        status: "deleted",
        label: t("feather-admin-status-deleted"),
        count: counts.deleted,
        fill: FEATHER_CHART_COLORS.slate,
      },
    ];
  }, [contests, t]);

  const wikiData = useMemo(() => {
    const byWiki = new Map<string, { wiki: string; shortWiki: string; articles: number; contests: number }>();

    for (const c of contests) {
      if (c.status === "deleted") continue;
      const key = c.wiki_dbname || "unknown";
      const existing = byWiki.get(key) || {
        wiki: key,
        shortWiki: truncateAxisLabel(key, 12),
        articles: 0,
        contests: 0,
      };
      existing.contests += 1;
      existing.articles += c.total_articles ?? 0;
      byWiki.set(key, existing);
    }

    return Array.from(byWiki.values())
      .sort((a, b) => b.articles - a.articles || b.contests - a.contests)
      .slice(0, 8);
  }, [contests]);

  if (!contests || contests.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart 1: Contests by Status */}
      <Card className="border border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="py-3.5 px-5 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                {t("feather-admin-chart-status-title")}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {t("feather-admin-chart-status-desc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={statusData}
                layout="vertical"
                margin={{ top: 8, right: 20, left: 10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/50" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v) => n(Number(v))}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={88}
                  tick={{ fontSize: 11, fill: "var(--foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }}
                  content={<FeatherChartTooltip />}
                />
                <Bar
                  dataKey="count"
                  name={t("feather-admin-chart-contests-label")}
                  barSize={20}
                  shape={<StatusBarShape />}
                  animationDuration={350}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Chart 2: Top Wikis by Submissions */}
      <Card className="border border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="py-3.5 px-5 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-sky-500" />
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                {t("feather-admin-chart-wikis-title")}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {t("feather-admin-chart-wikis-desc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={wikiData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                <XAxis
                  dataKey="shortWiki"
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
                  width={44}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }}
                  content={<FeatherChartTooltip labelKey="wiki" />}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar
                  dataKey="articles"
                  name={t("feather-admin-chart-articles-label")}
                  fill={FEATHER_CHART_COLORS.sky}
                  radius={[4, 4, 0, 0]}
                  barSize={22}
                  animationDuration={350}
                />
                <Bar
                  dataKey="contests"
                  name={t("feather-admin-chart-contests-label")}
                  fill={FEATHER_CHART_COLORS.indigo}
                  radius={[4, 4, 0, 0]}
                  barSize={22}
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
