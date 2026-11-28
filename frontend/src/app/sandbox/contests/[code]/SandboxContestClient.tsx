"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  fetchContest,
  fetchStandings,
  fetchArticles,
  Contest,
  StandingEntry,
  Article,
} from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { getProjectMeta } from "@/lib/wikis";
import { MOCK_STANDINGS, MOCK_ARTICLES } from "@/app/sandbox/_lib/mock-data";
import { ArrowLeft, Plus, BarChart3, ExternalLink, CheckCheck } from "lucide-react";

interface SandboxContestClientProps {
  code: string;
  initialContest: Contest;
}

export default function SandboxContestClient({ code, initialContest }: SandboxContestClientProps) {
  const { t, n, formatDate } = useI18n();
  const [tab, setTab] = useState<"standings" | "submissions" | "rules" | "juries">("standings");

  const { data: contest } = useQuery<Contest>({
    queryKey: ["sandbox-contest", code],
    queryFn: async () => {
      try {
        return await fetchContest(code);
      } catch {
        return initialContest;
      }
    },
    initialData: initialContest,
    staleTime: 60 * 1000,
  });

  const { data: standings } = useQuery<StandingEntry[]>({
    queryKey: ["sandbox-standings", code],
    queryFn: async () => {
      try {
        const res = await fetchStandings(code);
        return res && res.length > 0 ? res : MOCK_STANDINGS;
      } catch {
        return MOCK_STANDINGS;
      }
    },
    initialData: MOCK_STANDINGS,
    staleTime: 60 * 1000,
  });

  const { data: articles } = useQuery<Article[]>({
    queryKey: ["sandbox-articles", code],
    queryFn: async () => {
      try {
        const res = await fetchArticles(code, undefined, undefined, 50);
        return res?.items && res.items.length > 0 ? res.items : MOCK_ARTICLES;
      } catch {
        return MOCK_ARTICLES;
      }
    },
    initialData: MOCK_ARTICLES,
    staleTime: 60 * 1000,
  });

  const progress = useMemo(() => {
    const total = contest.total_articles || 0;
    const accepted = contest.accepted_articles || 0;
    const pending = contest.pending_articles || 0;
    const rejected = Math.max(0, total - accepted - pending);
    const denom = Math.max(1, accepted + rejected + pending);
    const reviewed = accepted + rejected;
    return {
      accepted,
      rejected,
      pending,
      reviewed,
      total: accepted + rejected + pending,
      percent: Math.round((reviewed / denom) * 100),
      acceptedPct: (accepted / denom) * 100,
      rejectedPct: (rejected / denom) * 100,
    };
  }, [contest]);

  const pMeta = getProjectMeta(contest.wiki_dbname);
  const projectName = t(`feather-project-${pMeta.id}`) || pMeta.name;
  const baseWiki = contest.wiki_url || "https://en.wikipedia.org";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/sandbox"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t("feather-nav-contests")}</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/sandbox/contests/${code}/stats`}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{t("feather-contest-tab-stats")}</span>
          </Link>
          <Link
            href={`/contests/${code}/review`}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>{t("feather-contest-review")}</span>
          </Link>
        </div>
      </div>

      {/* Editorial Contest Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  contest.status === "ended" ? "bg-muted-foreground/60" : "bg-emerald-500"
                }`}
              />
              {contest.status === "ended"
                ? t("feather-contest-status-ended")
                : t("feather-contest-status-active")}
            </span>
            <span className="text-border">·</span>
            <span>
              {projectName}
              {contest.wiki_lang ? ` (${contest.wiki_lang})` : ""}
            </span>
            <span className="text-border">·</span>
            <span className="tabular-nums">
              {formatDate(contest.start_date, { month: "short", day: "numeric", timeZone: contest.wiki_tz || "UTC" })}
              {" – "}
              {formatDate(contest.end_date, { month: "short", day: "numeric", timeZone: contest.wiki_tz || "UTC" })}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            {contest.name}
          </h1>

          {contest.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{contest.description}</p>
          )}
        </div>

        <Link
          href={`/sandbox/contests/${code}/submit`}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity shrink-0 self-start"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t("feather-contest-submit")}</span>
        </Link>
      </div>

      {/* Slim Inline Judging Progress Strip */}
      {progress.total > 0 && (
        <div className="rounded-lg bg-muted/30 px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-foreground">
              {t("feather-contest-progress-title")} ·{" "}
              <span className="text-muted-foreground font-normal tabular-nums">
                {n(progress.reviewed)} / {n(progress.total)} ({n(progress.percent)}%)
              </span>
            </span>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t("feather-contest-filter-accepted")}: <strong className="text-foreground">{n(progress.accepted)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {t("feather-contest-filter-rejected")}: <strong className="text-foreground">{n(progress.rejected)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {t("feather-contest-filter-pending")}: <strong className="text-foreground">{n(progress.pending)}</strong>
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${progress.acceptedPct}%` }} />
            <div className="bg-rose-500 h-full" style={{ width: `${progress.rejectedPct}%` }} />
          </div>
        </div>
      )}

      {/* Clean Underline Tabs */}
      <div className="space-y-4">
        <div className="border-b border-border/60 overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-6 min-w-max" aria-label="Contest sections">
            {(
              [
                { id: "standings", label: t("feather-contest-tab-standings") },
                { id: "submissions", label: t("feather-contest-tab-submissions"), count: contest.total_articles },
                { id: "rules", label: t("feather-contest-tab-rules") },
                { id: "juries", label: t("feather-contest-tab-juries"), count: contest.juries?.length },
              ] as const
            ).map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`relative pb-3 text-xs sm:text-sm font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{item.label}</span>
                  {"count" in item && item.count ? (
                    <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                      {n(item.count)}
                    </span>
                  ) : null}
                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Standings Table */}
        {tab === "standings" && (
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-4 font-medium w-12">#</th>
                  <th className="py-2.5 px-4 font-medium">{t("feather-contest-col-participant")}</th>
                  <th className="py-2.5 px-4 font-medium text-right">{t("feather-contest-filter-accepted")}</th>
                  <th className="py-2.5 px-4 font-medium text-right">{t("feather-contest-submitted")}</th>
                  <th className="py-2.5 px-4 font-medium text-right hidden sm:table-cell">
                    {t("feather-contest-col-words")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {standings.map((row, idx) => (
                  <tr key={row.username} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-muted-foreground tabular-nums">
                      {n(idx + 1)}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      <Link
                        href={`/sandbox/users/${encodeURIComponent(row.username)}`}
                        className="hover:underline"
                      >
                        {row.username}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold tabular-nums text-foreground">
                      {n(row.accepted_count)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                      {n(row.submitted_count)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                      {n(row.total_words)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Submissions Table */}
        {tab === "submissions" && (
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-4 font-medium">{t("feather-contest-col-article")}</th>
                  <th className="py-2.5 px-4 font-medium hidden sm:table-cell">{t("feather-contest-col-participant")}</th>
                  <th className="py-2.5 px-4 font-medium">{t("feather-contest-col-status")}</th>
                  <th className="py-2.5 px-4 font-medium text-right">{t("feather-contest-col-words")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {articles.map((art) => (
                  <tr key={art.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      <a
                        href={`${baseWiki}/wiki/${encodeURIComponent(art.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        <span>{art.title}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground/60" />
                      </a>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                      <Link
                        href={`/sandbox/users/${encodeURIComponent(art.submitter_username)}`}
                        className="hover:text-foreground hover:underline"
                      >
                        {art.submitter_username}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            art.status === "accepted"
                              ? "bg-emerald-500"
                              : art.status === "rejected"
                              ? "bg-rose-500"
                              : "bg-amber-400"
                          }`}
                        />
                        {art.status === "accepted"
                          ? t("feather-contest-filter-accepted")
                          : art.status === "rejected"
                          ? t("feather-contest-filter-rejected")
                          : t("feather-contest-filter-pending")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                      {n(art.word_count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rules */}
        {tab === "rules" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border/50 p-4 space-y-1">
              <div className="text-[11px] text-muted-foreground">{t("feather-contest-col-words")}</div>
              <div className="text-lg font-semibold tabular-nums">
                ≥ {n(contest.min_words || 0)}
              </div>
            </div>
            <div className="rounded-xl border border-border/50 p-4 space-y-1">
              <div className="text-[11px] text-muted-foreground">{t("feather-contest-col-bytes")}</div>
              <div className="text-lg font-semibold tabular-nums">
                ≥ {n(contest.min_bytes || 0)}
              </div>
            </div>
            <div className="rounded-xl border border-border/50 p-4 space-y-1">
              <div className="text-[11px] text-muted-foreground">Wiki</div>
              <div className="text-lg font-semibold">{contest.wiki_dbname}</div>
            </div>
          </div>
        )}

        {/* Juries */}
        {tab === "juries" && (
          <div className="flex flex-wrap gap-2">
            {(contest.juries && contest.juries.length > 0 ? contest.juries : ["Rifat", "Tahmid"]).map(
              (jury) => (
                <Link
                  key={jury}
                  href={`/sandbox/users/${encodeURIComponent(jury)}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-xs font-medium hover:bg-muted/30 transition-colors"
                >
                  <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
                    {jury.slice(0, 1).toUpperCase()}
                  </span>
                  <span>{jury}</span>
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
