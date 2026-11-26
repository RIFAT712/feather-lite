"use client";

import * as React from "react";
import { cn } from "cn";
import { useI18n } from "@/i18n/I18nContext";
import { Badge } from "@/components/ui/badge";
import { UserCheck, User, X, Loader2, Plus, AlertCircle } from "lucide-react";
import { suggestUsers } from "@/lib/api";

export interface UserTagInputProps {
  id?: string;
  label?: string;
  value: string[];
  onChange: (users: string[]) => void;
  wikiUrl?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  labelBg?: string;
  hint?: string;
  compact?: boolean;
  className?: string;
  required?: boolean;
}

export function UserTagInput({
  id,
  label,
  value = [],
  onChange,
  wikiUrl,
  placeholder,
  disabled = false,
  error,
  labelBg = "bg-card",
  hint,
  compact = false,
  className,
  required = false,
}: UserTagInputProps) {
  const { t } = useI18n();
  const effectivePlaceholder = placeholder || t("feather-usertag-placeholder");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const [input, setInput] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  // Debounced search for Wikimedia usernames
  React.useEffect(() => {
    const clean = input.trim();
    if (!clean || disabled) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await suggestUsers(clean, wikiUrl);
        // Exclude users already added
        const filtered = results.filter((u) => !value.includes(u));
        setSuggestions(filtered);
        setIsOpen(filtered.length > 0);
        setSelectedIndex(-1);
      } catch {
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [input, wikiUrl, disabled, value]);

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

  const addTag = (username: string) => {
    const clean = username.trim();
    if (!clean) return;
    if (!value.includes(clean)) {
      onChange([...value, clean]);
    }
    setInput("");
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((u) => u !== tagToRemove));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        addTag(suggestions[selectedIndex]);
      } else if (input.trim()) {
        addTag(input.trim());
      }
    } else if (e.key === ",") {
      e.preventDefault();
      if (input.trim()) {
        addTag(input.trim());
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
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted.includes(",") || pasted.includes("\n") || pasted.includes(";")) {
      e.preventDefault();
      const parts = pasted
        .split(/[,;\n\t]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      const combined = [...value];
      for (const p of parts) {
        if (!combined.includes(p)) combined.push(p);
      }
      onChange(combined);
      setInput("");
    }
  };

  return (
    <div className="w-full" ref={containerRef} id={id}>
      {/* Selected Tags Listed on Top */}
      {value.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          {value.map((user) => (
            <Badge
              key={user}
              variant="secondary"
              className={cn(
                "gap-1.5 font-medium border border-border/80 bg-muted/70 text-foreground flex items-center shrink-0 animate-in zoom-in-95 duration-100",
                compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
              )}
            >
              <UserCheck className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate max-w-[200px]">{user}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(user);
                  }}
                  className="text-muted-foreground hover:text-foreground cursor-pointer -mr-0.5 p-0.5 rounded-xs transition-colors"
                  title={t("feather-usertag-remove", user)}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {value.length > 1 && !disabled && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-muted-foreground hover:text-destructive cursor-pointer transition-colors px-1"
            >
              {t("feather-usertag-clear-all")}
            </button>
          )}
        </div>
      )}

      {/* Input container with floating label */}
      <div className="relative w-full">
        <div
          onClick={() => inputRef.current?.focus()}
          className={cn(
            "peer relative flex items-center w-full rounded-md border bg-transparent text-foreground transition-all duration-150 cursor-text",
            compact ? "h-9 px-2.5 text-xs" : "h-11 px-3 text-xs sm:text-sm",
            error
              ? "border-destructive ring-1 ring-destructive/60 focus-within:border-destructive focus-within:ring-destructive"
              : isFocused
              ? "border-primary ring-1 ring-primary"
              : "border-input/90 hover:border-border",
            disabled && "cursor-not-allowed opacity-50 bg-muted/30",
            className
          )}
        >
          <div className="flex-1 flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              disabled={disabled}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => {
                setIsFocused(true);
                if (suggestions.length > 0) setIsOpen(true);
              }}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={effectivePlaceholder}
              className={cn(
                "w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60",
                compact ? "text-xs" : "text-xs sm:text-sm"
              )}
            />
            {isLoading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0 ms-1" />
            )}
          </div>
        </div>

        {/* Floating Notched Label on Top Border */}
        {label && (
          <label
            onClick={() => inputRef.current?.focus()}
            className={cn(
              "pointer-events-none absolute left-2.5 top-0 -translate-y-1/2 px-1.5 py-0 text-xs font-medium leading-none select-none rounded-xs z-10 transition-colors flex items-center gap-0.5",
              labelBg,
              error
                ? "text-destructive font-semibold"
                : isFocused
                ? "text-primary font-semibold"
                : "text-muted-foreground"
            )}
          >
            <span>{label}</span>
            {required && <span className="text-destructive font-bold ml-0.5">*</span>}
          </label>
        )}

        {/* Suggestions Dropdown Popover */}
        {isOpen && suggestions.length > 0 && !disabled && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-card text-card-foreground border border-border rounded-xl shadow-xl overflow-hidden py-1 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 flex items-center justify-between">
              <span>{t("feather-usertag-suggestions")}</span>
              <span>{t("feather-usertag-press-enter")}</span>
            </div>

            <div className="divide-y divide-border/30">
              {suggestions.map((suggestion, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={suggestion}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent blur
                      addTag(suggestion);
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
                    <Plus className="h-3.5 w-3.5 opacity-60 shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Helper text or error */}
      {error ? (
        <p className="mt-1.5 text-[11px] text-destructive font-medium flex items-center gap-1.5 animate-in fade-in-0 duration-150">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-muted-foreground pl-0.5">{hint}</p>
      ) : null}
    </div>
  );
}
