"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Feather } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";

export default function Footer() {
  const pathname = usePathname();
  const { t, locale } = useI18n();

  if (
    pathname &&
    (/\/contests\/[^/]+\/review(?:\/|$)/.test(pathname) ||
      pathname === "/login" ||
      pathname.startsWith("/login/") ||
      pathname === "/sandbox" ||
      pathname.startsWith("/sandbox/"))
  ) {
    return null;
  }

  return (
    <footer className="w-full border-t border-border/60 bg-muted/20 dark:bg-card/20 text-muted-foreground mt-auto">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 space-y-2.5">
        {/* Row 1: Brand + Nav Links + Cloud Services Credit */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-2xs shrink-0">
                <Feather className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-foreground tracking-tight text-xs sm:text-sm">
                {t("feather-title")}
              </span>
            </div>

            <span className="text-border hidden sm:inline">•</span>

            {/* Nav Links */}
            <nav className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs">
              <a
                href="https://github.com/RIFAT712/Feather#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors cursor-pointer"
              >
                {t("feather-footer-link-about")}
              </a>
              <a
                href="https://meta.wikimedia.org/wiki/Privacy_policy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors cursor-pointer"
              >
                {t("feather-footer-link-privacy")}
              </a>
              <a
                href="https://wikitech.wikimedia.org/wiki/Portal:Toolforge"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors cursor-pointer"
              >
                {t("feather-footer-link-toolforge")}
              </a>
              <a
                href="https://github.com/RIFAT712/Feather"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors cursor-pointer"
              >
                {t("feather-footer-link-developers")}
              </a>
              <a
                href="https://github.com/RIFAT712/Feather/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors cursor-pointer"
              >
                {t("feather-footer-link-issues")}
              </a>
              <a
                href="https://www.mediawiki.org/wiki/Code_of_Conduct"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors cursor-pointer"
              >
                {t("feather-footer-link-coc")}
              </a>
              <Link
                href="/license"
                className="hover:text-foreground transition-colors cursor-pointer font-medium"
              >
                {t("feather-footer-link-license")}
              </Link>
            </nav>
          </div>

          {/* Badges: WikiConnect + Wikimedia Cloud Services (MediaWiki 88x31 Style) */}
          <div className="flex items-center gap-2 sm:gap-2.5 w-full md:w-auto shrink-0">
            {/* WikiConnect Initiative Badge */}
            <a
              href="https://meta.wikimedia.org/wiki/Bangla_WikiConnect"
              target="_blank"
              rel="noopener noreferrer"
              title="Bangla WikiConnect"
              aria-label="Bangla WikiConnect Initiative"
              className="flex-1 md:flex-initial inline-flex items-center gap-1.5 sm:gap-2 h-9 px-2 sm:px-2.5 rounded border border-border/80 bg-card hover:bg-muted/60 hover:border-foreground/30 transition-all group cursor-pointer shadow-2xs min-w-0"
            >
              <img
                src="/icons/wikiconnect.svg"
                alt=""
                width={28}
                height={22}
                loading="lazy"
                decoding="async"
                className="h-5 sm:h-5.5 w-auto object-contain shrink-0"
              />
              <div className="flex flex-col text-left justify-center min-w-0">
                <span className="text-[8px] sm:text-[9px] text-muted-foreground font-normal leading-none truncate">
                  {t("feather-footer-wikiconnect-sub")}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-foreground tracking-tight leading-none mt-0.5 whitespace-nowrap truncate">
                  {t("feather-footer-wikiconnect")}
                </span>
              </div>
            </a>

            {/* Wikimedia Cloud Services Credit Badge */}
            <a
              href="https://wikitech.wikimedia.org/wiki/Portal:Cloud_Services"
              target="_blank"
              rel="noopener noreferrer"
              title="Wikimedia Cloud Services"
              aria-label="Wikimedia Cloud Services"
              className="flex-1 md:flex-initial inline-flex items-center gap-1.5 sm:gap-2 h-9 px-2 sm:px-2.5 rounded border border-border/80 bg-card hover:bg-muted/60 hover:border-foreground/30 transition-all group cursor-pointer shadow-2xs min-w-0"
            >
              <img
                src="/icons/projects/wikimedia.svg"
                alt=""
                width={22}
                height={22}
                loading="lazy"
                decoding="async"
                className="h-5 sm:h-5.5 w-5 sm:w-5.5 object-contain shrink-0"
              />
              <div className="flex flex-col text-left justify-center min-w-0">
                <span className="text-[8px] sm:text-[9px] text-muted-foreground font-normal leading-none truncate">
                  {t("feather-footer-wmcs-sub")}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-foreground tracking-tight leading-none mt-0.5 whitespace-nowrap truncate">
                  {t("feather-footer-wmcs-name")}
                </span>
              </div>
            </a>
          </div>
        </div>

        {/* Row 2: Licensing */}
        <div className="pt-2 border-t border-border/40 text-[11px] leading-relaxed text-muted-foreground">
          <p>
            {t("feather-footer-license-prefix")}{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("feather-footer-license-name")}
              className="underline hover:text-foreground transition-colors cursor-pointer"
            >
              {t("feather-footer-license-name")}
            </a>
            {t("feather-footer-license-suffix")}
          </p>
        </div>
      </div>
    </footer>
  );
}
