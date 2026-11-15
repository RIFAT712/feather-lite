"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchContests, Contest } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  SlidersHorizontal,
} from "lucide-react";

type SortOption = "ending_soon" | "newest" | "project" | "submissions";

export default function HomePage() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "ended">("active");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [sortOption, setSortOption] = useState<SortOption>("ending_soon");

  const { data: contests, isLoading, error } = useQuery<Contest[]>({
    queryKey: ["contests"],
    queryFn: fetchContests,
  });

  // Extract unique projects (wiki dbnames)
  const uniqueProjects = useMemo(() => {
    if (!contests) return [];
    const set = new Set<string>();
    contests.forEach((c) => {
      if (c.wiki_dbname) set.add(c.wiki_dbname);
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

      // Project
      if (selectedProject !== "all" && c.wiki_dbname !== selectedProject) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchCode = c.code?.toLowerCase().includes(q);
      const matchWiki = c.wiki_dbname?.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);

      return matchName || matchCode || matchWiki || matchDesc;
    });

    return filtered.sort((a, b) => {
      if (sortOption === "ending_soon") {
        return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
      }
      if (sortOption === "newest") {
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      }
      if (sortOption === "project") {
        return (a.wiki_dbname || "").localeCompare(b.wiki_dbname || "");
      }
      if (sortOption === "submissions") {
        return (b.total_articles || 0) - (a.total_articles || 0);
      }
      return 0;
    });
  }, [contests, statusFilter, selectedProject, searchQuery, sortOption]);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("active");
    setSelectedProject("all");
    setSortOption("ending_soon");
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
      {/* 1. Page Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("feather-contests-heading")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("feather-contests-subheading")}
          </p>
        </div>

        <Link
          href="/contests/new"
          className={buttonVariants({
            variant: "default",
            size: "default",
            className: "gap-1.5 font-medium shrink-0 shadow-xs cursor-pointer",
          })}
        >
          <PlusCircle className="h-4 w-4" />
          {t("feather-nav-create-contest")}
        </Link>
      </div>

      {/* 2. Unified Toolbar Block */}
      <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={t("feather-search-specific-comp")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-background border-border"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters and Sorting */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Status Segmented Control */}
          <div className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                statusFilter === "ended"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("feather-home-filter-ended")}
            </button>
          </div>

          {/* Project Filter */}
          {uniqueProjects.length > 1 && (
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground font-mono cursor-pointer outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">{t("feather-filter-all-projects")}</option>
              {uniqueProjects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}

          {/* Sort Selector */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground font-medium cursor-pointer outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ending_soon">{t("feather-sort-ending-soon")}</option>
            <option value="newest">{t("feather-sort-newest")}</option>
            <option value="submissions">{t("feather-sort-submissions")}</option>
            <option value="project">{t("feather-sort-project")}</option>
          </select>
        </div>
      </div>

      {/* 3. Subtle Results Counter */}
      {(searchQuery || selectedProject !== "all" || statusFilter !== "active") && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing <strong>{processedContests.length}</strong> {processedContests.length === 1 ? "competition" : "competitions"}
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-primary hover:underline cursor-pointer font-medium"
          >
            {t("feather-home-clear-filters")}
          </button>
        </div>
      )}

      {/* 4. Shadcn Card Grid Block */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse bg-muted/20 h-48 border border-border rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center border border-dashed rounded-lg bg-destructive/5 mt-5">
          <p className="text-destructive font-medium text-xs sm:text-sm">
            Failed to connect to backend service. Ensure the Go service is listening on port 8080.
          </p>
          <Button variant="outline" size="sm" className="mt-3 text-xs cursor-pointer" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : processedContests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {processedContests.map((c) => {
            const time = getTimeRemaining(c.start_date, c.end_date);
            const isActive = c.status === "active";
            const total = c.total_articles || 0;
            const accepted = c.accepted_articles || 0;

            return (
              <Card
                key={c.id}
                className="flex flex-col justify-between border-border hover:border-foreground/20 transition-colors shadow-2xs"
              >
                <CardHeader className="pb-3">
                  {/* Meta badges row */}
                  <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={isActive ? "secondary" : "outline"}
                        className="text-[11px] font-medium gap-1 px-2 py-0.5"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive ? "bg-emerald-500" : "bg-muted-foreground"
                          }`}
                        />
                        {isActive ? t("feather-contest-status-active") : c.status}
                      </Badge>

                      <Badge variant="outline" className="font-mono text-[11px] px-2 py-0.5 text-muted-foreground">
                        {c.wiki_dbname}
                      </Badge>
                    </div>

                    <span className="text-[11px] font-medium text-muted-foreground">
                      {time.isEnded
                        ? t("feather-contest-ended")
                        : time.diffDays <= 0
                        ? t("feather-contest-today-end")
                        : t("feather-contest-days-left", time.diffDays)}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <CardTitle className="text-base font-bold tracking-tight line-clamp-1">
                    <Link
                      href={`/contests/${c.code}`}
                      className="hover:underline cursor-pointer"
                    >
                      {c.name}
                    </Link>
                  </CardTitle>

                  <CardDescription className="line-clamp-2 text-xs leading-relaxed mt-1">
                    {c.description || "No description provided."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pb-3">
                  {/* Timeline Tracker */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t("feather-time-remaining")}
                      </span>
                      <span className="font-mono text-[10px]">
                        {t("feather-time-elapsed", time.percent)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
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
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <strong className="text-foreground">{total}</strong> {t("feather-contest-submitted")}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <strong className="text-foreground">{accepted}</strong> {t("feather-contest-accepted")}
                    </span>
                    {c.total_juries ? (
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        <strong className="text-foreground">{c.total_juries}</strong> {t("feather-home-stats-juries")}
                      </span>
                    ) : null}
                  </div>
                </CardContent>

                {/* Clean Footer Block */}
                <CardFooter className="flex items-center justify-between gap-1.5 pt-3 border-t border-border bg-muted/20">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      href={`/contests/${c.code}`}
                      className={buttonVariants({
                        variant: "default",
                        size: "sm",
                        className: "h-7 text-xs gap-1 font-medium cursor-pointer px-2.5",
                      })}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t("feather-action-view")}
                    </Link>

                    <Link
                      href={`/contests/${c.code}/submit`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "h-7 text-xs gap-1 font-medium cursor-pointer px-2.5",
                      })}
                    >
                      <Send className="h-3 w-3" />
                      {t("feather-contest-action-submit")}
                    </Link>
                  </div>

                  <div className="flex items-center gap-1">
                    <Link
                      href={`/contests/${c.code}#standings`}
                      className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                        className: "h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer",
                      })}
                      title={t("feather-contest-action-standings")}
                    >
                      <Trophy className="h-3.5 w-3.5" />
                    </Link>

                    <Link
                      href={`/contests/${c.code}/review`}
                      className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                        className: "h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer",
                      })}
                      title={t("feather-contest-action-review")}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-8 text-center border border-dashed rounded-lg bg-muted/10 mt-5">
          <Search className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
          <h3 className="font-semibold text-sm text-foreground">{t("feather-home-search-empty-title")}</h3>
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
