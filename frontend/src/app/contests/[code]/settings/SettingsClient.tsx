"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchContest,
  fetchMe,
  updateContest,
  deleteContest,
  AvailableContest,
  Contest,
  UpdateContestPayload,
  UserSession,
} from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { getProjectMeta } from "@/lib/wikis";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Layers,
  Save,
  Settings,
  Shield,
  Trash2,
  Users,
  AlertCircle,
  AlertTriangle,
  Trophy,
  FileCheck,
  AlignLeft,
  Check,
  Globe,
  ExternalLink,
} from "lucide-react";
import { FloatingInput, FloatingTextarea } from "@/components/ui/floating-input";
import { Switch } from "@/components/ui/switch";
import { UserTagInput } from "@/components/contests/UserTagInput";
import WikiSelector from "@/components/contests/WikiSelector";
import TimezoneSelector from "@/components/contests/TimezoneSelector";
import ContestModeSelector, { ContestMode } from "@/components/contests/ContestModeSelector";
import ParticipatingCompetitionsPicker from "@/components/contests/ParticipatingCompetitionsPicker";
import CustomCreationTimelinePanel from "@/components/contests/CustomCreationTimelinePanel";
import DateTimePicker from "@/components/ui/date-time-picker";
import TalkTemplateBuilder from "@/components/contests/TalkTemplateBuilder";
import TalkQueueMonitor from "@/components/contests/TalkQueueMonitor";
import { calculateEndOfDay, formatDateForPicker } from "@/lib/time";

interface SettingsClientProps {
  code: string;
  initialContest?: Contest | null;
  initialMe?: UserSession | null;
}

