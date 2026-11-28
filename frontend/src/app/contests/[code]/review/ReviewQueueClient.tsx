"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  Feather,
  Loader2,
  Sparkles,
  BookOpen,
  Layers,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Search,
  X,
  Check,
  XCircle,
  SkipForward,
  Trash2,
  MessageSquare,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import ArticleDiscussionModal from "@/components/contests/ArticleDiscussionModal";
import UserBadge, { ContestRoleScope } from "@/components/users/UserBadge";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/I18nContext";
import "@wikimedia/codex/dist/codex.style.css";
import "./ReviewQueue.css";
import {
  cdxIconArticle,
  cdxIconArticleCheck,
  cdxIconArrowPrevious,
  cdxIconCheck,
  cdxIconClear,
  cdxIconCollapse,
  cdxIconDownTriangle,
  cdxIconSettings,
  cdxIconCopy,
  cdxIconLinkExternal,
  cdxIconLock,
  cdxIconMenu,
  cdxIconSearch,
  cdxIconNext,
  cdxIconTrash,
  cdxIconBlock,
} from "@wikimedia/codex-icons";
import CdxIcon from "@/components/icons/CdxIcon";
import {
  fetchContest,
  fetchArticles,
  fetchMe,
  reviewArticle,
  acquireArticleLock,
  releaseArticleLock as apiReleaseLock,
  undoArticleReview,
  deleteArticle,
  Contest,
  UserSession,
  KeysetResponse,
} from "@/lib/api";
import { buildWikiPreviewSrcdoc } from "./wikiPreviewHelper";

function formatDateDayFirst(val?: string | null) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return val;
  }
}

const LIST_STEP = 200;
const screenful = (rowHeight = 44) => {
  const height = (typeof window !== "undefined" && window.innerHeight) || 800;
  return Math.max(Math.ceil(height / rowHeight) + 4, 12);
};

const BULK_CHUNK = 200;
async function postBulkInChunks(url: string, ids: number[], extraBody: any = {}) {
  const succeeded: number[] = [];
  const failed: any[] = [];
  for (let start = 0; start < ids.length; start += BULK_CHUNK) {
    const chunk = ids.slice(start, start + BULK_CHUNK);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...extraBody, article_ids: chunk }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.detail || `Request failed (${res.status})`);
      succeeded.push(...(result.succeeded || []));
      failed.push(...(result.failed || []));
    } catch (err: any) {
      failed.push(...chunk.map((id) => ({ article_id: id, detail: err.message || "Request failed" })));
    }
  }
  return { succeeded, failed };
}

function normalizeArticle(a: any) {
  return {
    ...a,
    article_id: a.article_id ?? a.id,
    id: a.id ?? a.article_id,
    submitted_by: a.submitted_by ?? a.submitter_username ?? "",
    submitter_username: a.submitter_username ?? a.submitted_by ?? "",
    locked_by: a.locked_by ?? a.locked_by_username ?? null,
    locked_by_username: a.locked_by_username ?? a.locked_by ?? null,
    assigned_to: a.assigned_to ?? a.assigned_to_username ?? "",
    reviews: (a.reviews || []).map((r: any) => ({
      ...r,
      reviewer: r.reviewer ?? r.reviewer_username ?? "",
      reviewer_username: r.reviewer_username ?? r.reviewer ?? "",
      decision: r.decision ?? r.status ?? "",
    })),
  };
}

const normalizeText = (value: string) =>
  (value || "")
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const DECISION_RANK: Record<string, number> = {
  accepted: 0,
  rejected: 1,
  skipped: 2,
};

const SHORTCUT_ACTIONS = [
  { id: "accept", i18nKey: "feather-review-shortcut-accept-desc", default: "a" },
  { id: "reject", i18nKey: "feather-review-shortcut-reject-desc", default: "r" },
  { id: "skip", i18nKey: "feather-review-shortcut-skip-desc", default: "s" },
  { id: "comment", i18nKey: "feather-review-shortcut-comment-desc", default: "c" },
  { id: "undo", i18nKey: "feather-review-shortcut-undo-desc", default: "u" },
  { id: "wikitext", i18nKey: "feather-review-shortcut-wikitext-desc", default: "w" },
  { id: "queue", i18nKey: "feather-review-shortcut-queue-desc", default: "q" },
];
const DEFAULT_SHORTCUTS = Object.fromEntries(SHORTCUT_ACTIONS.map((a) => [a.id, a.default]));
const RESERVED_SHORTCUT_KEYS = new Set(["escape", "tab", "/", "?"]);
const ACTIVATION_KEYS = new Set(["enter", "space"]);
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "AltGraph"]);

const normalizeShortcutKey = (rawKey: string) => {
  if (!rawKey) return "";
  if (rawKey === " " || rawKey === "Spacebar") return "space";
  return rawKey.toLowerCase();
};
const isBindableKey = (key: string) =>
  !RESERVED_SHORTCUT_KEYS.has(key) && (ACTIVATION_KEYS.has(key) || key.length === 1);
const shortcutKeyLabel = (key: string) => {
  if (key === "space") return "Space";
  if (key === "enter") return "Enter";
  return (key || "").toUpperCase();
};

const UNDO_WINDOW_MS = 2000;
const PANEL_MIN = 260,
  PANEL_MAX = 640,
  PANEL_DEFAULT = 340;

