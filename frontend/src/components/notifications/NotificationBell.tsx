"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  XCircle,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  CheckCheck,
  Loader2,
  Inbox,
  Trophy,
} from "lucide-react";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NotificationBell() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Unread notification count (polls every 30s)
  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["unread-notifications-count"],
    queryFn: fetchUnreadNotificationCount,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  // Notifications list (loaded when flyout is open)
  const { data: notifData, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(undefined, false, 50),
    enabled: isOpen,
    staleTime: 5_000,
  });

  const notifications = notifData?.items ?? [];
  const displayedNotifications =
    activeTab === "unread"
      ? notifications.filter((n: NotificationItem) => !n.is_read)
      : notifications;

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      try {
        await markNotificationRead(notif.id);
        queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    }
    setIsOpen(false);
    if (notif.link_url) {
      router.push(notif.link_url);
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) {
      return t("feather-notif-relative-just-now");
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return t("feather-notif-relative-mins", String(diffMin));
    }
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) {
      return t("feather-notif-relative-hours", String(diffHr));
    }
    const diffDays = Math.floor(diffHr / 24);
    return t("feather-notif-relative-days", String(diffDays));
  };

  const renderTypeIcon = (type: string) => {
    switch (type) {
      case "contest_approved":
        return (
          <div className="h-7 w-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Trophy className="h-4 w-4" />
          </div>
        );
      case "contest_rejected":
      case "article_rejected":
        return (
          <div className="h-7 w-7 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
            <XCircle className="h-4 w-4" />
          </div>
        );
      case "article_accepted":
        return (
          <div className="h-7 w-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        );
      case "re_review_requested":
        return (
          <div className="h-7 w-7 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <RefreshCw className="h-4 w-4" />
          </div>
        );
      case "article_message":
      default:
        return (
          <div className="h-7 w-7 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <MessageSquare className="h-4 w-4" />
          </div>
        );
    }
  };

  const renderTypeLabel = (type: string) => {
    switch (type) {
      case "contest_approved":
        return t("feather-notif-type-contest-approved");
      case "contest_rejected":
        return t("feather-notif-type-contest-rejected");
      case "article_rejected":
        return t("feather-notif-type-rejected");
      case "article_accepted":
        return t("feather-notif-type-accepted");
      case "re_review_requested":
        return t("feather-notif-type-rereview");
      case "article_message":
      default:
        return t("feather-notif-type-message");
    }
  };

  const renderNotificationTitle = (item: NotificationItem) => {
    switch (item.type) {
      case "contest_approved":
        return t(
          "feather-notif-contest-approved-title",
          item.contest_name || item.title
        );
      case "contest_rejected":
        return t(
          "feather-notif-contest-rejected-title",
          item.contest_name || item.title
        );
      default:
        return item.title;
    }
  };

  const renderNotificationMessage = (item: NotificationItem) => {
    switch (item.type) {
      case "contest_approved":
        return t(
          "feather-notif-contest-approved-body",
          item.contest_name || item.title
        );
      case "contest_rejected":
        if (item.message && item.message.trim() && item.message !== item.title) {
          return t(
            "feather-notif-contest-rejected-reason-body",
            item.contest_name || item.title,
            item.message
          );
        }
        return t(
          "feather-notif-contest-rejected-body",
          item.contest_name || item.title
        );
      default:
        return item.message;
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t("feather-notif-title")}
        className="relative h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-full cursor-pointer focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-xs animate-in zoom-in-75">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Popover Flyout */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[32rem] bg-popover text-popover-foreground border border-border/80 shadow-2xl rounded-xl z-50 flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm text-foreground">
                {t("feather-notif-title")}
              </span>
              {unreadCount > 0 && (
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 text-[10px] font-medium bg-primary/15 text-primary border-transparent rounded-full"
                >
                  {t("feather-notif-unread-count", String(unreadCount))}
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer transition-colors"
                title={t("feather-notif-mark-all-read")}
              >
                <CheckCheck className="h-3 w-3" />
                <span>{t("feather-notif-mark-all-read")}</span>
              </button>
            )}
          </div>

          {/* Sub-header Tabs */}
          <div className="flex items-center border-b border-border/60 bg-muted/15 px-3">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`py-2 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "all"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("feather-notif-tab-all")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={`py-2 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "unread"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{t("feather-notif-tab-unread")}</span>
              {unreadCount > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1 max-h-80 divide-y divide-border/40 overscroll-contain">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-xs">{t("feather-notif-loading")}</span>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="py-12 px-6 flex flex-col items-center justify-center text-center text-muted-foreground">
                <Inbox className="h-9 w-9 text-muted-foreground/40 mb-2 stroke-[1.5]" />
                <p className="text-xs font-semibold text-foreground">
                  {t("feather-notif-empty")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px] leading-relaxed">
                  {t("feather-notif-empty-desc")}
                </p>
              </div>
            ) : (
              displayedNotifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNotificationClick(item)}
                  className={`w-full text-left p-3 flex items-start gap-3 transition-colors cursor-pointer group ${
                    !item.is_read
                      ? "bg-primary/5 hover:bg-primary/10 dark:bg-primary/[0.08] dark:hover:bg-primary/15"
                      : "hover:bg-muted/50"
                  }`}
                >
                  {renderTypeIcon(item.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {renderTypeLabel(item.type)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/75 whitespace-nowrap">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {renderNotificationTitle(item)}
                    </p>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                      {renderNotificationMessage(item)}
                    </p>
                  </div>

                  {!item.is_read && (
                    <span
                      className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5"
                      aria-label="Unread notification"
                    />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
