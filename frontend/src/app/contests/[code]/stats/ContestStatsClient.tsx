"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Contest,
  ContestStatsResponse,
  fetchContestStats,
  fetchStandings,
  StandingEntry,
} from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import UserBadge from "@/components/users/UserBadge";
import {
  ArrowLeft,
  Calendar,
  RotateCcw,
  TrendingUp,
  BarChart3,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from "lucide-react";

interface ContestStatsClientProps {
  code: string;
  initialContest: Contest;
  initialStats?: ContestStatsResponse | null;
}

const ACCENT_COLOR = "#355b80";
const TEAL_COLOR = "#17a2a8";
const LOG_FLOOR = 0.9;
const DECADES = [1, 10, 100, 1000, 10000, 100000];

export default function ContestStatsClient({
  code,
  initialContest,
  initialStats,
}: ContestStatsClientProps) {
  const { t, formatDate, locale } = useI18n();

  // Queries
  const { data: contest } = useQuery<Contest>({
    queryKey: ["contest", code],
    initialData: initialContest,
    staleTime: 60 * 1000,
  });

  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
  } = useQuery<ContestStatsResponse>({
    queryKey: ["contest-stats", code],
    queryFn: () => fetchContestStats(code),
    initialData: initialStats ?? undefined,
    initialDataUpdatedAt: initialStats ? Date.now() : undefined,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });

  const { data: standings } = useQuery<StandingEntry[]>({
    queryKey: ["standings", code],
    queryFn: () => fetchStandings(code),
    staleTime: 60 * 1000,
  });

  // State
  const [scaleType, setScaleType] = useState<"linear" | "logarithmic">("linear");
  const [shownSeries, setShownSeries] = useState({ submitted: true, judged: true });
  const [zoomRange, setZoomRange] = useState<{ from: string; to: string } | null>(null);

  // Drag-to-zoom tracking
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<{ startX: number; currentX: number } | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Derived counts
  const counts = stats?.status_counts || { total: 0, accepted: 0, rejected: 0, pending: 0 };
  const reviewed = (counts.accepted || 0) + (counts.rejected || 0);
  const judgeable = reviewed + (counts.pending || 0);
  const progressPercent = judgeable > 0 ? Math.round((reviewed / judgeable) * 100) : 0;
  const acceptedPct = judgeable > 0 ? Math.round(((counts.accepted || 0) / judgeable) * 100) : 0;
  const rejectedPct = judgeable > 0 ? Math.round(((counts.rejected || 0) / judgeable) * 100) : 0;

  // Daily series data (with zoom filtering)
  const allDaily = useMemo(() => stats?.daily || [], [stats?.daily]);

  const daily = useMemo(() => {
    if (!zoomRange || allDaily.length === 0) return allDaily;
    const fromIdx = allDaily.findIndex((d) => d.date === zoomRange.from);
    const toIdx = allDaily.findIndex((d) => d.date === zoomRange.to);
    if (fromIdx < 0 || toIdx < 0 || fromIdx > toIdx) return allDaily;
    return allDaily.slice(fromIdx, toIdx + 1);
  }, [allDaily, zoomRange]);

  // Chart dimensions
  const SVG_WIDTH = 800;
  const SVG_HEIGHT = 280;
  const MARGIN = { top: 25, right: 30, bottom: 45, left: 55 };
  const PLOT_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
  const PLOT_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

  // Max value calculation
  const maxDataVal = useMemo(() => {
    if (daily.length === 0) return 10;
    let max = 0;
    daily.forEach((d) => {
      if (shownSeries.submitted && d.count > max) max = d.count;
      if (shownSeries.judged && d.judged > max) max = d.judged;
    });
    return Math.max(max, 5);
  }, [daily, shownSeries]);

  // Y scale transform
  const getY = useCallback(
    (val: number) => {
      if (scaleType === "logarithmic") {
        const minVal = Math.log10(LOG_FLOOR);
        const maxVal = Math.log10(Math.max(10, maxDataVal));
        const effectiveVal = Math.log10(val > 0 ? val : LOG_FLOOR);
        const ratio = (effectiveVal - minVal) / (maxVal - minVal);
        return MARGIN.top + PLOT_HEIGHT - Math.max(0, Math.min(1, ratio)) * PLOT_HEIGHT;
      }
      const ratio = val / maxDataVal;
      return MARGIN.top + PLOT_HEIGHT - Math.max(0, Math.min(1, ratio)) * PLOT_HEIGHT;
    },
    [scaleType, maxDataVal, PLOT_HEIGHT, MARGIN.top]
  );

  // X scale transform
  const getX = useCallback(
    (index: number) => {
      if (daily.length <= 1) return MARGIN.left + PLOT_WIDTH / 2;
      return MARGIN.left + (index / (daily.length - 1)) * PLOT_WIDTH;
    },
    [daily.length, MARGIN.left, PLOT_WIDTH]
  );

  // Monotone cubic bezier path builder
  const buildSmoothPath = useCallback(
    (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return "";
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
      if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return d;
    },
    []
  );

  // Coordinates for paths
  const submittedPoints = useMemo(() => {
    return daily.map((d, i) => ({ x: getX(i), y: getY(d.count) }));
  }, [daily, getX, getY]);

  const judgedPoints = useMemo(() => {
    return daily.map((d, i) => ({ x: getX(i), y: getY(d.judged) }));
  }, [daily, getX, getY]);

  const submittedLinePath = useMemo(() => buildSmoothPath(submittedPoints), [submittedPoints, buildSmoothPath]);
  const judgedLinePath = useMemo(() => buildSmoothPath(judgedPoints), [judgedPoints, buildSmoothPath]);

  const submittedAreaPath = useMemo(() => {
    if (submittedPoints.length < 2) return "";
    const bottom = MARGIN.top + PLOT_HEIGHT;
    const first = submittedPoints[0];
    const last = submittedPoints[submittedPoints.length - 1];
    return `${submittedLinePath} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
  }, [submittedPoints, submittedLinePath, MARGIN.top, PLOT_HEIGHT]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    if (scaleType === "logarithmic") {
      return DECADES.filter((d) => d <= Math.max(10, maxDataVal)).map((val) => ({
        val,
        y: getY(val),
        label: val.toLocaleString(),
      }));
    }
    const count = 5;
    const ticks = [];
    for (let i = 0; i <= count; i++) {
      const val = Math.round((maxDataVal / count) * i);
      ticks.push({
        val,
        y: getY(val),
        label: val.toLocaleString(),
      });
    }
    return ticks;
  }, [scaleType, maxDataVal, getY]);

  // X-axis ticks (spaced across days)
  const xTicks = useMemo(() => {
    if (daily.length === 0) return [];
    if (daily.length <= 7) {
      return daily.map((d, i) => ({ label: d.date.slice(5), x: getX(i) }));
    }
    const step = Math.ceil(daily.length / 6);
    const ticks = [];
    for (let i = 0; i < daily.length; i += step) {
      ticks.push({ label: daily[i].date.slice(5), x: getX(i) });
    }
    // Always include last day if not close
    if (ticks[ticks.length - 1].x < MARGIN.left + PLOT_WIDTH - 30) {
      ticks.push({
        label: daily[daily.length - 1].date.slice(5),
        x: getX(daily.length - 1),
      });
    }
    return ticks;
  }, [daily, getX, MARGIN.left, PLOT_WIDTH]);

  // Drag & pointer handlers for interactive zoom and tooltip
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 || daily.length < 2) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    setDragState({ startX: x, currentX: x });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;

    if (dragState) {
      setDragState((prev) => (prev ? { ...prev, currentX: x } : null));
    }

    // Hover index calculation
    if (daily.length > 0) {
      const plotX = Math.max(0, Math.min(PLOT_WIDTH, x - MARGIN.left));
      const idx = Math.round((plotX / PLOT_WIDTH) * (daily.length - 1));
      setHoverIndex(idx >= 0 && idx < daily.length ? idx : null);
    }
  };

  const handlePointerUp = () => {
    if (!dragState || daily.length < 2) {
      setDragState(null);
      return;
    }
    const diff = Math.abs(dragState.currentX - dragState.startX);
    if (diff > 12) {
      const minX = Math.min(dragState.startX, dragState.currentX) - MARGIN.left;
      const maxX = Math.max(dragState.startX, dragState.currentX) - MARGIN.left;
      const idx1 = Math.max(0, Math.min(daily.length - 1, Math.round((minX / PLOT_WIDTH) * (daily.length - 1))));
      const idx2 = Math.max(0, Math.min(daily.length - 1, Math.round((maxX / PLOT_WIDTH) * (daily.length - 1))));

      if (idx2 - idx1 >= 1) {
        setZoomRange({
          from: daily[idx1].date,
          to: daily[idx2].date,
        });
      }
    }
    setDragState(null);
  };

  const handlePointerLeave = () => {
    if (!dragState) {
      setHoverIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Contest Top Banner / Breadcrumb */}
      <div className="border-b border-border/60 bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/contests/${code}`}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "gap-1.5 h-8 text-xs font-semibold shadow-2xs",
              })}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("feather-contest-nav-dashboard") || "Dashboard"}</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {t("feather-stats-heading")}
                </h1>
                <Badge variant="outline" className="text-[11px] font-semibold bg-primary/5 text-primary">
                  {contest?.name || code}
                </Badge>
              </div>
              {contest?.start_date && contest?.end_date && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Calendar className="h-3.5 w-3.5 opacity-60" />
                  <span>
                    {formatDate(contest.start_date)} — {formatDate(contest.end_date)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/contests/${code}`}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "text-xs font-medium h-8",
              })}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5 opacity-60" />
              <span>{t("feather-stats-view-results")}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Error Notification */}
        {isStatsError && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{t("feather-stats-error")}</span>
          </div>
        )}

        {/* 1. KPI Summary Strip (5 metrics unified strip matching Feather v1) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 rounded-xl border border-border/70 overflow-hidden bg-card shadow-2xs divide-y sm:divide-y-0 sm:divide-x divide-border/60">
          {/* Submitted */}
          <div className="p-4 sm:p-5 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("feather-stats-col-submitted")}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-foreground">
                {(counts.total || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Reviewed */}
          <div className="p-4 sm:p-5 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("feather-stats-col-reviewed")}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-foreground">
                {reviewed.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Accepted */}
          <div className="p-4 sm:p-5 flex flex-col justify-between bg-emerald-500/[0.03]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {t("feather-stats-col-accepted")}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
                {(counts.accepted || 0).toLocaleString()}
              </span>
              {reviewed > 0 && (
                <span className="text-xs font-semibold text-emerald-600/80 dark:text-emerald-400/80">
                  {Math.round(((counts.accepted || 0) / reviewed) * 100)}%
                </span>
              )}
            </div>
          </div>

          {/* Rejected */}
          <div className="p-4 sm:p-5 flex flex-col justify-between bg-rose-500/[0.03]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              {t("feather-stats-col-rejected")}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-rose-700 dark:text-rose-400">
                {(counts.rejected || 0).toLocaleString()}
              </span>
              {reviewed > 0 && (
                <span className="text-xs font-semibold text-rose-600/80 dark:text-rose-400/80">
                  {Math.round(((counts.rejected || 0) / reviewed) * 100)}%
                </span>
              )}
            </div>
          </div>

          {/* Pending */}
          <div className="p-4 sm:p-5 flex flex-col justify-between bg-amber-500/[0.03] col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              {t("feather-stats-col-pending")}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-amber-700 dark:text-amber-400">
                {(counts.pending || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Judging Progress Bar Panel */}
        {judgeable > 0 && (
          <Card className="shadow-2xs border-border/70">
            <CardHeader className="py-4 px-5 pb-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <CardTitle className="text-sm font-bold text-foreground">
                  {t("feather-stats-judging-progress")}
                </CardTitle>
                <div className="text-xs font-semibold text-muted-foreground tabular-nums">
                  {reviewed.toLocaleString()} of {judgeable.toLocaleString()} judged · {progressPercent}%
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-1">
              <div className="w-full h-3 rounded-full bg-muted/60 overflow-hidden flex">
                <div
                  className="bg-emerald-600 h-full transition-all duration-500"
                  style={{ width: `${acceptedPct}%` }}
                  title={`Accepted: ${counts.accepted}`}
                />
                <div
                  className="bg-rose-600 h-full transition-all duration-500"
                  style={{ width: `${rejectedPct}%` }}
                  title={`Rejected: ${counts.rejected}`}
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block" />
                  <span>
                    {t("feather-stats-col-accepted")}: {counts.accepted} ({acceptedPct}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-600 inline-block" />
                  <span>
                    {t("feather-stats-col-rejected")}: {counts.rejected} ({rejectedPct}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30 inline-block" />
                  <span>
                    {t("feather-stats-col-pending")}: {counts.pending}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. Submissions & Judgments per Day Interactive Chart */}
        <Card className="shadow-2xs border-border/70 overflow-hidden">
          <CardHeader className="py-4 px-5 border-b border-border/60 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold text-foreground">
                  {t("feather-stats-daily-title")}
                </CardTitle>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Reset Zoom Button */}
                {zoomRange && (
                  <button
                    type="button"
                    onClick={() => setZoomRange(null)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>{t("feather-stats-zoom-reset")}</span>
                  </button>
                )}

                {/* Series Switches */}
                <div className="inline-flex items-center gap-1 bg-muted/40 p-0.5 rounded-full border border-border/60">
                  <button
                    type="button"
                    onClick={() => setShownSeries((s) => ({ ...s, submitted: !s.submitted }))}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      shownSeries.submitted
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground line-through opacity-50"
                    }`}
                  >
                    <span
                      className="w-3.5 h-0.5 rounded-full inline-block"
                      style={{ backgroundColor: ACCENT_COLOR }}
                    />
                    <span>{t("feather-stats-series-submitted")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShownSeries((s) => ({ ...s, judged: !s.judged }))}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      shownSeries.judged
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground line-through opacity-50"
                    }`}
                  >
                    <span
                      className="w-3.5 h-0.5 border-t border-dashed inline-block"
                      style={{ borderColor: TEAL_COLOR }}
                    />
                    <span>{t("feather-stats-series-judged")}</span>
                  </button>
                </div>

                {/* Scale Switch */}
                <div className="inline-flex items-center p-0.5 rounded-full bg-muted/40 border border-border/60 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setScaleType("linear")}
                    className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                      scaleType === "linear"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("feather-stats-scale-linear")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScaleType("logarithmic")}
                    className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                      scaleType === "logarithmic"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("feather-stats-scale-log")}
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 relative">
            {daily.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                {t("feather-stats-empty")}
              </div>
            ) : (
              <div className="p-4 sm:p-5 select-none">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                  className="w-full h-auto cursor-crosshair overflow-visible"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerLeave}
                >
                  <defs>
                    <linearGradient id="featherSubmittedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENT_COLOR} stopOpacity="0.22" />
                      <stop offset="100%" stopColor={ACCENT_COLOR} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal gridlines */}
                  {yTicks.map((tick, i) => (
                    <g key={i}>
                      <line
                        x1={MARGIN.left}
                        y1={tick.y}
                        x2={MARGIN.left + PLOT_WIDTH}
                        y2={tick.y}
                        stroke="currentColor"
                        className="text-border/40"
                        strokeDasharray={scaleType === "logarithmic" ? "2,2" : undefined}
                      />
                      <text
                        x={MARGIN.left - 10}
                        y={tick.y + 3.5}
                        textAnchor="end"
                        className="fill-muted-foreground text-[10px] font-mono select-none"
                      >
                        {tick.label}
                      </text>
                    </g>
                  ))}

                  {/* Vertical guideline & selection rectangle during drag */}
                  {dragState && (
                    <rect
                      x={Math.min(dragState.startX, dragState.currentX)}
                      y={MARGIN.top}
                      width={Math.abs(dragState.currentX - dragState.startX)}
                      height={PLOT_HEIGHT}
                      fill="rgba(53, 91, 128, 0.16)"
                      stroke={ACCENT_COLOR}
                      strokeWidth="1"
                    />
                  )}

                  {/* Submitted Area & Line */}
                  {shownSeries.submitted && (
                    <>
                      {submittedAreaPath && (
                        <path d={submittedAreaPath} fill="url(#featherSubmittedGrad)" />
                      )}
                      {submittedLinePath && (
                        <path
                          d={submittedLinePath}
                          fill="none"
                          stroke={ACCENT_COLOR}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </>
                  )}

                  {/* Judged Line */}
                  {shownSeries.judged && judgedLinePath && (
                    <path
                      d={judgedLinePath}
                      fill="none"
                      stroke={TEAL_COLOR}
                      strokeWidth="2"
                      strokeDasharray="5,4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Hover indicator & vertical crosshair */}
                  {hoverIndex !== null && hoverIndex < daily.length && (
                    <g>
                      <line
                        x1={getX(hoverIndex)}
                        y1={MARGIN.top}
                        x2={getX(hoverIndex)}
                        y2={MARGIN.top + PLOT_HEIGHT}
                        stroke="currentColor"
                        className="text-muted-foreground/60"
                        strokeDasharray="3,3"
                      />
                      {shownSeries.submitted && (
                        <circle
                          cx={getX(hoverIndex)}
                          cy={getY(daily[hoverIndex].count)}
                          r="4.5"
                          fill={ACCENT_COLOR}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      )}
                      {shownSeries.judged && (
                        <circle
                          cx={getX(hoverIndex)}
                          cy={getY(daily[hoverIndex].judged)}
                          r="4.5"
                          fill={TEAL_COLOR}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      )}
                    </g>
                  )}

                  {/* X-axis date labels */}
                  {xTicks.map((tick, i) => (
                    <text
                      key={i}
                      x={tick.x}
                      y={MARGIN.top + PLOT_HEIGHT + 18}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px] font-mono select-none"
                    >
                      {tick.label}
                    </text>
                  ))}
                </svg>

                {/* Floating Tooltip Pill */}
                {hoverIndex !== null && hoverIndex < daily.length && (
                  <div
                    className="absolute pointer-events-none z-10 bg-popover/95 text-popover-foreground border border-border shadow-md rounded-lg px-3 py-2 text-xs flex flex-col gap-1 transition-transform"
                    style={{
                      left: `${Math.min(
                        Math.max(10, (getX(hoverIndex) / SVG_WIDTH) * 100),
                        85
                      )}%`,
                      top: "20px",
                    }}
                  >
                    <div className="font-semibold text-[11px] text-foreground">
                      {daily[hoverIndex].date}
                    </div>
                    {shownSeries.submitted && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ACCENT_COLOR }} />
                        <span className="text-muted-foreground">{t("feather-stats-series-submitted")}:</span>
                        <span className="font-bold tabular-nums">
                          {daily[hoverIndex].count.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {shownSeries.judged && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TEAL_COLOR }} />
                        <span className="text-muted-foreground">{t("feather-stats-series-judged")}:</span>
                        <span className="font-bold tabular-nums">
                          {daily[hoverIndex].judged.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 text-center text-[11px] text-muted-foreground">
                  {t("feather-stats-zoom-hint")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Submitter Standings Preview */}
        <Card className="shadow-2xs border-border/70 overflow-hidden">
          <CardHeader className="py-4 px-5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold text-foreground">
                  {t("feather-stats-results-title")}
                </CardTitle>
              </div>
              <Link
                href={`/contests/${code}`}
                className="text-xs text-primary font-semibold hover:underline"
              >
                {t("feather-stats-view-results")} →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!standings || standings.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                {t("feather-stats-empty")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/40">
                    <TableHead className="w-16 text-center text-xs">
                      {t("feather-stats-col-rank")}
                    </TableHead>
                    <TableHead className="text-xs">
                      {t("feather-stats-col-user")}
                    </TableHead>
                    <TableHead className="text-right text-xs">
                      {t("feather-stats-col-submitted")}
                    </TableHead>
                    <TableHead className="text-right text-xs text-emerald-700 dark:text-emerald-400">
                      {t("feather-stats-col-accepted")}
                    </TableHead>
                    <TableHead className="text-right text-xs text-rose-700 dark:text-rose-400">
                      {t("feather-stats-col-rejected")}
                    </TableHead>
                    <TableHead className="text-right text-xs text-amber-700 dark:text-amber-400">
                      {t("feather-stats-col-pending")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.slice(0, 15).map((entry, idx) => (
                    <TableRow key={entry.username} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center font-mono text-xs font-semibold">
                        #{idx + 1}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/contests/${code}/users/${encodeURIComponent(entry.username)}`}
                            className="hover:text-primary hover:underline"
                          >
                            {entry.username}
                          </Link>
                          <UserBadge username={entry.username} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums font-semibold">
                        {entry.submitted_count}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                        {entry.accepted_count}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-rose-700 dark:text-rose-400">
                        {entry.rejected_count}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-amber-700 dark:text-amber-400">
                        {entry.pending_count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
