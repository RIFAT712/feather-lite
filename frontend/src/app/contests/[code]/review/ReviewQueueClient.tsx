"use client";

import { use, useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  fetchContest,
  fetchArticles,
  fetchArticlePreview,
  reviewArticle,
  acquireArticleLock,
  releaseArticleLock,
  undoArticleReview,
  deleteArticle,
  bulkReviewArticles,
  Contest,
  Article,
  ArticlePreview,
  fetchMe,
  AUTH_BASE,
} from "@/lib/api";
import { WikimediaLogoIcon } from "@/components/icons/CodexIcons";
import { useI18n } from "@/i18n/I18nContext";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  SkipForward,
  Search,
  ExternalLink,
  Keyboard,
  BookOpen,
  Loader2,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Copy,
  Check,
  Code2,
  Undo2,
  Layers,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Sparkles,
  BarChart3,
  Calendar,
  X,
  Trash2,
  Settings2,
  RotateCcw,
  UserCheck,
  MessageSquareQuote,
  AlertTriangle,
} from "lucide-react";
import { buildWikiPreviewSrcdoc } from "./wikiPreviewHelper";

interface UndoState {
  articleId: number;
  title: string;
  status: "accepted" | "rejected" | "skipped";
}

interface ShortcutAction {
  id: string;
  labelKey: string;
  defaultKey: string;
}

const DEFAULT_SHORTCUTS: Record<string, string> = {
  accept: "a",
  reject: "r",
  skip: "s",
  comment: "c",
  queue: "q",
  wiki: "w",
  undo: "u",
  help: "?",
};

const SHORTCUT_ACTIONS: ShortcutAction[] = [
  { id: "accept", labelKey: "feather-review-shortcut-accept", defaultKey: "a" },
  { id: "reject", labelKey: "feather-review-shortcut-reject", defaultKey: "r" },
  { id: "skip", labelKey: "feather-review-shortcut-skip", defaultKey: "s" },
  { id: "comment", labelKey: "feather-review-shortcut-comment", defaultKey: "c" },
  { id: "queue", labelKey: "feather-review-shortcut-queue", defaultKey: "q" },
  { id: "wiki", labelKey: "feather-review-shortcut-wiki", defaultKey: "w" },
  { id: "undo", labelKey: "feather-review-shortcut-undo", defaultKey: "u" },
];

interface ReviewQueueClientProps {
  code: string;
  initialContest?: Contest | null;
  initialUser?: any;
}

