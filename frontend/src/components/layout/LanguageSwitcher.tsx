"use client";

import React from "react";
import { useI18n } from "@/i18n/I18nContext";
import { getLocaleDirection } from "@/i18n/rtl";
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

export default function LanguageSwitcher() {
  const { locale, setLocale, supportedLanguages, isRtl, t } = useI18n();
  const currentLang =
    supportedLanguages.find((l) => l.code === locale) ||
    supportedLanguages[0] || { code: "en", name: "English" };

  // Sort languages strictly alphabetically by language code
  const sortedLanguages = React.useMemo(() => {
    return [...supportedLanguages].sort((a, b) => a.code.localeCompare(b.code));
  }, [supportedLanguages]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-md border border-border/70 hover:bg-muted/80 transition-colors shadow-2xs select-none outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer bg-background"
        title={t("feather-nav-language-select")}
        aria-label={t("feather-nav-language-select")}
      >
        <CodexLanguageIcon className="h-4 w-4 text-foreground/80 shrink-0" />
        <span className="font-medium">{currentLang.name}</span>
        <ChevronDown className="h-3 w-3 opacity-60 shrink-0 ms-0.5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={isRtl ? "start" : "end"}
        className="w-48 p-1 rounded-lg shadow-md border bg-popover"
      >
        <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
          {t("feather-nav-language-heading")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuGroup>
          {sortedLanguages.map((lang) => {
            const isSelected = locale === lang.code;
            const itemDir = getLocaleDirection(lang.code);
            return (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => setLocale(lang.code)}
                className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md hover:bg-muted/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={isSelected ? "font-bold text-foreground" : "text-foreground/85"}
                    dir={itemDir}
                  >
                    {lang.name}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/70 px-1.5 py-0.5 rounded">
                    {lang.code}
                  </span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary ms-2 shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
