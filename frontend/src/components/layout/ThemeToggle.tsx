"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useI18n } from "@/i18n/I18nContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Laptop, Check } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t, isRtl } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border/70 bg-background text-muted-foreground shadow-2xs opacity-70"
        aria-hidden="true"
      >
        <Sun className="h-4 w-4" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border/70 hover:bg-muted/80 transition-colors shadow-2xs select-none outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer bg-background text-foreground"
        title={t("feather-theme-toggle")}
        aria-label={t("feather-theme-toggle")}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-primary transition-transform duration-200" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500 transition-transform duration-200" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={isRtl ? "start" : "end"}
        className="w-38 p-1 rounded-lg shadow-md border bg-popover"
      >
        <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
          {t("feather-theme-label")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => setTheme("light")}
            className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md hover:bg-muted/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className={theme === "light" ? "font-bold text-foreground" : "text-foreground/85"}>
                {t("feather-theme-light")}
              </span>
            </div>
            {theme === "light" && <Check className="h-3.5 w-3.5 text-primary ms-2 shrink-0" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setTheme("dark")}
            className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md hover:bg-muted/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Moon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span className={theme === "dark" ? "font-bold text-foreground" : "text-foreground/85"}>
                {t("feather-theme-dark")}
              </span>
            </div>
            {theme === "dark" && <Check className="h-3.5 w-3.5 text-primary ms-2 shrink-0" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setTheme("system")}
            className="flex items-center justify-between py-1.5 px-2 cursor-pointer font-medium text-xs rounded-md hover:bg-muted/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Laptop className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className={theme === "system" ? "font-bold text-foreground" : "text-foreground/85"}>
                {t("feather-theme-system")}
              </span>
            </div>
            {theme === "system" && <Check className="h-3.5 w-3.5 text-primary ms-2 shrink-0" />}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
