"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { searchWikis, getWikiInfo, fetchLiveWikimediaWikis, getWikiIcon, WikiInfo } from "@/lib/wikis";
import { Input } from "@/components/ui/input";
import { FloatingInput } from "@/components/ui/floating-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { 
  Search, ExternalLink, Check, ChevronDown, 
  Settings2, X, ArrowLeft, RefreshCw
} from "lucide-react";

interface WikiSelectorProps {
  wikiDbName: string;
  wikiURL: string;
  wikiLang: string;
  label?: string;
  labelBg?: string;
  onChange: (data: { dbname: string; url: string; lang: string; nativeName?: string; timezone?: string }) => void;
}

export default function WikiSelector({
  wikiDbName,
  wikiURL,
  wikiLang,
  label = "Target Wikimedia Wiki *",
  labelBg = "bg-card",
  onChange,
}: WikiSelectorProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync freshest Wikimedia database in background on mount
  useEffect(() => {
    let mounted = true;
    fetchLiveWikimediaWikis()
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsSyncing(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Find wiki metadata from catalog or dynamic parser
  const selectedWiki = useMemo(() => {
    return getWikiInfo(wikiDbName);
  }, [wikiDbName]);

  // Search results from 860+ official Wikimedia wikis
  const searchResults = useMemo(() => {
    return searchWikis(query);
  }, [query]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSelect = (wiki: WikiInfo) => {
    onChange({
      dbname: wiki.dbname,
      url: wiki.url,
      lang: wiki.lang,
      nativeName: wiki.nativeName,
      timezone: wiki.timezone,
    });
    setQuery("");
    setIsOpen(false);
    setIsCustomMode(false);
  };

  const handleEnableCustom = () => {
    setIsCustomMode(true);
    setIsOpen(false);
  };

  // If user enabled custom manual parameters mode
  if (isCustomMode) {
    return (
      <div
        ref={dropdownRef}
        className="w-full rounded-md border border-primary/40 bg-card p-2.5 space-y-2.5 shadow-2xs animate-in fade-in-0 duration-150"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Custom Wikimedia Parameters
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsCustomMode(false)}
            className="h-6 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-2"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Back to Catalog
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <FloatingInput
            label="Wiki URL *"
            value={wikiURL}
            onChange={(e) =>
              onChange({
                dbname: wikiDbName,
                url: e.target.value,
                lang: wikiLang,
              })
            }
            className="h-9 text-xs font-mono"
            labelBg="bg-card"
          />
          <FloatingInput
            label="Database (dbname) *"
            value={wikiDbName}
            onChange={(e) =>
              onChange({
                dbname: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                url: wikiURL,
                lang: wikiLang,
              })
            }
            className="h-9 text-xs font-mono"
            labelBg="bg-card"
          />
          <FloatingInput
            label="Language Code *"
            value={wikiLang}
            onChange={(e) =>
              onChange({
                dbname: wikiDbName,
                url: wikiURL,
                lang: e.target.value.toLowerCase().trim(),
              })
            }
            className="h-9 text-xs font-mono"
            labelBg="bg-card"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Google-Style Floating Combobox Trigger */}
      <div
        id="wiki-selector-trigger"
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          "w-full h-11 rounded-md border border-input/90 bg-transparent px-3 flex items-center justify-between text-left transition-all duration-150 cursor-pointer outline-none select-none",
          "hover:border-muted-foreground/50",
          isOpen
            ? "border-primary ring-1 ring-primary"
            : "focus:border-primary focus:ring-1 focus:ring-primary"
        )}
      >
        {/* Google-Style Floating Label */}
        <span
          className={cn(
            "pointer-events-none absolute left-2.5 top-0 -translate-y-1/2 px-1.5 py-0.5 text-xs font-medium leading-none rounded-xs z-10 transition-colors",
            labelBg,
            isOpen ? "text-primary font-semibold" : "text-muted-foreground"
          )}
        >
          {label}
        </span>

        {/* Selected Wiki Summary with Real Project Icon */}
        <div className="flex items-center gap-2.5 min-w-0 pr-1">
          <div className="flex h-5 w-5 items-center justify-center shrink-0">
            <img
              src={getWikiIcon(selectedWiki?.project)}
              alt={selectedWiki?.project || "wiki"}
              className="h-4 w-4 object-contain"
              onError={(e) => {
                e.currentTarget.src = "/icons/projects/wikipedia.svg";
              }}
            />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
            {selectedWiki ? selectedWiki.nativeName : wikiDbName || "Select Target Wiki"}
          </span>
          {wikiDbName && (
            <Badge
              variant="secondary"
              className="text-[10px] font-mono px-1.5 py-0 h-4 border border-border/80 shrink-0 font-medium"
            >
              {wikiDbName}
            </Badge>
          )}
          {wikiURL && (
            <span className="text-[11px] text-muted-foreground font-mono truncate hidden lg:inline">
              {wikiURL.replace(/^https?:\/\//, "")}
            </span>
          )}
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
          {wikiURL && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                window.open(wikiURL, "_blank", "noopener,noreferrer");
              }}
              className="p-1 hover:text-foreground hover:bg-muted/50 rounded transition-colors cursor-pointer"
              title="Open wiki in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "rotate-180 text-primary"
            )}
          />
        </div>
      </div>

      {/* Searchable Autocomplete Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-lg border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Search Input Box */}
          <div className="p-2 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search 860+ wikis by name, dbname, or code (e.g. bnwiki, enwiki, বাংলা)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 pr-7 text-xs h-8 bg-background"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Suggestions List with Real Official Wiki Icons */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {searchResults.length > 0 ? (
              searchResults.map((wiki) => {
                const isSelected = wiki.dbname === wikiDbName;

                return (
                  <div
                    key={wiki.dbname}
                    onClick={() => handleSelect(wiki)}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-xs",
                      isSelected
                        ? "bg-primary/10 font-medium text-primary border border-primary/20"
                        : "hover:bg-muted/70 text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Real Official Wikimedia Project Icon */}
                      <div className="flex h-5 w-5 items-center justify-center shrink-0">
                        <img
                          src={getWikiIcon(wiki.project)}
                          alt={wiki.project}
                          className="h-4 w-4 object-contain"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = "/icons/projects/wikipedia.svg";
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold truncate">{wiki.nativeName}</span>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-mono px-1 py-0 h-3.5 border-border shrink-0"
                        >
                          {wiki.dbname}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                          · {wiki.domain}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1.5" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground space-y-2">
                <p>No wiki matched &quot;{query}&quot;</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleEnableCustom}
                  className="h-7 text-xs cursor-pointer"
                >
                  Configure Custom Wiki
                </Button>
              </div>
            )}
          </div>

          {/* Custom Wiki Footer Trigger */}
          <div className="p-2 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
              860+ wikis from Wikimedia database
            </span>
            <button
              type="button"
              onClick={handleEnableCustom}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
            >
              <Settings2 className="h-3 w-3" />
              Custom Parameters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
