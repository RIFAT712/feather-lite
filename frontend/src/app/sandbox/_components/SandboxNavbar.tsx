"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Feather, Plus, LogOut, Menu, X, ArrowUpRight, ShieldAlert } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMe, logout, AUTH_BASE } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import ThemeToggle from "@/components/layout/ThemeToggle";
import NotificationBell from "@/components/notifications/NotificationBell";
import { toast } from "sonner";

export default function SandboxNavbar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 60 * 1000,
    retry: false,
  });

  const isAdmin = me?.role === "owner" || me?.role === "admin";

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

  const navLinkClass = (active: boolean) =>
    `px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
      active
        ? "text-foreground bg-muted/70"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Left: Clean Brand + Minimal Nav */}
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/sandbox"
            className="flex items-center gap-2 text-foreground hover:opacity-85 transition-opacity shrink-0"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
              <Feather className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold tracking-tight text-sm">{t("feather-title")}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link href="/sandbox" className={navLinkClass(pathname === "/sandbox")}>
              {t("feather-nav-contests")}
            </Link>
            {isAdmin && (
              <Link href="/admin" className={navLinkClass(pathname === "/admin")}>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                  {t("feather-nav-admin")}
                </span>
              </Link>
            )}
          </nav>
        </div>

        {/* Right: Borderless Utilities + Clean Auth */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Return to main UI"
          >
            <span>Main UI</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>

          {pathname !== "/sandbox" && (
            <Link
              href="/sandbox/contests/new"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("feather-nav-create-contest")}</span>
            </Link>
          )}

          {/* Reuse LanguageSwitcher & ThemeToggle with borderless ghost styling */}
          <div className="flex items-center gap-0.5 [&_button]:border-transparent [&_button]:shadow-none [&_button]:bg-transparent [&_button]:hover:bg-muted/60">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          {me?.is_authenticated ? (
            <div className="flex items-center gap-1 ms-1">
              <NotificationBell />
              <Link
                href={`/sandbox/users/${encodeURIComponent(me.wiki_username || "")}`}
                className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase text-foreground">
                  {(me.wiki_username || "U").slice(0, 1)}
                </span>
                <span className="max-w-[120px] truncate">{me.wiki_username}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title={t("feather-nav-logout")}
                aria-label={t("feather-nav-logout")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <a
              href={`${AUTH_BASE}/auth/login?redirect=/sandbox`}
              className="ms-1 inline-flex items-center h-8 px-3 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              {t("feather-nav-login")}
            </a>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-1">
          <div className="flex items-center [&_button]:border-transparent [&_button]:shadow-none [&_button]:bg-transparent">
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background px-4 py-3 space-y-2">
          <div className="flex flex-col gap-1">
            <Link
              href="/sandbox"
              onClick={() => setMobileOpen(false)}
              className={navLinkClass(pathname === "/sandbox")}
            >
              {t("feather-nav-contests")}
            </Link>
            <Link
              href="/sandbox/contests/new"
              onClick={() => setMobileOpen(false)}
              className={navLinkClass(pathname === "/sandbox/contests/new")}
            >
              {t("feather-nav-create-contest")}
            </Link>
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <span>Main UI</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
            <div className="[&_button]:border-transparent [&_button]:shadow-none [&_button]:bg-transparent">
              <LanguageSwitcher />
            </div>
            {me?.is_authenticated ? (
              <Link
                href={`/sandbox/users/${encodeURIComponent(me.wiki_username || "")}`}
                onClick={() => setMobileOpen(false)}
                className="text-xs font-medium text-foreground truncate"
              >
                {me.wiki_username}
              </Link>
            ) : (
              <a
                href={`${AUTH_BASE}/auth/login?redirect=/sandbox`}
                className="inline-flex items-center h-8 px-3 rounded-md text-xs font-medium bg-foreground text-background"
              >
                {t("feather-nav-login")}
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
