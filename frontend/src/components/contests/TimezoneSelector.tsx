"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Clock, Search, Check, ChevronDown, X, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import { getTimezoneOffsetLabel } from "@/lib/time";

export interface TimezoneItem {
  id: string; // IANA name e.g. "Asia/Dhaka"
  city: string; // "Dhaka"
  region: string; // "Asia"
  offset: string; // "GMT+6"
  popular?: boolean;
}

// Popular Wikimedia community timezones placed at top of list
const POPULAR_TIMEZONES = [
  "UTC",
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Kathmandu",
  "Asia/Karachi",
  "Asia/Colombo",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Toronto",
  "Australia/Sydney",
];

export default function TimezoneSelector({
  value,
  onChange,
  label = "Timezone *",
  labelBg = "bg-card",
}: {
  value: string;
  onChange: (tz: string) => void;
  label?: string;
  labelBg?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Generate complete list of browser-supported IANA timezones
  const allTimezones = useMemo<TimezoneItem[]>(() => {
    let rawList: string[] = [];
    try {
      rawList = (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf("timeZone");
    } catch {
      rawList = POPULAR_TIMEZONES;
    }

    // Ensure UTC and popular aliases are included
    const set = new Set(["UTC", "Asia/Kolkata", ...POPULAR_TIMEZONES, ...rawList]);
    const items: TimezoneItem[] = [];

    set.forEach((tz) => {
      const parts = tz.split("/");
      const region = parts[0] || "";
      const city = (parts[1] || parts[0]).replace(/_/g, " ");
      const offset = getTimezoneOffsetLabel(tz);

      items.push({
        id: tz,
        city,
        region,
        offset,
        popular: POPULAR_TIMEZONES.includes(tz),
      });
    });

    // Sort popular first, then alphabetically by region/city
    return items.sort((a, b) => {
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
      return a.id.localeCompare(b.id);
    });
  }, []);

  // Filtered search results
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allTimezones.slice(0, 30);

    return allTimezones
      .filter((item) => {
        return (
          item.id.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q) ||
          item.region.toLowerCase().includes(q) ||
          item.offset.toLowerCase().includes(q) ||
          item.offset.replace(/[^0-9+-]/g, "").includes(q)
        );
      })
      .slice(0, 35);
  }, [allTimezones, query]);

  // Focus search when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const activeOffset = useMemo(() => {
    return getTimezoneOffsetLabel(value);
  }, [value]);

  const handleSelect = (tz: string) => {
    onChange(tz);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Combobox Trigger Field */}
      <div
        id="timezone-selector-trigger"
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
        {/* Floating Google-style Label */}
        <span
          className={cn(
            "pointer-events-none absolute left-2.5 top-0 -translate-y-1/2 px-1.5 py-0.5 text-xs font-medium leading-none rounded-xs z-10 transition-colors",
            labelBg,
            isOpen ? "text-primary font-semibold" : "text-muted-foreground"
          )}
        >
          {label}
        </span>

        {/* Selected Timezone Value */}
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
            {value || "Select Timezone"}
          </span>
          {activeOffset && (
            <Badge
              variant="secondary"
              className="text-[10px] font-mono px-1.5 py-0 h-4 border border-border/80 shrink-0 font-semibold text-muted-foreground"
              suppressHydrationWarning
            >
              {activeOffset}
            </Badge>
          )}
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </div>

      {/* Searchable Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-lg border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Search Box */}
          <div className="p-2 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={searchInputRef}
                placeholder="Search city, region, or GMT offset (e.g. Dhaka, +6, UTC)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-8 pr-7 text-xs h-8 rounded-md border border-input bg-background text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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

          {/* Timezone Items List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {searchResults.length > 0 ? (
              searchResults.map((item) => {
                const isSelected = item.id === value;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-xs",
                      isSelected
                        ? "bg-primary/10 font-semibold text-primary border border-primary/20"
                        : "hover:bg-muted/70 text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold truncate">{item.id}</span>
                        {item.offset && (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-mono px-1 py-0 h-3.5 border-border shrink-0"
                          >
                            {item.offset}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                          ({item.city})
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
              <div className="p-4 text-center text-xs text-muted-foreground">
                <p>No timezone found matching &quot;{query}&quot;</p>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="p-2 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
              <Globe className="h-3 w-3" /> 400+ IANA global timezones
            </span>
            <span className="text-[11px] font-mono">{activeOffset || "GMT"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
