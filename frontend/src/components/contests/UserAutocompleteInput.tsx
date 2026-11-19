"use client";

import * as React from "react";
import { cn } from "cn";
import { User, Loader2, Check } from "lucide-react";
import { suggestUsers } from "@/lib/api";

export interface UserAutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelect?: (val: string) => void;
  wikiUrl?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  label?: string;
  labelBg?: string;
  error?: string;
  hint?: string;
  autoFocus?: boolean;
}

export function UserAutocompleteInput({
  value,
  onChange,
  onSelect,
  wikiUrl,
  placeholder = "Search username...",
  disabled = false,
  className,
  inputClassName,
  label,
  labelBg = "bg-card",
  error,
  hint,
  autoFocus,
}: UserAutocompleteInputProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  // Debounced search for Wikimedia usernames
  React.useEffect(() => {
    const clean = value.trim();
    if (!clean || disabled || !isFocused) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await suggestUsers(clean, wikiUrl);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch {
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [value, wikiUrl, disabled, isFocused]);

  // Click outside listener to dismiss suggestions
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectUser = (username: string) => {
    const clean = username.trim();
    onChange(clean);
    onSelect?.(clean);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (isOpen && selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        selectUser(suggestions[selectedIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && suggestions.length > 0) {
        setIsOpen(true);
        setSelectedIndex(0);
        return;
      }
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen && e.target.value.trim()) setIsOpen(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onBlur={() => {
            setIsFocused(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-md border border-input/90 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-foreground transition-all duration-150 outline-none",
            "focus:border-primary focus:ring-1 focus:ring-primary",
            error && "border-destructive focus:border-destructive focus:ring-destructive",
            disabled && "cursor-not-allowed opacity-50 bg-muted/30",
            inputClassName
          )}
        />
        {isLoading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Floating Notched Label on Top Border */}
      {label && (
        <label
          onClick={() => inputRef.current?.focus()}
          className={cn(
            "pointer-events-none absolute left-2.5 top-0 -translate-y-1/2 px-1.5 py-0 text-xs font-medium leading-none select-none rounded-xs z-10 transition-colors",
            labelBg,
            isFocused ? "text-primary font-semibold" : "text-muted-foreground",
            error && "text-destructive"
          )}
        >
          {label}
        </label>
      )}

      {/* Suggestions Dropdown Popover */}
      {isOpen && suggestions.length > 0 && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-card text-card-foreground border border-border rounded-xl shadow-xl overflow-hidden py-1 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 flex items-center justify-between">
            <span>Wikimedia Suggestions</span>
            <span>Press Enter to select</span>
          </div>

          <div className="divide-y divide-border/30">
            {suggestions.map((suggestion, idx) => {
              const isSelected = idx === selectedIndex;
              const isCurrent = suggestion.toLowerCase() === value.trim().toLowerCase();
              return (
                <div
                  key={suggestion}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectUser(suggestion);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted/40 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{suggestion}</span>
                  </div>
                  {isCurrent && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Helper text or error */}
      {error ? (
        <p className="mt-1 text-[11px] text-destructive">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-muted-foreground pl-0.5">{hint}</p>
      ) : null}
    </div>
  );
}
