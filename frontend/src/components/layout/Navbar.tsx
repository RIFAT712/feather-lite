"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Feather, Trophy, UserCheck, LogOut, Loader2, PlusCircle, Menu, X } from "lucide-react";
import { WikimediaLogoIcon } from "@/components/icons/CodexIcons";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMe, logout, AUTH_BASE } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { toast } from "sonner";

export default function Navbar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 60 * 1000,
  });

  if (pathname && /\/contests\/[^/]+\/review(?:\/|$)/.test(pathname)) {
    return null;
  }

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
    <header className="sticky top-0 z-50 w-full border-b bg-background md:bg-background/90 md:backdrop-blur-md transform-gpu will-change-transform [backface-visibility:hidden]">
      <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90 shrink-0">
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
            <p className="hidden sm:block text-[11px] text-muted-foreground leading-none">{t("feather-subtitle")}</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-3 lg:gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
            <span>{t("feather-nav-create-contest")}</span>
          </Link>

          {/* Language Switcher */}
          <LanguageSwitcher />

          <div className="h-4 w-px bg-border" />

          {/* User Session Auth Badge / Login Action */}
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{t("feather-nav-session-checking")}</span>
            </div>
          ) : me?.is_authenticated ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/users/${encodeURIComponent(me.wiki_username || "")}`}
                className="flex items-center gap-2 rounded-md border border-border/80 bg-muted/40 hover:bg-muted/70 hover:border-primary/40 px-2.5 py-1 text-xs transition-colors cursor-pointer group shadow-2xs"
                title="View user profile"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{me.wiki_username}</span>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-bold py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                >
                  {me.role}
                </Badge>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full cursor-pointer"
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
              <span>{t("feather-nav-login")}</span>
            </a>
          )}
        </nav>

        {/* Mobile Navigation Header Controls */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageSwitcher />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="h-9 w-9 p-0 text-foreground cursor-pointer rounded-md border border-border/60 hover:bg-muted"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Slide-down Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/98 backdrop-blur-lg px-4 py-3 space-y-3 shadow-md animate-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted/70 transition-colors"
            >
              <Trophy className="h-4 w-4 text-primary" />
              <span>{t("feather-nav-contests")}</span>
            </Link>

            <Link
              href="/contests/new"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted/70 transition-colors"
            >
              <PlusCircle className="h-4 w-4 text-primary" />
              <span>{t("feather-nav-create-contest")}</span>
            </Link>
          </div>

          <div className="border-t border-border/70 pt-2.5">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{t("feather-nav-session-checking")}</span>
              </div>
            ) : me?.is_authenticated ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/40 border border-border/60">
                  <Link
                    href={`/users/${encodeURIComponent(me.wiki_username || "")}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 min-w-0 hover:text-primary transition-colors cursor-pointer"
                  >
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-semibold text-sm text-foreground truncate">{me.wiki_username}</span>
                  </Link>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-bold py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shrink-0"
                  >
                    {me.role}
                  </Badge>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full justify-center gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 cursor-pointer h-9"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t("feather-nav-logout")}</span>
                </Button>
              </div>
            ) : (
              <a
                href={`${AUTH_BASE}/login`}
                onClick={() => setMobileMenuOpen(false)}
                className={buttonVariants({
                  variant: "default",
                  size: "sm",
                  className: "w-full justify-center gap-2 text-xs font-medium shadow-xs cursor-pointer h-9",
                })}
              >
                <WikimediaLogoIcon className="h-4 w-4" />
                <span>{t("feather-nav-login")}</span>
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
