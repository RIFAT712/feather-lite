"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, CheckCircle2, FileText, Globe, ShieldCheck, Users } from "lucide-react";
import { fetchContest, Contest } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { getProjectMeta } from "@/lib/wikis";
import {
  MOCK_CONTESTS,
  MOCK_OVERVIEW,
  MOCK_COMMUNITY_STATS,
  MOCK_CROSS_WIKI_PARTICIPANTS,
  SandboxCommunityStat,
} from "@/app/sandbox/_lib/mock-data";

export default function SandboxContestStatsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { t, n } = useI18n();
  const [wikiSort, setWikiSort] = useState<"submitted" | "accepted">("submitted");

  const fallbackContest =
    MOCK_CONTESTS.find((c) => c.code === code) || {
      ...MOCK_CONTESTS[0],
      code,
    };

  const { data: contest } = useQuery<Contest>({
    queryKey: ["sandbox-contest", code],
    queryFn: async () => {
      try {
        return await fetchContest(code);
      } catch {
        return fallbackContest;
      }
    },
    initialData: fallbackContest,
    staleTime: 60 * 1000,
  });

  const isUmbrella = Boolean(contest.is_umbrella);

  // Build community rows from live sub_contests when available, else fallback mock data
  const communityRows: SandboxCommunityStat[] = useMemo(() => {
    if (!isUmbrella) return [];
    if (contest.sub_contests && contest.sub_contests.length > 0) {
      return contest.sub_contests.map((sub) => {
        const meta = getProjectMeta(sub.wiki_dbname);
        return {
          code: sub.code,
          eventName: sub.name,
          wikiName: `${meta.nativeName || meta.name} (${sub.wiki_lang || sub.wiki_dbname})`,
          wikiLang: sub.wiki_lang || sub.wiki_dbname,
          participants: sub.total_submitters || 0,
          submitted: sub.total_articles || 0,
          accepted: sub.accepted_articles || 0,
          words: 0,
          status: sub.status === "ended" ? "ended" : "active",
        };
      });
    }
    return MOCK_COMMUNITY_STATS;
  }, [isUmbrella, contest.sub_contests]);

  const multiSummary = useMemo(() => {
    const participants = communityRows.reduce((acc, c) => acc + c.participants, 0);
    const submitted = communityRows.reduce((acc, c) => acc + c.submitted, 0) || contest.total_articles || 0;
    const accepted = communityRows.reduce((acc, c) => acc + c.accepted, 0) || contest.accepted_articles || 0;
    const words = communityRows.reduce((acc, c) => acc + c.words, 0);
    const wikis = communityRows.length;
    const deleted = Math.max(0, Math.round(accepted * 0.03));
    const surviving = Math.max(0, accepted - deleted);
    const survivalPct = accepted > 0 ? Math.round((surviving / accepted) * 100) : 100;
    return { participants, submitted, accepted, words, wikis, deleted, surviving, survivalPct };
  }, [communityRows, contest.total_articles, contest.accepted_articles]);

  const sortedCommunities = useMemo(() => {
    return [...communityRows].sort((a, b) =>
      wikiSort === "accepted" ? b.accepted - a.accepted : b.submitted - a.submitted
    );
  }, [communityRows, wikiSort]);

  const maxBar = useMemo(() => {
    return Math.max(
      1,
      ...sortedCommunities.map((c) => (wikiSort === "accepted" ? c.accepted : c.submitted))
    );
  }, [sortedCommunities, wikiSort]);

  // Single-wiki contest fallback stats
  const singleTotal = contest.total_articles || 0;
  const singleAccepted = contest.accepted_articles || 0;
  const singlePending = contest.pending_articles || 0;
  const singleRejected = Math.max(0, singleTotal - singleAccepted - singlePending);
  const trend = MOCK_OVERVIEW.trend || [];
  const maxTrend = Math.max(1, ...trend.map((d) => d.count));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header + View Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Link
            href={`/sandbox/contests/${code}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{contest.name}</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("feather-contest-tab-stats")}
            </h1>
            {isUmbrella && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {n(multiSummary.wikis)} {t("feather-pulse-wikis")}
              </span>
            )}
          </div>
        </div>

        <div className="inline-flex items-center rounded-lg bg-muted/40 p-0.5 text-xs self-start sm:self-auto">
          <Link
            href={`/sandbox/contests/${code}`}
            className="px-3 py-1.5 rounded-md font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("feather-contest-tab-standings")}
          </Link>
          <span className="px-3 py-1.5 rounded-md font-medium bg-background text-foreground shadow-2xs">
            {t("feather-contest-tab-stats")}
          </span>
        </div>
      </div>

      {/* Multi-Community Campaign Statistics Panel (only for umbrella campaigns) */}
      {isUmbrella ? (
        <>
          {/* Article Retention Strip */}
          <section className="rounded-xl border border-border/50 bg-card px-4 py-3.5 sm:px-5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-semibold text-foreground">
                  Article Retention · {n(multiSummary.survivalPct)}%
                </span>
              </div>
              <div className="text-muted-foreground tabular-nums">
                <strong className="font-medium text-foreground">{n(multiSummary.surviving)}</strong> of{" "}
                <strong className="font-medium text-foreground">{n(multiSummary.accepted)}</strong> accepted articles live
                {multiSummary.deleted > 0 && (
                  <>
                    {" · "}
                    <span className="text-rose-600 dark:text-rose-400">
                      {n(multiSummary.deleted)} deleted
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${multiSummary.survivalPct}%` }}
              />
              <div
                className="bg-rose-500 h-full transition-all"
                style={{ width: `${100 - multiSummary.survivalPct}%` }}
              />
            </div>
          </section>

          {/* 5-Column KPI Strip */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: t("feather-contest-col-participant"), value: multiSummary.participants, icon: Users },
              { label: t("feather-contest-submitted"), value: multiSummary.submitted, icon: FileText },
              { label: t("feather-contest-filter-accepted"), value: multiSummary.accepted, icon: CheckCircle2 },
              { label: t("feather-contest-col-words"), value: multiSummary.words, icon: BarChart3 },
              { label: t("feather-pulse-wikis"), value: multiSummary.wikis, icon: Globe },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-border/50 bg-card p-4 flex items-center gap-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg sm:text-xl font-semibold tracking-tight tabular-nums text-foreground leading-none">
                      {n(kpi.value)}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground truncate">{kpi.label}</div>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Submissions by Wiki Bar Breakdown */}
          <section className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Submissions by Wiki</h2>
              <div className="inline-flex items-center rounded-lg bg-muted/40 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setWikiSort("submitted")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    wikiSort === "submitted"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("feather-contest-submitted")}
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
                  {t("feather-contest-filter-accepted")}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {sortedCommunities.map((item) => {
                const val = wikiSort === "accepted" ? item.accepted : item.submitted;
                const pct = Math.max(4, Math.round((val / maxBar) * 100));
                return (
                  <div key={item.code} className="grid grid-cols-12 items-center gap-3 text-xs">
                    <div className="col-span-5 sm:col-span-4 truncate font-medium text-foreground">
                      {item.wikiName}
                    </div>
                    <div className="col-span-5 sm:col-span-6 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          wikiSort === "accepted" ? "bg-emerald-500" : "bg-foreground/75"
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
            </div>
          </section>

          {/* 2-Column Tables: Participants Across All Wikis + By Wiki */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Participants Across All Wikis</h2>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Top {n(MOCK_CROSS_WIKI_PARTICIPANTS.length)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">{t("feather-contest-col-participant")}</th>
                      <th className="py-2.5 px-3 font-medium text-right">{t("feather-pulse-wikis")}</th>
                      <th className="py-2.5 px-3 font-medium text-right">{t("feather-contest-submitted")}</th>
                      <th className="py-2.5 px-3 font-medium text-right">{t("feather-contest-filter-accepted")}</th>
                      <th className="py-2.5 px-4 font-medium text-right">{t("feather-contest-col-words")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {MOCK_CROSS_WIKI_PARTICIPANTS.map((p) => (
                      <tr key={p.username} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-foreground truncate max-w-[160px]">
                          <Link
                            href={`/sandbox/users/${encodeURIComponent(p.username)}`}
                            className="hover:underline"
                          >
                            {p.username}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {n(p.wikis)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {n(p.submitted)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                          {n(p.accepted)}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-muted-foreground">
                          {n(p.words)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">By Wiki</h2>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {n(sortedCommunities.length)} {t("feather-pulse-wikis")}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Wiki</th>
                      <th className="py-2.5 px-3 font-medium text-right">{t("feather-contest-col-participant")}</th>
                      <th className="py-2.5 px-3 font-medium text-right">{t("feather-contest-submitted")}</th>
                      <th className="py-2.5 px-4 font-medium text-right">{t("feather-contest-filter-accepted")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {sortedCommunities.map((c) => (
                      <tr key={c.code} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-foreground">{c.wikiName}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {n(c.participants)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {n(c.submitted)}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-foreground">
                          {n(c.accepted)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Full Events Breakdown Table */}
          <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Events Breakdown</h2>
              <span className="text-[11px] font-mono text-muted-foreground">
                {n(sortedCommunities.length)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Event</th>
                    <th className="py-2.5 px-3 font-medium">Wiki</th>
                    <th className="py-2.5 px-3 font-medium text-right">{t("feather-contest-col-participant")}</th>
                    <th className="py-2.5 px-3 font-medium text-right">{t("feather-contest-submitted")}</th>
                    <th className="py-2.5 px-3 font-medium text-right">{t("feather-contest-filter-accepted")}</th>
                    <th className="py-2.5 px-3 font-medium text-right">{t("feather-contest-col-words")}</th>
                    <th className="py-2.5 px-4 font-medium text-right">{t("feather-contest-col-status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {sortedCommunities.map((ev) => (
                    <tr key={ev.code} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">
                        <Link href={`/sandbox/contests/${ev.code}`} className="hover:underline">
                          {ev.eventName}
                        </Link>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-[11px] font-mono text-muted-foreground">
                          {ev.wikiLang}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
                        {n(ev.participants)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
                        {n(ev.submitted)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-medium text-foreground">
                        {n(ev.accepted)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
                        {n(ev.words)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              ev.status === "ended" ? "bg-muted-foreground/50" : "bg-emerald-500"
                            }`}
                          />
                          {ev.status === "ended"
                            ? t("feather-contest-status-ended")
                            : t("feather-contest-status-active")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        /* Single-Wiki Contest Stats View */
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: t("feather-contest-submitted"), value: singleTotal },
              { label: t("feather-contest-filter-accepted"), value: singleAccepted },
              { label: t("feather-contest-filter-rejected"), value: singleRejected },
              { label: t("feather-contest-filter-pending"), value: singlePending },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-border/50 p-4 space-y-1">
                <div className="text-2xl font-semibold tracking-tight tabular-nums">
                  {n(kpi.value)}
                </div>
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border/50 p-5 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">30-Day Submission Velocity</span>
              <span className="text-muted-foreground tabular-nums">Daily submissions</span>
            </div>
            <div className="flex items-end gap-1.5 h-36 pt-2">
              {trend.map((pt) => {
                const pct = Math.max(6, Math.round((pt.count / maxTrend) * 100));
                return (
                  <div
                    key={pt.date}
                    title={`${pt.date}: ${pt.count}`}
                    className="flex-1 rounded-t-sm bg-foreground/20 hover:bg-foreground/75 transition-colors"
                    style={{ height: `${pct}%` }}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
