"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchContestUserProfile, ContestUserProfile } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import {
  ArrowLeft, ExternalLink, Trophy, CheckCircle, XCircle,
  Clock, Shield, AlertTriangle, ChevronDown, ChevronRight,
  BookOpen, Award, FileText, User, Layers, Calendar, ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatUtcToTz } from "@/lib/time";
import UserBadge from "@/components/users/UserBadge";

export default function ContestUserProfilePage() {
  const params = useParams();
  const code = (params.code as string) || "";
  const username = decodeURIComponent((params.username as string) || "");
  const { t, n } = useI18n();

  const [submissionsOpen, setSubmissionsOpen] = useState(true);
  const [reviewsOpen, setReviewsOpen] = useState(true);
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");

  const { data: profile, isLoading, error } = useQuery<ContestUserProfile>({
    queryKey: ["contestUserProfile", code, username],
    queryFn: () => fetchContestUserProfile(code, username),
    enabled: !!code && !!username,
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
          The user &ldquo;{username}&rdquo; does not exist or has not participated in this contest yet.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href={`/contests/${code}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="me-1.5 h-3.5 w-3.5 rtl:rotate-180" />
              {t("feather-profile-back-contest")}
            </Button>
          </Link>
          <Link href={`/users/${encodeURIComponent(username)}`}>
            <Button variant="secondary" size="sm">
              {t("feather-profile-global-profile-link")}
              <ChevronRight className="ms-1.5 h-3.5 w-3.5 rtl:rotate-180" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Filter out any validation failures so they do not appear in the user submissions list
  const validSubmissions = profile.submissions.filter((s) => s.status !== "validation_failed");

  // Calculate aggregates
  const totalSubmissions = validSubmissions.length;
  const totalAccepted = validSubmissions.filter((s) => s.status === "accepted").length;
  const totalRejected = validSubmissions.filter((s) => s.status === "rejected").length;
  const totalPending = validSubmissions.filter((s) => s.status === "pending").length;
  const totalWords = profile.standing?.total_words ?? 
    validSubmissions
      .filter((s) => s.status === "accepted")
      .reduce((sum, s) => sum + s.word_count, 0);

  // Filter submissions
  const filteredSubmissions = validSubmissions.filter((s) =>
    s.title.toLowerCase().includes(submissionSearch.toLowerCase().trim())
  );

  // Filter reviews
  const filteredReviews = profile.reviews.filter(
    (r) =>
      r.article_title.toLowerCase().includes(reviewSearch.toLowerCase().trim()) ||
      r.submitter.toLowerCase().includes(reviewSearch.toLowerCase().trim())
  );

  const baseWikiUrl = profile.wiki_url || "https://bn.wikipedia.org";

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 max-w-5xl space-y-6">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href={`/contests/${code}`}
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="me-1.5 h-3.5 w-3.5 rtl:rotate-180" />
          {t("feather-profile-back-contest")} ({profile.contest_name})
        </Link>

        <Link
          href={`/users/${encodeURIComponent(profile.username)}`}
          className="inline-flex items-center text-xs font-medium text-primary hover:underline cursor-pointer"
        >
          {t("feather-profile-global-profile-link")}
          <ChevronRight className="ms-1 h-3.5 w-3.5 rtl:rotate-180" />
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
                {t("feather-profile-contest-kicker")} &bull; {profile.contest_name}
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2 flex-wrap">
                <span>{profile.username}</span>
                <UserBadge username={profile.username} role={profile.role} />
              </h1>
              <div className="flex items-center gap-2.5 pt-1">
                <a
                  href={`${baseWikiUrl}/wiki/Special:Contributions/${encodeURIComponent(profile.username)}`}
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

          {/* Contest Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center gap-3 lg:gap-6 border-t lg:border-t-0 lg:border-l border-border/80 pt-4 lg:pt-0 lg:pl-6">
            <div className="space-y-0.5">
              <div className="text-2xl sm:text-3xl font-bold text-foreground">
                {profile.standing ? `#${profile.standing.rank}` : "—"}
              </div>
              <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                {t("feather-profile-rank")}
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

            <div className="space-y-0.5">
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {n(totalWords)}
              </div>
              <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                {t("feather-profile-points")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions Section */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardHeader
          className="py-3.5 px-4 sm:px-6 cursor-pointer hover:bg-muted/30 transition-colors border-b border-border select-none"
          onClick={() => setSubmissionsOpen(!submissionsOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold">
                  {t("feather-profile-submissions-heading")}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  {t("feather-profile-sec-participated-kicker")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {totalAccepted > 0 && (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  {totalAccepted} {t("feather-profile-stat-accepted")}
                </Badge>
              )}
              {totalPending > 0 && (
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                  {totalPending} {t("feather-profile-stat-pending")}
                </Badge>
              )}
              {totalRejected > 0 && (
                <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                  {totalRejected} {t("feather-profile-stat-rejected")}
                </Badge>
              )}
              <Badge variant="secondary" className="font-mono text-xs">
                {profile.submissions.length}
              </Badge>
              {submissionsOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>

        {submissionsOpen && (
          <CardContent className="p-4 sm:p-6 space-y-4">
            {profile.submissions.length > 5 && (
              <div className="max-w-xs">
                <Input
                  placeholder="Filter articles..."
                  value={submissionSearch}
                  onChange={(e) => setSubmissionSearch(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
            )}

            {filteredSubmissions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                {profile.submissions.length === 0
                  ? t("feather-profile-no-participated")
                  : "No submissions matching your filter."}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                      <th className="py-2.5 px-3">{t("feather-profile-th-article")}</th>
                      <th className="py-2.5 px-3">{t("feather-profile-th-status")}</th>
                      <th className="py-2.5 px-3">{t("feather-profile-th-jury")}</th>
                      <th className="py-2.5 px-3">{t("feather-profile-th-comment")}</th>
                      <th className="py-2.5 px-3 text-right">{t("feather-profile-th-words")}</th>
                      <th className="py-2.5 px-3 text-right">{t("feather-profile-th-bytes")}</th>
                      <th className="py-2.5 px-3">{t("feather-profile-th-submitted")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSubmissions.map((sub) => {
                      const latestReview = sub.reviews && sub.reviews.length > 0 ? sub.reviews[0] : null;

                      return (
                        <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-medium">
                            <a
                              href={`${baseWikiUrl}/wiki/${encodeURIComponent(sub.title)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-foreground hover:text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {sub.title}
                              <ExternalLink className="h-2.5 w-2.5 opacity-40" />
                            </a>
                            {sub.validation_error && (
                              <div className="text-[10px] text-destructive mt-0.5">
                                {sub.validation_error}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={
                                sub.status === "accepted"
                                  ? "default"
                                  : sub.status === "rejected"
                                  ? "destructive"
                                  : sub.status === "validation_failed"
                                  ? "outline"
                                  : "secondary"
                              }
                              className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 ${
                                sub.status === "accepted"
                                  ? "bg-emerald-600 hover:bg-emerald-600/90 text-white"
                                  : ""
                              }`}
                            >
                              {sub.status === "accepted"
                                ? t("feather-contest-filter-accepted")
                                : sub.status === "pending"
                                ? t("feather-contest-filter-pending")
                                : sub.status === "rejected"
                                ? t("feather-contest-filter-rejected")
                                : t("feather-contest-filter-failed")}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {latestReview ? (
                              <Link
                                href={`/contests/${code}/users/${encodeURIComponent(latestReview.jury)}`}
                                className="text-primary hover:underline font-medium"
                              >
                                {latestReview.jury}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground/60 italic">
                                {t("feather-profile-awaiting-review")}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate" title={latestReview?.comment || ""}>
                            {latestReview?.comment ? (
                              latestReview.comment
                            ) : (
                              <span className="text-muted-foreground/40">&mdash;</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                            {n(sub.word_count)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                            {n(sub.byte_count)}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                            {formatUtcToTz(sub.submitted_at, "UTC", "MMM d, yyyy")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Reviews Section (Only if user has judged articles in this contest) */}
      {profile.reviews && profile.reviews.length > 0 && (
        <Card className="border-border shadow-xs overflow-hidden">
          <CardHeader
            className="py-3.5 px-4 sm:px-6 cursor-pointer hover:bg-muted/30 transition-colors border-b border-border select-none"
            onClick={() => setReviewsOpen(!reviewsOpen)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <div>
                  <CardTitle className="text-sm sm:text-base font-semibold">
                    {t("feather-profile-reviews-heading")}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    {t("feather-profile-sec-judged-kicker")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  {profile.reviews.length}
                </Badge>
                {reviewsOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>

          {reviewsOpen && (
            <CardContent className="p-4 sm:p-6 space-y-4">
              {profile.reviews.length > 5 && (
                <div className="max-w-xs">
                  <Input
                    placeholder="Filter evaluations..."
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              )}

              {filteredReviews.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No evaluations matching your filter.
                </p>
              ) : (
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
                      {filteredReviews.map((rev, idx) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-medium">
                            <a
                              href={`${baseWikiUrl}/wiki/${encodeURIComponent(rev.article_title)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-foreground hover:text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {rev.article_title}
                              <ExternalLink className="h-2.5 w-2.5 opacity-40" />
                            </a>
                          </td>
                          <td className="py-2.5 px-3">
                            <Link
                              href={`/contests/${code}/users/${encodeURIComponent(rev.submitter)}`}
                              className="text-primary hover:underline font-medium"
                            >
                              {rev.submitter}
                            </Link>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={
                                rev.decision === "accepted"
                                  ? "default"
                                  : rev.decision === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 ${
                                rev.decision === "accepted"
                                  ? "bg-emerald-600 hover:bg-emerald-600/90 text-white"
                                  : ""
                              }`}
                            >
                              {rev.decision}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate" title={rev.comment}>
                            {rev.comment || <span className="text-muted-foreground/40">&mdash;</span>}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                            {formatUtcToTz(rev.reviewed_at, "UTC", "MMM d, yyyy")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
