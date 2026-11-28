"use client";

import Link from "next/link";
import { Feather } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";

export default function SandboxFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-auto w-full border-t border-border/40 text-muted-foreground">
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-5 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <Link href="/sandbox" className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <Feather className="h-3.5 w-3.5" />
            <span>{t("feather-title")}</span>
          </Link>
          <span className="text-border hidden sm:inline">·</span>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              href="https://github.com/RIFAT712/Feather#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {t("feather-footer-link-about")}
            </a>
            <a
              href="https://meta.wikimedia.org/wiki/Privacy_policy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {t("feather-footer-link-privacy")}
            </a>
            <a
              href="https://wikitech.wikimedia.org/wiki/Portal:Toolforge"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {t("feather-footer-link-toolforge")}
            </a>
            <a
              href="https://github.com/RIFAT712/Feather"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {t("feather-footer-link-developers")}
            </a>
            <Link href="/license" className="hover:text-foreground transition-colors">
              {t("feather-footer-link-license")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-muted-foreground/80">
          <a
            href="https://meta.wikimedia.org/wiki/Bangla_WikiConnect"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <img src="/icons/wikiconnect.svg" alt="" className="h-3.5 w-auto opacity-80" />
            <span>Bangla WikiConnect</span>
          </a>
          <a
            href="https://wikitech.wikimedia.org/wiki/Portal:Cloud_Services"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Wikimedia Cloud Services
          </a>
        </div>
      </div>
    </footer>
  );
}
