"use client";

import { use, useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchContest,
  fetchUserCreatedArticles,
  submitArticles,
  fetchMe,
  Contest,
  UserArticleItem,
  SubmissionResultItem,
  AUTH_BASE,
} from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { getProjectMeta } from "@/lib/wikis";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  RotateCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  User,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  Edit3,
  ShieldAlert,
} from "lucide-react";
import { WikimediaLogoIcon } from "@/components/icons/CodexIcons";
import { UserAutocompleteInput } from "@/components/contests/UserAutocompleteInput";

export default function SubmitArticlesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const queryClient = useQueryClient();
  const { t } = useI18n();

  // 1. Contest & User Data
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  const { data: contest, isLoading: contestLoading } = useQuery<Contest>({
    queryKey: ["contest", code],
    queryFn: () => fetchContest(code),
  });

  // 2. Behalf & Target User State
  const [isOnBehalf, setIsOnBehalf] = useState(false);
  const [onBehalfUsername, setOnBehalfUsername] = useState("");
  const [activeTab, setActiveTab] = useState<"auto" | "manual">("auto");
  const [selectedSubCode, setSelectedSubCode] = useState<string>("");

  // Target contest resolution for umbrella multi-community campaigns
  const activeSubContest = useMemo(() => {
    if (!contest?.is_umbrella || !contest.sub_contests || contest.sub_contests.length === 0) return null;
    return contest.sub_contests.find((s) => s.code === selectedSubCode) || contest.sub_contests[0];
  }, [contest, selectedSubCode]);

  const effectiveCode = activeSubContest ? activeSubContest.code : code;
  const effectiveWikiUrl = (activeSubContest?.wiki_url || contest?.wiki_url || "https://bn.wikipedia.org").replace(/\/+$/, "");
  const effectiveDbName = activeSubContest?.wiki_dbname || contest?.wiki_dbname || "bnwiki";

  const targetUsername = useMemo(() => {
    if (isOnBehalf && onBehalfUsername.trim()) {
      return onBehalfUsername.trim();
    }
    return me?.wiki_username || "";
  }, [isOnBehalf, onBehalfUsername, me]);

  // 3. Fetched Articles & Selection
  const [fetchedArticles, setFetchedArticles] = useState<UserArticleItem[]>([]);
  const [alreadySubmitted, setAlreadySubmitted] = useState<string[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Manual fallback textarea
  const [manualTitles, setManualTitles] = useState("");

  // Search & Filter
  const [articleSearch, setArticleSearch] = useState("");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [selectionRange, setSelectionRange] = useState<string>("");
  const [customCount, setCustomCount] = useState<number>(10);

  // Accordion Sections
  const [isAvailableOpen, setIsAvailableOpen] = useState(true);
  const [isSubmittedOpen, setIsSubmittedOpen] = useState(false);

  // 4. Submission Progress & Results
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToSubmit, setTotalToSubmit] = useState(0);
  const [results, setResults] = useState<SubmissionResultItem[]>([]);

  // 5. Contest Window Validation
  const now = Date.now();
  const isContestClosed = contest?.end_date ? now > new Date(contest.end_date).getTime() : false;
  const isContestNotOpen = contest?.start_date ? now < new Date(contest.start_date).getTime() : false;
  const isPendingApproval = contest?.status === "pending_approval";

  // 6. Fetch User Created Articles from Target Wiki
  const handleFetchArticles = useCallback(async () => {
    if (!contest || !targetUsername) return;
    setIsFetching(true);
    setFetchError(null);

    try {
      // 1. Try server-side endpoint first using effective contest code
      const data = await fetchUserCreatedArticles(effectiveCode, targetUsername);
      setFetchedArticles(data.articles || []);
      setAlreadySubmitted(data.already_submitted || []);
      setSelectedArticles([]);
    } catch (err: any) {
      // 2. Client-side fallback directly to MediaWiki Action API via CORS
      try {
        const wikiEndpoint = effectiveWikiUrl;
        const startISO = new Date(contest.start_date).toISOString();
        const endISO = new Date(contest.end_date).toISOString();

        const url = `${wikiEndpoint}/w/api.php?action=query&list=usercontribs&ucuser=${encodeURIComponent(
          targetUsername
        )}&ucstart=${encodeURIComponent(startISO)}&ucend=${encodeURIComponent(
          endISO
        )}&ucdir=newer&ucnamespace=0&ucprop=title|timestamp&ucshow=new&uclimit=500&format=json&origin=*`;

        const resp = await fetch(url);
        const json = await resp.json();

        if (json.query && json.query.usercontribs) {
          const seen = new Set<string>();
          const list: UserArticleItem[] = [];
          for (const item of json.query.usercontribs) {
            if (!seen.has(item.title)) {
              seen.add(item.title);
              list.push({ title: item.title, created_at: item.timestamp });
            }
          }
          setFetchedArticles(list);
          setSelectedArticles([]);
        } else {
          setFetchedArticles([]);
        }
      } catch (fallbackErr: any) {
        setFetchError("Failed to fetch user created articles. Please check username or try manual entry.");
      }
    } finally {
      setIsFetching(false);
    }
  }, [contest, targetUsername, code]);

  // Auto-fetch when targetUsername or contest becomes available
  useEffect(() => {
    if (targetUsername && contest && fetchedArticles.length === 0 && !isFetching) {
      handleFetchArticles();
    }
  }, [targetUsername, contest]);

  // 7. Filter & Sort Articles
  const availableArticles = useMemo(() => {
    const submittedSet = new Set(alreadySubmitted.map((s) => s.toLowerCase()));
    return fetchedArticles.filter((a) => !submittedSet.has(a.title.toLowerCase()));
  }, [fetchedArticles, alreadySubmitted]);

  const submittedArticles = useMemo(() => {
    const submittedSet = new Set(alreadySubmitted.map((s) => s.toLowerCase()));
    return fetchedArticles.filter((a) => submittedSet.has(a.title.toLowerCase()));
  }, [fetchedArticles, alreadySubmitted]);

  const filteredAvailable = useMemo(() => {
    const q = articleSearch.toLowerCase().trim();
    let list = availableArticles;
    if (q) {
      list = list.filter((a) => a.title.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortDirection === "desc" ? timeB - timeA : timeA - timeB;
    });
  }, [availableArticles, articleSearch, sortDirection]);

  const filteredSubmitted = useMemo(() => {
    const q = articleSearch.toLowerCase().trim();
    let list = submittedArticles;
    if (q) {
      list = list.filter((a) => a.title.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortDirection === "desc" ? timeB - timeA : timeA - timeB;
    });
  }, [submittedArticles, articleSearch, sortDirection]);

  // 8. Batch Selection Handlers
  const handleRangeChange = (value: string) => {
    setSelectionRange(value);
    const visibleTitles = filteredAvailable.map((a) => a.title);

    if (value === "all") {
      setSelectedArticles(visibleTitles);
    } else if (value === "10") {
      setSelectedArticles(visibleTitles.slice(0, 10));
    } else if (value === "50") {
      setSelectedArticles(visibleTitles.slice(0, 50));
    } else if (value === "100") {
      setSelectedArticles(visibleTitles.slice(0, 100));
    } else if (value === "custom") {
      setSelectedArticles(visibleTitles.slice(0, Math.max(1, customCount)));
    } else if (value === "none") {
      setSelectedArticles([]);
    }
  };

  const handleCustomCountChange = (count: number) => {
    setCustomCount(count);
    if (selectionRange === "custom") {
      setSelectedArticles(filteredAvailable.map((a) => a.title).slice(0, Math.max(1, count)));
    }
  };

  const toggleSelectArticle = (title: string) => {
    setSelectedArticles((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  // 9. Batch Submission
  const handleSubmit = async () => {
    if (isPendingApproval) {
      toast.error(t("feather-contest-pending-approval-banner"));
      return;
    }

    let titlesToSubmit: string[] = [];

    if (activeTab === "auto") {
      titlesToSubmit = selectedArticles;
    } else {
      titlesToSubmit = manualTitles
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    if (titlesToSubmit.length === 0) {
      toast.error(t("feather-submit-enter-title-err"));
      return;
    }

    setIsSubmitting(true);
    setTotalToSubmit(titlesToSubmit.length);
    setProcessedCount(0);
    setResults([]);

    const chunkSize = 50;
    const allResults: SubmissionResultItem[] = [];

    for (let i = 0; i < titlesToSubmit.length; i += chunkSize) {
      const chunk = titlesToSubmit.slice(i, i + chunkSize);
      try {
        const res = await submitArticles(effectiveCode, chunk, targetUsername);
        if (res.results) {
          allResults.push(...res.results);
        } else {
          chunk.forEach((t) => allResults.push({ title: t, status: "pending" }));
        }
      } catch (err: any) {
        chunk.forEach((t) =>
          allResults.push({ title: t, status: "validation_failed", error: err.message || "Network error" })
        );
      }
      setProcessedCount((prev) => Math.min(titlesToSubmit.length, prev + chunk.length));
    }

    setResults(allResults);
    setIsSubmitting(false);

    const successCount = allResults.filter((r) => r.status === "pending" || r.status === "accepted").length;
    toast.success(t("feather-submit-success", successCount));

    // Refresh queries and re-fetch existing submissions
    queryClient.invalidateQueries({ queryKey: ["contest", code] });
    queryClient.invalidateQueries({ queryKey: ["standings", code] });
    queryClient.invalidateQueries({ queryKey: ["articles", code] });

    // Mark submitted titles in state
    setAlreadySubmitted((prev) => [...prev, ...titlesToSubmit]);
    setSelectedArticles([]);
  };

  const submitProgress = totalToSubmit > 0 ? Math.round((processedCount / totalToSubmit) * 100) : 0;

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 max-w-4xl space-y-6">
      {/* Back Link */}
      <Link
        href={`/contests/${code}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
        {t("feather-nav-back-contests")}
      </Link>

      {/* Contest Window Alerts */}
      {isPendingApproval && (
        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-medium flex items-center gap-2.5">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>{t("feather-contest-pending-approval-banner")}</span>
        </div>
      )}

      {isContestClosed && (
        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs sm:text-sm text-amber-700 dark:text-amber-400 font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{t("feather-submit-window-ended")}</span>
        </div>
      )}

      {isContestNotOpen && (
        <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/10 text-xs sm:text-sm text-blue-700 dark:text-blue-400 font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          <span>{t("feather-submit-window-not-open")}</span>
        </div>
      )}

      {/* Page Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t("feather-submit-page-title")}
            </h1>
            {(() => {
              const dbname = contest?.wiki_dbname || "bnwiki";
              const pMeta = getProjectMeta(dbname);
              return (
                <Badge variant="outline" className="text-xs gap-1.5 px-2 py-0.5">
                  <img
                    src={pMeta.icon}
                    alt=""
                    className="h-3 w-3 object-contain shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = "/icons/projects/wikipedia.svg";
                    }}
                  />
                  <span>{pMeta.name}</span>
                  {contest?.wiki_lang && (
                    <span className="font-mono text-[10px] text-muted-foreground uppercase">
                      ({contest.wiki_lang})
                    </span>
                  )}
                </Badge>
              );
            })()}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("feather-submit-page-subtitle")}
          </p>
        </div>

        {/* Auth / Login Callout */}
        {!me?.is_authenticated && (
          <a
            href={`${AUTH_BASE}/login`}
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "gap-1.5 text-xs shrink-0 cursor-pointer",
            })}
          >
            <WikimediaLogoIcon className="h-3.5 w-3.5" />
            {t("feather-app-login-btn")}
          </a>
        )}
      </div>

      {/* Campaign Community Selector (for Multi-Community Umbrella Contests) */}
      {contest?.is_umbrella && contest.sub_contests && contest.sub_contests.length > 0 && (
        <Card className="border-primary/30 bg-primary/5 shadow-2xs">
          <CardContent className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary shrink-0" />
              <div>
                <div className="text-xs font-semibold text-foreground">
                  Multi-Community Campaign Submission
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Select which participating community edition you are submitting articles for
                </div>
              </div>
            </div>
            <select
              value={selectedSubCode || contest.sub_contests[0]?.code}
              onChange={(e) => {
                setSelectedSubCode(e.target.value);
                setFetchedArticles([]);
                setSelectedArticles([]);
              }}
              className="h-9 px-3 text-xs font-semibold bg-background text-foreground border border-border rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-primary w-full sm:w-auto"
            >
              {contest.sub_contests.map((sub) => (
                <option key={sub.code} value={sub.code}>
                  {sub.name} ({sub.wiki_dbname})
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Jury: Submit on Behalf of Another User Banner */}
      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isOnBehalf}
              onChange={(e) => {
                setIsOnBehalf(e.target.checked);
                setFetchedArticles([]);
                setSelectedArticles([]);
              }}
              className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            />
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              {t("feather-submit-behalf-toggle")}
            </span>
          </label>

          {isOnBehalf ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-56">
                <UserAutocompleteInput
                  value={onBehalfUsername}
                  onChange={setOnBehalfUsername}
                  wikiUrl={contest?.wiki_url}
                  placeholder={t("feather-submit-behalf-placeholder")}
                  className="w-full"
                  inputClassName="h-8 text-xs font-mono"
                  labelBg="bg-card"
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleFetchArticles}
                disabled={isFetching || !onBehalfUsername.trim()}
                className="h-8 text-xs gap-1.5 shrink-0 cursor-pointer"
              >
                {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
                {t("feather-submit-fetch-btn")}
              </Button>
            </div>
          ) : (
            me?.wiki_username && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                {t("feather-app-logged-as", me.wiki_username)}
              </span>
            )
          )}
        </CardContent>
      </Card>

      {/* Mode Switch Tabs: Auto-Detected Articles vs Manual Input */}
      <div className="flex items-center gap-1.5 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("auto")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "auto"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          {t("feather-submit-auto-tab")}
          {availableArticles.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-bold">
              {availableArticles.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "manual"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Edit3 className="h-3.5 w-3.5" />
          {t("feather-submit-manual-tab")}
        </button>
      </div>

      {/* Tab 1: Auto-Detected Articles (feather.toolforge.org Workflow) */}
      {activeTab === "auto" ? (
        <Card className="border-border shadow-2xs">
          {/* Card Header with User & Dates */}
          <CardHeader className="pb-3 border-b border-border bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <RotateCw className="h-4 w-4 text-primary" />
                  {t("feather-submit-card-title", targetUsername || "User")}
                </CardTitle>
                <CardDescription className="text-xs">
                  {contest?.start_date && contest?.end_date
                    ? t(
                        "feather-submit-card-desc",
                        new Date(contest.start_date).toLocaleDateString(),
                        new Date(contest.end_date).toLocaleDateString()
                      )
                    : null}
                </CardDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchArticles}
                disabled={isFetching || !targetUsername}
                className="h-8 text-xs gap-1.5 shrink-0 cursor-pointer"
              >
                <RotateCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
                {isFetching ? t("feather-submit-fetching") : t("feather-submit-fetch-btn")}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {fetchError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
                {fetchError}
              </div>
            )}

            {/* In-page Search Filter */}
            {fetchedArticles.length > 0 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder={t("feather-submit-search-articles")}
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  className="pl-8 text-xs h-8 bg-background border-border"
                />
              </div>
            )}

            {/* Section 1: Articles You Can Submit */}
            <div className="rounded-lg border border-border overflow-hidden">
              {/* Accordion Header */}
              <div
                onClick={() => setIsAvailableOpen((prev) => !prev)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/30 cursor-pointer select-none hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isAvailableOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                  )}
                  <span className="text-xs sm:text-sm font-bold text-foreground">
                    {t("feather-submit-can-submit-section", filteredAvailable.length)}
                  </span>
                  <Badge variant="secondary" className="text-[11px] font-bold px-2 py-0">
                    {t("feather-submit-selected-count", selectedArticles.length)}
                  </Badge>
                </div>

                {/* Batch Selection Action Bar */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-wrap items-center gap-2 text-xs"
                >
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span>{t("feather-submit-select-label")}:</span>
                    <select
                      value={selectionRange}
                      onChange={(e) => handleRangeChange(e.target.value)}
                      className="h-7 rounded border border-border bg-background px-2 text-xs font-medium cursor-pointer outline-none"
                    >
                      <option value="">—</option>
                      <option value="all">{t("feather-submit-select-all")}</option>
                      {filteredAvailable.length > 10 && <option value="10">10</option>}
                      {filteredAvailable.length > 50 && <option value="50">50</option>}
                      {filteredAvailable.length > 100 && <option value="100">100</option>}
                      <option value="custom">{t("feather-submit-select-custom")}</option>
                    </select>

                    {selectionRange === "custom" && (
                      <Input
                        type="number"
                        min={1}
                        max={filteredAvailable.length}
                        value={customCount}
                        onChange={(e) => handleCustomCountChange(parseInt(e.target.value) || 1)}
                        className="h-7 w-16 text-xs font-mono"
                      />
                    )}
                  </div>

                  <span className="text-border">·</span>

                  {/* Sort By Date */}
                  <button
                    type="button"
                    onClick={() => setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))}
                    className="flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                    title={sortDirection === "desc" ? t("feather-submit-sort-newest") : t("feather-submit-sort-oldest")}
                  >
                    <span>{t("feather-submit-sort-date")}</span>
                    <span>{sortDirection === "desc" ? "↓" : "↑"}</span>
                  </button>

                  <span className="text-border">·</span>

                  <button
                    type="button"
                    onClick={() => setSelectedArticles([])}
                    className="font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {t("feather-submit-deselect-all")}
                  </button>
                </div>
              </div>

              {/* Accordion Body: Checkable Article Items */}
              {isAvailableOpen && (
                <div className="divide-y divide-border/60 max-h-96 overflow-y-auto bg-background">
                  {filteredAvailable.length > 0 ? (
                    filteredAvailable.map((article) => {
                      const isChecked = selectedArticles.includes(article.title);
                      return (
                        <label
                          key={article.title}
                          className={`flex items-center justify-between gap-3 p-3 min-h-[44px] text-xs cursor-pointer transition-colors ${
                            isChecked ? "bg-primary/5 font-semibold" : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectArticle(article.title)}
                              className="h-5 w-5 rounded border-border accent-primary cursor-pointer shrink-0"
                            />
                            <span className="truncate text-foreground text-xs sm:text-sm">
                              {article.title}
                            </span>
                          </div>

                          {article.created_at && (
                            <span className="text-[11px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded shrink-0">
                              {new Date(article.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </label>
                      );
                    })
                  ) : isFetching ? (
                    <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span>{t("feather-submit-fetching")}</span>
                    </div>
                  ) : articleSearch ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      {t("feather-submit-no-search-match", articleSearch)}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      {availableArticles.length === 0 && alreadySubmitted.length > 0
                        ? t("feather-submit-all-already-submitted")
                        : t("feather-submit-no-articles-found")}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 2: Already Submitted Articles (Collapsible) */}
            {filteredSubmitted.length > 0 && (
              <div className="rounded-lg border border-border/80 overflow-hidden">
                <div
                  onClick={() => setIsSubmittedOpen((prev) => !prev)}
                  className="flex items-center justify-between p-3 bg-muted/20 cursor-pointer select-none hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isSubmittedOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                    )}
                    <span className="text-xs font-semibold text-muted-foreground">
                      {t("feather-submit-already-submitted-section", filteredSubmitted.length)}
                    </span>
                  </div>
                </div>

                {isSubmittedOpen && (
                  <div className="divide-y divide-border/40 max-h-60 overflow-y-auto bg-muted/5">
                    {filteredSubmitted.map((article) => (
                      <div
                        key={article.title}
                        className="flex items-center justify-between gap-3 p-2.5 text-xs text-muted-foreground"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">{article.title}</span>
                        </div>

                        <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
                          {t("feather-submit-status-submitted")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Tab 2: Manual Title Entry */
        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-3 border-b border-border bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" />
              {t("feather-submit-manual-tab")}
            </CardTitle>
            <CardDescription className="text-xs">
              {t("feather-submit-manual-desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Textarea
              rows={8}
              value={manualTitles}
              onChange={(e) => setManualTitles(e.target.value)}
              placeholder={t("feather-submit-manual-placeholder")}
              className="font-mono text-xs sm:text-sm leading-relaxed"
            />
          </CardContent>
        </Card>
      )}

      {/* Submission Action Bar & Real-time Progress */}
      <div className="space-y-3 pt-2">
        {isSubmitting && totalToSubmit > 0 && (
          <div className="p-4 rounded-lg border border-border bg-card shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>{t("feather-submit-submitting-progress", processedCount, totalToSubmit, submitProgress)}</span>
              <span className="font-mono">{submitProgress}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${submitProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <Button
            size="lg"
            variant="default"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              isPendingApproval ||
              isContestClosed ||
              isContestNotOpen ||
              (activeTab === "auto" ? selectedArticles.length === 0 : !manualTitles.trim())
            }
            className="w-full sm:max-w-md gap-2 font-bold cursor-pointer text-sm shadow-md"
          >
            <Send className="h-4 w-4" />
            {t(
              "feather-submit-btn-action",
              activeTab === "auto"
                ? selectedArticles.length
                : manualTitles.split("\n").filter((t) => t.trim()).length
            )}
          </Button>
        </div>
      </div>

      {/* Detailed Submission Results Card Block */}
      {results.length > 0 && (
        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-3 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-base font-bold">
                {t("feather-submit-results-title")}
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              {t("feather-submit-results-desc", results.length)}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">{t("feather-submit-col-title")}</TableHead>
                  <TableHead className="w-32 text-center text-xs">{t("feather-submit-col-status")}</TableHead>
                  <TableHead className="text-xs">{t("feather-submit-col-details")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((res, idx) => {
                  const isOk = res.status === "pending" || res.status === "accepted";
                  return (
                    <TableRow key={idx} className="text-xs">
                      <TableCell className="font-medium text-foreground">
                        {res.title}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={isOk ? "secondary" : "destructive"}
                          className="text-[10px] font-bold gap-1"
                        >
                          {isOk ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              {t("feather-submit-status-submitted")}
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              {t("feather-submit-status-error")}
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {res.error || t("feather-submit-status-submitted")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
