"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon, Feather, Loader2, Sparkles, BookOpen, Layers } from "lucide-react";
import { toast } from "sonner";
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
    color: #202122 !important;
    font-family: 'Linux Libertine', Georgia, Times, serif;
    font-size: 15px;
    line-height: 1.6;
    margin: 0;
    padding: 12px 18px 36px;
    max-width: 860px;
  }
  a { color: #3366cc !important; }
  a:visited { color: #6b4ba1 !important; }
  a.new, a.new:visited { color: #d73333 !important; }
  a:hover { text-decoration: underline; }
  * { background-color: unset !important; }
  table, .wikitable { border-collapse: collapse; background: #ffffff !important; color: #202122 !important; }
  th, td { border: 1px solid #eaecf0 !important; padding: 6px 10px; color: #202122 !important; }
  th { background: #f8f9fa !important; font-weight: 600; }
  tr:nth-child(even) td { background: #fcfdfe !important; }
  .NavFrame { border: 1px solid #eaecf0 !important; border-radius: 6px; background: #ffffff !important; margin: 12px 0; overflow: hidden; }
  .NavHead { background: #f8f9fa !important; color: #202122 !important; padding: 6px 10px !important; cursor: pointer !important; font-weight: 600; }
  .NavContent { background: #ffffff !important; }
  .vsToggleElement[style*='background'], th[class~='vsToggleElement'] { background: #f8f9fa !important; color: #202122 !important; }
  .mw-collapsible-toggle { cursor: pointer; color: #54595d !important; }
  h1, h2, h3, h4, h5 { color: #202122 !important; border-bottom: 1px solid #eaecf0 !important; padding-bottom: 4px; }
  #toc, .toc, .infobox { background: #f8f9fa !important; border: 1px solid #a2a9b1 !important; border-radius: 6px; }
  .mw-editsection, .mw-editsection-bracket { display: none !important; }
`;

const DARK_CSS = `
  :root { color-scheme: dark; }
  html, body {
    background: #111317 !important;
    color: #d1d5db !important;
    font-family: 'Linux Libertine', Georgia, Times, serif;
    font-size: 15px;
    line-height: 1.65;
    margin: 0;
    padding: 12px 18px 36px;
    max-width: 860px;
  }
  a { color: #6cb8ff !important; }
  a:visited { color: #b392f0 !important; }
  a.new, a.new:visited { color: #f87171 !important; }
  a:hover { text-decoration: underline; }
  * { background-color: unset !important; }
  table, .wikitable { border-collapse: collapse; background: #16191f !important; color: #d1d5db !important; }
  th, td { border: 1px solid #282c35 !important; padding: 6px 10px; color: #d1d5db !important; }
  th { background: #1d2128 !important; color: #e5e7eb !important; font-weight: 600; }
  tr:nth-child(even) td { background: #14161b !important; }
  .NavFrame { border: 1px solid #282c35 !important; border-radius: 6px; background: #16191f !important; margin: 12px 0; overflow: hidden; }
  .NavHead { background: #1d2128 !important; color: #e5e7eb !important; padding: 6px 10px !important; cursor: pointer !important; font-weight: 600; }
  .NavContent { background: #16191f !important; }
  .vsToggleElement[style*='background'], th[class~='vsToggleElement'] { background: #1d2128 !important; color: #e5e7eb !important; }
  .mw-collapsible-toggle { cursor: pointer; color: #9ca3af !important; }
  h1, h2, h3, h4, h5 { color: #e5e7eb !important; border-bottom: 1px solid #282c35 !important; padding-bottom: 4px; }
  #toc, .toc, .infobox { background: #16191f !important; border: 1px solid #282c35 !important; border-radius: 6px; color: #d1d5db !important; }
  .mw-editsection, .mw-editsection-bracket { display: none !important; }
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
    reviews: a.reviews || [],
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

  const [contest, setContest] = useState<Contest | null>(initialContest || null);
  const [user, setUser] = useState<UserSession | null>(initialUser || null);

  const [articles, setArticles] = useState<any[]>(() => {
    if (initialArticles?.items && initialArticles.items.length > 0) {
      return initialArticles.items.map(normalizeArticle);
    }
    return [];
  });
  const [currentArticle, setCurrentArticle] = useState<any | null>(null);
  const [comment, setComment] = useState("");
  const [bulkComment, setBulkComment] = useState("");
  const [isLoading, setIsLoading] = useState(() => {
    return !(initialContest && initialArticles?.items);
  });
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const commentBoxRef = useRef<HTMLTextAreaElement>(null);
  const previewRequestIdRef = useRef(0);
  const undoExpiryTimerRef = useRef<any>(null);
  const wikitextCopyTimerRef = useRef<any>(null);
  const focusOpenTimerRef = useRef<any>(null);
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

  const myUsername = (user?.wiki_username || "").trim();
  const myUsernameLower = myUsername.toLowerCase();
  const isOwner = Boolean(
    user?.role === "owner" ||
    (user as any)?.is_owner ||
    (user as any)?.is_admin ||
    user?.role === "admin" ||
    (contest?.created_by_username &&
      myUsernameLower &&
      contest.created_by_username.trim().toLowerCase() === myUsernameLower)
  );
  const isJury = Boolean(
    user?.role === "jury" ||
    (user as any)?.is_jury ||
    (contest?.juries &&
      myUsernameLower &&
      contest.juries.some(
        (j: string) => (j || "").trim().toLowerCase() === myUsernameLower
      ))
  );
  const isAuthorized = isJury || isOwner;

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
      if (!article) return;
      const canReReview = article?.reviews?.some((r: any) => r.reviewer === myUsername);
      if (article.status !== "pending" && !canReReview) return;

      awaitingFirstSelectionRef.current = false;
      setReviewError("");

      if (currentArticle?.article_id && currentArticle.article_id !== article.article_id) {
        apiReleaseLock(currentArticle.article_id).catch(() => {});
      }

      setCurrentArticle(article);
      setComment(getMyLatestComment(article));
      fetchPreview(article.title);
      acquireArticleLock(article.article_id).catch(() => {});
      setMobileTab("review");
    },
    [currentArticle?.article_id, fetchPreview, getMyLatestComment, myUsername]
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
        const aDataPromise =
          initialArticles?.items && initialArticles.items.length > 0
            ? Promise.resolve(initialArticles)
            : fetchArticles(code, undefined, undefined, 500).catch(() => ({ items: [], total: 0 }));

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

        if (cData?.juries && cData.juries.length > 0) {
          setSelectedJudge(uData?.wiki_username || cData.juries[0]);
        }
      } catch (err) {
        console.error("Failed to load review data", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [code, initialContest, initialUser]);

  // Available new articles
  const newArticles = useMemo(() => {
    if (!myUsername) return [];
    return articles.filter(
      (a) =>
        a.status === "pending" &&
        !(isJury && !isOwner && a.submitted_by === myUsername) &&
        !a.reviews.some((r: any) => r.reviewer === myUsername)
    );
  }, [articles, isJury, isOwner, myUsername]);

  const availableNewArticles = useMemo(() => {
    return newArticles.filter((a) => !a.locked_by || a.locked_by === myUsername);
  }, [newArticles, myUsername]);

  const judgedArticles = useMemo(() => {
    if (!myUsername) return [];
    return articles.filter((a) => a.reviews.some((r: any) => r.reviewer === myUsername));
  }, [articles, myUsername]);

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

  const filteredNewArticles = useMemo(() => forSidebar(newArticles), [forSidebar, newArticles]);
  const filteredJudgedArticles = useMemo(() => {
    const list = [...forSidebar(judgedArticles, true)];
    return list.sort((a, b) => {
      const ra = DECISION_RANK[getMyLatestDecision(a)] ?? 9;
      const rb = DECISION_RANK[getMyLatestDecision(b)] ?? 9;
      return ra - rb;
    });
  }, [forSidebar, getMyLatestDecision, judgedArticles]);

  const filteredOtherArticles = useMemo(
    () => forSidebar(otherReviewedArticles),
    [forSidebar, otherReviewedArticles]
  );

  const listTabs = useMemo(() => {
    const tabs = [
      { id: "queue", key: "pending", label: "Queue", list: filteredNewArticles },
      { id: "rereview", key: "judged", label: "Re-review", list: filteredJudgedArticles },
    ];
    if (otherReviewedArticles.length > 0) {
      tabs.push({ id: "others", key: "other", label: "Other judges", list: filteredOtherArticles });
    }
    return tabs;
  }, [filteredJudgedArticles, filteredNewArticles, filteredOtherArticles, otherReviewedArticles.length]);

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
    setIsSubmitting(true);
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
            ? { ...article, status: decision, reviews: [...(article.reviews || []), optimisticReview] }
            : article
        )
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
    } catch (error) {
      console.error("Error removing article", error);
    } finally {
      setIsSubmitting(false);
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
          handleDecision("accepted");
          break;
        case "reject":
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
      isSubmitting,
      rowArticles,
      selectedForBulk,
      shortcuts,
      showShortcutHelp,
      sidebarCollapsed,
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
    };
  }, [handleShortcut]);

  const juryList = contest?.juries || [];

  return (
    <div className={`rq-app ${isDark ? "rq-theme-dark" : "rq-theme-light"}`}>
      {!isLoading && !isAuthorized ? (
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
        <div className="rq-center-state rq-center-full" role="status" aria-live="polite">
          <div className="relative flex flex-col items-center justify-center p-8 sm:p-10 max-w-sm w-full mx-4 rounded-2xl bg-card/95 border border-border shadow-2xl backdrop-blur-xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Glowing Brand Icon with Multi-ring Aura */}
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-2 rounded-full bg-primary/20 blur-md animate-pulse" />
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary/10 via-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
                <Feather className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-card border-2 border-background flex items-center justify-center shadow-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-foreground tracking-tight flex items-center justify-center gap-1.5">
                <span>{isBackgroundLoading && articles.length > 0 ? "Updating Queue" : "Loading Review Console"}</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px]">
                {isBackgroundLoading && articles.length > 0
                  ? `Loading ${articles.length} of ${statusStats.total || 0} contest submissions...`
                  : "Syncing articles, jury assignments, and MediaWiki cache..."}
              </p>
            </div>

            {/* Polished Indeterminate Linear Progress Bar */}
            <div className="w-full max-w-[220px] space-y-2">
              <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden relative">
                <div className="h-full bg-primary rounded-full w-2/5 animate-[pulse_1.5s_ease-in-out_infinite]" />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                <span>Wikimedia API</span>
                <span>Active</span>
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
                  <CdxIcon icon={cdxIconArrowPrevious} />
                </Link>
                <span className="rq-live-dot" role="img" aria-label="Live: the queue refreshes on its own"></span>
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
                      <CdxIcon icon={cdxIconSettings} />
                    </button>
                  )}
                  <button
                    className="rq-icon-btn rq-desktop-only"
                    title="Collapse the panel"
                    onClick={() => setSidebarCollapsed(true)}
                  >
                    <CdxIcon icon={cdxIconCollapse} />
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
              <div className="cdx-text-input cdx-text-input--has-start-icon rq-panel-search">
                <div className="cdx-text-input__input-wrapper">
                  <span className="cdx-text-input__icon cdx-text-input__start-icon">
                    <CdxIcon icon={cdxIconSearch} />
                  </span>
                  <input
                    className="cdx-text-input__input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="cdx-text-input__clear-button"
                      aria-label="Clear input"
                      onClick={() => setSearchQuery("")}
                    >
                      <CdxIcon icon={cdxIconClear} />
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="rq-tabs" role="tablist" aria-label="Queue lists">
                {listTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab.id === tab.id ? "true" : "false"}
                    className={activeTab.id === tab.id ? "is-active" : ""}
                    onClick={() => setListTab(tab.id as any)}
                  >
                    {tab.label}
                    <span className="rq-tab-count">{tab.list.length.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </header>

            {/* Bulk Action Bar */}
            {selectedForBulk.length > 0 && (
              <div className="rq-bulk-bar">
                <div className="rq-bulk-banner">
                  <span className="rq-bulk-count">{selectedForBulk.length} selected</span>
                  <div className="rq-bulk-actions">
                    <button
                      type="button"
                      className="rq-bbtn rq-bbtn-accept"
                      onClick={() => handleBulkDecision("accepted")}
                      title="Accept"
                    >
                      <CdxIcon icon={cdxIconCheck} />
                    </button>
                    <button
                      type="button"
                      className="rq-bbtn rq-bbtn-reject"
                      onClick={() => handleBulkDecision("rejected")}
                      title="Reject"
                    >
                      <CdxIcon icon={cdxIconClear} />
                    </button>
                    <button
                      type="button"
                      className="rq-bbtn rq-bbtn-remove"
                      onClick={handleBulkRemove}
                      title="Remove"
                    >
                      <CdxIcon icon={cdxIconTrash} />
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
                        <span className="rq-item-title">{article.title}</span>
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
                    <CdxIcon icon={cdxIconMenu} /> Open Sidebar
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
                        title="Open Sidebar"
                      >
                        <CdxIcon icon={cdxIconMenu} />
                      </button>
                    )}

                    <button className="rq-back-btn rq-mobile-only" onClick={() => setMobileTab("list")}>
                      <CdxIcon icon={cdxIconArrowPrevious} />
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
                        <span className="rq-tag">by {currentArticle.submitted_by}</span>
                        {currentArticle.wiki_creator &&
                          currentArticle.wiki_creator.toLowerCase() ===
                            currentArticle.submitted_by.toLowerCase() && (
                            <span
                              className="rq-tag"
                              style={{
                                color: "var(--rq-success)",
                                borderColor: "var(--rq-success)",
                              }}
                            >
                              ✓ Creator
                            </span>
                          )}
                        {currentArticle.word_count > 0 && (
                          <span className="rq-tag">
                            {currentArticle.word_count.toLocaleString()} words
                          </span>
                        )}
                        {currentArticle.byte_count > 0 && (
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
                            )}`}
                          >
                            {getMyLatestDecision(currentArticle) === "accepted"
                              ? "✓ Accepted"
                              : getMyLatestDecision(currentArticle) === "rejected"
                              ? "✕ Rejected"
                              : "→ Skipped"}
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
                    {reviewError && <div className="rq-error-msg">{reviewError}</div>}
                    <div className="rq-decision-form">
                      <textarea
                        ref={commentBoxRef}
                        className="rq-input rq-textarea"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Leave a note for the submitter (optional)… (C)"
                        rows={2}
                      />

                      <div className="rq-actions-wrapper">
                        <div className="rq-primary-actions">
                          <button
                            type="button"
                            className="rq-btn rq-btn-accept"
                            disabled={isSubmitting}
                            onClick={() => handleDecision("accepted")}
                            title="Accept (A)"
                          >
                            <CdxIcon icon={cdxIconCheck} /> <span>Accept</span>
                            <kbd className="rq-kbd rq-desktop-only">
                              {shortcutKeyLabel(shortcuts.accept)}
                            </kbd>
                          </button>
                          <button
                            type="button"
                            className="rq-btn rq-btn-reject"
                            disabled={isSubmitting}
                            onClick={() => handleDecision("rejected")}
                            title="Reject (R)"
                          >
                            <CdxIcon icon={cdxIconClear} /> <span>Reject</span>
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
                            <CdxIcon icon={cdxIconNext} />{" "}
                            <span className="rq-desktop-only">Skip</span>
                          </button>
                          <button
                            type="button"
                            className="rq-btn-ghost rq-btn-remove"
                            disabled={isSubmitting}
                            onClick={handleRemove}
                            title="Delete article"
                          >
                            <CdxIcon icon={cdxIconTrash} />{" "}
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
          {newArticles.length > 0 && <span className="rq-nav-badge">{newArticles.length}</span>}
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
    </div>
  );
}
