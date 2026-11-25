"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchChatMessages,
  postChatMessage,
  fetchCampaignChatMessages,
  postCampaignChatMessage,
  deleteChatMessage,
  moderateChatUser,
  fetchChatModerationLog,
  fetchMyChatStatus,
  CommunityChatMessage,
  UserChatModeration,
} from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import {
  MessageSquare,
  Send,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Trash2,
  Clock,
  Ban,
  CheckCircle2,
  MoreVertical,
  RefreshCw,
  Info,
  Layers,
  MessageCircle,
} from "lucide-react";
import { WikimediaLogoIcon } from "@/components/icons/CodexIcons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import UserBadge from "@/components/users/UserBadge";
import { toast } from "sonner";

interface CommunityChatPanelProps {
  contestCode: string;
  contestName: string;
  isUmbrella?: boolean;
  parentContestId?: number | null;
  isJuryOrAdmin?: boolean;
  currentUsername?: string;
}

export default function CommunityChatPanel({
  contestCode,
  contestName,
  isUmbrella,
  parentContestId,
  isJuryOrAdmin,
  currentUsername,
}: CommunityChatPanelProps) {
  const { t, formatDate } = useI18n();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active channel: "local" (contest chat) vs "campaign" (umbrella lounge)
  const [activeChannel, setActiveChannel] = useState<"local" | "campaign">(
    isUmbrella ? "campaign" : "local"
  );
  const isCampaignChat = activeChannel === "campaign";

  const [messageText, setMessageText] = useState("");
  const [autoModError, setAutoModError] = useState<{
    reason: string;
    action: string;
  } | null>(null);

  // Moderation Dialog State
  const [modTargetUser, setModTargetUser] = useState<string | null>(null);
  const [modAction, setModAction] = useState<"warn" | "timeout" | "ban" | "unban">("warn");
  const [modTimeoutDurationMinutes, setModTimeoutDurationMinutes] = useState<number>(60); // 60 mins default
  const [modReason, setModReason] = useState("");
  const [isModDialogOpen, setIsModDialogOpen] = useState(false);

  // Moderation Audit Log Dialog
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);

  // Query: My Chat Status (muted, banned, warnings)
  const { data: myStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["my-chat-status", contestCode],
    queryFn: () => fetchMyChatStatus(contestCode),
    enabled: Boolean(currentUsername),
    refetchInterval: 10000,
  });

  // Query: Chat Messages with 5s polling
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    isFetching: isFetchingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["chat-messages", contestCode, isCampaignChat ? "campaign" : "local"],
    queryFn: () =>
      isCampaignChat
        ? fetchCampaignChatMessages(contestCode, undefined, 100)
        : fetchChatMessages(contestCode, undefined, undefined, 100),
    refetchInterval: 5000,
  });

  // Query: Moderation Audit Log (Jury/Admin only)
  const { data: modLogs } = useQuery({
    queryKey: ["chat-mod-logs", contestCode],
    queryFn: () => fetchChatModerationLog(contestCode),
    enabled: Boolean(isJuryOrAdmin && isLogDialogOpen),
  });

  const messages: CommunityChatMessage[] = messagesData?.items || [];

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Mutation: Post Message
  const postMutation = useMutation({
    mutationFn: (msg: string) =>
      isCampaignChat
        ? postCampaignChatMessage(contestCode, msg)
        : postChatMessage(contestCode, msg),
    onSuccess: () => {
      setMessageText("");
      setAutoModError(null);
      queryClient.invalidateQueries({ queryKey: ["chat-messages", contestCode] });
      queryClient.invalidateQueries({ queryKey: ["my-chat-status", contestCode] });
    },
    onError: (err: any) => {
      const msg = err.message || "Failed to post message";
      if (
        msg.toLowerCase().includes("harmful") ||
        msg.toLowerCase().includes("moderation") ||
        msg.toLowerCase().includes("strike")
      ) {
        setAutoModError({ reason: msg, action: "blocked" });
      }
      toast.error(msg);
      refetchStatus();
    },
  });

  // Mutation: Delete Message
  const deleteMutation = useMutation({
    mutationFn: ({ messageId, reason }: { messageId: number; reason?: string }) =>
      deleteChatMessage(contestCode, messageId, reason),
    onSuccess: () => {
      toast.success("Message removed");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", contestCode] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove message");
    },
  });

  // Mutation: Moderate User
  const moderateMutation = useMutation({
    mutationFn: () =>
      moderateChatUser(
        contestCode,
        modTargetUser!,
        modAction,
        modAction === "timeout" ? modTimeoutDurationMinutes : undefined,
        modReason || undefined
      ),
    onSuccess: () => {
      toast.success(`Action applied to ${modTargetUser}`);
      setIsModDialogOpen(false);
      setModReason("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", contestCode] });
      queryClient.invalidateQueries({ queryKey: ["chat-mod-logs", contestCode] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to moderate user");
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed || postMutation.isPending) return;
    postMutation.mutate(trimmed);
  };

  const openModerationModal = (username: string, defaultAction: "warn" | "timeout" | "ban" = "warn") => {
    setModTargetUser(username);
    setModAction(defaultAction);
    setModReason("");
    setIsModDialogOpen(true);
  };

  const isUserMuted = myStatus?.status === "timed_out";
  const isUserBanned = myStatus?.status === "banned";
  const cannotPost = !currentUsername || isUserMuted || isUserBanned || (myStatus && !myStatus.can_chat);

  return (
    <Card className="border border-border/80 shadow-xs bg-card overflow-hidden">
      {/* Header with Channel Switcher and Security Actions */}
      <CardHeader className="p-3.5 sm:p-4 border-b border-border/60 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Channel Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border/40 w-fit">
            <button
              type="button"
              onClick={() => setActiveChannel("local")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeChannel === "local"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5 text-primary" />
              <span>{t("feather-chat-tab-local")}</span>
            </button>

            {(isUmbrella || parentContestId) && (
              <button
                type="button"
                onClick={() => setActiveChannel("campaign")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  activeChannel === "campaign"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="h-3.5 w-3.5 text-amber-500" />
                <span>{t("feather-chat-tab-campaign")}</span>
              </button>
            )}
          </div>

          {/* Right Status Actions & Admin Tools */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchMessages()}
              disabled={isFetchingMessages}
              className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
              title="Refresh messages"
            >
              <RefreshCw className={`h-3 w-3 ${isFetchingMessages ? "animate-spin" : ""}`} />
            </Button>

            {isJuryOrAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLogDialogOpen(true)}
                className="h-7 px-2.5 text-[11px] gap-1.5 font-medium cursor-pointer border-primary/30 text-primary hover:bg-primary/5"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>{t("feather-chat-mod-drawer-title")}</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Warning / Ban Banners */}
        {isUserBanned && (
          <div className="p-3 bg-destructive/10 border-b border-destructive/30 flex items-center gap-2.5 text-xs text-destructive">
            <Ban className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{t("feather-chat-banned-banner")}</span>
          </div>
        )}

        {isUserMuted && !isUserBanned && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <Clock className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="font-medium">
              {t(
                "feather-chat-timed-out-banner",
                myStatus?.timeout_until ? formatDate(myStatus.timeout_until) : ""
              )}
            </span>
          </div>
        )}

        {/* Auto-Mod Warning Banner */}
        {autoModError && (
          <div className="p-3 bg-destructive/10 border-b border-destructive/30 flex items-center justify-between gap-2.5 text-xs text-destructive">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                <strong>{t("feather-chat-mod-automod-alert")}</strong>: {autoModError.reason}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoModError(null)}
              className="h-6 px-2 text-[10px]"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Messages Stream Container */}
        <div className="h-[420px] overflow-y-auto p-4 space-y-3.5 bg-muted/5">
          {isLoadingMessages ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span>Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center mb-2.5">
                <MessageSquare className="h-5 w-5 text-muted-foreground/60" />
              </div>
              <p className="text-xs font-medium text-foreground max-w-sm">
                {t("feather-chat-empty")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                {t("feather-chat-rules-hint")}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSysopOrJury = msg.user_role === "jury" || msg.user_role === "admin" || msg.user_role === "owner";

              return (
                <div
                  key={msg.id}
                  className={`group flex items-start gap-2.5 text-xs transition-colors rounded-lg p-2 ${
                    msg.is_deleted ? "bg-muted/40 border border-border/40 opacity-75" : "hover:bg-muted/30"
                  }`}
                >
                  {/* Avatar / Brand Icon */}
                  <div className="shrink-0 mt-0.5">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[11px] border ${
                        isSysopOrJury
                          ? "bg-primary/10 text-primary border-primary/25"
                          : "bg-muted text-foreground/80 border-border"
                      }`}
                    >
                      {msg.username.slice(0, 1).toUpperCase()}
                    </div>
                  </div>

                  {/* Message Bubble Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        href={`/users/${encodeURIComponent(msg.username)}`}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {msg.username}
                      </Link>
                      <UserBadge role={msg.user_role as any} />

                      {msg.is_campaign_chat && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/30 text-amber-600">
                          Campaign
                        </Badge>
                      )}

                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {formatDate(msg.created_at)}
                      </span>

                      {/* Moderator Action Dropdown */}
                      {isJuryOrAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            title={t("feather-chat-mod-menu")}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-xs">
                            {!msg.is_deleted && (
                              <DropdownMenuItem
                                onClick={() => deleteMutation.mutate({ messageId: msg.id })}
                                className="text-destructive gap-1.5 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>{t("feather-chat-mod-action-delete")}</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openModerationModal(msg.username, "warn")}
                              className="gap-1.5 cursor-pointer text-amber-600 dark:text-amber-400"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>{t("feather-chat-mod-action-warn")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openModerationModal(msg.username, "timeout")}
                              className="gap-1.5 cursor-pointer text-orange-600 dark:text-orange-400"
                            >
                              <Clock className="h-3.5 w-3.5" />
                              <span>{t("feather-chat-mod-action-timeout")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openModerationModal(msg.username, "ban")}
                              className="gap-1.5 cursor-pointer text-destructive"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              <span>{t("feather-chat-mod-action-ban")}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Content */}
                    {msg.is_deleted ? (
                      <p className="mt-1 text-muted-foreground italic flex items-center gap-1.5 text-[11px]">
                        <ShieldAlert className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                        <span>{t("feather-chat-deleted-msg", msg.deleted_reason || "Violation of guidelines")}</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-foreground text-xs leading-relaxed break-words whitespace-pre-wrap">
                        {msg.message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer Section */}
        <div className="p-3 border-t border-border/70 bg-card">
          {!currentUsername ? (
            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30 text-center flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{t("feather-chat-login-required")}</span>
              <a
                href={`/login?returnTo=${encodeURIComponent(`/contests/${contestCode}`)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-xs cursor-pointer shadow-xs"
              >
                <WikimediaLogoIcon className="h-3.5 w-3.5" />
                <span>Log in</span>
              </a>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={cannotPost || postMutation.isPending}
                  placeholder={
                    cannotPost
                      ? isUserBanned
                        ? t("feather-chat-banned-banner")
                        : "You are currently muted..."
                      : t("feather-chat-input-placeholder")
                  }
                  className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  maxLength={1000}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={cannotPost || !messageText.trim() || postMutation.isPending}
                  className="h-9 px-3.5 gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("feather-chat-send-btn")}</span>
                </Button>
              </div>

              {/* Guidelines Hint */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                <span className="flex items-center gap-1 truncate">
                  <Info className="h-2.5 w-2.5 shrink-0" />
                  <span>{t("feather-chat-rules-hint")}</span>
                </span>
                <span className="shrink-0 ml-2 font-mono">{messageText.length}/1000</span>
              </div>
            </form>
          )}
        </div>
      </CardContent>

      {/* Manual Moderation Modal for Juries/Admins */}
      <Dialog open={isModDialogOpen} onOpenChange={setIsModDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              <span>Moderate User: {modTargetUser}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Apply administrative action for harmful chat behavior, slurs, or harassment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            {/* Action Selector */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Action Type</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["warn", "timeout", "ban", "unban"] as const).map((act) => (
                  <button
                    key={act}
                    type="button"
                    onClick={() => setModAction(act)}
                    className={`py-1.5 px-2 rounded-md border text-center font-medium capitalize transition-all cursor-pointer ${
                      modAction === act
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeout Duration Selector if Timeout */}
            {modAction === "timeout" && (
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Timeout Duration</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: t("feather-chat-mod-timeout-15m"), min: 15 },
                    { label: t("feather-chat-mod-timeout-1h"), min: 60 },
                    { label: t("feather-chat-mod-timeout-24h"), min: 1440 },
                    { label: t("feather-chat-mod-timeout-7d"), min: 10080 },
                  ].map((dur) => (
                    <button
                      key={dur.min}
                      type="button"
                      onClick={() => setModTimeoutDurationMinutes(dur.min)}
                      className={`py-1.5 px-2 rounded-md border text-center font-medium transition-all cursor-pointer ${
                        modTimeoutDurationMinutes === dur.min
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reason Input */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Reason / Audit Justification</label>
              <input
                type="text"
                value={modReason}
                onChange={(e) => setModReason(e.target.value)}
                placeholder={t("feather-chat-mod-reason-placeholder")}
                className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModDialogOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => moderateMutation.mutate()}
              disabled={moderateMutation.isPending}
              variant={modAction === "ban" || modAction === "timeout" ? "destructive" : "default"}
              className="text-xs font-semibold cursor-pointer"
            >
              Confirm {modAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Moderation Audit Log Viewer Dialog */}
      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <span>{t("feather-chat-mod-history-title")}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Audit log of all warnings, timeouts, bans, and unbans issued in this contest.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
            {!modLogs || modLogs.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                {t("feather-chat-mod-history-empty")}
              </div>
            ) : (
              modLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg border border-border bg-muted/20 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{log.username}</span>
                      <Badge
                        variant={
                          log.action === "ban"
                            ? "destructive"
                            : log.action === "timeout"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-[10px] uppercase font-mono px-1.5 py-0"
                      >
                        {log.action}
                      </Badge>
                      {log.timeout_until && (
                        <span className="text-[10px] text-muted-foreground">
                          until {formatDate(log.timeout_until)}
                        </span>
                      )}
                    </div>
                    {log.reason && (
                      <p className="text-[11px] text-muted-foreground truncate max-w-md">
                        {log.reason}
                      </p>
                    )}
                    <div className="text-[10px] text-muted-foreground/80">
                      by <strong>{log.moderated_by}</strong> • {formatDate(log.created_at)}
                    </div>
                  </div>

                  {/* Quick Unban / Lift Button */}
                  {log.action !== "unban" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setModTargetUser(log.username);
                        setModAction("unban");
                        setModReason("Lifted via moderation log viewer");
                        moderateMutation.mutate();
                      }}
                      className="h-7 px-2 text-[11px] gap-1 shrink-0 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span>Lift</span>
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