// 32-bit FNV-1a hash function for strings / numbers
function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Mulberry32 PRNG - high quality 32-bit deterministic generator
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic Fisher-Yates shuffle using seeded PRNG
function seededShuffle<T>(array: T[], seed: number): T[] {
  const copy = [...array];
  const rng = mulberry32(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

interface ReviewQueueClientProps {
  code: string;
  initialContest?: Contest | null;
  initialUser?: UserSession | null;
  initialArticles?: KeysetResponse | null;
}

export default function ReviewQueueClient({
  code,
  initialContest,
  initialUser,
  initialArticles,
}: ReviewQueueClientProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { t, n } = useI18n();

  const [contest, setContest] = useState<Contest | null>(initialContest || null);

  // Contest metric mode (word vs byte evaluation)
  const isWordBased = Boolean(
    contest?.rank_by_words ||
    ((contest?.min_words ?? 0) > 0 && (contest?.min_bytes ?? 0) === 0)
  );
  const isByteBased = Boolean(
    !contest?.rank_by_words &&
    (contest?.min_bytes ?? 0) > 0 &&
    (contest?.min_words ?? 0) === 0
  );
  const showBytes = !isWordBased;
  const showWords = !isByteBased;
  const [user, setUser] = useState<UserSession | null>(initialUser || null);
  const [userLoaded, setUserLoaded] = useState<boolean>(() => Boolean(initialUser));

  const [articles, setArticles] = useState<any[]>(() => {
    if (initialArticles?.items && initialArticles.items.length > 0) {
      return initialArticles.items.map(normalizeArticle);
    }
    return [];
  });
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [nextCursor, setNextCursor] = useState<number | undefined>(undefined);
  const [pendingHasMore, setPendingHasMore] = useState<boolean>(() => Boolean(initialArticles?.has_more));
  const [pendingNextCursor, setPendingNextCursor] = useState<number | undefined>(() => initialArticles?.next_cursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<any | null>(null);
  const [comment, setComment] = useState("");
  const [bulkComment, setBulkComment] = useState("");
  const [isLoading, setIsLoading] = useState(() => {
    return !(initialContest && initialArticles?.items);
  });
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<"accepted" | "rejected" | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [mobileTab, setMobileTab] = useState<"list" | "review">("list");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Raw-wikitext side panel
  const [showWikitext, setShowWikitext] = useState(false);
  const [previewPane, setPreviewPane] = useState<"visual" | "wikitext">("visual");
  const [wikitextSource, setWikitextSource] = useState("");
  const [wikitextCopied, setWikitextCopied] = useState(false);

  const [listTab, setListTab] = useState<"queue" | "rereview" | "others">("queue");
  const [onlyPendingReReview, setOnlyPendingReReview] = useState(false);
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);
  const [showQueueOptions, setShowQueueOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [panelWidth, setPanelWidthState] = useState(PANEL_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);
  const [ownerViewMode, setOwnerViewMode] = useState<"judge" | "owner">("judge");
  const [selectedJudge, setSelectedJudge] = useState("");

  const [selectedForBulk, setSelectedForBulk] = useState<number[]>([]);
  const [bulkAnchorId, setBulkAnchorId] = useState<number | null>(null);
  const [bulkRangeIds, setBulkRangeIds] = useState<number[]>([]);
  const [sidebarVisibleCounts, setSidebarVisibleCounts] = useState<Record<string, number>>({
    pending: 100,
    other: 100,
    judged: 100,
  });
  const [collapsedDecisions, setCollapsedDecisions] = useState<Record<string, boolean>>({});
  const [focusedArticleId, setFocusedArticleId] = useState<number | null>(null);

  // Undo toast state
  const [lastDecision, setLastDecision] = useState<{
    seq: number;
    articleId: number;
    title: string;
    decision: string;
    comment: string;
  } | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);

  // Shortcuts
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [shortcuts, setShortcuts] = useState<Record<string, string>>({ ...DEFAULT_SHORTCUTS });
  const [capturingAction, setCapturingAction] = useState<string | null>(null);
  const [shortcutError, setShortcutError] = useState("");

  const [previewSrcdoc, setPreviewSrcdoc] = useState("");

  const commentBoxRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const previewRequestIdRef = useRef(0);
  const undoExpiryTimerRef = useRef<any>(null);
  const wikitextCopyTimerRef = useRef<any>(null);
  const focusOpenTimerRef = useRef<any>(null);
  const lockHeartbeatTimerRef = useRef<any>(null);
  const heldKeysRef = useRef<Set<string>>(new Set());
  const awaitingFirstSelectionRef = useRef(true);

  // Initial local storage hydration
  useEffect(() => {
    try {
      const savedWikitext = localStorage.getItem("review_queue_wikitext");
      if (savedWikitext === "1") {
        setShowWikitext(true);
        setPreviewPane("wikitext");
      }
      const savedWidth = Number(localStorage.getItem("review_queue_panel_width"));
      if (savedWidth && savedWidth >= PANEL_MIN && savedWidth <= PANEL_MAX) {
        setPanelWidthState(savedWidth);
      }
    } catch {}
  }, []);

  const contestRoles = useMemo<ContestRoleScope>(() => ({
    organizers: contest?.organizers,
    juries: contest?.juries,
  }), [contest?.organizers, contest?.juries]);

  const myUsername = (user?.wiki_username || "").trim();
  const myUsernameLower = myUsername.toLowerCase();
  const isOwner = Boolean(
    user?.role === "owner" ||
    (user as any)?.is_owner ||
    (user as any)?.is_admin ||
    user?.role === "admin" ||
    (contest?.created_by_id && user?.user_id && contest.created_by_id === user.user_id) ||
    (contest?.created_by_username &&
      myUsernameLower &&
      contest.created_by_username.trim().toLowerCase() === myUsernameLower) ||
    (contest?.organizers &&
      myUsernameLower &&
      contest.organizers.some(
        (o: string) => (o || "").trim().toLowerCase() === myUsernameLower
      ))
  );
  const isJury = Boolean(
    contest?.juries &&
    myUsernameLower &&
    contest.juries.some(
      (j: string) => (j || "").trim().toLowerCase() === myUsernameLower
    )
  );
  const isAuthorized = isJury || isOwner;

  // Effective reviewer identity when Owner uses "View as: Judge (<name>) | Owner"
  const viewAsUsername = useMemo(() => {
    if (isOwner && ownerViewMode === "judge" && selectedJudge.trim()) {
      return selectedJudge.trim();
    }
    return myUsername;
  }, [isOwner, ownerViewMode, selectedJudge, myUsername]);
  const viewAsUsernameLower = viewAsUsername.toLowerCase();
  const isOwnerMode = isOwner && ownerViewMode === "owner";
  const isImpersonatingJudge = Boolean(
    isOwner &&
    ownerViewMode === "judge" &&
    selectedJudge.trim() &&
    selectedJudge.trim().toLowerCase() !== myUsernameLower
  );

  // Conflict of Interest (COI) check
  const isOwnArticle = useCallback(
    (a: any) => {
      if (!a || !myUsernameLower) return false;
      const submitter = (a.submitted_by || a.submitter_username || "").trim().toLowerCase();
      const creator = (a.wiki_creator || "").trim().toLowerCase();
      return submitter === myUsernameLower || creator === myUsernameLower;
    },
    [myUsernameLower]
  );

  const isLockedByOther = Boolean(
    currentArticle?.locked_by &&
    myUsernameLower &&
    currentArticle.locked_by.trim().toLowerCase() !== myUsernameLower
  );
  const isSelfArticle = Boolean(currentArticle && isOwnArticle(currentArticle));

  // Shortcuts storage
  const shortcutStorageKey = useCallback(
    () => `review_queue_shortcuts:${myUsername || "anonymous"}`,
    [myUsername]
  );

  const loadShortcuts = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(shortcutStorageKey()) || "null");
      setShortcuts({
        ...DEFAULT_SHORTCUTS,
        ...Object.fromEntries(
          Object.entries(saved || {})
            .filter(
              ([id, key]) =>
                id in DEFAULT_SHORTCUTS &&
                typeof key === "string" &&
                isBindableKey(normalizeShortcutKey(key))
            )
            .map(([id, key]) => [id, normalizeShortcutKey(key as string)])
        ),
      });
    } catch (error) {
      console.warn("Could not read saved review shortcuts", error);
      setShortcuts({ ...DEFAULT_SHORTCUTS });
    }
  }, [shortcutStorageKey]);

  useEffect(() => {
    loadShortcuts();
  }, [loadShortcuts]);

  const persistShortcuts = (updated: Record<string, string>) => {
    try {
      localStorage.setItem(shortcutStorageKey(), JSON.stringify(updated));
    } catch {}
  };

  const startShortcutCapture = (actionId: string) => {
    setCapturingAction(actionId);
    setShortcutError("");
  };
  const cancelShortcutCapture = () => {
    setCapturingAction(null);
    setShortcutError("");
  };
  const resetShortcuts = () => {
    setShortcuts({ ...DEFAULT_SHORTCUTS });
    persistShortcuts(DEFAULT_SHORTCUTS);
    setCapturingAction(null);
    setShortcutError("");
  };

  const toggleWikitext = () => {
    setShowWikitext((prev) => {
      const next = !prev;
      localStorage.setItem("review_queue_wikitext", next ? "1" : "0");
      if (next) setPreviewPane("wikitext");
      else setPreviewPane("visual");
      return next;
    });
  };

  const copyWikitext = async () => {
    if (!wikitextSource) return;
    try {
      await navigator.clipboard.writeText(wikitextSource);
      setWikitextCopied(true);
      clearTimeout(wikitextCopyTimerRef.current);
      wikitextCopyTimerRef.current = setTimeout(() => {
        setWikitextCopied(false);
      }, 1600);
    } catch (error) {
      console.warn("Copy failed", error);
    }
  };

  // Resize handling
  const setPanelWidth = (px: number) => {
    const clamped = Math.min(Math.max(Math.round(px), PANEL_MIN), PANEL_MAX);
    setPanelWidthState(clamped);
    try {
      localStorage.setItem("review_queue_panel_width", String(clamped));
    } catch {}
  };

  const startResize = (event: React.PointerEvent) => {
    if (event.pointerType === "touch") return;
    const startX = event.clientX;
    const startWidth = panelWidth;
    setIsResizing(true);
    const onMove = (moveEvent: PointerEvent) => {
      setPanelWidth(startWidth + moveEvent.clientX - startX);
    };
    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    event.preventDefault();
  };

  const resetPanelWidth = () => {
    setPanelWidth(PANEL_DEFAULT);
  };

  // URL generator for wiki article
  const wikiBase = contest?.wiki_url || "https://bn.wikipedia.org";
  const articleUrl = (title: string) => `${wikiBase}/wiki/${encodeURIComponent(title)}`;

  // Fetch article preview
  const fetchPreview = useCallback(
    async (title: string) => {
      const requestId = ++previewRequestIdRef.current;
      setIsLoadingPreview(true);
      setPreviewSrcdoc("");
      setWikitextSource("");
      try {
        const base = contest?.wiki_url || "https://bn.wikipedia.org";
        const res = await fetch(
          `${base}/w/api.php?action=parse&page=${encodeURIComponent(
            title
          )}&format=json&prop=text%7Cwikitext&redirects=1&origin=*`
        );
        const data = await res.json();
        const body =
          data.parse?.text?.["*"] ?? `<p style="color:#94a3b8">${t("feather-review-wikitext-empty")}</p>`;
        if (requestId !== previewRequestIdRef.current) return;
        const wikitext = data.parse?.wikitext?.["*"] ?? "";
        setWikitextSource(wikitext);
        setPreviewSrcdoc(buildWikiPreviewSrcdoc(body, base, isDark, contest?.wiki_lang || "bn"));
      } catch (e) {
        console.error(e);
        if (requestId === previewRequestIdRef.current) {
          setPreviewSrcdoc(
            `<!DOCTYPE html><html><body style="color:#20364d;background:#f5f8fb;padding:24px">${t("feather-review-preview-error")}</body></html>`
          );
        }
      } finally {
        if (requestId === previewRequestIdRef.current) setIsLoadingPreview(false);
      }
    },
    [contest?.wiki_lang, contest?.wiki_url, isDark, t]
  );

  useEffect(() => {
    if (currentArticle?.title) {
      fetchPreview(currentArticle.title);
    }
  }, [fetchPreview, isDark]);

  const getMyLatestDecision = useCallback(
    (article: any) => {
      if (!article || !article.reviews) return null;
      if (isOwnerMode) {
        const last = article.reviews[article.reviews.length - 1];
        return last ? (last.decision || last.status) : null;
      }
      const target = viewAsUsernameLower;
      const myReviews = article.reviews.filter((r: any) => (r.reviewer || "").trim().toLowerCase() === target);
      if (!myReviews.length) return null;
      return myReviews[myReviews.length - 1].decision || myReviews[myReviews.length - 1].status;
    },
    [isOwnerMode, viewAsUsernameLower]
  );

  const getMyLatestComment = useCallback(
    (article: any) => {
      if (!article || !article.reviews) return "";
      if (isOwnerMode) {
        const last = article.reviews[article.reviews.length - 1];
        return last?.comment || "";
      }
      const target = viewAsUsernameLower;
      const myReviews = article.reviews.filter((r: any) => (r.reviewer || "").trim().toLowerCase() === target);
      if (!myReviews.length) return "";
      return myReviews[myReviews.length - 1].comment || "";
    },
    [isOwnerMode, viewAsUsernameLower]
  );

  const getDecisionLabel = useCallback(
    (heading: string) => {
      if (heading === "accepted") return t("feather-review-block-accepted");
      if (heading === "rejected") return t("feather-review-block-rejected");
      if (heading === "skipped") return t("feather-review-block-skipped");
      return heading;
    },
    [t]
  );

  // Select article
  const selectArticle = useCallback(
    (article: any) => {
      clearTimeout(focusOpenTimerRef.current);
      clearInterval(lockHeartbeatTimerRef.current);
      if (!article) return;
      const canReReview =
        article?.reviews?.some((r: any) => r.reviewer === myUsername) ||
        Boolean(article?.re_review_requested) ||
        isOwner;
      if (article.status !== "pending" && !canReReview) return;

      awaitingFirstSelectionRef.current = false;
      setReviewError("");

      if (currentArticle?.article_id && currentArticle.article_id !== article.article_id) {
        apiReleaseLock(currentArticle.article_id).catch(() => {});
      }

      setCurrentArticle(article);
      const prevComment = getMyLatestComment(article);
      const isDefaultBulk =
        prevComment === "Bulk reviewed" ||
        prevComment === t("feather-review-bulk-default-comment");
      setComment(isDefaultBulk ? "" : prevComment);
      fetchPreview(article.title);

      if (!isOwnArticle(article) && article.status === "pending") {
        acquireArticleLock(article.article_id)
          .then((res) => {
            if (res?.success) {
              setCurrentArticle((prev: any) =>
                prev?.article_id === article.article_id
                  ? { ...prev, locked_by: myUsername }
                  : prev
              );
            }
          })
          .catch((err: any) => {
            const msg = err?.message || "";
            const match =
              msg.match(/reviewed by (.+)/i) ||
              msg.match(/judged by (.+)/i) ||
              msg.match(/judging by (.+)/i) ||
              msg.match(/locked by (.+)/i);
            const lockedUser = match ? match[1].trim() : article.locked_by;
            if (lockedUser) {
              setCurrentArticle((prev: any) =>
                prev?.article_id === article.article_id
                  ? { ...prev, locked_by: lockedUser }
                  : prev
              );
            }
          });

        lockHeartbeatTimerRef.current = setInterval(() => {
          acquireArticleLock(article.article_id).catch(() => {});
        }, 120000);
      }

      setMobileTab("review");
    },
    [currentArticle?.article_id, fetchPreview, getMyLatestComment, isOwnArticle, myUsername]
  );

  // Load contest & user data
  useEffect(() => {
    let active = true;
    async function loadData() {
      if (!initialArticles?.items) {
        setIsLoading(true);
      }
      try {
        const cDataPromise = initialContest
          ? Promise.resolve(initialContest)
          : fetchContest(code).catch(() => null);
        const uDataPromise =
          initialUser && initialUser.is_authenticated
            ? Promise.resolve(initialUser)
            : fetchMe().catch(
                () => ({ is_authenticated: false, role: "anonymous" } as UserSession)
              );

        const ssrPendingItems = initialArticles?.items || [];
        const hasSSR = ssrPendingItems.length > 0;

        // If SSR already gave us 200 pending articles, don't block initial render!
        const pendingDataPromise: Promise<KeysetResponse> = hasSSR
          ? Promise.resolve(initialArticles!)
          : fetchArticles(code, undefined, "pending", 200).catch(() => ({
              items: [],
              total: 0,
              has_more: false,
              next_cursor: undefined,
            }));

        const [cData, uData, pendingData] = await Promise.all([
          cDataPromise,
          uDataPromise,
          pendingDataPromise,
        ]);
        if (!active) return;
        if (cData) setContest(cData);
        if (uData) setUser(uData);

        if (!hasSSR && pendingData?.items?.length) {
          setArticles(pendingData.items.map(normalizeArticle));
        }
        setPendingHasMore(Boolean(pendingData?.has_more));
        setPendingNextCursor(pendingData?.next_cursor);

        if (cData?.juries && cData.juries.length > 0) {
          setSelectedJudge(uData?.wiki_username || cData.juries[0]);
        }

        if (active) {
          setUserLoaded(true);
          setIsLoading(false);
        }

        // Background-load remaining pending articles first, then reviewed articles,
        // yielding 80ms between chunks so the UI stays 60 FPS with zero stutter.
        const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 80));

        if (active) setIsBackgroundLoading(true);

        let pMore = Boolean(pendingData?.has_more);
        let pCursor = pendingData?.next_cursor;
        let pPages = 0;
        while (active && pMore && pCursor && pPages < 30) {
          await yieldToMain();
          if (!active) break;
          pPages += 1;
          const pRes: KeysetResponse | null = await fetchArticles(code, pCursor, "pending", 500).catch(() => null);
          if (!active || !pRes) break;
          if (pRes.items?.length) {
            const norm = pRes.items.map(normalizeArticle);
            setArticles((prev) => {
              const seen = new Set(prev.map((a) => a.article_id));
              const add = norm.filter((a: any) => !seen.has(a.article_id));
              return add.length > 0 ? [...prev, ...add] : prev;
            });
          }
          pMore = Boolean(pRes.has_more);
          pCursor = pRes.next_cursor;
          setPendingHasMore(pMore);
          setPendingNextCursor(pCursor);
        }

        let aMore = true;
        let aCursor: number | undefined = undefined;
        let aPages = 0;
        while (active && aMore && aPages < 60) {
          await yieldToMain();
          if (!active) break;
          aPages += 1;
          const aRes: KeysetResponse | null = await fetchArticles(code, aCursor, undefined, 500).catch(() => null);
          if (!active || !aRes) break;
          if (aRes.items?.length) {
            const norm = aRes.items.map(normalizeArticle);
            setArticles((prev) => {
              const seen = new Set(prev.map((a) => a.article_id));
              const add = norm.filter((a: any) => !seen.has(a.article_id));
              return add.length > 0 ? [...prev, ...add] : prev;
            });
          }
          aMore = Boolean(aRes.has_more && aRes.next_cursor);
          aCursor = aRes.next_cursor;
          setHasMore(aMore);
          setNextCursor(aCursor);
          if (!aRes.items?.length) break;
        }

        if (active) setIsBackgroundLoading(false);
      } catch (err) {
        console.error("Failed to load review data", err);
      } finally {
        if (active) {
          setUserLoaded(true);
          setIsLoading(false);
          setIsBackgroundLoading(false);
        }
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [code, initialContest, initialUser]);

  // Available new articles: strictly excluding own articles & deterministically shuffled using jury ID as seed
  const newArticles = useMemo(() => {
    const isOwnForView = (a: any) => {
      if (isOwnerMode || !viewAsUsernameLower) return false;
      const submitter = (a.submitted_by || a.submitter_username || "").trim().toLowerCase();
      const creator = (a.wiki_creator || "").trim().toLowerCase();
      return submitter === viewAsUsernameLower || creator === viewAsUsernameLower;
    };
    const list = articles.filter((a) => {
      if (a.status !== "pending") return false;
      if (isOwnerMode) return true;
      if (isOwnForView(a)) return false;
      if (
        viewAsUsernameLower &&
        a.reviews.some((r: any) => (r.reviewer || "").trim().toLowerCase() === viewAsUsernameLower)
      ) {
        return false;
      }
      if (
        contest?.distribute_jury_queue &&
        viewAsUsernameLower &&
        a.assigned_to_username &&
        a.assigned_to_username.trim().toLowerCase() !== viewAsUsernameLower
      ) {
        return false;
      }
      return true;
    });
    const seedKey = isOwnerMode ? "owner" : viewAsUsername || String(user?.user_id || "jury");
    const jurySeed = fnv1a(`${contest?.id || code}_${seedKey}`);
    return seededShuffle(list, jurySeed);
  }, [articles, code, contest?.distribute_jury_queue, contest?.id, isOwnerMode, user?.user_id, viewAsUsername, viewAsUsernameLower]);

  const availableNewArticles = useMemo(() => {
    return newArticles.filter(
      (a) => !a.locked_by || (myUsername && a.locked_by.trim().toLowerCase() === myUsernameLower)
    );
  }, [newArticles, myUsername, myUsernameLower]);

  const judgedArticles = useMemo(() => {
    if (isOwnerMode) {
      return articles.filter((a) => a.status !== "pending" || (a.reviews && a.reviews.length > 0) || a.re_review_requested);
    }
    if (!viewAsUsernameLower) return [];
    return articles.filter((a) => {
      const isMine = a.reviews?.some((r: any) => (r.reviewer || "").trim().toLowerCase() === viewAsUsernameLower);
      const submitter = (a.submitted_by || a.submitter_username || "").trim().toLowerCase();
      const isPendingReReview = a.re_review_requested && submitter !== viewAsUsernameLower;
      return isMine || isPendingReReview;
    });
  }, [articles, isOwnerMode, viewAsUsernameLower]);

  const otherReviewedArticles = useMemo(() => {
    if (!myUsername || !isOwner) return [];
    return articles.filter(
      (a) =>
        a.status !== "pending" &&
        a.reviews.length > 0 &&
        !a.reviews.some((r: any) => r.reviewer === myUsername)
    );
  }, [articles, isOwner, myUsername]);

  // Auto select first article
  useEffect(() => {
    if (!awaitingFirstSelectionRef.current || currentArticle) return;
    const next = availableNewArticles[0];
    if (next) {
      awaitingFirstSelectionRef.current = false;
      selectArticle(next);
      if (typeof window !== "undefined" && window.innerWidth <= 768) {
        setMobileTab("list");
      }
    }
  }, [availableNewArticles, currentArticle, selectArticle]);

  // Status stats
  const statusStats = useMemo(() => {
    const accepted = articles.filter((a) => a.status === "accepted").length;
    const rejected = articles.filter((a) => a.status === "rejected").length;
    const pending = articles.filter((a) => a.status === "pending").length;
    return {
      total: articles.length,
      accepted,
      rejected,
      pending,
    };
  }, [articles]);

  const judgeableTotal = contest?.total_articles ?? statusStats.total;
  const pendingCount = contest?.pending_articles ?? statusStats.pending;
  const judgedCount = Math.max(0, judgeableTotal - pendingCount);
  const judgedPercent = judgeableTotal > 0 ? Math.round((judgedCount / judgeableTotal) * 100) : 0;

  const isSingleSubmitter = useMemo(() => {
    return new Set(articles.map((a) => a.submitted_by)).size <= 1;
  }, [articles]);

  // Search filtering
  const searchTerms = useMemo(() => {
    return normalizeText(searchQuery).split(/\s+/).filter(Boolean);
  }, [searchQuery]);

  const matchesSearch = useCallback(
    (article: any, withSubmitter: boolean) => {
      if (!searchTerms.length) return true;
      const haystack = normalizeText(
        withSubmitter ? `${article.title} ${article.submitted_by}` : article.title
      );
      return searchTerms.every((term) => haystack.includes(term));
    },
    [searchTerms]
  );

  const forSidebar = useCallback(
    (list: any[], withSubmitter: boolean = false) =>
      list.filter((a) => matchesSearch(a, withSubmitter)),
    [matchesSearch]
  );

  const pendingReReviewCount = useMemo(() => {
    return articles.filter((a) => a.re_review_requested && !isOwnArticle(a)).length;
  }, [articles, isOwnArticle]);

  const filteredNewArticles = useMemo(() => forSidebar(newArticles), [forSidebar, newArticles]);
  const filteredJudgedArticles = useMemo(() => {
    let list = [...forSidebar(judgedArticles, true)];
    if (onlyPendingReReview) {
      list = list.filter((a) => a.re_review_requested);
    }
    return list.sort((a, b) => {
      if (a.re_review_requested && !b.re_review_requested) return -1;
      if (!a.re_review_requested && b.re_review_requested) return 1;
      const ra = DECISION_RANK[getMyLatestDecision(a)] ?? 9;
      const rb = DECISION_RANK[getMyLatestDecision(b)] ?? 9;
      return ra - rb;
    });
  }, [forSidebar, getMyLatestDecision, judgedArticles, onlyPendingReReview]);

  const filteredOtherArticles = useMemo(
    () => forSidebar(otherReviewedArticles),
    [forSidebar, otherReviewedArticles]
  );

  const loadMoreArticles = useCallback(async (mode: "pending" | "all" = "all") => {
    if (isLoadingMore) return;
    if (mode === "pending" && (!pendingHasMore || !pendingNextCursor)) return;
    if (mode === "all" && (!hasMore || !nextCursor)) return;

    setIsLoadingMore(true);
    try {
      const res =
        mode === "pending"
          ? await fetchArticles(code, pendingNextCursor, "pending", 500)
          : await fetchArticles(code, nextCursor, undefined, 500);
      if (res?.items?.length) {
        const norm = res.items.map(normalizeArticle);
        setArticles((prev) => {
          const existingIds = new Set(prev.map((a) => a.article_id));
          const uniqueNew = norm.filter((a) => !existingIds.has(a.article_id));
          return [...prev, ...uniqueNew];
        });
      }
      if (mode === "pending") {
        setPendingHasMore(Boolean(res?.has_more));
        setPendingNextCursor(res?.next_cursor);
      } else {
        setHasMore(Boolean(res?.has_more));
        setNextCursor(res?.next_cursor);
      }
    } catch (err) {
      console.error("Failed to load more articles", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [code, hasMore, isLoadingMore, nextCursor, pendingHasMore, pendingNextCursor]);

  const listTabs = useMemo(() => {
    const useServerPendingCount =
      !searchQuery &&
      !isImpersonatingJudge &&
      !(contest?.distribute_jury_queue && ownerViewMode === "judge") &&
      contest?.pending_articles !== undefined &&
      contest.pending_articles > filteredNewArticles.length;
    const totalPendingCount = useServerPendingCount
      ? contest!.pending_articles!
      : filteredNewArticles.length;

    const hasExactReviewedCount = Boolean(
      !searchQuery &&
      !onlyPendingReReview &&
      !isImpersonatingJudge &&
      !isOwnerMode &&
      contest?.my_reviewed_count !== undefined &&
      contest.my_reviewed_count >= filteredJudgedArticles.length
    );
    const totalReviewedCount = hasExactReviewedCount
      ? contest!.my_reviewed_count!
      : filteredJudgedArticles.length;

    return [
      { id: "queue", key: "pending", label: t("feather-review-tab-queue"), count: totalPendingCount, hasMore: !useServerPendingCount && pendingHasMore, list: filteredNewArticles },
      { id: "rereview", key: "judged", label: t("feather-review-tab-rereview"), count: totalReviewedCount, hasMore: !hasExactReviewedCount && hasMore, list: filteredJudgedArticles },
    ];
  }, [
    contest,
    filteredJudgedArticles.length,
    filteredNewArticles.length,
    hasMore,
    isImpersonatingJudge,
    isOwnerMode,
    onlyPendingReReview,
    ownerViewMode,
    pendingHasMore,
    searchQuery,
    t,
  ]);

  const activeTab = useMemo(() => {
    return listTabs.find((t) => t.id === listTab) || listTabs[0];
  }, [listTab, listTabs]);

  const searchPlaceholder =
    listTab === "rereview" ? t("feather-review-search-titles-submitter") : t("feather-review-search-titles");

  const workingList = useMemo(() => {
    return listTab === "rereview" ? filteredJudgedArticles : availableNewArticles;
  }, [availableNewArticles, filteredJudgedArticles, listTab]);

  const visibleRows = useMemo(() => {
    const tab = activeTab;
    if (tab.id !== "rereview") {
      const count = sidebarVisibleCounts[tab.key] || screenful(44);
      return tab.list.slice(0, count).map((article) => ({ article }));
    }
    const blocks = new Map<string, any[]>();
    for (const article of tab.list) {
      const decision = getMyLatestDecision(article) || "skipped";
      if (!blocks.has(decision)) blocks.set(decision, []);
      blocks.get(decision)!.push(article);
    }
    const rows: any[] = [];
    let budget = sidebarVisibleCounts.judged || 100;
    for (const [decision, articlesInBlock] of blocks) {
      rows.push({ heading: decision, count: articlesInBlock.length });
      if (collapsedDecisions[decision]) continue;
      for (const article of articlesInBlock) {
        if (budget <= 0) break;
        rows.push({ article, decision });
        budget -= 1;
      }
    }
    return rows;
  }, [activeTab, collapsedDecisions, getMyLatestDecision, sidebarVisibleCounts]);

  const rowArticles = useMemo(() => {
    return visibleRows.filter((r) => r.article).map((r) => r.article);
  }, [visibleRows]);

  const toggleDecision = (decision: string) => {
    setCollapsedDecisions((prev) => ({ ...prev, [decision]: !prev[decision] }));
  };

  const onListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 200) return;
    setSidebarVisibleCounts((prev) => ({
      ...prev,
      [activeTab.key]: Math.min((prev[activeTab.key] || screenful(44)) + LIST_STEP, activeTab.list.length),
    }));
    if (activeTab.id === "queue" && pendingHasMore && !isLoadingMore) {
      loadMoreArticles("pending");
    } else if (activeTab.id !== "queue" && hasMore && !isLoadingMore) {
      loadMoreArticles("all");
    }
  };

  // Bulk operations
  const setBulkSelection = (ids: number[]) => {
    setSelectedForBulk(ids);
    if (ids.length < 2) setBulkComment("");
  };

  const toggleBulkSelection = (article_id: number) => {
    const selected = selectedForBulk;
    setBulkSelection(
      selected.includes(article_id)
        ? selected.filter((id) => id !== article_id)
        : [...selected, article_id]
    );
    setBulkAnchorId(article_id);
    setBulkRangeIds([]);
  };

  const selectBulkRange = (article_id: number) => {
    const ids = visibleRows.filter((r) => r.article).map((r) => r.article.article_id);
    const from = ids.indexOf(bulkAnchorId as any);
    const to = ids.indexOf(article_id);
    if (from === -1 || to === -1) {
      toggleBulkSelection(article_id);
      return;
    }
    const range = ids.slice(Math.min(from, to), Math.max(from, to) + 1);
    const kept = selectedForBulk.filter((id) => !bulkRangeIds.includes(id));
    setBulkRangeIds(range);
    setBulkSelection([...new Set([...kept, ...range])]);
    window.getSelection()?.removeAllRanges();
  };

  const handleSelectClick = (article_id: number, e: React.MouseEvent) => {
    if (e.shiftKey) selectBulkRange(article_id);
    else toggleBulkSelection(article_id);
  };

  const handleRowClick = (article: any, e: React.MouseEvent) => {
    if (activeTab.id === "others") return;
    setFocusedArticleId(article.article_id);
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      handleSelectClick(article.article_id, e);
      return;
    }
    selectArticle(article);
  };

  const clearBulkSelection = () => {
    setBulkSelection([]);
    setBulkAnchorId(null);
    setBulkRangeIds([]);
  };

  // Decisions
  let decisionSeqRef = useRef(0);
  const rememberDecision = (article: any, decision: string, commentText: string) => {
    clearTimeout(undoExpiryTimerRef.current);
    setLastDecision({
      seq: ++decisionSeqRef.current,
      articleId: article.article_id,
      title: article.title,
      decision,
      comment: commentText,
    });
    undoExpiryTimerRef.current = setTimeout(() => {
      setLastDecision(null);
    }, UNDO_WINDOW_MS);
  };

  const dismissUndo = () => {
    clearTimeout(undoExpiryTimerRef.current);
    setLastDecision(null);
  };

  const undoLastDecision = async () => {
    const pending = lastDecision;
    if (!pending || isUndoing) return;
    setIsUndoing(true);
    setReviewError("");
    try {
      await undoArticleReview(pending.articleId);
      setArticles((prev) =>
        prev.map((article) =>
          article.article_id === pending.articleId
            ? {
                ...article,
                status: "pending",
                reviews: (article.reviews || []).filter((r: any) => r.reviewer !== myUsername),
              }
            : article
        )
      );
      setContest((prev) =>
        prev
          ? {
              ...prev,
              pending_articles: (prev.pending_articles || 0) + 1,
              accepted_articles:
                pending.decision === "accepted"
                  ? Math.max(0, (prev.accepted_articles || 1) - 1)
                  : prev.accepted_articles,
            }
          : prev
      );
      dismissUndo();
      const restored = articles.find((a) => a.article_id === pending.articleId);
      if (restored) {
        selectArticle(restored);
        setComment(pending.comment || "");
      }
    } catch (error: any) {
      setReviewError(error.message || "Undo failed");
    } finally {
      setIsUndoing(false);
    }
  };

  const handleDecision = async (decision: "accepted" | "rejected") => {
    if (!currentArticle || isSubmitting) return;
    if (isLockedByOther) {
      toast.error(t("feather-review-lock-banner", currentArticle.locked_by));
      return;
    }
    if (isSelfArticle) {
      toast.error(t("feather-review-coi-banner"));
      return;
    }
    clearInterval(lockHeartbeatTimerRef.current);
    setIsSubmitting(true);
    setSubmittingAction(decision);
    setReviewError("");
    const reviewedArticleId = currentArticle.article_id;
    const reviewedArticle = currentArticle;
    const reviewComment = comment;

    const previousQueueIndex = availableNewArticles.findIndex(
      (article) => article.article_id === reviewedArticleId
    );
    const nextInWorkingList =
      listTab === "queue"
        ? null
        : (() => {
            const list = workingList;
            const index = list.findIndex((a) => a.article_id === reviewedArticleId);
            return index >= 0 ? list[index + 1] || null : null;
          })();

    try {
      await reviewArticle(reviewedArticleId, decision, reviewComment);
      rememberDecision(reviewedArticle, decision, reviewComment);
      setComment("");

      const optimisticReview = {
        reviewer: myUsername,
        decision,
        comment: reviewComment,
        reviewed_at: new Date().toISOString(),
      };

      setArticles((prev) =>
        prev.map((article) =>
          article.article_id === reviewedArticleId
            ? {
                ...article,
                status: decision,
                re_review_requested: false,
                reviews: [...(article.reviews || []), optimisticReview],
              }
            : article
        )
      );

      setContest((prev) =>
        prev
          ? {
              ...prev,
              pending_articles: Math.max(0, (prev.pending_articles || 1) - 1),
              accepted_articles:
                decision === "accepted" ? (prev.accepted_articles || 0) + 1 : prev.accepted_articles,
            }
          : prev
      );

      if (listTab !== "queue") {
        if (nextInWorkingList) {
          selectArticle(nextInWorkingList);
        } else {
          setCurrentArticle(
            (prev: any) =>
              articles.find((a) => a.article_id === reviewedArticleId) || prev
          );
        }
      } else {
        const remaining = availableNewArticles.filter(
          (a) => a.article_id !== reviewedArticleId
        );
        const nextArticle = remaining.length
          ? remaining[Math.min(Math.max(previousQueueIndex, 0), remaining.length - 1)]
          : null;
        if (nextArticle) {
          selectArticle(nextArticle);
        } else {
          setCurrentArticle(null);
          setMobileTab("list");
        }
      }
    } catch (error: any) {
      console.error("Error submitting review", error);
      setReviewError(error.message || "Review failed");
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  const skipArticle = () => {
    if (!currentArticle) return;
    const previousArticleId = currentArticle.article_id;
    const list = workingList;
    if (list.length <= 1) return;
    const currentIndex = list.findIndex((a) => a.article_id === previousArticleId);
    const nextIndex = (currentIndex + 1) % list.length;
    apiReleaseLock(previousArticleId).catch(() => {});
    selectArticle(list[nextIndex]);
  };

  const handleRemove = async () => {
    if (!currentArticle || isSubmitting) return;
    if (!confirm(t("feather-review-remove-confirm", currentArticle.title))) return;
    setIsSubmitting(true);
    try {
      await deleteArticle(currentArticle.article_id);
      apiReleaseLock(currentArticle.article_id).catch(() => {});
      const removedId = currentArticle.article_id;
      setCurrentArticle(null);
      setMobileTab("list");
      setArticles((prev) => prev.filter((a) => a.article_id !== removedId));
      setContest((prev) =>
        prev
          ? {
              ...prev,
              total_articles: Math.max(0, (prev.total_articles || 1) - 1),
              pending_articles: Math.max(0, (prev.pending_articles || 1) - 1),
            }
          : prev
      );
    } catch (error) {
      console.error("Error removing article", error);
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  const handleBulkDecision = async (decision: "accepted" | "rejected") => {
    if (isSubmitting || !selectedForBulk.length) return;
    setIsSubmitting(true);
    const selectedIds = [...selectedForBulk];
    const currentWasSelected = selectedIds.includes(currentArticle?.article_id);
    const reviewComment = bulkComment.trim() || t("feather-review-bulk-default-comment");

    try {
      const { succeeded, failed } = await postBulkInChunks("/api/articles/bulk-review", selectedIds, {
        decision,
        comment: reviewComment,
      });

      setSelectedForBulk([]);
      setBulkComment("");

      const optimisticReview = {
        reviewer: myUsername,
        decision,
        comment: reviewComment,
        reviewed_at: new Date().toISOString(),
      };
      const decided = new Set(succeeded);
      setArticles((prev) =>
        prev.map((article) =>
          decided.has(article.article_id)
            ? { ...article, status: decision, reviews: [...(article.reviews || []), optimisticReview] }
            : article
        )
      );

      const advanceAfter = listTab === "queue";
      const currentWasSuccess = currentWasSelected && !failed.some((f) => f.article_id === currentArticle?.article_id);
      if (advanceAfter && currentWasSuccess) {
        const remaining = availableNewArticles.filter((a) => !decided.has(a.article_id));
        if (remaining.length > 0) {
          selectArticle(remaining[0]);
        } else {
          setCurrentArticle(null);
          setMobileTab("list");
        }
      }
    } catch (err) {
      console.error("Bulk review failed", err);
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  const handleBulkRemove = async () => {
    if (isSubmitting || !selectedForBulk.length) return;
    if (!confirm(t("feather-review-bulk-remove-confirm", n(selectedForBulk.length)))) return;
    setIsSubmitting(true);
    try {
      const selectedIds = [...selectedForBulk];
      const { failed } = await postBulkInChunks("/api/articles/bulk-delete", selectedIds);
      const failedIds = failed.map((item) => item.article_id);
      setSelectedForBulk(selectedIds.filter((id) => failedIds.includes(id)));
      setBulkComment("");
      const removedIds = new Set(selectedIds.filter((id) => !failedIds.includes(id)));
      setArticles((prev) => prev.filter((a) => !removedIds.has(a.article_id)));
      if (currentArticle && removedIds.has(currentArticle.article_id)) {
        setCurrentArticle(null);
        setMobileTab("list");
      }
    } catch (err) {
      console.error("Bulk remove failed", err);
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  // Keyboard navigation & Shortcuts
  const isTypingTarget = (target: any) => {
    if (!target) return false;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
  };

  const isInteractiveTarget = (el: any) => {
    if (!el || el === document.body) return false;
    const tag = el.tagName;
    return (
      tag === "BUTTON" ||
      tag === "A" ||
      tag === "INPUT" ||
      tag === "SELECT" ||
      tag === "TEXTAREA" ||
      tag === "SUMMARY" ||
      el.isContentEditable ||
      el.getAttribute?.("role") === "button"
    );
  };

  const applyCapturedKey = (rawKey: string) => {
    const key = normalizeShortcutKey(rawKey);
    if (!isBindableKey(key)) {
      setShortcutError(t("feather-review-shortcut-error-reserved"));
      return;
    }
    const clash = Object.entries(shortcuts).find(
      ([id, k]) => k === key && id !== capturingAction
    );
    if (clash) {
      const actionItem = SHORTCUT_ACTIONS.find((a) => a.id === clash[0]);
      setShortcutError(
        t(
          "feather-review-shortcut-error-clash",
          shortcutKeyLabel(key),
          actionItem ? t(actionItem.i18nKey) : clash[0]
        )
      );
      return;
    }
    if (capturingAction) {
      const updated = { ...shortcuts, [capturingAction]: key };
      setShortcuts(updated);
      persistShortcuts(updated);
    }
    setCapturingAction(null);
    setShortcutError("");
  };

  const handleShortcut = useCallback(
    (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        normalizeShortcutKey(event.key) === "a" &&
        !sidebarCollapsed &&
        !isTypingTarget(event.target) &&
        activeTab.id !== "others"
      ) {
        const ids = rowArticles.map((a) => a.article_id);
        if (ids.length) {
          const allSelected = ids.every((id) => selectedForBulk.includes(id));
          setBulkSelection(
            allSelected
              ? selectedForBulk.filter((id) => !ids.includes(id))
              : [...new Set([...selectedForBulk, ...ids])]
          );
          setBulkRangeIds([]);
        }
        event.preventDefault();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "Escape") {
        if (capturingAction) {
          cancelShortcutCapture();
          event.preventDefault();
        } else if (showShortcutHelp) {
          setShowShortcutHelp(false);
          event.preventDefault();
        } else if (isTypingTarget(event.target)) {
          (event.target as HTMLElement).blur();
        } else if (selectedForBulk.length) {
          clearBulkSelection();
          event.preventDefault();
        } else if (!sidebarCollapsed) {
          setSidebarCollapsed(true);
          event.preventDefault();
        }
        return;
      }

      if (capturingAction) {
        event.preventDefault();
        if (MODIFIER_KEYS.has(event.key)) return;
        if (!event.repeat) applyCapturedKey(event.key);
        return;
      }

      if (isTypingTarget(event.target)) return;

      if (event.key === "/" || event.key === "?") {
        setShowShortcutHelp((prev) => !prev);
        event.preventDefault();
        return;
      }
      if (showShortcutHelp) return;

      if (normalizeShortcutKey(event.key) === shortcuts.queue) {
        setSidebarCollapsed((prev) => !prev);
        event.preventDefault();
        return;
      }

      // Keyboard queue navigation
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"].includes(event.key)) {
        if (!rowArticles.length) return;
        event.preventDefault();
        const currentIndex = rowArticles.findIndex(
          (a) => a.article_id === (focusedArticleId || currentArticle?.article_id)
        );
        let nextIndex = currentIndex;
        if (event.key === "ArrowDown") {
          nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, rowArticles.length - 1);
        } else if (event.key === "ArrowUp") {
          nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
        } else if (event.key === "PageDown") {
          nextIndex = Math.min(currentIndex + 10, rowArticles.length - 1);
        } else if (event.key === "PageUp") {
          nextIndex = Math.max(currentIndex - 10, 0);
        } else if (event.key === "Home") {
          nextIndex = 0;
        } else if (event.key === "End") {
          nextIndex = rowArticles.length - 1;
        }
        const targetArticle = rowArticles[nextIndex];
        if (targetArticle) {
          setFocusedArticleId(targetArticle.article_id);
          if (event.shiftKey) {
            selectBulkRange(targetArticle.article_id);
          }
          clearTimeout(focusOpenTimerRef.current);
          focusOpenTimerRef.current = setTimeout(() => {
            selectArticle(targetArticle);
          }, 120);
          const el = document.getElementById(`rq-row-${targetArticle.article_id}`);
          el?.scrollIntoView({ block: "nearest" });
        }
        return;
      }

      if (event.key === "Enter" && focusedArticleId) {
        const targetArticle = rowArticles.find((a) => a.article_id === focusedArticleId);
        if (targetArticle) {
          event.preventDefault();
          selectArticle(targetArticle);
        }
        return;
      }

      if (event.key === " " && focusedArticleId && activeTab.id !== "others") {
        event.preventDefault();
        toggleBulkSelection(focusedArticleId);
        return;
      }

      if (!currentArticle || isSubmitting) return;

      const key = normalizeShortcutKey(event.key);
      if (heldKeysRef.current.has(key)) return;
      const action = SHORTCUT_ACTIONS.find((a) => shortcuts[a.id] === key)?.id;
      if (!action) return;

      if (ACTIVATION_KEYS.has(key) && isInteractiveTarget(document.activeElement)) return;
      heldKeysRef.current.add(key);
      event.preventDefault();

      switch (action) {
        case "accept":
          if (isLockedByOther) {
            toast.error(`${currentArticle.locked_by} is currently judging this article`);
            return;
          }
          if (isSelfArticle) {
            toast.error(t("feather-review-coi-banner"));
            return;
          }
          handleDecision("accepted");
          break;
        case "reject":
          if (isLockedByOther) {
            toast.error(t("feather-review-lock-banner", currentArticle.locked_by));
            return;
          }
          if (isSelfArticle) {
            toast.error(t("feather-review-coi-banner"));
            return;
          }
          handleDecision("rejected");
          break;
        case "skip":
          skipArticle();
          break;
        case "comment":
          commentBoxRef.current?.focus();
          break;
        case "undo":
          undoLastDecision();
          break;
        case "wikitext":
          toggleWikitext();
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeTab.id,
      capturingAction,
      currentArticle,
      isLockedByOther,
      isSelfArticle,
      isSubmitting,
      rowArticles,
      selectedForBulk,
      shortcuts,
      showShortcutHelp,
      sidebarCollapsed,
      t,
    ]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => handleShortcut(e);
    const onKeyUp = (e: KeyboardEvent) => heldKeysRef.current.delete(normalizeShortcutKey(e.key));
    const onBlur = () => heldKeysRef.current.clear();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      clearTimeout(undoExpiryTimerRef.current);
      clearTimeout(wikitextCopyTimerRef.current);
      clearTimeout(focusOpenTimerRef.current);
      clearInterval(lockHeartbeatTimerRef.current);
    };
  }, [handleShortcut]);

  useEffect(() => {
    return () => {
      clearInterval(lockHeartbeatTimerRef.current);
      if (currentArticle?.article_id) {
        apiReleaseLock(currentArticle.article_id).catch(() => {});
      }
    };
  }, [currentArticle?.article_id]);

  const juryList = contest?.juries || [];

  return (
    <div className={`rq-app ${isDark ? "rq-theme-dark" : "rq-theme-light"}`}>
      {!isLoading && userLoaded && !isAuthorized ? (
        <div className="rq-center-state rq-center-full">
          <div className="relative flex flex-col items-center justify-center p-8 sm:p-10 max-w-md w-full mx-4 rounded-2xl bg-card border border-destructive/30 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
              <CdxIcon className="rq-icon-large" icon={cdxIconBlock} />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base sm:text-lg font-bold text-foreground">Access Restricted</h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                This review console is reserved for designated Contest Jury members and Platform Owners.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href={`/contests/${code}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
              >
                Return to Contest Dashboard
              </Link>
            </div>
          </div>
        </div>
      ) : isLoading || (isBackgroundLoading && !currentArticle) ? (
        <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-background">
          <div className="flex-1 flex flex-row gap-0 p-2 min-h-0">
            {/* Left Drawer Skeleton */}
            <div className="w-[340px] shrink-0 border border-border/80 rounded-lg bg-card/60 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <Skeleton className="h-4 w-28 rounded" />
                </div>
                <Skeleton className="h-5 w-5 rounded-md" />
              </div>
              <div className="p-2 border-b border-border/60">
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
              <div className="flex border-b border-border/60 p-1 gap-1">
                <Skeleton className="h-7 flex-1 rounded" />
                <Skeleton className="h-7 flex-1 rounded" />
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-hidden">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded border border-border/40 bg-muted/20">
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-3/4 rounded" />
                      <Skeleton className="h-2.5 w-1/3 rounded" />
                    </div>
                    <Skeleton className="h-4 w-4 rounded-sm" />
                  </div>
                ))}
              </div>
            </div>

            <div className="w-1.5 bg-transparent" />

            {/* Right Review Area Skeleton */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <div className="flex-1 border border-border/80 rounded-lg bg-card flex flex-col overflow-hidden">
                <div className="px-4 py-2 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                  <Skeleton className="h-2 w-48 rounded-full" />
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
                <div className="p-4 border-b border-border flex items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-1/2 max-w-sm rounded" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-20 rounded" />
                      <Skeleton className="h-4 w-16 rounded" />
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-20 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
                <div className="flex-1 p-6 space-y-4 overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-3">
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="h-4 w-11/12 rounded" />
                      <Skeleton className="h-4 w-4/5 rounded" />
                      <div className="pt-3 space-y-2">
                        <Skeleton className="h-5 w-40 rounded" />
                        <Skeleton className="h-4 w-full rounded" />
                        <Skeleton className="h-4 w-5/6 rounded" />
                        <Skeleton className="h-4 w-3/4 rounded" />
                      </div>
                    </div>
                    <div className="hidden lg:block space-y-3 p-4 rounded-xl border border-border bg-muted/20 h-fit">
                      <Skeleton className="h-28 w-full rounded-lg" />
                      <Skeleton className="h-3.5 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                      <Skeleton className="h-3 w-2/3 rounded" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Decision Bar Skeleton */}
              <div className="h-[56px] border border-border/80 rounded-lg bg-card px-4 flex items-center justify-between gap-3">
                <Skeleton className="h-9 flex-1 rounded-lg" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-24 rounded-lg" />
                  <Skeleton className="h-9 w-24 rounded-lg" />
                  <Skeleton className="h-9 w-18 rounded-lg" />
                  <Skeleton className="h-9 w-18 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`rq-layout ${mobileTab === "review" ? "is-mobile-review" : ""}`}>
          {/* LEFT COLUMN: QUEUE */}
          <aside
            className={`rq-panel rq-queue-panel ${mobileTab !== "list" ? "mobile-hidden" : ""} ${
              sidebarCollapsed ? "is-collapsed" : ""
            } ${isResizing ? "is-resizing" : ""} ${selectedForBulk.length > 0 ? "has-bulk" : ""}`}
            style={{ "--rq-panel-w": `${panelWidth}px` } as React.CSSProperties}
          >
            <header className="rq-panel-header">
              <div className="rq-panel-titlebar">
                <Link
                  href={`/contests/${code}`}
                  className="rq-icon-btn"
                  title="Back to Contest Dashboard"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <span className="relative flex h-2 w-2 shrink-0" title="Live queue">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <h2 className="rq-panel-title">{t("feather-review-queue-title")}</h2>
                <div className="rq-titlebar-actions">
                  {isOwner && (
                    <button
                      className={`rq-icon-btn ${showQueueOptions ? "is-active" : ""}`}
                      type="button"
                      aria-expanded={showQueueOptions ? "true" : "false"}
                      title={t("feather-review-queue-options")}
                      onClick={() => setShowQueueOptions(!showQueueOptions)}
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    className="rq-icon-btn rq-desktop-only"
                    title={t("feather-review-collapse-drawer")}
                    onClick={() => setSidebarCollapsed(true)}
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Queue Options disclosure */}
              {showQueueOptions && isOwner && (
                <div className="rq-queue-options">
                  <div className="rq-owner-switcher">
                    <span className="rq-owner-switcher-label">{t("feather-review-view-as")}</span>
                    <div className="rq-owner-mode-buttons">
                      <button
                        type="button"
                        className={ownerViewMode === "judge" ? "is-active" : ""}
                        onClick={() => setOwnerViewMode("judge")}
                      >
                        {t("feather-review-view-judge")}
                      </button>
                      <button
                        type="button"
                        className={ownerViewMode === "owner" ? "is-active" : ""}
                        onClick={() => setOwnerViewMode("owner")}
                      >
                        {t("feather-review-view-owner")}
                      </button>
                    </div>
                    {ownerViewMode === "judge" && (
                      <select
                        value={selectedJudge}
                        onChange={(e) => setSelectedJudge(e.target.value)}
                        className="rq-owner-judge-select"
                        aria-label={t("feather-review-select-judge")}
                      >
                        {juryList.map((j) => (
                          <option key={j} value={j}>
                            {j}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* Search box with start icon and clear button */}
              <div className="relative w-full my-1.5">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-8 pl-8 pr-7 text-xs rounded-md bg-muted/40 border border-border/80 text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                  aria-label={searchPlaceholder}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-sm transition-colors"
                    aria-label={t("feather-review-bulk-clear")}
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/40 text-xs font-medium" role="tablist" aria-label={t("feather-review-queue-title")}>
                {listTabs.map((tab) => {
                  const isActive = activeTab.id === tab.id;
                  const isReReviewTab = tab.id === "rereview";
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive ? "true" : "false"}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs transition-all ${
                        isActive
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
                      }`}
                      onClick={() => setListTab(tab.id as any)}
                    >
                      <span className="truncate">{tab.label}</span>
                      {isReReviewTab && pendingReReviewCount > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-amber-950 dark:bg-amber-500 dark:text-amber-950 leading-none shrink-0 animate-pulse"
                          title={t("feather-rereview-badge")}
                        >
                          {n(pendingReReviewCount)}
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                          isActive
                            ? "bg-primary/10 text-primary font-bold dark:bg-primary/20"
                            : "bg-muted/80 text-muted-foreground"
                        }`}
                      >
                        {n(tab.count)}{tab.id !== "queue" && tab.hasMore ? "+" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick filter for pending re-reviews */}
              {activeTab.id === "rereview" && pendingReReviewCount > 0 && (
                <div className="pt-2 px-0.5">
                  <button
                    type="button"
                    onClick={() => setOnlyPendingReReview(!onlyPendingReReview)}
                    className={`w-full py-1 px-2.5 rounded-md text-[11px] flex items-center justify-between gap-1.5 font-medium transition-all cursor-pointer ${
                      onlyPendingReReview
                        ? "bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/50 font-bold"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border/40"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className={`h-3 w-3 ${onlyPendingReReview ? "animate-spin text-amber-600 dark:text-amber-400" : ""}`} />
                      <span>{t("feather-filter-only-rereviews", n(pendingReReviewCount))}</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                      {onlyPendingReReview ? t("feather-review-filter-active") : t("feather-review-filter-action")}
                    </span>
                  </button>
                </div>
              )}
            </header>

            {/* Bulk Action Bar */}
            {selectedForBulk.length > 0 && (
              <div className="rq-bulk-bar">
                <div className="rq-bulk-banner">
                  <span className="rq-bulk-count">{t("feather-review-bulk-selected", n(selectedForBulk.length))}</span>
                  <div className="rq-bulk-actions">
                    <button
                      type="button"
                      className="rq-bbtn rq-bbtn-accept"
                      onClick={() => handleBulkDecision("accepted")}
                      title={t("feather-review-bulk-accept", n(selectedForBulk.length))}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      className="rq-bbtn rq-bbtn-reject"
                      onClick={() => handleBulkDecision("rejected")}
                      title={t("feather-review-bulk-reject", n(selectedForBulk.length))}
                    >
                      <XCircle className="h-3.5 w-3.5 stroke-[2.2]" />
                    </button>
                    <button
                      type="button"
                      className="rq-bbtn rq-bbtn-remove"
                      onClick={handleBulkRemove}
                      title={t("feather-review-bulk-delete", n(selectedForBulk.length))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {selectedForBulk.length > 1 && (
                  <div className="rq-bulk-comment-panel">
                    <textarea
                      value={bulkComment}
                      onChange={(e) => setBulkComment(e.target.value)}
                      className="rq-input rq-bulk-comment-input"
                      rows={1}
                      placeholder={t("feather-review-bulk-note-placeholder")}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Scrollable list */}
            <div
              className="rq-panel-scroll"
              role="tabpanel"
              aria-label={activeTab.label}
              onScroll={onListScroll}
            >
              <ul
                className="rq-list"
                role="listbox"
                tabIndex={0}
                aria-multiselectable="true"
                aria-label="Articles"
                aria-activedescendant={focusedArticleId ? `rq-row-${focusedArticleId}` : undefined}
              >
                {visibleRows.map((row: any) => {
                  if (row.heading) {
                    return (
                      <li
                        key={`heading-${row.heading}`}
                        role="presentation"
                        className={`rq-decision-head is-${row.heading}`}
                      >
                        <button
                          type="button"
                          className="rq-decision-toggle"
                          aria-expanded={collapsedDecisions[row.heading] ? "false" : "true"}
                          onClick={() => toggleDecision(row.heading)}
                        >
                          <CdxIcon
                            icon={cdxIconDownTriangle}
                            className={`rq-decision-chevron ${
                              collapsedDecisions[row.heading] ? "is-collapsed" : ""
                            }`}
                          />
                          {getDecisionLabel(row.heading)}
                          <span className="rq-decision-count">{n(row.count)}</span>
                        </button>
                      </li>
                    );
                  }
                  const article = row.article;
                  const isSelected = selectedForBulk.includes(article.article_id);
                  const isCurrent =
                    currentArticle?.article_id === article.article_id && activeTab.id !== "others";
                  const isFocused = article.article_id === focusedArticleId;
                  const isLocked =
                    activeTab.id === "queue" &&
                    article.locked_by &&
                    article.locked_by !== myUsername;

                  return (
                    <li
                      key={`row-${article.article_id}`}
                      id={`rq-row-${article.article_id}`}
                      role="option"
                      aria-selected={isSelected ? "true" : "false"}
                      aria-current={isCurrent ? "true" : undefined}
                      className={`rq-list-item ${
                        activeTab.id === "queue" ? "rq-item-pending" : ""
                      } ${activeTab.id === "others" ? "rq-item-readonly" : ""} ${
                        row.decision ? "rq-item-" + row.decision : ""
                      } ${isCurrent ? "is-active" : ""} ${isFocused ? "is-focused" : ""} ${
                        isLocked ? "is-locked" : ""
                      }`}
                      onClick={(e) => handleRowClick(article, e)}
                    >
                      {activeTab.id !== "others" && (
                        <label className="rq-cb-wrapper" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={article.title}
                            checked={isSelected}
                            onChange={(e) => handleSelectClick(article.article_id, e as any)}
                            className="rq-cb"
                          />
                        </label>
                      )}
                      <div className="rq-item-content">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="rq-item-title">{article.title}</span>
                          {article.re_review_requested && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0">
                              <RefreshCw className="h-2.5 w-2.5" />
                              <span>{t("feather-review-tab-rereview")}</span>
                            </span>
                          )}
                        </div>
                        {(activeTab.id === "others" || !isSingleSubmitter) && (
                          <span className="rq-item-meta">
                            {activeTab.id === "others"
                              ? article.reviews?.map((r: any) => r.reviewer).join(", ")
                              : article.submitted_by}
                          </span>
                        )}
                      </div>
                      {isLocked && (
                        <CdxIcon
                          icon={cdxIconLock}
                          className="rq-icon-lock"
                          title={t("feather-review-locked-reviewing", article.locked_by || "")}
                        />
                      )}
                    </li>
                  );
                })}

                {!activeTab.list.length && (
                  <li role="presentation" className="rq-list-empty">
                    {activeTab.id === "queue" && !searchQuery && (
                      <CdxIcon icon={cdxIconArticleCheck} className="rq-empty-icon" />
                    )}
                    {searchQuery ? (
                      <span>{t("feather-review-empty-search", searchQuery)}</span>
                    ) : activeTab.id === "queue" ? (
                      <span>{t("feather-review-empty-queue")}</span>
                    ) : activeTab.id === "rereview" ? (
                      <span>{t("feather-review-empty-rereview")}</span>
                    ) : (
                      <span>{t("feather-review-empty-others")}</span>
                    )}
                  </li>
                )}

                {isBackgroundLoading && (
                  <li role="presentation" className="rq-list-loading">
                    {t("feather-review-loading-more")}
                  </li>
                )}
              </ul>
            </div>
          </aside>

          {/* Resize handle */}
          {!sidebarCollapsed && (
            <div
              className={`rq-resize-handle rq-desktop-only ${isResizing ? "is-resizing" : ""}`}
              role="separator"
              aria-orientation="vertical"
              aria-label={t("feather-review-resize-handle")}
              aria-valuenow={panelWidth}
              aria-valuemin={260}
              aria-valuemax={640}
              tabIndex={0}
              onPointerDown={startResize}
              onDoubleClick={resetPanelWidth}
            />
          )}

          {/* CENTER AREA (Preview + Decision) */}
          <div className={`rq-review-area ${mobileTab !== "review" ? "mobile-hidden" : ""}`}>
            {!currentArticle ? (
              <div className="rq-center-state rq-center-full rq-panel">
                <div className="rq-card-done">
                  <div className="rq-done-icon">
                    <CdxIcon icon={cdxIconArticleCheck} />
                  </div>
                  {availableNewArticles.length ? (
                    <>
                      <h3>{t("feather-review-empty-open-title")}</h3>
                      <p>
                        {t("feather-review-empty-open-desc", n(availableNewArticles.length))}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3>{t("feather-review-queue-clear-title")}</h3>
                      <p>{t("feather-review-queue-clear-desc")}</p>
                    </>
                  )}
                  <button
                    className="rq-btn-secondary"
                    onClick={() => setSidebarCollapsed(false)}
                    style={{ marginTop: "16px" }}
                  >
                    <PanelLeftOpen className="h-4 w-4 me-1.5 inline" /> {t("feather-review-open-sidebar")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* PREVIEW (Top) */}
                <main className="rq-panel rq-preview-panel">
                  <div className="rq-flow-stats">
                    <div
                      className="rq-progress"
                      role="progressbar"
                      aria-valuenow={judgedPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={t("feather-review-progress-flow", n(judgedCount), n(judgeableTotal), n(judgedPercent))}
                    >
                      <div className="rq-progress-track">
                        <div className="rq-progress-fill" style={{ width: `${judgedPercent}%` }}></div>
                      </div>
                      <span className="rq-progress-text">
                        {t("feather-review-progress-flow", n(judgedCount), n(judgeableTotal), n(judgedPercent))}
                      </span>
                    </div>
                  </div>

                  <header className="rq-article-header">
                    {/* Sidebar Toggle (Desktop) */}
                    {sidebarCollapsed && (
                      <button
                        className="rq-hamburger-btn rq-desktop-only"
                        onClick={() => setSidebarCollapsed(false)}
                        title={`${t("feather-review-expand-sidebar")} (Q)`}
                      >
                        <PanelLeftOpen className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      className="rq-back-btn rq-mobile-only"
                      onClick={() => setMobileTab("list")}
                      title={t("feather-review-back-to-queue")}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    <div className="rq-article-meta-area">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <a
                          href={articleUrl(currentArticle.title)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rq-article-title-link"
                          title={currentArticle.title}
                        >
                          {currentArticle.title}
                        </a>
                        <button
                          type="button"
                          className="rq-icon-btn"
                          style={{ padding: "3px", width: "24px", height: "24px" }}
                          title={t("feather-review-copy-title")}
                          onClick={() => {
                            navigator.clipboard.writeText(currentArticle.title);
                            toast.success(t("feather-review-title-copied"));
                          }}
                        >
                          <CdxIcon icon={cdxIconCopy} size={14} />
                        </button>
                      </div>
                      <div className="rq-tags">
                        <span className="rq-tag inline-flex items-center gap-1">
                          <span>{t("feather-review-by-author", currentArticle.submitted_by)}</span>
                          <UserBadge username={currentArticle.submitted_by} contestRoles={contestRoles} />
                        </span>
                        {currentArticle.wiki_creator &&
                          currentArticle.wiki_creator.toLowerCase() ===
                            currentArticle.submitted_by.toLowerCase() && (
                            <span
                              className="rq-tag inline-flex items-center gap-1"
                              style={{
                                color: "var(--rq-success)",
                                borderColor: "var(--rq-success)",
                              }}
                            >
                              <Check className="h-3 w-3 inline" />
                              <span>{t("feather-review-creator-badge")}</span>
                            </span>
                          )}
                        {showWords && currentArticle.word_count > 0 && (
                          <span className="rq-tag">
                            {t("feather-review-preview-words", n(currentArticle.word_count))}
                          </span>
                        )}
                        {showBytes && currentArticle.byte_count > 0 && (
                          <span className="rq-tag">
                            {t("feather-review-preview-bytes", n(currentArticle.byte_count))}
                          </span>
                        )}
                        {currentArticle.wiki_creation_date && (
                          <span className="rq-tag rq-tag-date">
                            {formatDateDayFirst(currentArticle.wiki_creation_date)}
                          </span>
                        )}
                        {currentArticle.locked_by && currentArticle.locked_by !== myUsername && (
                          <span className="rq-tag rq-tag-locked">
                            <CdxIcon icon={cdxIconLock} /> {t("feather-review-locked-reviewing", currentArticle.locked_by)}
                          </span>
                        )}
                        {getMyLatestDecision(currentArticle) && (
                          <span
                            className={`rq-tag rq-tag-verdict rq-tag-${getMyLatestDecision(
                              currentArticle
                            )} inline-flex items-center gap-1`}
                          >
                            {getMyLatestDecision(currentArticle) === "accepted" ? (
                              <>
                                <Check className="h-3 w-3 inline" />
                                <span>{t("feather-review-status-accepted")}</span>
                              </>
                            ) : getMyLatestDecision(currentArticle) === "rejected" ? (
                              <>
                                <X className="h-3 w-3 inline" />
                                <span>{t("feather-review-status-rejected")}</span>
                              </>
                            ) : (
                              <>
                                <SkipForward className="h-3 w-3 inline" />
                                <span>{t("feather-review-status-skipped")}</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rq-header-tools">
                      <Link
                        href={`/contests/${code}/jury`}
                        className="rq-btn-secondary rq-desktop-only"
                        title={t("feather-jury-hub-title")}
                      >
                        {t("feather-jury-hub-title")}
                      </Link>

                      <button
                        type="button"
                        className="rq-btn-secondary"
                        title={isDark ? t("feather-review-switch-light") : t("feather-review-switch-dark")}
                        aria-label={t("feather-theme-toggle") || "Toggle theme"}
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                      >
                        {isDark ? (
                          <Sun className="h-3.5 w-3.5 text-amber-400" />
                        ) : (
                          <Moon className="h-3.5 w-3.5 text-blue-500" />
                        )}
                      </button>

                      <button
                        type="button"
                        className={`rq-wikitext-switch ${showWikitext ? "is-on" : ""}`}
                        role="switch"
                        aria-checked={showWikitext ? "true" : "false"}
                        title={`${t("feather-review-wikitext")} (${shortcutKeyLabel(shortcuts.wikitext)})`}
                        onClick={toggleWikitext}
                      >
                        <span className="rq-switch-label">{t("feather-review-wikitext")}</span>
                        <span className="rq-switch-track">
                          <span className="rq-switch-knob"></span>
                        </span>
                      </button>

                      <button
                        type="button"
                        className="rq-btn-secondary inline-flex items-center gap-1.5 cursor-pointer relative"
                        title={t("feather-review-discussion")}
                        onClick={() => setIsDiscussionOpen(true)}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="rq-desktop-only">{t("feather-review-discussion")}</span>
                        {currentArticle?.re_review_requested && (
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </button>

                      <button
                        type="button"
                        className="rq-btn-secondary rq-help-btn rq-desktop-only"
                        title={`${t("feather-review-shortcuts-title")} (/)`}
                        aria-label={t("feather-review-shortcuts-title")}
                        onClick={() => setShowShortcutHelp(true)}
                      >
                        ?
                      </button>

                      <a
                        href={articleUrl(currentArticle.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rq-btn-secondary rq-wiki-link-btn"
                        title={t("feather-review-open-wiki") || t("feather-review-wiki")}
                      >
                        <CdxIcon icon={cdxIconLinkExternal} />{" "}
                        <span className="rq-desktop-only">{t("feather-review-wiki")}</span>
                      </a>
                    </div>
                  </header>

                  {/* Active Review Lock Notice Banner */}
                  {isLockedByOther && (
                    <div className="rq-lock-banner" role="alert">
                      <CdxIcon icon={cdxIconLock} className="h-4 w-4 shrink-0 text-amber-500 animate-pulse" />
                      <span>
                        {t("feather-review-lock-banner", currentArticle.locked_by)}
                      </span>
                    </div>
                  )}

                  {/* Conflict of Interest (COI) Notice Banner */}
                  {isSelfArticle && (
                    <div className="rq-coi-banner" role="alert">
                      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                      <span>
                        {t("feather-review-coi-banner")}
                      </span>
                    </div>
                  )}

                  {/* Author Re-review Request Notice Banner */}
                  {currentArticle?.re_review_requested && (
                    <div className="rq-rereview-banner flex items-center justify-between gap-3 p-2.5 px-4 bg-amber-500/15 border-b border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-amber-900 dark:text-amber-200">
                              {t("feather-rereview-banner-title")}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono">
                              {t("feather-review-preview-words", n(currentArticle.word_count || 0))} · {t("feather-review-preview-bytes", n(currentArticle.byte_count || 0))}
                            </span>
                          </div>
                          <p className="italic text-[11px] text-amber-900/90 dark:text-amber-300/90 break-words line-clamp-1">
                            &ldquo;{currentArticle.re_review_note || "Please re-evaluate my submission."}&rdquo;
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDiscussionOpen(true)}
                        className="px-2.5 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded cursor-pointer shrink-0 transition-colors flex items-center gap-1.5"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>{t("feather-open-discussion")}</span>
                      </button>
                    </div>
                  )}

                  {/* Mobile pane tabs */}
                  {showWikitext && (
                    <div className="rq-pane-tabs rq-mobile-only">
                      <button
                        type="button"
                        className={previewPane === "visual" ? "is-active" : ""}
                        onClick={() => setPreviewPane("visual")}
                      >
                        {t("feather-review-visual")}
                      </button>
                      <button
                        type="button"
                        className={previewPane === "wikitext" ? "is-active" : ""}
                        onClick={() => setPreviewPane("wikitext")}
                      >
                        {t("feather-review-wikitext")}
                      </button>
                    </div>
                  )}

                  <div
                    className={`rq-preview-container ${
                      showWikitext ? "is-split is-showing-" + previewPane : ""
                    }`}
                  >
                    {isLoadingPreview ? (
                      <div className="h-full w-full p-6 sm:p-8 overflow-hidden bg-background/50 relative select-none">
                        {/* Floating Status Pill */}
                        <div className="absolute top-6 right-6 z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card/90 border border-border shadow-md backdrop-blur-md text-xs font-medium text-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                          <span>{t("feather-review-rendering")}</span>
                        </div>

                        {/* Article Header Wireframe */}
                        <div className="space-y-4 max-w-3xl">
                          <div className="h-8 w-2/3 bg-muted/70 rounded-md animate-pulse" />
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-28 bg-muted/50 rounded-sm animate-pulse" />
                            <div className="h-4 w-16 bg-muted/40 rounded-sm animate-pulse" />
                          </div>
                          <div className="h-px w-full bg-border/60 my-3" />

                          {/* Grid with Content + Simulated Infobox */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                            <div className="lg:col-span-2 space-y-3">
                              <div className="h-3.5 w-full bg-muted/60 rounded animate-pulse" />
                              <div className="h-3.5 w-11/12 bg-muted/60 rounded animate-pulse" />
                              <div className="h-3.5 w-4/5 bg-muted/50 rounded animate-pulse" />
                              <div className="h-3.5 w-full bg-muted/60 rounded animate-pulse pt-2" />
                              <div className="h-3.5 w-3/4 bg-muted/50 rounded animate-pulse" />
                              <div className="h-5 w-40 bg-muted/70 rounded mt-6 mb-2 animate-pulse" />
                              <div className="h-3.5 w-full bg-muted/60 rounded animate-pulse" />
                              <div className="h-3.5 w-5/6 bg-muted/60 rounded animate-pulse" />
                            </div>
                            <div className="hidden lg:block space-y-3 p-4 rounded-xl border border-border/80 bg-muted/20">
                              <div className="h-28 w-full bg-muted/40 rounded-lg animate-pulse" />
                              <div className="h-3 w-3/4 bg-muted/50 rounded" />
                              <div className="h-3 w-1/2 bg-muted/40 rounded" />
                              <div className="h-3 w-2/3 bg-muted/40 rounded" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="rq-preview-pane rq-visual-pane">
                          <iframe
                            className="rq-wiki-iframe"
                            sandbox="allow-scripts"
                            srcDoc={previewSrcdoc}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        {showWikitext && (
                          <section
                            className="rq-preview-pane rq-wikitext-pane"
                            aria-label={t("feather-review-raw-wikitext")}
                          >
                            <header className="rq-wikitext-bar">
                              <span className="rq-wikitext-heading">{t("feather-review-raw-wikitext")}</span>
                              <button
                                type="button"
                                className="rq-wikitext-copy"
                                disabled={!wikitextSource}
                                onClick={copyWikitext}
                              >
                                <CdxIcon icon={cdxIconCopy} />{" "}
                                {wikitextCopied ? t("feather-review-copied") : t("feather-review-copy")}
                              </button>
                            </header>
                            <div className="rq-wikitext-scroll">
                              {wikitextSource ? (
                                <pre className="rq-wikitext-code">{wikitextSource}</pre>
                              ) : (
                                <p className="rq-wikitext-empty">{t("feather-review-wikitext-empty")}</p>
                              )}
                            </div>
                          </section>
                        )}
                      </>
                    )}
                  </div>
                </main>

                {/* DECISION PANEL (Bottom) */}
                <footer className="rq-panel rq-decision-panel">
                  <div className="rq-decision-body">
                    {reviewError && (
                      <div className="rq-error-msg flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                        <span className="flex-1 font-medium">{reviewError}</span>
                      </div>
                    )}
                    <div className="rq-decision-form">
                      <div className="rq-input-wrapper relative flex-1 min-w-0">
                        <MessageSquare className="h-4 w-4 text-muted-foreground/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          ref={commentBoxRef as any}
                          type="text"
                          className="rq-input pl-9"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          disabled={isSubmitting || isLockedByOther || isSelfArticle}
                          placeholder={
                            isLockedByOther
                              ? t("feather-review-placeholder-locked", currentArticle.locked_by)
                              : isSelfArticle
                              ? t("feather-review-placeholder-coi")
                              : t("feather-review-placeholder-note", shortcutKeyLabel(shortcuts.comment))
                          }
                        />
                      </div>

                      <div className="rq-actions-wrapper">
                        <div className="rq-primary-actions">
                          <button
                            type="button"
                            className="rq-btn rq-btn-accept"
                            disabled={isSubmitting || isLockedByOther || isSelfArticle}
                            onClick={() => handleDecision("accepted")}
                            title={
                              isLockedByOther
                                ? t("feather-review-placeholder-locked", currentArticle.locked_by)
                                : isSelfArticle
                                ? t("feather-review-placeholder-coi")
                                : `${t("feather-review-action-accept")} (${shortcutKeyLabel(shortcuts.accept)})`
                            }
                          >
                            {isSubmitting && submittingAction === "accepted" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 stroke-[2.5]" />
                            )}
                            <span>{t("feather-review-action-accept")}</span>
                            <kbd className="rq-kbd rq-desktop-only">
                              {shortcutKeyLabel(shortcuts.accept)}
                            </kbd>
                          </button>
                          <button
                            type="button"
                            className="rq-btn rq-btn-reject"
                            disabled={isSubmitting || isLockedByOther || isSelfArticle}
                            onClick={() => handleDecision("rejected")}
                            title={
                              isLockedByOther
                                ? t("feather-review-placeholder-locked", currentArticle.locked_by)
                                : isSelfArticle
                                ? t("feather-review-placeholder-coi")
                                : `${t("feather-review-action-reject")} (${shortcutKeyLabel(shortcuts.reject)})`
                            }
                          >
                            {isSubmitting && submittingAction === "rejected" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 stroke-[2.2]" />
                            )}
                            <span>{t("feather-review-action-reject")}</span>
                            <kbd className="rq-kbd rq-desktop-only">
                              {shortcutKeyLabel(shortcuts.reject)}
                            </kbd>
                          </button>
                        </div>

                        <div className="rq-secondary-actions">
                          <button
                            type="button"
                            className="rq-btn-ghost rq-btn-skip"
                            disabled={isSubmitting}
                            onClick={skipArticle}
                            title={`${t("feather-review-action-skip")} (${shortcutKeyLabel(shortcuts.skip)})`}
                          >
                            <SkipForward className="h-3.5 w-3.5" />{" "}
                            <span className="rq-desktop-only">{t("feather-review-action-skip")}</span>
                            <kbd className="rq-kbd rq-desktop-only">
                              {shortcutKeyLabel(shortcuts.skip)}
                            </kbd>
                          </button>
                          <button
                            type="button"
                            className="rq-btn-ghost rq-btn-remove"
                            disabled={isSubmitting}
                            onClick={handleRemove}
                            title={t("feather-review-action-delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />{" "}
                            <span className="rq-desktop-only">{t("feather-review-action-delete")}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </footer>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Nav Tabs */}
      <nav className="rq-mobile-nav">
        <button
          className={`rq-nav-btn ${mobileTab === "list" ? "is-active" : ""}`}
          onClick={() => setMobileTab("list")}
        >
          <CdxIcon icon={cdxIconMenu} className="rq-nav-icon" />
          <span className="rq-nav-label">{t("feather-review-tab-queue")}</span>
          {(contest?.pending_articles ?? newArticles.length) > 0 && (
            <span className="rq-nav-badge">
              {n(contest?.pending_articles ?? newArticles.length)}
            </span>
          )}
        </button>
        <button
          className={`rq-nav-btn ${mobileTab === "review" ? "is-active" : ""}`}
          onClick={() => setMobileTab("review")}
          disabled={!currentArticle}
        >
          <CdxIcon icon={cdxIconArticle} className="rq-nav-icon" />
          <span className="rq-nav-label">{t("feather-review-nav-review")}</span>
        </button>
      </nav>

      {/* Undo toast */}
      {lastDecision && (
        <div key={lastDecision.seq} className="rq-undo-toast" role="status">
          <span className="rq-undo-text">
            <strong className={`rq-undo-decision rq-undo-${lastDecision.decision}`}>
              {getDecisionLabel(lastDecision.decision)}
            </strong>
            <span className="rq-undo-title">{lastDecision.title}</span>
          </span>
          <button
            type="button"
            className="rq-undo-btn"
            disabled={isUndoing}
            onClick={undoLastDecision}
          >
            {isUndoing ? t("feather-review-undoing") : t("feather-review-undo")}{" "}
            <kbd className="rq-kbd">{shortcutKeyLabel(shortcuts.undo)}</kbd>
          </button>
          <button
            type="button"
            className="rq-undo-dismiss"
            aria-label={t("feather-review-undo-dismiss")}
            onClick={dismissUndo}
          >
            ×
          </button>
          <span
            className="rq-undo-progress"
            style={{ animationDuration: `${UNDO_WINDOW_MS}ms` }}
          />
        </div>
      )}

      {/* Keyboard shortcut reference modal */}
      {showShortcutHelp && (
        <div className="rq-help-backdrop" onClick={() => setShowShortcutHelp(false)}>
          <div
            className="rq-help-panel"
            role="dialog"
            aria-label={t("feather-review-shortcuts-title")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rq-help-header">
              <h3>{t("feather-review-shortcuts-title")}</h3>
              <button
                type="button"
                className="rq-help-close"
                aria-label={t("feather-review-shortcuts-close")}
                onClick={() => setShowShortcutHelp(false)}
              >
                ×
              </button>
            </div>
            <dl className="rq-help-list">
              {SHORTCUT_ACTIONS.map((action) => (
                <div key={action.id} className="rq-help-row">
                  <dt>
                    <button
                      type="button"
                      className={`rq-kbd rq-kbd-editable ${
                        capturingAction === action.id ? "is-capturing" : ""
                      }`}
                      aria-label={t("feather-review-rebind-change-key", t(action.i18nKey))}
                      onClick={() =>
                        capturingAction === action.id
                          ? cancelShortcutCapture()
                          : startShortcutCapture(action.id)
                      }
                    >
                      {capturingAction === action.id
                        ? "…"
                        : shortcutKeyLabel(shortcuts[action.id])}
                    </button>
                  </dt>
                  <dd className={capturingAction === action.id ? "is-capturing" : ""}>
                    {capturingAction === action.id
                      ? t("feather-review-rebind-prompt")
                      : t(action.i18nKey)}
                  </dd>
                </div>
              ))}
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">↑ ↓</kbd>
                </dt>
                <dd>{t("feather-review-shortcut-nav-up-down")}</dd>
              </div>
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">PgUp PgDn</kbd>
                </dt>
                <dd>{t("feather-review-shortcut-nav-page")}</dd>
              </div>
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">⇧ ↑ ↓</kbd>
                </dt>
                <dd>{t("feather-review-shortcut-select-move")}</dd>
              </div>
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">Space</kbd>
                </dt>
                <dd>{t("feather-review-shortcut-select-space")}</dd>
              </div>
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">Ctrl A</kbd>
                </dt>
                <dd>{t("feather-review-shortcut-select-all")}</dd>
              </div>
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">Enter</kbd>
                </dt>
                <dd>{t("feather-review-shortcut-open-enter")}</dd>
              </div>
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">Esc</kbd>
                </dt>
                <dd>{t("feather-review-shortcut-esc-desc")}</dd>
              </div>
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">/</kbd>
                </dt>
                <dd>{t("feather-review-shortcut-help-desc")}</dd>
              </div>
            </dl>
            {shortcutError && <p className="rq-help-error">{shortcutError}</p>}
            <div className="rq-help-footer">
              <p className="rq-help-note">
                {t("feather-review-shortcuts-note", myUsername || "this browser")}
              </p>
              <a
                className="rq-help-guide"
                href="https://github.com/RIFAT712/Feather/blob/main/docs/JURY_GUIDE.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("feather-review-shortcuts-guide")}
              </a>
              <button type="button" className="rq-help-reset" onClick={resetShortcuts}>
                {t("feather-review-shortcuts-reset")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Article Discussion & Re-Review Modal */}
      {isDiscussionOpen && (
        <ArticleDiscussionModal
          isOpen={isDiscussionOpen}
          onClose={() => setIsDiscussionOpen(false)}
          article={
            currentArticle
              ? ({
                  id: currentArticle.article_id,
                  title: currentArticle.title,
                  contest_id: contest?.id || 0,
                  submitter_id: 0,
                  submitter_username: currentArticle.submitted_by || currentArticle.submitter_username || "",
                  status: currentArticle.status,
                  word_count: currentArticle.word_count || 0,
                  byte_count: currentArticle.byte_count || 0,
                  submitted_at: currentArticle.submitted_at || "",
                  re_review_requested: currentArticle.re_review_requested,
                  re_review_note: currentArticle.re_review_note,
                  re_reviewed_at: currentArticle.re_reviewed_at,
                } as any)
              : null
          }
          contestCode={code}
          currentUsername={myUsername}
          isJuryOrOrganizer={true}
          contestRoles={contestRoles}
        />
      )}
    </div>
  );
}
