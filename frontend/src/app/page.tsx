"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchContests, Contest } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { getProjectMeta, getWikiInfo, getLanguageName } from "@/lib/wikis";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CodexLanguageIcon } from "@/components/icons/CodexIcons";
import PlatformPulse from "@/components/home/PlatformPulse";
import {
  Trophy,
  FileText,
  CheckCircle2,
  PlusCircle,
  Search,
  X,
  ExternalLink,
  Clock,
  ShieldCheck,
  Send,
  Eye,
  ChevronDown,
  Check,
  Layers,
  Globe,
} from "lucide-react";

export default function HomePage() {
  const { t, n, locale, isRtl } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "ended">("active");
  const [typeFilter, setTypeFilter] = useState<"all" | "campaigns" | "single">("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");

  const { data: contests, isLoading, error } = useQuery<Contest[]>({
    queryKey: ["contests"],
    queryFn: fetchContests,
    staleTime: 60 * 1000,
  });

  // Extract unique projects (normalized Wikimedia projects: wikipedia, wiktionary, wikisource, wikibooks, etc.)
  const uniqueProjects = useMemo(() => {
    if (!contests) return [];
    const set = new Set<string>();
    contests.forEach((c) => {
      const p = getProjectMeta(c.wiki_dbname).id;
      set.add(p);
    });
    return Array.from(set).sort();
  }, [contests]);

  // Extract unique languages (wiki langs)
  const uniqueLanguages = useMemo(() => {
    if (!contests) return [];
    const set = new Set<string>();
    contests.forEach((c) => {
      if (c.wiki_lang) set.add(c.wiki_lang);
    });
    return Array.from(set).sort();
  }, [contests]);

  // Calculate time remaining and duration progress
  const getTimeRemaining = (startDateStr: string, endDateStr: string) => {
    const now = Date.now();
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();
    const total = Math.max(1, end - start);
    const elapsed = Math.min(total, Math.max(0, now - start));
    const percent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    const diffMs = end - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isEnded = now >= end;
    const notStarted = now < start;

    return { percent, diffDays, isEnded, notStarted };
  };

  // Filter and sort contests
  const processedContests = useMemo(() => {
    if (!contests) return [];

    const filtered = contests.filter((c) => {
      // Status
      if (statusFilter === "active" && c.status !== "active") return false;
      if (statusFilter === "ended" && c.status !== "ended") return false;

      // Type/Format filter
      if (typeFilter === "campaigns" && !c.is_umbrella) return false;
      if (typeFilter === "single" && c.is_umbrella) return false;

      // Project filter
      if (selectedProject !== "all") {
        const pMeta = getProjectMeta(c.wiki_dbname);
        if (pMeta.id !== selectedProject && c.wiki_dbname !== selectedProject) return false;
      }

      // Language filter
      if (selectedLanguage !== "all" && c.wiki_lang !== selectedLanguage) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const pMeta = getProjectMeta(c.wiki_dbname);
      const matchName = c.name?.toLowerCase().includes(q);
      const matchCode = c.code?.toLowerCase().includes(q);
      const matchWiki = c.wiki_dbname?.toLowerCase().includes(q);
      const matchLang = c.wiki_lang?.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      const matchProject = pMeta.name.toLowerCase().includes(q) || pMeta.nativeName.toLowerCase().includes(q);
      const langName = getLanguageName(c.wiki_lang || "", locale).toLowerCase();
      const matchLangName = langName.includes(q);

      return matchName || matchCode || matchWiki || matchLang || matchDesc || matchProject || matchLangName;
    });

    return filtered.sort((a, b) => {
      // Default: competitions ending soonest first
      return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
    });
  }, [contests, statusFilter, typeFilter, selectedProject, selectedLanguage, searchQuery, locale]);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("active");
    setTypeFilter("all");
    setSelectedProject("all");
    setSelectedLanguage("all");
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-7xl">
      {/* 1. Page Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/70">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {t("feather-contests-heading")}
            </h1>
            {contests && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-muted text-muted-foreground border border-border/60">
                {contests.length}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("feather-contests-subheading")}
          </p>
        </div>

        <Link
          href="/contests/new"
          className={buttonVariants({
            variant: "default",
            size: "sm",
            className: "h-8 px-3 text-xs gap-1.5 font-medium shrink-0 cursor-pointer shadow-xs",
          })}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          {t("feather-nav-create-contest")}
        </Link>
      </div>
      
      {/* Platform Movement Pulse (All Time & This Month) */}
      <div className="mt-5">
        <PlatformPulse />
      </div>

      {/* 2. Unified Toolbar Block */}
      <div className="mt-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Search Input (Full width on mobile, bounded on desktop) */}
        <div className="relative w-full md:w-72 lg:w-80 shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={t("feather-search-specific-comp")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-7 h-8 text-xs bg-muted/20 border-border/70 focus:bg-background rounded-md transition-colors w-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filters and Controls (Responsive: clean toolbar on desktop, full width on mobile) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
          {/* Status Segmented Control */}
          <div className="inline-flex items-center rounded-md border border-border/70 bg-muted/30 p-0.5 text-xs font-medium w-full sm:w-auto shrink-0 justify-center sm:justify-start">
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-sm text-xs transition-colors cursor-pointer text-center whitespace-nowrap ${
                statusFilter === "active"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("feather-home-filter-active")}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-sm text-xs transition-colors cursor-pointer text-center whitespace-nowrap ${
                statusFilter === "all"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("feather-home-filter-all")}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ended")}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-sm text-xs transition-colors cursor-pointer text-center whitespace-nowrap ${
                statusFilter === "ended"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("feather-home-filter-ended")}
            </button>
          </div>

          {/* Dimension Filters: Type, Project, Language */}
          <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 w-full sm:w-auto shrink-0">
            {/* Format / Type Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`inline-flex items-center justify-between sm:justify-start gap-1 sm:gap-1.5 h-8 px-2 sm:px-2.5 text-xs font-medium rounded-md border transition-colors shadow-2xs select-none outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer whitespace-nowrap w-full sm:w-auto shrink-0 ${
                  typeFilter !== "all"
                    ? "border-primary/50 bg-primary/5 text-primary"
                    : "border-border/70 bg-background text-foreground hover:bg-muted/80"
                }`}
                aria-label={t("feather-filter-type")}
              >
                <div className="flex items-center gap-1 min-w-0 truncate">
                  <Layers className="h-3.5 w-3.5 opacity-75 shrink-0" />
                  <span className="truncate">
                    {typeFilter === "all" && t("feather-filter-all-types")}
                    {typeFilter === "campaigns" && t("feather-filter-type-campaigns")}
                    {typeFilter === "single" && t("feather-filter-type-single")}
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 opacity-60 ms-0.5 shrink-0" />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" className="w-52 p-1 rounded-lg shadow-md border bg-popover z-50">
                <DropdownMenuItem
                  onClick={() => setTypeFilter("all")}
                  className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md"
                >
                  <span className={typeFilter === "all" ? "font-bold text-foreground" : "text-muted-foreground"}>
                    {t("feather-filter-all-types")}
                  </span>
                  {typeFilter === "all" && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuItem
                  onClick={() => setTypeFilter("campaigns")}
                  className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className={typeFilter === "campaigns" ? "font-bold text-foreground" : "text-muted-foreground"}>
                      {t("feather-filter-type-campaigns")}
                    </span>
                  </div>
                  {typeFilter === "campaigns" && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setTypeFilter("single")}
                  className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <span className={typeFilter === "single" ? "font-bold text-foreground" : "text-muted-foreground"}>
                      {t("feather-filter-type-single")}
                    </span>
                  </div>
                  {typeFilter === "single" && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Project Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`inline-flex items-center justify-between sm:justify-start gap-1 sm:gap-1.5 h-8 px-2 sm:px-2.5 text-xs font-medium rounded-md border transition-colors shadow-2xs select-none outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer whitespace-nowrap w-full sm:w-auto shrink-0 ${
                  selectedProject !== "all"
                    ? "border-primary/50 bg-primary/5 text-primary"
                    : "border-border/70 bg-background text-foreground hover:bg-muted/80"
                }`}
                aria-label={t("feather-filter-project")}
              >
                <div className="flex items-center gap-1 min-w-0 truncate">
                  {selectedProject === "all" ? (
                    <>
                      <img
                        src="/icons/projects/wikimedia.svg"
                        alt=""
                        className="h-3.5 w-3.5 object-contain opacity-75 shrink-0"
                      />
                      <span className="truncate">{t("feather-filter-all-projects")}</span>
                    </>
                  ) : (
                    (() => {
                      const meta = getProjectMeta(selectedProject);
                      const label = t(`feather-project-${meta.id}`) || (locale === "bn" ? meta.nativeName : meta.name);
                      return (
                        <>
                          <img
                            src={meta.icon}
                            alt=""
                            className="h-3.5 w-3.5 object-contain shrink-0"
                            onError={(e) => {
                              e.currentTarget.src = "/icons/projects/wikipedia.svg";
                            }}
                          />
                          <span className="font-semibold text-foreground truncate">{label}</span>
                        </>
                      );
                    })()
                  )}
                </div>
                <ChevronDown className="h-3 w-3 opacity-60 ms-0.5 shrink-0" />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" className="w-48 p-1 rounded-lg shadow-md border bg-popover z-50">
                <DropdownMenuItem
                  onClick={() => setSelectedProject("all")}
                  className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src="/icons/projects/wikimedia.svg"
                      alt=""
                      className="h-3.5 w-3.5 object-contain shrink-0"
                    />
                    <span className={selectedProject === "all" ? "font-bold text-foreground" : "text-muted-foreground"}>
                      {t("feather-filter-all-projects")}
                    </span>
                  </div>
                  {selectedProject === "all" && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                {uniqueProjects.map((p) => {
                  const meta = getProjectMeta(p);
                  const isSelected = selectedProject === p;
                  const label = t(`feather-project-${meta.id}`) || (locale === "bn" ? meta.nativeName : meta.name);
                  return (
                    <DropdownMenuItem
                      key={p}
                      onClick={() => setSelectedProject(p)}
                      className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={meta.icon}
                          alt=""
                          className="h-3.5 w-3.5 object-contain shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = "/icons/projects/wikipedia.svg";
                          }}
                        />
                        <span className={isSelected ? "font-bold text-foreground" : "text-muted-foreground"}>
                          {label}
                        </span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Language Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`inline-flex items-center justify-between sm:justify-start gap-1 sm:gap-1.5 h-8 px-2 sm:px-2.5 text-xs font-medium rounded-md border transition-colors shadow-2xs select-none outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer whitespace-nowrap w-full sm:w-auto shrink-0 ${
                  selectedLanguage !== "all"
                    ? "border-primary/50 bg-primary/5 text-primary"
                    : "border-border/70 bg-background text-foreground hover:bg-muted/80"
                }`}
                aria-label={t("feather-filter-language")}
              >
                <div className="flex items-center gap-1 min-w-0 truncate">
                  <CodexLanguageIcon className="h-3.5 w-3.5 opacity-75 shrink-0" />
                  {selectedLanguage === "all" ? (
                    <span className="truncate">{t("feather-filter-all-languages")}</span>
                  ) : (
                    (() => {
                      const langName = getLanguageName(selectedLanguage, locale);
                      return (
                        <span className="font-semibold text-foreground truncate">
                          {langName} ({selectedLanguage.toUpperCase()})
                        </span>
                      );
                    })()
                  )}
                </div>
                <ChevronDown className="h-3 w-3 opacity-60 ms-0.5 shrink-0" />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56 max-h-72 overflow-y-auto p-1 rounded-lg shadow-md border bg-popover z-50">
                <DropdownMenuItem
                  onClick={() => setSelectedLanguage("all")}
                  className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <CodexLanguageIcon className="h-3.5 w-3.5 opacity-70 shrink-0" />
                    <span className={selectedLanguage === "all" ? "font-bold text-foreground" : "text-muted-foreground"}>
                      {t("feather-filter-all-languages")}
                    </span>
                  </div>
                  {selectedLanguage === "all" && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                {uniqueLanguages.map((lang) => {
                  const isSelected = selectedLanguage === lang;
                  const langName = getLanguageName(lang, locale);
                  return (
                    <DropdownMenuItem
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <span className={isSelected ? "font-bold text-foreground" : "text-muted-foreground"}>
                          {langName}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted/70 px-1 py-0.5 rounded">
                          {lang.toUpperCase()}
                        </span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 3. Subtle Results Counter */}
      {(searchQuery || selectedProject !== "all" || selectedLanguage !== "all" || statusFilter !== "active" || typeFilter !== "all") && (
        <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
          <span>
            {t("feather-home-showing-count", n(processedContests.length))}
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-primary hover:underline cursor-pointer font-medium text-xs whitespace-nowrap"
          >
            {t("feather-home-clear-filters")}
          </button>
        </div>
      )}

      {/* 4. Contest Cards Grid Block */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={`skeleton-${i}`}
              className="group flex flex-col justify-between rounded-lg border border-border bg-card p-3.5 sm:p-4 min-h-[210px] gap-2.5 [contain-intrinsic-size:auto_210px]"
            >
              <div className="space-y-2">
                {/* Meta badges & time row */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-5 w-24 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-16 rounded" />
                </div>

                {/* Title & Description */}
                <div className="space-y-1">
                  <Skeleton className="h-5 w-3/4 rounded" />
                  <Skeleton className="h-3.5 w-full rounded" />
                </div>

                {/* Timeline Tracker */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-3 w-8 rounded" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>

                {/* Clean Metrics Row */}
                <div className="flex items-center gap-3 pt-1.5 border-t border-border/50">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-border/60">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-7 w-16 rounded-md" />
                  <Skeleton className="h-7 w-24 rounded-md" />
                </div>
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center border border-dashed rounded-lg bg-destructive/5 mt-4">
          <p className="text-destructive font-medium text-xs sm:text-sm">
            Failed to connect to backend service. Ensure the Go service is listening on port 8080.
          </p>
          <Button variant="outline" size="sm" className="mt-3 text-xs cursor-pointer" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : processedContests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
          {processedContests.map((c) => {
            const time = getTimeRemaining(c.start_date, c.end_date);
            const isActive = c.status === "active";
            const total = c.total_articles || 0;
            const accepted = c.accepted_articles || 0;

            return (
              <div
                key={c.id}
                className="group flex flex-col justify-between rounded-lg border border-border bg-card p-3.5 sm:p-4 hover:border-foreground/25 hover:shadow-2xs transition-colors duration-150 text-card-foreground gap-2.5 [content-visibility:auto] [contain-intrinsic-size:auto_210px]"
              >
                <div className="space-y-2">
                  {/* Meta badges & time row */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      {/* Status Indicator Badge */}
                      {(() => {
                        const isPending = c.status === "pending_approval";
                        const isDraft = c.status === "draft";
                        const isEnded = c.status === "ended";

                        let label = c.status;
                        if (isActive) label = t("feather-contest-status-active");
                        else if (isPending) label = t("feather-contest-status-pending-approval");
                        else if (isDraft) label = t("feather-contest-status-draft");
                        else if (isEnded) label = t("feather-contest-status-ended");

                        let badgeClass = "bg-muted/40 text-muted-foreground border-border/60";
                        let dotEl = <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 shrink-0" />;

                        if (isActive) {
                          badgeClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
                          dotEl = (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                          );
                        } else if (isPending) {
                          badgeClass = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25";
                          dotEl = (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                            </span>
                          );
                        } else if (isDraft) {
                          badgeClass = "bg-muted/60 text-muted-foreground border-border/70";
                          dotEl = <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />;
                        }

                        return (
                          <div
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border shrink-0 whitespace-nowrap h-5 ${badgeClass}`}
                          >
                            {dotEl}
                            <span>{label}</span>
                          </div>
                        );
                      })()}

                      {c.is_umbrella ? (
                        <div
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 h-5 rounded-md text-[11px] font-medium text-foreground/90 bg-muted/30 border border-border/70 shrink-0 whitespace-nowrap"
                          title={t("feather-campaign-badge")}
                        >
                          <Layers className="h-3 w-3 text-primary shrink-0" />
                          <span className="font-medium">{t("feather-campaign-badge")}</span>
                          {c.sub_contest_count ? (
                            <span className="text-[10px] font-mono text-primary bg-primary/10 px-1 py-0.2 rounded font-medium">
                              {t("feather-campaign-communities-count", c.sub_contest_count)}
                            </span>
                          ) : null}
                        </div>
                      ) : (() => {
                        const pMeta = getProjectMeta(c.wiki_dbname);
                        const pName = t(`feather-project-${pMeta.id}`) || (locale === "bn" ? pMeta.nativeName : pMeta.name);
                        const wikiInfo = getWikiInfo(c.wiki_dbname);
                        return (
                          <Badge
                            variant="outline"
                            className="text-[11px] font-medium gap-1.5 px-2 py-0.5 h-5 text-foreground/90 bg-muted/30 border-border/70 hover:bg-muted/50 transition-colors shrink-0 whitespace-nowrap"
                            title={`${wikiInfo?.englishName || pMeta.name} (${c.wiki_dbname})`}
                          >
                            <img
                              src={pMeta.icon}
                              alt=""
                              width={14}
                              height={14}
                              loading="lazy"
                              decoding="async"
                              className="h-3.5 w-3.5 object-contain shrink-0"
                              onError={(e) => {
                                e.currentTarget.src = "/icons/projects/wikipedia.svg";
                              }}
                            />
                            <span className="font-medium text-foreground">{pName}</span>
                            {c.wiki_lang && (
                              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                ({c.wiki_lang})
                              </span>
                            )}
                          </Badge>
                        );
                      })()}
                    </div>

                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {time.isEnded
                        ? t("feather-contest-ended")
                        : time.diffDays <= 0
                        ? t("feather-contest-today-end")
                        : t("feather-contest-days-left", time.diffDays)}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-0.5">
                    <h2 className="text-sm sm:text-base font-bold tracking-tight line-clamp-1">
                      <Link
                        href={`/contests/${c.code}`}
                        className="hover:underline text-foreground cursor-pointer"
                      >
                        {c.name}
                      </Link>
                    </h2>

                    <p className="line-clamp-1 text-xs text-muted-foreground leading-normal">
                      {c.description || t("feather-contest-no-desc")}
                    </p>
                  </div>

                  {/* Timeline Tracker */}
                  <div className="space-y-1 pt-0.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 text-[10.5px]">
                        <Clock className="h-3 w-3 text-muted-foreground/70" />
                        {t("feather-time-remaining")}
                      </span>
                      <span className="font-mono text-[10px]">
                        {t("feather-time-elapsed", time.percent)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          time.isEnded
                            ? "bg-muted-foreground/50"
                            : time.diffDays <= 3
                            ? "bg-amber-500"
                            : "bg-primary"
                        }`}
                        style={{ width: `${time.percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Clean Metrics Row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1.5 border-t border-border/50">
                    <span className="flex items-center gap-1" title={t("feather-contest-submitted")}>
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <strong className="text-foreground font-semibold font-mono">{n(total)}</strong>
                      <span className="text-[11px]">{t("feather-contest-submitted")}</span>
                    </span>

                    <span className="flex items-center gap-1" title={t("feather-contest-accepted")}>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <strong className="text-foreground font-semibold font-mono">{n(accepted)}</strong>
                      <span className="text-[11px]">{t("feather-contest-accepted")}</span>
                    </span>

                    {c.is_umbrella ? (
                      <span className="flex items-center gap-1 text-primary" title={t("feather-campaign-stat-communities")}>
                        <Globe className="h-3.5 w-3.5 text-primary" />
                        <strong className="text-foreground font-semibold font-mono">{n(c.sub_contest_count || 0)}</strong>
                        <span className="text-[11px] font-medium">{t("feather-campaign-stat-communities")}</span>
                      </span>
                    ) : c.total_juries ? (
                      <span className="flex items-center gap-1" title={t("feather-home-stats-juries")}>
                        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        <strong className="text-foreground font-semibold font-mono">{c.total_juries}</strong>
                        <span className="text-[11px]">{t("feather-home-stats-juries")}</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-border/60">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <Link
                      href={`/contests/${c.code}`}
                      className={buttonVariants({
                        variant: "default",
                        size: "sm",
                        className: "h-7 text-xs gap-1 font-medium cursor-pointer px-2 sm:px-2.5 shadow-none shrink-0",
                      })}
                    >
                      <Eye className="h-3.5 w-3.5 shrink-0" />
                      <span>{t("feather-action-view")}</span>
                    </Link>

                    {c.is_umbrella ? (
                      <Link
                        href={`/contests/${c.code}#communities`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                          className: "h-7 text-xs gap-1 font-medium cursor-pointer px-2 sm:px-2.5 min-w-0 truncate",
                        })}
                      >
                        <Globe className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          <span className="hidden sm:inline">Participating </span>
                          {locale === "bn" ? "কমিউনিটি" : "Communities"}
                        </span>
                      </Link>
                    ) : (
                      <Link
                        href={`/contests/${c.code}/submit`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                          className: "h-7 text-xs gap-1 font-medium cursor-pointer px-2 sm:px-2.5 min-w-0 truncate",
                        })}
                      >
                        <Send className="h-3 w-3 shrink-0" />
                        <span className="truncate">{t("feather-contest-action-submit")}</span>
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0 ml-1">
                    <Link
                      href={`/contests/${c.code}#standings`}
                      className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                        className: "h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer shrink-0",
                      })}
                      title={c.is_umbrella ? t("feather-campaign-tab-leaderboard") : t("feather-contest-action-standings")}
                    >
                      <Trophy className="h-3.5 w-3.5" />
                    </Link>

                    {!c.is_umbrella && (
                      <Link
                        href={`/contests/${c.code}/review`}
                        className={buttonVariants({
                          variant: "ghost",
                          size: "sm",
                          className: "h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer shrink-0",
                        })}
                        title={t("feather-contest-action-review")}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-8 text-center border border-dashed rounded-lg bg-muted/10 mt-5">
          <Search className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
          <h2 className="font-semibold text-sm text-foreground">{t("feather-home-search-empty-title")}</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {t("feather-home-search-empty-desc", searchQuery || statusFilter)}
          </p>
          <Button variant="outline" size="sm" className="mt-3 text-xs cursor-pointer" onClick={resetFilters}>
            {t("feather-home-clear-filters")}
          </Button>
        </div>
      )}
    </div>
  );
}
