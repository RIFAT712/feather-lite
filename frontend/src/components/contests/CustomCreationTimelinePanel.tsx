"use client";

import React from "react";
import { useI18n } from "@/i18n/I18nContext";
import { Button } from "@/components/ui/button";
import DateTimePicker from "@/components/ui/date-time-picker";
import { ArrowRight, Calendar, X } from "lucide-react";

interface CustomCreationTimelinePanelProps {
  customStart: string;
  customEnd: string;
  onChangeStart: (val: string) => void;
  onChangeEnd: (val: string) => void;
  referenceStartDate: string;
  disabled?: boolean;
}

/**
 * Shared optional article creation window panel displayed when
 * "created within contest window" is turned off.
 */
export default function CustomCreationTimelinePanel({
  customStart,
  customEnd,
  onChangeStart,
  onChangeEnd,
  referenceStartDate,
  disabled = false,
}: CustomCreationTimelinePanelProps) {
  const { t } = useI18n();
  const parsedYear = new Date(referenceStartDate).getFullYear();
  const safeYear = Number.isNaN(parsedYear) ? new Date().getFullYear() : parsedYear;

  return (
    <div className="rounded-lg border border-primary/30 bg-muted/20 p-3 sm:px-4 sm:py-3 space-y-3 animate-in fade-in-0 duration-200 shadow-2xs overflow-visible">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            {t("feather-create-custom-timeline-label")}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {customStart || customEnd
              ? t("feather-create-custom-timeline-active-hint")
              : t("feather-create-custom-timeline-optional-hint")}
          </p>
        </div>
      </div>

      <div className="space-y-2.5 pt-2.5 border-t border-border/50">
        <div
          className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 text-xs ${
            disabled ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <DateTimePicker
            value={customStart}
            onChange={onChangeStart}
            label={t("feather-create-custom-timeline-from")}
            placeholder="Any start date (Optional)"
            allowClear={true}
          />
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline-block shrink-0 rtl:rotate-180" />
          <DateTimePicker
            value={customEnd}
            onChange={onChangeEnd}
            label={t("feather-create-custom-timeline-to")}
            placeholder="Any end date (Optional)"
            allowClear={true}
            isEnd={true}
          />
        </div>

        {!disabled && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-border/30">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mr-1">
              Quick:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onChangeStart("");
                onChangeEnd(referenceStartDate);
              }}
              className="h-6 text-[11px] px-2.5 font-medium bg-background hover:bg-muted border-border shadow-2xs cursor-pointer"
            >
              {t("feather-create-custom-timeline-quick-before")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onChangeStart(`${safeYear}-01-01T00:00`);
                onChangeEnd(`${safeYear}-12-31T23:59`);
              }}
              className="h-6 text-[11px] px-2.5 font-medium bg-background hover:bg-muted border-border shadow-2xs cursor-pointer"
            >
              {t("feather-create-custom-timeline-quick-year", String(safeYear))}
            </Button>
            {(customStart || customEnd) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChangeStart("");
                  onChangeEnd("");
                }}
                className="h-6 text-[11px] px-2 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer ml-auto sm:ml-0"
              >
                <X className="h-3 w-3 mr-1" />
                {t("feather-create-custom-timeline-quick-clear")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
