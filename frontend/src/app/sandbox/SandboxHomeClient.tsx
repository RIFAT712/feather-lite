"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchContests, Contest, PlatformOverview } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { getProjectMeta, getLanguageName } from "@/lib/wikis";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import SandboxPlatformPulse from "./_components/SandboxPlatformPulse";
import { Search, X, Plus, ChevronDown, Check, ArrowRight } from "lucide-react";

interface SandboxHomeClientProps {
  initialContests: Contest[];
  initialOverview: PlatformOverview;
}

export default function SandboxHomeClient({
  initialContests,
  initialOverview,
}: SandboxHomeClientProps) {
  const { t, n, locale, formatDate } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "ended">("active");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");

  const { data: contests } = useQuery<Contest[]>({
    queryKey: ["sandbox-contests"],
    queryFn: async () => {
      try {
        const res = await fetchContests();
        return res && res.length > 0 ? res : initialContests;
      } catch {
        return initialContests;
      }
    },
    initialData: initialContests,
    staleTime: 60 * 1000,
  });

  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    contests.forEach((c) => set.add(getProjectMeta(c.wiki_dbname).id));
    return Array.from(set).sort();
  }, [contests]);

  const uniqueLanguages = useMemo(() => {
    const set = new Set<string>();
    contests.forEach((c) => {
      if (c.wiki_lang) set.add(c.wiki_lang);
    });
    return Array.from(set).sort();
  }, [contests]);

  const getTimeMeta = (startDateStr: string, endDateStr: string) => {
    const now = Date.now();
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();
    const total = Math.max(1, end - start);
    const isEnded = now >= end;
    const notStarted = now < start;

    if (notStarted) {
      const diffDays = Math.ceil((start - now) / 86400000);
      return { percent: 0, diffDays, isEnded: false, notStarted: true };
    }
    if (isEnded) {
      return { percent: 100, diffDays: 0, isEnded: true, notStarted: false };
    }
    const elapsed = Math.min(total, Math.max(0, now - start));
    const percent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    const diffDays = Math.ceil((end - now) / 86400000);
    return { percent, diffDays, isEnded: false, notStarted: false };
  };

  const filteredContests = useMemo(() => {
    return contests.filter((c) => {
      const time = getTimeMeta(c.start_date, c.end_date);
      const isEnded = c.status === "ended" || time.isEnded;
      if (statusFilter === "active" && (c.status !== "active" || isEnded)) return false;
      if (statusFilter === "ended" && !isEnded) return false;

      if (selectedProject !== "all" && getProjectMeta(c.wiki_dbname).id !== selectedProject) {
        return false;
      }
      if (selectedLanguage !== "all" && c.wiki_lang !== selectedLanguage) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.wiki_dbname?.toLowerCase().includes(q)
      );
    });
  }, [contests, statusFilter, selectedProject, selectedLanguage, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("feather-contests-heading")}
            </h1>
            <span className="text-xs font-mono text-muted-foreground tabular-nums">
              {n(filteredContests.length)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{t("feather-contests-subheading")}</p>
        </div>

        <Link
          href="/sandbox/contests/new"
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t("feather-nav-create-contest")}</span>
        </Link>
      </div>

      {/* Minimal Platform Pulse */}
      <SandboxPlatformPulse overview={initialOverview} />

      {/* Calm Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={t("feather-search-specific-comp")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-9 text-xs bg-muted/30 border-transparent focus:border-border focus:bg-background rounded-lg"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Segmented Control */}
          <div className="inline-flex items-center rounded-lg bg-muted/40 p-0.5 text-xs">
            {(["active", "all", "ended"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === status
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {status === "active"
                  ? t("feather-home-filter-active")
                  : status === "all"
                  ? t("feather-home-filter-all")
                  : t("feather-home-filter-ended")}
              </button>
            ))}
          </div>

          {/* Ghost Project Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedProject !== "all"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <span>
                {selectedProject === "all"
                  ? t("feather-filter-all-projects")
                  : t(`feather-project-${selectedProject}`) || selectedProject}
              </span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 p-1">
              <DropdownMenuItem
                onClick={() => setSelectedProject("all")}
                className="flex items-center justify-between text-xs cursor-pointer"
              >
                <span>{t("feather-filter-all-projects")}</span>
                {selectedProject === "all" && <Check className="h-3.5 w-3.5" />}
              </DropdownMenuItem>
              {uniqueProjects.map((p) => {
                const meta = getProjectMeta(p);
                const label = t(`feather-project-${meta.id}`) || (locale === "bn" ? meta.nativeName : meta.name);
                return (
                  <DropdownMenuItem
                    key={p}
                    onClick={() => setSelectedProject(p)}
                    className="flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span>{label}</span>
                    {selectedProject === p && <Check className="h-3.5 w-3.5" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Ghost Language Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedLanguage !== "all"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <span>
                {selectedLanguage === "all"
                  ? t("feather-filter-all-languages")
                  : getLanguageName(selectedLanguage, locale)}
              </span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 p-1 max-h-64 overflow-y-auto">
              <DropdownMenuItem
                onClick={() => setSelectedLanguage("all")}
                className="flex items-center justify-between text-xs cursor-pointer"
              >
                <span>{t("feather-filter-all-languages")}</span>
                {selectedLanguage === "all" && <Check className="h-3.5 w-3.5" />}
              </DropdownMenuItem>
              {uniqueLanguages.map((lang) => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className="flex items-center justify-between text-xs cursor-pointer"
                >
                  <span>{getLanguageName(lang, locale)}</span>
                  {selectedLanguage === lang && <Check className="h-3.5 w-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Minimal Contest Card Grid */}
      {filteredContests.length === 0 ? (
        <div className="py-16 text-center space-y-2 border border-dashed border-border/60 rounded-xl">
          <p className="text-sm font-medium text-foreground">{t("feather-home-no-results")}</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setSelectedProject("all");
              setSelectedLanguage("all");
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
          >
            {t("feather-home-reset-filters")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContests.map((c) => {
            const time = getTimeMeta(c.start_date, c.end_date);
            const isEnded = c.status === "ended" || time.isEnded;
            const isUpcoming = !isEnded && c.status === "active" && time.notStarted;
            const pMeta = getProjectMeta(c.wiki_dbname);
            const projectLabel = c.is_umbrella
              ? t("feather-campaign-badge")
              : t(`feather-project-${pMeta.id}`) || pMeta.name;

            const statusDotColor = isEnded
              ? "bg-muted-foreground/50"
              : isUpcoming
              ? "bg-blue-500"
              : "bg-emerald-500";

            const statusLabel = isEnded
              ? t("feather-contest-status-ended")
              : isUpcoming
              ? t("feather-contest-status-upcoming")
              : t("feather-contest-status-active");

            return (
              <div
                key={c.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border/50 bg-card p-5 hover:border-foreground/20 hover:bg-muted/15 transition-colors gap-4"
              >
                <div className="space-y-3">
                  {/* Quiet Top Meta Line */}
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80 shrink-0">
                        <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor}`} />
                        {statusLabel}
                      </span>
                      <span className="text-border">·</span>
                      <span className="truncate">
                        {projectLabel}
                        {!c.is_umbrella && c.wiki_lang ? ` (${c.wiki_lang})` : ""}
                      </span>
                    </div>
                    <span className="shrink-0 tabular-nums">
                      {formatDate(c.start_date, { month: "short", day: "numeric", timeZone: c.wiki_tz || "UTC" })}
                      {" – "}
                      {formatDate(c.end_date, { month: "short", day: "numeric", timeZone: c.wiki_tz || "UTC" })}
                    </span>
                  </div>

                  {/* Title & 2-Line Description */}
                  <div className="space-y-1.5">
                    <h2 className="text-base font-semibold tracking-tight text-foreground leading-snug">
                      <Link
                        href={`/sandbox/contests/${c.code}`}
                        className="after:absolute after:inset-0 focus:outline-none"
                      >
                        {c.name}
                      </Link>
                    </h2>
                    <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed min-h-[2.5rem] break-words">
                      {c.description || t("feather-contest-no-desc")}
                    </p>
                  </div>

                  {/* Hairline Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        {isEnded
                          ? t("feather-contest-ended")
                          : isUpcoming
                          ? t("feather-contest-starts-in-days", time.diffDays)
                          : t("feather-contest-days-left", time.diffDays)}
                      </span>
                      <span className="tabular-nums">{isEnded ? 100 : time.percent}%</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isEnded ? "bg-muted-foreground/40" : "bg-foreground/75"
                        }`}
                        style={{ width: `${isEnded ? 100 : time.percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Quiet Inline Footer */}
                <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3 tabular-nums">
                    <span>
                      <strong className="font-medium text-foreground">{n(c.total_articles || 0)}</strong>{" "}
                      {t("feather-contest-submitted")}
                    </span>
                    <span>
                      <strong className="font-medium text-foreground">{n(c.accepted_articles || 0)}</strong>{" "}
                      {t("feather-contest-accepted")}
                    </span>
                  </div>

                  {!isEnded && !c.is_umbrella ? (
                    <Link
                      href={`/sandbox/contests/${c.code}/submit`}
                      className="relative z-10 inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
                    >
                      <span>{t("feather-contest-submit")}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      <span>{t("feather-home-view-dashboard")}</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
