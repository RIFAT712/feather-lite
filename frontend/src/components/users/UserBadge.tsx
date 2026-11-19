"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchElevatedUsers } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { Crown, ShieldCheck } from "lucide-react";

interface UserBadgeProps {
  username?: string | null;
  role?: string | null;
  className?: string;
}

export function useElevatedRoles() {
  const { data: elevatedUsers = {} } = useQuery<Record<string, "owner" | "admin">>({
    queryKey: ["elevatedUsers"],
    queryFn: fetchElevatedUsers,
    staleTime: 5 * 60 * 1000,
  });

  const getRole = (username?: string | null): "owner" | "admin" | null => {
    if (!username) return null;
    const lower = username.toLowerCase();
    for (const [uname, r] of Object.entries(elevatedUsers)) {
      if (uname.toLowerCase() === lower) {
        return r;
      }
    }
    return null;
  };

  return { elevatedUsers, getRole };
}

export default function UserBadge({ username, role, className = "" }: UserBadgeProps) {
  const { t } = useI18n();
  const { getRole } = useElevatedRoles();

  const effectiveRole =
    role === "owner" || role === "admin" ? role : getRole(username);

  if (!effectiveRole) return null;

  if (effectiveRole === "owner") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-400 shrink-0 whitespace-nowrap shadow-2xs select-none ${className}`}
        title={`${username || "User"} is Platform Owner`}
      >
        <Crown className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>{t("feather-role-owner")}</span>
      </span>
    );
  }

  if (effectiveRole === "admin") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-400 shrink-0 whitespace-nowrap shadow-2xs select-none ${className}`}
        title={`${username || "User"} is Wikimedia Admin`}
      >
        <ShieldCheck className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <span>{t("feather-role-admin")}</span>
      </span>
    );
  }

  return null;
}