export default function ReviewQueueClient({
  code,
  initialContest,
  initialUser,
}: ReviewQueueClientProps) {
  const queryClient = useQueryClient();
  const { t, n } = useI18n();

  // Navigation & Resizable Panel States
  const [mobileTab, setMobileTab] = useState<"list" | "review">("list");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 360;
    const saved = localStorage.getItem("feather_review_panel_width");
    const num = Number(saved);
    return num >= 260 && num <= 640 ? num : 360;
  });
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Wikitext split pane & Preview states
  const [showWikitext, setShowWikitext] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("feather_review_wikitext") === "1";
  });
  const [mobilePreviewPane, setMobilePreviewPane] = useState<"visual" | "wikitext">("visual");
  const [wikitextCopied, setWikitextCopied] = useState<boolean>(false);

  // Queue Selection & List States
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [focusedArticleId, setFocusedArticleId] = useState<number | null>(null);
  const [listTab, setListTab] = useState<"queue" | "rereview" | "all">("queue");
  const [searchQuery, setSearchQuery] = useState("");
  const [comment, setComment] = useState("");

  // Re-review decision collapsible blocks
  const [collapsedDecisions, setCollapsedDecisions] = useState<Record<string, boolean>>({
    accepted: false,
    rejected: false,
    skipped: false,
  });

  // Bulk Operations State
  const [selectedForBulk, setSelectedForBulk] = useState<number[]>([]);
  const [bulkAnchorId, setBulkAnchorId] = useState<number | null>(null);
  const [bulkComment, setBulkComment] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Undo Toast State
  const [undoItem, setUndoItem] = useState<UndoState | null>(null);
  const [undoCountdown, setUndoCountdown] = useState<number>(100);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const undoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Delete Article State
  const [deleteConfirmArticle, setDeleteConfirmArticle] = useState<Article | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Keyboard Shortcuts Customization Modal
  const [showShortcutHelp, setShowShortcutHelp] = useState<boolean>(false);
  const [capturingAction, setCapturingAction] = useState<string | null>(null);
  const [shortcuts, setShortcuts] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return DEFAULT_SHORTCUTS;
    try {
      const saved = localStorage.getItem("feather_review_shortcuts");
      if (saved) return { ...DEFAULT_SHORTCUTS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_SHORTCUTS;
  });

  const commentBoxRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const currentlyLockedArticleIdRef = useRef<number | null>(null);

  // 1. Fetch User Session & Contest (hydrated with SSR props)
  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    initialData: initialUser || undefined,
    staleTime: 60 * 1000,
  });

  const { data: contest, isLoading: contestLoading } = useQuery<Contest>({
    queryKey: ["contest", code],
    queryFn: () => fetchContest(code),
    initialData: initialContest || undefined,
  });

  const myUsername = me?.wiki_username || "";

  const isOwner = useMemo(() => {
    if (!me?.is_authenticated) return false;
    return me.role === "owner" || (contest?.created_by_id != null && me.user_id === contest.created_by_id);
  }, [me, contest]);

  const isJuryOrOrganizer = useMemo(() => {
    if (!me?.is_authenticated) return false;
    if (isOwner || me.role === "jury") return true;
    if (contest?.juries && me.wiki_username && contest.juries.includes(me.wiki_username)) return true;
    return false;
  }, [me, contest, isOwner]);

  const isDistributedMode = contest?.distribute_jury_queue === true;
  const [selectedJudge, setSelectedJudge] = useState<string>("all");
  const [titleCopied, setTitleCopied] = useState<boolean>(false);

  const handleCopyTitle = useCallback(() => {
    if (!selectedArticle?.title) return;
    navigator.clipboard.writeText(selectedArticle.title);
    setTitleCopied(true);
    toast.success(t("feather-review-title-copied"));
    setTimeout(() => setTitleCopied(false), 2000);
  }, [selectedArticle?.title, t]);

  // 2. Fetch All Articles in Contest
  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ["articles", code],
    queryFn: () => fetchArticles(code, undefined, undefined, 250),
    enabled: isJuryOrOrganizer,
    refetchInterval: 15 * 1000, // live auto-refresh
  });

  const allArticles = useMemo(() => articlesData?.items || [], [articlesData]);

  // Review Lock Lifecycle: Release previous lock, acquire lock on open article
  useEffect(() => {
    if (!selectedArticle?.id) return;
    const articleId = selectedArticle.id;

    if (currentlyLockedArticleIdRef.current && currentlyLockedArticleIdRef.current !== articleId) {
      releaseArticleLock(currentlyLockedArticleIdRef.current);
    }
    currentlyLockedArticleIdRef.current = articleId;

    // Acquire lock
    acquireArticleLock(articleId).catch(() => {});

    // Refresh lock periodically every 3 minutes
    const lockInterval = setInterval(() => {
      acquireArticleLock(articleId).catch(() => {});
    }, 3 * 60 * 1000);

    return () => {
      clearInterval(lockInterval);
    };
  }, [selectedArticle?.id]);

  // Release lock on unmount or tab close
  useEffect(() => {
    const handleUnload = () => {
      if (currentlyLockedArticleIdRef.current) {
        releaseArticleLock(currentlyLockedArticleIdRef.current);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      if (currentlyLockedArticleIdRef.current) {
        releaseArticleLock(currentlyLockedArticleIdRef.current);
      }
    };
  }, []);

  // Diacritics and case-normalized search helper
  const normalizeText = useCallback((str: string) => {
    return (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }, []);

  const searchTokens = useMemo(() => {
    return normalizeText(searchQuery).split(/\s+/).filter(Boolean);
  }, [searchQuery, normalizeText]);

  const matchesSearch = useCallback(
    (a: Article, withSubmitter: boolean = false) => {
      if (!searchTokens.length) return true;
      const haystack = normalizeText(withSubmitter ? `${a.title} ${a.submitter_username}` : a.title);
      return searchTokens.every((token) => haystack.includes(token));
    },
    [searchTokens, normalizeText]
  );

  // Tab 1: Queue (Pending articles in the contest)
  const queueArticles = useMemo(() => {
    return allArticles.filter((a) => {
      if (a.status !== "pending") return false;
      // COI check: Juries cannot review their own submissions unless owner
      if (!isOwner && myUsername && a.submitter_username === myUsername) return false;
      // If distributed mode is active:
      if (isDistributedMode) {
        if (isOwner && selectedJudge !== "all") {
          if (a.assigned_to_username !== selectedJudge) return false;
        } else if (!isOwner && myUsername) {
          if (a.assigned_to_username && a.assigned_to_username !== myUsername) return false;
        }
      }
      return matchesSearch(a, false);
    });
  }, [allArticles, isOwner, myUsername, isDistributedMode, selectedJudge, matchesSearch]);

  // Tab 2: Evaluated / Judged (All articles evaluated in the contest)
  const judgedArticles = useMemo(() => {
    return allArticles.filter((a) => {
      if (a.status === "pending") return false;
      return matchesSearch(a, true);
    });
  }, [allArticles, matchesSearch]);

  // Grouped Evaluated blocks (Accepted, Rejected, Skipped)
  const reReviewBlocks = useMemo(() => {
    const blocks: {
      accepted: Article[];
      rejected: Article[];
      skipped: Article[];
    } = { accepted: [], rejected: [], skipped: [] };

    for (const a of judgedArticles) {
      if (a.status === "accepted") blocks.accepted.push(a);
      else if (a.status === "rejected") blocks.rejected.push(a);
      else blocks.skipped.push(a);
    }
    return blocks;
  }, [judgedArticles]);

  // Current tab active list (Queue, Evaluated, All)
  const activeTabArticles = useMemo(() => {
    if (listTab === "queue") return queueArticles;
    if (listTab === "rereview") return judgedArticles;
    return allArticles.filter((a) => matchesSearch(a, true));
  }, [listTab, queueArticles, judgedArticles, allArticles, matchesSearch]);

  // Auto-select first article if none selected
  useEffect(() => {
    if (!selectedArticle && queueArticles.length > 0) {
      setSelectedArticle(queueArticles[0]);
      setFocusedArticleId(queueArticles[0].id);
    }
  }, [queueArticles, selectedArticle]);

  // 3. Fetch Real MediaWiki Preview
  const { data: previewData, isLoading: previewLoading } = useQuery<ArticlePreview>({
    queryKey: ["article-preview", code, selectedArticle?.id],
    queryFn: () => fetchArticlePreview(code, selectedArticle!.id),
    enabled: !!selectedArticle?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate Progress & Tallies
  const statusStats = useMemo(() => {
    const total = allArticles.length;
    const accepted = allArticles.filter((a) => a.status === "accepted").length;
    const rejected = allArticles.filter((a) => a.status === "rejected").length;
    const pending = allArticles.filter((a) => a.status === "pending").length;
    const judgeableTotal = pending + accepted + rejected;
    const judged = accepted + rejected;
    const percent = judgeableTotal > 0 ? Math.round((judged / judgeableTotal) * 100) : 0;
    return { total, accepted, rejected, pending, judgeableTotal, judged, percent };
  }, [allArticles]);

  // 4. Review Mutation
  const mutation = useMutation({
    mutationFn: ({
      articleId,
      status,
      decisionComment,
    }: {
      articleId: number;
      status: "accepted" | "rejected" | "skipped" | "pending";
      decisionComment: string;
    }) => reviewArticle(articleId, status, decisionComment),
    onSuccess: (_, variables) => {
      if (variables.status !== "pending") {
        const judged = activeTabArticles.find((a) => a.id === variables.articleId) || selectedArticle;
        triggerUndoToast(variables.articleId, judged?.title || "Article", variables.status);
      }

      setComment("");

      // Move to next article in flow
      const currentIndex = activeTabArticles.findIndex((a) => a.id === variables.articleId);
      if (currentIndex >= 0 && currentIndex < activeTabArticles.length - 1) {
        setSelectedArticle(activeTabArticles[currentIndex + 1]);
        setFocusedArticleId(activeTabArticles[currentIndex + 1].id);
      }

      queryClient.invalidateQueries({ queryKey: ["articles", code] });
      queryClient.invalidateQueries({ queryKey: ["contest", code] });
      queryClient.invalidateQueries({ queryKey: ["standings", code] });
      queryClient.invalidateQueries({ queryKey: ["jury-stats", code] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit review");
    },
  });

  // Trigger Undo Toast with 6-second window
  const triggerUndoToast = (articleId: number, title: string, status: "accepted" | "rejected" | "skipped") => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    setUndoItem({ articleId, title, status });
    setUndoCountdown(100);

    const startTime = Date.now();
    const duration = 6000;

    undoIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setUndoCountdown(remaining);
      if (remaining <= 0) {
        if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
      }
    }, 50);

    undoTimerRef.current = setTimeout(() => {
      setUndoItem(null);
    }, duration);
  };

  const handleUndo = async () => {
    if (!undoItem) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    try {
      await undoArticleReview(undoItem.articleId);
      toast.success(t("feather-review-undo-success", undoItem.title));
      setUndoItem(null);
      queryClient.invalidateQueries({ queryKey: ["articles", code] });
      queryClient.invalidateQueries({ queryKey: ["contest", code] });
    } catch {
      toast.error("Failed to undo decision");
    }
  };

  // Delete Article Action
  const handleDeleteArticle = async () => {
    if (!deleteConfirmArticle) return;
    setIsDeleting(true);
    try {
      await deleteArticle(deleteConfirmArticle.id);
      toast.success(t("feather-review-delete-success", deleteConfirmArticle.title));
      if (selectedArticle?.id === deleteConfirmArticle.id) {
        setSelectedArticle(null);
      }
      setDeleteConfirmArticle(null);
      queryClient.invalidateQueries({ queryKey: ["articles", code] });
      queryClient.invalidateQueries({ queryKey: ["contest", code] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete article");
    } finally {
      setIsDeleting(false);
    }
  };

  // Draggable Splitter Implementation
  const startResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsResizing(true);

      const onPointerMove = (moveEvent: PointerEvent) => {
        const newWidth = Math.max(260, Math.min(640, moveEvent.clientX));
        setPanelWidth(newWidth);
        localStorage.setItem("feather_review_panel_width", String(newWidth));
      };

      const onPointerUp = () => {
        setIsResizing(false);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    []
  );

  const resetPanelWidth = () => {
    setPanelWidth(360);
    localStorage.setItem("feather_review_panel_width", "360");
  };

  const toggleWikitext = () => {
    const nextVal = !showWikitext;
    setShowWikitext(nextVal);
    localStorage.setItem("feather_review_wikitext", nextVal ? "1" : "0");
    if (nextVal) setMobilePreviewPane("wikitext");
    else setMobilePreviewPane("visual");
  };

  const handleCopyWikitext = async () => {
    if (!previewData?.wikitext) return;
    try {
      await navigator.clipboard.writeText(previewData.wikitext);
      setWikitextCopied(true);
      setTimeout(() => setWikitextCopied(false), 1600);
      toast.success(t("feather-review-wikitext-copied-toast"));
    } catch {
      toast.error("Failed to copy wikitext");
    }
  };

  // Shift-Click and Checkbox Selection for Bulk Actions
  const handleSelectClick = (articleId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey && bulkAnchorId !== null) {
      const items = activeTabArticles;
      const anchorIdx = items.findIndex((a) => a.id === bulkAnchorId);
      const currentIdx = items.findIndex((a) => a.id === articleId);
      if (anchorIdx !== -1 && currentIdx !== -1) {
        const start = Math.min(anchorIdx, currentIdx);
        const end = Math.max(anchorIdx, currentIdx);
        const rangeIds = items.slice(start, end + 1).map((a) => a.id);
        setSelectedForBulk((prev) => Array.from(new Set([...prev, ...rangeIds])));
        return;
      }
    }

    setBulkAnchorId(articleId);
    setSelectedForBulk((prev) =>
      prev.includes(articleId) ? prev.filter((id) => id !== articleId) : [...prev, articleId]
    );
  };

  // Handle Bulk Decision Submit
  const handleBulkDecision = async (status: "accepted" | "rejected") => {
    if (selectedForBulk.length === 0 || isBulkSubmitting) return;
    setIsBulkSubmitting(true);
    try {
      const res = await bulkReviewArticles(selectedForBulk, status, bulkComment);
      toast.success(t("feather-review-bulk-success", res.reviewed_count, status));
      setSelectedForBulk([]);
      setBulkComment("");
      queryClient.invalidateQueries({ queryKey: ["articles", code] });
      queryClient.invalidateQueries({ queryKey: ["contest", code] });
    } catch (err: any) {
      toast.error(err.message || "Bulk review failed");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedForBulk.length === 0 || isBulkSubmitting) return;
    if (!window.confirm(t("feather-review-delete-confirm-desc", `${selectedForBulk.length} articles`))) return;
    setIsBulkSubmitting(true);
    try {
      for (const id of selectedForBulk) {
        await deleteArticle(id).catch(() => {});
      }
      toast.success(t("feather-review-bulk-delete-success", selectedForBulk.length));
      setSelectedForBulk([]);
      queryClient.invalidateQueries({ queryKey: ["articles", code] });
    } catch {
      toast.error("Bulk delete failed");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // Rebind shortcut key
  const handleRebindKey = (actionId: string, newKey: string) => {
    const updated = { ...shortcuts, [actionId]: newKey.toLowerCase() };
    setShortcuts(updated);
    localStorage.setItem("feather_review_shortcuts", JSON.stringify(updated));
    setCapturingAction(null);
  };

  const resetShortcuts = () => {
    setShortcuts(DEFAULT_SHORTCUTS);
    localStorage.removeItem("feather_review_shortcuts");
    setCapturingAction(null);
  };

  // Keyboard navigation & single-key hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If modal is actively capturing a key to rebind
      if (capturingAction) {
        e.preventDefault();
        if (e.key === "Escape") {
          setCapturingAction(null);
          return;
        }
        if (e.key.length === 1 || e.key === "Enter" || e.key === " ") {
          handleRebindKey(capturingAction, e.key);
        }
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = tag === "textarea" || tag === "input" || (e.target as HTMLElement)?.isContentEditable;

      if (e.key === "Escape") {
        if (isInput) {
          (e.target as HTMLElement).blur();
        } else if (showShortcutHelp) {
          setShowShortcutHelp(false);
        } else if (selectedForBulk.length > 0) {
          setSelectedForBulk([]);
        } else if (!sidebarCollapsed && window.innerWidth >= 768) {
          setSidebarCollapsed(true);
        }
        return;
      }

      if (isInput) return;

      // Handle modifier key combinations first
      if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
        // Ctrl+A / Cmd+A selects or deselects all visible
        e.preventDefault();
        if (selectedForBulk.length === activeTabArticles.length) {
          setSelectedForBulk([]);
        } else {
          setSelectedForBulk(activeTabArticles.map((a) => a.id));
        }
        return;
      }

      // Ignore any single-key shortcuts when modifier keys (Ctrl, Meta/Cmd, Alt) are pressed
      // This protects standard browser shortcuts like Ctrl+R (reload), Ctrl+C (copy), Ctrl+W (close tab)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();

      // Decision Hotkeys
      if (key === shortcuts.accept) {
        if (selectedArticle && !mutation.isPending) {
          e.preventDefault();
          mutation.mutate({ articleId: selectedArticle.id, status: "accepted", decisionComment: comment });
        }
      } else if (key === shortcuts.reject) {
        if (selectedArticle && !mutation.isPending) {
          e.preventDefault();
          mutation.mutate({ articleId: selectedArticle.id, status: "rejected", decisionComment: comment });
        }
      } else if (key === shortcuts.skip) {
        if (selectedArticle && !mutation.isPending) {
          e.preventDefault();
          mutation.mutate({ articleId: selectedArticle.id, status: "skipped", decisionComment: comment });
        }
      } else if (key === shortcuts.comment) {
        e.preventDefault();
        commentBoxRef.current?.focus();
      } else if (key === shortcuts.queue) {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      } else if (key === shortcuts.wiki) {
        if (selectedArticle) {
          e.preventDefault();
          const targetUrl = selectedArticle.wiki_url || contest?.wiki_url || "https://bn.wikipedia.org";
          window.open(
            `${targetUrl}/wiki/${encodeURIComponent(selectedArticle.title)}`,
            "_blank",
            "noopener,noreferrer"
          );
        }
      } else if (key === shortcuts.undo) {
        if (undoItem) {
          e.preventDefault();
          handleUndo();
        }
      } else if (e.key === "?" || e.key === "/") {
        e.preventDefault();
        setShowShortcutHelp((prev) => !prev);
      } else if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        const items = activeTabArticles;
        const curIdx = items.findIndex((a) => a.id === (focusedArticleId ?? selectedArticle?.id));
        if (curIdx < items.length - 1) {
          const next = items[curIdx + 1];
          setFocusedArticleId(next.id);
          setSelectedArticle(next);
        }
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        const items = activeTabArticles;
        const curIdx = items.findIndex((a) => a.id === (focusedArticleId ?? selectedArticle?.id));
        if (curIdx > 0) {
          const prev = items[curIdx - 1];
          setFocusedArticleId(prev.id);
          setSelectedArticle(prev);
        }
      } else if (e.key === " ") {
        // Space toggles selection of focused article for bulk
        if (focusedArticleId) {
          e.preventDefault();
          setSelectedForBulk((prev) =>
            prev.includes(focusedArticleId) ? prev.filter((id) => id !== focusedArticleId) : [...prev, focusedArticleId]
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    capturingAction,
    shortcuts,
    selectedArticle,
    focusedArticleId,
    activeTabArticles,
    comment,
    mutation,
    sidebarCollapsed,
    showShortcutHelp,
    undoItem,
    contest,
    selectedForBulk,
  ]);

  // Virtualizer for high-throughput 50k queue
  const rowVirtualizer = useVirtualizer({
    count: activeTabArticles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 6,
  });

  const activeWikiUrl = useMemo(() => {
    return selectedArticle?.wiki_url || contest?.wiki_url || "https://bn.wikipedia.org";
  }, [selectedArticle?.wiki_url, contest?.wiki_url]);

  // Prepare iframe preview srcdoc
  const previewSrcdoc = useMemo(() => {
    return buildWikiPreviewSrcdoc(previewData?.html || "", activeWikiUrl);
  }, [previewData?.html, activeWikiUrl]);

  if (meLoading || contestLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>{t("feather-ui-loading")}</span>
        </div>
      </div>
    );
  }

  if (!me?.is_authenticated) {
    return (
      <div className="h-screen flex items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-lg text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {t("feather-review-access-restricted-title")}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("feather-review-access-restricted-desc")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-3">
            <Link href={`/contests/${code}`}>
              <Button variant="outline" size="sm" className="text-xs gap-1.5 cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                <span>{t("feather-nav-dashboard")}</span>
              </Button>
            </Link>
            <a
              href={`${AUTH_BASE}/login`}
              className={buttonVariants({
                variant: "default",
                size: "sm",
                className: "text-xs gap-1.5 font-semibold cursor-pointer",
              })}
            >
              <WikimediaLogoIcon className="h-4 w-4" />
              <span>{t("feather-nav-login")}</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!isJuryOrOrganizer) {
    return (
      <div className="h-screen flex items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-lg text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {t("feather-review-access-restricted-title")}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("feather-review-not-jury-desc", me.wiki_username || "Your account")}
            </p>
          </div>
          <div className="flex items-center justify-center pt-3">
            <Link href={`/contests/${code}`}>
              <Button variant="outline" size="sm" className="text-xs gap-1.5 cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                <span>{t("feather-nav-dashboard")}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-background text-foreground overflow-hidden select-none">
      {/* 1. UNIFIED COMMAND BAR (42px) */}
      <header className="shrink-0 border-b border-border bg-card/95 backdrop-blur-md px-3 sm:px-4 h-11 flex items-center justify-between gap-2 z-20">
        {/* Left: Nav, Queue toggle, & Current Article context */}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={`/contests/${code}`}
            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            title={t("feather-nav-dashboard")}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>

          {/* Collapse / Expand Drawer Toggle */}
          <Button
            variant={sidebarCollapsed ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="h-7 px-2 text-xs gap-1.5 cursor-pointer font-medium shadow-2xs shrink-0"
            title={`${sidebarCollapsed ? t("feather-review-expand-drawer") : t("feather-review-collapse-drawer")} (${shortcuts.queue.toUpperCase()})`}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-3.5 w-3.5 text-primary" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" />
            )}
            <Badge variant="secondary" className="text-[10px] font-mono px-1 py-0 h-4">
              {activeTabArticles.length}
            </Badge>
          </Button>

          <span className="text-border/80 hidden sm:inline">|</span>

          {selectedArticle ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-mono text-muted-foreground hidden lg:inline">
                #{n(selectedArticle.id)}
              </span>

              <div className="flex items-center gap-1 min-w-0 max-w-[140px] sm:max-w-[220px] md:max-w-[320px] lg:max-w-[420px]">
                <h1 className="text-xs sm:text-sm font-bold truncate text-foreground" title={selectedArticle.title}>
                  {selectedArticle.title}
                </h1>
                <button
                  type="button"
                  onClick={handleCopyTitle}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer shrink-0"
                  title={t("feather-review-copy-title")}
                >
                  {titleCopied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <span className="flex items-center gap-1 truncate max-w-[120px]">
                  <User className="h-3 w-3" />
                  <strong className="text-foreground">{selectedArticle.submitter_username}</strong>
                </span>

                {selectedArticle.wiki_creator && selectedArticle.wiki_creator === selectedArticle.submitter_username && (
                  <Badge variant="outline" className="text-[9px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 py-0 px-1 font-semibold gap-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    <span>Creator</span>
                  </Badge>
                )}

                {selectedArticle.locked_by_username && selectedArticle.locked_by_username !== myUsername && (
                  <Badge variant="outline" className="text-[9px] gap-0.5 text-amber-600 bg-amber-500/10 border-amber-500/20 py-0 px-1">
                    <Lock className="h-2.5 w-2.5" />
                    <span>{selectedArticle.locked_by_username}</span>
                  </Badge>
                )}

                <Badge
                  variant={
                    selectedArticle.status === "accepted"
                      ? "default"
                      : selectedArticle.status === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-[9px] uppercase font-bold px-1.5 py-0 h-4"
                >
                  {selectedArticle.status === "accepted"
                    ? `✓ ${t("feather-contest-filter-accepted")}`
                    : selectedArticle.status === "rejected"
                    ? `✕ ${t("feather-contest-filter-rejected")}`
                    : t("feather-contest-filter-pending")}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xs sm:text-sm font-bold truncate text-foreground">
                {contest?.name || t("feather-nav-review-queue")}
              </h1>
            </div>
          )}
        </div>

        {/* Right: Quick Tools, Live Stats, Shortcuts */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Article Live Word / Byte Count Chip */}
          {selectedArticle && (
            <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50">
              <span className="font-semibold text-foreground">
                {t("feather-review-preview-words", previewData?.word_count ?? selectedArticle.word_count)}
              </span>
              <span>·</span>
              <span>
                {t("feather-review-preview-bytes", previewData?.byte_count ?? selectedArticle.byte_count)}
              </span>
            </div>
          )}

          {/* Micro Progress Chip */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40">
            <span className="font-semibold text-foreground">
              {n(statusStats.judged)}/{n(statusStats.judgeableTotal)}
            </span>
            <span className="text-primary font-mono text-[10px]">
              ({statusStats.percent}%)
            </span>
          </div>

          {/* If contest is distributed mode and user is owner, show judge switcher */}
          {isDistributedMode && isOwner && contest?.juries?.length ? (
            <select
              value={selectedJudge}
              onChange={(e) => setSelectedJudge(e.target.value)}
              className="h-7 px-1.5 text-xs rounded border border-border bg-background text-foreground cursor-pointer font-medium max-w-[100px] sm:max-w-none"
              title="Filter by assigned jury"
            >
              <option value="all">All Juries</option>
              {contest.juries.map((jury) => (
                <option key={jury} value={jury}>
                  {jury} {jury === myUsername ? "(You)" : ""}
                </option>
              ))}
            </select>
          ) : null}

          {/* Selected Article Tools (Wikitext split & External Wiki) */}
          {selectedArticle && (
            <>
              <Button
                variant={showWikitext ? "default" : "outline"}
                size="sm"
                onClick={toggleWikitext}
                className="h-7 px-2 text-xs gap-1 cursor-pointer font-medium shadow-2xs"
                title={`Toggle Wikitext Pane (${shortcuts.wiki.toUpperCase()})`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">{t("feather-review-wikitext-toggle")}</span>
              </Button>

              <a
                href={`${activeWikiUrl}/wiki/${encodeURIComponent(selectedArticle.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "h-7 px-2 text-xs gap-1 cursor-pointer shadow-2xs",
                })}
                title="Open article on Wikimedia wiki"
              >
                <span className="hidden xl:inline">{t("feather-review-open-wiki")}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              {/* Delete article button (owner or admin) */}
              {(isOwner || me?.role === "owner" || me?.role === "admin") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirmArticle(selectedArticle)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                  title={t("feather-review-btn-delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}

          {/* Link to Jury Hub */}
          <Link
            href={`/contests/${code}/jury`}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "h-7 w-7 sm:w-auto p-0 sm:px-2 text-xs gap-1 font-medium text-muted-foreground hover:text-foreground cursor-pointer",
            })}
            title="Open full Jury Statistics Hub"
          >
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">{t("feather-review-nav-hub")}</span>
          </Link>

          {/* Keyboard shortcuts modal trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShortcutHelp(true)}
            className="h-7 px-1.5 sm:px-2 text-xs gap-1 font-mono cursor-pointer shadow-2xs"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
            <kbd className="hidden sm:inline-block px-1 rounded bg-muted text-[10px] border border-border/80">?</kbd>
          </Button>
        </div>
      </header>

      {/* Progress Track (2px high, zero clutter) */}
      <div className="h-[2px] w-full bg-muted/40 overflow-hidden shrink-0">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${statusStats.percent}%` }}
        />
      </div>

      {/* 2. MAIN SPLIT/FLOW WORKSPACE */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* LEFT COLUMN: RESIZABLE & COLLAPSIBLE QUEUE DRAWER */}
        <aside
          className={`border-r border-border bg-card/95 backdrop-blur-md flex flex-col z-10 transition-all duration-100 ${
            mobileTab === "list" ? "w-full" : "hidden md:flex"
          } ${sidebarCollapsed ? "md:w-0 md:opacity-0 md:overflow-hidden md:border-r-0" : "md:opacity-100"}`}
          style={{ width: sidebarCollapsed ? 0 : `${panelWidth}px` }}
        >
          {/* Drawer Header: Search & Category Tabs */}
          <div className="p-2.5 sm:p-3 border-b border-border space-y-2 shrink-0 bg-muted/10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t("feather-review-search-placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8 bg-background"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Category Filter Tabs: Queue, Re-review, Other Judges */}
            <div className="flex items-center rounded-md border border-border bg-muted/30 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setListTab("queue")}
                className={`flex-1 py-1 rounded text-center text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  listTab === "queue"
                    ? "bg-background text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{t("feather-review-tab-queue")}</span>
                <span className="font-mono text-[10px] opacity-75">({queueArticles.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setListTab("rereview")}
                className={`flex-1 py-1 rounded text-center text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  listTab === "rereview"
                    ? "bg-background text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{t("feather-review-tab-rereview")}</span>
                <span className="font-mono text-[10px] opacity-75">({judgedArticles.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setListTab("all")}
                className={`flex-1 py-1 rounded text-center text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  listTab === "all"
                    ? "bg-background text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{t("feather-review-tab-all")}</span>
                <span className="font-mono text-[10px] opacity-75">({allArticles.length})</span>
              </button>
            </div>
          </div>

          {/* Floating Bulk Action Bar */}
          {selectedForBulk.length > 0 && (
            <div className="p-2.5 sm:p-3 border-b border-border bg-primary/5 space-y-2 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-primary">
                  {t("feather-review-bulk-selected", selectedForBulk.length)}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedForBulk([])}
                  className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {t("feather-review-bulk-clear")}
                </button>
              </div>

              {selectedForBulk.length > 1 && (
                <Input
                  placeholder={t("feather-review-bulk-note-placeholder")}
                  value={bulkComment}
                  onChange={(e) => setBulkComment(e.target.value)}
                  className="text-xs h-7 bg-background"
                />
              )}

              <div className="grid grid-cols-3 gap-1.5">
                <Button
                  size="sm"
                  onClick={() => handleBulkDecision("accepted")}
                  disabled={isBulkSubmitting}
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{t("feather-review-bulk-accept", selectedForBulk.length)}</span>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkDecision("rejected")}
                  disabled={isBulkSubmitting}
                  className="h-7 text-xs cursor-pointer gap-1"
                >
                  <XCircle className="h-3 w-3" />
                  <span>{t("feather-review-bulk-reject", selectedForBulk.length)}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkDelete}
                  disabled={isBulkSubmitting}
                  className="h-7 text-xs cursor-pointer gap-1 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>{t("feather-review-bulk-delete", selectedForBulk.length)}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Virtualized Article List */}
          <div ref={parentRef} className="flex-1 overflow-y-auto divide-y divide-border/60">
            {articlesLoading ? (
              <div className="divide-y divide-border/60">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="p-2.5 sm:p-3 flex items-center gap-2.5">
                    <Skeleton className="h-4 w-4 rounded shrink-0" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32 rounded" />
                        <Skeleton className="h-3.5 w-12 rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-20 rounded" />
                        <Skeleton className="h-3 w-16 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTabArticles.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2 opacity-60" />
                <p className="font-semibold text-foreground">{t("feather-review-empty-title")}</p>
                <p className="text-[11px] mt-0.5">{t("feather-review-empty-desc")}</p>
              </div>
            ) : listTab === "rereview" ? (
              // Re-Review: Grouped into Collapsible Decision Blocks (Accepted, Rejected, Skipped)
              <div className="divide-y divide-border/60">
                {(["accepted", "rejected", "skipped"] as const).map((decision) => {
                  const itemsInBlock = reReviewBlocks[decision];
                  if (!itemsInBlock.length) return null;
                  const isCollapsed = collapsedDecisions[decision];

                  return (
                    <div key={decision} className="border-b border-border/40">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedDecisions((prev) => ({ ...prev, [decision]: !prev[decision] }))
                        }
                        className="w-full px-3 py-1.5 flex items-center justify-between text-xs font-semibold bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          <span
                            className={
                              decision === "accepted"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : decision === "rejected"
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }
                          >
                            {decision === "accepted"
                              ? t("feather-review-block-accepted")
                              : decision === "rejected"
                              ? t("feather-review-block-rejected")
                              : t("feather-review-block-skipped")}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono h-4 px-1.5">
                          {itemsInBlock.length}
                        </Badge>
                      </button>

                      {!isCollapsed && (
                        <div className="divide-y divide-border/40">
                          {itemsInBlock.map((article) => {
                            const isSelected = selectedArticle?.id === article.id;
                            const isChecked = selectedForBulk.includes(article.id);
                            return (
                              <div
                                key={article.id}
                                onClick={() => {
                                  setSelectedArticle(article);
                                  setFocusedArticleId(article.id);
                                  setMobileTab("review");
                                }}
                                className={`p-2.5 sm:p-3 cursor-pointer transition-colors flex items-center gap-2.5 ${
                                  isSelected ? "bg-primary/10 border-s-4 border-primary font-medium" : "hover:bg-muted/30"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onClick={(e) => handleSelectClick(article.id, e)}
                                  onChange={() => {}}
                                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-xs font-semibold truncate leading-snug">
                                      {article.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                                    <span className="truncate">by {article.submitter_username}</span>
                                    <span className="font-mono text-[10px] shrink-0">
                                      {t("feather-review-preview-words", article.word_count)}
                                    </span>
                                  </div>
                                  {article.reviews && article.reviews.length > 0 && (
                                    <div className="flex items-center gap-1 text-[10px] text-primary/90 mt-0.5 truncate font-medium">
                                      <UserCheck className="h-2.5 w-2.5 shrink-0" />
                                      <span className="truncate">
                                        {t("feather-review-reviewed-by", article.reviews[article.reviews.length - 1].reviewer_username)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Queue & Other Judges: Virtualized Row View
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const article = activeTabArticles[virtualRow.index];
                  const isSelected = selectedArticle?.id === article.id;
                  const isChecked = selectedForBulk.includes(article.id);
                  const isLockedByOther =
                    article.locked_by_username && article.locked_by_username !== myUsername;

                  return (
                    <div
                      key={article.id}
                      onClick={() => {
                        setSelectedArticle(article);
                        setFocusedArticleId(article.id);
                        setMobileTab("review");
                      }}
                      className={`absolute top-0 left-0 w-full p-2.5 sm:p-3 border-b border-border/60 cursor-pointer transition-colors flex items-center gap-2.5 ${
                        isSelected
                          ? "bg-primary/10 border-s-4 border-primary font-medium"
                          : "hover:bg-muted/30 text-foreground"
                      }`}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {/* Bulk Checkbox */}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onClick={(e) => handleSelectClick(article.id, e)}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-semibold truncate text-foreground leading-snug">
                            {article.title}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isLockedByOther && (
                              <span
                                title={t("feather-review-locked-by", article.locked_by_username!)}
                                className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-500/10 px-1 rounded"
                              >
                                <Lock className="h-2.5 w-2.5" />
                              </span>
                            )}
                            <Badge
                              variant={
                                article.status === "accepted"
                                  ? "default"
                                  : article.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-[9px] uppercase px-1.5 py-0 h-4 font-bold"
                            >
                              {article.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                          <span className="truncate">by {article.submitter_username}</span>
                          <span className="font-mono text-[10px] shrink-0">
                            {t("feather-review-preview-words", article.word_count)}
                          </span>
                        </div>
                        {article.reviews && article.reviews.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-primary/90 mt-0.5 truncate font-medium">
                            <UserCheck className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">
                              {t("feather-review-reviewed-by", article.reviews[article.reviews.length - 1].reviewer_username)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* DRAGGABLE RESIZER HANDLE (Desktop only) */}
        {!sidebarCollapsed && (
          <div
            onPointerDown={startResize}
            onDoubleClick={resetPanelWidth}
            className={`hidden md:flex w-1 hover:w-1.5 bg-border hover:bg-primary/60 cursor-col-resize transition-all z-20 shrink-0 ${
              isResizing ? "bg-primary w-1.5" : ""
            }`}
            title="Drag to resize panel, double-click to reset"
          />
        )}

        {/* RIGHT COLUMN: MAIN ARTICLE REVIEW CONSOLE */}
        <main
          className={`flex-1 flex flex-col h-full overflow-hidden bg-background ${
            mobileTab === "list" ? "hidden md:flex" : "flex"
          }`}
        >
          {selectedArticle ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Mobile Back Button & Pane switch (Visual vs Wikitext) on mobile only */}
              <div className="sm:hidden flex items-center justify-between border-b border-border bg-card px-3 py-1.5 text-xs shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileTab("list")}
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                  <span>{t("feather-review-nav-queue")}</span>
                </Button>
                {showWikitext && (
                  <div className="flex items-center gap-1 font-medium">
                    <button
                      type="button"
                      onClick={() => setMobilePreviewPane("visual")}
                      className={`px-2 py-0.5 rounded ${
                        mobilePreviewPane === "visual" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {t("feather-review-mobile-tab-visual")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobilePreviewPane("wikitext")}
                      className={`px-2 py-0.5 rounded ${
                        mobilePreviewPane === "wikitext" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {t("feather-review-mobile-tab-wikitext")}
                    </button>
                  </div>
                )}
              </div>

              {/* MediaWiki Sandboxed Iframe Preview & Raw Wikitext Split Pane */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
                {/* Visual Preview Iframe Pane */}
                <div
                  className={`flex-1 flex flex-col h-full overflow-hidden ${
                    showWikitext && mobilePreviewPane === "wikitext" ? "hidden md:flex" : "flex"
                  }`}
                >
                  {previewLoading ? (
                    <div className="flex-1 p-6 space-y-4 bg-background">
                      <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <Skeleton className="h-7 w-1/2 rounded" />
                        <Skeleton className="h-4 w-24 rounded" />
                      </div>
                      <div className="space-y-2.5 pt-2">
                        <Skeleton className="h-4 w-full rounded" />
                        <Skeleton className="h-4 w-11/12 rounded" />
                        <Skeleton className="h-4 w-4/5 rounded" />
                      </div>
                      <div className="space-y-2.5 pt-4">
                        <Skeleton className="h-5 w-1/3 rounded" />
                        <Skeleton className="h-4 w-full rounded" />
                        <Skeleton className="h-4 w-5/6 rounded" />
                        <Skeleton className="h-4 w-2/3 rounded" />
                      </div>
                    </div>
                  ) : previewData?.html &&
                    !previewData.html.includes("Failed to load preview") &&
                    !previewData.html.includes("doesn't exist") &&
                    !previewData.html.includes("mediawiki parse error") ? (
                    <iframe
                      className="w-full flex-1 border-0 bg-white"
                      sandbox="allow-scripts"
                      srcDoc={previewSrcdoc}
                      referrerPolicy="no-referrer"
                      title={selectedArticle.title}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-3.5">
                      <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shadow-xs">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm text-foreground">
                          {t("feather-review-preview-fallback-title")}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t(
                            "feather-review-preview-fallback-desc",
                            selectedArticle.title,
                            contest?.wiki_dbname || contest?.wiki_url || "the target wiki"
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                        <a
                          href={`${activeWikiUrl}/wiki/${encodeURIComponent(
                            selectedArticle.title
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                            className: "h-8 text-xs gap-1.5 cursor-pointer shadow-2xs",
                          })}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>{t("feather-review-open-wiki")}</span>
                        </a>
                        <a
                          href={`${activeWikiUrl}/w/index.php?title=${encodeURIComponent(
                            selectedArticle.title
                          )}&action=edit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                            className: "h-8 text-xs gap-1.5 cursor-pointer shadow-2xs",
                          })}
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>{t("feather-review-create-on-wiki")}</span>
                        </a>
                        {previewData?.wikitext && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowWikitext(true)}
                            className="h-8 text-xs gap-1.5 cursor-pointer"
                          >
                            <Code2 className="h-3.5 w-3.5" />
                            <span>{t("feather-review-wikitext-toggle")}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Raw Wikitext Code Pane */}
                {showWikitext && (
                  <div
                    className={`flex-1 md:w-1/2 overflow-hidden bg-muted/10 flex flex-col ${
                      mobilePreviewPane === "visual" ? "hidden md:flex" : "flex"
                    }`}
                  >
                    <div className="p-2 sm:p-2.5 border-b border-border bg-card flex items-center justify-between gap-2 shrink-0">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Code2 className="h-3.5 w-3.5 text-primary" />
                        {t("feather-review-raw-wikitext")}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyWikitext}
                        disabled={!previewData?.wikitext}
                        className="h-7 text-xs gap-1.5 cursor-pointer shadow-2xs"
                      >
                        {wikitextCopied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {wikitextCopied
                            ? t("feather-review-wikitext-copied")
                            : t("feather-review-wikitext-copy")}
                        </span>
                      </Button>
                    </div>

                    <div className="p-4 flex-1 overflow-auto bg-card/40">
                      {previewData?.wikitext ? (
                        <pre className="font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap select-text">
                          {previewData.wikitext}
                        </pre>
                      ) : (
                        <div className="py-12 text-center text-xs text-muted-foreground">
                          {t("feather-review-wikitext-unavailable")}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Previous Evaluation Banner (Compact 1-liner if re-reviewing) */}
              {selectedArticle.reviews && selectedArticle.reviews.length > 0 && (
                <div className="px-3 sm:px-4 py-1.5 border-t border-border bg-muted/40 flex items-center justify-between gap-2 text-xs shrink-0 animate-in fade-in-0 duration-150">
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    <MessageSquareQuote className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-muted-foreground text-[11px] shrink-0 font-medium">
                      {t("feather-review-previous-decision")}:
                    </span>
                    <Badge
                      variant={
                        selectedArticle.reviews[selectedArticle.reviews.length - 1].status === "accepted"
                          ? "default"
                          : selectedArticle.reviews[selectedArticle.reviews.length - 1].status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[9px] font-bold uppercase py-0 px-1.5 h-4 shrink-0"
                    >
                      {selectedArticle.reviews[selectedArticle.reviews.length - 1].status}
                    </Badge>
                    <span className="text-muted-foreground font-medium text-[11px] truncate">
                      by {selectedArticle.reviews[selectedArticle.reviews.length - 1].reviewer_username}
                    </span>
                    {selectedArticle.reviews[selectedArticle.reviews.length - 1].comment && (
                      <span className="text-foreground/90 italic truncate max-w-xs sm:max-w-md">
                        "{selectedArticle.reviews[selectedArticle.reviews.length - 1].comment}"
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 3. DECISION DOCK (Compact 48px Sticky Bar) */}
              <div className="px-3 sm:px-4 py-2 border-t border-border bg-card/95 backdrop-blur-md shrink-0 shadow-lg flex items-center justify-between gap-2 sm:gap-3">
                {/* Note for submitter */}
                <div className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md">
                  <Input
                    ref={commentBoxRef}
                    type="text"
                    placeholder={t("feather-review-comment-placeholder")}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="h-8 text-xs bg-background pr-7"
                  />
                  <kbd className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[9px] font-mono text-muted-foreground bg-muted px-1 rounded border border-border/60 hidden sm:inline-block">
                    {shortcuts.comment.toUpperCase()}
                  </kbd>
                </div>

                <span className="hidden xl:inline text-[11px] text-muted-foreground">
                  {t("feather-review-action-instant-hint")}
                </span>

                {/* Instant Action Buttons Row */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Skip Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      mutation.mutate({
                        articleId: selectedArticle.id,
                        status: "skipped",
                        decisionComment: comment,
                      })
                    }
                    disabled={mutation.isPending}
                    className="h-8 gap-1 sm:gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs px-2 sm:px-3"
                    title={`Skip article (${shortcuts.skip.toUpperCase()})`}
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    <span>{t("feather-review-btn-skip")}</span>
                    <kbd className="hidden sm:inline-block px-1 rounded bg-muted text-[10px] font-mono border">
                      {shortcuts.skip.toUpperCase()}
                    </kbd>
                  </Button>

                  {/* Reject Button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      mutation.mutate({
                        articleId: selectedArticle.id,
                        status: "rejected",
                        decisionComment: comment,
                      })
                    }
                    disabled={mutation.isPending}
                    className="h-8 gap-1 sm:gap-1.5 text-xs cursor-pointer shadow-2xs font-semibold px-2.5 sm:px-3"
                    title={`Reject article (${shortcuts.reject.toUpperCase()})`}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>{t("feather-review-btn-reject")}</span>
                    <kbd className="hidden sm:inline-block px-1 rounded bg-destructive-foreground/20 text-[10px] font-mono">
                      {shortcuts.reject.toUpperCase()}
                    </kbd>
                  </Button>

                  {/* Accept Button */}
                  <Button
                    size="sm"
                    onClick={() =>
                      mutation.mutate({
                        articleId: selectedArticle.id,
                        status: "accepted",
                        decisionComment: comment,
                      })
                    }
                    disabled={mutation.isPending}
                    className="h-8 gap-1 sm:gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs font-semibold px-2.5 sm:px-3"
                    title={`Accept article (${shortcuts.accept.toUpperCase()})`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{t("feather-review-btn-accept")}</span>
                    <kbd className="hidden sm:inline-block px-1 rounded bg-white/20 text-[10px] font-mono">
                      {shortcuts.accept.toUpperCase()}
                    </kbd>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-3">
              <BookOpen className="h-10 w-10 text-muted-foreground opacity-40" />
              <p className="font-semibold text-sm text-foreground">{t("feather-review-no-selection-title")}</p>
              <p className="text-xs">{t("feather-review-no-selection-desc")}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarCollapsed(false)}
                className="mt-2 text-xs cursor-pointer"
              >
                {t("feather-review-open-queue-btn")}
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* 4. MOBILE NAVIGATION BAR (Fixed Bottom) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border flex items-center justify-around z-40 pb-safe">
        <button
          type="button"
          onClick={() => setMobileTab("list")}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer relative ${
            mobileTab === "list" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="relative">
            <Layers className="h-4 w-4" />
            {activeTabArticles.length > 0 && (
              <span className="absolute -top-1 -end-2.5 h-3.5 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-mono font-bold flex items-center justify-center">
                {n(activeTabArticles.length)}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">{t("feather-review-mobile-nav-queue")}</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("review")}
          disabled={!selectedArticle}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            mobileTab === "review" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          } ${!selectedArticle ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          <BookOpen className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">{t("feather-review-mobile-nav-review")}</span>
        </button>
      </nav>

      {/* 5. FLOATING UNDO TOAST (Animated 6-Second Window) */}
      {undoItem && (
        <div className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-[90vw] overflow-hidden">
          <div className="flex items-center gap-2 truncate">
            <Badge
              variant="outline"
              className={`text-[9px] uppercase px-1.5 py-0 font-bold border-background/30 text-background ${
                undoItem.status === "accepted" ? "bg-emerald-500/20" : "bg-destructive/20"
              }`}
            >
              {undoItem.status}
            </Badge>
            <span className="truncate max-w-xs">{undoItem.title}</span>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleUndo}
            className="h-7 px-2.5 text-xs gap-1 font-semibold cursor-pointer shrink-0"
          >
            <Undo2 className="h-3 w-3" />
            <span>{t("feather-review-undo-btn")}</span>
            <kbd className="hidden sm:inline-block px-1 rounded bg-muted text-[9px] font-mono">
              {shortcuts.undo.toUpperCase()}
            </kbd>
          </Button>

          {/* Animated Countdown Track */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/20">
            <div
              className="h-full bg-primary transition-all duration-75"
              style={{ width: `${undoCountdown}%` }}
            />
          </div>
        </div>
      )}

      {/* 6. KEYBOARD SHORTCUTS REFERENCE & CUSTOMIZATION MODAL */}
      {showShortcutHelp && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => {
            setShowShortcutHelp(false);
            setCapturingAction(null);
          }}
        >
          <div
            className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">{t("feather-review-modal-title")}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowShortcutHelp(false);
                  setCapturingAction(null);
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs divide-y divide-border/60">
              {SHORTCUT_ACTIONS.map((action) => (
                <div key={action.id} className="flex items-center justify-between pt-2">
                  <span>{t(action.labelKey)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCapturingAction(capturingAction === action.id ? null : action.id)
                    }
                    className={`px-2 py-0.5 rounded font-mono font-bold text-xs border cursor-pointer transition-colors ${
                      capturingAction === action.id
                        ? "bg-primary text-primary-foreground border-primary animate-pulse"
                        : "bg-muted text-foreground border-border hover:bg-muted/80"
                    }`}
                  >
                    {capturingAction === action.id ? "…" : (shortcuts[action.id] || action.defaultKey).toUpperCase()}
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2">
                <span>{t("feather-review-shortcut-nav")}</span>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border">↓</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span>{t("feather-review-shortcut-esc")}</span>
                <kbd className="px-2 py-0.5 rounded bg-muted font-mono font-bold text-xs border">Esc</kbd>
              </div>
            </div>

            {capturingAction && (
              <p className="text-[11px] text-primary font-medium bg-primary/10 p-2 rounded text-center">
                {t("feather-review-shortcut-rebind-prompt")}
              </p>
            )}

            <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetShortcuts}
                className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>{t("feather-review-shortcut-reset")}</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowShortcutHelp(false);
                  setCapturingAction(null);
                }}
                className="text-xs h-7 cursor-pointer"
              >
                {t("feather-review-shortcut-gotit")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. DELETE ARTICLE CONFIRMATION MODAL */}
      {deleteConfirmArticle && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setDeleteConfirmArticle(null)}
        >
          <div
            className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5 text-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-foreground">
                {t("feather-review-delete-confirm-title")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("feather-review-delete-confirm-desc", deleteConfirmArticle.title)}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmArticle(null)}
                className="text-xs h-8 cursor-pointer"
              >
                {t("feather-wizard-btn-cancel")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteArticle}
                disabled={isDeleting}
                className="text-xs h-8 cursor-pointer gap-1"
              >
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                <span>{t("feather-review-btn-delete")}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
