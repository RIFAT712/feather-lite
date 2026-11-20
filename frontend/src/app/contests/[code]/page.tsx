"use client";

import { use, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  fetchContest, fetchStandings, fetchArticles, createSubContest,
  fetchAvailableContests, attachContestToCampaign, detachContestFromCampaign,
  updateContest, fetchMe, approveContest, deleteContest,
  Contest, StandingEntry, Article, SubContestSummary, AvailableContestSummary,
  UpdateContestPayload
} from "@/lib/api";
import TimezoneSelector from "@/components/contests/TimezoneSelector";
import { useI18n } from "@/i18n/I18nContext";
import { getProjectMeta, getWikiInfo } from "@/lib/wikis";
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
  BarChart3, Trash2, AlertTriangle, ShieldAlert
} from "lucide-react";
import { FloatingInput, FloatingTextarea } from "@/components/ui/floating-input";
import { UserTagInput } from "@/components/contests/UserTagInput";
import TalkTemplateBuilder from "@/components/contests/TalkTemplateBuilder";
import TalkQueueMonitor from "@/components/contests/TalkQueueMonitor";
import DateTimePicker from "@/components/ui/date-time-picker";
import { calculateEndOfDay } from "@/lib/time";
import UserBadge from "@/components/users/UserBadge";

