"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchMe, AUTH_BASE } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { Feather, Shield, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { WikimediaLogoIcon } from "@/components/icons/CodexIcons";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

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
    <div className="container mx-auto px-4 py-12 sm:py-20 flex flex-col items-center justify-center min-h-[calc(100vh-14rem)]">
      {/* Back button */}
      <div className="w-full max-w-md mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
          {t("feather-login-back-home")}
        </Link>
      </div>

      <Card className="w-full max-w-md border-border/80 shadow-lg bg-card/95 backdrop-blur-xs relative overflow-hidden">
        {/* Subtle accent top border */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-primary/50" />

        <CardHeader className="text-center pt-8 pb-4 space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
            <Feather className="h-7 w-7" />
          </div>

          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              {t("feather-login-page-title")}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed px-2">
              {t("feather-login-page-desc")}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 py-4 space-y-4">
          {/* Submission context hint if returning to a submit page */}
          {isSubmitReturn && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-foreground flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium text-[11px] sm:text-xs leading-snug">
                {t("feather-login-return-notice")}
              </span>
            </div>
          )}

          {/* If already authenticated and redirecting */}
          {me?.is_authenticated ? (
            <div className="p-6 text-center space-y-2.5">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">
                {t("feather-login-redirecting")}
              </p>
            </div>
          ) : (
            /* The SINGLE prominent "Log in with Wikimedia" action button */
            <div className="space-y-3 pt-1">
              <a
                href={loginUrl}
                className={buttonVariants({
                  variant: "default",
                  size: "lg",
                  className:
                    "w-full h-12 gap-3 text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center",
                })}
              >
                <WikimediaLogoIcon className="h-5 w-5 shrink-0" />
                <span>{t("feather-nav-login")}</span>
              </a>
            </div>
          )}
        </CardContent>

        <CardFooter className="px-6 pt-2 pb-6 flex flex-col items-center gap-3 border-t border-border/50 bg-muted/20">
          <div className="flex items-start gap-2 text-muted-foreground text-[11px] leading-relaxed text-center sm:text-left">
            <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>{t("feather-login-security-notice")}</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
