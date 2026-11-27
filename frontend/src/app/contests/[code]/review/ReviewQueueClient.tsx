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

const COLLAPSIBLE_JS = `
  (function() {
    function initNavFrames() {
      document.querySelectorAll('.NavFrame').forEach(function(frame) {
        var head = frame.querySelector('.NavHead');
        var content = frame.querySelector('.NavContent');
        if (!head || !content) return;
        content.style.display = 'none';
        var toggle = head.querySelector('.NavToggle a');
        if (!toggle) {
          var wrapper = document.createElement('span');
          wrapper.className = 'NavToggle';
          wrapper.style.cssText = 'float:right; font-weight:normal; font-size:smaller; padding-left: 8px;';
          toggle = document.createElement('a');
          toggle.href = '#';
          wrapper.appendChild(toggle);
          head.appendChild(wrapper);
        }
        toggle.textContent = '▶';
        head.style.cursor = 'pointer';
        head.addEventListener('click', function(e) {
          e.preventDefault();
          var hidden = content.style.display === 'none';
          content.style.display = hidden ? '' : 'none';
          toggle.textContent = hidden ? '▼' : '▶';
        });
      });
    }

    function initVsToggles() {
      document.querySelectorAll('.vsToggleElement').forEach(function(el) {
        var table = el.closest('table');
        if (!table) return;
        var anchor = el.querySelector('.NavToggle a');
        if (!anchor) {
          var wrapper = document.createElement('span');
          wrapper.className = 'NavToggle';
          wrapper.style.cssText = 'float:right; font-weight:normal; font-size:smaller; padding-left: 8px;';
          anchor = document.createElement('a');
          anchor.href = '#';
          wrapper.appendChild(anchor);
          el.appendChild(wrapper);
        }
        var shows = table.querySelectorAll('.vsShow');
        var hides = table.querySelectorAll('.vsHide');
        shows.forEach(function(r){ r.style.display = 'none'; });
        hides.forEach(function(r){ r.style.display = ''; });
        anchor.textContent = '▶';
        el.style.cursor = 'pointer';
        el.addEventListener('click', function(e) {
          e.preventDefault();
          var isExpanded = anchor.textContent.includes('▼');
          if (isExpanded) {
            shows.forEach(function(r){ r.style.display = 'none'; });
            hides.forEach(function(r){ r.style.display = ''; });
            anchor.textContent = '▶';
          } else {
            shows.forEach(function(r){ r.style.display = ''; });
            hides.forEach(function(r){ r.style.display = 'none'; });
            anchor.textContent = '▼';
          }
        });
      });
    }

    function initMwCollapsibles() {
      document.querySelectorAll('.mw-collapsible, table.collapsed, table.mw-collapsed').forEach(function(el) {
        var isTable = el.tagName === 'TABLE';
        var head = isTable ? el.querySelector('tr') : el.firstElementChild;
        if (!head) return;
        var toggler = el.querySelector('.mw-collapsible-toggle');
        if (!toggler) {
          toggler = document.createElement('span');
          toggler.className = 'mw-collapsible-toggle';
          toggler.style.cssText = 'float:right; cursor:pointer; user-select:none; font-size:smaller; padding-left:8px;';
          var th = head.querySelector('th') || head.querySelector('td') || head;
          if(th) th.appendChild(toggler);
        }
        toggler.textContent = '▶';
        if (isTable) {
          var rows = el.querySelectorAll('tr');
          rows.forEach(function(row, idx) { if (idx > 0) row.style.display = 'none'; });
        } else {
          var content = el.querySelector('.mw-collapsible-content');
          if (content) { content.style.display = 'none'; }
          else { Array.from(el.children).forEach(function(child, idx) { if (idx > 0) child.style.display = 'none'; }); }
        }
        head.style.cursor = 'pointer';
        head.addEventListener('click', function(e) {
          e.preventDefault();
          var isCollapsed = toggler.textContent.includes('▶');
          toggler.textContent = isCollapsed ? '▼' : '▶';
          if (isTable) {
            var rows = el.querySelectorAll('tr');
            rows.forEach(function(row, idx) { if (idx > 0) row.style.display = isCollapsed ? '' : 'none'; });
          } else {
            var content = el.querySelector('.mw-collapsible-content');
            if (content) { content.style.display = isCollapsed ? '' : 'none'; }
            else { Array.from(el.children).forEach(function(child, idx) { if (idx > 0) child.style.display = isCollapsed ? '' : 'none'; }); }
          }
        });
      });
    }

    document.addEventListener('DOMContentLoaded', function() {
      initNavFrames(); initVsToggles(); initMwCollapsibles();
    });
    if (document.readyState !== 'loading') {
      initNavFrames(); initVsToggles(); initMwCollapsibles();
    }
  })();
`;

