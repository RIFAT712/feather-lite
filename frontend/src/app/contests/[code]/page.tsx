"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  fetchContest, fetchStandings, fetchArticles, 
  Contest, StandingEntry, Article 
} from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Trophy, FileText, CheckCircle2, Clock, Upload, 
  ExternalLink, Calendar, BookOpen, Medal, ArrowLeft, 
  Users, ShieldCheck, Share2, Copy, Check, Search, 
  FileCode, CheckCheck, XCircle, AlertCircle, Layers
} from "lucide-react";

export default function ContestDashboardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { t, locale } = useI18n();

  // Local search and filter states
  const [standingsSearch, setStandingsSearch] = useState("");
  const [submissionsSearch, setSubmissionsSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCopied, setIsCopied] = useState(false);

  // Queries
  const { data: contest, isLoading: contestLoading } = useQuery<Contest>({
    queryKey: ["contest", code],
    queryFn: () => fetchContest(code),
  });

  const { data: standings, isLoading: standingsLoading } = useQuery<StandingEntry[]>({
    queryKey: ["standings", code],
    queryFn: () => fetchStandings(code),
  });

  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ["articles", code, statusFilter],
    queryFn: () => fetchArticles(code, undefined, statusFilter === "all" ? undefined : statusFilter, 100),
  });

  const articles = articlesData?.items || [];

  // Filtered Standings
  const filteredStandings = useMemo(() => {
    if (!standings) return [];
    if (!standingsSearch.trim()) return standings;
    const q = standingsSearch.toLowerCase().trim();
    return standings.filter((s) => s.username.toLowerCase().includes(q));
  }, [standings, standingsSearch]);

  // Filtered Submissions
  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    if (!submissionsSearch.trim()) return articles;
    const q = submissionsSearch.toLowerCase().trim();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.submitter_username.toLowerCase().includes(q)
    );
  }, [articles, submissionsSearch]);

  // Timeline Progress Calculation
  const timelineInfo = useMemo(() => {
    if (!contest) return { percent: 0, text: "", isEnded: false };
    const now = Date.now();
    const start = new Date(contest.start_date).getTime();
    const end = new Date(contest.end_date).getTime();
    const total = end - start;

    if (total <= 0) return { percent: 100, text: t("feather-contest-ended"), isEnded: true };
    if (now >= end) return { percent: 100, text: t("feather-contest-ended"), isEnded: true };
    if (now < start) {
      const daysUntil = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
      return { percent: 0, text: `Starts in ${daysUntil} days`, isEnded: false };
    }

    const elapsed = Math.min(Math.max(now - start, 0), total);
    const percent = Math.round((elapsed / total) * 100);
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return {
      percent,
      text: daysLeft === 0 ? t("feather-contest-today-end") : t("feather-contest-days-left-count", daysLeft),
      isEnded: false,
    };
  }, [contest, t]);

  // Generate Wikitext Table for Standings
  const wikitextTable = useMemo(() => {
    if (!standings || standings.length === 0) return "";
    const headers = locale === "bn"
      ? ["স্থান", "ব্যবহারকারী", "গৃহীত নিবন্ধ", "মোট শব্দ", "মোট বাইট", "মোট জমাকৃত"]
      : ["Rank", "User", "Accepted", "Total Words", "Total Bytes", "Submitted"];

    const lines: string[] = [
      '{| class="wikitable sortable" style="text-align:center"',
      `! ${headers.join(" !! ")}`,
    ];

    standings.forEach((s) => {
      lines.push("|-");
      lines.push(
        `| ${s.rank} || [[User:${s.username}|${s.username}]] || ${s.accepted_count} || ${s.total_words.toLocaleString()} || ${s.total_bytes.toLocaleString()} || ${s.submitted_count}`
      );
    });

    lines.push("|}");
    return lines.join("\n");
  }, [standings, locale]);

  const copyWikitext = () => {
    if (!wikitextTable) return;
    navigator.clipboard.writeText(wikitextTable);
    toast.success(t("feather-contest-wikitext-copied"));
  };

  const copyContestLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    toast.success(t("feather-contest-link-copied"));
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (contestLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-8 py-8 max-w-5xl">
        <div className="h-44 rounded-lg bg-muted/40 animate-pulse mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <h2 className="text-xl font-bold">{t("feather-contest-not-found")}</h2>
        <Link href="/" className={buttonVariants({ variant: "outline", className: "mt-4 cursor-pointer" })}>
          {t("feather-nav-back-contests")}
        </Link>
      </div>
    );
  }

  const isActive = contest.status === "active";
  const acceptanceRate = contest.total_articles && contest.total_articles > 0
    ? Math.round(((contest.accepted_articles || 0) / contest.total_articles) * 100)
    : 0;

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 max-w-5xl">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("feather-nav-back-contests")}
      </Link>

      {/* 1. Header Overview Card */}
      <Card className="mb-6 shadow-2xs border-border/80">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className="text-xs font-medium gap-1.5 px-2.5 py-0.5"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                    }`}
                  />
                  {isActive ? t("feather-contest-status-active") : contest.status}
                </Badge>

                <a
                  href={contest.wiki_url || `https://${contest.wiki_dbname}.org`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <BookOpen className="h-3 w-3" />
                  {contest.wiki_dbname}
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
              </div>

              <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {contest.name}
              </CardTitle>

              <CardDescription className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {contest.description || "No description provided."}
              </CardDescription>
            </div>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
              <Link
                href={`/contests/${code}/submit`}
                className={buttonVariants({
                  variant: "default",
                  size: "sm",
                  className: "flex-1 sm:flex-none gap-1.5 cursor-pointer font-medium shadow-xs",
                })}
              >
                <Upload className="h-4 w-4" />
                {t("feather-contest-action-submit")}
              </Link>

              <Link
                href={`/contests/${code}/review`}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "flex-1 sm:flex-none gap-1.5 cursor-pointer font-medium",
                })}
              >
                <ShieldCheck className="h-4 w-4" />
                {t("feather-contest-action-review")}
              </Link>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={copyContestLink}
                title={t("feather-contest-copy-link")}
                className="cursor-pointer text-muted-foreground hover:text-foreground"
              >
                {isCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Timeline & Metadata Footer */}
        <CardContent className="pt-3 border-t border-border/60">
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
              <div className="flex items-center gap-2 font-medium">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>
                  {new Date(contest.start_date).toLocaleDateString()} — {new Date(contest.end_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{timelineInfo.text}</span>
                <span className="text-muted-foreground/60">·</span>
                <span>{t("feather-contest-timeline-progress", timelineInfo.percent)}</span>
              </div>
            </div>

            {/* Visual Timeline Progress Bar */}
            <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  timelineInfo.isEnded ? "bg-muted-foreground" : "bg-primary"
                }`}
                style={{ width: `${timelineInfo.percent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Key Metric Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>{t("feather-contest-submitted")}</span>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {contest.total_articles || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>{t("feather-contest-accepted")}</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {contest.accepted_articles || 0}
              </span>
              {contest.total_articles ? (
                <span className="text-xs text-muted-foreground">({acceptanceRate}%)</span>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>{t("feather-contest-pending")}</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {contest.pending_articles || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>{t("feather-contest-participants")}</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {standings?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Multi-Tab Workspace */}
      <Tabs defaultValue="standings" className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="standings" className="gap-1.5 text-xs cursor-pointer font-medium">
              <Trophy className="h-3.5 w-3.5" />
              {t("feather-contest-tab-standings")}
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-1.5 text-xs cursor-pointer font-medium">
              <Layers className="h-3.5 w-3.5" />
              {t("feather-contest-tab-submissions")}
              {contest.total_articles ? (
                <span className="ml-1 px-1.5 py-0.2 rounded-xs bg-muted text-[10px] font-mono">
                  {contest.total_articles}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-1.5 text-xs cursor-pointer font-medium">
              <CheckCheck className="h-3.5 w-3.5" />
              {t("feather-contest-tab-rules")}
            </TabsTrigger>
            <TabsTrigger value="juries" className="gap-1.5 text-xs cursor-pointer font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("feather-contest-tab-juries")}
              {contest.juries && contest.juries.length > 0 ? (
                <span className="ml-1 px-1.5 py-0.2 rounded-xs bg-muted text-[10px] font-mono">
                  {contest.juries.length}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          {/* Standings Wikitext Export Modal */}
          <Dialog>
            <DialogTrigger
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "gap-1.5 text-xs font-medium cursor-pointer self-start sm:self-auto",
              })}
            >
              <FileCode className="h-3.5 w-3.5 text-primary" />
              {t("feather-contest-export-wikitext")}
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>{t("feather-contest-export-wikitext-title")}</DialogTitle>
                <DialogDescription className="text-xs">
                  {t("feather-contest-export-wikitext-desc")}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2">
                <textarea
                  readOnly
                  value={wikitextTable}
                  rows={10}
                  className="w-full rounded-md border border-border bg-muted/40 p-3 font-mono text-xs text-foreground focus-visible:outline-hidden"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  onClick={copyWikitext}
                  size="sm"
                  className="gap-1.5 text-xs font-medium cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t("feather-contest-copy-wikitext")}
                </Button>
                <DialogClose
                  render={
                    <Button variant="outline" size="sm" className="text-xs cursor-pointer">
                      Close
                    </Button>
                  }
                />
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* TAB 1: STANDINGS LEADERBOARD */}
        <TabsContent value="standings" className="space-y-4 outline-hidden">
          <Card className="border-border shadow-2xs overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/20 py-3 px-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm sm:text-base font-bold">
                    {t("feather-contest-standings-title")}
                  </CardTitle>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder={t("feather-contest-search-participants")}
                    value={standingsSearch}
                    onChange={(e) => setStandingsSearch(e.target.value)}
                    className="pl-8 text-xs h-8 bg-background"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {standingsLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                  {t("feather-contest-calculating-standings")}
                </div>
              ) : filteredStandings && filteredStandings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-16 text-center text-xs">{t("feather-standings-col-rank")}</TableHead>
                      <TableHead className="text-xs">{t("feather-standings-col-user")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-standings-col-accepted")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-standings-col-words")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-standings-col-bytes")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-standings-col-submitted")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStandings.map((s) => (
                      <TableRow key={s.username} className="transition-colors hover:bg-muted/40">
                        <TableCell className="text-center font-bold">
                          {s.rank === 1 ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                              <Medal className="h-3.5 w-3.5" />
                            </span>
                          ) : s.rank === 2 ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-muted font-bold text-xs text-muted-foreground">
                              2
                            </span>
                          ) : s.rank === 3 ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-amber-700/10 text-amber-700 dark:text-amber-500 font-bold text-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-mono text-xs">{s.rank}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-foreground text-xs sm:text-sm">
                          <a
                            href={`${contest.wiki_url || "https://bn.wiktionary.org"}/wiki/Special:Contributions/${encodeURIComponent(
                              s.username
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-primary hover:underline cursor-pointer transition-colors"
                          >
                            {s.username}
                            <ExternalLink className="h-2.5 w-2.5 opacity-40" />
                          </a>
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                          {s.accepted_count}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {s.total_words.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {s.total_bytes.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {s.submitted_count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {t("feather-contest-standings-empty")}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: ALL SUBMISSIONS */}
        <TabsContent value="submissions" className="space-y-4 outline-hidden">
          <Card className="border-border shadow-2xs overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/20 py-3 px-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder={t("feather-contest-search-articles")}
                    value={submissionsSearch}
                    onChange={(e) => setSubmissionsSearch(e.target.value)}
                    className="pl-8 text-xs h-8 bg-background"
                  />
                </div>

                {/* Status Filter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(["all", "accepted", "pending", "rejected"] as const).map((st) => (
                    <Button
                      key={st}
                      variant={statusFilter === st ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(st)}
                      className="text-[11px] h-7 px-2.5 capitalize cursor-pointer font-medium"
                    >
                      {st === "all"
                        ? t("feather-contest-filter-all")
                        : st === "accepted"
                        ? t("feather-contest-filter-accepted")
                        : st === "pending"
                        ? t("feather-contest-filter-pending")
                        : t("feather-contest-filter-rejected")}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {articlesLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                  Loading submissions...
                </div>
              ) : filteredArticles && filteredArticles.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">{t("feather-contest-col-article")}</TableHead>
                      <TableHead className="text-xs">{t("feather-contest-col-submitter")}</TableHead>
                      <TableHead className="text-center text-xs">{t("feather-contest-col-status")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-contest-col-words")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-contest-col-bytes")}</TableHead>
                      <TableHead className="text-right text-xs">{t("feather-contest-col-date")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArticles.map((art) => (
                      <TableRow key={art.id} className="transition-colors hover:bg-muted/40">
                        <TableCell className="font-medium text-foreground text-xs sm:text-sm">
                          <a
                            href={`${contest.wiki_url || "https://bn.wiktionary.org"}/wiki/${encodeURIComponent(
                              art.title
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 hover:text-primary hover:underline cursor-pointer transition-colors"
                          >
                            {art.title}
                            <ExternalLink className="h-2.5 w-2.5 opacity-40" />
                          </a>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {art.submitter_username}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              art.status === "accepted"
                                ? "default"
                                : art.status === "rejected"
                                ? "destructive"
                                : art.status === "validation_failed"
                                ? "outline"
                                : "secondary"
                            }
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 ${
                              art.status === "accepted"
                                ? "bg-emerald-600 hover:bg-emerald-600/90 text-white"
                                : ""
                            }`}
                          >
                            {art.status === "accepted"
                              ? t("feather-contest-filter-accepted")
                              : art.status === "pending"
                              ? t("feather-contest-filter-pending")
                              : art.status === "rejected"
                              ? t("feather-contest-filter-rejected")
                              : t("feather-contest-filter-failed")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {art.word_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {art.byte_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {new Date(art.submitted_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {t("feather-contest-submissions-empty")}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: RULES & ELIGIBILITY */}
        <TabsContent value="rules" className="space-y-4 outline-hidden">
          <Card className="border-border shadow-2xs">
            <CardHeader className="border-b border-border bg-muted/20 py-3 px-4">
              <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                <CheckCheck className="h-4 w-4 text-primary" />
                {t("feather-contest-tab-rules")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rule: Minimum Words */}
                <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border/70 bg-card/60">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      {t("feather-contest-min-words", contest.min_words ?? 0)}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("feather-contest-rule-min-words-desc", contest.min_words ?? 0)}
                    </p>
                  </div>
                </div>

                {/* Rule: Minimum Bytes */}
                <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border/70 bg-card/60">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      {t("feather-contest-min-bytes", contest.min_bytes ?? 0)}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("feather-contest-rule-min-bytes-desc", contest.min_bytes ?? 0)}
                    </p>
                  </div>
                </div>

                {/* Rule: Page Creator Requirement */}
                <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border/70 bg-card/60">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      {t("feather-contest-must-creator")}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {contest.rule_must_be_creator
                        ? t("feather-contest-rule-creator-desc")
                        : "Articles may be submitted by any editor (expansion/editing contest)."}
                    </p>
                  </div>
                </div>

                {/* Rule: Creation Window */}
                <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border/70 bg-card/60">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Creation Window</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t(
                        "feather-contest-rule-window-desc",
                        new Date(contest.start_date).toLocaleDateString(),
                        new Date(contest.end_date).toLocaleDateString()
                      )}
                    </p>
                  </div>
                </div>

                {/* Rule: Mainspace Only */}
                <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border/70 bg-card/60">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Mainspace Only</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("feather-contest-rule-namespace-desc")}
                    </p>
                  </div>
                </div>

                {/* Rule: No Redirects or Disambiguations */}
                <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border/70 bg-card/60">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">No Redirects</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("feather-contest-rule-redirect-desc")}
                    </p>
                  </div>
                </div>

                {/* Talk Template Automation Notice (if enabled) */}
                {contest.add_talk_template && contest.talk_template_name && (
                  <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border/70 bg-card/60 md:col-span-2">
                    <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">Talk Page Automation</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("feather-contest-rule-talk-template-desc", `{{${contest.talk_template_name}}}`)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: JURY PANEL */}
        <TabsContent value="juries" className="space-y-4 outline-hidden">
          <Card className="border-border shadow-2xs">
            <CardHeader className="border-b border-border bg-muted/20 py-3 px-4">
              <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {t("feather-contest-tab-juries")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {contest.juries && contest.juries.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {contest.juries.map((juryName) => (
                    <div
                      key={juryName}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                          {juryName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-foreground">
                            {juryName}
                          </div>
                          <div className="text-[11px] text-muted-foreground">Jury Member</div>
                        </div>
                      </div>

                      <a
                        href={`${contest.wiki_url || "https://bn.wiktionary.org"}/wiki/User:${encodeURIComponent(
                          juryName
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1"
                        title="View user page on wiki"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {t("feather-contest-juries-empty")}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
