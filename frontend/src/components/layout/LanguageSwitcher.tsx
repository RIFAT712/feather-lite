"use client";

import React from "react";
import { useI18n, Locale } from "@/i18n/I18nContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { CodexLanguageIcon } from "@/components/icons/CodexIcons";
import { ChevronDown, Check } from "lucide-react";

interface LanguageOption {
  code: Locale;
  autonym: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "en", autonym: "English" },
  { code: "bn", autonym: "বাংলা" },
];

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-md border border-border/70 hover:bg-muted/80 transition-colors shadow-2xs select-none outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer bg-background"
        title={locale === "en" ? "Select language" : "ভাষা নির্বাচন করুন"}
      >
        <CodexLanguageIcon className="h-4 w-4 text-foreground/80 shrink-0" />
        <span className="font-medium">{locale === "en" ? "English" : "বাংলা"}</span>
        <ChevronDown className="h-3 w-3 opacity-60 shrink-0 ml-0.5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44 p-1 rounded-lg shadow-md border bg-popover">
        <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
          {locale === "en" ? "Interface Language" : "ইন্টারফেস ভাষা"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuGroup>
          {LANGUAGES.map((lang) => {
            const isSelected = locale === lang.code;
            return (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => setLocale(lang.code)}
                className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md"
              >
                <div className="flex items-center gap-2">
                  <span className={isSelected ? "font-bold text-foreground" : "text-muted-foreground"}>
                    {lang.autonym}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/70 px-1 py-0.5 rounded">
                    {lang.code}
                  </span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