export default function SettingsClient({
  code,
  initialContest,
  initialMe,
}: SettingsClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, locale } = useI18n();

  // Load contest & current user
  const { data: contest } = useQuery<Contest | null>({
    queryKey: ["contest", code],
    queryFn: () => fetchContest(code),
    initialData: initialContest,
    initialDataUpdatedAt: 0,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: me } = useQuery<UserSession | null>({
    queryKey: ["me"],
    queryFn: fetchMe,
    initialData: initialMe,
    staleTime: 1000 * 60,
  });

  // Determine user permissions
  const isOrganizer = useMemo(() => {
    if (!me?.is_authenticated) return false;
    if (me.role === "owner" || me.role === "admin" || (me as any)?.is_owner || (me as any)?.is_admin) return true;
    if (contest?.created_by_id && me.user_id && contest.created_by_id === me.user_id) return true;
    const myLower = me.wiki_username?.trim().toLowerCase();
    if (myLower && contest?.created_by_username && contest.created_by_username.trim().toLowerCase() === myLower) return true;
    if (myLower && contest?.organizers?.some((o) => (o || "").trim().toLowerCase() === myLower)) return true;
    return false;
  }, [me, contest]);

  const isOwner = me?.role === "owner" || (me as any)?.is_owner;
  const isContestOrganizer = useMemo(() => {
    if (!me?.is_authenticated) return false;
    if (contest?.created_by_id && me.user_id && contest.created_by_id === me.user_id) return true;
    const myLower = me.wiki_username?.trim().toLowerCase();
    if (myLower && contest?.created_by_username && contest.created_by_username.trim().toLowerCase() === myLower) return true;
    if (myLower && contest?.organizers?.some((o) => (o || "").trim().toLowerCase() === myLower)) return true;
    return false;
  }, [me, contest]);
  const isCreator = Boolean(
    contest?.created_by_id && me?.user_id && contest.created_by_id === me.user_id
  ) || Boolean(
    contest?.created_by_username && me?.wiki_username && contest.created_by_username.trim().toLowerCase() === me.wiki_username.trim().toLowerCase()
  );

  // Form State
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOnwikiPageUrl, setEditOnwikiPageUrl] = useState("");
  const [editContestType, setEditContestType] = useState<ContestMode>("standard");
  const [selectedExistingContests, setSelectedExistingContests] = useState<AvailableContest[]>([]);
  const [editWikiDbName, setEditWikiDbName] = useState("bnwiki");
  const [editWikiURL, setEditWikiURL] = useState("https://bn.wikipedia.org");
  const [editWikiLang, setEditWikiLang] = useState("bn");
  const [editStatus, setEditStatus] = useState("active");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editTZ, setEditTZ] = useState("UTC");

  // Rule States
  const [hasEditMinWords, setHasEditMinWords] = useState(false);
  const [editMinWords, setEditMinWords] = useState<number | string>(300);
  const [hasEditMinBytes, setHasEditMinBytes] = useState(false);
  const [editMinBytes, setEditMinBytes] = useState<number | string>(3000);
  const [hasEditMinRefs, setHasEditMinRefs] = useState(false);
  const [editMinRefs, setEditMinRefs] = useState<number | string>(1);
  const [hasEditMaxSub, setHasEditMaxSub] = useState(false);
  const [editMaxSub, setEditMaxSub] = useState<number | string>(0);
  const [editRuleCreator, setEditRuleCreator] = useState(true);
  const [editRuleWindow, setEditRuleWindow] = useState(true);
  const [editCustomCreationStart, setEditCustomCreationStart] = useState("");
  const [editCustomCreationEnd, setEditCustomCreationEnd] = useState("");
  const [editRuleNoRedirect, setEditRuleNoRedirect] = useState(true);
  const [editRuleNoDisambig, setEditRuleNoDisambig] = useState(true);
  const [editRuleMainspace, setEditRuleMainspace] = useState(true);
  const [editRankByWords, setEditRankByWords] = useState(false);

  // Jury & Automation States
  const [editAddTalkTemplate, setEditAddTalkTemplate] = useState(false);
  const [editTalkTemplateName, setEditTalkTemplateName] = useState("");
  const [editDistributeJuryQueue, setEditDistributeJuryQueue] = useState(false);
  const [editJuries, setEditJuries] = useState<string[]>([]);
  const [editOrganizers, setEditOrganizers] = useState<string[]>([]);

  // Action status states
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingContest, setIsDeletingContest] = useState(false);

  const handleAddExistingContest = (item: AvailableContest) => {
    if (selectedExistingContests.some((c) => c.code === item.code)) {
      toast.error(t("feather-campaign-already-selected"));
      return;
    }
    setSelectedExistingContests((prev) => [...prev, item]);
    toast.success(t("feather-campaign-added-toast", item.name));
  };

  const handleRemoveExistingContest = (targetCode: string) => {
    setSelectedExistingContests((prev) => prev.filter((c) => c.code !== targetCode));
  };

  const applyDuration = (days: number) => {
    if (!editStartDate) return;
    setEditEndDate(calculateEndOfDay(editStartDate, days));
  };

  // Synchronize state when contest data loads
  useEffect(() => {
    if (contest) {
      setEditName(contest.name || "");
      setEditDescription(contest.description || "");
      setEditOnwikiPageUrl(contest.onwiki_page_url || "");
      setEditContestType(contest.is_umbrella ? "umbrella" : "standard");
      setSelectedExistingContests(
        (contest.sub_contests || []).map((sc) => ({
          id: sc.id,
          code: sc.code,
          name: sc.name,
          wiki_dbname: sc.wiki_dbname,
          wiki_url: sc.wiki_url,
          wiki_lang: sc.wiki_lang,
          start_date: sc.start_date,
          end_date: sc.end_date,
          status: sc.status,
          total_articles: sc.total_articles,
        }))
      );
      setEditWikiDbName(contest.wiki_dbname || "bnwiki");
      setEditWikiURL(contest.wiki_url || "https://bn.wikipedia.org");
      setEditWikiLang(contest.wiki_lang || "bn");
      setEditStatus(contest.status || "active");
      setEditStartDate(formatDateForPicker(contest.start_date, contest.wiki_tz || "UTC"));
      setEditEndDate(formatDateForPicker(contest.end_date, contest.wiki_tz || "UTC"));
      setEditTZ(contest.wiki_tz || "UTC");
      setHasEditMinWords((contest.min_words ?? 0) > 0);
      setEditMinWords(contest.min_words && contest.min_words > 0 ? contest.min_words : 300);
      setHasEditMinBytes((contest.min_bytes ?? 0) > 0);
      setEditMinBytes(contest.min_bytes && contest.min_bytes > 0 ? contest.min_bytes : 3000);
      setHasEditMinRefs((contest.min_refs ?? 0) > 0);
      setEditMinRefs(contest.min_refs && contest.min_refs > 0 ? contest.min_refs : 1);
      setHasEditMaxSub((contest.max_submissions_per_user ?? 0) > 0);
      setEditMaxSub(contest.max_submissions_per_user && contest.max_submissions_per_user > 0 ? contest.max_submissions_per_user : 1);
      setEditRuleCreator(contest.rule_must_be_creator ?? true);
      setEditRuleWindow(contest.rule_created_in_window ?? true);
      setEditCustomCreationStart(
        contest.custom_creation_start_date
          ? formatDateForPicker(contest.custom_creation_start_date, contest.wiki_tz || "UTC")
          : ""
      );
      setEditCustomCreationEnd(
        contest.custom_creation_end_date
          ? formatDateForPicker(contest.custom_creation_end_date, contest.wiki_tz || "UTC")
          : ""
      );
      setEditRuleNoRedirect(contest.rule_no_redirect ?? true);
      setEditRuleNoDisambig(contest.rule_no_disambig ?? true);
      setEditRuleMainspace(contest.rule_mainspace_only ?? true);
      setEditRankByWords(contest.rank_by_words ?? false);
      setEditAddTalkTemplate(contest.add_talk_template ?? false);
      setEditTalkTemplateName(contest.talk_template_name || "");
      setEditDistributeJuryQueue(contest.distribute_jury_queue ?? false);
      setEditJuries(contest.juries || []);
      setEditOrganizers(contest.organizers || []);
    }
  }, [contest]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error(t("feather-create-name-required"));
      return;
    }
    const isUmbrella = editContestType === "umbrella";
    if (isUmbrella && selectedExistingContests.length === 0) {
      toast.error(t("feather-campaign-requires-one-comp"));
      document
        .getElementById("participating-competitions-section")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!editStartDate || isNaN(new Date(editStartDate).getTime())) {
      toast.error("Please provide a valid start date");
      return;
    }
    if (!editEndDate || isNaN(new Date(editEndDate).getTime())) {
      toast.error("Please provide a valid end date");
      return;
    }
    if (new Date(editEndDate) < new Date(editStartDate)) {
      toast.error("End date cannot be earlier than start date");
      return;
    }
    setIsSavingSettings(true);
    const payload: UpdateContestPayload = {
      name: editName.trim(),
      description: editDescription.trim(),
      wiki_dbname: isUmbrella
        ? selectedExistingContests[0]?.wiki_dbname || editWikiDbName || "meta"
        : editWikiDbName.trim() || "bnwiki",
      wiki_url: isUmbrella
        ? selectedExistingContests[0]?.wiki_url || ""
        : editWikiURL.trim() || "https://bn.wikipedia.org",
      wiki_lang: isUmbrella
        ? selectedExistingContests[0]?.wiki_lang || "en"
        : editWikiLang.trim() || "bn",
      status: editStatus,
      start_date: editStartDate,
      end_date: editEndDate,
      wiki_tz: editTZ,
      is_umbrella: isUmbrella,
      existing_contest_codes: isUmbrella
        ? selectedExistingContests.map((c) => c.code)
        : undefined,
      onwiki_page_url: editOnwikiPageUrl.trim(),
      min_words: isUmbrella ? 0 : (hasEditMinWords ? Number(editMinWords) || 0 : 0),
      min_bytes: isUmbrella ? 0 : (hasEditMinBytes ? Number(editMinBytes) || 0 : 0),
      min_refs: isUmbrella ? 0 : (hasEditMinRefs ? Number(editMinRefs) || 0 : 0),
      max_submissions_per_user: isUmbrella ? 0 : (hasEditMaxSub ? Number(editMaxSub) || 0 : 0),
      rule_must_be_creator: isUmbrella ? false : editRuleCreator,
      rule_created_in_window: isUmbrella ? false : editRuleWindow,
      custom_creation_start_date:
        !isUmbrella && !editRuleWindow && editCustomCreationStart
          ? editCustomCreationStart
          : undefined,
      custom_creation_end_date:
        !isUmbrella && !editRuleWindow && editCustomCreationEnd
          ? editCustomCreationEnd
          : undefined,
      rule_no_redirect: isUmbrella ? false : editRuleNoRedirect,
      rule_no_disambig: isUmbrella ? false : editRuleNoDisambig,
      rule_mainspace_only: isUmbrella ? false : editRuleMainspace,
      rank_by_words: editRankByWords,
      add_talk_template: isUmbrella ? false : editAddTalkTemplate,
      talk_template_name: isUmbrella ? "" : editTalkTemplateName.trim(),
      distribute_jury_queue: isUmbrella ? false : editDistributeJuryQueue,
      juries: isUmbrella ? [] : editJuries,
      organizers: editOrganizers,
    };
    try {
      await updateContest(code, payload);

      toast.success(t("feather-contest-settings-success"));
      queryClient.setQueryData(["contest", code], (prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...payload,
          min_words: payload.min_words,
          min_bytes: payload.min_bytes,
          min_refs: payload.min_refs,
          max_submissions_per_user: payload.max_submissions_per_user,
          juries: payload.juries,
        };
      });
      await queryClient.invalidateQueries({ queryKey: ["contest", code] });
      await queryClient.invalidateQueries({ queryKey: ["contests"] });
      await queryClient.invalidateQueries({ queryKey: ["availableContests"] });
      await queryClient.invalidateQueries({ queryKey: ["standings", code] });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration");
    } finally {
      setIsSavingSettings(false);
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

  const pMeta = getProjectMeta(editWikiDbName || contest?.wiki_dbname || "bnwiki");
  const pName = t(`feather-project-${pMeta.id}`) || (locale === "bn" ? pMeta.nativeName : pMeta.name);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/contests/${code}`}
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
          <span>{t("feather-contest-back-to-contest")}</span>
        </Link>

        {contest && (
          <div className="flex items-center gap-2">
            {editContestType === "umbrella" ? (
              <span className="text-xs text-primary flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-primary/30 bg-primary/10 font-medium">
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span>{t("feather-contest-type-umbrella")}</span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-border/70 bg-muted/30">
                <img
                  src={pMeta.icon}
                  alt=""
                  className="h-3.5 w-3.5 object-contain shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = "/icons/projects/wikipedia.svg";
                  }}
                />
                <span className="font-medium text-foreground">{pName}</span>
                {editWikiLang && (
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                    ({editWikiLang})
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Top Header Card with Quick Save */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    {t("feather-contest-settings-title")}
                  </h1>
                  <Badge variant="secondary" className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5">
                    {t("feather-contest-settings-admin-badge")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {contest?.name ? `${contest.name} (${code})` : t("feather-contest-settings-desc")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <Link
              href={`/contests/${code}`}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "h-8.5 px-3 text-xs cursor-pointer",
              })}
            >
              {t("feather-submit-cancel")}
            </Link>

            <Button
              type="submit"
              disabled={isSavingSettings || !isOrganizer}
              className="gap-2 cursor-pointer font-semibold shadow-xs h-8.5 px-4"
            >
              {isSavingSettings ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>{t("feather-contest-settings-saving")}</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{t("feather-contest-settings-save")}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {!isOrganizer && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
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
              label={t("feather-create-name-label")}
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

            {/* On-wiki contest page */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="edit-onwiki-page-url"
                  className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                >
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{t("feather-create-onwiki-page-label")}</span>
                </label>
                <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground border-border/70">
                  {t("feather-create-opt-no-limit")}
                </Badge>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <ExternalLink className="h-3.5 w-3.5" />
                </div>
                <Input
                  id="edit-onwiki-page-url"
                  value={editOnwikiPageUrl}
                  onChange={(e) => setEditOnwikiPageUrl(e.target.value)}
                  disabled={!isOrganizer}
                  placeholder="Wikipedia:উইকিটেশব প্রতিযোগিতা ২০২৬ or https://..."
                  className="pl-9 h-10 text-xs sm:text-sm bg-background border-border/70"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                {t("feather-create-onwiki-page-hint")}
              </p>
            </div>

            {/* Contest Mode: Single Community Contest vs Multi-Community Campaign */}
            <ContestModeSelector
              value={editContestType}
              onChange={setEditContestType}
              disabled={!isOrganizer}
            />

            {/* Mode-Specific Target: Single Wiki + Timezone OR Multi-Community Competitions Picker */}
            <div className="pt-2 border-t border-border/60 space-y-3.5">
              {editContestType === "standard" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className={`md:col-span-2 ${!isOrganizer ? "pointer-events-none opacity-60" : ""}`}>
                    <WikiSelector
                      wikiDbName={editWikiDbName}
                      wikiURL={editWikiURL}
                      wikiLang={editWikiLang}
                      onChange={(data) => {
                        setEditWikiDbName(data.dbname);
                        setEditWikiURL(data.url);
                        setEditWikiLang(data.lang);
                      }}
                    />
                  </div>
                  <div className={`md:col-span-1 ${!isOrganizer ? "pointer-events-none opacity-60" : ""}`}>
                    <TimezoneSelector
                      value={editTZ}
                      onChange={setEditTZ}
                      label={t("feather-create-wiki-tz-label")}
                    />
                  </div>
                </div>
              ) : (
                <ParticipatingCompetitionsPicker
                  selectedContests={selectedExistingContests}
                  onAddContest={handleAddExistingContest}
                  onRemoveContest={handleRemoveExistingContest}
                  wikiTZ={editTZ}
                  onChangeTZ={setEditTZ}
                  excludeCode={code}
                  disabled={!isOrganizer}
                />
              )}
            </div>

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

        {/* Section 2: Timeline & Schedule */}
        <Card className="border-border shadow-2xs relative z-25 overflow-visible">
          <CardHeader className="py-3 px-4 sm:px-6 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <span>{t("feather-contest-settings-dates")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 px-4 sm:px-6 pb-5">
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

        {/* Section 3: Qualification & Eligibility Rules (Standard only; Multi-Community uses autonomous local rules) */}
        {editContestType === "standard" ? (
        <Card className="border-border shadow-2xs relative z-20 overflow-visible">
          <CardHeader className="py-3 px-4 sm:px-6 border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                <span>{t("feather-create-sec-rules")}</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 px-4 sm:px-6 pb-5">
            {/* Primary Ranking Metric (Big Prominent Selector at the Top) */}
            <div className="space-y-2 pb-4 border-b border-border/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span>{t("feather-create-ranking-mode")}</span>
                    <span className="text-destructive">*</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("feather-create-ranking-mode-desc")}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] sm:text-[11px] self-start sm:self-auto font-mono text-muted-foreground border-border/80">
                  {editRankByWords ? t("feather-create-rank-by-words") : t("feather-create-rank-by-articles")}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Option 1: Accepted Articles */}
                <button
                  type="button"
                  onClick={() => isOrganizer && setEditRankByWords(false)}
                  disabled={!isOrganizer}
                  className={`relative flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-150 select-none ${
                    !isOrganizer ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                  } ${
                    !editRankByWords
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                      : "border-border/70 bg-card hover:border-border hover:bg-muted/30"
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    !editRankByWords ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-semibold text-foreground">
                        {t("feather-create-rank-by-articles")}
                      </span>
                      {!editRankByWords ? (
                        <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-border/80" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {t("feather-create-rank-by-articles-desc")}
                    </p>
                  </div>
                </button>

                {/* Option 2: Total Word Count */}
                <button
                  type="button"
                  onClick={() => isOrganizer && setEditRankByWords(true)}
                  disabled={!isOrganizer}
                  className={`relative flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-150 select-none ${
                    !isOrganizer ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                  } ${
                    editRankByWords
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                      : "border-border/70 bg-card hover:border-border hover:bg-muted/30"
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    editRankByWords ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <AlignLeft className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-semibold text-foreground">
                        {t("feather-create-rank-by-words")}
                      </span>
                      {editRankByWords ? (
                        <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-border/80" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {t("feather-create-rank-by-words-desc")}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Quantitative Thresholds: Words, Bytes, References */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Min Words */}
              <div
                className={`p-3 rounded-lg border transition-all duration-150 ${
                  hasEditMinWords
                    ? "bg-card border-primary/40 shadow-2xs"
                    : "bg-muted/15 border-border/70 hover:bg-muted/25"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <Switch
                      checked={hasEditMinWords}
                      onCheckedChange={(checked) => isOrganizer && setHasEditMinWords(checked)}
                      disabled={!isOrganizer}
                    />
                    <span className="text-xs font-semibold text-foreground">
                      {t("feather-create-min-words-label")}
                    </span>
                  </label>

                  {hasEditMinWords ? (
                    <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0 h-5">
                      {editMinWords} words
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
                      onChange={(e) => setEditMinWords(Math.max(1, parseInt(e.target.value) || 0))}
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
                              Number(editMinWords) === val
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {val}w
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

              {/* Min Bytes */}
              <div
                className={`p-3 rounded-lg border transition-all duration-150 ${
                  hasEditMinBytes
                    ? "bg-card border-primary/40 shadow-2xs"
                    : "bg-muted/15 border-border/70 hover:bg-muted/25"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <Switch
                      checked={hasEditMinBytes}
                      onCheckedChange={(checked) => isOrganizer && setHasEditMinBytes(checked)}
                      disabled={!isOrganizer}
                    />
                    <span className="text-xs font-semibold text-foreground">
                      {t("feather-create-min-bytes-label")}
                    </span>
                  </label>

                  {hasEditMinBytes ? (
                    <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0 h-5">
                      {t("feather-review-preview-bytes", Number(editMinBytes) || 0)}
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
                      onChange={(e) => setEditMinBytes(Math.max(1, parseInt(e.target.value) || 0))}
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
                              Number(editMinBytes) === val
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

              {/* Min References */}
              <div
                className={`p-3 rounded-lg border transition-all duration-150 ${
                  hasEditMinRefs
                    ? "bg-card border-primary/40 shadow-2xs"
                    : "bg-muted/15 border-border/70 hover:bg-muted/25"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <Switch
                      checked={hasEditMinRefs}
                      onCheckedChange={(checked) => isOrganizer && setHasEditMinRefs(checked)}
                      disabled={!isOrganizer}
                    />
                    <span className="text-xs font-semibold text-foreground">
                      {t("feather-create-min-refs-label")}
                    </span>
                  </label>

                  {hasEditMinRefs ? (
                    <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0 h-5">
                      {editMinRefs} ref{Number(editMinRefs) > 1 ? "s" : ""}
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
                      onChange={(e) => setEditMinRefs(Math.max(1, parseInt(e.target.value) || 0))}
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
                              Number(editMinRefs) === val
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

            {/* Max Submissions Per User Constraint */}
            <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {t("feather-contest-settings-max-sub")}
                </span>
                <Switch
                  checked={hasEditMaxSub}
                  onCheckedChange={(checked) => isOrganizer && setHasEditMaxSub(checked)}
                  disabled={!isOrganizer}
                />
              </div>
              {hasEditMaxSub && (
                <div className="max-w-xs pt-1">
                  <FloatingInput
                    type="number"
                    label={t("feather-contest-settings-max-sub")}
                    value={editMaxSub}
                    onChange={(e) => setEditMaxSub(e.target.value)}
                    disabled={!isOrganizer}
                    min={0}
                  />
                </div>
              )}
            </div>

            {/* Structural Wiki Criteria Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-border/60">
              <label className="flex items-center justify-between gap-2.5 p-3 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none">
                <span className="text-xs text-foreground font-medium">
                  {t("feather-create-rule-creator")}
                </span>
                <Switch
                  checked={editRuleCreator}
                  onCheckedChange={(checked) => isOrganizer && setEditRuleCreator(checked)}
                  disabled={!isOrganizer}
                />
              </label>

              <label className="flex items-center justify-between gap-2.5 p-3 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none">
                <span className="text-xs text-foreground font-medium">
                  {t("feather-create-rule-window")}
                </span>
                <Switch
                  checked={editRuleWindow}
                  onCheckedChange={(checked) => isOrganizer && setEditRuleWindow(checked)}
                  disabled={!isOrganizer}
                />
              </label>

              <label className="flex items-center justify-between gap-2.5 p-3 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none">
                <span className="text-xs text-foreground font-medium">
                  {t("feather-create-rule-redirect")}
                </span>
                <Switch
                  checked={editRuleNoRedirect}
                  onCheckedChange={(checked) => isOrganizer && setEditRuleNoRedirect(checked)}
                  disabled={!isOrganizer}
                />
              </label>

              <label className="flex items-center justify-between gap-2.5 p-3 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none">
                <span className="text-xs text-foreground font-medium">
                  {t("feather-create-rule-disambig")}
                </span>
                <Switch
                  checked={editRuleNoDisambig}
                  onCheckedChange={(checked) => isOrganizer && setEditRuleNoDisambig(checked)}
                  disabled={!isOrganizer}
                />
              </label>

              <label className="flex items-center justify-between gap-2.5 p-3 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors cursor-pointer select-none sm:col-span-2">
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    {t("feather-contest-settings-rule-mainspace")}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t("feather-contest-settings-rule-mainspace-hint")}
                  </div>
                </div>
                <Switch
                  checked={editRuleMainspace}
                  onCheckedChange={(checked) => isOrganizer && setEditRuleMainspace(checked)}
                  disabled={!isOrganizer}
                />
              </label>
            </div>

            {!editRuleWindow && (
              <CustomCreationTimelinePanel
                customStart={editCustomCreationStart}
                customEnd={editCustomCreationEnd}
                onChangeStart={setEditCustomCreationStart}
                onChangeEnd={setEditCustomCreationEnd}
                referenceStartDate={editStartDate}
                disabled={!isOrganizer}
              />
            )}
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

        {/* Section 4: Jury & Organizer Administration & Automation */}
        {editContestType === "standard" ? (
        <Card className="border-border shadow-2xs relative z-10">
          <CardHeader className="py-3 px-4 sm:px-6 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <span>{t("feather-create-sec-admin")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 px-4 sm:px-6 pb-5">
            {/* Part A: Jury & Organizer Usernames side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UserTagInput
                label={t("feather-create-juries-label")}
                value={editJuries}
                onChange={isOrganizer ? setEditJuries : () => {}}
                wikiUrl={editWikiURL || contest?.wiki_url}
                disabled={!isOrganizer}
                hint={t("feather-create-juries-hint")}
              />
              <UserTagInput
                label={t("feather-create-organizers-label")}
                value={editOrganizers}
                onChange={isOrganizer ? setEditOrganizers : () => {}}
                wikiUrl={editWikiURL || contest?.wiki_url}
                disabled={!isOrganizer}
                hint={t("feather-create-organizers-hint")}
              />
            </div>

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
                  checked={editAddTalkTemplate}
                  onCheckedChange={(checked) => isOrganizer && setEditAddTalkTemplate(checked)}
                  disabled={!isOrganizer}
                />
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
                    wikiUrl={editWikiURL || contest?.wiki_url}
                    isOrganizer={isOrganizer}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        ) : (
        <Card className="border-border shadow-2xs relative z-10">
          <CardHeader className="py-3 px-4 sm:px-6 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <span>{t("feather-contest-organizers-label")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-4 sm:px-6 pb-5">
            <UserTagInput
              label={t("feather-create-organizers-label")}
              value={editOrganizers}
              onChange={isOrganizer ? setEditOrganizers : () => {}}
              wikiUrl={editWikiURL || contest?.wiki_url}
              disabled={!isOrganizer}
              hint={t("feather-create-organizers-hint")}
            />
          </CardContent>
        </Card>
        )}

        {/* Bottom Form Action Controls */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-xs text-muted-foreground">
            All changes take effect immediately across all participants and juries.
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/contests/${code}`}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "h-9 px-3.5 text-xs cursor-pointer",
              })}
            >
              {t("feather-submit-cancel")}
            </Link>

            <Button
              type="submit"
              disabled={isSavingSettings || !isOrganizer}
              className="gap-2 cursor-pointer font-semibold shadow-xs min-w-[140px] h-9"
            >
              {isSavingSettings ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>{t("feather-contest-settings-saving")}</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{t("feather-contest-settings-save")}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Danger Zone: Delete Contest (Owner or Organizers only) */}
      {(isOwner || isContestOrganizer) && (
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
                You are about to delete:
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
