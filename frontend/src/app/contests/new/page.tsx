"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nContext";
import { 
  createContest, fetchMe, CreateContestPayload, CommunityRuleConfig,
  AvailableContest, fetchGlobalAvailableContests 
} from "@/lib/api";
import { getProjectMeta, getLanguageName } from "@/lib/wikis";
import { CodexLanguageIcon } from "@/components/icons/CodexIcons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FloatingInput, FloatingTextarea } from "@/components/ui/floating-input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import WikiSelector from "@/components/contests/WikiSelector";
import TimezoneSelector from "@/components/contests/TimezoneSelector";
import { UserTagInput } from "@/components/contests/UserTagInput";
import TalkTemplateBuilder from "@/components/contests/TalkTemplateBuilder";
import DateTimePicker from "@/components/ui/date-time-picker";
import { 
  ArrowLeft, ArrowRight, Shield, ShieldAlert, Globe, BookOpen, CheckCircle, 
  Clock, UserCheck, Layers, Loader2, Calendar, X, Users, Search,
  ChevronDown, Check, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { 
  getBeginningOfDay, calculateEndOfDay, 
  getTimezoneOffsetLabel
} from "@/lib/time";

export default function NewContestPage() {
  const { t, n, locale } = useI18n();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });
  const isOwner = me?.role === "owner" || Boolean((me as any)?.is_owner);

  // Form State (NO custom code/slug input - automatically 4 random characters)
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Contest Type: "standard" (single wiki) vs "umbrella" (multi-community campaign)
  const [contestType, setContestType] = useState<"standard" | "umbrella">("standard");

  // Selected existing competitions for Multi-Community Campaign
  const [selectedExistingContests, setSelectedExistingContests] = useState<AvailableContest[]>([]);
  const [compSearch, setCompSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");

  const { data: availableContests = [], isLoading: isLoadingAvailable } = useQuery<AvailableContest[]>({
    queryKey: ["availableContests"],
    queryFn: () => fetchGlobalAvailableContests(),
    enabled: contestType === "umbrella",
  });

  // Unique projects from available ongoing competitions
  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    availableContests.forEach((c) => {
      const p = getProjectMeta(c.wiki_dbname).id;
      set.add(p);
    });
    return Array.from(set).sort();
  }, [availableContests]);

  // Unique languages from available ongoing competitions
  const uniqueLanguages = useMemo(() => {
    const set = new Set<string>();
    availableContests.forEach((c) => {
      if (c.wiki_lang) set.add(c.wiki_lang);
    });
    return Array.from(set).sort();
  }, [availableContests]);

  // Client-side ultra-fast filtering for silky 60 FPS responsiveness
  const filteredAvailableContests = useMemo(() => {
    return availableContests.filter((c) => {
      if (selectedProject !== "all") {
        const p = getProjectMeta(c.wiki_dbname).id;
        if (p !== selectedProject) return false;
      }
      if (selectedLanguage !== "all") {
        if (c.wiki_lang !== selectedLanguage) return false;
      }
      if (compSearch.trim()) {
        const q = compSearch.toLowerCase().trim();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesCode = c.code.toLowerCase().includes(q);
        const matchesDb = c.wiki_dbname.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDb) return false;
      }
      return true;
    });
  }, [availableContests, selectedProject, selectedLanguage, compSearch]);

  const handleAddExistingContest = (contest: AvailableContest) => {
    if (selectedExistingContests.some((c) => c.code === contest.code)) {
      toast.error(t("feather-campaign-already-selected", "Competition is already added"));
      return;
    }
    setSelectedExistingContests((prev) => [...prev, contest]);
    toast.success(`Added ${contest.name}`);
  };

  const handleRemoveExistingContest = (code: string) => {
    setSelectedExistingContests((prev) => prev.filter((c) => c.code !== code));
  };
  
  // Wiki Target (default Bengali Wikipedia)
  const [wikiDbName, setWikiDbName] = useState("bnwiki");
  const [wikiURL, setWikiURL] = useState("https://bn.wikipedia.org");
  const [wikiLang, setWikiLang] = useState("bn");
  const [wikiTZ, setWikiTZ] = useState("UTC");

  // Dates: always measure from beginning of today (00:00) to end of day (23:59) in contest timezone (default UTC)
  const [startDate, setStartDate] = useState(() => getBeginningOfDay("UTC"));
  const [endDate, setEndDate] = useState(() => calculateEndOfDay(getBeginningOfDay("UTC"), 30));

  // Optional Threshold Toggles (default unchecked / off)
  const [hasMinWords, setHasMinWords] = useState(false);
  const [minWords, setMinWords] = useState(300);

  const [hasMinBytes, setHasMinBytes] = useState(false);
  const [minBytes, setMinBytes] = useState(3000);

  const [hasMinRefs, setHasMinRefs] = useState(false);
  const [minRefs, setMinRefs] = useState(1);

  // Fountain Page Rules
  const [mustBeCreator, setMustBeCreator] = useState(true);
  const [noRedirect, setNoRedirect] = useState(true);
  const [noDisambig, setNoDisambig] = useState(true);
  const [mainspaceOnly, setMainspaceOnly] = useState(true);
  const [createdInWindow, setCreatedInWindow] = useState(true);
  const [customCreationStart, setCustomCreationStart] = useState("");
  const [customCreationEnd, setCustomCreationEnd] = useState("");
  const [rankByWords, setRankByWords] = useState(false);

  // Juries
  const [juries, setJuries] = useState<string[]>([]);
  const [distributeJuryQueue, setDistributeJuryQueue] = useState(false);

  // Automation
  const [addTalkTemplate, setAddTalkTemplate] = useState(false);
  const [talkTemplateName, setTalkTemplateName] = useState("");

  // Autosave Draft State & Lifecycle
  const DRAFT_STORAGE_KEY = "feather_contest_create_draft_v1";
  const [hasDraft, setHasDraft] = useState(false);
  const [draftLastSaved, setDraftLastSaved] = useState<string | null>(null);
  const [isLoadedFromDraft, setIsLoadedFromDraft] = useState(false);

  // 1. Restore draft on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft && typeof draft === "object") {
          const hasContent =
            Boolean(draft.name?.trim()) ||
            Boolean(draft.description?.trim()) ||
            (Array.isArray(draft.selectedExistingContests) && draft.selectedExistingContests.length > 0) ||
            (Array.isArray(draft.juries) && draft.juries.length > 0);

          if (hasContent) {
            if (typeof draft.name === "string") setName(draft.name);
            if (typeof draft.description === "string") setDescription(draft.description);
            if (draft.contestType === "standard" || draft.contestType === "umbrella") {
              setContestType(draft.contestType);
            }
            if (Array.isArray(draft.selectedExistingContests)) {
              setSelectedExistingContests(draft.selectedExistingContests);
            }
            if (typeof draft.wikiDbName === "string") setWikiDbName(draft.wikiDbName);
            if (typeof draft.wikiURL === "string") setWikiURL(draft.wikiURL);
            if (typeof draft.wikiLang === "string") setWikiLang(draft.wikiLang);
            if (typeof draft.wikiTZ === "string") setWikiTZ(draft.wikiTZ);
            if (typeof draft.startDate === "string") setStartDate(draft.startDate);
            if (typeof draft.endDate === "string") setEndDate(draft.endDate);
            if (typeof draft.hasMinWords === "boolean") setHasMinWords(draft.hasMinWords);
            if (typeof draft.minWords === "number") setMinWords(draft.minWords);
            if (typeof draft.hasMinBytes === "boolean") setHasMinBytes(draft.hasMinBytes);
            if (typeof draft.minBytes === "number") setMinBytes(draft.minBytes);
            if (typeof draft.hasMinRefs === "boolean") setHasMinRefs(draft.hasMinRefs);
            if (typeof draft.minRefs === "number") setMinRefs(draft.minRefs);
            if (typeof draft.mustBeCreator === "boolean") setMustBeCreator(draft.mustBeCreator);
            if (typeof draft.noRedirect === "boolean") setNoRedirect(draft.noRedirect);
            if (typeof draft.noDisambig === "boolean") setNoDisambig(draft.noDisambig);
            if (typeof draft.mainspaceOnly === "boolean") setMainspaceOnly(draft.mainspaceOnly);
            if (typeof draft.createdInWindow === "boolean") setCreatedInWindow(draft.createdInWindow);
            if (typeof draft.customCreationStart === "string") setCustomCreationStart(draft.customCreationStart);
            if (typeof draft.customCreationEnd === "string") setCustomCreationEnd(draft.customCreationEnd);
            if (typeof draft.rankByWords === "boolean") setRankByWords(draft.rankByWords);
            if (Array.isArray(draft.juries)) setJuries(draft.juries);
            if (typeof draft.distributeJuryQueue === "boolean") setDistributeJuryQueue(draft.distributeJuryQueue);
            if (typeof draft.addTalkTemplate === "boolean") setAddTalkTemplate(draft.addTalkTemplate);
            if (typeof draft.talkTemplateName === "string") setTalkTemplateName(draft.talkTemplateName);

            setHasDraft(true);
            setDraftLastSaved(draft.savedAt || new Date().toISOString());
            toast.info(t("feather-draft-restored"));
          }
        }
      }
    } catch (e) {
      console.warn("Could not load draft from localStorage", e);
    } finally {
      setIsLoadedFromDraft(true);
    }
  }, [t]);

  // 2. Autosave draft on form input changes (debounced 400ms)
  useEffect(() => {
    if (!isLoadedFromDraft) return;

    const hasContent =
      name.trim().length > 0 ||
      description.trim().length > 0 ||
      selectedExistingContests.length > 0 ||
      juries.length > 0 ||
      hasMinWords ||
      hasMinBytes ||
      hasMinRefs ||
      addTalkTemplate;

    if (!hasContent) {
      return;
    }

    const timer = setTimeout(() => {
      try {
        const payload = {
          name,
          description,
          contestType,
          selectedExistingContests,
          wikiDbName,
          wikiURL,
          wikiLang,
          wikiTZ,
          startDate,
          endDate,
          hasMinWords,
          minWords,
          hasMinBytes,
          minBytes,
          hasMinRefs,
          minRefs,
          mustBeCreator,
          noRedirect,
          noDisambig,
          mainspaceOnly,
          createdInWindow,
          customCreationStart,
          customCreationEnd,
          rankByWords,
          juries,
          distributeJuryQueue,
          addTalkTemplate,
          talkTemplateName,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
        setHasDraft(true);
        setDraftLastSaved(payload.savedAt);
      } catch (e) {
        // Ignore storage quota limits
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    isLoadedFromDraft,
    name,
    description,
    contestType,
    selectedExistingContests,
    wikiDbName,
    wikiURL,
    wikiLang,
    wikiTZ,
    startDate,
    endDate,
    hasMinWords,
    minWords,
    hasMinBytes,
    minBytes,
    hasMinRefs,
    minRefs,
    mustBeCreator,
    noRedirect,
    noDisambig,
    mainspaceOnly,
    createdInWindow,
    customCreationStart,
    customCreationEnd,
    rankByWords,
    juries,
    distributeJuryQueue,
    addTalkTemplate,
    talkTemplateName,
  ]);

  // 3. Discard draft handler
  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {}
    setName("");
    setDescription("");
    setContestType("standard");
    setSelectedExistingContests([]);
    setWikiDbName("bnwiki");
    setWikiURL("https://bn.wikipedia.org");
    setWikiLang("bn");
    setWikiTZ("UTC");
    setStartDate(getBeginningOfDay("UTC"));
    setEndDate(calculateEndOfDay(getBeginningOfDay("UTC"), 30));
    setHasMinWords(false);
    setMinWords(300);
    setHasMinBytes(false);
    setMinBytes(3000);
    setHasMinRefs(false);
    setMinRefs(1);
    setMustBeCreator(true);
    setNoRedirect(true);
    setNoDisambig(true);
    setMainspaceOnly(true);
    setCreatedInWindow(true);
    setCustomCreationStart("");
    setCustomCreationEnd("");
    setRankByWords(false);
    setJuries([]);
    setDistributeJuryQueue(false);
    setAddTalkTemplate(false);
    setTalkTemplateName("");
    setHasDraft(false);
    setDraftLastSaved(null);
    toast.success(t("feather-draft-discarded"));
  };

  const applyDuration = (days: number) => {
    setEndDate(calculateEndOfDay(startDate, days));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      const msg = t("feather-create-name-required");
      setError(msg);
      toast.error(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.getElementById("contest-name-input")?.focus();
      return;
    }

    const isUmbrella = contestType === "umbrella";
    if (isUmbrella && selectedExistingContests.length === 0) {
      const msg = t("feather-campaign-requires-one-comp", "Please select at least one existing competition for this multi-community campaign.");
      setError(msg);
      toast.error(msg);
      document.getElementById("participating-competitions-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: CreateContestPayload = {
      name: name.trim(),
      description: description.trim(),
      wiki_dbname: isUmbrella ? (selectedExistingContests[0]?.wiki_dbname || "meta") : (wikiDbName.trim() || "bnwiki"),
      wiki_url: isUmbrella ? (selectedExistingContests[0]?.wiki_url || "") : (wikiURL.trim() || "https://bn.wikipedia.org"),
      wiki_lang: isUmbrella ? (selectedExistingContests[0]?.wiki_lang || "en") : (wikiLang.trim() || "bn"),
      wiki_tz: wikiTZ.trim() || "UTC",
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      is_umbrella: isUmbrella,
      existing_contest_codes: isUmbrella ? selectedExistingContests.map((c) => c.code) : undefined,
      existing_contest_ids: isUmbrella ? selectedExistingContests.map((c) => c.id) : undefined,
      rule_must_be_creator: isUmbrella ? false : mustBeCreator,
      rule_no_redirect: isUmbrella ? false : noRedirect,
      rule_no_disambig: isUmbrella ? false : noDisambig,
      rule_mainspace_only: isUmbrella ? false : mainspaceOnly,
      rule_created_in_window: isUmbrella ? false : createdInWindow,
      custom_creation_start_date:
        !isUmbrella && !createdInWindow && customCreationStart
          ? new Date(customCreationStart).toISOString()
          : undefined,
      custom_creation_end_date:
        !isUmbrella && !createdInWindow && customCreationEnd
          ? new Date(customCreationEnd).toISOString()
          : undefined,
      min_bytes: isUmbrella ? 0 : (hasMinBytes ? Number(minBytes) || 0 : 0),
      min_words: isUmbrella ? 0 : (hasMinWords ? Number(minWords) || 0 : 0),
      min_refs: isUmbrella ? 0 : (hasMinRefs ? Number(minRefs) || 0 : 0),
      max_submissions_per_user: 0,
      rank_by_words: rankByWords,
      add_talk_template: isUmbrella ? false : addTalkTemplate,
      talk_template_name: isUmbrella ? "" : (addTalkTemplate ? talkTemplateName.trim() : ""),
      distribute_jury_queue: isUmbrella ? false : distributeJuryQueue,
      juries: isUmbrella ? [] : juries.filter(Boolean),
    };

    try {
      const res = await createContest(payload);
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (e) {}
      setHasDraft(false);
      if (res.status === "pending_approval") {
        toast.info(t("feather-create-pending-success", name));
      } else {
        toast.success(t("feather-create-success", name));
      }
      router.push(`/contests/${res.code}`);
    } catch (err: any) {
      const msg = err.message || "Failed to create contest";
      setError(msg);
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 max-w-4xl">
      {/* Header & Back Link */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="me-1.5 h-3.5 w-3.5 rtl:rotate-180" />
          {t("feather-nav-back-contests")}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t("feather-create-heading")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t("feather-create-subheading")}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-xs sm:text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      {!isOwner && (
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold block mb-0.5">Admin Review Notice:</strong>
            {t("feather-contest-create-pending-notice")}
          </div>
        </div>
      )}

      {/* Autosaved Draft Status Banner (Mobile Compatible) */}
      {hasDraft && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:px-3.5 sm:py-2 rounded-lg bg-muted/40 border border-border/70 text-xs shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium text-foreground truncate">
              {t("feather-draft-autosaved")}
            </span>
            {draftLastSaved && (
              <span className="text-[11px] text-muted-foreground/80 font-mono hidden sm:inline">
                • {new Date(draftLastSaved).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="text-xs text-destructive hover:underline cursor-pointer flex items-center gap-1 font-medium shrink-0 ml-auto"
          >
            <Trash2 className="h-3 w-3" />
            <span>{t("feather-draft-discard")}</span>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Section 1: Contest Details & Schedule */}
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
              id="contest-name-input"
              label={`${t("feather-create-name-label")} *`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              required
            />

            {/* Description & Rules */}
            <FloatingTextarea
              label={t("feather-create-desc-label")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />

            {/* Contest Type: Standard vs Multi-Community Campaign */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Contest Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setContestType("standard")}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    contestType === "standard"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-border/80 bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-md ${contestType === "standard" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <span>{t("feather-contest-type-standard")}</span>
                        {contestType === "standard" && (
                          <CheckCircle className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {t("feather-contest-type-desc-standard")}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setContestType("umbrella")}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    contestType === "umbrella"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-border/80 bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-md ${contestType === "umbrella" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <span>{t("feather-contest-type-umbrella")}</span>
                        {contestType === "umbrella" && (
                          <CheckCircle className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {t("feather-contest-type-desc-umbrella")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Wiki & Timeframe Sub-Section */}
            <div className="pt-2 border-t border-border/60 space-y-3.5">
              {contestType === "standard" ? (
                /* Standard Mode: Single Wiki Target (2/3 width) & Timezone (1/3 width) */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <WikiSelector
                      wikiDbName={wikiDbName}
                      wikiURL={wikiURL}
                      wikiLang={wikiLang}
                      onChange={(data) => {
                        setWikiDbName(data.dbname);
                        setWikiURL(data.url);
                        setWikiLang(data.lang);
                      }}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <TimezoneSelector
                      value={wikiTZ}
                      onChange={(tz) => {
                        setWikiTZ(tz);
                      }}
                      label={t("feather-create-wiki-tz-label")}
                    />
                  </div>
                </div>
              ) : (
                /* Multi-Community Campaign: Select Existing Standalone Competitions */
                <div id="participating-competitions-section" className="space-y-4 rounded-xl border border-border/80 bg-muted/10 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("feather-campaign-select-existing-title", String(selectedExistingContests.length))}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("feather-campaign-select-existing-hint")}
                      </p>
                    </div>
                    <div className="w-full sm:w-auto">
                      <TimezoneSelector
                        value={wikiTZ}
                        onChange={(tz) => setWikiTZ(tz)}
                        label={t("feather-create-wiki-tz-label")}
                      />
                    </div>
                  </div>

                  {/* Search & Project/Language Filters Toolbar (All Projects & All Languages) */}
                  <div className="space-y-2.5 bg-card p-3 rounded-lg border border-border/60 shadow-2xs">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {/* Search Input */}
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <input
                          type="text"
                          value={compSearch}
                          onChange={(e) => setCompSearch(e.target.value)}
                          placeholder={t("feather-campaign-link-search-placeholder", "Search ongoing competitions by name, code, or wiki...")}
                          className="w-full h-8 pl-8 pr-7 rounded-md border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        {compSearch ? (
                          <button
                            type="button"
                            onClick={() => setCompSearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        ) : isLoadingAvailable ? (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : null}
                      </div>

                      {/* Dropdown Filters: All Projects & All Languages */}
                      <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
                        {/* All Projects Filter Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-md border border-border/70 hover:bg-muted/80 transition-colors shadow-2xs select-none outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer bg-background text-foreground"
                            aria-label={t("feather-filter-project")}
                          >
                            {selectedProject === "all" ? (
                              <>
                                <img
                                  src="/icons/projects/wikimedia.svg"
                                  alt=""
                                  className="h-3.5 w-3.5 object-contain opacity-80 shrink-0"
                                />
                                <span>{t("feather-filter-all-projects")}</span>
                              </>
                            ) : (
                              (() => {
                                const meta = getProjectMeta(selectedProject);
                                const label = t(`feather-project-${meta.id}`) || (locale === "bn" ? meta.nativeName : meta.name);
                                return (
                                  <>
                                    <img
                                      src={meta.icon}
                                      alt=""
                                      className="h-3.5 w-3.5 object-contain shrink-0"
                                      onError={(e) => {
                                        e.currentTarget.src = "/icons/projects/wikipedia.svg";
                                      }}
                                    />
                                    <span className="font-semibold text-foreground truncate max-w-[95px]">{label}</span>
                                  </>
                                );
                              })()
                            )}
                            <ChevronDown className="h-3 w-3 opacity-60 ms-0.5 shrink-0" />
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="start" className="w-48 p-1 rounded-lg shadow-md border bg-popover z-50">
                            <DropdownMenuItem
                              onClick={() => setSelectedProject("all")}
                              className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md"
                            >
                              <div className="flex items-center gap-2">
                                <img
                                  src="/icons/projects/wikimedia.svg"
                                  alt=""
                                  className="h-3.5 w-3.5 object-contain shrink-0"
                                />
                                <span className={selectedProject === "all" ? "font-bold text-foreground" : "text-muted-foreground"}>
                                  {t("feather-filter-all-projects")}
                                </span>
                              </div>
                              {selectedProject === "all" && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1" />

                            {uniqueProjects.map((p) => {
                              const meta = getProjectMeta(p);
                              const isSelected = selectedProject === p;
                              const label = t(`feather-project-${meta.id}`) || (locale === "bn" ? meta.nativeName : meta.name);
                              return (
                                <DropdownMenuItem
                                  key={p}
                                  onClick={() => setSelectedProject(p)}
                                  className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md"
                                >
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={meta.icon}
                                      alt=""
                                      className="h-3.5 w-3.5 object-contain shrink-0"
                                      onError={(e) => {
                                        e.currentTarget.src = "/icons/projects/wikipedia.svg";
                                      }}
                                    />
                                    <span className={isSelected ? "font-bold text-foreground" : "text-muted-foreground"}>
                                      {label}
                                    </span>
                                  </div>
                                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* All Languages Filter Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-md border border-border/70 hover:bg-muted/80 transition-colors shadow-2xs select-none outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer bg-background text-foreground"
                            aria-label={t("feather-filter-language")}
                          >
                            <CodexLanguageIcon className="h-3.5 w-3.5 opacity-80 shrink-0" />
                            {selectedLanguage === "all" ? (
                              <span>{t("feather-filter-all-languages")}</span>
                            ) : (
                              (() => {
                                const langName = getLanguageName(selectedLanguage, locale);
                                return (
                                  <span className="font-semibold text-foreground truncate max-w-[95px]">
                                    {langName} ({selectedLanguage.toUpperCase()})
                                  </span>
                                );
                              })()
                            )}
                            <ChevronDown className="h-3 w-3 opacity-60 ms-0.5 shrink-0" />
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="start" className="w-48 p-1 rounded-lg shadow-md border bg-popover z-50 max-h-60 overflow-y-auto">
                            <DropdownMenuItem
                              onClick={() => setSelectedLanguage("all")}
                              className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md"
                            >
                              <span className={selectedLanguage === "all" ? "font-bold text-foreground" : "text-muted-foreground"}>
                                {t("feather-filter-all-languages")}
                              </span>
                              {selectedLanguage === "all" && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1" />

                            {uniqueLanguages.map((langCode) => {
                              const isSelected = selectedLanguage === langCode;
                              const langName = getLanguageName(langCode, locale);
                              return (
                                <DropdownMenuItem
                                  key={langCode}
                                  onClick={() => setSelectedLanguage(langCode)}
                                  className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={isSelected ? "font-bold text-foreground" : "text-muted-foreground"}>
                                      {langName}
                                    </span>
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                      ({langCode})
                                    </span>
                                  </div>
                                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Reset Filters Shortcut */}
                        {(selectedProject !== "all" || selectedLanguage !== "all" || compSearch) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProject("all");
                              setSelectedLanguage("all");
                              setCompSearch("");
                            }}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Reset filters"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Available Contests Picker List (Only Ongoing Comps) */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-border/40 rounded-md border border-border/60 bg-background/50">
                      {filteredAvailableContests.length === 0 ? (
                        <div className="py-5 text-center text-xs text-muted-foreground">
                          {t("feather-campaign-no-avail-contests", "No standalone ongoing competitions found.")}
                        </div>
                      ) : (
                        filteredAvailableContests.map((c) => {
                          const isAlreadyAdded = selectedExistingContests.some((sel) => sel.code === c.code);
                          return (
                            <div
                              key={c.code}
                              className="flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors text-xs gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Ongoing" />
                                  <span className="font-semibold text-foreground truncate">{c.name}</span>
                                  <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-4">
                                    {c.code}
                                  </Badge>
                                  <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-4 uppercase">
                                    {c.wiki_dbname}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(c.start_date).toLocaleDateString()} – {new Date(c.end_date).toLocaleDateString()}
                                  </span>
                                  {c.total_articles > 0 && (
                                    <span className="text-[10px] text-primary/80 font-medium">
                                      {c.total_articles} articles
                                    </span>
                                  )}
                                </div>
                              </div>

                              <Button
                                type="button"
                                variant={isAlreadyAdded ? "ghost" : "outline"}
                                size="sm"
                                disabled={isAlreadyAdded}
                                onClick={() => handleAddExistingContest(c)}
                                className={`h-6.5 text-xs px-2.5 shrink-0 ${
                                  isAlreadyAdded
                                    ? "text-muted-foreground cursor-default"
                                    : "cursor-pointer text-primary border-primary/40 hover:bg-primary/10"
                                }`}
                              >
                                {isAlreadyAdded ? (
                                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle className="h-3 w-3" />
                                    {t("feather-campaign-already-added", "Added")}
                                  </span>
                                ) : (
                                  <span>+ {t("feather-campaign-link-btn", "Add")}</span>
                                )}
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Selected Competitions List */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Selected Competitions ({selectedExistingContests.length}):
                    </div>

                    {selectedExistingContests.length === 0 ? (
                      <div className="text-center py-6 px-4 text-xs text-muted-foreground border border-dashed rounded-lg bg-card/40">
                        {t("feather-campaign-no-comps-selected")}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedExistingContests.map((c, idx) => (
                          <div
                            key={c.code}
                            className="p-3 rounded-lg border border-border/80 bg-card shadow-2xs flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-foreground truncate">{c.name}</span>
                                  <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-4">
                                    {c.code}
                                  </Badge>
                                  <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-4 uppercase">
                                    {c.wiki_dbname}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 h-4 capitalize ${
                                      c.status === "active"
                                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {c.status}
                                  </Badge>
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                  {new Date(c.start_date).toLocaleDateString()} – {new Date(c.end_date).toLocaleDateString()}
                                  {c.total_articles > 0 && ` • ${c.total_articles} articles`}
                                </div>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                              onClick={() => handleRemoveExistingContest(c.code)}
                              title="Remove competition"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Row 2: Unified Date Range Bar & Inline Presets */}
              <div className="rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/30 transition-colors p-2.5 sm:px-3 sm:py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {/* Start Date & Time */}
                  <DateTimePicker
                    value={startDate}
                    onChange={setStartDate}
                    label="Start"
                  />

                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline shrink-0 rtl:rotate-180" />

                  {/* End Date & Time */}
                  <DateTimePicker
                    value={endDate}
                    onChange={setEndDate}
                    label="End"
                    isEnd={true}
                  />
                </div>

                {/* Inline Quick Duration Helpers */}
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Qualification & Eligibility Rules (Standard only; Multi-Community uses autonomous local rules) */}
        {contestType === "standard" ? (
          <Card className="border-border shadow-2xs relative z-20 overflow-visible">
          <CardHeader className="py-3 px-4 sm:px-6 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary shrink-0" />
              <span>{t("feather-create-sec-rules")}</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 pt-4 px-4 sm:px-6 pb-5">
            {/* 3 Optional Threshold Cards with Checkbox Pop-ups */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* 1. Minimum Words Card */}
              <div
                className={`p-3 rounded-lg border transition-all duration-150 ${
                  hasMinWords
                    ? "bg-card border-primary/40 shadow-2xs"
                    : "bg-muted/15 border-border/70 hover:bg-muted/25"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <Switch
                      checked={hasMinWords}
                      onCheckedChange={setHasMinWords}
                    />
                    <span className="text-xs font-semibold text-foreground">
                      {t("feather-create-min-words-label")}
                    </span>
                  </label>

                  {hasMinWords ? (
                    <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0 h-5">
                      {minWords} words
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {t("feather-create-opt-no-limit")}
                    </span>
                  )}
                </div>

                {hasMinWords ? (
                  <div className="space-y-2 pt-1 animate-in fade-in-0 duration-150">
                    <FloatingInput
                      type="number"
                      min={1}
                      label={t("feather-create-min-words-label")}
                      value={minWords}
                      onChange={(e) => setMinWords(Math.max(1, parseInt(e.target.value) || 0))}
                      className="h-9 text-xs"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground font-medium">Quick:</span>
                      {[50, 150, 300, 500].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setMinWords(val)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                            minWords === val
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {val}w
                        </button>
                      ))}
                    </div>
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
                  hasMinBytes
                    ? "bg-card border-primary/40 shadow-2xs"
                    : "bg-muted/15 border-border/70 hover:bg-muted/25"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <Switch
                      checked={hasMinBytes}
                      onCheckedChange={setHasMinBytes}
                    />
                    <span className="text-xs font-semibold text-foreground">
                      {t("feather-create-min-bytes-label")}
                    </span>
                  </label>

                  {hasMinBytes ? (
                    <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0 h-5">
                      {t("feather-review-preview-bytes", minBytes)}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {t("feather-create-opt-no-limit")}
                    </span>
                  )}
                </div>

                {hasMinBytes ? (
                  <div className="space-y-2 pt-1 animate-in fade-in-0 duration-150">
                    <FloatingInput
                      type="number"
                      min={1}
                      label={t("feather-create-min-bytes-label")}
                      value={minBytes}
                      onChange={(e) => setMinBytes(Math.max(1, parseInt(e.target.value) || 0))}
                      className="h-9 text-xs"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground font-medium">Quick:</span>
                      {[300, 1000, 3000, 5000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setMinBytes(val)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                            minBytes === val
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {val >= 1000 ? `${val / 1000}k` : val}b
                        </button>
                      ))}
                    </div>
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
                  hasMinRefs
                    ? "bg-card border-primary/40 shadow-2xs"
                    : "bg-muted/15 border-border/70 hover:bg-muted/25"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <Switch
                      checked={hasMinRefs}
                      onCheckedChange={setHasMinRefs}
                    />
                    <span className="text-xs font-semibold text-foreground">
                      {t("feather-create-min-refs-label")}
                    </span>
                  </label>

                  {hasMinRefs ? (
                    <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0 h-5">
                      {minRefs} ref{minRefs > 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {t("feather-create-opt-no-limit")}
                    </span>
                  )}
                </div>

                {hasMinRefs ? (
                  <div className="space-y-2 pt-1 animate-in fade-in-0 duration-150">
                    <FloatingInput
                      type="number"
                      min={1}
                      label={t("feather-create-min-refs-label")}
                      value={minRefs}
                      onChange={(e) => setMinRefs(Math.max(1, parseInt(e.target.value) || 0))}
                      className="h-9 text-xs"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground font-medium">Quick:</span>
                      {[1, 2, 3, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setMinRefs(val)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                            minRefs === val
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {val} ref
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    {t("feather-create-no-refs-hint")}
                  </p>
                )}
              </div>
            </div>

            {/* Page Eligibility Checks Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
              <label className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">{t("feather-create-rule-creator")}</div>
                  <div className="text-[11px] text-muted-foreground">{t("feather-create-rule-creator-hint")}</div>
                </div>
                <Switch
                  checked={mustBeCreator}
                  onCheckedChange={setMustBeCreator}
                  className="shrink-0 mt-0.5"
                />
              </label>

              <label className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">{t("feather-create-rule-redirect")}</div>
                  <div className="text-[11px] text-muted-foreground">{t("feather-create-rule-redirect-hint")}</div>
                </div>
                <Switch
                  checked={noRedirect}
                  onCheckedChange={setNoRedirect}
                  className="shrink-0 mt-0.5"
                />
              </label>

              <label className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">{t("feather-create-rule-disambig")}</div>
                  <div className="text-[11px] text-muted-foreground">{t("feather-create-rule-disambig-hint")}</div>
                </div>
                <Switch
                  checked={noDisambig}
                  onCheckedChange={setNoDisambig}
                  className="shrink-0 mt-0.5"
                />
              </label>

              <label className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none">
                <div className="space-y-0.5 flex-1 pr-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {t("feather-create-rule-window")}
                    </span>
                    {!createdInWindow && (
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {t("feather-create-opt-no-limit")}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {createdInWindow
                      ? t("feather-create-rule-window-hint")
                      : t("feather-create-rule-window-relaxed-hint")}
                  </div>
                </div>
                <Switch
                  checked={createdInWindow}
                  onCheckedChange={setCreatedInWindow}
                  className="shrink-0 mt-0.5"
                />
              </label>
            </div>

            {/* Optional Article Creation Timeline Panel (appears when strict creation window is unchecked) */}
            {!createdInWindow && (
              <div className="rounded-lg border border-primary/30 bg-muted/20 p-3 sm:px-4 sm:py-3 space-y-3 animate-in fade-in-0 duration-200 shadow-2xs overflow-visible">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      {t("feather-create-custom-timeline-label")}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {customCreationStart || customCreationEnd
                        ? t("feather-create-custom-timeline-active-hint")
                        : t("feather-create-custom-timeline-optional-hint")}
                    </p>
                  </div>
                </div>

                {/* Timeline Selector Controls */}
                <div className="space-y-2.5 pt-2.5 border-t border-border/50">
                  {/* Row 1: Date Range Pickers (side-by-side with arrow in-between) */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 text-xs">
                    <DateTimePicker
                      value={customCreationStart}
                      onChange={setCustomCreationStart}
                      label={t("feather-create-custom-timeline-from")}
                      placeholder="Any start date (Optional)"
                      allowClear={true}
                    />
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline-block shrink-0 rtl:rotate-180" />
                    <DateTimePicker
                      value={customCreationEnd}
                      onChange={setCustomCreationEnd}
                      label={t("feather-create-custom-timeline-to")}
                      placeholder="Any end date (Optional)"
                      allowClear={true}
                      isEnd={true}
                    />
                  </div>

                  {/* Row 2: Quick Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mr-1">
                      Quick:
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCustomCreationStart("");
                        setCustomCreationEnd(startDate);
                      }}
                      className="h-6 text-[11px] px-2.5 font-medium bg-background hover:bg-muted border-border shadow-2xs cursor-pointer"
                    >
                      {t("feather-create-custom-timeline-quick-before")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const year = new Date(startDate).getFullYear();
                        setCustomCreationStart(`${year}-01-01T00:00`);
                        setCustomCreationEnd(`${year}-12-31T23:59`);
                      }}
                      className="h-6 text-[11px] px-2.5 font-medium bg-background hover:bg-muted border-border shadow-2xs cursor-pointer"
                    >
                      {t("feather-create-custom-timeline-quick-year", String(new Date(startDate).getFullYear()))}
                    </Button>
                    {(customCreationStart || customCreationEnd) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCustomCreationStart("");
                          setCustomCreationEnd("");
                        }}
                        className="h-6 text-[11px] px-2 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer ml-auto sm:ml-0"
                      >
                        <X className="h-3 w-3 mr-1" />
                        {t("feather-create-custom-timeline-quick-clear")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

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
                  onClick={() => setRankByWords(false)}
                  className={`px-2.5 py-1 rounded-sm text-xs transition-colors cursor-pointer ${
                    !rankByWords
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("feather-create-rank-by-articles")}
                </button>
                <button
                  type="button"
                  onClick={() => setRankByWords(true)}
                  className={`px-2.5 py-1 rounded-sm text-xs transition-colors cursor-pointer ${
                    rankByWords
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
      ) : (
        <Card className="border-border/70 bg-muted/20 shadow-2xs">
          <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">
                {t("feather-campaign-rules-note-title")}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("feather-campaign-rules-note-desc")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Jury Administration & Automation (Standard single-wiki contests only) */}
      {contestType === "standard" && (
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
              value={juries}
              onChange={setJuries}
              wikiUrl={wikiURL}
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
                  onClick={() => setDistributeJuryQueue(false)}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    !distributeJuryQueue
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">
                      {t("feather-create-jury-distribution-shared")}
                    </span>
                    <Badge variant={!distributeJuryQueue ? "default" : "outline"} className="text-[10px]">
                      {t("feather-create-jury-distribution-recommended")}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {t("feather-create-jury-distribution-shared-desc")}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDistributeJuryQueue(true)}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    distributeJuryQueue
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/30"
                  }`}
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
            <div className="pt-3 border-t border-border/60 space-y-3">
              <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    <span>{t("feather-create-add-template")}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t("feather-create-add-template-hint")}
                  </div>
                </div>
                <Switch
                  checked={addTalkTemplate}
                  onCheckedChange={setAddTalkTemplate}
                />
              </label>

              {addTalkTemplate && (
                <div className="pt-2 animate-in fade-in-0 duration-150">
                  <TalkTemplateBuilder
                    value={talkTemplateName}
                    onChange={setTalkTemplateName}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

        {/* Form Action Controls (Mobile Compatible) */}
        <div className="pt-4 border-t border-border">
          {error && (
            <p className="text-xs text-destructive font-medium mb-3 text-right animate-in fade-in-0">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              {hasDraft && (
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="text-xs text-destructive hover:underline cursor-pointer flex items-center gap-1 font-medium justify-center sm:justify-start py-1"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>{t("feather-draft-discard")}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 justify-end">
              <Link
                href="/"
                className="flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors cursor-pointer"
              >
                {t("feather-create-cancel")}
              </Link>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial text-xs font-semibold cursor-pointer shadow-xs min-w-[130px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin me-1.5" />
                    {t("feather-create-creating-btn")}
                  </>
                ) : (
                  t("feather-create-submit-btn")
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
