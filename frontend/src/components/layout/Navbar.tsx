"use client";

import Link from "next/link";
import { Feather, Trophy, UserCheck, LogOut, Loader2, PlusCircle } from "lucide-react";
import { WikimediaLogoIcon } from "@/components/icons/CodexIcons";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMe, logout, AUTH_BASE } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { toast } from "sonner";

export default function Navbar() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 60 * 1000,
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(t("feather-nav-logout"));
      queryClient.setQueryData(["me"], { is_authenticated: false, role: "anonymous" });
      queryClient.invalidateQueries();
    } catch {
      toast.error("Failed to log out");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-2xs">
            <Feather className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-base sm:text-lg">{t("feather-title")}</span>
              <Badge variant="secondary" className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0">
                2.0
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-none">{t("feather-subtitle")}</p>
          </div>
        </Link>

        {/* Navigation Actions */}
        <nav className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Trophy className="h-4 w-4" />
            {t("feather-nav-contests")}
          </Link>

          {/* New Contest Button */}
          <Link
            href="/contests/new"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "h-8 gap-1.5 text-xs font-medium border-primary/30 text-foreground hover:bg-primary/10 shadow-xs",
            })}
          >
            <PlusCircle className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">{t("feather-nav-create-contest")}</span>
            <span className="sm:hidden">New</span>
          </Link>

          {/* Language Switcher */}
          <LanguageSwitcher />

          <div className="h-4 w-px bg-border" />

          {/* User Session Auth Badge / Login Action */}
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="hidden sm:inline">{t("feather-nav-session-checking")}</span>
            </div>
          ) : me?.is_authenticated ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1 text-xs">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{me.wiki_username}</span>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-bold py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                >
                  {me.role}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                title={t("feather-nav-logout")}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <a
              href={`${AUTH_BASE}/login`}
              className={buttonVariants({
                variant: "default",
                size: "sm",
                className: "gap-1.5 text-xs font-medium shadow-xs cursor-pointer",
              })}
            >
              <WikimediaLogoIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("feather-nav-login")}</span>
              <span className="sm:hidden">Login</span>
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
