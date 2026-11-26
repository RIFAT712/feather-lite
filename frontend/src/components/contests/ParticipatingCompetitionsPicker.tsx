"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AvailableContest, fetchGlobalAvailableContests } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { getProjectMeta, getLanguageName } from "@/lib/wikis";
import { CodexLanguageIcon } from "@/components/icons/CodexIcons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TimezoneSelector from "@/components/contests/TimezoneSelector";
import { Layers, Search, X, Loader2, ChevronDown, Check, CheckCircle } from "lucide-react";

interface ParticipatingCompetitionsPickerProps {
  selectedContests: AvailableContest[];
  onAddContest: (contest: AvailableContest) => void;
  onRemoveContest: (code: string) => void;
  wikiTZ: string;
  onChangeTZ: (tz: string) => void;
  excludeCode?: string;
  disabled?: boolean;
  showTimezoneSelector?: boolean;
}

/**
 * Shared multi-community campaign competition picker used by both
 * Contest Creation and Contest Settings forms.
 */
export default function ParticipatingCompetitionsPicker({
  selectedContests,
  onAddContest,
  onRemoveContest,
  wikiTZ,
  onChangeTZ,
  excludeCode,
  disabled = false,
  showTimezoneSelector = true,
}: ParticipatingCompetitionsPickerProps) {
  const { t, locale } = useI18n();
  const [compSearch, setCompSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");

  const { data: availableContests = [], isLoading: isLoadingAvailable } = useQuery<AvailableContest[]>({
    queryKey: ["availableContests"],
    queryFn: () => fetchGlobalAvailableContests(),
  });

  const scopedAvailableContests = useMemo(() => {
    if (!excludeCode) return availableContests;
    return availableContests.filter((c) => c.code !== excludeCode);
  }, [availableContests, excludeCode]);

  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    scopedAvailableContests.forEach((c) => {
      set.add(getProjectMeta(c.wiki_dbname).id);
    });
    return Array.from(set).sort();
  }, [scopedAvailableContests]);

  const uniqueLanguages = useMemo(() => {
    const set = new Set<string>();
    scopedAvailableContests.forEach((c) => {
      if (c.wiki_lang) set.add(c.wiki_lang);
    });
    return Array.from(set).sort();
  }, [scopedAvailableContests]);

  const filteredAvailableContests = useMemo(() => {
    return scopedAvailableContests.filter((c) => {
      if (selectedProject !== "all") {
        if (getProjectMeta(c.wiki_dbname).id !== selectedProject) return false;
      }
      if (selectedLanguage !== "all" && c.wiki_lang !== selectedLanguage) {
        return false;
      }
      if (compSearch.trim()) {
        const q = compSearch.toLowerCase().trim();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesCode = c.code.toLowerCase().includes(q);
        const matchesDb = c.wiki_dbname.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDb) return false;
      }
      return true;
    });
  }, [scopedAvailableContests, selectedProject, selectedLanguage, compSearch]);

  return (
    <div
      id="participating-competitions-section"
      className="space-y-4 rounded-xl border border-border/80 bg-muted/10 p-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("feather-campaign-select-existing-title", String(selectedContests.length))}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("feather-campaign-select-existing-hint")}
          </p>
        </div>
        {showTimezoneSelector && (
          <div className={`w-full sm:w-auto ${disabled ? "pointer-events-none opacity-60" : ""}`}>
            <TimezoneSelector
              value={wikiTZ}
              onChange={onChangeTZ}
              label={t("feather-create-wiki-tz-label")}
            />
          </div>
        )}
      </div>

      {/* Search & Project/Language Filters Toolbar */}
      {!disabled && (
        <div className="space-y-2.5 bg-card p-3 rounded-lg border border-border/60 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={compSearch}
                onChange={(e) => setCompSearch(e.target.value)}
                placeholder={t(
                  "feather-campaign-link-search-placeholder",
                  "Search ongoing competitions by name, code, or wiki..."
                )}
                className="w-full h-8 pl-8 pr-7 rounded-md border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {compSearch ? (
                <button
                  type="button"
                  onClick={() => setCompSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : isLoadingAvailable ? (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : null}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
              {/* All Projects Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-md border border-border/70 hover:bg-muted/80 transition-colors shadow-2xs select-none outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer bg-background text-foreground"
                  aria-label={t("feather-filter-project")}
                >
                  {selectedProject === "all" ? (
                    <>
                      <img
                        src="/icons/projects/wikimedia.svg"
                        alt=""
                        className="h-3.5 w-3.5 object-contain opacity-80 shrink-0"
                      />
                      <span>{t("feather-filter-all-projects")}</span>
                    </>
                  ) : (
                    (() => {
                      const meta = getProjectMeta(selectedProject);
                      const label =
                        t(`feather-project-${meta.id}`) ||
                        (locale === "bn" ? meta.nativeName : meta.name);
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
                          <span className="font-semibold text-foreground truncate max-w-[95px]">
                            {label}
                          </span>
                        </>
                      );
                    })()
                  )}
                  <ChevronDown className="h-3 w-3 opacity-60 ms-0.5 shrink-0" />
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  className="w-48 p-1 rounded-lg shadow-md border bg-popover z-50"
                >
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
                      <span
                        className={
                          selectedProject === "all"
                            ? "font-bold text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {t("feather-filter-all-projects")}
                      </span>
                    </div>
                    {selectedProject === "all" && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1" />

                  {uniqueProjects.map((p) => {
                    const meta = getProjectMeta(p);
                    const isSelected = selectedProject === p;
                    const label =
                      t(`feather-project-${meta.id}`) ||
                      (locale === "bn" ? meta.nativeName : meta.name);
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
                          <span
                            className={
                              isSelected ? "font-bold text-foreground" : "text-muted-foreground"
                            }
                          >
                            {label}
                          </span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* All Languages Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-md border border-border/70 hover:bg-muted/80 transition-colors shadow-2xs select-none outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer bg-background text-foreground"
                  aria-label={t("feather-filter-language")}
                >
                  <CodexLanguageIcon className="h-3.5 w-3.5 opacity-80 shrink-0" />
                  {selectedLanguage === "all" ? (
                    <span>{t("feather-filter-all-languages")}</span>
                  ) : (
                    (() => {
                      const langName = getLanguageName(selectedLanguage, locale);
                      return (
                        <span className="font-semibold text-foreground truncate max-w-[95px]">
                          {langName} ({selectedLanguage.toUpperCase()})
                        </span>
                      );
                    })()
                  )}
                  <ChevronDown className="h-3 w-3 opacity-60 ms-0.5 shrink-0" />
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  className="w-48 p-1 rounded-lg shadow-md border bg-popover z-50 max-h-60 overflow-y-auto"
                >
                  <DropdownMenuItem
                    onClick={() => setSelectedLanguage("all")}
                    className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md"
                  >
                    <span
                      className={
                        selectedLanguage === "all"
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {t("feather-filter-all-languages")}
                    </span>
                    {selectedLanguage === "all" && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1" />

                  {uniqueLanguages.map((langCode) => {
                    const isSelected = selectedLanguage === langCode;
                    const langName = getLanguageName(langCode, locale);
                    return (
                      <DropdownMenuItem
                        key={langCode}
                        onClick={() => setSelectedLanguage(langCode)}
                        className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              isSelected ? "font-bold text-foreground" : "text-muted-foreground"
                            }
                          >
                            {langName}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">
                            ({langCode})
                          </span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {(selectedProject !== "all" || selectedLanguage !== "all" || compSearch) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedProject("all");
                    setSelectedLanguage("all");
                    setCompSearch("");
                  }}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Reset filters"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Available Contests Picker List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-border/40 rounded-md border border-border/60 bg-background/50">
            {filteredAvailableContests.length === 0 ? (
              <div className="py-5 text-center text-xs text-muted-foreground">
                {t("feather-campaign-no-avail-contests", "No standalone ongoing competitions found.")}
              </div>
            ) : (
              filteredAvailableContests.map((c) => {
                const isAlreadyAdded = selectedContests.some((sel) => sel.code === c.code);
                return (
                  <div
                    key={c.code}
                    className="flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors text-xs gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Ongoing" />
                        <span className="font-semibold text-foreground truncate">{c.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-4">
                          {c.code}
                        </Badge>
                        <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-4 uppercase">
                          {c.wiki_dbname}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(c.start_date).toLocaleDateString()} –{" "}
                          {new Date(c.end_date).toLocaleDateString()}
                        </span>
                        {c.total_articles > 0 && (
                          <span className="text-[10px] text-primary/80 font-medium">
                            {c.total_articles} articles
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant={isAlreadyAdded ? "ghost" : "outline"}
                      size="sm"
                      disabled={isAlreadyAdded}
                      onClick={() => onAddContest(c)}
                      className={`h-6.5 text-xs px-2.5 shrink-0 ${
                        isAlreadyAdded
                          ? "text-muted-foreground cursor-default"
                          : "cursor-pointer text-primary border-primary/40 hover:bg-primary/10"
                      }`}
                    >
                      {isAlreadyAdded ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="h-3 w-3" />
                          {t("feather-campaign-already-added", "Added")}
                        </span>
                      ) : (
                        <span>+ {t("feather-campaign-link-btn", "Add")}</span>
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Selected Competitions List */}
      <div className="space-y-2 pt-1">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Selected Competitions ({selectedContests.length}):
        </div>

        {selectedContests.length === 0 ? (
          <div className="text-center py-6 px-4 text-xs text-muted-foreground border border-dashed rounded-lg bg-card/40">
            {t("feather-campaign-no-comps-selected")}
          </div>
        ) : (
          <div className="space-y-2">
            {selectedContests.map((c, idx) => (
              <div
                key={c.code}
                className="p-3 rounded-lg border border-border/80 bg-card shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-foreground truncate">{c.name}</span>
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-4">
                        {c.code}
                      </Badge>
                      <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-4 uppercase">
                        {c.wiki_dbname}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 capitalize ${
                          c.status === "active"
                            ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {c.status}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(c.start_date).toLocaleDateString()} –{" "}
                      {new Date(c.end_date).toLocaleDateString()}
                      {c.total_articles > 0 && ` • ${c.total_articles} articles`}
                    </div>
                  </div>
                </div>

                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                    onClick={() => onRemoveContest(c.code)}
                    title="Remove competition"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
