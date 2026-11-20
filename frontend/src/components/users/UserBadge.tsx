"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchElevatedUsers, fetchUserRole } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";

interface UserBadgeProps {
  username?: string | null;
  role?: string | null;
  className?: string;
}

export function useElevatedRoles() {
  const { data: elevatedUsers = {} } = useQuery<Record<string, "owner" | "admin" | "steward">>({
    queryKey: ["elevatedUsers"],
    queryFn: fetchElevatedUsers,
    staleTime: 5 * 60 * 1000,
  });

  const getRole = (username?: string | null): "owner" | "admin" | "steward" | null => {
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

  const knownRole =
    role === "owner" || role === "admin" || role === "steward" ? role : getRole(username);

  // If role is not yet known from props or elevatedUsers, dynamically query backend
  const { data: dynamicRole } = useQuery<string | null>({
    queryKey: ["userRole", username?.toLowerCase()],
    queryFn: () => (username ? fetchUserRole(username) : Promise.resolve(null)),
    enabled: !!username && !knownRole,
    staleTime: 10 * 60 * 1000,
  });

  const effectiveRole = knownRole || dynamicRole;

  if (!effectiveRole) return null;

  if (effectiveRole === "owner") {
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-400 shrink-0 whitespace-nowrap shadow-2xs select-none ${className}`}
        title={`${username || "User"} is Platform Owner`}
      >
        <span>{t("feather-role-owner")}</span>
      </span>
    );
  }

  if (effectiveRole === "steward") {
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border border-purple-500/35 bg-purple-500/10 text-purple-700 dark:text-purple-400 shrink-0 whitespace-nowrap shadow-2xs select-none ${className}`}
        title={`${username || "User"} is Wikimedia Global Steward`}
      >
        <span>{t("feather-role-steward") || t("feather-role-admin")}</span>
      </span>
    );
  }

  if (effectiveRole === "admin") {
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-400 shrink-0 whitespace-nowrap shadow-2xs select-none ${className}`}
        title={`${username || "User"} is Wikimedia Admin / Steward`}
      >
        <span>{t("feather-role-admin")}</span>
      </span>
    );
  }

  return null;
}
