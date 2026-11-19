"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile, GlobalUserProfile } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { 
  ArrowLeft, ExternalLink, Trophy, CheckCircle, XCircle, 
  Clock, Shield, AlertTriangle, ChevronDown, ChevronRight, 
  BookOpen, Award, FileText, User, Layers, Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUtcToTz } from "@/lib/time";
import UserBadge from "@/components/users/UserBadge";

export default function UserGlobalProfilePage() {
  const params = useParams();
  const username = decodeURIComponent((params.username as string) || "");
  const { t, n } = useI18n();

  const [expandedContest, setExpandedContest] = useState<string | null>(null);
  const [expandedJudgedContest, setExpandedJudgedContest] = useState<string | null>(null);
  const [participatedOpen, setParticipatedOpen] = useState(true);
  const [judgedOpen, setJudgedOpen] = useState(true);

  const { data: profile, isLoading, error } = useQuery<GlobalUserProfile>({
    queryKey: ["userProfile", username],
    queryFn: () => fetchUserProfile(username),
    enabled: !!username,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-8 py-16 max-w-5xl">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 bg-muted rounded-md" />
          <div className="h-44 bg-muted/40 rounded-xl border border-border" />
          <div className="h-64 bg-muted/30 rounded-xl border border-border" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 sm:px-8 py-16 max-w-5xl text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">User Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          The user &ldquo;{username}&rdquo; does not exist or has not contributed to any Feather contests yet.
        </p>
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="me-1.5 h-3.5 w-3.5 rtl:rotate-180" />
            {t("feather-profile-back-contests")}
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate aggregates
  const totalSubmissions = profile.participated_contests.reduce(
    (sum, c) => sum + (c.articles?.length || 0), 0
  );
  const totalAccepted = profile.participated_contests.reduce(
    (sum, c) => sum + (c.articles?.filter((a) => a.status === "accepted").length || 0), 0
  );
  const totalReviews = profile.judged_contests.reduce(
    (sum, c) => sum + (c.reviews?.length || 0), 0
  );

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 max-w-5xl space-y-6">
      {/* Back to Contests Link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="me-1.5 h-3.5 w-3.5 rtl:rotate-180" />
          {t("feather-profile-back-contests")}
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* User Identity */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-2xs shrink-0">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("feather-profile-kicker")}
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2 flex-wrap">
                <span>{profile.username}</span>
                <UserBadge username={profile.username} role={profile.role} />
              </h1>
              <div className="flex items-center gap-2.5 pt-1">
                <a
                  href={`https://bn.wikipedia.org/wiki/User:${encodeURIComponent(profile.username)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  <span>{t("feather-profile-view-wiki")}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Stats Counters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-3 lg:gap-6 border-t lg:border-t-0 lg:border-l border-border/80 pt-4 lg:pt-0 lg:pl-6">
            <div className="space-y-0.5">
              <div className="text-2xl sm:text-3xl font-bold text-foreground">
                {n(profile.participated_contests.length)}
              </div>
              <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                {t("feather-profile-stat-entered")}
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-2xl sm:text-3xl font-bold text-foreground">
                {n(totalSubmissions)}
              </div>
              <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                {t("feather-profile-stat-submitted")}
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {n(totalAccepted)}
              </div>
              <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                {t("feather-profile-stat-accepted")}
              </div>
            </div>

            {profile.judged_contests.length > 0 && (
              <>
                <div className="space-y-0.5">
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">
                    {n(profile.judged_contests.length)}
                  </div>
                  <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                    {t("feather-profile-stat-judged")}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-2xl sm:text-3xl font-bold text-primary">
                    {n(totalReviews)}
                  </div>
                  <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                    {t("feather-profile-stat-reviews")}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section 1: Participated Contests (Article History) */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardHeader 
          className="py-3.5 px-4 sm:px-6 cursor-pointer hover:bg-muted/30 transition-colors border-b border-border select-none"
          onClick={() => setParticipatedOpen(!participatedOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold">
                  {t("feather-profile-sec-participated")}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  {t("feather-profile-sec-participated-kicker")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {profile.participated_contests.length}
              </Badge>
              {participatedOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>

        {participatedOpen && (
          <CardContent className="p-4 sm:p-6 space-y-4">
            {profile.participated_contests.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                {t("feather-profile-no-participated")}
              </p>
            ) : (
              <div className="space-y-3">
                {profile.participated_contests.map((contest) => {
                  const isExpanded = expandedContest === contest.code;
                  const validArticles = contest.articles.filter((a) => a.status !== "validation_failed");
                  const acceptedCount = validArticles.filter((a) => a.status === "accepted").length;
                  const rejectedCount = validArticles.filter((a) => a.status === "rejected").length;
                  const pendingCount = validArticles.filter((a) => a.status === "pending").length;

                  return (
                    <div
                      key={contest.code}
                      className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs transition-all"
                    >
                      {/* Contest Item Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedContest(isExpanded ? null : contest.code)}
                        className="w-full text-left p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/40 transition-colors cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {contest.name}
                          </span>
                          <span className="font-mono text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                            {contest.code}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          {acceptedCount > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                              {acceptedCount} accepted
                            </Badge>
                          )}
                          {pendingCount > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                              {pendingCount} pending
                            </Badge>
                          )}
                          {rejectedCount > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                              {rejectedCount} rejected
                            </Badge>
                          )}

                          <Badge variant="secondary" className="font-mono text-[11px]">
                            {contest.articles.length} total
                          </Badge>

                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
                          )}
                        </div>
                      </button>

                      {/* Expandable Articles Table */}
                      {isExpanded && (
                        <div className="border-t border-border bg-muted/10 p-3 sm:p-4 animate-in fade-in-0 duration-150">
                          <div className="flex items-center justify-between pb-3">
                            <span className="text-xs text-muted-foreground font-medium">
                              {contest.articles.length} articles submitted
                            </span>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/contests/${contest.code}/users/${encodeURIComponent(profile.username)}`}
                                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                              >
                                {t("feather-profile-contest-profile-link")}
                                <ChevronRight className="h-3 w-3" />
                              </Link>
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-lg border border-border bg-card">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                                  <th className="py-2.5 px-3">{t("feather-profile-th-article")}</th>
                                  <th className="py-2.5 px-3">{t("feather-profile-th-status")}</th>
                                  <th className="py-2.5 px-3">{t("feather-profile-th-creator")}</th>
                                  <th className="py-2.5 px-3 text-right">{t("feather-profile-th-words")}</th>
                                  <th className="py-2.5 px-3">{t("feather-profile-th-submitted")}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {validArticles.map((art) => (
                                  <tr key={art.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="py-2.5 px-3 font-medium">
                                      <a
                                        href={`${contest.wiki_url}/wiki/${encodeURIComponent(art.title)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                      >
                                        <span>{art.title}</span>
                                        <ExternalLink className="h-3 w-3 opacity-60" />
                                      </a>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      {art.status === "accepted" && (
                                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                          Accepted
                                        </Badge>
                                      )}
                                      {art.status === "pending" && (
                                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                          Pending
                                        </Badge>
                                      )}
                                      {art.status === "rejected" && (
                                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                                          Rejected
                                        </Badge>
                                      )}
                                      {art.status === "validation_failed" && (
                                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30" title={art.validation_error}>
                                          Failed
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                                      {art.wiki_creator || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                                      {n(art.word_count)}w
                                    </td>
                                    <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                                      {art.submitted_at ? formatUtcToTz(art.submitted_at, "Asia/Dhaka", "MMM d, yyyy") : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Section 2: Judged Contests (Review History) */}
      {profile.judged_contests.length > 0 && (
        <Card className="border-border shadow-xs overflow-hidden">
          <CardHeader 
            className="py-3.5 px-4 sm:px-6 cursor-pointer hover:bg-muted/30 transition-colors border-b border-border select-none"
            onClick={() => setJudgedOpen(!judgedOpen)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <div>
                  <CardTitle className="text-sm sm:text-base font-semibold">
                    {t("feather-profile-sec-judged")}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    {t("feather-profile-sec-judged-kicker")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  {profile.judged_contests.length}
                </Badge>
                {judgedOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>

          {judgedOpen && (
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="space-y-3">
                {profile.judged_contests.map((contest) => {
                  const isExpanded = expandedJudgedContest === contest.code;

                  return (
                    <div
                      key={contest.code}
                      className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs transition-all"
                    >
                      {/* Contest Item Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedJudgedContest(isExpanded ? null : contest.code)}
                        className="w-full text-left p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/40 transition-colors cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {contest.name}
                          </span>
                          <span className="font-mono text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                            {contest.code}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4.5 border-primary/30 text-primary">
                            {contest.role_in_contest}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          {contest.stats?.accepted > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                              {contest.stats.accepted} accepted
                            </Badge>
                          )}
                          {contest.stats?.rejected > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                              {contest.stats.rejected} rejected
                            </Badge>
                          )}
                          <Badge variant="secondary" className="font-mono text-[11px]">
                            {contest.reviews.length} reviews
                          </Badge>

                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
                          )}
                        </div>
                      </button>

                      {/* Expandable Reviews Table */}
                      {isExpanded && (
                        <div className="border-t border-border bg-muted/10 p-3 sm:p-4 animate-in fade-in-0 duration-150">
                          <div className="overflow-x-auto rounded-lg border border-border bg-card">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                                  <th className="py-2.5 px-3">{t("feather-profile-th-article")}</th>
                                  <th className="py-2.5 px-3">{t("feather-profile-th-submitter")}</th>
                                  <th className="py-2.5 px-3">{t("feather-profile-th-decision")}</th>
                                  <th className="py-2.5 px-3">{t("feather-profile-th-comment")}</th>
                                  <th className="py-2.5 px-3">{t("feather-profile-th-reviewed")}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {contest.reviews.map((rev, idx) => (
                                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                    <td className="py-2.5 px-3 font-medium">
                                      <a
                                        href={`${contest.wiki_url}/wiki/${encodeURIComponent(rev.article_title)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                      >
                                        <span>{rev.article_title}</span>
                                        <ExternalLink className="h-3 w-3 opacity-60" />
                                      </a>
                                    </td>
                                    <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                                      {rev.submitter || "—"}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      {rev.decision === "accepted" && (
                                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                          Accepted
                                        </Badge>
                                      )}
                                      {rev.decision === "rejected" && (
                                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                                          Rejected
                                        </Badge>
                                      )}
                                      {rev.decision === "skipped" && (
                                        <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
                                          Skipped
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-muted-foreground text-[11px] max-w-xs truncate">
                                      {rev.comment || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                                      {rev.reviewed_at ? formatUtcToTz(rev.reviewed_at, "Asia/Dhaka", "MMM d, yyyy") : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