export default function ContestDashboardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { t, n, formatDate, locale, isRtl } = useI18n();
  const router = useRouter();

  const queryClient = useQueryClient();

  // Local search and filter states
  const [standingsSearch, setStandingsSearch] = useState("");
  const [submissionsSearch, setSubmissionsSearch] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [communityFilter, setCommunityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCopied, setIsCopied] = useState(false);

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

  // Settings form states
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editTZ, setEditTZ] = useState("UTC");
  const [hasEditMinWords, setHasEditMinWords] = useState(false);
  const [editMinWords, setEditMinWords] = useState<number>(300);
  const [hasEditMinBytes, setHasEditMinBytes] = useState(false);
  const [editMinBytes, setEditMinBytes] = useState<number>(3000);
  const [hasEditMinRefs, setHasEditMinRefs] = useState(false);
  const [editMinRefs, setEditMinRefs] = useState<number>(1);
  const [hasEditMaxSub, setHasEditMaxSub] = useState(false);
  const [editMaxSub, setEditMaxSub] = useState<number>(0);
  const [editRuleCreator, setEditRuleCreator] = useState(true);
  const [editRuleWindow, setEditRuleWindow] = useState(true);
  const [editRuleNoRedirect, setEditRuleNoRedirect] = useState(true);
  const [editRuleNoDisambig, setEditRuleNoDisambig] = useState(true);
  const [editRuleMainspace, setEditRuleMainspace] = useState(true);
  const [editRankByWords, setEditRankByWords] = useState(false);
  const [editAddTalkTemplate, setEditAddTalkTemplate] = useState(false);
  const [editTalkTemplateName, setEditTalkTemplateName] = useState("");
  const [editDistributeJuryQueue, setEditDistributeJuryQueue] = useState(false);
  const [editJuries, setEditJuries] = useState<string[]>([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // User session
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 60 * 1000,
  });

  // Queries
  const { data: contest, isLoading: contestLoading } = useQuery<Contest>({
    queryKey: ["contest", code],
    queryFn: () => fetchContest(code),
  });

  const { data: standings, isLoading: standingsLoading } = useQuery<StandingEntry[]>({
    queryKey: ["standings", code, communityFilter],
    queryFn: () => fetchStandings(code, communityFilter === "all" ? undefined : communityFilter),
  });

  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ["articles", code, statusFilter],
    queryFn: () => fetchArticles(code, undefined, statusFilter === "all" ? undefined : statusFilter, 100),
  });

  const articles = articlesData?.items || [];

  // Available standalone contests for linking
  const { data: availableContests, isLoading: isLoadingAvailable } = useQuery<AvailableContestSummary[]>({
    queryKey: ["available-contests", code, existingSearchQuery],
    queryFn: () => fetchAvailableContests(code, existingSearchQuery),
    enabled: !!contest?.is_umbrella && isAddCommunityOpen && addCommunityMode === "link",
  });

  const handleAttachContest = async (contestId: number) => {
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
  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    const valid = articles.filter((a) => a.status !== "validation_failed");
    if (!submissionsSearch.trim()) return valid;
    const q = submissionsSearch.toLowerCase().trim();
    return valid.filter(
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

  const isJuryOrOrganizer = useMemo(() => {
    if (!me?.is_authenticated) return false;
    if (me.role === "owner" || me.role === "jury") return true;
    if (contest?.juries && me.wiki_username && contest.juries.includes(me.wiki_username)) return true;
    return false;
  }, [me, contest]);

  const isOrganizer = useMemo(() => {
    if (!me?.is_authenticated) return false;
    if (me.role === "owner" || (me as any)?.is_owner) return true;
    if (contest?.created_by_id && me.user_id && contest.created_by_id === me.user_id) return true;
    if (contest?.juries && me.wiki_username && contest.juries.includes(me.wiki_username)) return true;
    return false;
  }, [me, contest]);

  const isOwner = me?.role === "owner" || Boolean((me as any)?.is_owner);
  const isCreator = Boolean(contest?.created_by_id && me?.user_id && contest.created_by_id === me.user_id);
  const [isApproving, setIsApproving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingContest, setIsDeletingContest] = useState(false);

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

  const handleDeleteContest = async () => {
    setIsDeletingContest(true);
    try {
      await deleteContest(code);
      toast.success(t("feather-admin-delete-success"));
      queryClient.invalidateQueries({ queryKey: ["contests"] });
      queryClient.invalidateQueries({ queryKey: ["adminOverview"] });
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete contest");
      setIsDeletingContest(false);
    }
  };

  function formatDateForInput(d?: string | Date) {
    if (!d) return "";
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().slice(0, 16);
    } catch {
      return "";
    }
  }

  const applyDuration = (days: number) => {
    if (!editStartDate) return;
    setEditEndDate(calculateEndOfDay(editStartDate, days));
  };

  // Synchronize settings form state when contest data arrives
  useEffect(() => {
    if (contest) {
      if (!activeTab) {
        setActiveTab(contest.is_umbrella ? "communities" : "standings");
      }
      setEditName(contest.name || "");
      setEditDescription(contest.description || "");
      setEditStatus(contest.status || "active");
      setEditStartDate(formatDateForInput(contest.start_date));
      setEditEndDate(formatDateForInput(contest.end_date));
      setEditTZ(contest.wiki_tz || "UTC");
      setHasEditMinWords((contest.min_words ?? 0) > 0);
      setEditMinWords(contest.min_words && contest.min_words > 0 ? contest.min_words : 300);
      setHasEditMinBytes((contest.min_bytes ?? 0) > 0);
      setEditMinBytes(contest.min_bytes && contest.min_bytes > 0 ? contest.min_bytes : 3000);
      setHasEditMinRefs((contest.min_refs ?? 0) > 0);
      setEditMinRefs(contest.min_refs && contest.min_refs > 0 ? contest.min_refs : 1);
      setHasEditMaxSub((contest.max_submissions_per_user ?? 0) > 0);
      setEditMaxSub(contest.max_submissions_per_user ?? 0);
      setEditRuleCreator(contest.rule_must_be_creator ?? true);
      setEditRuleWindow(contest.rule_created_in_window ?? true);
      setEditRuleNoRedirect(contest.rule_no_redirect ?? true);
      setEditRuleNoDisambig(contest.rule_no_disambig ?? true);
      setEditRuleMainspace(contest.rule_mainspace_only ?? true);
      setEditRankByWords(contest.rank_by_words ?? false);
      setEditAddTalkTemplate(contest.add_talk_template ?? false);
      setEditTalkTemplateName(contest.talk_template_name || "");
      setEditDistributeJuryQueue(contest.distribute_jury_queue ?? false);
      setEditJuries(contest.juries || []);
    }
  }, [contest]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error(t("feather-create-err-name-req"));
      return;
    }
    setIsSavingSettings(true);
    try {
      await updateContest(code, {
        name: editName.trim(),
        description: editDescription.trim(),
        status: editStatus,
        start_date: new Date(editStartDate).toISOString(),
        end_date: new Date(editEndDate).toISOString(),
        wiki_tz: editTZ,
        min_words: hasEditMinWords ? (Number(editMinWords) || 0) : 0,
        min_bytes: hasEditMinBytes ? (Number(editMinBytes) || 0) : 0,
        min_refs: hasEditMinRefs ? (Number(editMinRefs) || 0) : 0,
        max_submissions_per_user: hasEditMaxSub ? (Number(editMaxSub) || 0) : 0,
        rule_must_be_creator: editRuleCreator,
        rule_created_in_window: editRuleWindow,
        rule_no_redirect: editRuleNoRedirect,
        rule_no_disambig: editRuleNoDisambig,
        rule_mainspace_only: editRuleMainspace,
        rank_by_words: editRankByWords,
        add_talk_template: editAddTalkTemplate,
        talk_template_name: editTalkTemplateName.trim(),
        distribute_jury_queue: editDistributeJuryQueue,
        juries: editJuries,
      });

      toast.success(t("feather-contest-settings-success"));
      queryClient.invalidateQueries({ queryKey: ["contest", code] });
      queryClient.invalidateQueries({ queryKey: ["contests"] });
      queryClient.invalidateQueries({ queryKey: ["standings", code] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration");
    } finally {
      setIsSavingSettings(false);
    }
  };

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
              </div>

              {/* Action Buttons Skeleton */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                <Skeleton className="h-8 w-28 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </CardHeader>

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

        {/* 2. Key Metrics Grid (4 Stat Cards Skeleton) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border shadow-2xs">
              <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-1">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-24 rounded" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                <Skeleton className="h-7 w-16 mt-1 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

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
      <Card className="mb-6 shadow-2xs border-border/80">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                {/* Status Indicator Badge */}
                {(() => {
                  const isPending = contest.status === "pending_approval";
                  const isDraft = contest.status === "draft";
                  const isEnded = contest.status === "ended";

                  let label = contest.status;
                  if (isActive) label = t("feather-contest-status-active");
                  else if (isPending) label = t("feather-contest-status-pending-approval");
                  else if (isDraft) label = t("feather-contest-status-draft");
                  else if (isEnded) label = t("feather-contest-status-ended");

                  let badgeClass = "bg-muted/40 text-muted-foreground border-border/60";
                  let dotEl = <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 shrink-0" />;

                  if (isActive) {
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
                  <div
                    className="text-xs text-foreground/90 flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border/70 bg-muted/30 shrink-0 whitespace-nowrap font-medium"
                    title={t("feather-campaign-badge")}
                  >
                    <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{t("feather-campaign-badge")}</span>
                    {(contest.sub_contest_count || contest.sub_contests?.length) ? (
                      <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.2 rounded font-mono">
                        {t("feather-campaign-communities-count", contest.sub_contest_count || contest.sub_contests?.length || 0)}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  (() => {
                    const pMeta = getProjectMeta(contest.wiki_dbname);
                    const pName = t(`feather-project-${pMeta.id}`) || (locale === "bn" ? pMeta.nativeName : pMeta.name);
                    const wikiInfo = getWikiInfo(contest.wiki_dbname);
                    return (
                      <a
                        href={contest.wiki_url || `https://${contest.wiki_dbname}.org`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer transition-colors px-2 py-0.5 rounded-md border border-border/70 bg-muted/30 hover:bg-muted/60"
                        title={`${wikiInfo?.englishName || pMeta.name} (${contest.wiki_dbname})`}
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

              <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {contest.name}
              </CardTitle>

              <CardDescription className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {contest.description || "No description provided."}
              </CardDescription>
            </div>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
              {contest.status !== "pending_approval" ? (
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
              ) : (
                <Button
                  disabled
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none gap-1.5 text-xs text-muted-foreground opacity-60 cursor-not-allowed"
                  title={t("feather-contest-pending-approval-banner")}
                >
                  <Upload className="h-4 w-4" />
                  {t("feather-contest-action-submit")}
                </Button>
              )}

              {contest.is_umbrella && isOrganizer && (
                <Button
                  onClick={() => setIsAddCommunityOpen(true)}
                  size="sm"
                  variant="outline"
                  className="flex-1 sm:flex-none gap-1.5 cursor-pointer font-medium shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t("feather-campaign-add-community")}</span>
                </Button>
              )}

              {isJuryOrOrganizer && (
                <Link
                  href={`/contests/${code}/review`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "flex-1 sm:flex-none gap-1.5 cursor-pointer font-medium min-h-9 sm:min-h-8 text-xs",
                  })}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {t("feather-contest-action-review")}
                </Link>
              )}

              {isJuryOrOrganizer && (
                <Link
                  href={`/contests/${code}/jury`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "flex-1 sm:flex-none gap-1.5 cursor-pointer font-medium min-h-9 sm:min-h-8 text-xs shadow-2xs",
                  })}
                  title={t("feather-contest-action-jury-stats")}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("feather-contest-action-jury-stats")}</span>
                </Link>
              )}

              {isOrganizer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("settings")}
                  className="flex-1 sm:flex-none gap-1.5 cursor-pointer font-medium text-xs shadow-2xs"
                  title={t("feather-contest-tab-settings")}
                >
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">{t("feather-contest-tab-settings")}</span>
                </Button>
              )}

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
        <Card className="border-border shadow-2xs">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-1">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>{contest.is_umbrella ? t("feather-campaign-stat-communities") : t("feather-contest-submitted")}</span>
              {contest.is_umbrella ? (
                <Layers className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {contest.is_umbrella
                ? contest.sub_contest_count || contest.sub_contests?.length || 0
                : contest.total_articles || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-1">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>{contest.is_umbrella ? t("feather-campaign-stat-submissions") : t("feather-contest-accepted")}</span>
              {contest.is_umbrella ? (
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <span className={`text-xl sm:text-2xl font-bold tracking-tight ${contest.is_umbrella ? "text-foreground" : "text-emerald-600 dark:text-emerald-400"}`}>
                {contest.is_umbrella ? contest.total_articles || 0 : contest.accepted_articles || 0}
              </span>
              {!contest.is_umbrella && contest.total_articles ? (
                <span className="text-[11px] sm:text-xs text-muted-foreground">({acceptanceRate}%)</span>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-1">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>{contest.is_umbrella ? t("feather-campaign-stat-accepted") : t("feather-contest-pending")}</span>
              {contest.is_umbrella ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {contest.accepted_articles || 0}
              </span>
              {contest.is_umbrella && contest.total_articles ? (
                <span className="text-[11px] sm:text-xs text-muted-foreground">({acceptanceRate}%)</span>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-1">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>{contest.is_umbrella ? t("feather-campaign-stat-participants") : t("feather-contest-participants")}</span>
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {standings?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

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
              {isOrganizer && (
                <TabsTrigger value="settings" className="gap-1.5 text-xs cursor-pointer font-medium shrink-0 whitespace-nowrap px-3 py-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  <span>{t("feather-contest-tab-settings")}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Standings Wikitext Export Modal */}
          <div className="flex items-center justify-end sm:justify-start shrink-0">
            <Dialog>
              <DialogTrigger
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "gap-1.5 text-xs font-medium cursor-pointer h-8",
                })}
              >
                <FileCode className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{t("feather-contest-export-wikitext")}</span>
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
                              </div>
                            </div>

                            {/* Local Rules Pills */}
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground pt-1">
                              {sub.min_words > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-muted/60 border border-border/60">
                                  Min {sub.min_words} words
                                </span>
                              )}
                              {sub.min_bytes > 0 && (
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
                          <TableHead className="text-right text-xs">{t("feather-standings-col-words")}</TableHead>
                          <TableHead className="text-right text-xs">{t("feather-standings-col-bytes")}</TableHead>
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
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-16 text-center text-xs">{t("feather-standings-col-rank")}</TableHead>
                          <TableHead className="text-xs">{t("feather-standings-col-user")}</TableHead>
                          {contest.is_umbrella && (
                            <TableHead className="text-xs">{t("feather-campaign-wikis-contributed")}</TableHead>
                          )}
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
                                  {n(2)}
                                </span>
                              ) : s.rank === 3 ? (
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-amber-700/10 text-amber-700 dark:text-amber-500 font-bold text-xs">
                                  {n(3)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground font-mono text-xs">{n(s.rank)}</span>
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
                            <TableCell className="text-right font-mono text-xs">
                              {n(s.total_words)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                              {n(s.total_bytes)}
                            </TableCell>
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
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                                <Medal className="h-3.5 w-3.5" />
                              </span>
                            ) : s.rank === 2 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-muted font-bold text-xs text-muted-foreground shrink-0">
                                {n(2)}
                              </span>
                            ) : s.rank === 3 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-amber-700/10 text-amber-700 dark:text-amber-500 font-bold text-xs shrink-0">
                                {n(3)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-muted/50 text-muted-foreground font-mono text-xs shrink-0">
                                {n(s.rank)}
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
                          <span>
                            {t("feather-review-preview-words", s.total_words)}
                          </span>
                          <span>·</span>
                          <span>
                            {t("feather-review-preview-bytes", s.total_bytes)}
                          </span>
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
                <>
                  {/* Desktop Table View Skeleton */}
                  <div className="hidden sm:block">
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
                            <TableCell className="text-right">
                              <Skeleton className="h-3.5 w-12 ml-auto rounded" />
                            </TableCell>
                            <TableCell className="text-right">
                              <Skeleton className="h-3.5 w-14 ml-auto rounded" />
                            </TableCell>
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
              ) : filteredArticles && filteredArticles.length > 0 ? (
                <>
                  {/* Desktop Table View (>= sm) */}
                  <div className="hidden sm:block">
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
                            <TableCell className="text-right font-mono text-xs">
                              {n(art.word_count)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                              {n(art.byte_count)}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {formatDate(art.submitted_at)}
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
                          <span className="font-mono text-foreground font-medium">
                            {t("feather-review-preview-words", art.word_count)}
                          </span>
                          <span>·</span>
                          <span className="font-mono text-muted-foreground">
                            {t("feather-review-preview-bytes", art.byte_count)}
                          </span>
                          <span>·</span>
                          <span className="text-[10px]">
                            {formatDate(art.submitted_at)}
                          </span>
                        </div>
                      </div>
                    ))}
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

        {/* TAB 5: CONFIGURATION & SETTINGS (Campaign Creator / Admin) */}
        {isOrganizer && (
          <TabsContent value="settings" className="space-y-6 outline-hidden">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Top Bar with Description & Quick Save */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-muted/20 shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    <span>{t("feather-contest-settings-title")}</span>
                  </h3>
                  <Badge variant="secondary" className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5">
                    {t("feather-contest-settings-admin-badge")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("feather-contest-settings-desc")}
                </p>
              </div>

              <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                <Button
                  type="submit"
                  disabled={isSavingSettings || !isOrganizer}
                  className="gap-2 cursor-pointer font-semibold shadow-xs"
                >
                  {isSavingSettings ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      <span>{t("feather-contest-settings-saving")}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>{t("feather-contest-settings-save")}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {!isOrganizer && (
              <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>You are currently viewing contest settings in read-only mode. Only assigned organizers, juries, or platform administrators can modify settings.</span>
              </div>
            )}

            {/* Section 1: Contest Setup & Basic Details */}
            <Card className="border-border shadow-2xs relative z-30 overflow-visible">
              <CardHeader className="py-3 px-4 sm:px-6 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary shrink-0" />
                  <span>{t("feather-create-sec-setup")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 px-4 sm:px-6 pb-5">
                {/* Contest Name */}
                <FloatingInput
                  label={`${t("feather-create-name-label")} *`}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!isOrganizer}
                  required
                />

                {/* Description & Rules */}
                <FloatingTextarea
                  label={t("feather-create-desc-label")}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={!isOrganizer}
                  rows={3}
                />

                {/* Status Selector */}
                <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <label className="text-xs font-semibold text-foreground">
                      {t("feather-contest-settings-status")}
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Active competitions accept participant submissions and allow evaluation.
                    </p>
                  </div>

                  <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/30 p-1 text-xs font-medium shrink-0">
                    <button
                      type="button"
                      onClick={() => isOrganizer && setEditStatus("active")}
                      disabled={!isOrganizer}
                      className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        editStatus === "active"
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>{t("feather-contest-settings-status-active")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => isOrganizer && setEditStatus("ended")}
                      disabled={!isOrganizer}
                      className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        editStatus === "ended"
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      <span>{t("feather-contest-settings-status-ended")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => isOrganizer && setEditStatus("draft")}
                      disabled={!isOrganizer}
                      className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        editStatus === "draft"
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-muted-foreground shrink-0" />
                      <span>{t("feather-contest-settings-status-draft")}</span>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Timeline, Schedule & Timezone */}
            <Card className="border-border shadow-2xs relative z-25 overflow-visible">
              <CardHeader className="py-3 px-4 sm:px-6 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <span>{t("feather-contest-settings-dates")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 px-4 sm:px-6 pb-5">
                {/* Timezone Selector Row */}
                <div className="max-w-md">
                  <div className={!isOrganizer ? "pointer-events-none opacity-60" : ""}>
                    <TimezoneSelector
                      value={editTZ}
                      onChange={(tz) => setEditTZ(tz)}
                      label={t("feather-create-wiki-tz-label")}
                    />
                  </div>
                </div>

                {/* Unified Date Range Bar & Inline Duration Presets */}
                <div className="rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/30 transition-colors p-2.5 sm:px-3 sm:py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className={`flex items-center gap-2 flex-wrap text-xs ${!isOrganizer ? "pointer-events-none opacity-60" : ""}`}>
                    {/* Start Date & Time */}
                    <DateTimePicker
                      value={editStartDate}
                      onChange={setEditStartDate}
                      label="Start"
                    />

                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline shrink-0 rtl:rotate-180" />

                    {/* End Date & Time */}
                    <DateTimePicker
                      value={editEndDate}
                      onChange={setEditEndDate}
                      label="End"
                      isEnd={true}
                    />
                  </div>

                  {/* Inline Quick Duration Helpers */}
                  {isOrganizer && (
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50 w-full sm:w-auto justify-end">
                      <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mr-1">
                        Preset:
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyDuration(15)}
                        className="h-6 text-[11px] px-2 cursor-pointer font-medium bg-background hover:bg-muted border-border/80 shadow-2xs"
                      >
                        +15d
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyDuration(30)}
                        className="h-6 text-[11px] px-2 cursor-pointer font-medium bg-background hover:bg-muted border-border/80 shadow-2xs"
                      >
                        +30d
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyDuration(60)}
                        className="h-6 text-[11px] px-2 cursor-pointer font-medium bg-background hover:bg-muted border-border/80 shadow-2xs"
                      >
                        +60d
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Qualification & Eligibility Rules */}
            <Card className="border-border shadow-2xs relative z-20 overflow-visible">
              <CardHeader className="py-3 px-4 sm:px-6 border-b border-border/50 bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    <span>{t("feather-create-sec-rules")}</span>
                  </CardTitle>
                  {contest.is_umbrella && (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      Campaign Global Baseline
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-4 px-4 sm:px-6 pb-5">
                {/* 3 Optional Threshold Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* 1. Minimum Words Card */}
                  <div
                    className={`p-3 rounded-lg border transition-all duration-150 ${
                      hasEditMinWords
                        ? "bg-card border-primary/40 shadow-2xs"
                        : "bg-muted/15 border-border/70 hover:bg-muted/25"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hasEditMinWords}
                          onChange={(e) => isOrganizer && setHasEditMinWords(e.target.checked)}
                          disabled={!isOrganizer}
                          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-foreground">
                          {t("feather-create-min-words-label")}
                        </span>
                      </label>

                      {hasEditMinWords ? (
                        <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0 h-5">
                          {t("feather-review-preview-words", editMinWords)}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          {t("feather-create-opt-no-limit")}
                        </span>
                      )}
                    </div>

                    {hasEditMinWords ? (
                      <div className="space-y-2 pt-1 animate-in fade-in-0 duration-150">
                        <FloatingInput
                          type="number"
                          min={1}
                          label={t("feather-create-min-words-label")}
                          value={editMinWords}
                          onChange={(e) => isOrganizer && setEditMinWords(Math.max(1, parseInt(e.target.value) || 0))}
                          disabled={!isOrganizer}
                          className="h-9 text-xs"
                        />
                        {isOrganizer && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-medium">Quick:</span>
                            {[50, 150, 300, 500].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setEditMinWords(val)}
                                className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                                  editMinWords === val
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {n(val)}w
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        {t("feather-create-no-words-hint")}
                      </p>
                    )}
                  </div>

                  {/* 2. Minimum Bytes Card */}
                  <div
                    className={`p-3 rounded-lg border transition-all duration-150 ${
                      hasEditMinBytes
                        ? "bg-card border-primary/40 shadow-2xs"
                        : "bg-muted/15 border-border/70 hover:bg-muted/25"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hasEditMinBytes}
                          onChange={(e) => isOrganizer && setHasEditMinBytes(e.target.checked)}
                          disabled={!isOrganizer}
                          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-foreground">
                          {t("feather-create-min-bytes-label")}
                        </span>
                      </label>

                      {hasEditMinBytes ? (
                        <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0 h-5">
                          {t("feather-review-preview-bytes", editMinBytes)}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          {t("feather-create-opt-no-limit")}
                        </span>
                      )}
                    </div>

                    {hasEditMinBytes ? (
                      <div className="space-y-2 pt-1 animate-in fade-in-0 duration-150">
                        <FloatingInput
                          type="number"
                          min={1}
                          label={t("feather-create-min-bytes-label")}
                          value={editMinBytes}
                          onChange={(e) => isOrganizer && setEditMinBytes(Math.max(1, parseInt(e.target.value) || 0))}
                          disabled={!isOrganizer}
                          className="h-9 text-xs"
                        />
                        {isOrganizer && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-medium">Quick:</span>
                            {[300, 1000, 3000, 5000].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setEditMinBytes(val)}
                                className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                                  editMinBytes === val
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {val >= 1000 ? `${val / 1000}k` : val}b
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        {t("feather-create-no-bytes-hint")}
                      </p>
                    )}
                  </div>

                  {/* 3. Minimum References Card */}
                  <div
                    className={`p-3 rounded-lg border transition-all duration-150 ${
                      hasEditMinRefs
                        ? "bg-card border-primary/40 shadow-2xs"
                        : "bg-muted/15 border-border/70 hover:bg-muted/25"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hasEditMinRefs}
                          onChange={(e) => isOrganizer && setHasEditMinRefs(e.target.checked)}
                          disabled={!isOrganizer}
                          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-foreground">
                          {t("feather-create-min-refs-label")}
                        </span>
                      </label>

                      {hasEditMinRefs ? (
                        <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0 h-5">
                          {editMinRefs} ref{editMinRefs > 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          {t("feather-create-opt-no-limit")}
                        </span>
                      )}
                    </div>

                    {hasEditMinRefs ? (
                      <div className="space-y-2 pt-1 animate-in fade-in-0 duration-150">
                        <FloatingInput
                          type="number"
                          min={1}
                          label={t("feather-create-min-refs-label")}
                          value={editMinRefs}
                          onChange={(e) => isOrganizer && setEditMinRefs(Math.max(1, parseInt(e.target.value) || 0))}
                          disabled={!isOrganizer}
                          className="h-9 text-xs"
                        />
                        {isOrganizer && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-medium">Quick:</span>
                            {[1, 2, 3, 5].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setEditMinRefs(val)}
                                className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                                  editMinRefs === val
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {val} ref
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        {t("feather-create-no-refs-hint")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Submissions Limit per Participant Card */}
                <div
                  className={`p-3 rounded-lg border transition-all duration-150 ${
                    hasEditMaxSub
                      ? "bg-card border-primary/40 shadow-2xs"
                      : "bg-muted/15 border-border/70 hover:bg-muted/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasEditMaxSub}
                        onChange={(e) => isOrganizer && setHasEditMaxSub(e.target.checked)}
                        disabled={!isOrganizer}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-foreground">
                        {t("feather-contest-settings-max-sub")}
                      </span>
                    </label>

                    {hasEditMaxSub ? (
                      <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0 h-5">
                        {editMaxSub} submissions limit
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        Unlimited Submissions
                      </span>
                    )}
                  </div>

                  {hasEditMaxSub ? (
                    <div className="space-y-2 pt-1 animate-in fade-in-0 duration-150 max-w-sm">
                      <FloatingInput
                        type="number"
                        min={1}
                        label="Maximum submissions allowed per participant"
                        value={editMaxSub}
                        onChange={(e) => isOrganizer && setEditMaxSub(Math.max(1, parseInt(e.target.value) || 0))}
                        disabled={!isOrganizer}
                        className="h-9 text-xs"
                      />
                      {isOrganizer && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium">Quick:</span>
                          {[5, 10, 20, 50].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setEditMaxSub(val)}
                              className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                                editMaxSub === val
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {val} max
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Participants can submit an unlimited number of qualifying articles without constraint.
                    </p>
                  )}
                </div>

                {/* Page Eligibility Checks Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                  <label className="flex items-start gap-3 p-2.5 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editRuleCreator}
                      onChange={(e) => isOrganizer && setEditRuleCreator(e.target.checked)}
                      disabled={!isOrganizer}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-foreground">{t("feather-create-rule-creator")}</div>
                      <div className="text-[11px] text-muted-foreground">{t("feather-create-rule-creator-hint")}</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-2.5 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editRuleNoRedirect}
                      onChange={(e) => isOrganizer && setEditRuleNoRedirect(e.target.checked)}
                      disabled={!isOrganizer}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-foreground">{t("feather-create-rule-redirect")}</div>
                      <div className="text-[11px] text-muted-foreground">{t("feather-create-rule-redirect-hint")}</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-2.5 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editRuleNoDisambig}
                      onChange={(e) => isOrganizer && setEditRuleNoDisambig(e.target.checked)}
                      disabled={!isOrganizer}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-foreground">{t("feather-create-rule-disambig")}</div>
                      <div className="text-[11px] text-muted-foreground">{t("feather-create-rule-disambig-hint")}</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-2.5 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editRuleMainspace}
                      onChange={(e) => isOrganizer && setEditRuleMainspace(e.target.checked)}
                      disabled={!isOrganizer}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-foreground">{t("feather-contest-settings-rule-mainspace")}</div>
                      <div className="text-[11px] text-muted-foreground">Submissions must belong to Article namespace (0), excluding Draft or User spaces.</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-2.5 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={editRuleWindow}
                      onChange={(e) => isOrganizer && setEditRuleWindow(e.target.checked)}
                      disabled={!isOrganizer}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {t("feather-create-rule-window")}
                        </span>
                        {!editRuleWindow && (
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            {t("feather-create-opt-no-limit")}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {editRuleWindow
                          ? t("feather-create-rule-window-hint")
                          : t("feather-create-rule-window-relaxed-hint")}
                      </div>
                    </div>
                  </label>
                </div>

                {/* Leaderboard Ranking Preference */}
                <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">
                      {t("feather-create-ranking-mode")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Determines how participant standings and rankings are calculated.
                    </div>
                  </div>

                  <div className="inline-flex items-center rounded-md border border-border/70 bg-muted/30 p-0.5 text-xs font-medium shrink-0">
                    <button
                      type="button"
                      onClick={() => isOrganizer && setEditRankByWords(false)}
                      disabled={!isOrganizer}
                      className={`px-2.5 py-1 rounded-sm text-xs transition-colors cursor-pointer ${
                        !editRankByWords
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("feather-create-rank-by-articles")}
                    </button>
                    <button
                      type="button"
                      onClick={() => isOrganizer && setEditRankByWords(true)}
                      disabled={!isOrganizer}
                      className={`px-2.5 py-1 rounded-sm text-xs transition-colors cursor-pointer ${
                        editRankByWords
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("feather-create-rank-by-words")}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Jury Administration & Automation */}
            <Card className="border-border shadow-2xs relative z-10">
              <CardHeader className="py-3 px-4 sm:px-6 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary shrink-0" />
                  <span>{t("feather-create-sec-admin")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 px-4 sm:px-6 pb-5">
                {/* Part A: Jury Usernames */}
                <UserTagInput
                  label={t("feather-create-juries-label")}
                  value={editJuries}
                  onChange={isOrganizer ? setEditJuries : () => {}}
                  wikiUrl={contest?.wiki_url}
                  disabled={!isOrganizer}
                  hint={t("feather-create-juries-hint")}
                />

                {/* Part B: Jury Review Queue Mode */}
                <div className="pt-3 border-t border-border/60 space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>{t("feather-create-jury-distribution-label")}</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={!isOrganizer}
                      onClick={() => isOrganizer && setEditDistributeJuryQueue(false)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        !editDistributeJuryQueue
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-muted/30"
                      } ${!isOrganizer ? "opacity-75 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-foreground">
                          {t("feather-create-jury-distribution-shared")}
                        </span>
                        <Badge variant={!editDistributeJuryQueue ? "default" : "outline"} className="text-[10px]">
                          {t("feather-create-jury-distribution-recommended")}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {t("feather-create-jury-distribution-shared-desc")}
                      </p>
                    </button>

                    <button
                      type="button"
                      disabled={!isOrganizer}
                      onClick={() => isOrganizer && setEditDistributeJuryQueue(true)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        editDistributeJuryQueue
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-muted/30"
                      } ${!isOrganizer ? "opacity-75 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-foreground">
                          {t("feather-create-jury-distribution-divided")}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {t("feather-create-jury-distribution-divided-desc")}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Part C: Talk-Page Automation */}
                <div className="pt-3 border-t border-border/60 space-y-4">
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editAddTalkTemplate}
                      onChange={(e) => isOrganizer && setEditAddTalkTemplate(e.target.checked)}
                      disabled={!isOrganizer}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-primary" />
                        <span>{t("feather-create-add-template")}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {t("feather-create-add-template-hint")}
                      </div>
                    </div>
                  </label>

                  {editAddTalkTemplate && (
                    <div className="space-y-4 pt-1 animate-in fade-in-0 duration-150">
                      <TalkTemplateBuilder
                        value={editTalkTemplateName}
                        onChange={setEditTalkTemplateName}
                        disabled={!isOrganizer}
                      />

                      {/* Talk Page Live Rate-Limited Queue Monitor */}
                      <TalkQueueMonitor
                        contestCode={code}
                        wikiUrl={contest?.wiki_url}
                        isOrganizer={isOrganizer}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bottom Form Action Controls */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-xs">
              <div className="text-xs text-muted-foreground">
                All changes take effect immediately across all participants and juries.
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={isSavingSettings || !isOrganizer}
                  className="gap-2 cursor-pointer font-semibold shadow-xs min-w-[140px]"
                >
                  {isSavingSettings ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      <span>{t("feather-contest-settings-saving")}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>{t("feather-contest-settings-save")}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* Danger Zone: Delete Contest (Owner or Creator only) */}
          {(isOwner || isCreator) && (
            <div className="rounded-xl border border-destructive/25 dark:border-destructive/35 bg-card overflow-hidden shadow-xs mt-8">
              <div className="px-4 sm:px-6 py-3 border-b border-destructive/15 bg-destructive/[0.03] dark:bg-destructive/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center size-6 rounded-md bg-destructive/10 text-destructive ring-1 ring-destructive/20">
                    <AlertTriangle className="size-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-destructive">
                    {t("feather-contest-danger-zone")}
                  </span>
                </div>
                <Badge variant="outline" className="border-destructive/30 text-destructive bg-destructive/5 text-[10px] font-medium">
                  {t("feather-contest-danger-irreversible")}
                </Badge>
              </div>
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {t("feather-admin-delete")}
                    </h4>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">
                      {t("feather-contest-danger-permanent")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                    {t("feather-contest-danger-delete-desc")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="gap-2 text-xs font-semibold cursor-pointer shrink-0 shadow-xs h-8.5 px-3.5"
                >
                  <Trash2 className="size-3.5" />
                  <span>{t("feather-admin-delete")}</span>
                </Button>
              </div>
            </div>
          )}
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Contest Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-destructive mb-1">
              <div className="p-2 bg-destructive/10 rounded-full ring-1 ring-destructive/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold">
                {t("feather-admin-delete-confirm-title")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              {t("feather-admin-delete-confirm-desc")}
            </DialogDescription>
          </DialogHeader>

          {contest && (
            <div className="p-3.5 my-2 rounded-lg bg-destructive/[0.04] border border-destructive/20 text-xs space-y-1.5">
              <div className="text-muted-foreground font-medium">
                You are about to permanently delete:
              </div>
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>{contest.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">({contest.code})</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-destructive/15 text-[11px] text-muted-foreground">
                <span><strong>Wiki:</strong> {contest.wiki_dbname}</span>
                <span>•</span>
                <span><strong>Articles:</strong> {contest.total_articles ?? 0}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeletingContest}
              onClick={() => setIsDeleteDialogOpen(false)}
              className="text-xs cursor-pointer h-8"
            >
              {t("feather-submit-cancel")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeletingContest}
              onClick={handleDeleteContest}
              className="text-xs gap-1.5 cursor-pointer shadow-xs h-8 px-3.5"
            >
              {isDeletingContest ? (
                <Clock className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span>{isDeletingContest ? "Deleting..." : t("feather-admin-delete-confirm-btn")}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
