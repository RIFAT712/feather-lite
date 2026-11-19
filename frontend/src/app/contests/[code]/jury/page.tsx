"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchContest,
  fetchJuryStats,
  redistributeContestQueues,
  fetchMe,
  Contest,
  JuryStatsResponse,
  AUTH_BASE,
} from "@/lib/api";
import { WikimediaLogoIcon } from "@/components/icons/CodexIcons";
import { useI18n } from "@/i18n/I18nContext";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  ExternalLink,
  Users,
  Award,
  Layers,
  Sparkles,
  BarChart3,
  Play,
  Lock,
} from "lucide-react";

export default function JuryStatsHubPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const queryClient = useQueryClient();
  const { t, n } = useI18n();

  const [isRedistributing, setIsRedistributing] = useState(false);

  // 1. User Session & Roles
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 60 * 1000,
  });

  // 2. Contest Metadata
  const { data: contest, isLoading: contestLoading } = useQuery<Contest>({
    queryKey: ["contest", code],
    queryFn: () => fetchContest(code),
  });

  // Authorization Check
  const isJuryOrOwner = useMemo(() => {
    if (!me?.is_authenticated) return false;
    if (me.role === "owner" || me.role === "jury") return true;
    if (contest?.juries && me.wiki_username && contest.juries.includes(me.wiki_username)) return true;
    return false;
  }, [me, contest]);

  // 3. Jury Statistics - only fetch if authorized
  const { data: stats, isLoading: statsLoading, refetch } = useQuery<JuryStatsResponse>({
    queryKey: ["jury-stats", code],
    queryFn: () => fetchJuryStats(code),
    enabled: isJuryOrOwner,
  });

  // Handle Queue Redistribution
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

  // Export Generators
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
    a.download = `jury_stats_${code}.csv`;
    a.click();
    toast.success("Downloaded jury_stats.csv");
  };

  const handleExportJSON = () => {
    if (!stats) return;
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jury_stats_${code}.json`;
    a.click();
    toast.success("Downloaded jury_stats.json");
  };

  const handleExportWikitable = () => {
    if (!stats?.juries) return;
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
    const blob = new Blob([wt], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jury_stats_${code}.txt`;
    a.click();
    toast.success("Downloaded jury_stats.txt (Wikitable)");
  };

  if (!isJuryOrOwner) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-lg text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto shadow-2xs">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("feather-jury-access-restricted-title")}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t("feather-jury-access-restricted-desc")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-3">
          <Link href={`/contests/${code}`} className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs gap-1.5 cursor-pointer">
              <ArrowLeft className="me-1.5 h-3.5 w-3.5 rtl:rotate-180" />
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 max-w-6xl space-y-6">
      {/* 1. Header Navigation Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/contests/${code}`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              <span>{contest?.name || t("feather-nav-contests")}</span>
            </Link>
            <span className="text-border">·</span>
            <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
              {t("feather-jury-hub-badge")}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span>{t("feather-jury-hub-title")}</span>
          </h1>
        </div>

        {/* Quick Actions & Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <Link
            href={`/contests/${code}/review`}
            className={buttonVariants({
              variant: "default",
              size: "sm",
              className: "h-8 text-xs gap-1.5 font-medium shadow-xs cursor-pointer",
            })}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{t("feather-jury-open-queue")}</span>
          </Link>

          <div className="flex items-center rounded-md border border-border bg-card shadow-2xs p-0.5 text-xs">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1 text-[11px] font-medium hover:bg-muted/70 rounded-xs transition-colors cursor-pointer"
              title="Export as CSV"
            >
              {t("feather-jury-export-csv")}
            </button>
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-2.5 py-1 text-[11px] font-medium hover:bg-muted/70 rounded-xs transition-colors cursor-pointer"
              title="Export as JSON"
            >
              {t("feather-jury-export-json")}
            </button>
            <button
              type="button"
              onClick={handleExportWikitable}
              className="px-2.5 py-1 text-[11px] font-medium hover:bg-muted/70 rounded-xs transition-colors cursor-pointer text-primary font-bold"
              title="Export as MediaWiki wikitable"
            >
              {t("feather-jury-export-wikitable")}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Ready to Judge? Hero Banner */}
      {stats && stats.pending_articles > 0 && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-foreground">{t("feather-jury-hero-title")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("feather-jury-hero-desc", stats.pending_articles)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

            <Link
              href={`/contests/${code}/review`}
              className={buttonVariants({
                variant: "default",
                size: "sm",
                className: "h-8 text-xs gap-1.5 font-semibold cursor-pointer shadow-xs",
              })}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{t("feather-jury-btn-start-review")}</span>
            </Link>
          </div>
        </div>
      )}

      {/* 3. Overall Judging Progress & KPI Cards */}
      <div className="space-y-4">
        {stats && (
          <Card className="border-border shadow-2xs">
            <CardHeader className="py-3 px-4 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between text-xs">
                <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span>{t("feather-jury-overall-progress")}</span>
                </CardTitle>
                <span className="font-mono font-bold text-primary">
                  {t(
                    "feather-jury-overall-judged",
                    stats.reviewed_articles,
                    stats.total_articles,
                    stats.progress_percent
                  )}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${stats.progress_percent}%` }}
                />
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("feather-jury-stat-total-submitted")}
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                    {n(stats.total_articles)}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-emerald-500/5 space-y-1">
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t("feather-jury-stat-accepted")}
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {n(stats.accepted_articles)}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-destructive/5 space-y-1">
                  <span className="text-[10px] font-semibold text-destructive uppercase tracking-wider flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {t("feather-jury-stat-rejected")}
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-destructive">
                    {n(stats.rejected_articles)}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-amber-500/5 space-y-1">
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t("feather-jury-stat-pending")}
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {n(stats.pending_articles)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 4. Individual Jury Member Progress Table */}
      <Card className="border-border shadow-2xs overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
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
            <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
              Crunching jury statistics...
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.juries.map((jury) => (
                  <TableRow key={jury.username} className="transition-colors hover:bg-muted/40">
                    <TableCell className="font-semibold text-xs sm:text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                          {jury.username.charAt(0)}
                        </div>
                        <Link
                          href={`/contests/${code}/users/${encodeURIComponent(jury.username)}`}
                          className="hover:text-primary hover:underline transition-colors truncate"
                        >
                          {jury.username}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{n(jury.assigned)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                      {n(jury.judged)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                      {n(jury.remaining)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
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

      {/* 5. Individual Jury Member Activity & Decisions Table */}
      <Card className="border-border shadow-2xs overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border bg-muted/20">
          <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t("feather-jury-decisions-title")}</span>
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            {t("feather-jury-decisions-desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {stats?.juries && stats.juries.length > 0 ? (
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
                      {jury.username}
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
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
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
    </div>
  );
}
