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
  Contest,
  UserSession,
} from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { getProjectMeta, getWikiInfo } from "@/lib/wikis";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
} from "lucide-react";
import { FloatingInput, FloatingTextarea } from "@/components/ui/floating-input";
import { Switch } from "@/components/ui/switch";
import { UserTagInput } from "@/components/contests/UserTagInput";
import TimezoneSelector from "@/components/contests/TimezoneSelector";
import DateTimePicker from "@/components/ui/date-time-picker";
import TalkTemplateBuilder from "@/components/contests/TalkTemplateBuilder";
import TalkQueueMonitor from "@/components/contests/TalkQueueMonitor";
import { calculateEndOfDay } from "@/lib/time";

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
    if (contest?.created_by_username && me.wiki_username && contest.created_by_username.trim().toLowerCase() === me.wiki_username.trim().toLowerCase()) return true;
    return false;
  }, [me, contest]);

  const isOwner = me?.role === "owner" || (me as any)?.is_owner;
  const isCreator = Boolean(
    contest?.created_by_id && me?.user_id && contest.created_by_id === me.user_id
  ) || Boolean(
    contest?.created_by_username && me?.wiki_username && contest.created_by_username.trim().toLowerCase() === me.wiki_username.trim().toLowerCase()
  );

  // Form State
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
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
  const [editRuleNoRedirect, setEditRuleNoRedirect] = useState(true);
  const [editRuleNoDisambig, setEditRuleNoDisambig] = useState(true);
  const [editRuleMainspace, setEditRuleMainspace] = useState(true);
  const [editRankByWords, setEditRankByWords] = useState(false);

  // Jury & Automation States
  const [editAddTalkTemplate, setEditAddTalkTemplate] = useState(false);
  const [editTalkTemplateName, setEditTalkTemplateName] = useState("");
  const [editDistributeJuryQueue, setEditDistributeJuryQueue] = useState(false);
  const [editJuries, setEditJuries] = useState<string[]>([]);

  // Action status states
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingContest, setIsDeletingContest] = useState(false);

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

  // Synchronize state when contest data loads
  useEffect(() => {
    if (contest) {
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
      toast.error(t("feather-create-name-required"));
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
    const payload = {
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

  const pMeta = contest ? getProjectMeta(contest.wiki_dbname) : null;
  const pName = pMeta ? (t(`feather-project-${pMeta.id}`) || (locale === "bn" ? pMeta.nativeName : pMeta.name)) : "";

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

        {pMeta && contest && (
          <div className="flex items-center gap-2">
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
              {contest.wiki_lang && (
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  ({contest.wiki_lang})
                </span>
              )}
            </span>
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
              {t("feather-submit-cancel", "Cancel")}
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
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 px-4 sm:px-6 pb-5">
            {/* Quantitative Thresholds: Words, Bytes, References */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Min Words */}
              <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {t("feather-contest-settings-min-words")}
                  </span>
                  <Switch
                    checked={hasEditMinWords}
                    onCheckedChange={(checked) => isOrganizer && setHasEditMinWords(checked)}
                    disabled={!isOrganizer}
                  />
                </div>
                {hasEditMinWords && (
                  <FloatingInput
                    type="number"
                    label={t("feather-create-min-words-label")}
                    value={editMinWords}
                    onChange={(e) => setEditMinWords(e.target.value)}
                    disabled={!isOrganizer}
                    min={0}
                  />
                )}
              </div>

              {/* Min Bytes */}
              <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {t("feather-contest-settings-min-bytes")}
                  </span>
                  <Switch
                    checked={hasEditMinBytes}
                    onCheckedChange={(checked) => isOrganizer && setHasEditMinBytes(checked)}
                    disabled={!isOrganizer}
                  />
                </div>
                {hasEditMinBytes && (
                  <FloatingInput
                    type="number"
                    label={t("feather-create-min-bytes-label")}
                    value={editMinBytes}
                    onChange={(e) => setEditMinBytes(e.target.value)}
                    disabled={!isOrganizer}
                    min={0}
                  />
                )}
              </div>

              {/* Min References */}
              <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {t("feather-contest-settings-min-refs")}
                  </span>
                  <Switch
                    checked={hasEditMinRefs}
                    onCheckedChange={(checked) => isOrganizer && setHasEditMinRefs(checked)}
                    disabled={!isOrganizer}
                  />
                </div>
                {hasEditMinRefs && (
                  <FloatingInput
                    type="number"
                    label={t("feather-create-min-refs-label")}
                    value={editMinRefs}
                    onChange={(e) => setEditMinRefs(e.target.value)}
                    disabled={!isOrganizer}
                    min={0}
                  />
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

            {/* Ranking Metric Mode */}
            <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <label className="text-xs font-semibold text-foreground">
                  {t("feather-create-ranking-mode")}
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Determines whether standings rank participants by accepted articles or total word counts.
                </p>
              </div>

              <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/30 p-1 text-xs font-medium shrink-0">
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
            <Link
              href={`/contests/${code}`}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "h-9 px-3.5 text-xs cursor-pointer",
              })}
            >
              {t("feather-submit-cancel", "Cancel")}
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
