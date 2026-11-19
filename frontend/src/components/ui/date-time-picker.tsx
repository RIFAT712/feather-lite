"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { 
  Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, 
  Check, ArrowRight, X, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

export interface DateTimePickerProps {
  value: string; // ISO format: YYYY-MM-DDTHH:mm
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  allowClear?: boolean;
  isEnd?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DateTimePicker({
  value,
  onChange,
  label,
  placeholder,
  allowClear = false,
  isEnd = false,
  className,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const parsed = useMemo(() => {
    try {
      if (!value) throw new Error("empty");
      const [datePart, timePart] = value.split("T");
      const [year, month, day] = (datePart || "").split("-").map(Number);
      const [hour24, minute] = (timePart || "00:00").split(":").map(Number);

      const period: "AM" | "PM" = (hour24 || 0) >= 12 ? "PM" : "AM";
      let hour12 = (hour24 || 0) % 12;
      if (hour12 === 0) hour12 = 12;

      return {
        year: year || new Date().getFullYear(),
        month: (month !== undefined ? month - 1 : new Date().getMonth()), // 0-indexed
        day: day || new Date().getDate(),
        hour24: hour24 !== undefined ? hour24 : 0,
        hour12,
        minute: minute !== undefined ? minute : 0,
        period,
        isValid: true,
      };
    } catch {
      const now = new Date();
      return {
        year: now.getFullYear(),
        month: now.getMonth(),
        day: now.getDate(),
        hour24: isEnd ? 23 : 0,
        hour12: isEnd ? 11 : 12,
        minute: isEnd ? 59 : 0,
        period: (isEnd ? "PM" : "AM") as "AM" | "PM",
        isValid: false,
      };
    }
  }, [value, isEnd]);

  // Calendar view navigation state (year & month being browsed)
  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);

  // Generate selectable year options from 2015 to (now + 10)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const start = Math.min(2015, viewYear - 5);
    const end = Math.max(currentYear + 10, viewYear + 5);
    const years: number[] = [];
    for (let y = start; y <= end; y++) {
      years.push(y);
    }
    return years;
  }, [viewYear]);

  // When value prop changes, synchronize calendar view
  useEffect(() => {
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
  }, [parsed.year, parsed.month]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Generate 35-42 calendar days for current view
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    const now = new Date();

    // Previous month filler
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isSelected: false,
        isToday: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const isSelected =
        viewYear === parsed.year &&
        viewMonth === parsed.month &&
        i === parsed.day;

      const isToday =
        viewYear === now.getFullYear() &&
        viewMonth === now.getMonth() &&
        i === now.getDate();

      days.push({
        day: i,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        isSelected,
        isToday,
      });
    }

    // Next month filler
    const remaining = days.length <= 35 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({
        day: i,
        month: m,
        year: y,
        isCurrentMonth: false,
        isSelected: false,
        isToday: false,
      });
    }

    return days;
  }, [viewYear, viewMonth, parsed.year, parsed.month, parsed.day]);

  // Helper to commit date & time to ISO YYYY-MM-DDTHH:mm
  const emitChange = (y: number, m: number, d: number, h: number, min: number) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const iso = `${y}-${pad(m + 1)}-${pad(d)}T${pad(h)}:${pad(min)}`;
    onChange(iso);
  };

  // Select a calendar day
  const handleSelectDay = (item: { day: number; month: number; year: number }) => {
    emitChange(item.year, item.month, item.day, parsed.hour24, parsed.minute);
    if (item.month !== viewMonth) {
      setViewMonth(item.month);
      setViewYear(item.year);
    }
  };

  // Quick Time Shortcut (00:00 or 23:59 or 12:00)
  const handleTimePreset = (h: number, min: number) => {
    emitChange(parsed.year, parsed.month, parsed.day, h, min);
  };

  // Hour 12 change
  const handleHour12Change = (newH12: number) => {
    const clamped = Math.max(1, Math.min(12, newH12));
    let h24 = clamped % 12;
    if (parsed.period === "PM") h24 += 12;
    emitChange(parsed.year, parsed.month, parsed.day, h24, parsed.minute);
  };

  // Minute change
  const handleMinuteChange = (newMin: number) => {
    const clamped = Math.max(0, Math.min(59, newMin));
    emitChange(parsed.year, parsed.month, parsed.day, parsed.hour24, clamped);
  };

  // Period toggle (AM / PM)
  const handleTogglePeriod = () => {
    let h24 = parsed.hour24;
    if (parsed.period === "AM") {
      h24 = (h24 + 12) % 24;
    } else {
      h24 = h24 - 12;
    }
    emitChange(parsed.year, parsed.month, parsed.day, h24, parsed.minute);
  };

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Formatted trigger labels
  const dateFormatted = useMemo(() => {
    try {
      const d = new Date(parsed.year, parsed.month, parsed.day);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return value;
    }
  }, [parsed.year, parsed.month, parsed.day, value]);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const timeFormatted = `${pad(parsed.hour12)}:${pad(parsed.minute)} ${parsed.period}`;

  return (
    <div className={cn("relative inline-block", className)} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-8 px-2.5 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 transition-all outline-none cursor-pointer select-none",
          "bg-background hover:bg-muted/50 border-input shadow-2xs hover:border-primary/50",
          isOpen ? "border-primary ring-1 ring-primary" : "focus:border-primary focus:ring-1 focus:ring-primary"
        )}
      >
        <CalendarIcon className={cn("h-3.5 w-3.5 shrink-0", value ? "text-primary" : "text-muted-foreground")} />
        {label && (
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {label}:
          </span>
        )}
        {value ? (
          <>
            <span className="font-semibold text-foreground">{dateFormatted}</span>
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] font-mono px-1 py-0 h-4 border border-border/80 font-medium",
                (parsed.hour24 === 0 && parsed.minute === 0) || (parsed.hour24 === 23 && parsed.minute === 59)
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "text-muted-foreground"
              )}
            >
              {timeFormatted}
            </Badge>
            {allowClear && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="hover:text-destructive p-0.5 rounded cursor-pointer text-muted-foreground hover:bg-muted ml-0.5 transition-colors"
                title="Clear date"
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground/80 font-normal italic">
            {placeholder || "Any date (Optional)"}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-76 sm:w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl p-3 animate-in fade-in-0 zoom-in-95 duration-100 select-none">
          {/* Calendar Header: Month/Year Dropdowns + Navigation */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60 gap-1">
            <div className="flex items-center gap-1 min-w-0">
              {/* Month Selector */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="h-6.5 px-1.5 py-0 text-xs font-semibold text-foreground bg-muted/40 hover:bg-muted border border-border/70 rounded cursor-pointer transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Select month"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx} className="bg-popover text-popover-foreground">
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Selector */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="h-6.5 px-1.5 py-0 text-xs font-semibold font-mono text-foreground bg-muted/40 hover:bg-muted border border-border/70 rounded cursor-pointer transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Select year"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y} className="bg-popover text-popover-foreground">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={prevMonth}
                className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Previous month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setViewYear(now.getFullYear());
                  setViewMonth(now.getMonth());
                }}
                className="px-1.5 h-6 text-[10px] font-medium rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Jump to today"
              >
                Today
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Next month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 text-center mb-1">
            {DAY_NAMES.map((dn, i) => (
              <span
                key={dn}
                className={cn(
                  "text-[10px] font-semibold py-0.5",
                  i === 0 || i === 6 ? "text-primary/70" : "text-muted-foreground"
                )}
              >
                {dn}
              </span>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((item, idx) => {
              return (
                <button
                  key={`${item.year}-${item.month}-${item.day}-${idx}`}
                  type="button"
                  onClick={() => handleSelectDay(item)}
                  className={cn(
                    "h-7 w-7 sm:h-8 sm:w-8 mx-auto rounded-md text-xs font-medium flex items-center justify-center transition-all cursor-pointer outline-none",
                    item.isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-xs scale-105"
                      : item.isCurrentMonth
                      ? "hover:bg-muted text-foreground"
                      : "text-muted-foreground/35 hover:bg-muted/40",
                    item.isToday && !item.isSelected && "border border-primary/50 font-bold text-primary"
                  )}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Time Controls Section */}
          <div className="mt-3 pt-2.5 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" />
                Time Selector
              </span>
              <span className="text-[11px] font-mono font-bold text-foreground">
                {timeFormatted}
              </span>
            </div>

            {/* Quick Contest Shortcuts (Start of Day 00:00 vs End of Day 23:59) */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleTimePreset(0, 0)}
                className={cn(
                  "py-1 px-1 text-[10px] font-medium rounded border transition-colors cursor-pointer text-center",
                  parsed.hour24 === 0 && parsed.minute === 0
                    ? "bg-primary/10 border-primary/40 text-primary font-bold"
                    : "bg-muted/30 hover:bg-muted border-border/80 text-muted-foreground"
                )}
                title="Midnight (00:00:00)"
              >
                12:00 AM (Start)
              </button>

              <button
                type="button"
                onClick={() => handleTimePreset(12, 0)}
                className={cn(
                  "py-1 px-1 text-[10px] font-medium rounded border transition-colors cursor-pointer text-center",
                  parsed.hour24 === 12 && parsed.minute === 0
                    ? "bg-primary/10 border-primary/40 text-primary font-bold"
                    : "bg-muted/30 hover:bg-muted border-border/80 text-muted-foreground"
                )}
                title="Noon (12:00:00)"
              >
                12:00 PM (Noon)
              </button>

              <button
                type="button"
                onClick={() => handleTimePreset(23, 59)}
                className={cn(
                  "py-1 px-1 text-[10px] font-medium rounded border transition-colors cursor-pointer text-center",
                  parsed.hour24 === 23 && parsed.minute === 59
                    ? "bg-primary/10 border-primary/40 text-primary font-bold"
                    : "bg-muted/30 hover:bg-muted border-border/80 text-muted-foreground"
                )}
                title="End of Day (23:59:00)"
              >
                11:59 PM (End)
              </button>
            </div>

            {/* Fine-Tuning Hour, Minute, and AM/PM */}
            <div className="flex items-center justify-between gap-2 bg-muted/20 p-1.5 rounded-md border border-border/50">
              <div className="flex items-center gap-1 text-xs">
                {/* Hour */}
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={parsed.hour12}
                  onChange={(e) => handleHour12Change(parseInt(e.target.value) || 12)}
                  className="w-10 h-7 text-center rounded border border-input bg-background font-mono text-xs font-bold outline-none focus:border-primary"
                />
                <span className="font-bold text-muted-foreground">:</span>
                {/* Minute */}
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={parsed.minute}
                  onChange={(e) => handleMinuteChange(parseInt(e.target.value) || 0)}
                  className="w-10 h-7 text-center rounded border border-input bg-background font-mono text-xs font-bold outline-none focus:border-primary"
                />
              </div>

              {/* AM / PM Toggle */}
              <div className="flex items-center rounded border border-input bg-background overflow-hidden h-7">
                <button
                  type="button"
                  onClick={() => {
                    if (parsed.period !== "AM") handleTogglePeriod();
                  }}
                  className={cn(
                    "px-2 h-full text-[10px] font-bold transition-colors cursor-pointer",
                    parsed.period === "AM" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (parsed.period !== "PM") handleTogglePeriod();
                  }}
                  className={cn(
                    "px-2 h-full text-[10px] font-bold transition-colors cursor-pointer",
                    parsed.period === "PM" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  PM
                </button>
              </div>

              {/* Apply / Close button */}
              <Button
                type="button"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-7 text-xs px-2.5 cursor-pointer font-medium"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
