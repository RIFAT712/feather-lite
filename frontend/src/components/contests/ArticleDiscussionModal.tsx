"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Send,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  fetchArticleMessages,
  postArticleMessage,
  requestArticleReReview,
  type Article,
  type ArticleMessageItem,
} from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import UserBadge, { ContestRoleScope } from "@/components/users/UserBadge";

interface ArticleDiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article | null;
  contestCode: string;
  currentUsername?: string;
  isJuryOrOrganizer?: boolean;
  contestRoles?: ContestRoleScope;
  onReReviewRequested?: () => void;
}

export default function ArticleDiscussionModal({
  isOpen,
  onClose,
  article,
  contestCode,
  currentUsername,
  isJuryOrOrganizer = false,
  contestRoles,
  onReReviewRequested,
}: ArticleDiscussionModalProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const [showReReviewForm, setShowReReviewForm] = useState(false);
  const [reReviewNote, setReReviewNote] = useState("");
  const [reReviewError, setReReviewError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const articleId = article?.id ?? 0;

  // Query discussion messages
  const {
    data: messages = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["article-messages", articleId],
    queryFn: () => fetchArticleMessages(articleId),
    enabled: isOpen && articleId > 0,
    refetchInterval: isOpen ? 10_000 : false,
  });

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isOpen]);

  // Post message mutation
  const postMutation = useMutation({
    mutationFn: (text: string) => postArticleMessage(articleId, text),
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["article-messages", articleId] });
      queryClient.invalidateQueries({ queryKey: ["contest-articles", contestCode] });
    },
  });

  // Re-review mutation
  const reReviewMutation = useMutation({
    mutationFn: (note: string) => requestArticleReReview(articleId, note),
    onSuccess: () => {
      setShowReReviewForm(false);
      setReReviewNote("");
      setReReviewError(null);
      queryClient.invalidateQueries({ queryKey: ["article-messages", articleId] });
      queryClient.invalidateQueries({ queryKey: ["contest-articles", contestCode] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
      if (onReReviewRequested) onReReviewRequested();
    },
    onError: (err: any) => {
      setReReviewError(err?.message || "Failed to submit re-review request");
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed || postMutation.isPending) return;
    postMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleReReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reReviewNote.trim();
    if (!trimmed || reReviewMutation.isPending) return;
    reReviewMutation.mutate(trimmed);
  };

  if (!article) return null;

  const articleTitle = (article as any).article_title || article.title || "";
  const submitterUsername =
    (article as any).user_name ||
    article.submitter_username ||
    (article as any).submitted_by ||
    (article as any).wiki_creator ||
    "";
  const isAuthor = Boolean(
    currentUsername &&
      submitterUsername &&
      currentUsername.trim().toLowerCase() === submitterUsername.trim().toLowerCase()
  );
  const canParticipate = Boolean(currentUsername && (isAuthor || isJuryOrOrganizer));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card border border-border shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border/70 bg-muted/20 shrink-0">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base font-bold text-foreground truncate">
                  {articleTitle}
                </DialogTitle>
                <Badge
                  variant={
                    article.status === "accepted"
                      ? "default"
                      : article.status === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-[11px] capitalize shrink-0 font-medium h-5"
                >
                  {article.status}
                </Badge>
                {article.re_review_requested && (
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 h-5"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>{t("feather-rereview-badge", "Re-review requested")}</span>
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Submitted by: <strong>{submitterUsername}</strong></span>
                <span>•</span>
                <span>{(article.word_count || 0).toLocaleString()} words</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Re-Review Banner / Call-to-Action */}
        {article.status === "rejected" && (
          <div className="px-4 py-2.5 border-b border-border/70 bg-amber-500/10 text-xs">
            {article.re_review_requested ? (
              <div className="flex items-start gap-2.5 text-amber-700 dark:text-amber-300">
                <RefreshCw className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="font-semibold">
                    {t("feather-rereview-already-requested", "Re-review has already been requested and is pending in the jury queue.")}
                  </p>
                  {article.re_review_note && (
                    <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 italic bg-amber-500/10 p-1.5 rounded">
                      &quot;{article.re_review_note}&quot;
                    </p>
                  )}
                </div>
              </div>
            ) : isAuthor ? (
              <div>
                {!showReReviewForm ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="font-semibold text-xs">
                          {t("feather-rereview-criteria-fixed", "Fixed criteria or added content on Wikipedia?")}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                        {t("feather-rereview-refresh-hint", "Submitting this request will automatically re-fetch the latest article word and byte counts from Wikipedia.")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setShowReReviewForm(true)}
                      className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium gap-1 shrink-0 cursor-pointer shadow-xs self-start sm:self-auto"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>{t("feather-rereview-btn", "Request Re-review")}</span>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleReReviewSubmit} className="space-y-2 mt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-foreground">
                        {t("feather-rereview-note-label", "Explanation of changes made")}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowReReviewForm(false)}
                        className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <Textarea
                      value={reReviewNote}
                      onChange={(e) => setReReviewNote(e.target.value)}
                      placeholder={t(
                        "feather-rereview-note-placeholder",
                        "e.g., Added 200 words, fixed missing inline citations, and translated the remaining sections..."
                      )}
                      rows={2}
                      className="text-xs bg-background resize-none"
                      required
                    />
                    {reReviewError && (
                      <p className="text-[11px] text-destructive">{reReviewError}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={reReviewMutation.isPending || !reReviewNote.trim()}
                        className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium cursor-pointer"
                      >
                        {reReviewMutation.isPending ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            <span>{t("feather-rereview-submitting", "Submitting request...")}</span>
                          </>
                        ) : (
                          <span>{t("feather-rereview-submit-btn", "Submit Re-review Request")}</span>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Message Thread List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[380px] bg-background">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Loading discussion...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-semibold text-foreground">
                {t("feather-discussion-title", "Article Discussion")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px]">
                {t(
                  "feather-discussion-empty",
                  "No messages in this discussion yet. Ask a question or provide criteria clarification."
                )}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSenderAuthor = msg.username === submitterUsername;
              const isMe = currentUsername && msg.username === currentUsername;

              if (msg.is_system) {
                return (
                  <div
                    key={msg.id}
                    className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-muted/40 border border-border/50 text-xs text-muted-foreground"
                  >
                    <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-semibold text-foreground">
                      {msg.username}:
                    </span>
                    <span className="flex-1 truncate">{msg.message}</span>
                    <span className="text-[10px] opacity-70 shrink-0">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isMe ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-muted-foreground flex-wrap">
                    <span className="font-semibold text-foreground">
                      {msg.username}
                    </span>
                    <UserBadge username={msg.username} contestRoles={contestRoles} />
                    {isSenderAuthor && (
                      <span className="text-[9px] bg-muted px-1.5 py-0.2 rounded font-medium">
                        Author
                      </span>
                    )}
                    <span>•</span>
                    <span className="text-[10px]">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-xl text-xs max-w-[85%] whitespace-pre-wrap leading-relaxed shadow-2xs ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-xs"
                        : "bg-muted text-foreground rounded-tl-xs border border-border/60"
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer / Input area */}
        <div className="p-3 border-t border-border/70 bg-muted/20 shrink-0">
          {canParticipate ? (
            <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t(
                  "feather-discussion-placeholder",
                  "Type your message or clarification here..."
                )}
                rows={1}
                className="text-xs bg-background resize-none min-h-[38px] max-h-[80px] flex-1 py-2"
              />
              <Button
                type="submit"
                size="sm"
                disabled={postMutation.isPending || !messageText.trim()}
                className="h-[38px] px-3 gap-1.5 cursor-pointer shrink-0 font-medium"
              >
                {postMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {t("feather-discussion-send-btn", "Send")}
                    </span>
                  </>
                )}
              </Button>
            </form>
          ) : !currentUsername ? (
            <div className="py-1 text-center text-xs text-muted-foreground">
              {t(
                "feather-discussion-login-required",
                "You must be logged in to participate in the discussion."
              )}
            </div>
          ) : (
            <div className="py-1 text-center text-xs text-muted-foreground">
              {t(
                "feather-discussion-forbidden",
                "Only the author, contest juries, and organizers can participate in this discussion."
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
