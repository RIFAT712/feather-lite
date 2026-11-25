"use client";

import { use, useState, useMemo, useEffect, useCallback, useRef, Fragment } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { 
  fetchContest, fetchStandings, fetchArticles, createSubContest,
  fetchAvailableContests, attachContestToCampaign, detachContestFromCampaign,
  fetchMe, approveContest, fetchJuryStats, fetchContestUserProfile,
  Contest, StandingEntry, Article, SubContestSummary, AvailableContestSummary,
  UserSession, KeysetResponse, JuryStatsResponse, JuryMemberProgress
} from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { getProjectMeta, getWikiInfo, getOnwikiPageLink } from "@/lib/wikis";
import { MetaWikiLogoIcon } from "@/components/icons/CodexIcons";
import WikiSelector from "@/components/contests/WikiSelector";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  ExternalLink, Calendar, BookOpen, Medal, ArrowLeft, ArrowRight,
  Users, ShieldCheck, Share2, Copy, Check, Search, 
  FileCode, CheckCheck, XCircle, AlertCircle, Layers, Plus, Globe,
  Link2, Unlink, Settings, Save, Sliders, Sparkles, UserCheck, CheckCircle, Shield, X,
  BarChart3, ShieldAlert, Download, List, ChevronDown, ChevronRight,
  FileSpreadsheet, TrendingUp, MessageSquare, RefreshCw
} from "lucide-react";
import { UserTagInput } from "@/components/contests/UserTagInput";
import TalkTemplateBuilder from "@/components/contests/TalkTemplateBuilder";
import UserBadge from "@/components/users/UserBadge";
import ArticleDiscussionModal from "@/components/contests/ArticleDiscussionModal";
import CommunityChatPanel from "@/components/chat/CommunityChatPanel";

