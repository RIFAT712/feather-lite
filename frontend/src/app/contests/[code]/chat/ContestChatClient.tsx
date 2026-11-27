"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Share2, Check, ExternalLink, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";
import { type Contest, type UserSession } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CommunityChatPanel from "@/components/chat/CommunityChatPanel";
import { type ContestRoleScope } from "@/components/users/UserBadge";
import { toast } from "sonner";

interface ContestChatClientProps {
  code: string;
  initialContest: Contest;
  initialUser: UserSession | null;
}

export default function ContestChatClient({
  code,
  initialContest,
  initialUser,
}: ContestChatClientProps) {
  const { t } = useI18n();
  const [copiedLink, setCopiedLink] = useState(false);

  const contest = initialContest;
  const user = initialUser;

  const contestRoles = useMemo<ContestRoleScope>(() => ({
    organizers: contest.organizers,
    juries: contest.juries,
  }), [contest.organizers, contest.juries]);

  const isOrganizer = useMemo(() => {
    if (!user?.is_authenticated) return false;
    if (user.role === "owner" || user.role === "admin" || (user as any)?.is_owner || (user as any)?.is_admin) return true;
    if (contest.created_by_id && user.user_id && contest.created_by_id === user.user_id) return true;
    const meLower = user.wiki_username?.trim().toLowerCase();
    if (!meLower) return false;
    if (contest.created_by_username && contest.created_by_username.trim().toLowerCase() === meLower) return true;
    if (contest.organizers?.some((o) => o.trim().toLowerCase() === meLower)) return true;
    return false;
  }, [user, contest]);

  const isJuryOrOrganizer = useMemo(() => {
    if (isOrganizer) return true;
    if (!user?.is_authenticated) return false;
    const meLower = user.wiki_username?.trim().toLowerCase();
    if (!meLower) return false;
    if (contest.juries?.some((j) => j.trim().toLowerCase() === meLower)) return true;
    return false;
  }, [isOrganizer, user, contest]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success(t("feather-contest-link-copied"));
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-5xl space-y-6">
      {/* 1. Header Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/contests/${code}`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
            >
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180 transition-transform group-hover:-translate-x-0.5" />
              <span className="font-medium">{t("feather-contest-back-to-contest")}</span>
            </Link>
            <span className="text-border">•</span>
            {contest.wiki_dbname && (
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 uppercase">
                {contest.wiki_dbname}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
              {t("feather-chat-title")}
            </Badge>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
              <MessageCircle className="h-4 w-4" />
            </div>
            <span>{contest.name}</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("feather-chat-subtitle")}
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="h-8 text-xs gap-1.5 cursor-pointer shadow-2xs"
          >
            {copiedLink ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
            <span>{copiedLink ? t("feather-copied") : t("feather-contest-action-share")}</span>
          </Button>

          <Link href={`/contests/${code}`}>
            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs gap-1.5 cursor-pointer font-medium shadow-xs"
            >
              <span>{t("feather-contest-back-to-contest")}</span>
              <ExternalLink className="h-3.5 w-3.5 rtl:rotate-180" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Embedded Community Chat Panel */}
      <CommunityChatPanel
        contestCode={code}
        contestName={contest.name}
        isUmbrella={Boolean(contest.is_umbrella)}
        parentContestId={contest.parent_contest_id}
        isJuryOrAdmin={isJuryOrOrganizer}
        currentUsername={user?.wiki_username}
        contestRoles={contestRoles}
      />
    </div>
  );
}