const LIGHT_CSS = `
  :root { color-scheme: light; }
  html, body {
    background: #ffffff !important;
    color: #18181b !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", "Kalpurush", "SolaimanLipi", sans-serif !important;
    font-size: 15px;
    line-height: 1.75;
    margin: 0;
    padding: 16px 24px 48px;
    max-width: 900px;
  }
  a { color: #2563eb !important; text-decoration: none; }
  a:visited { color: #7c3aed !important; }
  a.new, a.new:visited { color: #dc2626 !important; }
  a:hover { text-decoration: underline; color: #1d4ed8 !important; }
  * { box-sizing: border-box; }
  table, .wikitable { border-collapse: collapse; background: #ffffff !important; color: #18181b !important; border-radius: 8px; margin: 1em 0; }
  th, td { border: 1px solid #e4e4e7 !important; padding: 7px 12px; color: #18181b !important; font-size: 14px; }
  th { background: #f4f4f5 !important; font-weight: 600; color: #18181b !important; text-align: left; }
  tr:nth-child(even) td { background: #fafafa !important; }
  .NavFrame { border: 1px solid #e4e4e7 !important; border-radius: 8px; background: #ffffff !important; margin: 12px 0; overflow: hidden; }
  .NavHead { background: #f4f4f5 !important; color: #18181b !important; padding: 6px 12px !important; cursor: pointer !important; font-weight: 600; }
  .NavContent { background: #ffffff !important; padding: 8px 12px; }
  .vsToggleElement[style*='background'], th[class~='vsToggleElement'] { background: #f4f4f5 !important; color: #18181b !important; }
  .mw-collapsible-toggle { cursor: pointer; color: #71717a !important; font-weight: 500; }
  h1, h2, h3, h4, h5 { color: #18181b !important; border-bottom: 1px solid #e4e4e7 !important; padding-bottom: 4px; margin-top: 1.2em; font-weight: 600; }
  #toc, .toc, .infobox { background: #f4f4f5 !important; border: 1px solid #e4e4e7 !important; border-radius: 8px; padding: 10px; margin: 1em 0; }
  .mw-editsection, .mw-editsection-bracket { display: none !important; }
  img { max-width: 100%; height: auto; }
`;

const DARK_CSS = `
  :root { color-scheme: dark; }
  html, body {
    background: #09090b !important;
    color: #e4e4e7 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", "Kalpurush", "SolaimanLipi", sans-serif !important;
    font-size: 15px;
    line-height: 1.75;
    margin: 0;
    padding: 16px 24px 48px;
    max-width: 900px;
  }
  a { color: #60a5fa !important; text-decoration: none; }
  a:visited { color: #c084fc !important; }
  a.new, a.new:visited { color: #f87171 !important; }
  a:hover { text-decoration: underline; color: #93c5fd !important; }
  * { box-sizing: border-box; }
  table, .wikitable { border-collapse: collapse; background: #18181b !important; color: #e4e4e7 !important; border-radius: 8px; margin: 1em 0; border: 1px solid rgba(255, 255, 255, 0.1) !important; }
  th, td { border: 1px solid rgba(255, 255, 255, 0.08) !important; padding: 7px 12px; color: #e4e4e7 !important; font-size: 14px; }
  th { background: #27272a !important; color: #fafafa !important; font-weight: 600; text-align: left; }
  tr:nth-child(even) td { background: #18181b !important; }
  .NavFrame { border: 1px solid rgba(255, 255, 255, 0.1) !important; border-radius: 8px; background: #18181b !important; margin: 12px 0; overflow: hidden; }
  .NavHead { background: #27272a !important; color: #fafafa !important; padding: 6px 12px !important; cursor: pointer !important; font-weight: 600; }
  .NavContent { background: #18181b !important; padding: 8px 12px; }
  .vsToggleElement[style*='background'], th[class~='vsToggleElement'] { background: #27272a !important; color: #fafafa !important; }
  .mw-collapsible-toggle { cursor: pointer; color: #a1a1aa !important; font-weight: 500; }
  h1, h2, h3, h4, h5 { color: #fafafa !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; padding-bottom: 4px; margin-top: 1.2em; font-weight: 600; }
  #toc, .toc, .infobox { background: #18181b !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; border-radius: 8px; padding: 10px; margin: 1em 0; color: #e4e4e7 !important; }
  .mw-editsection, .mw-editsection-bracket { display: none !important; }
  img { max-width: 100%; height: auto; }
`;

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

