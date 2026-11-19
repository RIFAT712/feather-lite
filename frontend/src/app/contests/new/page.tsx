"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nContext";
import { createContest, fetchMe, CreateContestPayload, CommunityRuleConfig } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FloatingInput, FloatingTextarea } from "@/components/ui/floating-input";
import { Badge } from "@/components/ui/badge";
import WikiSelector from "@/components/contests/WikiSelector";
import TimezoneSelector from "@/components/contests/TimezoneSelector";
import { UserTagInput } from "@/components/contests/UserTagInput";
import TalkTemplateBuilder from "@/components/contests/TalkTemplateBuilder";
import DateTimePicker from "@/components/ui/date-time-picker";
import { 
  ArrowLeft, ArrowRight, Shield, ShieldAlert, Globe, BookOpen, CheckCircle, 
  Clock, Sparkles, UserCheck, Layers, Loader2, Calendar, X, Users
} from "lucide-react";
import { toast } from "sonner";
import { 
  getBeginningOfDay, calculateEndOfDay, 
  getTimezoneOffsetLabel
} from "@/lib/time";

export default function NewContestPage() {
  const { t, n } = useI18n();
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

  // Participating communities for Multi-Community Campaign
  const [participatingWikis, setParticipatingWikis] = useState<CommunityRuleConfig[]>([
    {
      wiki_dbname: "bnwiki",
      wiki_url: "https://bn.wikipedia.org",
      wiki_lang: "bn",
      name: "বাংলা উইকিপিডিয়া",
      min_words: 300,
      min_bytes: 3000,
      min_refs: 1,
      rule_must_be_creator: true,
      juries: [],
    },
    {
      wiki_dbname: "enwiki",
      wiki_url: "https://en.wikipedia.org",
      wiki_lang: "en",
      name: "English Wikipedia",
      min_words: 300,
      min_bytes: 3000,
      min_refs: 1,
      rule_must_be_creator: true,
      juries: [],
    },
  ]);

  // Candidate wiki state to add
  const [candidateWiki, setCandidateWiki] = useState({
    dbname: "hiwiki",
    url: "https://hi.wikipedia.org",
    lang: "hi",
    name: "हिन्दी विकिपीडिया",
  });

  const handleAddCommunity = () => {
    if (!candidateWiki.dbname) return;
    if (participatingWikis.some((w) => w.wiki_dbname === candidateWiki.dbname)) {
      toast.error(`${candidateWiki.dbname} is already added`);
      return;
    }
    setParticipatingWikis((prev) => [
      ...prev,
      {
        wiki_dbname: candidateWiki.dbname,
        wiki_url: candidateWiki.url,
        wiki_lang: candidateWiki.lang,
        name: candidateWiki.name || candidateWiki.dbname,
        min_words: hasMinWords ? Number(minWords) || 300 : 0,
        min_bytes: hasMinBytes ? Number(minBytes) || 3000 : 0,
        min_refs: hasMinRefs ? Number(minRefs) || 1 : 0,
        rule_must_be_creator: mustBeCreator,
        juries: [],
      },
    ]);
    toast.success(`Added ${candidateWiki.dbname}`);
  };

  const handleRemoveCommunity = (dbname: string) => {
    setParticipatingWikis((prev) => prev.filter((w) => w.wiki_dbname !== dbname));
  };

  const handleUpdateCommunityRule = (dbname: string, updates: Partial<CommunityRuleConfig>) => {
    setParticipatingWikis((prev) =>
      prev.map((w) => (w.wiki_dbname === dbname ? { ...w, ...updates } : w))
    );
  };

  const handleAddPresetIndic = () => {
    const indic: CommunityRuleConfig[] = [
      { wiki_dbname: "bnwiki", wiki_url: "https://bn.wikipedia.org", wiki_lang: "bn", name: "বাংলা উইকিপিডিয়া", min_words: 300, min_bytes: 3000, rule_must_be_creator: true },
      { wiki_dbname: "hiwiki", wiki_url: "https://hi.wikipedia.org", wiki_lang: "hi", name: "हिन्दी विकिपीडिया", min_words: 300, min_bytes: 3000, rule_must_be_creator: true },
      { wiki_dbname: "tawiki", wiki_url: "https://ta.wikipedia.org", wiki_lang: "ta", name: "தமிழ் விக்கிப்பீடியா", min_words: 300, min_bytes: 3000, rule_must_be_creator: true },
      { wiki_dbname: "tewiki", wiki_url: "https://te.wikipedia.org", wiki_lang: "te", name: "తెలుగు వికీపీడియా", min_words: 300, min_bytes: 3000, rule_must_be_creator: true },
      { wiki_dbname: "mrwiki", wiki_url: "https://mr.wikipedia.org", wiki_lang: "mr", name: "मराठी विकिपीडिया", min_words: 300, min_bytes: 3000, rule_must_be_creator: true },
    ];
    setParticipatingWikis((prev) => {
      const existing = new Set(prev.map((w) => w.wiki_dbname));
      const newItems = indic.filter((w) => !existing.has(w.wiki_dbname));
      return [...prev, ...newItems];
    });
    toast.success("Added Indic wikis cluster");
  };

  const handleAddPresetTop = () => {
    const top: CommunityRuleConfig[] = [
      { wiki_dbname: "enwiki", wiki_url: "https://en.wikipedia.org", wiki_lang: "en", name: "English Wikipedia", min_words: 300, min_bytes: 3000, rule_must_be_creator: true },
      { wiki_dbname: "eswiki", wiki_url: "https://es.wikipedia.org", wiki_lang: "es", name: "Wikipedia en español", min_words: 300, min_bytes: 3000, rule_must_be_creator: true },
      { wiki_dbname: "frwiki", wiki_url: "https://fr.wikipedia.org", wiki_lang: "fr", name: "Wikipédia en français", min_words: 300, min_bytes: 3000, rule_must_be_creator: true },
      { wiki_dbname: "dewiki", wiki_url: "https://de.wikipedia.org", wiki_lang: "de", name: "Deutsch Wikipedia", min_words: 300, min_bytes: 3000, rule_must_be_creator: true },
      { wiki_dbname: "jawiki", wiki_url: "https://ja.wikipedia.org", wiki_lang: "ja", name: "日本語版ウィキペディア", min_words: 300, min_bytes: 3000, rule_must_be_creator: true },
    ];
    setParticipatingWikis((prev) => {
      const existing = new Set(prev.map((w) => w.wiki_dbname));
      const newItems = top.filter((w) => !existing.has(w.wiki_dbname));
      return [...prev, ...newItems];
    });
    toast.success("Added global top wikis cluster");
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

  const applyDuration = (days: number) => {
    setEndDate(calculateEndOfDay(startDate, days));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("feather-create-name-required"));
      return;
    }

    const isUmbrella = contestType === "umbrella";
    if (isUmbrella && participatingWikis.length === 0) {
      setError(t("feather-campaign-no-communities"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: CreateContestPayload = {
      name: name.trim(),
      description: description.trim(),
      wiki_dbname: isUmbrella ? (participatingWikis[0]?.wiki_dbname || "bnwiki") : (wikiDbName.trim() || "bnwiki"),
      wiki_url: isUmbrella ? (participatingWikis[0]?.wiki_url || "https://bn.wikipedia.org") : (wikiURL.trim() || "https://bn.wikipedia.org"),
      wiki_lang: isUmbrella ? (participatingWikis[0]?.wiki_lang || "bn") : (wikiLang.trim() || "bn"),
      wiki_tz: wikiTZ.trim() || "UTC",
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      is_umbrella: isUmbrella,
      participating_wikis: isUmbrella ? participatingWikis : undefined,
      rule_must_be_creator: mustBeCreator,
      rule_no_redirect: noRedirect,
      rule_no_disambig: noDisambig,
      rule_mainspace_only: mainspaceOnly,
      rule_created_in_window: createdInWindow,
      custom_creation_start_date:
        !createdInWindow && customCreationStart
          ? new Date(customCreationStart).toISOString()
          : undefined,
      custom_creation_end_date:
        !createdInWindow && customCreationEnd
          ? new Date(customCreationEnd).toISOString()
          : undefined,
      min_bytes: hasMinBytes ? Number(minBytes) || 0 : 0,
      min_words: hasMinWords ? Number(minWords) || 0 : 0,
      min_refs: hasMinRefs ? Number(minRefs) || 0 : 0,
      max_submissions_per_user: 0,
      rank_by_words: rankByWords,
      add_talk_template: addTalkTemplate,
      talk_template_name: talkTemplateName.trim(),
      distribute_jury_queue: distributeJuryQueue,
      juries: juries,
    };

    try {
      const res = await createContest(payload);
      if (res.status === "pending_approval") {
        toast.info(t("feather-create-pending-success", name));
      } else {
        toast.success(t("feather-create-success", name));
      }
      router.push(`/contests/${res.code}`);
    } catch (err: any) {
      setError(err.message || "Failed to create contest");
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

      <form onSubmit={handleSubmit} className="space-y-6">
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
              label={`${t("feather-create-name-label")} *`}
              value={name}
              onChange={(e) => setName(e.target.value)}
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
                /* Multi-Community Campaign: Community Manager with Autonomous Rules */
                <div className="space-y-4 rounded-xl border border-border/80 bg-muted/10 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("feather-campaign-manage-communities", participatingWikis.length)}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("feather-campaign-rule-autonomy-hint")}
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

                  {/* Preset Quick-Add Buttons */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-muted-foreground text-[11px] font-medium">Quick Clusters:</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2.5 cursor-pointer"
                      onClick={handleAddPresetIndic}
                    >
                      {t("feather-campaign-preset-indic")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2.5 cursor-pointer"
                      onClick={handleAddPresetTop}
                    >
                      {t("feather-campaign-preset-top")}
                    </Button>
                  </div>

                  {/* Add Community Picker Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 items-end bg-card p-3 rounded-lg border border-border/60">
                    <div className="md:col-span-3">
                      <WikiSelector
                        wikiDbName={candidateWiki.dbname}
                        wikiURL={candidateWiki.url}
                        wikiLang={candidateWiki.lang}
                        label="Select Community / Language Wiki to Add"
                        onChange={(data) => {
                          setCandidateWiki({
                            dbname: data.dbname,
                            url: data.url,
                            lang: data.lang,
                            name: data.nativeName || data.dbname,
                          });
                        }}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Button
                        type="button"
                        onClick={handleAddCommunity}
                        className="w-full h-11 text-xs cursor-pointer gap-1.5"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        <span>Add Community</span>
                      </Button>
                    </div>
                  </div>

                  {/* Added Participating Communities List */}
                  {participatingWikis.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg bg-card/50">
                      {t("feather-campaign-no-communities")}
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-1">
                      {participatingWikis.map((pw, idx) => (
                        <div
                          key={pw.wiki_dbname}
                          className="p-3.5 rounded-lg border border-border/80 bg-card shadow-2xs space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              <Badge variant="secondary" className="font-mono text-xs font-semibold">
                                {pw.wiki_dbname}
                              </Badge>
                              <span className="text-xs font-medium text-foreground">
                                {pw.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground uppercase font-mono">
                                ({pw.wiki_lang})
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                              onClick={() => handleRemoveCommunity(pw.wiki_dbname)}
                              title="Remove community"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Autonomous Local Rule Controls */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs border-t border-border/50">
                            <div>
                              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                                Min Words (Local)
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={pw.min_words ?? 300}
                                onChange={(e) =>
                                  handleUpdateCommunityRule(pw.wiki_dbname, {
                                    min_words: Number(e.target.value) || 0,
                                  })
                                }
                                className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                                Talk Page Template
                              </label>
                              <input
                                type="text"
                                placeholder="Template:WLC 2026"
                                value={pw.talk_template_name || ""}
                                onChange={(e) =>
                                  handleUpdateCommunityRule(pw.wiki_dbname, {
                                    talk_template_name: e.target.value,
                                  })
                                }
                                className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              />
                            </div>

                            <div className="pt-1">
                              <UserTagInput
                                label="Local Juries"
                                value={pw.juries || []}
                                onChange={(users) =>
                                  handleUpdateCommunityRule(pw.wiki_dbname, {
                                    juries: users,
                                  })
                                }
                                wikiUrl={pw.wiki_url}
                                placeholder="Add local jury..."
                                compact
                                labelBg="bg-card"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

        {/* Section 2: Qualification & Eligibility Rules */}
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
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasMinWords}
                      onChange={(e) => setHasMinWords(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
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
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasMinBytes}
                      onChange={(e) => setHasMinBytes(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
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
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasMinRefs}
                      onChange={(e) => setHasMinRefs(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
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
              <label className="flex items-start gap-3 p-2.5 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={mustBeCreator}
                  onChange={(e) => setMustBeCreator(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">{t("feather-create-rule-creator")}</div>
                  <div className="text-[11px] text-muted-foreground">{t("feather-create-rule-creator-hint")}</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-2.5 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={noRedirect}
                  onChange={(e) => setNoRedirect(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">{t("feather-create-rule-redirect")}</div>
                  <div className="text-[11px] text-muted-foreground">{t("feather-create-rule-redirect-hint")}</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-2.5 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={noDisambig}
                  onChange={(e) => setNoDisambig(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">{t("feather-create-rule-disambig")}</div>
                  <div className="text-[11px] text-muted-foreground">{t("feather-create-rule-disambig-hint")}</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-2.5 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={createdInWindow}
                  onChange={(e) => setCreatedInWindow(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
                <div className="space-y-0.5 flex-1">
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

        {/* Section 3: Jury Administration & Automation */}
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
              <label className="flex items-start gap-3 p-3 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={addTalkTemplate}
                  onChange={(e) => setAddTalkTemplate(e.target.checked)}
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

        {/* Form Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Link
            href="/"
            className="px-4 py-2 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors cursor-pointer"
          >
            {t("feather-create-cancel")}
          </Link>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="gap-2 text-xs font-medium cursor-pointer shadow-xs min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("feather-create-creating-btn")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t("feather-create-submit-btn")}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
