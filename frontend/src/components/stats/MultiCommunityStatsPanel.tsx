"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Contest, StandingEntry } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { getProjectMeta, getWikiInfo } from "@/lib/wikis";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, Users, FileText, CheckCircle2, BarChart3, ShieldCheck } from "lucide-react";

interface MultiCommunityStatsPanelProps {
  contest: Contest;
  standings?: StandingEntry[];
  retentionPercent: number;
  acceptedCount: number;
  acceptedWords: number;
  totalParticipants: number;
  totalSubmissions: number;
}

export default function MultiCommunityStatsPanel({
  contest,
  standings = [],
  retentionPercent,
  acceptedCount,
  acceptedWords,
  totalParticipants,
  totalSubmissions,
}: MultiCommunityStatsPanelProps) {
  const { t, n, locale } = useI18n();
  const [wikiSort, setWikiSort] = useState<"submitted" | "accepted">("submitted");

  const subContests = contest.sub_contests || [];

  const sortedCommunities = useMemo(() => {
    return [...subContests].sort((a, b) =>
      wikiSort === "accepted"
        ? (b.accepted_articles || 0) - (a.accepted_articles || 0)
        : (b.total_articles || 0) - (a.total_articles || 0)
    );
  }, [subContests, wikiSort]);

  const maxBar = useMemo(() => {
    return Math.max(
      1,
      ...sortedCommunities.map((c) =>
        wikiSort === "accepted" ? c.accepted_articles || 0 : c.total_articles || 0
      )
    );
  }, [sortedCommunities, wikiSort]);

  const survivingCount = Math.round((acceptedCount * Math.max(0, Math.min(100, retentionPercent))) / 100);
  const deletedCount = Math.max(0, acceptedCount - survivingCount);

  return (
    <div className="space-y-6">
      {/* 1. Article Retention Strip */}
      {acceptedCount > 0 && (
        <Card className="border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 sm:p-5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-semibold text-foreground">
                  {t("feather-stats-retention")} · {n(retentionPercent)}%
                </span>
              </div>
              <div className="text-muted-foreground tabular-nums">
                <strong className="font-medium text-foreground">{n(survivingCount)}</strong> /{" "}
                <strong className="font-medium text-foreground">{n(acceptedCount)}</strong>{" "}
                {t("feather-stats-retention-desc")}
                {deletedCount > 0 ? ` · ${n(deletedCount)}` : ""}
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${Math.max(0, Math.min(100, retentionPercent))}%` }}
              />
              {deletedCount > 0 && (
                <div
                  className="bg-rose-500 h-full transition-all"
                  style={{ width: `${Math.max(0, 100 - retentionPercent)}%` }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. 5-Column Campaign KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: t("feather-stats-participants"), value: totalParticipants, icon: Users },
          { label: t("feather-stats-submissions"), value: totalSubmissions, icon: FileText },
          { label: t("feather-stats-col-accepted"), value: acceptedCount, icon: CheckCircle2 },
          { label: t("feather-stats-words-accepted"), value: acceptedWords, icon: BarChart3 },
          { label: t("feather-pulse-wikis"), value: subContests.length, icon: Globe },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="border-border/80 bg-card shadow-2xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-primary shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-bold tracking-tight tabular-nums text-foreground leading-none">
                    {n(kpi.value)}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground truncate">{kpi.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 3. Submissions by Wiki Bar Breakdown */}
      {sortedCommunities.length > 0 && (
        <Card className="border-border/80 bg-card shadow-2xs">
          <CardHeader className="p-4 sm:p-5 pb-2 flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold">{t("feather-stats-submissions-by-wiki")}</CardTitle>
            <div className="inline-flex items-center rounded-lg bg-muted p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setWikiSort("submitted")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  wikiSort === "submitted"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("feather-stats-col-submitted")}
              </button>
              <button
                type="button"
                onClick={() => setWikiSort("accepted")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  wikiSort === "accepted"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("feather-stats-col-accepted")}
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-2 space-y-2.5">
            {sortedCommunities.slice(0, 20).map((sub) => {
              const val = wikiSort === "accepted" ? sub.accepted_articles || 0 : sub.total_articles || 0;
              const pct = Math.max(2, Math.round((val / maxBar) * 100));
              const wikiInfo = getWikiInfo(sub.wiki_dbname);
              const meta = getProjectMeta(sub.wiki_dbname);
              const label = wikiInfo?.nativeName || wikiInfo?.englishName || meta.nativeName || sub.name;
              return (
                <div key={sub.id} className="grid grid-cols-12 items-center gap-3 text-xs">
                  <div className="col-span-5 sm:col-span-4 truncate font-medium text-foreground" title={label}>
                    {label}
                  </div>
                  <div className="col-span-5 sm:col-span-6 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        wikiSort === "accepted" ? "bg-emerald-500" : "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="col-span-2 text-right font-mono tabular-nums text-muted-foreground">
                    {n(val)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 4. 2-Column Tables: Participants Across All Wikis + By Wiki */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-border/80 bg-card shadow-2xs overflow-hidden">
          <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">{t("feather-stats-cross-wiki-participants")}</CardTitle>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {n(standings.slice(0, 25).length)}
            </Badge>
          </CardHeader>
          <div className="overflow-x-auto max-h-[420px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">{t("feather-stats-col-user")}</TableHead>
                  <TableHead className="text-xs text-right">{t("feather-pulse-wikis")}</TableHead>
                  <TableHead className="text-xs text-right">{t("feather-stats-col-submitted")}</TableHead>
                  <TableHead className="text-xs text-right">{t("feather-stats-col-accepted")}</TableHead>
                  <TableHead className="text-xs text-right">{t("feather-contest-col-words")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.slice(0, 25).map((row) => (
                  <TableRow key={row.username}>
                    <TableCell className="text-xs font-medium">
                      <Link
                        href={`/contests/${contest.code}/users/${encodeURIComponent(row.username)}`}
                        className="hover:text-primary hover:underline"
                      >
                        {row.username}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono tabular-nums text-muted-foreground">
                      {n(row.wikis_contributed?.length || 1)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono tabular-nums text-muted-foreground">
                      {n(row.submitted_count)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {n(row.accepted_count)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono tabular-nums text-muted-foreground">
                      {n(row.total_words)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="border-border/80 bg-card shadow-2xs overflow-hidden">
          <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">{t("feather-stats-by-wiki")}</CardTitle>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {n(sortedCommunities.length)}
            </Badge>
          </CardHeader>
          <div className="overflow-x-auto max-h-[420px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">{t("feather-pulse-wikis")}</TableHead>
                  <TableHead className="text-xs text-right">{t("feather-stats-participants")}</TableHead>
                  <TableHead className="text-xs text-right">{t("feather-stats-col-submitted")}</TableHead>
                  <TableHead className="text-xs text-right">{t("feather-stats-col-accepted")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCommunities.map((sub) => {
                  const wikiInfo = getWikiInfo(sub.wiki_dbname);
                  const meta = getProjectMeta(sub.wiki_dbname);
                  const label = wikiInfo?.nativeName || wikiInfo?.englishName || (locale === "bn" ? meta.nativeName : meta.name);
                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="text-xs font-medium">{label}</TableCell>
                      <TableCell className="text-xs text-right font-mono tabular-nums text-muted-foreground">
                        {n(sub.total_submitters || 0)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono tabular-nums text-muted-foreground">
                        {n(sub.total_articles || 0)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono tabular-nums font-semibold">
                        {n(sub.accepted_articles || 0)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* 5. Participating Communities Breakdown Table */}
      <Card className="border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">{t("feather-stats-events-breakdown")}</CardTitle>
          <Badge variant="secondary" className="font-mono text-[11px]">
            {n(sortedCommunities.length)}
          </Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">{t("feather-campaign-tab-communities")}</TableHead>
                <TableHead className="text-xs">{t("feather-pulse-wikis")}</TableHead>
                <TableHead className="text-xs text-right">{t("feather-stats-participants")}</TableHead>
                <TableHead className="text-xs text-right">{t("feather-stats-col-submitted")}</TableHead>
                <TableHead className="text-xs text-right">{t("feather-stats-col-accepted")}</TableHead>
                <TableHead className="text-xs text-right">{t("feather-contest-col-status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCommunities.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="text-xs font-medium">
                    <Link href={`/contests/${sub.code}`} className="hover:text-primary hover:underline">
                      {sub.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {sub.wiki_lang || sub.wiki_dbname}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono tabular-nums text-muted-foreground">
                    {n(sub.total_submitters || 0)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono tabular-nums text-muted-foreground">
                    {n(sub.total_articles || 0)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono tabular-nums font-semibold">
                    {n(sub.accepted_articles || 0)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          sub.status === "ended" ? "bg-muted-foreground/50" : "bg-emerald-500"
                        }`}
                      />
                      {sub.status === "ended"
                        ? t("feather-contest-status-ended")
                        : t("feather-contest-status-active")}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
