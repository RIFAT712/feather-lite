"use client";

import React from "react";
import { useI18n } from "@/i18n/I18nContext";
import { BookOpen, CheckCircle, Layers } from "lucide-react";

export type ContestMode = "standard" | "umbrella";

interface ContestModeSelectorProps {
  value: ContestMode;
  onChange: (mode: ContestMode) => void;
  disabled?: boolean;
}

/**
 * Shared 2-mode contest selector (Single community contest vs. Multi-community campaign)
 * used identically in both Contest Creation and Contest Settings forms.
 */
export default function ContestModeSelector({
  value,
  onChange,
  disabled = false,
}: ContestModeSelectorProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-2 pt-1">
      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
        {t("feather-contest-mode-label")}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange("standard")}
          className={`p-3.5 rounded-lg border text-left transition-all ${
            disabled ? "opacity-65 cursor-not-allowed" : "cursor-pointer"
          } ${
            value === "standard"
              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
              : "border-border hover:border-border/80 bg-card hover:bg-muted/30"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div
              className={`p-1.5 rounded-md ${
                value === "standard" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                <span>{t("feather-contest-type-standard")}</span>
                {value === "standard" && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                {t("feather-contest-type-desc-standard")}
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange("umbrella")}
          className={`p-3.5 rounded-lg border text-left transition-all ${
            disabled ? "opacity-65 cursor-not-allowed" : "cursor-pointer"
          } ${
            value === "umbrella"
              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
              : "border-border hover:border-border/80 bg-card hover:bg-muted/30"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div
              className={`p-1.5 rounded-md ${
                value === "umbrella" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                <span>{t("feather-contest-type-umbrella")}</span>
                {value === "umbrella" && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                {t("feather-contest-type-desc-umbrella")}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Mode Guidance Explainer Banner */}
      {value === "umbrella" ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs flex items-start gap-2.5 animate-in fade-in-0 duration-150">
          <Layers className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-muted-foreground leading-relaxed">
            <strong className="font-semibold text-foreground block mb-0.5">
              {t("feather-campaign-how-it-works-title")}
            </strong>
            {t("feather-campaign-how-it-works-desc")}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-xs flex items-start gap-2.5 animate-in fade-in-0 duration-150">
          <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-muted-foreground leading-relaxed">
            <strong className="font-semibold text-foreground block mb-0.5">
              {t("feather-contest-type-standard")}
            </strong>
            {t("feather-contest-type-desc-standard")}
          </div>
        </div>
      )}
    </div>
  );
}
