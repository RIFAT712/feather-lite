"use client";

import React from "react";
import Link from "next/link";
import { 
  Scale, 
  Code2, 
  FileText, 
  ShieldCheck, 
  ExternalLink, 
  Globe2, 
  ArrowLeft,
  GitBranch,
  CheckCircle2
} from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LicensePage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Top Navigation / Breadcrumb */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("feather-nav-back-contests")}</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="space-y-3 border-b border-border/60 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-2xs">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t("feather-license-page-title")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {t("feather-license-page-subtitle")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge variant="outline" className="text-xs gap-1.5 py-1 px-2.5 border-primary/30 text-primary bg-primary/5">
              <Code2 className="h-3.5 w-3.5" />
              <span>{t("feather-license-badge-software")}</span>
            </Badge>
            <Badge variant="outline" className="text-xs gap-1.5 py-1 px-2.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
              <FileText className="h-3.5 w-3.5" />
              <span>{t("feather-license-badge-content")}</span>
            </Badge>
          </div>
        </div>

        {/* Dual License Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Source Code License (GPL-3.0) */}
          <Card className="border-border/80 bg-card/60 shadow-xs flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Code2 className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-semibold">
                    {t("feather-license-code-heading")}
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  GPL-3.0-or-later
                </Badge>
              </div>
              <CardDescription className="text-xs pt-1.5 leading-relaxed">
                GNU General Public License v3.0
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3.5 text-xs text-muted-foreground leading-relaxed flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <p>{t("feather-license-code-p1")}</p>
                <p className="opacity-90">{t("feather-license-code-p2")}</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 text-foreground font-medium text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Freedom to run, inspect, modify, and share</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Copyleft protects user and community freedom</span>
                </div>
              </div>

              <div className="pt-3 flex flex-col gap-2">
                <a
                  href="https://github.com/RIFAT712/feather-lite"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-8 text-xs gap-1.5 w-full cursor-pointer justify-start"
                  )}
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  <span>{t("feather-license-btn-github")}</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
                </a>

                <a
                  href="https://www.gnu.org/licenses/gpl-3.0.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-8 text-xs gap-1.5 w-full cursor-pointer text-muted-foreground hover:text-foreground justify-start"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>{t("feather-license-btn-full-gpl")}</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Content & Documentation License (CC BY-SA 4.0) */}
          <Card className="border-border/80 bg-card/60 shadow-xs flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <FileText className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-semibold">
                    {t("feather-license-content-heading")}
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  CC BY-SA 4.0
                </Badge>
              </div>
              <CardDescription className="text-xs pt-1.5 leading-relaxed">
                Creative Commons Attribution-ShareAlike 4.0 International
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3.5 text-xs text-muted-foreground leading-relaxed flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <p>{t("feather-license-content-p1")}</p>
                <p className="opacity-90">{t("feather-license-translators-p1")}</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 text-foreground font-medium text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Share and adapt material with attribution</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Translations freely licensed for Wikimedia</span>
                </div>
              </div>

              <div className="pt-3 flex flex-col gap-2">
                <a
                  href="https://creativecommons.org/licenses/by-sa/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-8 text-xs gap-1.5 w-full cursor-pointer justify-start"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>{t("feather-license-btn-full-cc")}</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
                </a>

                <a
                  href="https://translatewiki.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-8 text-xs gap-1.5 w-full cursor-pointer text-muted-foreground hover:text-foreground justify-start"
                  )}
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  <span>Translatewiki.net</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trademarks & Legal Disclaimers Card */}
        <Card className="border-border/70 bg-muted/20 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                {t("feather-license-trademarks-heading")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
            <p>{t("feather-license-trademarks-p1")}</p>
            <p className="text-[11px] opacity-80 pt-2 border-t border-border/40">
              Feather uses standard Wikimedia Action APIs and OAuth 2.0 endpoints in accordance with Wikimedia API guidelines.
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