const DECISION_LABEL: Record<string, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
  skipped: "Skipped",
};

const DECISION_RANK: Record<string, number> = {
  accepted: 0,
  rejected: 1,
  skipped: 2,
};

const SHORTCUT_ACTIONS = [
  { id: "accept", label: "Accept the current article", default: "a" },
  { id: "reject", label: "Reject the current article", default: "r" },
  { id: "skip", label: "Skip to the next article without deciding", default: "s" },
  { id: "comment", label: "Focus the comment box", default: "c" },
  { id: "undo", label: "Undo the last decision", default: "u" },
  { id: "wikitext", label: "Show or hide the raw wikitext panel", default: "w" },
  { id: "queue", label: "Show or hide the queue drawer", default: "q" },
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
  const [hasMore, setHasMore] = useState<boolean>(() => Boolean(initialArticles?.has_more));
  const [nextCursor, setNextCursor] = useState<number | undefined>(() => initialArticles?.next_cursor);
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
          )}&format=json&prop=text%7Cwikitext&origin=*`
        );
        const data = await res.json();
        const body =
          data.parse?.text?.["*"] ?? '<p style="color:#94a3b8">Preview not available.</p>';
        if (requestId !== previewRequestIdRef.current) return;
        const wikitext = data.parse?.wikitext?.["*"] ?? "";
        setWikitextSource(wikitext);
        const css = isDark ? DARK_CSS : LIGHT_CSS;
        setPreviewSrcdoc(`<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8">
