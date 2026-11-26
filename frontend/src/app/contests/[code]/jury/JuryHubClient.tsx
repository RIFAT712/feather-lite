"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchContest,
  fetchJuryStats,
  redistributeContestQueues,
  fetchMe,
  Contest,
  JuryStatsResponse,
  UserSession,
  AUTH_BASE,
} from "@/lib/api";
import { WikimediaLogoIcon } from "@/components/icons/CodexIcons";
import { useI18n } from "@/i18n/I18nContext";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  FileText,
  Download,
  Users,
  Award,
  Play,
  Lock,
  Copy,
  Check,
  Code2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import JuryAnalyticsCharts from "@/components/charts/JuryAnalyticsCharts";
import UserBadge, { ContestRoleScope } from "@/components/users/UserBadge";

interface JuryHubClientProps {
  code: string;
  initialContest: Contest | null;
  initialUser: UserSession | null;
  initialStats: JuryStatsResponse | null;
}

export default function JuryHubClient({
  code,
  initialContest,
  initialUser,
  initialStats,
}: JuryHubClientProps) {
  const queryClient = useQueryClient();
  const { t, n } = useI18n();

  const [isRedistributing, setIsRedistributing] = useState(false);
  const [copiedWikitable, setCopiedWikitable] = useState(false);

  // 1. User Session Query (hydrated with SSR initialUser)
  const { data: me } = useQuery<UserSession | null>({
    queryKey: ["me"],
    queryFn: fetchMe,
    initialData: initialUser,
    staleTime: 60 * 1000,
  });

  // 2. Contest Metadata Query (hydrated with SSR initialContest)
  const { data: contest } = useQuery<Contest>({
    queryKey: ["contest", code],
    queryFn: () => fetchContest(code),
    initialData: initialContest || undefined,
    staleTime: 30 * 1000,
  });

  const contestRoles = useMemo<ContestRoleScope>(() => ({
    organizers: contest?.organizers,
    juries: contest?.juries,
    createdBy: contest?.created_by_username,
  }), [contest?.organizers, contest?.juries, contest?.created_by_username]);

  // Authorization Check
  const isJuryOrOwner = useMemo(() => {
    if (!me?.is_authenticated) return false;
    if (me.role === "owner" || me.role === "admin" || me.is_owner || me.is_admin) return true;
    if (contest?.created_by_id && me.user_id && contest.created_by_id === me.user_id) return true;
    const meLower = me.wiki_username?.trim().toLowerCase();
    if (!meLower) return false;
    if (contest?.created_by_username && contest.created_by_username.trim().toLowerCase() === meLower) return true;
    if (contest?.organizers?.some((o) => o.trim().toLowerCase() === meLower)) return true;
    if (contest?.juries?.some((j) => j.trim().toLowerCase() === meLower)) return true;
    return false;
  }, [me, contest]);

  // 3. Jury Statistics Query (hydrated with SSR initialStats)
  const { data: stats, isLoading: statsLoading, refetch } = useQuery<JuryStatsResponse>({
    queryKey: ["jury-stats", code],
    queryFn: () => fetchJuryStats(code),
    initialData: initialStats || undefined,
    enabled: isJuryOrOwner,
    refetchInterval: 20 * 1000,
  });

  // Queue Redistribution Action
  const handleRedistribute = async () => {
    if (isRedistributing) return;
    setIsRedistributing(true);
    try {
      const res = await redistributeContestQueues(code);
      toast.success(res.message || t("feather-jury-rebalance-success", res.moved));
      queryClient.invalidateQueries({ queryKey: ["jury-stats", code] });
      queryClient.invalidateQueries({ queryKey: ["articles", code] });
      queryClient.invalidateQueries({ queryKey: ["contest", code] });
    } catch (err: any) {
      toast.error(err.message || "Failed to redistribute queues.");
    } finally {
      setIsRedistributing(false);
    }
  };

  // CSV Export Generator
  const handleExportCSV = () => {
    if (!stats?.juries) return;
    const headers = [
      t("feather-jury-col-member"),
      t("feather-jury-col-assigned"),
      t("feather-jury-col-judged"),
      t("feather-jury-col-remaining"),
      t("feather-jury-col-accepted"),
      t("feather-jury-col-rejected"),
      t("feather-jury-col-acceptance-rate"),
    ];
    const rows = stats.juries.map((j) => [
      j.username,
      j.assigned,
      j.judged,
      j.remaining,
      j.accepted,
      j.rejected,
      `${j.acceptance_rate}%`,
    ]);
    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feather_jury_stats_${code}.csv`;
    a.click();
    toast.success("Downloaded jury_stats.csv");
  };

  // JSON Export Generator
  const handleExportJSON = () => {
    if (!stats) return;
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feather_jury_stats_${code}.json`;
    a.click();
    toast.success("Downloaded jury_stats.json");
  };

  // Wikitable Generator
  const wikitableContent = useMemo(() => {
    if (!stats?.juries) return "";
    let wt = '{| class="wikitable sortable"\n! ' +
      [
        t("feather-jury-col-member"),
        t("feather-jury-col-assigned"),
        t("feather-jury-col-judged"),
        t("feather-jury-col-remaining"),
        t("feather-jury-col-accepted"),
        t("feather-jury-col-rejected"),
        t("feather-jury-col-acceptance-rate"),
      ].join(" !! ") +
      "\n";
    stats.juries.forEach((j) => {
      wt += `|-\n| [[User:${j.username}|${j.username}]] || ${j.assigned} || ${j.judged} || ${j.remaining} || ${j.accepted} || ${j.rejected} || ${j.acceptance_rate}%\n`;
    });
    wt += "|}";
    return wt;
  }, [stats?.juries, t]);

  const handleCopyWikitable = async () => {
    if (!wikitableContent) return;
    try {
      await navigator.clipboard.writeText(wikitableContent);
      setCopiedWikitable(true);
      toast.success(t("feather-jury-wikitable-copied"));
      setTimeout(() => setCopiedWikitable(false), 2000);
    } catch {
      toast.error("Failed to copy wikitable to clipboard.");
    }
  };

  const handleExportWikitableFile = () => {
    if (!wikitableContent) return;
    const blob = new Blob([wikitableContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feather_jury_report_${code}.txt`;
    a.click();
    toast.success("Downloaded jury_report.txt");
  };

  // Restrict View if not Jury or Owner
  if (!isJuryOrOwner) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-lg text-center space-y-5">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto shadow-2xs border border-destructive/20">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t("feather-jury-access-restricted-title")}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t("feather-jury-access-restricted-desc")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <Link href={`/contests/${code}`} className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs gap-1.5 cursor-pointer">
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              <span>{t("feather-jury-back-dashboard")}</span>
            </Button>
          </Link>
          {!me?.is_authenticated && (
            <a
              href={`${AUTH_BASE}/login`}
              className={buttonVariants({
                variant: "default",
                size: "sm",
                className: "w-full sm:w-auto text-xs gap-1.5 font-semibold cursor-pointer shadow-xs",
              })}
            >
              <WikimediaLogoIcon className="h-4 w-4" />
              <span>{t("feather-nav-login")}</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl space-y-6">
      
      {/* 1. Executive Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/contests/${code}`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
            >
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180 transition-transform group-hover:-translate-x-0.5" />
              <span className="font-medium">{contest?.name || t("feather-nav-contests")}</span>
            </Link>
            <span className="text-border">•</span>
            {contest?.wiki_dbname && (
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 uppercase">
                {contest.wiki_dbname}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
              {t("feather-jury-hub-badge")}
            </Badge>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span>{t("feather-jury-hub-title")}</span>
          </h1>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedistribute}
            disabled={isRedistributing}
            className="h-8 text-xs gap-1.5 cursor-pointer shadow-2xs"
            title="Rebalance unjudged articles fairly across jury members"
          >
            <RotateCw className={`h-3 w-3 ${isRedistributing ? "animate-spin" : ""}`} />
            <span>{t("feather-jury-btn-rebalance")}</span>
          </Button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              data-slot="button"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "h-8 text-xs gap-1.5 cursor-pointer shadow-2xs",
              })}
            >
              <Download className="h-3.5 w-3.5 opacity-80" />
              <span>{t("feather-jury-export-title", "Export Report")}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t("feather-jury-export-title", "Export Report")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportCSV} className="text-xs cursor-pointer gap-2">
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                <span>{t("feather-jury-export-csv")} (CSV)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON} className="text-xs cursor-pointer gap-2">
                <Code2 className="h-3.5 w-3.5 text-amber-500" />
                <span>{t("feather-jury-export-json")} (JSON)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportWikitableFile} className="text-xs cursor-pointer gap-2">
                <Download className="h-3.5 w-3.5 text-emerald-500" />
                <span>{t("feather-jury-export-wikitable")} (.txt)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Primary CTA: Enter Review Queue */}
          <Link
            href={`/contests/${code}/review`}
            className={buttonVariants({
              variant: "default",
              size: "sm",
              className: "h-8 text-xs gap-1.5 font-semibold cursor-pointer shadow-xs",
            })}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{t("feather-jury-open-queue")}</span>
            <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-semibold px-1 py-0.5 rounded bg-primary-foreground/20 text-primary-foreground ms-1">
              R
            </kbd>
          </Link>
        </div>
      </div>

      {/* 2. Bento KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Metric 1: Total Submitted */}
        <Card className="border-border/80 shadow-2xs bg-card/60">
          <CardHeader className="py-2.5 px-3.5 pb-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              <span>{t("feather-jury-stat-total-submitted")}</span>
              <FileText className="h-3.5 w-3.5 text-muted-foreground/60" />
            </span>
          </CardHeader>
          <CardContent className="px-3.5 pb-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
              {stats ? n(stats.total_articles) : <Skeleton className="h-7 w-16" />}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {contest?.wiki_dbname ? `${contest.wiki_dbname} submissions` : "All submissions"}
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Pending Triage (Needs review) */}
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-2xs">
          <CardHeader className="py-2.5 px-3.5 pb-1">
            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{t("feather-jury-stat-pending")}</span>
              </span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/40 text-amber-700 dark:text-amber-400">
                Backlog
              </Badge>
            </span>
          </CardHeader>
          <CardContent className="px-3.5 pb-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700 dark:text-amber-400">
              {stats ? n(stats.pending_articles) : <Skeleton className="h-7 w-16" />}
            </div>
            <Link
              href={`/contests/${code}/review`}
              className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 hover:underline mt-0.5 font-medium cursor-pointer"
            >
              <span>{t("feather-jury-btn-start-review")}</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Metric 3: Accepted Articles */}
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-2xs">
          <CardHeader className="py-2.5 px-3.5 pb-1">
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>{t("feather-jury-stat-accepted")}</span>
              </span>
              {stats && stats.reviewed_articles > 0 && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-mono">
                  {n(Math.round((stats.accepted_articles / stats.reviewed_articles) * 100))}% rate
                </Badge>
              )}
            </span>
          </CardHeader>
          <CardContent className="px-3.5 pb-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
              {stats ? n(stats.accepted_articles) : <Skeleton className="h-7 w-16" />}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Verified & counted
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Rejected / Disqualified */}
        <Card className="border-destructive/30 bg-destructive/5 shadow-2xs">
          <CardHeader className="py-2.5 px-3.5 pb-1">
            <span className="text-[11px] font-medium text-destructive flex items-center justify-between">
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                <span>{t("feather-jury-stat-rejected")}</span>
              </span>
              {stats && stats.reviewed_articles > 0 && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-destructive/40 text-destructive font-mono">
                  {n(Math.round((stats.rejected_articles / stats.reviewed_articles) * 100))}%
                </Badge>
              )}
            </span>
          </CardHeader>
          <CardContent className="px-3.5 pb-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-destructive">
              {stats ? n(stats.rejected_articles) : <Skeleton className="h-7 w-16" />}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Did not meet criteria
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Overall Judging Progress Card */}
      {stats && (
        <Card className="border-border/80 shadow-2xs bg-card/60">
          <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/15 flex flex-row items-center justify-between">
            <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>{t("feather-jury-overall-progress")}</span>
            </CardTitle>
            <span className="font-mono text-xs font-bold text-primary">
              {t(
                "feather-jury-overall-judged",
                stats.reviewed_articles,
                stats.total_articles,
                stats.progress_percent
              )}
            </span>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {/* Progress Track */}
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border/40">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 shadow-2xs"
                style={{ width: `${Math.min(100, Math.max(0, stats.progress_percent))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <span>{n(stats.reviewed_articles)} completed</span>
              <span>{n(stats.pending_articles)} articles remaining</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jury Analytics Graphs */}
      {stats?.juries && stats.juries.length > 0 && (
        <JuryAnalyticsCharts juries={stats.juries} />
      )}

      {/* 4. Tabbed Workspace: Workload, Decisions, and Wikitable */}
      <Tabs defaultValue="workload" className="space-y-4">
        <TabsList className="bg-muted/70 p-1 border border-border/60">
          <TabsTrigger value="workload" className="text-xs gap-1.5 cursor-pointer">
            <Users className="h-3.5 w-3.5" />
            <span>{t("feather-jury-tab-workload", "Workload & Backlog")}</span>
          </TabsTrigger>
          <TabsTrigger value="decisions" className="text-xs gap-1.5 cursor-pointer">
            <Award className="h-3.5 w-3.5" />
            <span>{t("feather-jury-tab-decisions", "Decisions Breakdown")}</span>
          </TabsTrigger>
          <TabsTrigger value="wikitable" className="text-xs gap-1.5 cursor-pointer">
            <FileText className="h-3.5 w-3.5" />
            <span>{t("feather-jury-tab-wikitable", "Wikitable Report")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Workload Distribution Table */}
        <TabsContent value="workload">
          <Card className="border-border/80 shadow-2xs overflow-hidden bg-card/60">
            <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/15 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>{t("feather-jury-workload-title")}</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {t("feather-jury-workload-desc")}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {statsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full rounded" />
                  ))}
                </div>
              ) : stats?.juries && stats.juries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">{t("feather-jury-col-member")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-jury-col-assigned")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-jury-col-judged")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-jury-col-remaining")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-jury-col-accepted")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-jury-col-rejected")}</TableHead>
                      <TableHead className="w-36 text-right text-xs">{t("feather-jury-col-progress")}</TableHead>
                      <TableHead className="text-right text-xs">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.juries.map((jury) => (
                      <TableRow key={jury.username} className="transition-colors hover:bg-muted/40">
                        <TableCell className="font-semibold text-xs sm:text-sm text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] uppercase shrink-0 border border-primary/20">
                              {jury.username.charAt(0)}
                            </div>
                            <Link
                              href={`/contests/${code}/users/${encodeURIComponent(jury.username)}`}
                              className="hover:text-primary hover:underline transition-colors truncate"
                            >
                              {jury.username}
                            </Link>
                            <UserBadge username={jury.username} contestRoles={contestRoles} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{n(jury.assigned)}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                          {n(jury.judged)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <span className={jury.remaining > 0 ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground"}>
                            {n(jury.remaining)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          {n(jury.accepted)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-destructive">
                          {n(jury.rejected)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden shrink-0">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${jury.progress_percent}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-bold">{n(jury.progress_percent)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/contests/${code}/review`}
                            className={buttonVariants({
                              variant: "ghost",
                              size: "xs",
                              className: "text-[11px] gap-1 cursor-pointer text-primary hover:text-primary",
                            })}
                          >
                            <span>{t("feather-jury-action-review-assigned", "Review Queue")}</span>
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {t("feather-jury-no-members")}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Decisions Breakdown Table */}
        <TabsContent value="decisions">
          <Card className="border-border/80 shadow-2xs overflow-hidden bg-card/60">
            <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/15 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t("feather-jury-decisions-title")}</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {t("feather-jury-decisions-desc")}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {statsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full rounded" />
                  ))}
                </div>
              ) : stats?.juries && stats.juries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">{t("feather-jury-col-member")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-jury-col-total-evaluated")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-jury-col-accepted")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-jury-col-rejected")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-jury-col-skipped")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-jury-col-acceptance-rate")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.juries.map((jury) => (
                      <TableRow key={`activity-${jury.username}`} className="transition-colors hover:bg-muted/40">
                        <TableCell className="font-semibold text-xs sm:text-sm text-foreground">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/contests/${code}/users/${encodeURIComponent(jury.username)}`}
                              className="hover:text-primary hover:underline transition-colors"
                            >
                              {jury.username}
                            </Link>
                            <UserBadge username={jury.username} contestRoles={contestRoles} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                          {n(jury.judged)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          {n(jury.accepted)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-destructive">
                          {n(jury.rejected)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {n(jury.skipped)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[11px] ${
                              jury.acceptance_rate >= 50
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-muted text-muted-foreground border border-border/50"
                            }`}
                          >
                            {n(jury.acceptance_rate)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {t("feather-jury-no-decisions")}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: On-Wiki Wikitable Export */}
        <TabsContent value="wikitable">
          <Card className="border-border/80 shadow-2xs bg-card/60">
            <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/15 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>{t("feather-jury-tab-wikitable", "Wikitable Report")}</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Pre-formatted MediaWiki wikitable ready to copy into on-wiki reporting pages.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyWikitable}
                className="h-8 text-xs gap-1.5 cursor-pointer shadow-2xs"
              >
                {copiedWikitable ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedWikitable ? "Copied!" : t("feather-jury-btn-copy-wikitable", "Copy Wikitable")}</span>
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              <pre className="font-mono text-xs bg-muted/50 p-4 rounded-lg border border-border/60 overflow-x-auto text-foreground whitespace-pre leading-relaxed select-all">
                {wikitableContent || "No data available."}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

    </div>
  );
}
