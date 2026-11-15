"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nContext";
import { createContest, CreateContestPayload } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FloatingInput, FloatingTextarea } from "@/components/ui/floating-input";
import { Badge } from "@/components/ui/badge";
import WikiSelector from "@/components/contests/WikiSelector";
import TimezoneSelector from "@/components/contests/TimezoneSelector";
import DateTimePicker from "@/components/ui/date-time-picker";
import { 
  ArrowLeft, ArrowRight, Shield, Globe, BookOpen, CheckCircle, 
  Clock, Sparkles, UserCheck, Layers, Loader2, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { 
  getBeginningOfDay, calculateEndOfDay, 
  getTimezoneOffsetLabel, fetchWikiSiteinfo 
} from "@/lib/time";

export default function NewContestPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State (NO custom code/slug input - automatically 4 random characters)
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  // Wiki Target (default Bengali Wiktionary)
  const [wikiDbName, setWikiDbName] = useState("bnwiktionary");
  const [wikiURL, setWikiURL] = useState("https://bn.wiktionary.org");
  const [wikiLang, setWikiLang] = useState("bn");
  const [wikiTZ, setWikiTZ] = useState("Asia/Dhaka");

  // Dates: always measure from beginning of today (00:00) to end of day (23:59) in contest timezone
  const [startDate, setStartDate] = useState(() => getBeginningOfDay("Asia/Dhaka"));
  const [endDate, setEndDate] = useState(() => calculateEndOfDay(getBeginningOfDay("Asia/Dhaka"), 30));

  // Fountain Rules
  const [minWords, setMinWords] = useState(50);
  const [minBytes, setMinBytes] = useState(300);
  const [minRefs, setMinRefs] = useState(0);
  const [maxSubmissions, setMaxSubmissions] = useState(0);
  const [mustBeCreator, setMustBeCreator] = useState(true);
  const [noRedirect, setNoRedirect] = useState(true);
  const [noDisambig, setNoDisambig] = useState(true);
  const [mainspaceOnly, setMainspaceOnly] = useState(true);
  const [createdInWindow, setCreatedInWindow] = useState(true);
  const [rankByWords, setRankByWords] = useState(false);

  // Juries
  const [juriesText, setJuriesText] = useState("");

  // Automation
  const [addTalkTemplate, setAddTalkTemplate] = useState(false);
  const [talkTemplateName, setTalkTemplateName] = useState("");

  const applyDuration = (days: number) => {
    setEndDate(calculateEndOfDay(startDate, days));
  };

  // Parse jury list for visual preview chips
  const juryChips = juriesText
    .split(/[,;\n]+/)
    .map((j) => j.trim())
    .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("feather-create-name-required"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: CreateContestPayload = {
      name: name.trim(),
      description: description.trim(),
      wiki_dbname: wikiDbName.trim() || "bnwiktionary",
      wiki_url: wikiURL.trim() || "https://bn.wiktionary.org",
      wiki_lang: wikiLang.trim() || "bn",
      wiki_tz: wikiTZ.trim() || "Asia/Dhaka",
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      rule_must_be_creator: mustBeCreator,
      rule_no_redirect: noRedirect,
      rule_no_disambig: noDisambig,
      rule_mainspace_only: mainspaceOnly,
      rule_created_in_window: createdInWindow,
      min_bytes: Number(minBytes) || 0,
      min_words: Number(minWords) || 0,
      min_refs: Number(minRefs) || 0,
      max_submissions_per_user: Number(maxSubmissions) || 0,
      rank_by_words: rankByWords,
      add_talk_template: addTalkTemplate,
      talk_template_name: talkTemplateName.trim(),
      juries: juryChips,
    };

    try {
      const res = await createContest(payload);
      toast.success(t("feather-create-success", name));
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
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
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

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono gap-1.5 px-2.5 py-1">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Auto 4-char code</span>
            </Badge>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-xs sm:text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: General Details */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              {t("feather-create-sec-general")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-1">
            {/* Google-Style Floating Label Input */}
            <FloatingInput
              label={`${t("feather-create-name-label")} *`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            {/* Google-Style Floating Label Textarea */}
            <FloatingTextarea
              label={t("feather-create-desc-label")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Section 2: Target Wiki & Timeframe */}
        <Card className="border-border shadow-2xs overflow-visible">
          <CardHeader className="py-3 px-4 sm:px-6">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary shrink-0" />
              <span>{t("feather-create-sec-wiki")}</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3.5 pt-1 px-4 sm:px-6 pb-4">
            {/* Row 1: Target Wiki (2/3 width) & Timezone (1/3 width) */}
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
                    // Prefill timezone directly from the Wikimedia database
                    const directTZ = data.timezone || (data.lang === "bn" ? "Asia/Dhaka" : "UTC");
                    setWikiTZ(directTZ);
                    const newStart = getBeginningOfDay(directTZ);
                    setStartDate(newStart);
                    setEndDate(calculateEndOfDay(newStart, 30));

                    // Also check live MediaWiki siteinfo database in background for overrides
                    if (data.url) {
                      fetchWikiSiteinfo(data.url).then((info) => {
                        if (info?.timezone && info.timezone !== "UTC") {
                          setWikiTZ(info.timezone);
                          const s = getBeginningOfDay(info.timezone);
                          setStartDate(s);
                          setEndDate(calculateEndOfDay(s, 30));
                        }
                      });
                    }
                  }}
                />
              </div>
              <div className="md:col-span-1">
                <TimezoneSelector
                  value={wikiTZ}
                  onChange={(tz) => {
                    setWikiTZ(tz);
                    const newStart = getBeginningOfDay(tz);
                    setStartDate(newStart);
                    setEndDate(calculateEndOfDay(newStart, 30));
                  }}
                  label={t("feather-create-wiki-tz-label")}
                />
              </div>
            </div>

            {/* Row 2: Unified Date Range Bar & Inline Presets (with Modern DateTimePickers) */}
            <div className="rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/30 transition-colors p-2.5 sm:px-3 sm:py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {/* Start Date & Time */}
                <DateTimePicker
                  value={startDate}
                  onChange={setStartDate}
                  label="Start"
                />

                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline shrink-0" />

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
          </CardContent>
        </Card>

        {/* Section 3: Fountain Qualification Rules */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              {t("feather-create-sec-rules")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 4 Google-Style Floating Threshold Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <FloatingInput
                type="number"
                min={0}
                label={t("feather-create-min-words-label")}
                value={minWords}
                onChange={(e) => setMinWords(parseInt(e.target.value) || 0)}
              />
              <FloatingInput
                type="number"
                min={0}
                label={t("feather-create-min-bytes-label")}
                value={minBytes}
                onChange={(e) => setMinBytes(parseInt(e.target.value) || 0)}
              />
              <FloatingInput
                type="number"
                min={0}
                label={t("feather-create-min-refs-label")}
                value={minRefs}
                onChange={(e) => setMinRefs(parseInt(e.target.value) || 0)}
              />
              <FloatingInput
                type="number"
                min={0}
                label={t("feather-create-max-submissions")}
                value={maxSubmissions}
                onChange={(e) => setMaxSubmissions(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
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
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">{t("feather-create-rule-window")}</div>
                  <div className="text-[11px] text-muted-foreground">{t("feather-create-rule-window-hint")}</div>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Jury Team Roster */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              {t("feather-create-sec-jury")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <FloatingInput
              label={t("feather-create-juries-label")}
              value={juriesText}
              onChange={(e) => setJuriesText(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              {t("feather-create-juries-hint")}
            </p>

            {/* Visual Chip Preview of Added Juries */}
            {juryChips.length > 0 && (
              <div className="pt-2">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Configured Jury Members ({juryChips.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {juryChips.map((jury, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="gap-1.5 px-2.5 py-1 text-xs font-medium"
                    >
                      <UserCheck className="h-3 w-3 text-primary" />
                      {jury}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 5: Talk-Page Automation */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              {t("feather-create-sec-automation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={addTalkTemplate}
                onChange={(e) => setAddTalkTemplate(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-foreground">
                  {t("feather-create-add-template")}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {t("feather-create-add-template-hint")}
                </div>
              </div>
            </label>

            {addTalkTemplate && (
              <div className="space-y-2 pt-2">
                <FloatingInput
                  label={t("feather-create-template-name")}
                  value={talkTemplateName}
                  onChange={(e) => setTalkTemplateName(e.target.value)}
                />
                {talkTemplateName && (
                  <p className="text-[11px] text-muted-foreground font-mono pl-1">
                    Preview syntax: <span className="text-primary font-semibold">{`{{${talkTemplateName}}}`}</span>
                  </p>
                )}
              </div>
            )}
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
