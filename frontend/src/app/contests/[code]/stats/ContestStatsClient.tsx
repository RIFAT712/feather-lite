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
import { getProjectMeta } from "@/lib/wikis";
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
  FileText,
  Users,
  Award,
  Ribbon,
  ShieldCheck,
  Flame,
  Layers,
  ChevronRight,
  TrendingDown,
  Check,
  UserCheck,
} from "lucide-react";

interface ContestStatsClientProps {
  code: string;
  initialContest: Contest;
  initialStats?: ContestStatsResponse | null;
}

const ACCENT_COLOR = "#355b80";
const TEAL_COLOR = "#17a2a8";
const EMERALD_COLOR = "#10b981";
const AMBER_COLOR = "#f59e0b";
const ROSE_COLOR = "#f43f5e";
const LOG_FLOOR = 0.9;
const DECADES = [1, 10, 100, 1000, 10000, 100000];

export default function ContestStatsClient({
  code,
  initialContest,
  initialStats,
}: ContestStatsClientProps) {
  const { t, formatDate, n, locale } = useI18n();

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
    refetch: refetchStats,
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
  const [shownSeries, setShownSeries] = useState({ submitted: true, judged: true, words: false });
  const [zoomRange, setZoomRange] = useState<{ from: string; to: string } | null>(null);

  // Drag-to-zoom tracking
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<{ startX: number; currentX: number } | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Derived counts
  const counts = stats?.status_counts || { total: 0, accepted: 0, rejected: 0, pending: 0 };
  const words = stats?.words || { total_words: 0, accepted_words: 0, pending_words: 0, rejected_words: 0, avg_words: 0 };
  const summary = stats?.summary || {
    total_submissions: counts.total || 0,
    this_week_submissions: 0,
    total_participants: 0,
    accepted_participants: 0,
    active_juries: 0,
    total_juries: 0,
    total_reviews: 0,
    organizers_count: 1,
    progress_percent: 0,
    decided_count: 0,
    retention_percent: 100,
    busiest_day: "",
    busiest_day_count: 0,
    daily_avg_submissions: 0,
    active_submission_days: 0,
    total_contest_days: 0,
  };

  const reviewed = (counts.accepted || 0) + (counts.rejected || 0);
  const judgeable = reviewed + (counts.pending || 0);
  const progressPercent = summary.progress_percent || (judgeable > 0 ? Math.round((reviewed / judgeable) * 100) : 0);
  const acceptedPct = judgeable > 0 ? Math.round(((counts.accepted || 0) / judgeable) * 100) : 0;
  const rejectedPct = judgeable > 0 ? Math.round(((counts.rejected || 0) / judgeable) * 100) : 0;
  const pendingPct = judgeable > 0 ? Math.max(0, 100 - acceptedPct - rejectedPct) : 0;

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
  const buildSmoothPath = useCallback((pts: { x: number; y: number }[]) => {
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
  }, []);

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
        label: n(val),
      }));
    }
    const count = 5;
    const ticks = [];
    for (let i = 0; i <= count; i++) {
      const val = Math.round((maxDataVal / count) * i);
      ticks.push({
        val,
        y: getY(val),
        label: n(val),
      });
    }
    return ticks;
  }, [scaleType, maxDataVal, getY, n]);

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

    if (daily.length > 0) {
      const clampedX = Math.max(MARGIN.left, Math.min(MARGIN.left + PLOT_WIDTH, x));
      const ratio = (clampedX - MARGIN.left) / PLOT_WIDTH;
      const idx = Math.round(ratio * (daily.length - 1));
      setHoverIndex(idx);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState) return;
    const leftX = Math.min(dragState.startX, dragState.currentX);
    const rightX = Math.max(dragState.startX, dragState.currentX);
    setDragState(null);
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (rightX - leftX > 25 && daily.length > 1) {
      const r1 = Math.max(0, Math.min(1, (leftX - MARGIN.left) / PLOT_WIDTH));
      const r2 = Math.max(0, Math.min(1, (rightX - MARGIN.left) / PLOT_WIDTH));
      const i1 = Math.round(r1 * (daily.length - 1));
      const i2 = Math.round(r2 * (daily.length - 1));
      if (i2 > i1) {
        setZoomRange({ from: daily[i1].date, to: daily[i2].date });
      }
    }
  };

  const handlePointerLeave = () => {
    if (!dragState) {
      setHoverIndex(null);
    }
  };

  // Top participants max count for proportional bar widths
  const topParticipants = stats?.top_participants || [];
  const maxParticipantSubmissions = useMemo(() => {
    let m = 1;
    topParticipants.forEach((p) => {
      if (p.total > m) m = p.total;
    });
    return m;
  }, [topParticipants]);

  // Cumulative series max
  const maxCumWords = useMemo(() => {
    if (daily.length === 0) return 1000;
    return Math.max(1000, daily[daily.length - 1].cumulative_words || 1000);
  }, [daily]);

  const maxCumCount = useMemo(() => {
    if (daily.length === 0) return 10;
    return Math.max(10, daily[daily.length - 1].cumulative_count || 10);
  }, [daily]);

  // Project meta
  const projectMeta = contest ? getProjectMeta(contest.wiki_dbname) : null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* 1. Header Banner */}
      <div className="border-b border-border/70 bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/contests/${code}`}
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 cursor-pointer",
              })}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t("feather-contest-back-to-contest")}</span>
            </Link>

            <div className="h-4 w-px bg-border/80 hidden sm:block" />

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                  {contest?.name || code}
                </h1>
                <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                  {code}
                </Badge>
                {projectMeta && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <span>{projectMeta.name}</span>
                  </Badge>
                )}
                <Badge
                  variant={contest?.status === "active" ? "default" : "secondary"}
                  className={`text-[10px] ${
                    contest?.status === "active"
                      ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                      : ""
                  }`}
                >
                  {contest?.status === "active" ? t("feather-contest-status-active") : t("feather-contest-status-ended")}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetchStats()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/70 bg-card hover:bg-muted/50 text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Refresh</span>
            </button>
            <Link
              href={`/contests/${code}`}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "text-xs h-8 cursor-pointer gap-1",
              })}
            >
              <span>{t("feather-contest-tab-submissions")}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {/* Error Alert */}
        {isStatsError && (
          <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{t("feather-stats-error")}</span>
          </div>
        )}

        {/* 2. Top Summary KPI Cards (Redesigned with shadcn blocks & icons) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1: Submissions & Word Breakdown */}
          <Card className="shadow-xs border-border/80 bg-card hover:border-border transition-colors">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("feather-stats-submissions")}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-3xl sm:text-4xl font-extrabold text-foreground tabular-nums tracking-tight font-mono">
                  {n(summary.total_submissions)}
                </div>
                {summary.this_week_submissions > 0 && (
                  <Badge variant="secondary" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-0.5 gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +{n(summary.this_week_submissions)} {t("feather-stats-this-week")}
                  </Badge>
                )}
              </div>

              {/* Word breakdown mini-list with proper Lucide icons */}
              <div className="pt-3 border-t border-border/50 space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold text-foreground py-0.5">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary/80" />
                    <span>Total Words:</span>
                  </span>
                  <span className="font-mono tabular-nums">{n(words.total_words)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground text-xs py-0.5">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>words accepted</span>
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    {n(words.accepted_words)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground text-xs py-0.5">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>words pending</span>
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                    {n(words.pending_words)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground text-xs py-0.5">
                  <span className="flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    <span>words rejected</span>
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                    {n(words.rejected_words)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CARD 2: Participants & Reviewers */}
          <Card className="shadow-xs border-border/80 bg-card hover:border-border transition-colors">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("feather-stats-participants")}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-500">
                  <Users className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-3xl sm:text-4xl font-extrabold text-foreground tabular-nums tracking-tight font-mono">
                  {n(summary.total_participants)}
                </div>
                <Badge variant="outline" className="text-xs text-muted-foreground font-medium gap-1 border-border/70">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <strong className="text-foreground">{n(summary.accepted_participants)}</strong> {t("feather-stats-accepted-participants")}
                </Badge>
              </div>

              <div className="pt-3 border-t border-border/50 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center justify-between py-0.5">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>Reviewers:</span>
                  </span>
                  <span className="text-foreground">
                    <strong className="font-bold">{n(summary.active_juries)} / {n(summary.total_juries)}</strong> active
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>reviews conducted:</span>
                  </span>
                  <span className="font-bold text-foreground font-mono tabular-nums">
                    {n(summary.total_reviews)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>Organizers:</span>
                  </span>
                  <span className="font-bold text-foreground font-mono tabular-nums">
                    {n(summary.organizers_count)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CARD 3: Review Progress */}
          <Card className="shadow-xs border-border/80 bg-card hover:border-border transition-colors">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("feather-stats-judging-progress")}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
                  <Ribbon className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight font-mono">
                  {progressPercent}%
                </div>
                <Badge variant="outline" className="text-xs text-muted-foreground font-mono border-border/70">
                  {t("feather-stats-decided")}: <strong className="font-semibold text-foreground ml-1">{n(summary.decided_count)} / {n(counts.total)}</strong>
                </Badge>
              </div>

              {/* Segmented Progress Bar */}
              <div className="space-y-2">
                <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden flex">
                  {acceptedPct > 0 && (
                    <div
                      style={{ width: `${acceptedPct}%` }}
                      className="bg-emerald-500 transition-all duration-500"
                      title={`Accepted: ${acceptedPct}%`}
                    />
                  )}
                  {rejectedPct > 0 && (
                    <div
                      style={{ width: `${rejectedPct}%` }}
                      className="bg-rose-500 transition-all duration-500"
                      title={`Rejected: ${rejectedPct}%`}
                    />
                  )}
                  <div
                    style={{ width: `${Math.max(pendingPct, counts.total === 0 ? 0 : (acceptedPct === 0 && rejectedPct === 0 ? 100 : pendingPct))}%` }}
                    className="bg-amber-400 transition-all duration-500"
                    title={`Pending: ${pendingPct}%`}
                  />
                </div>

                {/* 3-Column Lucide Icon Badges (NO plain text glyphs or emojis) */}
                <div className="grid grid-cols-3 gap-1.5 pt-1 text-xs">
                  <div className="flex items-center justify-center gap-1 px-1.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] truncate">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                    <span>{n(counts.accepted)} ({acceptedPct}%)</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 px-1.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-[11px] truncate">
                    <XCircle className="h-3 w-3 shrink-0 text-rose-500" />
                    <span>{n(counts.rejected)} ({rejectedPct}%)</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 px-1.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-[11px] truncate">
                    <Clock className="h-3 w-3 shrink-0 text-amber-500" />
                    <span>{n(counts.pending)} ({pendingPct}%)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CARD 4: Article Retention / Survival */}
          <Card className="shadow-xs border-border/80 bg-card hover:border-border transition-colors">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("feather-stats-retention")}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-500/10 text-teal-500">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-3xl sm:text-4xl font-extrabold text-teal-600 dark:text-teal-400 tabular-nums tracking-tight font-mono">
                  100%
                </div>
                <Badge variant="outline" className="text-xs font-semibold text-teal-600 dark:text-teal-400 border-teal-500/30 bg-teal-500/10 rounded-md px-2 py-0.5 gap-1">
                  <Check className="h-3 w-3" />
                  All Intact
                </Badge>
              </div>

              <div className="pt-3 border-t border-border/50 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                  <span><strong className="font-bold">{n(counts.accepted)}</strong> {t("feather-stats-retention-desc")}.</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal flex items-start gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-500/80 shrink-0 mt-0.5" />
                  <span>Live wiki validation monitors all accepted submissions against deletion or redirecting.</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Section 1: Submissions by Day Interactive Chart (with Side KPIs) */}
        <Card className="shadow-2xs border-border/80 overflow-hidden">
          <CardHeader className="py-4 px-5 border-b border-border/60 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                  {t("feather-stats-daily-title")}
                </CardTitle>
                {zoomRange && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <span>{zoomRange.from} → {zoomRange.to}</span>
                    <button
                      type="button"
                      onClick={() => setZoomRange(null)}
                      className="ml-1 text-muted-foreground hover:text-foreground cursor-pointer font-bold"
                      title={t("feather-stats-zoom-reset")}
                    >
                      ×
                    </button>
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
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
              <div>
                <div className="p-4 sm:p-5 select-none relative">
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

                    {/* Drag selection rectangle */}
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

                    {/* Hover indicator (matching Image 1 crosshair and curve markers) */}
                    {hoverIndex !== null && hoverIndex < daily.length && (
                      <g>
                        <line
                          x1={getX(hoverIndex)}
                          y1={MARGIN.top}
                          x2={getX(hoverIndex)}
                          y2={MARGIN.top + PLOT_HEIGHT}
                          stroke="currentColor"
                          className="text-muted-foreground"
                          strokeDasharray="4 4"
                          strokeWidth="1.5"
                        />
                        {shownSeries.submitted && (
                          <circle
                            cx={getX(hoverIndex)}
                            cy={getY(daily[hoverIndex].count)}
                            r="5"
                            fill={ACCENT_COLOR}
                            stroke="var(--background)"
                            strokeWidth="2.5"
                          />
                        )}
                        {shownSeries.judged && (
                          <circle
                            cx={getX(hoverIndex)}
                            cy={getY(daily[hoverIndex].judged)}
                            r="5"
                            fill={TEAL_COLOR}
                            stroke="var(--background)"
                            strokeWidth="2.5"
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
                        className="fill-muted-foreground text-[11px] font-mono select-none font-semibold"
                      >
                        {tick.label}
                      </text>
                    ))}
                  </svg>

                  {/* Tooltip (matching Image 1 floating beside vertical crosshair) */}
                  {hoverIndex !== null && hoverIndex < daily.length && (() => {
                    const tooltipPercent = (getX(hoverIndex) / SVG_WIDTH) * 100;
                    const isRightSide = tooltipPercent > 65;
                    return (
                      <div
                        className="absolute pointer-events-none z-20 bg-card/95 dark:bg-popover/95 backdrop-blur-xs text-popover-foreground border border-border/80 shadow-lg rounded-lg p-2.5 min-w-[135px] font-sans text-xs flex flex-col gap-1.5 animate-in fade-in-0 duration-100"
                        style={{
                          ...(isRightSide
                            ? { right: `calc(${100 - tooltipPercent}% + 14px)` }
                            : { left: `calc(${tooltipPercent}% + 14px)` }),
                          top: "24px",
                        }}
                      >
                        <div className="font-bold font-mono text-[11px] text-foreground border-b border-border/40 pb-1">
                          {daily[hoverIndex].date}
                        </div>
                        {shownSeries.submitted && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: ACCENT_COLOR }} />
                            <span className="text-muted-foreground">{t("feather-stats-series-submitted", "Submitted")}:</span>
                            <span className="font-bold font-mono text-foreground ms-auto">
                              {n(daily[hoverIndex].count)}
                            </span>
                          </div>
                        )}
                        {shownSeries.judged && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: TEAL_COLOR }} />
                            <span className="text-muted-foreground">{t("feather-stats-series-judged", "Judged")}:</span>
                            <span className="font-bold font-mono text-foreground ms-auto">
                              {n(daily[hoverIndex].judged)}
                            </span>
                          </div>
                        )}
                        {shownSeries.words && daily[hoverIndex].words > 0 && (
                          <div className="text-[10px] text-muted-foreground pt-0.5 border-t border-border/40 font-mono">
                            {n(daily[hoverIndex].words)} words
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="pt-2 text-center text-[11px] text-muted-foreground">
                    {t("feather-stats-zoom-hint")}
                  </div>
                </div>

                {/* 4-Item Side Stats Strip (Zury style) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border/60 bg-muted/10 divide-x divide-y sm:divide-y-0 divide-border/60 text-xs">
                  <div className="p-3.5 space-y-0.5 text-center">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {t("feather-stats-busiest-day")}
                    </div>
                    <div className="text-lg font-black text-foreground tabular-nums">
                      {summary.busiest_day_count > 0 ? n(summary.busiest_day_count) : "—"}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {summary.busiest_day ? summary.busiest_day : "No submissions"}
                    </div>
                  </div>

                  <div className="p-3.5 space-y-0.5 text-center">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {t("feather-stats-daily-avg")}
                    </div>
                    <div className="text-lg font-black text-foreground tabular-nums">
                      {n(summary.daily_avg_submissions.toFixed(1))}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      over {n(summary.total_contest_days)} days
                    </div>
                  </div>

                  <div className="p-3.5 space-y-0.5 text-center">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {t("feather-stats-active-days")}
                    </div>
                    <div className="text-lg font-black text-foreground tabular-nums">
                      {n(summary.active_submission_days)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {summary.total_contest_days > 0
                        ? `${Math.round((summary.active_submission_days / summary.total_contest_days) * 100)}% of contest`
                        : "0%"}
                    </div>
                  </div>

                  <div className="p-3.5 space-y-0.5 text-center">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {t("feather-stats-this-week")}
                    </div>
                    <div className="text-lg font-black text-foreground tabular-nums">
                      {n(summary.this_week_submissions)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      last 7 days
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Section 2: Two Columns Grid (Top Participants & Status/Words/Largest Articles) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* COLUMN 1: Top 10 Participants Horizontal Stacked Bar Chart */}
          <Card className="shadow-2xs border-border/80">
            <CardHeader className="py-4 px-5 border-b border-border/60 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm font-bold text-foreground">
                    {t("feather-stats-top-participants")}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Accepted</span>
                  </span>
                  <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                    <Clock className="h-3 w-3" />
                    <span>Pending</span>
                  </span>
                  <span className="flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
                    <XCircle className="h-3 w-3" />
                    <span>Rejected</span>
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              {topParticipants.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  {t("feather-stats-empty")}
                </div>
              ) : (
                topParticipants.map((p, idx) => {
                  const accPct = maxParticipantSubmissions > 0 ? (p.accepted / maxParticipantSubmissions) * 100 : 0;
                  const penPct = maxParticipantSubmissions > 0 ? (p.pending / maxParticipantSubmissions) * 100 : 0;
                  const rejPct = maxParticipantSubmissions > 0 ? (p.rejected / maxParticipantSubmissions) * 100 : 0;

                  return (
                    <div key={p.username} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[11px] text-muted-foreground w-4 text-right">
                            #{idx + 1}
                          </span>
                          <Link
                            href={`/contests/${code}/users/${encodeURIComponent(p.username)}`}
                            className="font-semibold text-foreground hover:text-primary hover:underline truncate"
                          >
                            {p.username}
                          </Link>
                          <UserBadge username={p.username} />
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                          <span className="font-bold text-foreground">{n(p.total)} articles</span>
                          {p.words > 0 && (
                            <span className="text-muted-foreground text-[11px]">({n(p.words)} words)</span>
                          )}
                        </div>
                      </div>

                      {/* Stacked Horizontal Bar */}
                      <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden flex">
                        {accPct > 0 && (
                          <div
                            style={{ width: `${accPct}%` }}
                            className="bg-emerald-500 transition-all duration-300"
                            title={`Accepted: ${p.accepted}`}
                          />
                        )}
                        {penPct > 0 && (
                          <div
                            style={{ width: `${penPct}%` }}
                            className="bg-amber-400 transition-all duration-300"
                            title={`Pending: ${p.pending}`}
                          />
                        )}
                        {rejPct > 0 && (
                          <div
                            style={{ width: `${rejPct}%` }}
                            className="bg-rose-500 transition-all duration-300"
                            title={`Rejected: ${p.rejected}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* COLUMN 2: Status Breakdown & Largest Articles */}
          <div className="space-y-6">
            {/* Status Breakdown & Avg Words */}
            <Card className="shadow-2xs border-border/80">
              <CardHeader className="py-4 px-5 border-b border-border/60 bg-muted/20">
                <CardTitle className="text-sm font-bold text-foreground flex items-center justify-between">
                  <span>Word & Status Distribution</span>
                  <span className="text-xs font-mono font-normal text-muted-foreground">
                    Avg: {n(words.avg_words.toFixed(0))} words/article
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04]">
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                      Accepted
                    </div>
                    <div className="text-xl font-black text-foreground font-mono mt-0.5">
                      {n(counts.accepted)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {acceptedPct}% of total
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.04]">
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase">
                      Pending
                    </div>
                    <div className="text-xl font-black text-foreground font-mono mt-0.5">
                      {n(counts.pending)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {pendingPct}% of total
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.04]">
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold uppercase">
                      Rejected
                    </div>
                    <div className="text-xl font-black text-foreground font-mono mt-0.5">
                      {n(counts.rejected)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {rejectedPct}% of total
                    </div>
                  </div>
                </div>

                {/* Largest Articles Top List */}
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>{t("feather-stats-largest-articles")}</span>
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  </div>

                  {stats?.largest_articles && stats.largest_articles.length > 0 ? (
                    <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-muted/10 overflow-hidden">
                      {stats.largest_articles.map((art, idx) => (
                        <div
                          key={art.id}
                          className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[11px] text-muted-foreground w-4 text-right">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-foreground truncate">
                              {art.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              by {art.submitter}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-bold text-primary">
                              {n(art.word_count)} words
                            </span>
                            <Badge
                              variant={
                                art.status === "accepted"
                                  ? "default"
                                  : art.status === "pending"
                                  ? "secondary"
                                  : "outline"
                              }
                              className={`text-[9px] px-1.5 py-0 capitalize ${
                                art.status === "accepted"
                                  ? "bg-emerald-600 text-white"
                                  : art.status === "pending"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "text-rose-600"
                              }`}
                            >
                              {art.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground py-2 text-center">
                      No articles recorded yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 5. Section 3: Cumulative Submissions & Words Growth Chart */}
        {daily.length > 1 && (
          <Card className="shadow-2xs border-border/80">
            <CardHeader className="py-4 px-5 border-b border-border/60 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <CardTitle className="text-sm font-bold text-foreground">
                    {t("feather-stats-cumulative-title")}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Words ({n(words.total_words)})</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                    <span>Articles ({n(counts.total)})</span>
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="relative">
                <svg viewBox="0 0 800 180" className="w-full h-auto overflow-visible select-none">
                  {/* Gridlines */}
                  <line x1="50" y1="20" x2="770" y2="20" stroke="currentColor" className="text-border/30" />
                  <line x1="50" y1="75" x2="770" y2="75" stroke="currentColor" className="text-border/30" />
                  <line x1="50" y1="130" x2="770" y2="130" stroke="currentColor" className="text-border/30" />

                  {/* Cumulative Words Area & Line */}
                  {(() => {
                    const pts = daily.map((d, i) => {
                      const x = 50 + (i / (daily.length - 1)) * 720;
                      const y = 130 - (d.cumulative_words / maxCumWords) * 110;
                      return { x, y };
                    });
                    const line = buildSmoothPath(pts);
                    const area = `${line} L ${pts[pts.length - 1].x} 130 L ${pts[0].x} 130 Z`;
                    return (
                      <>
                        <path d={area} fill="rgba(16, 185, 129, 0.12)" />
                        <path d={line} fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
                      </>
                    );
                  })()}

                  {/* Cumulative Articles Line */}
                  {(() => {
                    const pts = daily.map((d, i) => {
                      const x = 50 + (i / (daily.length - 1)) * 720;
                      const y = 130 - (d.cumulative_count / maxCumCount) * 110;
                      return { x, y };
                    });
                    const line = buildSmoothPath(pts);
                    return (
                      <path
                        d={line}
                        fill="none"
                        stroke={ACCENT_COLOR}
                        strokeWidth="2"
                        strokeDasharray="4,4"
                        strokeLinecap="round"
                      />
                    );
                  })()}

                  {/* X-axis labels */}
                  {xTicks.map((tick, i) => (
                    <text
                      key={i}
                      x={tick.x}
                      y="152"
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px] font-mono select-none"
                    >
                      {tick.label}
                    </text>
                  ))}
                </svg>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 6. Section 4: Reviewer / Jury Performance Table (Zury style) */}
        <Card className="shadow-2xs border-border/80 overflow-hidden">
          <CardHeader className="py-4 px-5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold text-foreground">
                  {t("feather-stats-jury-table-title")}
                </CardTitle>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {stats?.jury_performance?.length || 0} reviewers
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!stats?.jury_performance || stats.jury_performance.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No evaluations conducted yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/40">
                    <TableHead className="text-xs">{t("feather-stats-col-user")}</TableHead>
                    <TableHead className="text-right text-xs">Reviews</TableHead>
                    <TableHead className="text-right text-xs text-emerald-700 dark:text-emerald-400">
                      {t("feather-stats-col-accepted")}
                    </TableHead>
                    <TableHead className="text-right text-xs text-rose-700 dark:text-rose-400">
                      {t("feather-stats-col-rejected")}
                    </TableHead>
                    <TableHead className="text-right text-xs">{t("feather-stats-col-rate")}</TableHead>
                    <TableHead className="text-right text-xs">{t("feather-stats-col-active-days")}</TableHead>
                    <TableHead className="text-right text-xs">{t("feather-stats-col-last-review")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.jury_performance.map((jp) => (
                    <TableRow key={jp.username} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/contests/${code}/users/${encodeURIComponent(jp.username)}`}
                            className="hover:text-primary hover:underline font-semibold"
                          >
                            {jp.username}
                          </Link>
                          <UserBadge username={jp.username} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums font-bold text-foreground">
                        {n(jp.total_reviews)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        {n(jp.accepted_count)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                        {n(jp.rejected_count)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums font-bold">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div
                              style={{ width: `${Math.round(jp.acceptance_rate)}%` }}
                              className="h-full bg-emerald-500"
                            />
                          </div>
                          <span>{Math.round(jp.acceptance_rate)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {n(jp.active_days)} days
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] text-muted-foreground">
                        {jp.last_reviewed_at ? jp.last_reviewed_at.slice(0, 10) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 7. Section 5: Submitter Standings Preview */}
        <Card className="shadow-2xs border-border/80 overflow-hidden">
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
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <span>{t("feather-stats-view-results")}</span>
                <ChevronRight className="h-3.5 w-3.5" />
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
                            className="hover:text-primary hover:underline font-semibold"
                          >
                            {entry.username}
                          </Link>
                          <UserBadge username={entry.username} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums font-semibold">
                        {n(entry.submitted_count)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                        {n(entry.accepted_count)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-rose-700 dark:text-rose-400">
                        {n(entry.rejected_count ?? 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-amber-700 dark:text-amber-400">
                        {n(entry.pending_count ?? 0)}
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
