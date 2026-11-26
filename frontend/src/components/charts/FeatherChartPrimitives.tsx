"use client";

import React from "react";
import { useI18n } from "@/i18n/I18nContext";

/**
 * Shared semantic palette for Feather data visualizations.
 * Colors maintain clear contrast in both light and dark themes.
 */
export const FEATHER_CHART_COLORS = {
  primary: "#355b80",
  teal: "#14b8a6",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  indigo: "#6366f1",
  sky: "#0ea5e9",
  slate: "#94a3b8",
} as const;

export interface ChartTooltipItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export interface FeatherChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipItem[];
  label?: string | number;
  labelKey?: string;
  valueSuffix?: string;
}

/**
 * Consistent popover tooltip for Recharts graphs using Feather theme tokens
 * and localized number formatting.
 */
export function FeatherChartTooltip({
  active,
  payload,
  label,
  labelKey,
  valueSuffix = "",
}: FeatherChartTooltipProps) {
  const { n } = useI18n();

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const firstPayload = payload[0]?.payload;
  const resolvedLabel =
    (labelKey && firstPayload && typeof firstPayload[labelKey] === "string"
      ? (firstPayload[labelKey] as string)
      : undefined) ??
    (label !== undefined && label !== null ? String(label) : "");

  return (
    <div className="rounded-lg border border-border/80 bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-lg backdrop-blur-xs min-w-[140px] space-y-1.5">
      {resolvedLabel && (
        <div className="font-semibold text-foreground border-b border-border/50 pb-1 truncate max-w-[220px]">
          {resolvedLabel}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => {
          const val = entry.value ?? 0;
          const formatted =
            typeof val === "number" ? n(val) : String(val);
          return (
            <div
              key={`${String(entry.dataKey ?? idx)}-${idx}`}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-1.5 text-muted-foreground truncate">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color || FEATHER_CHART_COLORS.primary }}
                />
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="font-mono font-bold tabular-nums text-foreground">
                {formatted}
                {valueSuffix}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Truncates long axis labels cleanly while preserving full text for tooltips.
 */
export function truncateAxisLabel(value: string, maxLen = 14): string {
  if (!value) return "";
  return value.length > maxLen ? `${value.slice(0, maxLen - 1)}…` : value;
}
