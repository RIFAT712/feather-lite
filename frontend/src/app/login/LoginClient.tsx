"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchMe, AUTH_BASE } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { Feather, Shield, ArrowLeft, Loader2 } from "lucide-react";
import { WikimediaLogoIcon } from "@/components/icons/CodexIcons";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import ThemeToggle from "@/components/layout/ThemeToggle";

interface LoginClientProps {
  returnTo: string;
}

export default function LoginClient({ returnTo }: LoginClientProps) {
  const { t } = useI18n();
  const router = useRouter();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 10 * 1000,
  });

  useEffect(() => {
    if (me?.is_authenticated) {
      router.replace(returnTo);
    }
  }, [me, returnTo, router]);

  const loginUrl = `${AUTH_BASE}/login?returnTo=${encodeURIComponent(returnTo)}`;
  const isSubmitReturn = returnTo.includes("/submit");

  return (
    <div className="min-h-screen flex flex-col justify-between items-center px-4 py-8 bg-background selection:bg-primary/20">
      {/* Top Header Bar: Clean Back Link + Theme / Lang Controls */}
      <div className="w-full max-w-[420px] flex items-center justify-between mb-4">
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
          <span>{t("feather-login-back-home")}</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>

      {/* Main Google/Wikipedia-style Sign-in Card */}
      <div className="w-full max-w-[420px] my-auto">
        <div className="rounded-2xl border border-border/80 bg-card p-8 sm:p-10 shadow-sm">
          {/* Feather Brand Icon */}
          <div className="flex justify-center mb-6">
            <Link
              href="/"
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Feather className="h-6 w-6" />
            </Link>
          </div>

          {/* Title & Subtitle (Google/Wikipedia style) */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("feather-login-page-title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {isSubmitReturn
                ? t("feather-login-to-continue-submit")
                : t("feather-login-to-continue")}
            </p>
          </div>

          {/* If already authenticated and redirecting */}
          {me?.is_authenticated ? (
            <div className="py-6 text-center space-y-2.5">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">
                {t("feather-login-redirecting")}
              </p>
            </div>
          ) : (
            /* Single Clean OAuth Button */
            <div>
              <a
                href={loginUrl}
                className="w-full h-11 px-5 rounded-lg border border-border bg-background hover:bg-muted/70 text-foreground font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-3 shadow-xs hover:border-foreground/20 cursor-pointer active:scale-[0.99]"
              >
                <WikimediaLogoIcon className="h-5 w-5 shrink-0" />
                <span>{t("feather-login-continue-wikimedia")}</span>
              </a>
            </div>
          )}

          {/* Subtle Security Badge */}
          <div className="pt-6 border-t border-border/40 mt-8 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
              <span>{t("feather-login-secured-by")}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Subtle Bottom Footer */}
      <div className="w-full max-w-[420px] text-center text-[11px] text-muted-foreground/70 mt-4 space-x-3">
        <a
          href="https://meta.wikimedia.org/wiki/Privacy_policy"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          {t("feather-footer-link-privacy")}
        </a>
        <span>•</span>
        <a
          href="https://github.com/RIFAT712/Feather#readme"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          {t("feather-footer-link-about")}
        </a>
        <span>•</span>
        <a
          href="https://www.mediawiki.org/wiki/Code_of_Conduct"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          {t("feather-footer-link-coc")}
        </a>
      </div>
    </div>
  );
}
