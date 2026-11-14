"use client";

import React from "react";
import { Feather } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";

export default function Footer() {
  const { t, locale } = useI18n();

  return (
    <footer className="w-full border-t border-border/60 bg-muted/20 dark:bg-card/20 text-muted-foreground mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header: Brand + Modern Cloud Services Credit */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-2xs shrink-0">
              <Feather className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground tracking-tight text-sm">
                  {t("feather-title")}
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground border border-border/60">
                  2.0
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("feather-footer-tagline")}
              </p>
            </div>
          </div>

          {/* Wikimedia Cloud Services Credit Card */}
          <a
            href="https://wikitech.wikimedia.org/wiki/Portal:Cloud_Services"
            target="_blank"
            rel="noopener noreferrer"
            title="Wikimedia Cloud Services"
            className="inline-flex items-center gap-3 px-3.5 py-2 rounded-lg border border-border/70 bg-card hover:bg-accent/60 transition-colors shadow-2xs group cursor-pointer shrink-0"
          >
            <div className="flex h-8 w-8 items-center justify-center shrink-0">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/3/3d/Wikimedia_Cloud_Services_logo.svg"
                alt="Wikimedia Cloud Services"
                className="h-7 w-7 object-contain"
                loading="lazy"
              />
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                Powered by
              </div>
              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                Wikimedia Cloud Services
              </div>
            </div>
          </a>
        </div>

        {/* Middle Navigation Links */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <a
            href="https://meta.wikimedia.org/wiki/Privacy_policy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            {t("feather-footer-link-privacy")}
          </a>
          <a
            href="https://meta.wikimedia.org/wiki/Bangla_WikiConnect"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            {t("feather-footer-link-about")}
          </a>
          <a
            href="https://meta.wikimedia.org/wiki/Terms_of_use"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            {t("feather-footer-link-disclaimers")}
          </a>
          <a
            href="https://meta.wikimedia.org/wiki/Bangla_WikiConnect"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            {t("feather-footer-link-bwc")}
          </a>
          <a
            href="https://bn.wiktionary.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            {t("feather-footer-link-wiktionary")}
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
        </div>

        {/* Bottom Legal & Licensing Notice */}
        <div className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground/85">
          {locale === "bn" ? (
            <p>
              {t("feather-footer-license-prefix")}{" "}
              <a
                href="https://creativecommons.org/licenses/by-sa/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors cursor-pointer"
              >
                {t("feather-footer-license-name")}
              </a>
              {t("feather-footer-license-suffix")}{" "}
              <a
                href="https://wikitech.wikimedia.org/wiki/Portal:Cloud_Services"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors cursor-pointer"
              >
                {t("feather-footer-wmcs-name")}
              </a>{" "}
              (
              <a
                href="https://wikitech.wikimedia.org/wiki/Portal:Toolforge"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors cursor-pointer"
              >
                {t("feather-footer-toolforge-name")}
              </a>
              ) {t("feather-footer-wmcs-credit")}।
            </p>
          ) : (
            <p>
              {t("feather-footer-license-prefix")}{" "}
              <a
                href="https://creativecommons.org/licenses/by-sa/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors cursor-pointer"
              >
                {t("feather-footer-license-name")}
              </a>
              {t("feather-footer-license-suffix")}{" "}
              {t("feather-footer-wmcs-credit")}{" "}
              <a
                href="https://wikitech.wikimedia.org/wiki/Portal:Cloud_Services"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors cursor-pointer"
              >
                {t("feather-footer-wmcs-name")}
              </a>{" "}
              (
              <a
                href="https://wikitech.wikimedia.org/wiki/Portal:Toolforge"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors cursor-pointer"
              >
                {t("feather-footer-toolforge-name")}
              </a>
              ).
            </p>
          )}
          <p className="text-[10.5px] text-muted-foreground/60">
            {t("feather-footer-trademark")}
          </p>
        </div>
      </div>
    </footer>
  );
}