<base href="${base}/wiki/">
<style>${css}</style>
</head>
<body class="mw-body mw-parser-output">
${body}
<script>${COLLAPSIBLE_JS}<\/script>
</body>
</html>`);
      } catch (e) {
        console.error(e);
        if (requestId === previewRequestIdRef.current) {
          setPreviewSrcdoc(
            `<!DOCTYPE html><html><body style="color:#20364d;background:#f5f8fb;padding:24px">Error loading preview.</body></html>`
          );
        }
      } finally {
        if (requestId === previewRequestIdRef.current) setIsLoadingPreview(false);
      }
    },
    [contest?.wiki_url, isDark]
  );

  useEffect(() => {
    if (currentArticle?.title) {
      fetchPreview(currentArticle.title);
    }
  }, [isDark]);

  const getMyLatestDecision = useCallback(
    (article: any) => {
      if (!article || !article.reviews) return null;
      const myReviews = article.reviews.filter((r: any) => r.reviewer === myUsername);
      if (!myReviews.length) return null;
      return myReviews[myReviews.length - 1].decision || myReviews[myReviews.length - 1].status;
    },
    [myUsername]
  );

  const getMyLatestComment = useCallback(
    (article: any) => {
      if (!article || !article.reviews) return "";
      const myReviews = article.reviews.filter((r: any) => r.reviewer === myUsername);
      if (!myReviews.length) return "";
      return myReviews[myReviews.length - 1].comment || "";
    },
    [myUsername]
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
      setComment(getMyLatestComment(article));
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
        const aDataPromise: Promise<KeysetResponse> =
          initialArticles?.items && initialArticles.items.length > 0
            ? Promise.resolve(initialArticles)
            : fetchArticles(code, undefined, undefined, 500).catch(() => ({
                items: [],
                total: 0,
                has_more: false,
                next_cursor: undefined,
              }));

        const [cData, uData, aData] = await Promise.all([
          cDataPromise,
          uDataPromise,
          aDataPromise,
        ]);
        if (!active) return;
        if (cData) setContest(cData);
        if (uData) setUser(uData);
        const norm = (aData?.items || []).map(normalizeArticle);
        setArticles(norm);
        setHasMore(Boolean(aData?.has_more));
        setNextCursor(aData?.next_cursor);

        if (cData?.juries && cData.juries.length > 0) {
          setSelectedJudge(uData?.wiki_username || cData.juries[0]);
        }
      } catch (err) {
        console.error("Failed to load review data", err);
      } finally {
        if (active) {
          setUserLoaded(true);
          setIsLoading(false);
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
    const list = articles.filter(
      (a) =>
        a.status === "pending" &&
        !isOwnArticle(a) &&
        (!myUsername || !a.reviews.some((r: any) => r.reviewer === myUsername))
    );
    const jurySeed = fnv1a(`${contest?.id || code}_${user?.user_id || myUsername || "jury"}`);
    return seededShuffle(list, jurySeed);
  }, [articles, code, contest?.id, isOwnArticle, myUsername, user?.user_id]);

  const availableNewArticles = useMemo(() => {
    return newArticles.filter(
      (a) => !a.locked_by || (myUsername && a.locked_by.trim().toLowerCase() === myUsernameLower)
    );
  }, [newArticles, myUsername, myUsernameLower]);

  const judgedArticles = useMemo(() => {
    if (!myUsername) return [];
    return articles.filter((a) => {
      const isMine = a.reviews?.some((r: any) => r.reviewer === myUsername);
      const isPendingReReview = a.re_review_requested && !isOwnArticle(a);
      return isMine || isPendingReReview;
    });
  }, [articles, isOwnArticle, myUsername]);

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

  const judgeableTotal = statusStats.pending + statusStats.accepted + statusStats.rejected;
  const judgedCount = statusStats.accepted + statusStats.rejected;
  const judgedPercent = judgeableTotal ? Math.round((judgedCount / judgeableTotal) * 100) : 0;

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

  const loadMoreArticles = useCallback(async () => {
    if (isLoadingMore || !hasMore || !nextCursor) return;
    setIsLoadingMore(true);
    try {
      const res = await fetchArticles(code, nextCursor, undefined, 500);
      if (res?.items?.length) {
        const norm = res.items.map(normalizeArticle);
        setArticles((prev) => {
          const existingIds = new Set(prev.map((a) => a.article_id));
          const uniqueNew = norm.filter((a) => !existingIds.has(a.article_id));
          return [...prev, ...uniqueNew];
        });
      }
      setHasMore(Boolean(res?.has_more));
      setNextCursor(res?.next_cursor);
    } catch (err) {
      console.error("Failed to load more articles", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [code, hasMore, isLoadingMore, nextCursor]);

  const listTabs = useMemo(() => {
    const totalPendingCount =
      !searchQuery && contest?.pending_articles && contest.pending_articles > filteredNewArticles.length
        ? contest.pending_articles
        : filteredNewArticles.length;

    const tabs = [
      { id: "queue", key: "pending", label: "Queue", count: totalPendingCount, list: filteredNewArticles },
      { id: "rereview", key: "judged", label: "Re-review", count: filteredJudgedArticles.length, list: filteredJudgedArticles },
    ];
    if (otherReviewedArticles.length > 0) {
      tabs.push({ id: "others", key: "other", label: "Other judges", count: filteredOtherArticles.length, list: filteredOtherArticles });
    }
    return tabs;
  }, [
    contest?.pending_articles,
    filteredJudgedArticles.length,
    filteredNewArticles.length,
    filteredOtherArticles.length,
    otherReviewedArticles.length,
    searchQuery,
  ]);

  const activeTab = useMemo(() => {
    return listTabs.find((t) => t.id === listTab) || listTabs[0];
  }, [listTab, listTabs]);

  const searchPlaceholder =
    listTab === "rereview" ? "Search titles or submitter" : "Search titles";

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
    if (activeTab.id === "queue" && hasMore && !isLoadingMore) {
      loadMoreArticles();
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
    if (!confirm(`Remove "${currentArticle.title}" from this contest?`)) return;
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
    const reviewComment = bulkComment.trim() || "Bulk reviewed";

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
    if (!confirm(`Remove ${selectedForBulk.length} article(s) from the contest?`)) return;
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
      setShortcutError("Pick a single character, Enter or Space. Esc, Tab, / and ? are reserved.");
      return;
    }
    const clash = Object.entries(shortcuts).find(
      ([id, k]) => k === key && id !== capturingAction
    );
    if (clash) {
      const actionItem = SHORTCUT_ACTIONS.find((a) => a.id === clash[0]);
      setShortcutError(`"${shortcutKeyLabel(key)}" is already used for: ${actionItem?.label || clash[0]}.`);
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
                <h2 className="rq-panel-title">Review Queue</h2>
                <div className="rq-titlebar-actions">
                  {isOwner && (
                    <button
                      className={`rq-icon-btn ${showQueueOptions ? "is-active" : ""}`}
                      type="button"
                      aria-expanded={showQueueOptions ? "true" : "false"}
                      title="Queue options"
                      onClick={() => setShowQueueOptions(!showQueueOptions)}
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    className="rq-icon-btn rq-desktop-only"
                    title="Collapse sidebar (Q)"
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
                    <span className="rq-owner-switcher-label">View as</span>
                    <div className="rq-owner-mode-buttons">
                      <button
                        type="button"
                        className={ownerViewMode === "judge" ? "is-active" : ""}
                        onClick={() => setOwnerViewMode("judge")}
                      >
                        Judge
                      </button>
                      <button
                        type="button"
                        className={ownerViewMode === "owner" ? "is-active" : ""}
                        onClick={() => setOwnerViewMode("owner")}
                      >
                        Owner
                      </button>
                    </div>
                    {ownerViewMode === "judge" && (
                      <select
                        value={selectedJudge}
                        onChange={(e) => setSelectedJudge(e.target.value)}
                        className="rq-owner-judge-select"
                        aria-label="Choose jury member"
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
                    aria-label="Clear input"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/40 text-xs font-medium" role="tablist" aria-label="Queue lists">
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
                          {pendingReReviewCount}
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                          isActive
                            ? "bg-primary/10 text-primary font-bold dark:bg-primary/20"
                            : "bg-muted/80 text-muted-foreground"
                        }`}
                      >
                        {tab.count.toLocaleString()}
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
                      placeholder={`Comment on all ${selectedForBulk.length} (optional)`}
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
                          {DECISION_LABEL[row.heading] || row.heading}
                          <span className="rq-decision-count">{row.count.toLocaleString()}</span>
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
                            aria-label={`Select ${article.title}`}
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
                              <span>Re-review</span>
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
                          title="Being reviewed by someone"
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
                      <span>Nothing here matches &ldquo;{searchQuery}&rdquo;</span>
                    ) : activeTab.id === "queue" ? (
                      <span>All caught up</span>
                    ) : activeTab.id === "rereview" ? (
                      <span>Judge an article and it turns up here</span>
                    ) : (
                      <span>No decisions by other judges yet</span>
                    )}
                  </li>
                )}

                {isBackgroundLoading && (
                  <li role="presentation" className="rq-list-loading">
                    Loading more…
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
              aria-label="Resize the queue panel"
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
                      <h3>Nothing open</h3>
                      <p>
                        {availableNewArticles.length} article
                        {availableNewArticles.length === 1 ? "" : "s"} still waiting in your queue —
                        pick one from the sidebar to carry on.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3>Queue is Clear</h3>
                      <p>You have reviewed all available articles in your queue.</p>
                    </>
                  )}
                  <button
                    className="rq-btn-secondary"
                    onClick={() => setSidebarCollapsed(false)}
                    style={{ marginTop: "16px" }}
                  >
                    <PanelLeftOpen className="h-4 w-4 me-1.5 inline" /> Open Sidebar
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
                      aria-label={`${judgedCount} of ${judgeableTotal} judged`}
                    >
                      <div className="rq-progress-track">
                        <div className="rq-progress-fill" style={{ width: `${judgedPercent}%` }}></div>
                      </div>
                      <span className="rq-progress-text">
                        {judgedCount.toLocaleString()} of {judgeableTotal.toLocaleString()} judged ·{" "}
                        {judgedPercent}%
                      </span>
                    </div>
                  </div>

                  <header className="rq-article-header">
                    {/* Sidebar Toggle (Desktop) */}
                    {sidebarCollapsed && (
                      <button
                        className="rq-hamburger-btn rq-desktop-only"
                        onClick={() => setSidebarCollapsed(false)}
                        title="Expand sidebar (Q)"
                      >
                        <PanelLeftOpen className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      className="rq-back-btn rq-mobile-only"
                      onClick={() => setMobileTab("list")}
                      title="Back to article queue"
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
                          title="Copy article title"
                          onClick={() => {
                            navigator.clipboard.writeText(currentArticle.title);
                            toast.success("Article title copied!");
                          }}
                        >
                          <CdxIcon icon={cdxIconCopy} size={14} />
                        </button>
                      </div>
                      <div className="rq-tags">
                        <span className="rq-tag inline-flex items-center gap-1">
                          <span>by {currentArticle.submitted_by}</span>
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
                              <span>Creator</span>
                            </span>
                          )}
                        {showWords && currentArticle.word_count > 0 && (
                          <span className="rq-tag">
                            {currentArticle.word_count.toLocaleString()} words
                          </span>
                        )}
                        {showBytes && currentArticle.byte_count > 0 && (
                          <span className="rq-tag">
                            {currentArticle.byte_count.toLocaleString()} bytes
                          </span>
                        )}
                        {currentArticle.wiki_creation_date && (
                          <span className="rq-tag rq-tag-date">
                            {formatDateDayFirst(currentArticle.wiki_creation_date)}
                          </span>
                        )}
                        {currentArticle.locked_by && currentArticle.locked_by !== myUsername && (
                          <span className="rq-tag rq-tag-locked">
                            <CdxIcon icon={cdxIconLock} /> {currentArticle.locked_by} reviewing
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
                                <span>Accepted</span>
                              </>
                            ) : getMyLatestDecision(currentArticle) === "rejected" ? (
                              <>
                                <X className="h-3 w-3 inline" />
                                <span>Rejected</span>
                              </>
                            ) : (
                              <>
                                <SkipForward className="h-3 w-3 inline" />
                                <span>Skipped</span>
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
                        title="Jury Hub stats and queue redistribution"
                      >
                        Jury Hub
                      </Link>

                      <button
                        type="button"
                        className="rq-btn-secondary"
                        title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
                        aria-label="Toggle theme"
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
                        title={`Show raw wikitext (${shortcutKeyLabel(shortcuts.wikitext)})`}
                        onClick={toggleWikitext}
                      >
                        <span className="rq-switch-label">Wikitext</span>
                        <span className="rq-switch-track">
                          <span className="rq-switch-knob"></span>
                        </span>
                      </button>

                      <button
                        type="button"
                        className="rq-btn-secondary inline-flex items-center gap-1.5 cursor-pointer relative"
                        title="Open article discussion and re-review request thread"
                        onClick={() => setIsDiscussionOpen(true)}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="rq-desktop-only">Discussion</span>
                        {currentArticle?.re_review_requested && (
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </button>

                      <button
                        type="button"
                        className="rq-btn-secondary rq-help-btn rq-desktop-only"
                        title="Keyboard shortcuts (/)"
                        aria-label="Keyboard shortcuts"
                        onClick={() => setShowShortcutHelp(true)}
                      >
                        ?
                      </button>

                      <a
                        href={articleUrl(currentArticle.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rq-btn-secondary rq-wiki-link-btn"
                        title="Open on Wiki"
                      >
                        <CdxIcon icon={cdxIconLinkExternal} />{" "}
                        <span className="rq-desktop-only">Wiki</span>
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
                        Visual
                      </button>
                      <button
                        type="button"
                        className={previewPane === "wikitext" ? "is-active" : ""}
                        onClick={() => setPreviewPane("wikitext")}
                      >
                        Wikitext
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
                          <span>Rendering Wikipedia article...</span>
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
                            aria-label="Raw wikitext"
                          >
                            <header className="rq-wikitext-bar">
                              <span className="rq-wikitext-heading">Raw wikitext</span>
                              <button
                                type="button"
                                className="rq-wikitext-copy"
                                disabled={!wikitextSource}
                                onClick={copyWikitext}
                              >
                                <CdxIcon icon={cdxIconCopy} />{" "}
                                {wikitextCopied ? "Copied" : "Copy"}
                              </button>
                            </header>
                            <div className="rq-wikitext-scroll">
                              {wikitextSource ? (
                                <pre className="rq-wikitext-code">{wikitextSource}</pre>
                              ) : (
                                <p className="rq-wikitext-empty">Wikitext not available.</p>
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
                              ? `${currentArticle.locked_by} is currently judging this article...`
                              : isSelfArticle
                              ? "You cannot review your own article (Conflict of Interest)"
                              : "Leave a note for the submitter (optional)... (C)"
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
                                ? `${currentArticle.locked_by} is currently judging this article`
                                : isSelfArticle
                                ? "You cannot review your own article (Conflict of Interest)"
                                : "Accept (A)"
                            }
                          >
                            {isSubmitting && submittingAction === "accepted" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 stroke-[2.5]" />
                            )}
                            <span>Accept</span>
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
                                ? `${currentArticle.locked_by} is currently judging this article`
                                : isSelfArticle
                                ? "You cannot review your own article (Conflict of Interest)"
                                : "Reject (R)"
                            }
                          >
                            {isSubmitting && submittingAction === "rejected" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 stroke-[2.2]" />
                            )}
                            <span>Reject</span>
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
                            title="Skip (S)"
                          >
                            <SkipForward className="h-3.5 w-3.5" />{" "}
                            <span className="rq-desktop-only">Skip</span>
                            <kbd className="rq-kbd rq-desktop-only">
                              {shortcutKeyLabel(shortcuts.skip)}
                            </kbd>
                          </button>
                          <button
                            type="button"
                            className="rq-btn-ghost rq-btn-remove"
                            disabled={isSubmitting}
                            onClick={handleRemove}
                            title="Delete article"
                          >
                            <Trash2 className="h-3.5 w-3.5" />{" "}
                            <span className="rq-desktop-only">Delete</span>
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
          <span className="rq-nav-label">Queue</span>
          {(contest?.pending_articles ?? newArticles.length) > 0 && (
            <span className="rq-nav-badge">
              {(contest?.pending_articles ?? newArticles.length).toLocaleString()}
            </span>
          )}
        </button>
        <button
          className={`rq-nav-btn ${mobileTab === "review" ? "is-active" : ""}`}
          onClick={() => setMobileTab("review")}
          disabled={!currentArticle}
        >
          <CdxIcon icon={cdxIconArticle} className="rq-nav-icon" />
          <span className="rq-nav-label">Review</span>
        </button>
      </nav>

      {/* Undo toast */}
      {lastDecision && (
        <div key={lastDecision.seq} className="rq-undo-toast" role="status">
          <span className="rq-undo-text">
            <strong className={`rq-undo-decision rq-undo-${lastDecision.decision}`}>
              {lastDecision.decision}
            </strong>
            <span className="rq-undo-title">{lastDecision.title}</span>
          </span>
          <button
            type="button"
            className="rq-undo-btn"
            disabled={isUndoing}
            onClick={undoLastDecision}
          >
            {isUndoing ? "Undoing…" : "Undo"}{" "}
            <kbd className="rq-kbd">{shortcutKeyLabel(shortcuts.undo)}</kbd>
          </button>
          <button
            type="button"
            className="rq-undo-dismiss"
            aria-label="Dismiss"
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
            aria-label="Keyboard shortcuts"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rq-help-header">
              <h3>Keyboard shortcuts</h3>
              <button
                type="button"
                className="rq-help-close"
                aria-label="Close"
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
                      aria-label={`Change the key for: ${action.label}`}
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
                      ? "Press a letter, number, Enter or Space — Esc to cancel"
                      : action.label}
                  </dd>
                </div>
              ))}
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">↑ ↓</kbd>
                </dt>
                <dd>Move through the queue list and open what you land on</dd>
              </div>
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">PgUp PgDn</kbd>
                </dt>
                <dd>Jump ten rows at a time (Home / End for the ends)</dd>
              </div>
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">⇧ ↑ ↓</kbd>
                </dt>
                <dd>Select as you move, or unselect on the way back</dd>
              </div>
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">Space</kbd>
                </dt>
                <dd>Select or unselect the row you are on</dd>
              </div>
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">Ctrl A</kbd>
                </dt>
                <dd>Select every row on screen, or clear them</dd>
              </div>
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">Enter</kbd>
                </dt>
                <dd>Open the article you are on</dd>
              </div>
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">Esc</kbd>
                </dt>
                <dd>Leave the comment box / clear the selection / close the queue</dd>
              </div>
              <div className="rq-help-row">
                <dt>
                  <kbd className="rq-kbd">/</kbd>
                </dt>
                <dd>Show or hide this panel</dd>
              </div>
            </dl>
            {shortcutError && <p className="rq-help-error">{shortcutError}</p>}
            <div className="rq-help-footer">
              <p className="rq-help-note">
                Click a key to rebind it. Saved for {myUsername || "this browser"} only. Shortcuts
                are ignored while you&apos;re typing in a text field, and a held key acts once.
              </p>
              <a
                className="rq-help-guide"
                href="https://github.com/RIFAT712/Feather/blob/main/docs/JURY_GUIDE.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                Full jury panel guide
              </a>
              <button type="button" className="rq-help-reset" onClick={resetShortcuts}>
                Reset to defaults
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
