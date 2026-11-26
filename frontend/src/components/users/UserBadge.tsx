"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchElevatedUsers, fetchUserRole } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";

export interface ContestRoleScope {
  organizers?: string[];
  juries?: string[];
  createdBy?: string | null;
}

interface UserBadgeProps {
  username?: string | null;
  role?: string | null;
  contestRoles?: ContestRoleScope;
  isContestOrganizer?: boolean;
  isContestJury?: boolean;
  className?: string;
}

function matchesUsername(target: string | null | undefined, username: string | null | undefined): boolean {
  if (!target || !username) return false;
  return target.trim().toLowerCase() === username.trim().toLowerCase();
}

function listContainsUsername(list: string[] | undefined, username: string | null | undefined): boolean {
  if (!list || !username) return false;
  const lower = username.trim().toLowerCase();
  return list.some((entry) => (entry || "").trim().toLowerCase() === lower);
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

export default function UserBadge({
  username,
  role,
  contestRoles,
  isContestOrganizer = false,
  isContestJury = false,
  className = "",
}: UserBadgeProps) {
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

  const hasOrganizerTag = Boolean(
    isContestOrganizer ||
      (contestRoles &&
        (matchesUsername(contestRoles.createdBy, username) ||
          listContainsUsername(contestRoles.organizers, username)))
  );
  const hasJuryTag = Boolean(
    isContestJury || (contestRoles && listContainsUsername(contestRoles.juries, username))
  );

  if (!effectiveRole && !hasOrganizerTag && !hasJuryTag) return null;

  return (
    <span className={`inline-flex items-center gap-1 shrink-0 ${className}`}>
      {effectiveRole === "owner" && (
        <span
          className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-400 shrink-0 whitespace-nowrap shadow-2xs select-none"
          title={`${username || "User"} is Platform Owner`}
        >
          <span>{t("feather-role-owner")}</span>
        </span>
      )}

      {effectiveRole === "steward" && (
        <span
          className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border border-purple-500/35 bg-purple-500/10 text-purple-700 dark:text-purple-400 shrink-0 whitespace-nowrap shadow-2xs select-none"
          title={`${username || "User"} is Wikimedia Global Steward`}
        >
          <span>{t("feather-role-steward") || t("feather-role-admin")}</span>
        </span>
      )}

      {effectiveRole === "admin" && (
        <span
          className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-400 shrink-0 whitespace-nowrap shadow-2xs select-none"
          title={`${username || "User"} is Wikimedia Admin / Steward`}
        >
          <span>{t("feather-role-admin")}</span>
        </span>
      )}

      {hasOrganizerTag && (
        <span
          className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border border-indigo-500/35 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shrink-0 whitespace-nowrap shadow-2xs select-none"
          title={`${username || "User"} is an Organizer of this contest`}
        >
          <span>{t("feather-role-organizer")}</span>
        </span>
      )}

      {hasJuryTag && (
        <span
          className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0 whitespace-nowrap shadow-2xs select-none"
          title={`${username || "User"} is a Jury member of this contest`}
        >
          <span>{t("feather-role-jury")}</span>
        </span>
      )}
    </span>
  );
}
