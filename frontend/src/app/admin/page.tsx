"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMe,
  fetchAdminOverview,
  fetchAdminContests,
  approveContest,
  rejectContest,
  deleteContest,
  restoreContest,
  Contest,
  AdminOverview,
} from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { getProjectMeta } from "@/lib/wikis";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
  Eye,
  Clock,
  Layers,
  Globe,
  RefreshCw,
  AlertTriangle,
  FileText,
  Users,
  Search,
  Check,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import AdminAnalyticsCharts from "@/components/charts/AdminAnalyticsCharts";

export default function AdminPage() {
  const { t, n } = useI18n();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [contestToDelete, setContestToDelete] = useState<Contest | null>(null);
  const [contestToReject, setContestToReject] = useState<Contest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // User session
  const { data: me, isLoading: userLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  const isOwner = me?.role === "owner" || Boolean((me as any)?.is_owner);
  const isAdmin = isOwner || me?.role === "admin" || Boolean((me as any)?.is_admin);

  const canDeleteContest = (c: Contest) => {
    if (isOwner) return true;
    if (me?.user_id && c.created_by_id === me.user_id) return true;
    const myLower = me?.wiki_username?.trim().toLowerCase();
    if (myLower && c.created_by_username && c.created_by_username.trim().toLowerCase() === myLower) return true;
    if (myLower && c.organizers?.some((o) => (o || "").trim().toLowerCase() === myLower)) return true;
    return false;
  };

  // Admin Overview Stats
  const {
    data: overview,
    isLoading: overviewLoading,
    refetch: refetchOverview,
  } = useQuery<AdminOverview>({
    queryKey: ["adminOverview"],
    queryFn: fetchAdminOverview,
    enabled: isOwner || isAdmin,
  });

  // Admin Contests List
  const {
    data: contests,
    isLoading: contestsLoading,
    refetch: refetchContests,
  } = useQuery<Contest[]>({
    queryKey: ["adminContests"],
    queryFn: () => fetchAdminContests("all"),
    enabled: isOwner || isAdmin,
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (code: string) => approveContest(code),
    onSuccess: (_, code) => {
      toast.success(t("feather-admin-approved-success"));
      queryClient.invalidateQueries({ queryKey: ["adminOverview"] });
      queryClient.invalidateQueries({ queryKey: ["adminContests"] });
      queryClient.invalidateQueries({ queryKey: ["contests"] });
      queryClient.invalidateQueries({ queryKey: ["contest", code] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to approve contest");
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ code, reason }: { code: string; reason?: string }) => rejectContest(code, reason),
    onSuccess: (_, { code }) => {
      toast.success(t("feather-admin-rejected-success"));
      queryClient.invalidateQueries({ queryKey: ["adminOverview"] });
      queryClient.invalidateQueries({ queryKey: ["adminContests"] });
      queryClient.invalidateQueries({ queryKey: ["contests"] });
      queryClient.invalidateQueries({ queryKey: ["contest", code] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reject contest");
    },
  });

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: (code: string) => restoreContest(code),
    onSuccess: (_, code) => {
      toast.success(t("feather-admin-restored-success"));
      queryClient.invalidateQueries({ queryKey: ["adminOverview"] });
      queryClient.invalidateQueries({ queryKey: ["adminContests"] });
      queryClient.invalidateQueries({ queryKey: ["contests"] });
      queryClient.invalidateQueries({ queryKey: ["contest", code] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to restore contest");
    },
  });

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!contestToDelete) return;
    setIsDeleting(true);
    try {
      await deleteContest(contestToDelete.code);
      toast.success(t("feather-admin-delete-success"));
      setContestToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["adminOverview"] });
      queryClient.invalidateQueries({ queryKey: ["adminContests"] });
      queryClient.invalidateQueries({ queryKey: ["contests"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete contest");
    } finally {
      setIsDeleting(false);
    }
  };

  // Pending contests
  const pendingContests = useMemo(() => {
    if (!contests) return [];
    return contests.filter((c) => c.status === "pending_approval");
  }, [contests]);

  // Filtered all contests
  const filteredContests = useMemo(() => {
    if (!contests) return [];
    return contests.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchCode = c.code.toLowerCase().includes(q);
        const matchCreator = (c.created_by_username || "").toLowerCase().includes(q);
        const matchWiki = c.wiki_dbname.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCreator && !matchWiki) return false;
      }
      return true;
    });
  }, [contests, statusFilter, searchQuery]);

  // Loading state
  if (userLoading) {
    return (
      <div className="container mx-auto max-w-6xl py-24 px-4 flex flex-col items-center justify-center">
        <div className="relative flex flex-col items-center justify-center p-8 max-w-sm w-full rounded-2xl bg-card border border-border shadow-xl backdrop-blur-md text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-2 rounded-full bg-primary/20 blur-md animate-pulse" />
            <div className="relative h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
              <ShieldCheck className="h-7 w-7 text-primary animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-card border-2 border-background flex items-center justify-center shadow-xs">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Verifying Privileges</h3>
            <p className="text-xs text-muted-foreground">Checking global steward & platform admin status...</p>
          </div>
        </div>
      </div>
    );
  }

  // Access Denied state (Requires Owner or Admin role)
  if (!isOwner && !isAdmin) {
    return (
      <div className="container mx-auto max-w-xl py-20 px-4">
        <Card className="border-destructive/40 shadow-sm text-center p-6">
          <CardHeader className="flex flex-col items-center space-y-2 pb-4">
            <div className="p-3 bg-destructive/10 rounded-full text-destructive">
              <ShieldAlert className="h-10 w-10" />
            </div>
            <CardTitle className="text-xl font-bold">{t("feather-admin-access-denied-title")}</CardTitle>
            <CardDescription className="text-sm">{t("feather-admin-access-denied-desc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              {t("feather-submit-cancel")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4 sm:px-6 space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {t("feather-admin-title")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {t("feather-admin-subtitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchOverview();
              refetchContests();
              toast.info("Refreshed platform data");
            }}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
          <Link
            href="/contests/new"
            className={buttonVariants({
              variant: "default",
              size: "sm",
              className: "gap-1.5 text-xs shadow-xs cursor-pointer",
            })}
          >
            <span>{t("feather-nav-create-contest")}</span>
          </Link>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Pending Approvals */}
        <Card
          className={`border shadow-2xs transition-colors ${
            overview && overview.pending_contests > 0
              ? "border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10"
              : "border-border/80"
          }`}
        >
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{t("feather-admin-overview-pending")}</span>
              <ShieldAlert
                className={`h-4 w-4 ${
                  overview && overview.pending_contests > 0
                    ? "text-amber-500"
                    : "text-muted-foreground/60"
                }`}
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">
              {overviewLoading ? "..." : n(overview?.pending_contests ?? 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting organizer review</p>
          </CardContent>
        </Card>

        {/* Active Contests */}
        <Card className="border border-border/80 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{t("feather-admin-overview-active")}</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">
              {overviewLoading ? "..." : n(overview?.active_contests ?? 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Currently accepting entries</p>
          </CardContent>
        </Card>

        {/* Total Contests */}
        <Card className="border border-border/80 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{t("feather-admin-overview-total")}</span>
              <Globe className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">
              {overviewLoading ? "..." : n(overview?.total_contests ?? 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">All created campaigns</p>
          </CardContent>
        </Card>

        {/* Total Articles */}
        <Card className="border border-border/80 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{t("feather-admin-overview-articles")}</span>
              <FileText className="h-4 w-4 text-sky-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">
              {overviewLoading ? "..." : n(overview?.total_articles ?? 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Submitted by participants</p>
          </CardContent>
        </Card>

        {/* Registered Users */}
        <Card className="border border-border/80 shadow-2xs col-span-2 sm:col-span-1">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{t("feather-admin-overview-users")}</span>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">
              {overviewLoading ? "..." : n(overview?.total_users ?? 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total Wikimedia accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Analytics Graphs */}
      {contests && contests.length > 0 && <AdminAnalyticsCharts contests={contests} />}

      {/* Main Tabs: Pending Approvals & All Contests */}
      <Tabs defaultValue="pending" className="w-full space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2 cursor-pointer">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <span>{t("feather-admin-tab-pending")}</span>
              {pendingContests.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1.5 text-[10px] rounded-full">
                  {pendingContests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2 cursor-pointer">
              <Layers className="h-4 w-4" />
              <span>{t("feather-admin-tab-all")}</span>
              {contests && (
                <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                  {contests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: Pending Approvals */}
        <TabsContent value="pending" className="space-y-4 pt-2">
          {pendingContests.length === 0 ? (
            <Card className="border border-dashed p-8 text-center bg-muted/20">
              <div className="flex flex-col items-center justify-center space-y-2 max-w-md mx-auto">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-base text-foreground">
                  {t("feather-admin-no-pending")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  New contest creation requests submitted by community members will appear here for review and activation.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingContests.map((contest) => {
                const projectMeta = getProjectMeta(contest.wiki_dbname);
                return (
                  <Card
                    key={contest.code}
                    className="border border-amber-500/30 bg-amber-500/[0.02] dark:bg-amber-500/[0.04] shadow-xs hover:border-amber-500/60 transition-all"
                  >
                    <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Contest Details */}
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs border-amber-500/40 text-amber-600 dark:text-amber-400">
                            {contest.code}
                          </Badge>
                          {contest.is_umbrella && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Layers className="h-3 w-3" />
                              <span>Umbrella Campaign</span>
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs border-border/80">
                            {contest.wiki_dbname} ({contest.wiki_lang})
                          </Badge>
                          <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">
                            Pending Review
                          </Badge>
                        </div>

                        <Link
                          href={`/contests/${contest.code}`}
                          className="text-lg font-bold text-foreground hover:text-primary transition-colors block"
                        >
                          {contest.name}
                        </Link>

                        {contest.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 max-w-3xl">
                            {contest.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground pt-1">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            <span>
                              Created by:{" "}
                              <strong className="text-foreground">
                                {contest.created_by_username || "Unknown"}
                              </strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              Window: {new Date(contest.start_date).toLocaleDateString()} –{" "}
                              {new Date(contest.end_date).toLocaleDateString()}
                            </span>
                          </div>
                          {contest.min_words ? (
                            <span>Min Words: {contest.min_words}</span>
                          ) : null}
                          {contest.min_bytes ? (
                            <span>Min Bytes: {contest.min_bytes}</span>
                          ) : null}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0">
                        <Link
                          href={`/contests/${contest.code}`}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                            className: "h-9 gap-1.5 text-xs cursor-pointer",
                          })}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>{t("feather-action-view")}</span>
                        </Link>

                        <Button
                          variant="default"
                          size="sm"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(contest.code)}
                          className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{t("feather-admin-approve")}</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={rejectMutation.isPending}
                          onClick={() => {
                            setContestToReject(contest);
                            setRejectionReason("");
                          }}
                          className="h-9 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>{t("feather-admin-reject")}</span>
                        </Button>

                        {canDeleteContest(contest) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setContestToDelete(contest)}
                            className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-md"
                            title={t("feather-admin-delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: All Contests */}
        <TabsContent value="all" className="space-y-4 pt-2">
          {/* Controls Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contests, code, creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {["all", "active", "pending_approval", "ended", "rejected", "deleted"].map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                  className="h-8 text-xs capitalize cursor-pointer shrink-0"
                >
                  {s === "pending_approval" ? "Pending" : s}
                </Button>
              ))}
            </div>
          </div>

          {/* Contests Table/List */}
          {filteredContests.length === 0 ? (
            <Card className="border border-dashed p-8 text-center text-muted-foreground text-sm">
              No contests found matching criteria.
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-card shadow-2xs divide-y divide-border">
              {filteredContests.map((contest) => (
                <div
                  key={contest.code}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        {contest.code}
                      </span>
                      <Link
                        href={`/contests/${contest.code}`}
                        className="font-bold text-sm text-foreground hover:text-primary transition-colors hover:underline truncate"
                      >
                        {contest.name}
                      </Link>
                      {contest.status === "active" && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
                          Active
                        </Badge>
                      )}
                      {contest.status === "pending_approval" && (
                        <Badge variant="destructive" className="text-[10px]">
                          Pending Approval
                        </Badge>
                      )}
                      {contest.status === "ended" && (
                        <Badge variant="secondary" className="text-[10px]">
                          Ended
                        </Badge>
                      )}
                      {contest.status === "rejected" && (
                        <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">
                          Rejected
                        </Badge>
                      )}
                      {contest.status === "deleted" && (
                        <Badge variant="outline" className="text-[10px] text-rose-600 dark:text-rose-400 border-rose-500/40 bg-rose-500/10">
                          Deleted
                        </Badge>
                      )}
                      {contest.is_umbrella && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Layers className="h-2.5 w-2.5" />
                          Campaign
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Wiki: <strong>{contest.wiki_dbname}</strong></span>
                      <span>Creator: <strong>{contest.created_by_username || "System/Owner"}</strong></span>
                      <span>Articles: <strong>{contest.total_articles ?? 0}</strong></span>
                      <span>Juries: <strong>{contest.total_juries ?? 0}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/contests/${contest.code}`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "h-8 text-xs cursor-pointer gap-1",
                      })}
                    >
                      <Eye className="h-3 w-3" />
                      <span>View</span>
                    </Link>

                    {contest.status === "pending_approval" && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => approveMutation.mutate(contest.code)}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          <span>{t("feather-admin-approve")}</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={rejectMutation.isPending}
                          onClick={() => {
                            setContestToReject(contest);
                            setRejectionReason("");
                          }}
                          className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          <span>{t("feather-admin-reject")}</span>
                        </Button>
                      </>
                    )}

                    {contest.status === "deleted" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={restoreMutation.isPending}
                        onClick={() => restoreMutation.mutate(contest.code)}
                        className="h-8 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>{t("feather-admin-restore")}</span>
                      </Button>
                    ) : (
                      canDeleteContest(contest) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setContestToDelete(contest)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-md"
                          title={t("feather-admin-delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!contestToDelete} onOpenChange={(open) => !open && setContestToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-destructive mb-1">
              <div className="p-2 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold">
                {t("feather-admin-delete-confirm-title")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              {t("feather-admin-delete-confirm-desc")}
            </DialogDescription>
          </DialogHeader>

          {contestToDelete && (
            <div className="p-3 my-2 rounded-md bg-muted/50 border text-xs space-y-1">
              <div>
                <strong>Contest:</strong> {contestToDelete.name} ({contestToDelete.code})
              </div>
              <div>
                <strong>Wiki:</strong> {contestToDelete.wiki_dbname}
              </div>
              <div>
                <strong>Creator:</strong> {contestToDelete.created_by_username || "System/Owner"}
              </div>
              <div>
                <strong>Articles:</strong> {contestToDelete.total_articles ?? 0} submitted
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setContestToDelete(null)}
              className="text-xs cursor-pointer"
            >
              {t("feather-submit-cancel")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
              className="text-xs gap-1.5 cursor-pointer shadow-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isDeleting ? "Deleting..." : t("feather-admin-delete-confirm-btn")}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog with Reason */}
      <Dialog
        open={!!contestToReject}
        onOpenChange={(open) => {
          if (!open) {
            setContestToReject(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-destructive mb-1">
              <div className="p-2 bg-destructive/10 rounded-full">
                <XCircle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold">
                {t("feather-admin-reject-dialog-title")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              {t("feather-admin-reject-dialog-desc")}
            </DialogDescription>
          </DialogHeader>

          {contestToReject && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/50 rounded-lg border text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{contestToReject.name}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {contestToReject.code}
                  </Badge>
                </div>
                <div className="text-muted-foreground">
                  {t("feather-admin-creator-label")}{" "}
                  <strong className="text-foreground">
                    {contestToReject.created_by_username || "Unknown"}
                  </strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>{t("feather-admin-reject-reason-label")}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {t("feather-admin-reject-reason-hint")}
                  </span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t("feather-admin-reject-reason-placeholder")}
                  rows={3}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60 resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={rejectMutation.isPending}
              onClick={() => {
                setContestToReject(null);
                setRejectionReason("");
              }}
              className="text-xs cursor-pointer"
            >
              {t("feather-submit-cancel")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={rejectMutation.isPending}
              onClick={async () => {
                if (!contestToReject) return;
                await rejectMutation.mutateAsync({
                  code: contestToReject.code,
                  reason: rejectionReason.trim(),
                });
                setContestToReject(null);
                setRejectionReason("");
              }}
              className="text-xs gap-1.5 cursor-pointer shadow-xs"
            >
              {rejectMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <XCircle className="h-3.5 w-3.5" />
              <span>{t("feather-admin-reject-confirm-btn")}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