function ParticipantArticlesDrawer({
  code,
  username,
  wikiUrl,
  showWords,
  showBytes,
  cachedArticles,
  expectedTotal,
  statusFilter,
  formatDate,
}: {
  code: string;
  username: string;
  wikiUrl?: string;
  showWords: boolean;
  showBytes: boolean;
  cachedArticles?: Article[];
  expectedTotal: number;
  statusFilter?: string;
  formatDate: (date: any, options?: any) => string;
}) {
  const { t, n } = useI18n();
  const PAGE_SIZE = 50;
  const hasAll = Boolean(cachedArticles && cachedArticles.length >= expectedTotal && expectedTotal > 0);
  const statusParam = statusFilter && statusFilter !== "all" ? statusFilter : undefined;

  // Keyset cursor pagination for articles by this submitter
  const { data: initialData, isLoading } = useQuery<KeysetResponse>({
    queryKey: ["contestArticlesBySubmitter", code, username, statusParam],
    queryFn: () => fetchArticles(code, undefined, statusParam, PAGE_SIZE, undefined, username),
    enabled: !hasAll,
    staleTime: 60 * 1000,
  });

  const [extraItems, setExtraItems] = useState<Article[]>([]);
  const [currentCursor, setCurrentCursor] = useState<number | undefined>(undefined);
  const [hasMoreCursor, setHasMoreCursor] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Sync cursor state when initialData arrives or query inputs change
  useEffect(() => {
    setExtraItems([]);
    if (initialData) {
      setCurrentCursor(initialData.next_cursor);
      setHasMoreCursor(initialData.has_more);
    }
  }, [username, statusFilter, initialData]);

  // All loaded submissions for this drawer
  const submissions = useMemo(() => {
    if (hasAll && cachedArticles) {
      let list = cachedArticles.filter((s: any) => s.status !== "validation_failed");
      if (statusParam) {
        list = list.filter((s: any) => s.status === statusParam);
      }
      return list;
    }
    const baseItems = initialData?.items || [];
    return [...baseItems, ...extraItems];
  }, [hasAll, cachedArticles, statusParam, initialData?.items, extraItems]);

  const totalCount = useMemo(() => {
    if (hasAll) return submissions.length;
    return Math.max(submissions.length, expectedTotal);
  }, [hasAll, submissions.length, expectedTotal]);

  // Infinite scroll trigger: load next batch when scrolling near the bottom
  const loadMoreData = useCallback(async () => {
    if (hasAll || !currentCursor || isLoadingMore || !hasMoreCursor) return;
    setIsLoadingMore(true);
    try {
      const res = await fetchArticles(code, currentCursor, statusParam, PAGE_SIZE, undefined, username);
      setExtraItems((prev) => [...prev, ...res.items]);
      setCurrentCursor(res.next_cursor);
      setHasMoreCursor(res.has_more);
    } catch {
      toast.error(t("feather-contest-load-more-error"));
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasAll, currentCursor, isLoadingMore, hasMoreCursor, code, statusParam, username, t]);

  // Virtualizer for 60 FPS viewport rendering (unrenders off-screen DOM nodes)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: submissions.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 44,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  // Trigger infinite scroll when approaching the bottom of loaded submissions
  useEffect(() => {
    if (virtualRows.length === 0) return;
    const lastRendered = virtualRows[virtualRows.length - 1];
    if (lastRendered && lastRendered.index >= submissions.length - 8 && hasMoreCursor && !isLoadingMore) {
      loadMoreData();
    }
  }, [virtualRows, submissions.length, hasMoreCursor, isLoadingMore, loadMoreData]);

  if (isLoading && !hasAll) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-48 rounded" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>
    );
  }

  if (submissions.length === 0 && !isLoading) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground italic">
        {t("feather-contest-submissions-empty")}
      </div>
    );
  }

  const baseWiki = wikiUrl || "https://bn.wikipedia.org";
  const colSpan = 5 + (showWords ? 1 : 0) + (showBytes ? 1 : 0);
  const totalVirtualSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom = virtualRows.length > 0 ? totalVirtualSize - (virtualRows[virtualRows.length - 1]?.end || 0) : 0;

  return (
    <div className="rounded-lg border border-border/70 overflow-hidden bg-card/60 shadow-2xs">
      <div
        ref={scrollContainerRef}
        className="max-h-[440px] overflow-y-auto scroll-smooth"
      >
        <Table className="table-fixed w-full">
          <colgroup>
            <col className="w-[45%] min-w-[140px]" />
            <col className="w-[100px]" />
            {showWords && <col className="w-[80px]" />}
            {showBytes && <col className="w-[80px]" />}
            <col className="w-[110px]" />
            <col className="w-[44px]" />
          </colgroup>
          <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-xs">
            <TableRow className="hover:bg-transparent bg-muted/40 border-b border-border/80">
              <TableHead className="text-xs truncate">{t("feather-contest-col-article")}</TableHead>
              <TableHead className="text-center text-xs whitespace-nowrap">{t("feather-contest-col-status")}</TableHead>
              {showWords && <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-contest-col-words")}</TableHead>}
              {showBytes && <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-contest-col-bytes")}</TableHead>}
              <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-contest-col-date")}</TableHead>
              <TableHead className="text-center text-xs"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paddingTop > 0 && (
              <tr style={{ height: `${paddingTop}px` }}>
                <td colSpan={colSpan} className="p-0 border-0" />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const art = submissions[virtualRow.index];
              if (!art) return null;
              return (
                <TableRow
                  key={art.id}
                  className="hover:bg-muted/40 transition-colors h-[44px]"
                >
                  <TableCell className="font-medium text-xs truncate">
                    <a
                      href={`${baseWiki}/wiki/${encodeURIComponent(art.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-primary hover:underline text-foreground max-w-full truncate"
                      title={art.title}
                    >
                      <span className="truncate">{art.title}</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-40 shrink-0" />
                    </a>
                    {art.validation_error && (
                      <div className="text-[10px] text-destructive truncate mt-0.5" title={art.validation_error}>{art.validation_error}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
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
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 ${
                        art.status === "accepted" ? "bg-emerald-600 hover:bg-emerald-600/90 text-white" : ""
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
                  {showWords && (
                    <TableCell className="text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {n(art.word_count)}
                    </TableCell>
                  )}
                  {showBytes && (
                    <TableCell className="text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {n(art.byte_count)}
                    </TableCell>
                  )}
                  <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    {art.submitted_at ? formatDate(art.submitted_at) : "—"}
                  </TableCell>
                  <TableCell className="text-center p-2 whitespace-nowrap">
                    <a
                      href={`${baseWiki}/wiki/${encodeURIComponent(art.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground/60 hover:text-primary p-1 inline-flex"
                      title="Open on Wikipedia"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                </TableRow>
              );
            })}
            {paddingBottom > 0 && (
              <tr style={{ height: `${paddingBottom}px` }}>
                <td colSpan={colSpan} className="p-0 border-0" />
              </tr>
            )}
          </TableBody>
        </Table>

        {/* Subtle background streaming indicator during infinite scroll */}
        {isLoadingMore && (
          <div className="py-2.5 text-center text-xs text-muted-foreground flex items-center justify-center gap-2 border-t border-border/40 bg-muted/20">
            <div className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading more...</span>
          </div>
        )}
      </div>

      {/* Footer bar with live virtual count & link to full profile */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/15 border-t border-border/70 text-xs text-muted-foreground">
        <span>
          {t("feather-contest-showing-subset", n(submissions.length), n(totalCount))}
        </span>
        <Link
          href={`/contests/${code}/users/${encodeURIComponent(username)}`}
          className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
        >
          <span>{t("feather-profile-view-full")}</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

interface ContestDashboardClientProps {
  code: string;
  initialContest?: Contest | null;
  initialMe?: UserSession | null;
  initialStandings?: StandingEntry[];
  initialArticles?: KeysetResponse | null;
  initialJuryStats?: JuryStatsResponse | null;
}

export default function ContestDashboardClient({
  code,
  initialContest,
  initialMe,
  initialStandings,
  initialArticles,
  initialJuryStats,
}: ContestDashboardClientProps) {
  const { t, n, formatDate, locale, isRtl } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryClient = useQueryClient();

  // Local search and filter states
  const [standingsSearch, setStandingsSearch] = useState("");
  const [submissionsSearch, setSubmissionsSearch] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [communityFilter, setCommunityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCopied, setIsCopied] = useState(false);
  const [discussionArticle, setDiscussionArticle] = useState<Article | null>(null);

  // Live ticking countdown timer state (1-second tick)
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Standings Export Dialog states (Summary vs Detailed, Copy, CSV, JSON)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportMode, setExportMode] = useState<"summary" | "detailed">("summary");
  const [copiedExport, setCopiedExport] = useState(false);

  // Submissions View Mode state (Flat list vs Grouped by submitter)
  const [submissionsViewMode, setSubmissionsViewMode] = useState<"list" | "grouped">("grouped");
  const [expandedSubmitters, setExpandedSubmitters] = useState<Record<string, boolean>>({});

  // Add community modal state (for campaigns)
  const [isAddCommunityOpen, setIsAddCommunityOpen] = useState(false);
  const [addCommunityMode, setAddCommunityMode] = useState<"create" | "link">("create");
  const [isAddingSubContest, setIsAddingSubContest] = useState(false);
  const [newSubDbName, setNewSubDbName] = useState("bnwiki");
  const [newSubURL, setNewSubURL] = useState("https://bn.wikipedia.org");
  const [newSubLang, setNewSubLang] = useState("bn");
  const [newSubName, setNewSubName] = useState("");
  const [newSubMinWords, setNewSubMinWords] = useState(300);
  const [newSubTalkTemplate, setNewSubTalkTemplate] = useState("");
  const [newSubJuries, setNewSubJuries] = useState<string[]>([]);

  // Link existing competition state
  const [existingSearchQuery, setExistingSearchQuery] = useState("");
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachingContestId, setAttachingContestId] = useState<number | null>(null);
  const [isDetaching, setIsDetaching] = useState<number | null>(null);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<string>("");


  // User session
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    initialData: initialMe || undefined,
    initialDataUpdatedAt: initialMe ? Date.now() : undefined,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  // Queries
  const { data: contest, isLoading: contestLoading } = useQuery<Contest>({
    queryKey: ["contest", code],
    queryFn: () => fetchContest(code),
    initialData: initialContest || undefined,
    initialDataUpdatedAt: initialContest ? Date.now() : undefined,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const { data: standings, isLoading: standingsLoading } = useQuery<StandingEntry[]>({
    queryKey: ["standings", code, communityFilter],
    queryFn: () => fetchStandings(code, communityFilter === "all" ? undefined : communityFilter),
    initialData: communityFilter === "all" ? (initialStandings ?? undefined) : undefined,
    initialDataUpdatedAt: communityFilter === "all" && initialStandings ? Date.now() : undefined,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const { data: articlesData, isLoading: articlesLoading } = useQuery<KeysetResponse>({
    queryKey: ["articles", code, statusFilter],
    queryFn: () => fetchArticles(code, undefined, statusFilter === "all" ? undefined : statusFilter, 100),
    initialData: statusFilter === "all" ? (initialArticles ?? undefined) : undefined,
    initialDataUpdatedAt: statusFilter === "all" && initialArticles ? Date.now() : undefined,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const [extraArticles, setExtraArticles] = useState<Article[]>([]);
  const [nextCursor, setNextCursor] = useState<number | undefined>(initialArticles?.next_cursor);
  const [hasMoreArticles, setHasMoreArticles] = useState<boolean>(initialArticles?.has_more ?? false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (articlesData) {
      setNextCursor(articlesData.next_cursor);
      setHasMoreArticles(articlesData.has_more ?? false);
      setExtraArticles([]);
    }
  }, [articlesData, statusFilter]);

  const handleLoadMoreArticles = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetchArticles(code, nextCursor, statusFilter === "all" ? undefined : statusFilter, 100);
      setExtraArticles((prev) => [...prev, ...res.items]);
      setNextCursor(res.next_cursor);
      setHasMoreArticles(res.has_more ?? false);
    } catch {
      toast.error("Failed to load more articles");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const allArticles = useMemo(() => {
    return [...(articlesData?.items || []), ...extraArticles];
  }, [articlesData?.items, extraArticles]);

  const articles = allArticles;

  const articleParam = searchParams.get("article");
  useEffect(() => {
    if (articleParam && articles && articles.length > 0) {
      const artId = Number(articleParam);
      const found = articles.find((a) => a.id === artId);
      if (found) {
        setDiscussionArticle(found);
      }
    }
  }, [articleParam, articles]);

  const { data: juryStats } = useQuery<JuryStatsResponse | null>({
    queryKey: ["jury-stats", code],
    queryFn: () => fetchJuryStats(code),
    initialData: initialJuryStats ?? undefined,
    initialDataUpdatedAt: initialJuryStats ? Date.now() : undefined,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  // Campaign management permissions (Restricted strictly to Platform Admins and Owners)
  const isOwner = Boolean(me?.is_authenticated && (me.role === "owner" || (me as any)?.is_owner));
  const isAdmin = Boolean(isOwner || (me?.is_authenticated && (me.role === "admin" || (me as any)?.is_admin)));
  const canManageCampaign = isOwner || isAdmin;

  // Available standalone contests for linking
  const { data: availableContests, isLoading: isLoadingAvailable } = useQuery<AvailableContestSummary[]>({
    queryKey: ["available-contests", code, existingSearchQuery],
    queryFn: () => fetchAvailableContests(code, existingSearchQuery),
    enabled: !!contest?.is_umbrella && isAddCommunityOpen && addCommunityMode === "link" && canManageCampaign,
  });

  const handleAttachContest = async (contestId: number) => {
    if (!canManageCampaign) {
      toast.error(t("feather-campaign-admin-only-notice"));
      return;
    }
    setAttachingContestId(contestId);
    setIsAttaching(true);
    try {
      await attachContestToCampaign(code, { contest_id: contestId });
      toast.success(t("feather-campaign-link-success"));
      setIsAddCommunityOpen(false);
      queryClient.invalidateQueries({ queryKey: ["contest", code] });
      queryClient.invalidateQueries({ queryKey: ["standings", code] });
      queryClient.invalidateQueries({ queryKey: ["articles", code] });
      queryClient.invalidateQueries({ queryKey: ["available-contests", code] });
    } catch (err: any) {
      toast.error(err.message || "Failed to attach contest");
    } finally {
      setIsAttaching(false);
      setAttachingContestId(null);
    }
  };

  const handleDetachContest = async (contestId: number) => {
    if (!canManageCampaign) {
      toast.error(t("feather-campaign-admin-only-notice"));
      return;
    }
    if (!confirm(t("feather-campaign-detach-confirm"))) return;
    setIsDetaching(contestId);
    try {
      await detachContestFromCampaign(code, { contest_id: contestId });
      toast.success(t("feather-campaign-detach-success"));
      queryClient.invalidateQueries({ queryKey: ["contest", code] });
      queryClient.invalidateQueries({ queryKey: ["standings", code] });
      queryClient.invalidateQueries({ queryKey: ["articles", code] });
      queryClient.invalidateQueries({ queryKey: ["available-contests", code] });
    } catch (err: any) {
      toast.error(err.message || "Failed to detach contest");
    } finally {
      setIsDetaching(null);
    }
  };

  const handleCreateSubContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCampaign) {
      toast.error(t("feather-campaign-admin-only-notice"));
      return;
    }
    if (!newSubDbName) return;
    setIsAddingSubContest(true);
    try {
      await createSubContest(code, {
        name: newSubName.trim() || `${contest?.name || "Campaign"} (${newSubDbName})`,
        wiki_dbname: newSubDbName,
        wiki_url: newSubURL,
        wiki_lang: newSubLang,
        min_words: Number(newSubMinWords) || 0,
        talk_template_name: newSubTalkTemplate.trim(),
        juries: newSubJuries,
        rule_must_be_creator: contest?.rule_must_be_creator ?? true,
      });
      toast.success(`Added ${newSubDbName} community edition!`);
      setIsAddCommunityOpen(false);
      queryClient.invalidateQueries({ queryKey: ["contest", code] });
      queryClient.invalidateQueries({ queryKey: ["standings", code] });
    } catch (err: any) {
      toast.error(err.message || "Failed to add community");
    } finally {
      setIsAddingSubContest(false);
    }
  };

  // Filtered Communities for Campaign Directory
  const filteredSubContests = useMemo(() => {
    if (!contest?.sub_contests) return [];
    if (!communitySearch.trim()) return contest.sub_contests;
    const q = communitySearch.toLowerCase().trim();
    return contest.sub_contests.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.wiki_dbname.toLowerCase().includes(q) ||
        s.wiki_lang.toLowerCase().includes(q)
    );
  }, [contest?.sub_contests, communitySearch]);

  // Filtered Standings
  const filteredStandings = useMemo(() => {
    if (!standings) return [];
    if (!standingsSearch.trim()) return standings;
    const q = standingsSearch.toLowerCase().trim();
    return standings.filter((s) => s.username.toLowerCase().includes(q));
  }, [standings, standingsSearch]);

  // Filtered Submissions (articles that failed validation must never appear on the list)
  const filteredArticles = useMemo<Article[]>(() => {
    if (!articles) return [];
    const valid = articles.filter((a: Article) => a.status !== "validation_failed");
    if (!submissionsSearch.trim()) return valid;
    const q = submissionsSearch.toLowerCase().trim();
    return valid.filter(
      (a: Article) =>
        a.title.toLowerCase().includes(q) ||
        a.submitter_username.toLowerCase().includes(q)
    );
  }, [articles, submissionsSearch]);

  // Live Timeline Countdown & Progress Calculation (Ticking seconds)
  const countdownInfo = useMemo(() => {
    if (!contest) return { percent: 0, text: "", isEnded: false, isUpcoming: false, days: 0, hours: 0, minutes: 0, seconds: 0 };
    const start = new Date(contest.start_date).getTime();
    const end = new Date(contest.end_date).getTime();
    const total = end - start;

    if (total <= 0 || nowMs >= end) {
      return { percent: 100, text: t("feather-contest-ended"), isEnded: true, isUpcoming: false, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    if (nowMs < start) {
      const diffMs = start - nowMs;
      const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const h = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diffMs / (1000 * 60)) % 60);
      const s = Math.floor((diffMs / 1000) % 60);
      const text = locale === "bn"
        ? (d > 0
            ? `শুরু হতে বাকি ${n(d)} দিন ${n(h)} ঘণ্টা`
            : `শুরু হতে বাকি ${n(h)} ঘণ্টা ${n(m)} মিনিট ${n(s)} সেকেন্ড`)
        : (d > 0
            ? `Starts in ${d}d ${h}h`
            : `Starts in ${h}h ${m}m ${s}s`);

      return {
        percent: 0,
        text,
        isEnded: false,
        isUpcoming: true,
        days: d,
        hours: h,
        minutes: m,
        seconds: s,
      };
    }

    const elapsed = Math.min(Math.max(nowMs - start, 0), total);
    const percent = total > 0 ? Math.round((elapsed / total) * 100) : 100;
    const diffMs = end - nowMs;
    const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const h = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diffMs / (1000 * 60)) % 60);
    const s = Math.floor((diffMs / 1000) % 60);

    const formattedTime = locale === "bn"
      ? `${n(d)}দিন ${n(h)}ঘণ্টা ${n(m)}মিনিট ${n(s)}সেকেন্ড বাকি`
      : `${d}d ${h}h ${m}m ${s}s left`;

    return {
      percent,
      text: formattedTime,
      isEnded: false,
      isUpcoming: false,
      days: d,
      hours: h,
      minutes: m,
      seconds: s,
    };
  }, [contest, nowMs, t, n, locale]);

  const formatDateDDMMYYYY = useCallback((dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear());
    const formatted = `${day}/${month}/${year}`;
    if (locale === "bn") {
      const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
      return formatted.replace(/[0-9]/g, (ch) => bnDigits[Number(ch)]);
    }
    return formatted;
  }, [locale]);

  const isJuryOrOrganizer = useMemo(() => {
    if (!me?.is_authenticated) return false;
    if (me.role === "owner" || me.role === "jury" || me.role === "admin" || (me as any)?.is_owner || (me as any)?.is_admin) return true;
    if (contest?.created_by_id && me.user_id && contest.created_by_id === me.user_id) return true;
    if (contest?.created_by_username && me.wiki_username && contest.created_by_username.trim().toLowerCase() === me.wiki_username.trim().toLowerCase()) return true;
    if (contest?.juries && me.wiki_username && contest.juries.includes(me.wiki_username)) return true;
    return false;
  }, [me, contest]);

  const isOrganizer = useMemo(() => {
    if (!me?.is_authenticated) return false;
    if (me.role === "owner" || me.role === "admin" || (me as any)?.is_owner || (me as any)?.is_admin) return true;
    if (contest?.created_by_id && me.user_id && contest.created_by_id === me.user_id) return true;
    if (contest?.created_by_username && me.wiki_username && contest.created_by_username.trim().toLowerCase() === me.wiki_username.trim().toLowerCase()) return true;
    if (contest?.juries && me.wiki_username && contest.juries.includes(me.wiki_username)) return true;
    return false;
  }, [me, contest]);

  const isCreator = Boolean(contest?.created_by_id && me?.user_id && contest.created_by_id === me.user_id);
  const [isApproving, setIsApproving] = useState(false);

  const handleQuickApprove = async () => {
    setIsApproving(true);
    try {
      await approveContest(code);
      toast.success(t("feather-admin-approved-success"));
      queryClient.invalidateQueries({ queryKey: ["contest", code] });
      queryClient.invalidateQueries({ queryKey: ["contests"] });
      queryClient.invalidateQueries({ queryKey: ["adminOverview"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to approve contest");
    } finally {
      setIsApproving(false);
    }
  };

  // Default active tab initialization
  useEffect(() => {
    if (contest && !activeTab) {
      setActiveTab(contest.is_umbrella ? "communities" : "standings");
    }
  }, [contest, activeTab]);

  // Contest metric mode (word vs byte evaluation)
  const isWordBased = Boolean(
    contest?.rank_by_words ||
    ((contest?.min_words ?? 0) > 0 && (contest?.min_bytes ?? 0) === 0)
  );
  const isByteBased = Boolean(
    !contest?.rank_by_words &&
    (contest?.min_bytes ?? 0) > 0 &&
    (contest?.min_words ?? 0) === 0
  );
  const showBytes = !isWordBased;
  const showWords = !isByteBased;

  // Judging throughput calculations
  const judgingProgress = useMemo(() => {
    const accepted = juryStats?.accepted_articles ?? contest?.accepted_articles ?? 0;
    const rejected = juryStats?.rejected_articles ?? 0;
    const pending = juryStats?.pending_articles ?? contest?.pending_articles ?? 0;
    const reviewed = accepted + rejected;
    const totalJudgeable = reviewed + pending;
    const percent = totalJudgeable > 0 ? Math.round((reviewed / totalJudgeable) * 100) : 0;
    const acceptedPct = totalJudgeable > 0 ? (accepted / totalJudgeable) * 100 : 0;
    const rejectedPct = totalJudgeable > 0 ? (rejected / totalJudgeable) * 100 : 0;
    const pendingPct = totalJudgeable > 0 ? (pending / totalJudgeable) * 100 : 0;

    return {
      accepted,
      rejected,
      pending,
      reviewed,
      totalJudgeable,
      percent,
      acceptedPct,
      rejectedPct,
      pendingPct,
    };
  }, [juryStats, contest]);

  // Combined Jury Roster & Activity Statistics
  const juryTallyRows = useMemo(() => {
    const tallyMap = new Map<string, JuryMemberProgress>();
    (juryStats?.juries || []).forEach((j) => {
      tallyMap.set(j.username, j);
    });

    const contestJuries = contest?.juries || [];
    const combined = [...contestJuries];
    (juryStats?.juries || []).forEach((j) => {
      // Only include from juryStats if they are designated in contest.juries OR have actually evaluated/been assigned articles
      if (!combined.includes(j.username) && (j.judged > 0 || j.assigned > 0)) {
        combined.push(j.username);
      }
    });

    return combined
      .map((username) => {
        const stats = tallyMap.get(username);
        return {
          username,
          assigned: stats?.assigned ?? 0,
          judged: stats?.judged ?? 0,
          remaining: stats?.remaining ?? 0,
          accepted: stats?.accepted ?? 0,
          rejected: stats?.rejected ?? 0,
          skipped: stats?.skipped ?? 0,
          acceptance_rate: stats?.acceptance_rate ?? 0,
          progress_percent: stats?.progress_percent ?? 0,
        };
      })
      .sort((a, b) => b.judged - a.judged);
  }, [juryStats, contest?.juries]);

  const userArticlesMap = useMemo(() => {
    const map: Record<string, Article[]> = {};
    (allArticles || []).forEach((art) => {
      if (!map[art.submitter_username]) map[art.submitter_username] = [];
      map[art.submitter_username].push(art);
    });
    return map;
  }, [allArticles]);

  // Grouped Submissions by Submitter (Using full contest standings for 100% accurate aggregates across all entries)
  const groupedSubmitters = useMemo(() => {
    if (!standings || standings.length === 0) return [];
    let list = standings;

    // Filter by search query
    if (submissionsSearch.trim()) {
      const q = submissionsSearch.toLowerCase().trim();
      list = list.filter((s) => s.username.toLowerCase().includes(q));
    }

    // Filter by status tab (all / accepted / pending / rejected)
    if (statusFilter === "accepted") {
      list = list.filter((s) => s.accepted_count > 0);
    } else if (statusFilter === "pending") {
      list = list.filter((s) => (s.pending_count ?? 0) > 0 || (s.submitted_count - s.accepted_count - (s.rejected_count ?? 0)) > 0);
    } else if (statusFilter === "rejected") {
      list = list.filter((s) => (s.rejected_count ?? 0) > 0);
    }

    return list.map((s) => {
      const pending = s.pending_count ?? Math.max(0, s.submitted_count - s.accepted_count - (s.rejected_count ?? 0));
      const rejected = s.rejected_count ?? 0;
      return {
        username: s.username,
        role: s.role,
        total: s.submitted_count,
        accepted: s.accepted_count,
        pending,
        rejected,
        totalWords: s.submitted_words || s.total_words,
        totalBytes: s.submitted_bytes || s.total_bytes,
      };
    });
  }, [standings, submissionsSearch, statusFilter]);

  const totalSubmissionsInGrouped = useMemo(() => {
    return groupedSubmitters.reduce((sum, s) => sum + s.total, 0);
  }, [groupedSubmitters]);

  const toggleSubmitter = (username: string) => {
    setExpandedSubmitters((prev) => ({
      ...prev,
      [username]: !prev[username],
    }));
  };

  const expandAllSubmitters = () => {
    const all: Record<string, boolean> = {};
    groupedSubmitters.forEach((g) => {
      all[g.username] = true;
    });
    setExpandedSubmitters(all);
  };

  const collapseAllSubmitters = () => {
    setExpandedSubmitters({});
  };

  // Accepted articles lookup by submitter for detailed export
  const acceptedArticlesByUser = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (articles) {
      articles.forEach((a) => {
        if (a.status === "accepted") {
          if (!map[a.submitter_username]) map[a.submitter_username] = [];
          map[a.submitter_username].push(a.title);
        }
      });
    }
    return map;
  }, [articles]);

  // Generate Wikitext Table for Standings (Summary vs Detailed)
  const wikitextTable = useMemo(() => {
    if (!standings || standings.length === 0) return "";
    const isBn = locale === "bn";
    const isDetailed = exportMode === "detailed";

    const headers: string[] = [];
    if (isBn) {
      headers.push("স্থান", "ব্যবহারকারী", "গৃহীত নিবন্ধ");
      if (isDetailed) headers.push("গৃহীত নিবন্ধের তালিকা");
      if (showWords) headers.push("মোট শব্দ");
      if (showBytes) headers.push("মোট বাইট");
      headers.push("মোট জমাকৃত");
    } else {
      headers.push("Rank", "User", "Accepted");
      if (isDetailed) headers.push("Accepted Articles");
      if (showWords) headers.push("Total Words");
      if (showBytes) headers.push("Total Bytes");
      headers.push("Submitted");
    }

    const lines: string[] = [
      '{| class="wikitable sortable" style="text-align:center"',
      `! ${headers.join(" !! ")}`,
    ];

    standings.forEach((s) => {
      lines.push("|-");
      const cells: string[] = [String(s.rank), `[[User:${s.username}|${s.username}]]`, String(s.accepted_count)];
      if (isDetailed) {
        const userArticles = acceptedArticlesByUser[s.username] || [];
        const formattedArticles = userArticles.length > 0
          ? userArticles.map((t) => `[[${t}]]`).join(", ")
          : "—";
        cells.push(`style="text-align:left" | ${formattedArticles}`);
      }
      if (showWords) cells.push(s.total_words.toLocaleString());
      if (showBytes) cells.push(s.total_bytes.toLocaleString());
      cells.push(String(s.submitted_count));
      lines.push(`| ${cells.join(" || ")}`);
    });

    lines.push("|}");
    return lines.join("\n");
  }, [standings, acceptedArticlesByUser, exportMode, locale, showWords, showBytes]);

  const handleCopyWikitext = async () => {
    if (!wikitextTable) return;
    try {
      await navigator.clipboard.writeText(wikitextTable);
      setCopiedExport(true);
      toast.success(t("feather-contest-wikitext-copied"));
      setTimeout(() => setCopiedExport(false), 2000);
    } catch {
      toast.error("Failed to copy wikitext");
    }
  };

  const handleDownloadWikitext = () => {
    if (!wikitextTable) return;
    const blob = new Blob([wikitextTable], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feather_${code}_standings_${exportMode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded wikitext file");
  };

  const handleDownloadCSV = () => {
    if (!standings || standings.length === 0) return;
    const isDetailed = exportMode === "detailed";
    const headers: string[] = ["Rank", "User", "Accepted"];
    if (isDetailed) headers.push("Accepted Articles");
    if (showWords) headers.push("Total Words");
    if (showBytes) headers.push("Total Bytes");
    headers.push("Submitted");

    const rows = standings.map((s) => {
      const row: (string | number)[] = [
        s.rank,
        `"${s.username.replace(/"/g, '""')}"`,
        s.accepted_count,
      ];
      if (isDetailed) {
        const userArticles = (acceptedArticlesByUser[s.username] || []).join("; ");
        row.push(`"${userArticles.replace(/"/g, '""')}"`);
      }
      if (showWords) row.push(s.total_words);
      if (showBytes) row.push(s.total_bytes);
      row.push(s.submitted_count);
      return row;
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feather_${code}_standings_${exportMode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded standings.csv");
  };

  const handleDownloadJSON = () => {
    if (!standings) return;
    const isDetailed = exportMode === "detailed";
    const data = standings.map((s) => {
      const entry: Record<string, any> = {
        rank: s.rank,
        username: s.username,
        role: s.role,
        accepted_count: s.accepted_count,
      };
      if (showWords) entry.total_words = s.total_words;
      if (showBytes) entry.total_bytes = s.total_bytes;
      entry.submitted_count = s.submitted_count;
      if (isDetailed) {
        entry.accepted_articles = acceptedArticlesByUser[s.username] || [];
      }
      return entry;
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feather_${code}_standings_${exportMode}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded standings.json");
  };

  const handleExportJuryWikitable = async () => {
    if (!juryTallyRows.length) return;
    const lines = [
      '{| class="wikitable sortable" style="text-align:center"',
      `! ${[
        t("feather-jury-col-member"),
        t("feather-jury-col-judged"),
        t("feather-jury-col-accepted"),
        t("feather-jury-col-rejected"),
        t("feather-jury-col-acceptance-rate"),
      ].join(" !! ")}`,
    ];
    juryTallyRows.forEach((j) => {
      lines.push("|-");
      lines.push(
        `| [[User:${j.username}|${j.username}]] || ${j.judged} || ${j.accepted} || ${j.rejected} || ${j.acceptance_rate}%`
      );
    });
    lines.push("|}");
    const content = lines.join("\n");
    try {
      await navigator.clipboard.writeText(content);
      toast.success(t("feather-jury-wikitable-copied"));
    } catch {
      toast.error("Failed to copy table");
    }
  };

  const handleExportJuryCSV = () => {
    if (!juryTallyRows.length) return;
    const headers = [
      t("feather-jury-col-member"),
      t("feather-jury-col-judged"),
      t("feather-jury-col-accepted"),
      t("feather-jury-col-rejected"),
      t("feather-jury-col-acceptance-rate"),
    ];
    const rows = juryTallyRows.map((j) => [
      `"${j.username.replace(/"/g, '""')}"`,
      j.judged,
      j.accepted,
      j.rejected,
      `${j.acceptance_rate}%`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feather_${code}_jury_stats.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded jury_stats.csv");
  };

  const copyWikitext = () => {
    handleCopyWikitext();
  };

  // Share Dialog & Link Preview states
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [copiedWikitextAnnouncement, setCopiedWikitextAnnouncement] = useState(false);

  // Computed share URL
  const shareUrl = useMemo(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      return `${window.location.origin}/contests/${code}`;
    }
    return `https://feather.toolforge.org/contests/${code}`;
  }, [code]);

  // Social share URLs
  const whatsappShareUrl = useMemo(() => {
    const text = `${contest?.name || "Feather Contest"}\n${shareUrl}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }, [contest?.name, shareUrl]);

  const telegramShareUrl = useMemo(() => {
    return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(contest?.name || "Feather Contest")}`;
  }, [contest?.name, shareUrl]);

  const twitterShareUrl = useMemo(() => {
    const text = `${contest?.name || "Feather Contest"} on Feather (@Wikimedia)`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
  }, [contest?.name, shareUrl]);

  const facebookShareUrl = useMemo(() => {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  }, [shareUrl]);

  // Wikitext announcement snippet for Wikipedia community pages
  const wikitextAnnouncement = useMemo(() => {
    const contestName = contest?.name || "Contest";
    const startDate = formatDateDDMMYYYY(contest?.start_date || "");
    const endDate = formatDateDDMMYYYY(contest?.end_date || "");
    if (locale === "bn") {
      return `== ${contestName} শুরু হয়েছে! ==\nসুপ্রিয় উইকিপিডিয়ান,\n\n[${shareUrl} ${contestName}]${startDate && endDate ? ` (${startDate} — ${endDate})` : ""} শুরু হয়েছে। প্রতিযোগিতায় অংশগ্রহণ করতে, বিস্তারিত নিয়মাবলী জানতে এবং আপনার নিবন্ধ জমা দিতে দয়া করে [${shareUrl} ফেদার প্রতিযোগিতা ড্যাশবোর্ডে] যান।\n\nসকলের সক্রিয় অংশগ্রহণ ও সাফল্য কামনা করছি। ~~~~`;
    }
    return `== ${contestName} has started! ==\nDear Wikipedians,\n\n[${shareUrl} ${contestName}]${startDate && endDate ? ` (${startDate} — ${endDate})` : ""} is now underway. To participate, review contest guidelines, and submit your eligible articles, please visit the [${shareUrl} Feather contest dashboard].\n\nHappy editing! ~~~~`;
  }, [contest?.name, contest?.start_date, contest?.end_date, formatDateDDMMYYYY, shareUrl, locale]);

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      toast.success(t("feather-contest-share-copied"));
      setTimeout(() => setCopiedShareLink(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleCopyWikitextAnnouncement = async () => {
    try {
      await navigator.clipboard.writeText(wikitextAnnouncement);
      setCopiedWikitextAnnouncement(true);
      toast.success(t("feather-contest-share-wikitext-copied"));
      setTimeout(() => setCopiedWikitextAnnouncement(false), 2000);
    } catch {
      toast.error("Failed to copy wikitext");
    }
  };

  const copyContestLink = () => {
    setIsShareDialogOpen(true);
  };

  if (contestLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Link Skeleton */}
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
          <Skeleton className="h-3.5 w-24 rounded" />
        </div>

        {/* 1. Header Overview Card Skeleton */}
        <Card className="mb-6 shadow-2xs border-border/80">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2 w-full max-w-2xl">
                {/* Status Badge & Wiki Pill */}
                <div className="flex items-center gap-2 mb-1.5">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-5 w-28 rounded-md" />
                </div>

                {/* Title */}
                <Skeleton className="h-8 w-3/4 max-w-md rounded-md" />

                {/* Description */}
                <div className="space-y-1.5 pt-1">
                  <Skeleton className="h-3.5 w-full max-w-xl rounded" />
                  <Skeleton className="h-3.5 w-2/3 max-w-md rounded" />
                </div>

                {/* Jury Roster Skeleton */}
                <div className="flex items-center gap-1.5 pt-1">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-28 rounded-full" />
                </div>
              </div>

              {/* Action Buttons Skeleton */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                <Skeleton className="h-8 w-28 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </CardHeader>

          {/* Integrated Metrics Grid Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border/60 divide-y sm:divide-y-0 sm:divide-x divide-border/60 bg-muted/10">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-6 w-12 rounded" />
                </div>
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
            ))}
          </div>

          {/* Timeline & Metadata Footer */}
          <CardContent className="pt-3 border-t border-border/60">
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
                <Skeleton className="h-3.5 w-48 rounded" />
                <Skeleton className="h-3.5 w-32 rounded" />
              </div>
              <Skeleton className="w-full h-1.5 rounded-full" />
            </div>
          </CardContent>
        </Card>

        {/* 3. Multi-Tab Workspace Skeleton */}
        <div className="w-full space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-2">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-8 w-28 rounded-md" />
              <Skeleton className="h-8 w-28 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>

          <Card className="border-border shadow-2xs overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/20 py-3 px-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-36 rounded" />
                <Skeleton className="h-8 w-48 rounded-md" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop Table View Skeleton */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-16 text-center text-xs">#</TableHead>
                      <TableHead className="text-xs">User</TableHead>
                      <TableHead className="text-right text-xs">Accepted</TableHead>
                      <TableHead className="text-right text-xs">Total Words</TableHead>
                      <TableHead className="text-right text-xs">Total Bytes</TableHead>
                      <TableHead className="text-right text-xs">Total Submissions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3, 4, 5, 6].map((row) => (
                      <TableRow key={row} className="hover:bg-transparent">
                        <TableCell className="text-center">
                          <Skeleton className="h-4 w-6 mx-auto rounded" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <Skeleton className="h-4 w-28 rounded" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-4 w-10 ml-auto rounded" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-4 w-14 ml-auto rounded" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-4 w-14 ml-auto rounded" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-4 w-10 ml-auto rounded" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View Skeleton */}
              <div className="sm:hidden divide-y divide-border/60">
                {[1, 2, 3, 4].map((row) => (
                  <div key={row} className="p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-6 rounded" />
                        <Skeleton className="h-4 w-28 rounded" />
                      </div>
                      <Skeleton className="h-4 w-12 rounded" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Skeleton className="h-8 rounded" />
                      <Skeleton className="h-8 rounded" />
                      <Skeleton className="h-8 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
        {t("feather-nav-back-contests")}
      </Link>

      {/* Parent Campaign Banner (for Local Sub-Contests) */}
      {contest.parent_contest_id && (
        <div className="mb-5 p-3 sm:px-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary shrink-0">
              <Layers className="h-4 w-4" />
            </span>
            <div>
              <div className="text-muted-foreground text-[11px]">
                {t("feather-campaign-part-of", contest.parent_contest_name || "Campaign")}
              </div>
              <Link
                href={`/contests/${contest.parent_contest_code}`}
                className="font-semibold text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
              >
                <span>{t("feather-campaign-view-central")}</span>
                <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </div>
          </div>

          {contest.sub_contests && contest.sub_contests.length > 0 && (
            <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
              <span className="text-[11px] text-muted-foreground font-medium">{t("feather-campaign-switch-community")}:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {contest.sub_contests.map((sister) => {
                  const sInfo = getWikiInfo(sister.wiki_dbname);
                  const sisterDisplayName = sister.name.includes("???")
                    ? `${contest.name} (${sInfo?.nativeName || sInfo?.englishName || sister.wiki_dbname})`
                    : sister.name;
                  return (
                    <Link
                      key={sister.code}
                      href={`/contests/${sister.code}`}
                      className="px-2 py-0.5 rounded-md border border-border bg-card hover:bg-muted/80 text-[11px] font-medium font-mono text-foreground transition-colors cursor-pointer"
                      title={sisterDisplayName}
                    >
                      {sister.wiki_lang || sister.wiki_dbname}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Approval Banner */}
      {contest.status === "pending_approval" && (
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-semibold block mb-0.5">Pending Administrator Review</strong>
              {t("feather-contest-pending-approval-banner")}
            </div>
          </div>
          {isOwner && (
            <Button
              size="sm"
              disabled={isApproving}
              onClick={handleQuickApprove}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{t("feather-contest-pending-approval-action")}</span>
            </Button>
          )}
        </div>
      )}

      {/* 1. Header Overview Card */}
      <Card className="mb-6 shadow-sm border-border/80 bg-gradient-to-b from-card via-card to-card/60 backdrop-blur-xs overflow-hidden relative">
        <CardHeader className="p-4 sm:p-6 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            <div className="space-y-3 flex-1 min-w-0">
              {/* Status Indicator Badge & Wiki Pill Row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Indicator Badge */}
                {(() => {
                  const isPending = contest.status === "pending_approval";
                  const isDraft = contest.status === "draft";
                  const isEnded = contest.status === "ended" || countdownInfo.isEnded;
                  const isUpcoming = isActive && countdownInfo.isUpcoming;

                  let label = contest.status;
                  if (isUpcoming) label = t("feather-contest-status-upcoming");
                  else if (isActive) label = t("feather-contest-status-active");
                  else if (isPending) label = t("feather-contest-status-pending-approval");
                  else if (isDraft) label = t("feather-contest-status-draft");
                  else if (isEnded) label = t("feather-contest-status-ended");

                  let badgeClass = "bg-muted/40 text-muted-foreground border-border/60";
                  let dotEl = <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 shrink-0" />;

                  if (isUpcoming) {
                    badgeClass = "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25";
                    dotEl = (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                      </span>
                    );
                  } else if (isActive) {
                    badgeClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
                    dotEl = (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    );
                  } else if (isPending) {
                    badgeClass = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25";
                    dotEl = (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                      </span>
                    );
                  } else if (isDraft) {
                    badgeClass = "bg-muted/60 text-muted-foreground border-border/70";
                    dotEl = <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />;
                  }

                  return (
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border shrink-0 whitespace-nowrap ${badgeClass}`}
                    >
                      {dotEl}
                      <span>{label}</span>
                    </div>
                  );
                })()}

                {contest.is_umbrella ? (
                  <>
                    <a
                      href={contest.onwiki_page_url ? getOnwikiPageLink(contest.onwiki_page_url, "https://meta.wikimedia.org") : "#communities"}
                      {...(contest.onwiki_page_url ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="text-xs text-foreground/90 flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-border/70 bg-muted/30 hover:bg-muted/60 transition-colors shrink-0 whitespace-nowrap font-medium cursor-pointer"
                      title={contest.onwiki_page_url ? `Meta-Wiki — ${contest.onwiki_page_url}` : t("feather-campaign-badge")}
                    >
                      <MetaWikiLogoIcon className="h-3.5 w-3.5 shrink-0" />
                      <span>{t("feather-campaign-badge")}</span>
                      {contest.onwiki_page_url && <ExternalLink className="h-2.5 w-2.5 opacity-60 ml-0.5" />}
                    </a>

                    {(contest.sub_contest_count || contest.sub_contests?.length) ? (
                      <a
                        href="#communities"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab("communities");
                          const el = document.getElementById("campaign-tabs");
                          el?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border shrink-0 whitespace-nowrap bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25 hover:bg-blue-500/20 transition-colors cursor-pointer"
                        title={t("feather-campaign-tab-communities")}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span>{t("feather-campaign-communities-count", contest.sub_contest_count || contest.sub_contests?.length || 0)}</span>
                      </a>
                    ) : null}
                  </>
                ) : (
                  (() => {
                    const pMeta = getProjectMeta(contest.wiki_dbname);
                    const pName = t(`feather-project-${pMeta.id}`) || (locale === "bn" ? pMeta.nativeName : pMeta.name);
                    const wikiInfo = getWikiInfo(contest.wiki_dbname);
                    const targetHref = getOnwikiPageLink(contest.onwiki_page_url, contest.wiki_url || `https://${contest.wiki_dbname}.org`);
                    return (
                      <a
                        href={targetHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer transition-colors px-2.5 py-0.5 rounded-md border border-border/70 bg-muted/30 hover:bg-muted/60"
                        title={contest.onwiki_page_url ? `${wikiInfo?.englishName || pMeta.name} — ${contest.onwiki_page_url}` : `${wikiInfo?.englishName || pMeta.name} (${contest.wiki_dbname})`}
                      >
                        <img
                          src={pMeta.icon}
                          alt=""
                          className="h-3.5 w-3.5 object-contain shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = "/icons/projects/wikipedia.svg";
                          }}
                        />
                        <span className="font-medium text-foreground">{pName}</span>
                        {contest.wiki_lang && (
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">
                            ({contest.wiki_lang})
                          </span>
                        )}
                        <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                      </a>
                    );
                  })()
                )}
              </div>

              {/* Contest Title */}
              <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                {contest.name}
              </CardTitle>

              {/* Description */}
              <CardDescription className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                {contest.description || "No description provided."}
              </CardDescription>

              {/* Jury Members Roster */}
              {contest.juries && contest.juries.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1.5 text-xs">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{contest.is_umbrella ? t("feather-campaign-tab-organizers") : t("feather-contest-tab-juries")}:</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {contest.juries.map((juryName) => (
                      <Link
                        key={juryName}
                        href={`/contests/${code}/users/${juryName}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted/60 hover:bg-muted text-foreground border border-border/70 hover:border-border transition-colors font-medium text-xs group"
                        title={juryName}
                      >
                        <span className="h-4 w-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                          {juryName.charAt(0)}
                        </span>
                        <span className="font-mono text-xs">{juryName}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-2.5 shrink-0 w-full sm:w-auto">
              {/* Primary User Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {contest.status !== "pending_approval" ? (
                  <Link
                    href={`/contests/${code}/submit`}
                    className={buttonVariants({
                      variant: "default",
                      size: "default",
                      className:
                        "flex-1 sm:flex-none gap-2 cursor-pointer font-semibold shadow-xs text-xs sm:text-sm px-4 py-2",
                    })}
                  >
                    <Upload className="h-4 w-4" />
                    <span>{t("feather-contest-action-submit")}</span>
                  </Link>
                ) : (
                  <Button
                    disabled
                    variant="outline"
                    className="flex-1 sm:flex-none gap-1.5 text-xs text-muted-foreground opacity-60 cursor-not-allowed"
                    title={t("feather-contest-pending-approval-banner")}
                  >
                    <Upload className="h-4 w-4" />
                    <span>{t("feather-contest-action-submit")}</span>
                  </Button>
                )}

                {/* Share Button (Opens dedicated Share & Link Preview Dialog) */}
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setIsShareDialogOpen(true)}
                  className="gap-2 cursor-pointer font-medium text-xs sm:text-sm px-3.5 shadow-2xs hover:bg-muted/80"
                  title={t("feather-contest-share-btn")}
                >
                  <Share2 className="h-4 w-4 text-primary" />
                  <span>{t("feather-contest-share-btn")}</span>
                </Button>

                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setActiveTab("chat")}
                  className="gap-2 cursor-pointer font-medium text-xs sm:text-sm px-3.5 shadow-2xs hover:bg-muted/80"
                  title={t("feather-chat-title")}
                >
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span>{t("feather-chat-title")}</span>
                </Button>
              </div>

              {/* Organizer & Jury Quick Tools */}
              {(isJuryOrOrganizer || isOrganizer) && (
                <div className="flex items-center gap-1.5 pt-1 lg:pt-0 w-full sm:w-auto justify-start lg:justify-end border-t lg:border-t-0 border-border/50">
                  {contest.is_umbrella && canManageCampaign && (
                    <Button
                      onClick={() => setIsAddCommunityOpen(true)}
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 cursor-pointer font-medium text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground border border-border/50 hover:bg-muted/60"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{t("feather-campaign-add-community")}</span>
                    </Button>
                  )}

                  {!contest.is_umbrella && isJuryOrOrganizer && (
                    <Link
                      href={`/contests/${code}/review`}
                      className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                        className:
                          "gap-1.5 cursor-pointer font-medium text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground border border-border/50 hover:bg-muted/60",
                      })}
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{t("feather-contest-action-review")}</span>
                    </Link>
                  )}

                  {!contest.is_umbrella && isJuryOrOrganizer && (
                    <Link
                      href={`/contests/${code}/jury`}
                      className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                        className:
                          "gap-1.5 cursor-pointer font-medium text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground border border-border/50 hover:bg-muted/60",
                      })}
                      title={t("feather-contest-action-jury-stats")}
                    >
                      <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
                      <span>{t("feather-contest-action-jury-stats")}</span>
                    </Link>
                  )}

                  <Link
                    href={`/contests/${code}/stats`}
                    className={buttonVariants({
                      variant: "ghost",
                      size: "sm",
                      className:
                        "gap-1.5 cursor-pointer font-medium text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground border border-border/50 hover:bg-muted/60",
                    })}
                    title={t("feather-contest-tab-stats")}
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span>{t("feather-contest-tab-stats")}</span>
                  </Link>

                  {isOrganizer && (
                    <Link
                      href={`/contests/${code}/settings`}
                      className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                        className: "gap-1.5 cursor-pointer font-medium text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground border border-border/50 hover:bg-muted/60",
                      })}
                      title={t("feather-contest-tab-settings")}
                    >
                      <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{t("feather-contest-tab-settings")}</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Integrated Metric Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border/60 divide-y sm:divide-y-0 sm:divide-x divide-border/60 bg-muted/15">
          {/* 1. Submitted / Communities */}
          <div className="p-3.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-muted/25 transition-colors">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {contest.is_umbrella ? t("feather-campaign-stat-communities") : t("feather-contest-submitted")}
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono mt-0.5">
                {n(
                  contest.is_umbrella
                    ? contest.sub_contest_count || contest.sub_contests?.length || 0
                    : contest.total_articles || 0
                )}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
              {contest.is_umbrella ? <Layers className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            </div>
          </div>

          {/* 2. Accepted / Submissions */}
          <div className="p-3.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-muted/25 transition-colors">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {contest.is_umbrella ? t("feather-campaign-stat-submissions") : t("feather-contest-accepted")}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${
                    contest.is_umbrella ? "text-foreground" : "text-emerald-500 dark:text-emerald-400"
                  }`}
                >
                  {n(contest.is_umbrella ? contest.total_articles || 0 : contest.accepted_articles || 0)}
                </span>
                {!contest.is_umbrella && contest.total_articles ? (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                    {n(acceptanceRate)}%
                  </span>
                ) : null}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          {/* 3. Pending / Accepted */}
          <div className="p-3.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-muted/25 transition-colors">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {contest.is_umbrella ? t("feather-campaign-stat-accepted") : t("feather-contest-pending")}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${
                    contest.is_umbrella
                      ? "text-emerald-500 dark:text-emerald-400"
                      : "text-amber-500 dark:text-amber-400"
                  }`}
                >
                  {n(
                    contest.is_umbrella
                      ? contest.accepted_articles || 0
                      : contest.pending_articles || 0
                  )}
                </span>
                {contest.is_umbrella && contest.total_articles ? (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                    {n(acceptanceRate)}%
                  </span>
                ) : null}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          {/* 4. Participants */}
          <div className="p-3.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-muted/25 transition-colors">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {contest.is_umbrella ? t("feather-campaign-stat-participants") : t("feather-contest-participants")}
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono mt-0.5">
                {n(standings?.length || 0)}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20 shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Timeline & Metadata Footer */}
        <CardContent className="pt-3 pb-4 sm:pb-5 px-4 sm:px-6 border-t border-border/60 bg-muted/15">
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
              <div className="flex items-center gap-2 font-medium">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold text-foreground/90 font-mono">
                  {formatDateDDMMYYYY(contest.start_date)} — {formatDateDDMMYYYY(contest.end_date)}
                </span>
                {contest.wiki_tz && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                    {contest.wiki_tz}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2 shrink-0">
                  {!countdownInfo.isEnded && (
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        countdownInfo.isUpcoming ? "bg-blue-400" : "bg-emerald-400"
                      }`}
                    />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      countdownInfo.isEnded
                        ? "bg-muted-foreground"
                        : countdownInfo.isUpcoming
                        ? "bg-blue-500"
                        : "bg-emerald-500"
                    }`}
                  />
                </span>
                <span className="font-semibold text-foreground font-mono text-xs">{countdownInfo.text}</span>
                <span className="text-muted-foreground/60">·</span>
                <span>{t("feather-contest-timeline-progress", countdownInfo.percent)}</span>
              </div>
            </div>

            {/* Visual Timeline Progress Bar */}
            <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  countdownInfo.isEnded
                    ? "bg-muted-foreground"
                    : "bg-gradient-to-r from-blue-500 via-primary to-emerald-500"
                }`}
                style={{ width: `${countdownInfo.percent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Contest & Link Preview Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary shrink-0" />
              <span>{t("feather-contest-share-modal-title")}</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t("feather-contest-share-modal-desc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* 1. Realistic Social Link Preview Card Mockup */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>{t("feather-contest-share-preview-card-title")}</span>
                <span className="text-[10px] font-mono lowercase opacity-70">1200 × 630</span>
              </div>

              <div className="rounded-xl border border-border/80 bg-zinc-950 overflow-hidden shadow-md">
                {/* Visual OG Banner Canvas */}
                <div className="relative p-5 sm:p-6 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 border-b border-border/60 overflow-hidden min-h-[170px] flex flex-col justify-between">
                  {/* Subtle decorative glow circles */}
                  <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-blue-500/15 blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-12 -left-8 w-44 h-44 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />

                  {/* Brand & Pills Header */}
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                        F
                      </div>
                      <span className="font-extrabold text-white text-sm tracking-tight">Feather</span>
                      <span className="text-[11px] text-zinc-400 hidden sm:inline">• Wikimedia Contest</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-semibold">
                        {contest.wiki_dbname || "WIKIPEDIA"}
                      </span>
                      <span
                        className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          contest.status === "active"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                        }`}
                      >
                        {contest.status === "active" ? "ACTIVE" : contest.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description in Canvas */}
                  <div className="relative z-10 my-3 space-y-1">
                    <h3 className="text-base sm:text-xl font-extrabold text-white tracking-tight line-clamp-2 leading-snug">
                      {contest.name}
                    </h3>
                    {contest.description && (
                      <p className="text-xs text-zinc-400 line-clamp-1 leading-normal">
                        {contest.description}
                      </p>
                    )}
                  </div>

                  {/* Bottom Strip */}
                  <div className="relative z-10 flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800/80 font-mono">
                    <span className="text-[11px] inline-flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-zinc-400" />
                      <span>{formatDateDDMMYYYY(contest.start_date)} — {formatDateDDMMYYYY(contest.end_date)}</span>
                    </span>
                    <span className="text-[11px] text-zinc-300 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700">
                      {n(contest.total_articles || 0)} {locale === "bn" ? "নিবন্ধ" : "articles"}
                    </span>
                  </div>
                </div>

                {/* Social Card Info Strip (URL + Meta snippet) */}
                <div className="p-3 bg-zinc-900/90 text-xs space-y-0.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/80">
                    feather.toolforge.org
                  </div>
                  <div className="font-bold text-foreground text-xs sm:text-sm line-clamp-1">
                    {contest.name} — Feather
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-1">
                    {contest.description || "Wikimedia Article Contest Dashboard"}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Quick Copy URL Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {t("feather-contest-share-url-label")}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="font-mono text-xs bg-muted/40 selection:bg-primary/20"
                />
                <Button
                  onClick={handleCopyShareLink}
                  size="sm"
                  className="gap-1.5 shrink-0 cursor-pointer font-medium"
                >
                  {copiedShareLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedShareLink ? t("feather-contest-share-copied") : t("feather-contest-share-copy-btn")}</span>
                </Button>
              </div>
            </div>

            {/* 3. Direct 1-Click Social Sharing */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                {t("feather-contest-share-socials-label")}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* WhatsApp */}
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border/80 bg-card hover:bg-emerald-500/10 hover:border-emerald-500/40 text-xs font-medium text-foreground hover:text-emerald-500 transition-all cursor-pointer shadow-2xs"
                >
                  <svg className="h-4 w-4 fill-current text-emerald-500" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.777.72 2.791.72 3.181 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.768-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.392-10.416c-4.281 0-7.763 3.482-7.763 7.763 0 1.488.423 2.88 1.157 4.067l-1.225 4.475 4.59-1.204c1.139.689 2.476 1.085 3.901 1.085 4.281 0 7.763-3.482 7.763-7.763 0-4.281-3.482-7.763-7.763-7.763z" />
                  </svg>
                  <span>{t("feather-contest-share-whatsapp")}</span>
                </a>

                {/* Telegram */}
                <a
                  href={telegramShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border/80 bg-card hover:bg-sky-500/10 hover:border-sky-500/40 text-xs font-medium text-foreground hover:text-sky-500 transition-all cursor-pointer shadow-2xs"
                >
                  <svg className="h-4 w-4 fill-current text-sky-500" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                  <span>{t("feather-contest-share-telegram")}</span>
                </a>

                {/* X / Twitter */}
                <a
                  href={twitterShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border/80 bg-card hover:bg-foreground/5 hover:border-foreground/30 text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>{t("feather-contest-share-twitter")}</span>
                </a>

                {/* Facebook */}
                <a
                  href={facebookShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border/80 bg-card hover:bg-blue-600/10 hover:border-blue-600/40 text-xs font-medium text-foreground hover:text-blue-600 transition-all cursor-pointer shadow-2xs"
                >
                  <svg className="h-4 w-4 fill-current text-blue-600" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>{t("feather-contest-share-facebook")}</span>
                </a>
              </div>
            </div>

            {/* 4. Wikipedia Wikitext Announcement Snippet */}
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileCode className="h-3.5 w-3.5 text-primary" />
                  <span>{t("feather-contest-share-wikitext-tab")}</span>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyWikitextAnnouncement}
                  className="h-7 text-xs gap-1.5 cursor-pointer font-medium"
                >
                  {copiedWikitextAnnouncement ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedWikitextAnnouncement ? t("feather-contest-share-wikitext-copied") : t("feather-contest-share-wikitext-copy")}</span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t("feather-contest-share-wikitext-desc")}
              </p>
              <pre className="p-3 rounded-lg bg-muted/50 border border-border/80 text-[11px] font-mono leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto select-all text-foreground/90">
                {wikitextAnnouncement}
              </pre>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareDialogOpen(false)}
              className="cursor-pointer"
            >
              {t("feather-modal-close") || "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Judging Progress & Throughput Breakdown Card */}
      {!contest.is_umbrella && judgingProgress.totalJudgeable > 0 && (
        <Card className="border-border shadow-2xs mb-6 sm:mb-8 overflow-hidden bg-card/60">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <CheckCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    {t("feather-contest-progress-title")}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    {t(
                      "feather-contest-progress-desc",
                      n(judgingProgress.reviewed),
                      n(judgingProgress.totalJudgeable),
                      n(judgingProgress.percent)
                    )}
                  </p>
                </div>
              </div>

              {/* Progress Percentage Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  className="font-mono text-xs font-semibold px-2.5 py-0.5 border-primary/30 text-primary bg-primary/5"
                >
                  {n(judgingProgress.percent)}% {t("feather-contest-progress-reviewed")}
                </Badge>
              </div>
            </div>

            {/* Segmented Multi-Color Progress Bar */}
            <div className="w-full bg-muted/60 rounded-full h-2.5 overflow-hidden flex shadow-inner">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${judgingProgress.acceptedPct}%` }}
                title={`Accepted: ${judgingProgress.accepted} (${Math.round(judgingProgress.acceptedPct)}%)`}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${judgingProgress.rejectedPct}%` }}
                title={`Rejected: ${judgingProgress.rejected} (${Math.round(judgingProgress.rejectedPct)}%)`}
              />
              <div
                className="bg-amber-400/40 dark:bg-amber-500/30 h-full transition-all duration-500"
                style={{ width: `${judgingProgress.pendingPct}%` }}
                title={`Pending: ${judgingProgress.pending} (${Math.round(judgingProgress.pendingPct)}%)`}
              />
            </div>

            {/* Micro Breakdown Legend Pills */}
            <div className="flex items-center gap-3 sm:gap-4 mt-3 text-xs flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-muted-foreground">{t("feather-contest-filter-accepted")}:</span>
                <span className="font-semibold text-foreground font-mono">{n(judgingProgress.accepted)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">({Math.round(judgingProgress.acceptedPct)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                <span className="text-muted-foreground">{t("feather-contest-filter-rejected")}:</span>
                <span className="font-semibold text-foreground font-mono">{n(judgingProgress.rejected)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">({Math.round(judgingProgress.rejectedPct)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-500 shrink-0" />
                <span className="text-muted-foreground">{t("feather-contest-filter-pending")}:</span>
                <span className="font-semibold text-foreground font-mono">{n(judgingProgress.pending)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">({Math.round(judgingProgress.pendingPct)}%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Multi-Tab Workspace */}
      <Tabs value={activeTab || (contest.is_umbrella ? "communities" : "standings")} onValueChange={setActiveTab} className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-2">
          {/* Horizontally scrollable tabs on mobile without scrollbar */}
          <div className="w-full sm:w-auto overflow-x-auto no-scrollbar py-0.5">
            <TabsList className="bg-muted/60 p-1 h-auto min-h-9 flex-nowrap inline-flex w-max shrink-0 gap-1">
              {contest.is_umbrella && (
                <TabsTrigger value="communities" className="gap-1.5 text-xs cursor-pointer font-medium shrink-0 whitespace-nowrap px-3 py-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  <span>{t("feather-campaign-tab-communities")}</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded-xs bg-muted text-[10px] font-mono">
                    {contest.sub_contest_count || contest.sub_contests?.length || 0}
                  </span>
                </TabsTrigger>
              )}
              <TabsTrigger value="standings" className="gap-1.5 text-xs cursor-pointer font-medium shrink-0 whitespace-nowrap px-3 py-1.5">
                <Trophy className="h-3.5 w-3.5" />
                <span>{contest.is_umbrella ? t("feather-campaign-tab-leaderboard") : t("feather-contest-tab-standings")}</span>
              </TabsTrigger>
              <TabsTrigger value="submissions" className="gap-1.5 text-xs cursor-pointer font-medium shrink-0 whitespace-nowrap px-3 py-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span>{contest.is_umbrella ? t("feather-campaign-tab-submissions") : t("feather-contest-tab-submissions")}</span>
                {contest.total_articles ? (
                  <span className="ml-1 px-1.5 py-0.2 rounded-xs bg-muted text-[10px] font-mono">
                    {contest.total_articles}
                  </span>
                ) : null}
              </TabsTrigger>
              {!contest.is_umbrella && (
                <TabsTrigger value="rules" className="gap-1.5 text-xs cursor-pointer font-medium shrink-0 whitespace-nowrap px-3 py-1.5">
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t("feather-contest-tab-rules")}
                </TabsTrigger>
              )}
              <TabsTrigger value="juries" className="gap-1.5 text-xs cursor-pointer font-medium shrink-0 whitespace-nowrap px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{contest.is_umbrella ? t("feather-campaign-tab-organizers") : t("feather-contest-tab-juries")}</span>
                {contest.juries && contest.juries.length > 0 ? (
                  <span className="ml-1 px-1.5 py-0.2 rounded-xs bg-muted text-[10px] font-mono">
                    {contest.juries.length}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-1.5 text-xs cursor-pointer font-medium shrink-0 whitespace-nowrap px-3 py-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <span>{t("feather-chat-title")}</span>
              </TabsTrigger>
              <Link
                href={`/contests/${code}/stats`}
                className="inline-flex items-center gap-1.5 text-xs cursor-pointer font-medium shrink-0 whitespace-nowrap px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                title={t("feather-contest-tab-stats")}
              >
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span>{t("feather-contest-tab-stats")}</span>
              </Link>
              {isOrganizer && (
                <Link
                  href={`/contests/${code}/settings`}
                  className="inline-flex items-center gap-1.5 text-xs cursor-pointer font-medium shrink-0 whitespace-nowrap px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  title={t("feather-contest-tab-settings")}
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>{t("feather-contest-tab-settings")}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </Link>
              )}
            </TabsList>
          </div>

          {/* Standings Export Modal Suite (Wikitext, CSV, JSON, Summary/Detailed) */}
          <div className="flex items-center justify-end sm:justify-start shrink-0">
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
              <DialogTrigger
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "gap-1.5 text-xs font-medium cursor-pointer h-8 shadow-2xs",
                })}
              >
                <Download className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{t("feather-contest-export-results")}</span>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-primary" />
                    <span>{t("feather-contest-export-results")}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {t("feather-contest-export-wikitext-desc")}
                  </DialogDescription>
                </DialogHeader>

                {/* Mode Selector (Summary vs Detailed) */}
                <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-2.5 pt-1">
                  <span className="text-xs font-medium text-foreground">
                    {t("feather-contest-export-mode")}:
                  </span>
                  <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
                    <button
                      type="button"
                      onClick={() => setExportMode("summary")}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                        exportMode === "summary"
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("feather-contest-export-summary")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportMode("detailed")}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                        exportMode === "detailed"
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("feather-contest-export-detailed")}
                    </button>
                  </div>
                </div>

                {/* Live Wikitext Preview */}
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>MediaWiki Wikitable Preview:</span>
                    <span className="font-mono text-[10px] uppercase">
                      {exportMode === "detailed" ? "Detailed Mode" : "Summary Mode"}
                    </span>
                  </div>
                  <textarea
                    readOnly
                    value={wikitextTable}
                    rows={8}
                    className="w-full rounded-md border border-border bg-muted/40 p-3 font-mono text-xs text-foreground focus-visible:outline-hidden"
                  />
                </div>

                {/* Direct File Download Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-border/60">
                  <Button
                    onClick={handleDownloadWikitext}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs font-medium cursor-pointer"
                  >
                    <FileCode className="h-3.5 w-3.5 text-primary" />
                    <span>{t("feather-contest-export-download-txt")}</span>
                  </Button>
                  <Button
                    onClick={handleDownloadCSV}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs font-medium cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{t("feather-contest-export-download-csv")}</span>
                  </Button>
                  <Button
                    onClick={handleDownloadJSON}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs font-medium cursor-pointer col-span-2 sm:col-span-1"
                  >
                    <FileText className="h-3.5 w-3.5 text-amber-500" />
                    <span>{t("feather-contest-export-download-json")}</span>
                  </Button>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
                  <Button
                    onClick={handleCopyWikitext}
                    size="sm"
                    className="gap-1.5 text-xs font-medium cursor-pointer"
                  >
                    {copiedExport ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{t("feather-contest-copy-wikitext")}</span>
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
        </div>

        {/* TAB: PARTICIPATING COMMUNITIES (CAMPAIGN DIRECTORY) */}
        {contest.is_umbrella && (
          <TabsContent value="communities" className="space-y-4 outline-hidden">
            <Card className="border-border shadow-2xs">
              <CardHeader className="border-b border-border bg-muted/20 py-3 px-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search communities or languages..."
                      value={communitySearch}
                      onChange={(e) => setCommunitySearch(e.target.value)}
                      className="pl-8 text-xs h-8 bg-background"
                    />
                  </div>

                  {canManageCampaign && (
                    <Dialog open={isAddCommunityOpen} onOpenChange={setIsAddCommunityOpen}>
                      <DialogTrigger
                      className={buttonVariants({
                        variant: "default",
                        size: "sm",
                        className: "gap-1.5 text-xs font-medium cursor-pointer self-start sm:self-auto",
                      })}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{t("feather-campaign-add-community")}</span>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl">
                      <DialogHeader>
                        <DialogTitle>{t("feather-campaign-add-community")}</DialogTitle>
                        <DialogDescription className="text-xs">
                          {t("feather-campaign-add-community-desc")}
                        </DialogDescription>
                      </DialogHeader>

                      {/* Modal Mode Switcher */}
                      <div className="flex border-b border-border/70 mt-1">
                        <button
                          type="button"
                          onClick={() => setAddCommunityMode("create")}
                          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 cursor-pointer transition-colors ${
                            addCommunityMode === "create"
                              ? "border-primary text-primary font-semibold"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{t("feather-campaign-modal-tab-create")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddCommunityMode("link")}
                          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 cursor-pointer transition-colors ${
                            addCommunityMode === "link"
                              ? "border-primary text-primary font-semibold"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          <span>{t("feather-campaign-modal-tab-link")}</span>
                        </button>
                      </div>

                      {addCommunityMode === "create" ? (
                        <form onSubmit={handleCreateSubContest} className="space-y-3.5 mt-2">
                          <WikiSelector
                            wikiDbName={newSubDbName}
                            wikiURL={newSubURL}
                            wikiLang={newSubLang}
                            label="Target Wikimedia Community *"
                            onChange={(data) => {
                              setNewSubDbName(data.dbname);
                              setNewSubURL(data.url);
                              setNewSubLang(data.lang);
                              if (!newSubName) {
                                setNewSubName(`${contest.name} - ${data.nativeName || data.dbname}`);
                              }
                            }}
                          />

                          <div>
                            <label className="text-xs font-medium text-foreground block mb-1">
                              Local Contest Name
                            </label>
                            <Input
                              placeholder={`${contest.name} - Bengali`}
                              value={newSubName}
                              onChange={(e) => setNewSubName(e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-foreground block mb-1">
                              {t("feather-create-min-words")} (Local)
                            </label>
                            <Input
                              type="number"
                              min={0}
                              value={newSubMinWords}
                              onChange={(e) => setNewSubMinWords(Number(e.target.value) || 0)}
                              className="text-xs h-8"
                            />
                          </div>

                          <div className="pt-2 border-t border-border/50">
                            <TalkTemplateBuilder
                              value={newSubTalkTemplate}
                              onChange={setNewSubTalkTemplate}
                            />
                          </div>

                          <div className="pt-1">
                            <UserTagInput
                              label="Local Juries"
                              value={newSubJuries}
                              onChange={setNewSubJuries}
                              wikiUrl={newSubURL}
                              placeholder="Type username and press Enter..."
                              compact
                              labelBg="bg-background"
                            />
                          </div>

                          <DialogFooter className="pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsAddCommunityOpen(false)}
                              className="text-xs cursor-pointer"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={isAddingSubContest}
                              className="text-xs cursor-pointer gap-1.5"
                            >
                              {isAddingSubContest && <Clock className="h-3.5 w-3.5 animate-spin" />}
                              <span>Add Community Edition</span>
                            </Button>
                          </DialogFooter>
                        </form>
                      ) : (
                        /* Link Existing Competition Tab */
                        <div className="space-y-3 mt-2">
                          <p className="text-xs text-muted-foreground">
                            {t("feather-campaign-link-select-label")}
                          </p>

                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder={t("feather-campaign-link-search-placeholder")}
                              value={existingSearchQuery}
                              onChange={(e) => setExistingSearchQuery(e.target.value)}
                              className="pl-8 text-xs h-8"
                            />
                          </div>

                          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-border/40">
                            {isLoadingAvailable ? (
                              <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                                <Clock className="h-4 w-4 animate-spin text-primary" />
                                <span>Loading standalone competitions...</span>
                              </div>
                            ) : !availableContests || availableContests.length === 0 ? (
                              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                                {t("feather-campaign-no-avail-contests")}
                              </div>
                            ) : (
                              availableContests.map((cCandidate) => {
                                const pMeta = getProjectMeta(cCandidate.wiki_dbname);
                                const wikiInfo = getWikiInfo(cCandidate.wiki_dbname);
                                const isCurrentAttaching = attachingContestId === cCandidate.id;
                                return (
                                  <div
                                    key={cCandidate.id}
                                    className="pt-2.5 pb-2.5 first:pt-0 flex items-center justify-between gap-3"
                                  >
                                    <div className="space-y-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <h5 className="font-semibold text-xs text-foreground truncate">
                                          {cCandidate.name}
                                        </h5>
                                        <Badge variant="outline" className="text-[10px] font-mono px-1 py-0">
                                          {cCandidate.code}
                                        </Badge>
                                      </div>

                                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <img
                                            src={pMeta.icon}
                                            alt=""
                                            className="h-3 w-3 object-contain shrink-0"
                                            onError={(e) => {
                                              e.currentTarget.src = "/icons/projects/wikipedia.svg";
                                            }}
                                          />
                                          <span>{wikiInfo?.nativeName || pMeta.name}</span>
                                          <span className="font-mono uppercase text-[10px]">
                                            ({cCandidate.wiki_lang})
                                          </span>
                                        </span>
                                        <span>•</span>
                                        <span>{cCandidate.total_articles} articles</span>
                                      </div>
                                    </div>

                                    <Button
                                      size="sm"
                                      disabled={isAttaching}
                                      onClick={() => handleAttachContest(cCandidate.id)}
                                      className="text-xs h-7 px-2.5 gap-1.5 shrink-0 cursor-pointer shadow-none"
                                    >
                                      {isCurrentAttaching ? (
                                        <Clock className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Link2 className="h-3.5 w-3.5" />
                                      )}
                                      <span>{t("feather-campaign-link-btn")}</span>
                                    </Button>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <DialogFooter className="pt-2 border-t border-border/60">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsAddCommunityOpen(false)}
                              className="text-xs cursor-pointer"
                            >
                              Close
                            </Button>
                          </DialogFooter>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4">
                {filteredSubContests.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No participating communities found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredSubContests.map((sub) => {
                      const pMeta = getProjectMeta(sub.wiki_dbname);
                      const isSubActive = sub.status === "active";
                      const wikiInfo = getWikiInfo(sub.wiki_dbname);
                      const subDisplayName = sub.name.includes("???")
                        ? `${contest.name} (${wikiInfo?.nativeName || wikiInfo?.englishName || sub.wiki_dbname})`
                        : sub.name;
                      return (
                        <div
                          key={sub.code}
                          className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:shadow-xs hover:border-border transition-all flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <img
                                  src={pMeta.icon}
                                  alt=""
                                  className="h-5 w-5 object-contain shrink-0"
                                  onError={(e) => {
                                    e.currentTarget.src = "/icons/projects/wikipedia.svg";
                                  }}
                                />
                                <div>
                                  <h4 className="font-semibold text-sm text-foreground leading-tight">
                                    {subDisplayName}
                                  </h4>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                                      {sub.wiki_dbname}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                                      ({sub.wiki_lang})
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium border shrink-0 whitespace-nowrap ${
                                    isSubActive
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                                      : "bg-muted/40 text-muted-foreground border-border/60"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                      isSubActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/60"
                                    }`}
                                  />
                                  <span>{isSubActive ? t("feather-contest-status-active") : sub.status}</span>
                                </div>
                                {canManageCampaign && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDetachContest(sub.id)}
                                    disabled={isDetaching === sub.id}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                                    title={t("feather-campaign-detach-btn")}
                                  >
                                    {isDetaching === sub.id ? (
                                      <Clock className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Unlink className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Local Rules Pills */}
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground pt-1">
                              {showWords && sub.min_words > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-muted/60 border border-border/60">
                                  Min {sub.min_words} words
                                </span>
                              )}
                              {showBytes && sub.min_bytes > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-muted/60 border border-border/60">
                                  Min {sub.min_bytes} bytes
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-md bg-muted/30 border border-border/40 text-[10px]">
                                {t("feather-campaign-local-rules-custom")}
                              </span>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-center">
                              <div className="p-1.5 rounded-md bg-muted/30">
                                <div className="text-xs font-bold text-foreground">{sub.total_articles}</div>
                                <div className="text-[10px] text-muted-foreground">Articles</div>
                              </div>
                              <div className="p-1.5 rounded-md bg-emerald-500/5">
                                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  {sub.accepted_articles}
                                </div>
                                <div className="text-[10px] text-muted-foreground">Accepted</div>
                              </div>
                              <div className="p-1.5 rounded-md bg-muted/30">
                                <div className="text-xs font-bold text-foreground">{sub.total_submitters}</div>
                                <div className="text-[10px] text-muted-foreground">Users</div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-border/60">
                            <Link
                              href={`/contests/${sub.code}`}
                              className={buttonVariants({
                                variant: "outline",
                                size: "sm",
                                className: "w-full h-8 text-xs font-medium cursor-pointer justify-center gap-1.5 px-2.5 shadow-2xs whitespace-nowrap",
                              })}
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{t("feather-campaign-open-local")}</span>
                            </Link>
                            <Link
                              href={`/contests/${sub.code}/submit`}
                              className={buttonVariants({
                                variant: "default",
                                size: "sm",
                                className: "w-full h-8 text-xs font-medium cursor-pointer justify-center gap-1.5 px-2.5 shadow-none whitespace-nowrap",
                              })}
                            >
                              <Upload className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{t("feather-campaign-submit-local")}</span>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

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

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {contest.is_umbrella && contest.sub_contests && contest.sub_contests.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={communityFilter}
                        onChange={(e) => setCommunityFilter(e.target.value)}
                        className="h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                      >
                        <option value="all">{t("feather-campaign-all-communities")}</option>
                        {contest.sub_contests.map((sub) => {
                          const wikiInfo = getWikiInfo(sub.wiki_dbname);
                          const subDisplayName = sub.name.includes("???")
                            ? `${contest.name} (${wikiInfo?.nativeName || wikiInfo?.englishName || sub.wiki_dbname})`
                            : sub.name;
                          return (
                            <option key={sub.wiki_dbname} value={sub.wiki_dbname}>
                              {subDisplayName} ({sub.wiki_dbname})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

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
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {standingsLoading ? (
                <>
                  {/* Desktop Table View Skeleton */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-16 text-center text-xs">{t("feather-standings-col-rank")}</TableHead>
                          <TableHead className="text-xs">{t("feather-standings-col-user")}</TableHead>
                          {contest.is_umbrella && (
                            <TableHead className="text-xs">{t("feather-campaign-wikis-contributed")}</TableHead>
                          )}
                          <TableHead className="text-right text-xs">{t("feather-standings-col-accepted")}</TableHead>
                          {showWords && <TableHead className="text-right text-xs">{t("feather-standings-col-words")}</TableHead>}
                          {showBytes && <TableHead className="text-right text-xs">{t("feather-standings-col-bytes")}</TableHead>}
                          <TableHead className="text-right text-xs">{t("feather-standings-col-submitted")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[1, 2, 3, 4, 5, 6, 7].map((row) => (
                          <TableRow key={row} className="hover:bg-transparent">
                            <TableCell className="text-center">
                              <Skeleton className="h-4 w-6 mx-auto rounded" />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-6 w-6 rounded-full" />
                                <Skeleton className="h-4 w-28 rounded" />
                              </div>
                            </TableCell>
                            {contest.is_umbrella && (
                              <TableCell>
                                <Skeleton className="h-4 w-20 rounded" />
                              </TableCell>
                            )}
                            <TableCell className="text-right">
                              <Skeleton className="h-4 w-10 ml-auto rounded" />
                            </TableCell>
                            {showWords && (
                              <TableCell className="text-right">
                                <Skeleton className="h-4 w-14 ml-auto rounded" />
                              </TableCell>
                            )}
                            {showBytes && (
                              <TableCell className="text-right">
                                <Skeleton className="h-4 w-14 ml-auto rounded" />
                              </TableCell>
                            )}
                            <TableCell className="text-right">
                              <Skeleton className="h-4 w-10 ml-auto rounded" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile View Skeleton (< sm) */}
                  <div className="sm:hidden divide-y divide-border/60">
                    {[1, 2, 3, 4].map((row) => (
                      <div key={row} className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-6 rounded" />
                            <Skeleton className="h-4 w-28 rounded" />
                          </div>
                          <Skeleton className="h-4 w-12 rounded" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Skeleton className="h-8 rounded" />
                          <Skeleton className="h-8 rounded" />
                          <Skeleton className="h-8 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : filteredStandings && filteredStandings.length > 0 ? (
                <>
                  {/* Desktop Table View (>= sm) */}
                  <div className="hidden sm:block">
                    <Table className="table-fixed w-full">
                      <colgroup>
                        <col className="w-16" />
                        <col className="w-[35%] min-w-[140px]" />
                        {contest.is_umbrella && <col className="w-[15%]" />}
                        <col className="w-[100px]" />
                        {showWords && <col className="w-[95px]" />}
                        {showBytes && <col className="w-[95px]" />}
                        <col className="w-[105px]" />
                      </colgroup>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-16 text-center text-xs whitespace-nowrap">{t("feather-standings-col-rank")}</TableHead>
                          <TableHead className="text-xs truncate">{t("feather-standings-col-user")}</TableHead>
                          {contest.is_umbrella && (
                            <TableHead className="text-xs truncate">{t("feather-campaign-wikis-contributed")}</TableHead>
                          )}
                          <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-standings-col-accepted")}</TableHead>
                          {showWords && <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-standings-col-words")}</TableHead>}
                          {showBytes && <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-standings-col-bytes")}</TableHead>}
                          <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-standings-col-submitted")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStandings.map((s) => (
                          <TableRow key={s.username} className="transition-colors hover:bg-muted/40">
                            <TableCell className="text-center font-bold">
                              {s.rank === 1 ? (
                                <span className="inline-flex items-center justify-center gap-1 h-6 px-2 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/30 shadow-2xs">
                                  <Medal className="h-3.5 w-3.5 fill-amber-500/80 text-amber-600 dark:text-amber-400" />
                                  <span>1st</span>
                                </span>
                              ) : s.rank === 2 ? (
                                <span className="inline-flex items-center justify-center gap-1 h-6 px-2 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-300 dark:border-slate-700 shadow-2xs">
                                  <Medal className="h-3.5 w-3.5 fill-slate-400 text-slate-500" />
                                  <span>2nd</span>
                                </span>
                              ) : s.rank === 3 ? (
                                <span className="inline-flex items-center justify-center gap-1 h-6 px-2 rounded-md bg-amber-700/10 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold text-xs border border-amber-700/25 shadow-2xs">
                                  <Medal className="h-3.5 w-3.5 fill-amber-700/60 text-amber-700 dark:text-amber-400" />
                                  <span>3rd</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground font-mono text-xs">#{n(s.rank)}</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium text-foreground text-xs sm:text-sm">
                              <div className="inline-flex items-center gap-1.5">
                                <Link
                                  href={`/contests/${code}/users/${encodeURIComponent(s.username)}`}
                                  className="font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                                >
                                  {s.username}
                                </Link>
                                <UserBadge username={s.username} role={s.role} />
                                <a
                                  href={`${contest.wiki_url || "https://bn.wikipedia.org"}/wiki/Special:Contributions/${encodeURIComponent(
                                    s.username
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground/50 hover:text-foreground transition-colors"
                                  title="View contributions on wiki"
                                >
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              </div>
                            </TableCell>
                            {contest.is_umbrella && (
                              <TableCell className="text-xs">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {(s.wikis_contributed || []).map((w) => (
                                    <Badge key={w} variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                                      {w}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                              {n(s.accepted_count)}
                            </TableCell>
                            {showWords && (
                              <TableCell className="text-right font-mono text-xs">
                                {n(s.total_words)}
                              </TableCell>
                            )}
                            {showBytes && (
                              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                {n(s.total_bytes)}
                              </TableCell>
                            )}
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {n(s.submitted_count)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card List View (< sm) */}
                  <div className="sm:hidden divide-y divide-border/60">
                    {filteredStandings.map((s) => (
                      <div key={s.username} className="p-3.5 space-y-2 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {s.rank === 1 ? (
                              <span className="inline-flex items-center justify-center gap-1 h-6 px-1.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/30 shrink-0">
                                <Medal className="h-3.5 w-3.5 fill-amber-500/80 text-amber-600 dark:text-amber-400" />
                                <span>1st</span>
                              </span>
                            ) : s.rank === 2 ? (
                              <span className="inline-flex items-center justify-center gap-1 h-6 px-1.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-300 dark:border-slate-700 shrink-0">
                                <Medal className="h-3.5 w-3.5 fill-slate-400 text-slate-500" />
                                <span>2nd</span>
                              </span>
                            ) : s.rank === 3 ? (
                              <span className="inline-flex items-center justify-center gap-1 h-6 px-1.5 rounded-md bg-amber-700/10 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold text-xs border border-amber-700/25 shrink-0">
                                <Medal className="h-3.5 w-3.5 fill-amber-700/60 text-amber-700 dark:text-amber-400" />
                                <span>3rd</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-muted/50 text-muted-foreground font-mono text-xs shrink-0">
                                #{n(s.rank)}
                              </span>
                            )}
                            <Link
                              href={`/contests/${code}/users/${encodeURIComponent(s.username)}`}
                              className="font-semibold text-xs text-foreground hover:text-primary hover:underline truncate"
                            >
                              {s.username}
                            </Link>
                            <UserBadge username={s.username} role={s.role} />
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                              <CheckCircle2 className="h-3 w-3" />
                              {n(s.accepted_count)}
                            </span>
                          </div>
                        </div>

                        {contest.is_umbrella && s.wikis_contributed && s.wikis_contributed.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap ps-8">
                            {s.wikis_contributed.map((w) => (
                              <Badge key={w} variant="secondary" className="text-[10px] font-mono px-1 py-0">
                                {w}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground ps-8 pt-0.5">
                          {showWords && (
                            <span>
                              {t("feather-review-preview-words", s.total_words)}
                            </span>
                          )}
                          {showWords && showBytes && <span>·</span>}
                          {showBytes && (
                            <span>
                              {t("feather-review-preview-bytes", s.total_bytes)}
                            </span>
                          )}
                          <span>·</span>
                          <span>
                            <strong className="font-mono text-foreground">{n(s.submitted_count)}</strong> {t("feather-contest-submitted").toLowerCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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

                <div className="flex items-center gap-2 flex-wrap">
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

                  {/* Dual View Mode Toggle (List vs Grouped by Submitter) */}
                  <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSubmissionsViewMode("list")}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                        submissionsViewMode === "list"
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title={t("feather-contest-view-list")}
                    >
                      <List className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t("feather-contest-view-list")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmissionsViewMode("grouped")}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                        submissionsViewMode === "grouped"
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title={t("feather-contest-view-grouped")}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t("feather-contest-view-grouped")}</span>
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {articlesLoading ? (
                <>
                  {/* Desktop Table View Skeleton */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs">{t("feather-contest-col-article")}</TableHead>
                          <TableHead className="text-xs">{t("feather-contest-col-submitter")}</TableHead>
                          <TableHead className="text-center text-xs">{t("feather-contest-col-status")}</TableHead>
                          {showWords && <TableHead className="text-right text-xs">{t("feather-contest-col-words")}</TableHead>}
                          {showBytes && <TableHead className="text-right text-xs">{t("feather-contest-col-bytes")}</TableHead>}
                          <TableHead className="text-right text-xs">{t("feather-contest-col-date")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[1, 2, 3, 4, 5, 6, 7].map((row) => (
                          <TableRow key={row} className="hover:bg-transparent">
                            <TableCell>
                              <Skeleton className="h-4 w-40 rounded" />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                                <Skeleton className="h-3.5 w-24 rounded" />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Skeleton className="h-5 w-16 mx-auto rounded-full" />
                            </TableCell>
                            {showWords && (
                              <TableCell className="text-right">
                                <Skeleton className="h-3.5 w-12 ml-auto rounded" />
                              </TableCell>
                            )}
                            {showBytes && (
                              <TableCell className="text-right">
                                <Skeleton className="h-3.5 w-14 ml-auto rounded" />
                              </TableCell>
                            )}
                            <TableCell className="text-right">
                              <Skeleton className="h-3.5 w-20 ml-auto rounded" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile View Skeleton (< sm) */}
                  <div className="sm:hidden divide-y divide-border/60">
                    {[1, 2, 3, 4].map((row) => (
                      <div key={row} className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-36 rounded" />
                          <Skeleton className="h-4 w-16 rounded-full" />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <Skeleton className="h-3.5 w-24 rounded" />
                          <Skeleton className="h-3.5 w-16 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : submissionsViewMode === "grouped" ? (
                groupedSubmitters && groupedSubmitters.length > 0 ? (
                  <div>
                    {/* Submitter Quick Controls */}
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground px-4 py-3 border-b border-border/60 bg-muted/10">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground">
                          {n(groupedSubmitters.length)} {t("feather-contest-participants")}
                        </span>
                        <span>·</span>
                        <span>
                          {n(totalSubmissionsInGrouped)} {t("feather-contest-submitted").toLowerCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={expandAllSubmitters}
                          className="text-xs h-7 px-2 cursor-pointer"
                        >
                          {t("feather-contest-expand-all")}
                        </Button>
                        <span>·</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={collapseAllSubmitters}
                          className="text-xs h-7 px-2 cursor-pointer"
                        >
                          {t("feather-contest-collapse-all")}
                        </Button>
                      </div>
                    </div>

                    {/* Table with Header Titles */}
                    <div className="overflow-x-auto">
                      <Table className="table-fixed w-full">
                        <colgroup>
                          <col className="w-10" />
                          <col className="w-[30%] min-w-[140px]" />
                          <col className="w-[100px]" />
                          <col className="w-[100px]" />
                          <col className="w-[100px]" />
                          <col className="w-[100px]" />
                          {showWords && <col className="w-[90px]" />}
                          {showBytes && <col className="w-[90px]" />}
                          <col className="w-12" />
                        </colgroup>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent bg-muted/20">
                            <TableHead className="w-10 text-center"></TableHead>
                            <TableHead className="text-xs truncate">{t("feather-contest-col-submitter")}</TableHead>
                            <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-contest-col-total-entries")}</TableHead>
                            <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-contest-filter-accepted")}</TableHead>
                            <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-contest-filter-pending")}</TableHead>
                            <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-contest-filter-rejected")}</TableHead>
                            {showWords && <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-contest-col-words")}</TableHead>}
                            {showBytes && <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-contest-col-bytes")}</TableHead>}
                            <TableHead className="w-12 text-center text-xs"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedSubmitters.map((sub) => {
                            const isExpanded = Boolean(expandedSubmitters[sub.username]);
                            const colSpan = 7 + (showWords ? 1 : 0) + (showBytes ? 1 : 0);
                            return (
                              <Fragment key={sub.username}>
                                <TableRow
                                  onClick={() => toggleSubmitter(sub.username)}
                                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                                >
                                  <TableCell className="text-center p-2">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground mx-auto" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground mx-auto rtl:rotate-180" />
                                    )}
                                  </TableCell>
                                  <TableCell className="font-medium text-xs sm:text-sm">
                                    <div className="inline-flex items-center gap-2">
                                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                        {sub.username.charAt(0)}
                                      </div>
                                      <Link
                                        href={`/contests/${code}/users/${encodeURIComponent(sub.username)}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="font-semibold text-foreground hover:text-primary hover:underline"
                                      >
                                        {sub.username}
                                      </Link>
                                      <UserBadge username={sub.username} role={sub.role} />
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono font-semibold text-xs text-foreground">
                                    {n(sub.total)}
                                  </TableCell>
                                  <TableCell className="text-right text-xs">
                                    {sub.accepted > 0 ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span>{n(sub.accepted)}</span>
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/40 font-mono">0</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right text-xs">
                                    {sub.pending > 0 ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        <Clock className="h-3 w-3" />
                                        <span>{n(sub.pending)}</span>
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/40 font-mono">0</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right text-xs">
                                    {sub.rejected > 0 ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                        <XCircle className="h-3 w-3" />
                                        <span>{n(sub.rejected)}</span>
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/40 font-mono">0</span>
                                    )}
                                  </TableCell>
                                  {showWords && (
                                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                      {n(sub.totalWords)}
                                    </TableCell>
                                  )}
                                  {showBytes && (
                                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                      {n(sub.totalBytes)}
                                    </TableCell>
                                  )}
                                  <TableCell className="text-center p-2">
                                    <Link
                                      href={`/contests/${code}/users/${encodeURIComponent(sub.username)}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-muted-foreground/60 hover:text-primary transition-colors p-1 inline-flex"
                                      title="View contest profile"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </Link>
                                  </TableCell>
                                </TableRow>

                                {isExpanded && (
                                  <TableRow className="hover:bg-transparent bg-muted/15 border-b border-border/80">
                                    <TableCell colSpan={colSpan} className="p-3 sm:p-4">
                                      <ParticipantArticlesDrawer
                                        code={code}
                                        username={sub.username}
                                        wikiUrl={contest.wiki_url}
                                        showWords={showWords}
                                        showBytes={showBytes}
                                        cachedArticles={userArticlesMap[sub.username]}
                                        expectedTotal={
                                          statusFilter === "accepted"
                                            ? sub.accepted
                                            : statusFilter === "pending"
                                            ? sub.pending
                                            : statusFilter === "rejected"
                                            ? sub.rejected
                                            : sub.total
                                        }
                                        statusFilter={statusFilter}
                                        formatDate={formatDate}
                                      />
                                    </TableCell>
                                  </TableRow>
                                )}
                              </Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    {t("feather-contest-submissions-empty")}
                  </div>
                )
              ) : filteredArticles && filteredArticles.length > 0 ? (
                <>
                  {/* Desktop Table View (>= sm) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table className="table-fixed w-full">
                      <colgroup>
                        <col className="w-[34%] min-w-[140px]" />
                        <col className="w-[140px]" />
                        <col className="w-[110px]" />
                        {showWords && <col className="w-[85px]" />}
                        {showBytes && <col className="w-[85px]" />}
                        <col className="w-[120px]" />
                        <col className="w-[110px]" />
                      </colgroup>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs truncate">{t("feather-contest-col-article")}</TableHead>
                          <TableHead className="text-xs truncate">{t("feather-contest-col-submitter")}</TableHead>
                          <TableHead className="text-center text-xs whitespace-nowrap">{t("feather-contest-col-status")}</TableHead>
                          {showWords && <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-contest-col-words")}</TableHead>}
                          {showBytes && <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-contest-col-bytes")}</TableHead>}
                          <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-contest-col-date")}</TableHead>
                          <TableHead className="text-center text-xs whitespace-nowrap">Discussion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredArticles.map((art) => (
                          <TableRow key={art.id} className="transition-colors hover:bg-muted/40">
                            <TableCell className="font-medium text-foreground text-xs sm:text-sm">
                              <div className="flex items-center gap-1.5 flex-wrap">
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
                                {art.re_review_requested && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded-full shrink-0">
                                    <RefreshCw className="h-2.5 w-2.5" />
                                    <span>{t("feather-rereview-badge", "Re-review requested")}</span>
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5 flex-wrap">
                                <span>{art.submitter_username}</span>
                                <UserBadge username={art.submitter_username} />
                              </span>
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
                            {showWords && (
                              <TableCell className="text-right font-mono text-xs">
                                {n(art.word_count)}
                              </TableCell>
                            )}
                            {showBytes && (
                              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                {n(art.byte_count)}
                              </TableCell>
                            )}
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {formatDate(art.submitted_at)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDiscussionArticle(art)}
                                className={`h-7 px-2 text-xs cursor-pointer gap-1 rounded-md ${
                                  art.re_review_requested
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                title="Open article discussion & jury criteria"
                              >
                                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                                <span className="text-[11px] hidden md:inline">
                                  {art.re_review_requested ? "Re-review" : "Discussion"}
                                </span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card List View (< sm) */}
                  <div className="sm:hidden divide-y divide-border/60">
                    {filteredArticles.map((art) => (
                      <div key={art.id} className="p-3.5 space-y-2 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <a
                              href={`${contest.wiki_url || "https://bn.wiktionary.org"}/wiki/${encodeURIComponent(
                                art.title
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-xs text-foreground hover:text-primary hover:underline inline-flex items-center gap-1 leading-snug"
                            >
                              <span className="truncate">{art.title}</span>
                              <ExternalLink className="h-2.5 w-2.5 opacity-40 shrink-0" />
                            </a>
                            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>by <span className="font-medium text-foreground">{art.submitter_username}</span></span>
                              <UserBadge username={art.submitter_username} />
                            </div>
                          </div>

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
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 shrink-0 ${
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
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          {showWords && (
                            <span className="font-mono text-foreground font-medium">
                              {t("feather-review-preview-words", art.word_count)}
                            </span>
                          )}
                          {showWords && showBytes && <span>·</span>}
                          {showBytes && (
                            <span className="font-mono text-muted-foreground">
                              {t("feather-review-preview-bytes", art.byte_count)}
                            </span>
                          )}
                          <span>·</span>
                          <span className="text-[10px]">
                            {formatDate(art.submitted_at)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          {art.re_review_requested ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                              <RefreshCw className="h-2.5 w-2.5" />
                              <span>{t("feather-rereview-badge", "Re-review requested")}</span>
                            </span>
                          ) : <span />}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDiscussionArticle(art)}
                            className="h-6 text-[11px] gap-1 px-2 cursor-pointer"
                          >
                            <MessageSquare className="h-3 w-3 text-primary" />
                            <span>Discussion</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                    {/* Keyset Load More Button */}
                    {hasMoreArticles && (
                      <div className="p-4 text-center border-t border-border/60 bg-muted/10">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleLoadMoreArticles}
                          disabled={isLoadingMore}
                          className="text-xs cursor-pointer font-medium"
                        >
                          {isLoadingMore ? "Loading..." : t("feather-contest-load-more")}
                        </Button>
                      </div>
                    )}
                  </div>
                </>
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
                {showWords && (
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
                )}

                {/* Rule: Minimum Bytes */}
                {showBytes && (
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
                )}

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
                        formatDateDDMMYYYY(contest.start_date),
                        formatDateDDMMYYYY(contest.end_date)
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
            <CardContent className="p-4 sm:p-6">
              {/* Jury Hub Quick-Access Banner (Only for assigned juries & organizers) */}
              {!contest.is_umbrella && isJuryOrOrganizer && (
                <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span>{t("feather-contest-jury-hub-card-title")}</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                      {t("feather-contest-jury-hub-card-desc")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <Link
                      href={`/contests/${code}/review`}
                      className={buttonVariants({
                        variant: "default",
                        size: "sm",
                        className: "flex-1 sm:flex-none text-xs gap-1.5 cursor-pointer font-medium shadow-xs",
                      })}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>{t("feather-contest-action-review")}</span>
                    </Link>
                    <Link
                      href={`/contests/${code}/jury`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "flex-1 sm:flex-none text-xs gap-1.5 cursor-pointer font-medium shadow-2xs",
                      })}
                    >
                      <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{t("feather-contest-action-jury-stats")}</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Rich Jury Activity Tally Table */}
              {!contest.is_umbrella && juryTallyRows.length > 0 && (
                <div className="mb-6 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <span>{t("feather-contest-jury-tally-title")}</span>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Transparency report of articles evaluated by each jury member
                      </p>
                    </div>

                    {/* Export Action Buttons */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleExportJuryWikitable}
                        className="text-xs h-7 px-2.5 gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{t("feather-contest-export-wikitext")}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleExportJuryCSV}
                        className="text-xs h-7 px-2.5 gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <FileSpreadsheet className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>CSV</span>
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 overflow-hidden bg-card shadow-2xs">
                    <Table className="table-fixed w-full">
                      <colgroup>
                        <col className="w-[35%] min-w-[140px]" />
                        <col className="w-[100px]" />
                        <col className="w-[90px]" />
                        <col className="w-[90px]" />
                        <col className="w-[140px]" />
                        {contest.distribute_jury_queue && <col className="w-[100px]" />}
                      </colgroup>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/20">
                          <TableHead className="text-xs truncate">{t("feather-jury-col-member")}</TableHead>
                          <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-jury-col-judged")}</TableHead>
                          <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-jury-col-accepted")}</TableHead>
                          <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-jury-col-rejected")}</TableHead>
                          <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-jury-col-acceptance-rate")}</TableHead>
                          {contest.distribute_jury_queue && (
                            <TableHead className="text-right text-xs whitespace-nowrap">{t("feather-jury-col-assigned")}</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {juryTallyRows.map((j) => (
                          <TableRow key={j.username} className="hover:bg-muted/40 transition-colors">
                            <TableCell className="text-xs font-medium">
                              <div className="inline-flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] uppercase">
                                  {j.username.charAt(0)}
                                </div>
                                <Link
                                  href={`/contests/${code}/users/${encodeURIComponent(j.username)}`}
                                  className="font-semibold text-foreground hover:text-primary hover:underline"
                                >
                                  {j.username}
                                </Link>
                                <UserBadge username={j.username} />
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold font-mono text-xs text-foreground">
                              {n(j.judged)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                {n(j.accepted)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                                {n(j.rejected)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              <div className="inline-flex items-center justify-end gap-2">
                                <span>{n(j.acceptance_rate)}%</span>
                                <div className="w-12 bg-muted/60 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full"
                                    style={{ width: `${Math.min(j.acceptance_rate, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            {contest.distribute_jury_queue && (
                              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                {n(j.assigned)}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/contests/${code}/users/${encodeURIComponent(juryName)}`}
                              className="text-xs font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                            >
                              {juryName}
                            </Link>
                            <UserBadge username={juryName} />
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {contest.is_umbrella ? t("feather-contest-jury-role-organizer") : t("feather-contest-jury-role-member")}
                          </div>
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

              {/* Juries by Community Breakdown (for Campaigns) */}
              {contest.is_umbrella && contest.sub_contests && contest.sub_contests.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border/60">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {t("feather-contest-community-panels")}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {contest.sub_contests.map((sub) => {
                      const wikiInfo = getWikiInfo(sub.wiki_dbname);
                      const subDisplayName = sub.name.includes("???")
                        ? `${contest.name} (${wikiInfo?.nativeName || wikiInfo?.englishName || sub.wiki_dbname})`
                        : sub.name;
                      return (
                        <div key={sub.code} className="p-3 rounded-lg border border-border/60 bg-muted/20">
                          <div className="font-semibold text-xs text-foreground flex items-center justify-between">
                            <span>{subDisplayName}</span>
                            <Badge variant="outline" className="text-[10px] font-mono">{sub.wiki_dbname}</Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1">
                            {t("feather-contest-jury-assigned-count", sub.total_juries)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-4 outline-hidden">
          <CommunityChatPanel
            contestCode={code}
            contestName={contest.name}
            isUmbrella={Boolean(contest.is_umbrella)}
            parentContestId={contest.parent_contest_id}
            isJuryOrAdmin={isJuryOrOrganizer}
            currentUsername={me?.wiki_username}
          />
        </TabsContent>

      </Tabs>

      {/* Article Discussion & Re-Review Modal */}
      <ArticleDiscussionModal
        isOpen={!!discussionArticle}
        onClose={() => setDiscussionArticle(null)}
        article={discussionArticle}
        contestCode={code}
        currentUsername={me?.wiki_username}
        isJuryOrOrganizer={isJuryOrOrganizer}
        onReReviewRequested={() => {
          queryClient.invalidateQueries({ queryKey: ["articles", code] });
        }}
      />
    </div>
  );
}
