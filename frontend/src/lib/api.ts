const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
export const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_URL || "/auth";

export interface UserSession {
  is_authenticated: boolean;
  user_id?: number;
  wiki_username?: string;
  role: "owner" | "jury" | "participant" | "anonymous";
  is_owner?: boolean;
}

export interface SubContestSummary {
  id: number;
  code: string;
  name: string;
  wiki_dbname: string;
  wiki_url: string;
  wiki_lang: string;
  wiki_tz: string;
  start_date: string;
  end_date: string;
  status: string;
  min_words: number;
  min_bytes: number;
  total_articles: number;
  accepted_articles: number;
  pending_articles: number;
  total_juries: number;
  total_submitters: number;
}

export interface Contest {
  id: number;
  code: string;
  name: string;
  description: string;
  wiki_dbname: string;
  wiki_url: string;
  wiki_lang: string;
  wiki_tz?: string;
  start_date: string;
  end_date: string;
  status: string;
  is_umbrella?: boolean;
  created_by_id?: number;
  created_by_username?: string;
  created_at?: string;
  parent_contest_id?: number;
  parent_contest_code?: string;
  parent_contest_name?: string;
  sub_contest_count?: number;
  sub_contests?: SubContestSummary[];
  min_words?: number;
  min_bytes?: number;
  min_refs?: number;
  max_submissions_per_user?: number;
  rule_must_be_creator?: boolean;
  rule_no_redirect?: boolean;
  rule_no_disambig?: boolean;
  rule_mainspace_only?: boolean;
  rule_created_in_window?: boolean;
  rank_by_words?: boolean;
  add_talk_template?: boolean;
  talk_template_name?: string;
  distribute_jury_queue?: boolean;
  total_articles?: number;
  accepted_articles?: number;
  pending_articles?: number;
  total_juries?: number;
  juries?: string[];
}

export interface ArticleReview {
  id: number;
  article_id: number;
  reviewer_id: number;
  reviewer_username: string;
  status: "accepted" | "rejected" | "skipped";
  comment: string;
  timestamp: string;
}

export interface Article {
  id: number;
  contest_id: number;
  contest_code?: string;
  wiki_dbname?: string;
  wiki_url?: string;
  wiki_lang?: string;
  title: string;
  submitter_id: number;
  submitter_username: string;
  status: "pending" | "accepted" | "rejected" | "validation_failed";
  validation_error?: string;
  wiki_creator?: string;
  wiki_creation_date?: string | null;
  byte_count: number;
  word_count: number;
  assigned_to_id?: number;
  assigned_to_username?: string;
  submitted_at: string;
  locked_until?: string | null;
  locked_by_id?: number | null;
  locked_by_username?: string;
  review_count?: number;
  reviews?: ArticleReview[];
}

export interface ArticlePreview {
  id: number;
  title: string;
  word_count: number;
  byte_count: number;
  html: string;
  wikitext?: string;
  wiki_url: string;
}

export interface JuryMemberProgress {
  username: string;
  assigned: number;
  judged: number;
  remaining: number;
  accepted: number;
  rejected: number;
  skipped: number;
  acceptance_rate: number;
  progress_percent: number;
}

export interface JuryStatsResponse {
  total_articles: number;
  accepted_articles: number;
  rejected_articles: number;
  pending_articles: number;
  reviewed_articles: number;
  progress_percent: number;
  juries: JuryMemberProgress[];
}

export interface KeysetResponse {
  items: Article[];
  total: number;
  next_cursor?: number;
  has_more: boolean;
}

export interface StandingEntry {
  rank: number;
  username: string;
  accepted_count: number;
  total_words: number;
  total_bytes: number;
  submitted_count: number;
  wikis_contributed?: string[];
}

export interface PlatformOverviewTrendItem {
  date: string;
  count: number;
}

export interface PlatformOverviewTotals {
  words: number;
  articles: number;
  submissions: number;
  people: number;
  wikis: number;
  contests: number;
}

export interface PlatformOverviewMonth {
  entries: number;
  words: number;
  people: number;
}

export interface PlatformOverview {
  totals: PlatformOverviewTotals;
  month: PlatformOverviewMonth;
  trend: PlatformOverviewTrendItem[];
}

export async function fetchPlatformOverview(): Promise<PlatformOverview> {
  const res = await fetch(`${API_BASE}/overview`, { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch platform overview");
  return res.json();
}

export async function fetchMe(): Promise<UserSession> {
  const res = await fetch(`${API_BASE}/me`, { cache: "no-store", credentials: "include" });
  if (!res.ok) {
    return { is_authenticated: false, role: "anonymous" };
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${AUTH_BASE}/logout`, { method: "POST", credentials: "include" });
}

export async function fetchContests(): Promise<Contest[]> {
  const res = await fetch(`${API_BASE}/contests`, { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch contests");
  return res.json();
}

export async function fetchContest(code: string): Promise<Contest> {
  const res = await fetch(`${API_BASE}/contests/${code}`, { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch contest");
  return res.json();
}

export async function fetchArticles(
  code: string,
  beforeId?: number,
  status?: string,
  limit: number = 50,
  assignedTo?: string
): Promise<KeysetResponse> {
  const params = new URLSearchParams();
  if (beforeId) params.set("before_id", beforeId.toString());
  if (status) params.set("status", status);
  if (assignedTo) params.set("assigned_to", assignedTo);
  params.set("limit", limit.toString());

  const res = await fetch(`${API_BASE}/contests/${code}/articles?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch articles");
  return res.json();
}

export async function fetchArticlePreview(code: string, articleId: number): Promise<ArticlePreview> {
  const res = await fetch(`${API_BASE}/contests/${code}/articles/${articleId}/preview`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch article preview");
  return res.json();
}

export async function fetchJuryStats(code: string): Promise<JuryStatsResponse> {
  const res = await fetch(`${API_BASE}/contests/${code}/jury-stats`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch jury statistics");
  return res.json();
}

export async function redistributeContestQueues(code: string): Promise<{ message: string; moved: number }> {
  const res = await fetch(`${API_BASE}/contests/${code}/redistribute`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to redistribute contest queues");
  return res.json();
}

export interface UserArticleItem {
  title: string;
  created_at: string | null;
}

export interface UserCreatedArticlesResponse {
  username: string;
  articles: UserArticleItem[];
  already_submitted: string[];
}

export interface SubmissionResultItem {
  title: string;
  status: string;
  error?: string;
}

export interface SubmissionResponse {
  submitted: number;
  message: string;
  results?: SubmissionResultItem[];
}

export async function fetchUserCreatedArticles(
  code: string,
  username?: string
): Promise<UserCreatedArticlesResponse> {
  const query = username ? `?username=${encodeURIComponent(username)}` : "";
  const res = await fetch(`${API_BASE}/contests/${code}/user-created-articles${query}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to fetch user created articles");
  }
  return res.json();
}

export async function submitArticles(
  code: string,
  titles: string[],
  username?: string
): Promise<SubmissionResponse> {
  const res = await fetch(`${API_BASE}/contests/${code}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ titles, username }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to submit articles");
  }
  return res.json();
}

export async function reviewArticle(
  articleId: number,
  status: "accepted" | "rejected" | "skipped" | "pending",
  comment: string
): Promise<{ status: string; message: string; reviewer: string }> {
  const res = await fetch(`${API_BASE}/articles/${articleId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status, comment }),
  });
  if (!res.ok) throw new Error("Failed to submit review");
  return res.json();
}

export async function acquireArticleLock(
  articleId: number
): Promise<{ success: boolean; locked_by: string; locked_until: string }> {
  const res = await fetch(`${API_BASE}/articles/${articleId}/lock`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to acquire article lock");
  }
  return res.json();
}

export async function releaseArticleLock(articleId: number): Promise<void> {
  await fetch(`${API_BASE}/articles/${articleId}/lock`, {
    method: "DELETE",
    credentials: "include",
  }).catch(() => {});
}

export async function undoArticleReview(
  articleId: number
): Promise<{ success: boolean; message: string; status: string; article?: string }> {
  const res = await fetch(`${API_BASE}/articles/${articleId}/review/undo`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to undo review");
  }
  return res.json();
}

export async function deleteArticle(articleId: number): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/articles/${articleId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete article");
  }
  return res.json();
}

export async function bulkReviewArticles(
  articleIds: number[],
  status: "accepted" | "rejected",
  comment: string = ""
): Promise<{ success: boolean; reviewed_count: number }> {
  const res = await fetch(`${API_BASE}/articles/bulk-review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ article_ids: articleIds, status, comment }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to submit bulk reviews");
  }
  return res.json();
}

export async function fetchStandings(code: string, wiki?: string): Promise<StandingEntry[]> {
  const url = wiki ? `${API_BASE}/contests/${code}/standings?wiki=${encodeURIComponent(wiki)}` : `${API_BASE}/contests/${code}/standings`;
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch standings");
  return res.json();
}

export interface CommunityRuleConfig {
  wiki_dbname: string;
  wiki_url: string;
  wiki_lang: string;
  name: string;
  timezone?: string;
  min_words?: number;
  min_bytes?: number;
  min_refs?: number;
  rule_must_be_creator?: boolean;
  talk_template_name?: string;
  juries?: string[];
}

export interface CreateSubContestPayload {
  name: string;
  wiki_dbname: string;
  wiki_url: string;
  wiki_lang: string;
  wiki_tz?: string;
  min_words?: number;
  min_bytes?: number;
  min_refs?: number;
  rule_must_be_creator?: boolean;
  talk_template_name?: string;
  juries?: string[];
}

export interface CreateContestPayload {
  name: string;
  code?: string;
  description?: string;
  wiki_dbname?: string;
  wiki_url?: string;
  wiki_lang?: string;
  wiki_tz?: string;
  start_date: string;
  end_date: string;
  is_umbrella?: boolean;
  participating_wikis?: CommunityRuleConfig[];
  rule_must_be_creator?: boolean;
  rule_no_redirect?: boolean;
  rule_no_disambig?: boolean;
  rule_mainspace_only?: boolean;
  rule_created_in_window?: boolean;
  custom_creation_start_date?: string;
  custom_creation_end_date?: string;
  min_bytes?: number;
  min_words?: number;
  min_refs?: number;
  max_submissions_per_user?: number;
  rank_by_words?: boolean;
  add_talk_template?: boolean;
  talk_template_name?: string;
  distribute_jury_queue?: boolean;
  juries?: string[];
}

export async function createSubContest(
  code: string,
  payload: CreateSubContestPayload
): Promise<{ message: string; code: string; id: number; name: string }> {
  const res = await fetch(`${API_BASE}/contests/${code}/sub-contests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to add community sub-contest");
  }
  return res.json();
}

export async function createContest(
  payload: CreateContestPayload
): Promise<{ code: string; message: string; status?: string; contest: any }> {
  const res = await fetch(`${API_BASE}/contests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create contest");
  }
  return res.json();
}

export interface GlobalProfileContestArticle {
  id: number;
  title: string;
  status: string;
  validation_error: string;
  word_count: number;
  byte_count: number;
  wiki_creator: string;
  wiki_creation_date?: string;
  submitted_at: string;
}

export interface GlobalProfileParticipatedContest {
  code: string;
  name: string;
  start_date?: string;
  end_date?: string;
  wiki_url: string;
  wiki_dbname: string;
  articles: GlobalProfileContestArticle[];
}

export interface GlobalProfileReview {
  article_title: string;
  submitter: string;
  decision: string;
  comment: string;
  reviewed_at: string;
}

export interface GlobalProfileJudgedContest {
  code: string;
  name: string;
  start_date?: string;
  end_date?: string;
  wiki_url: string;
  role_in_contest: string;
  stats: {
    total: number;
    accepted: number;
    rejected: number;
    skipped: number;
  };
  reviews: GlobalProfileReview[];
}

export interface GlobalUserProfile {
  username: string;
  role: string;
  participated_contests: GlobalProfileParticipatedContest[];
  judged_contests: GlobalProfileJudgedContest[];
}

export interface ContestUserSubmissionReview {
  jury: string;
  decision: string;
  comment: string;
  reviewed_at: string;
}

export interface ContestUserSubmission {
  id: number;
  title: string;
  status: string;
  validation_error: string;
  word_count: number;
  byte_count: number;
  submitted_at: string;
  reviews: ContestUserSubmissionReview[];
}

export interface ContestUserProfile {
  username: string;
  role: string;
  contest_code: string;
  contest_name: string;
  wiki_url: string;
  standing?: StandingEntry;
  submissions: ContestUserSubmission[];
  reviews: GlobalProfileReview[];
}

export async function fetchUserProfile(username: string): Promise<GlobalUserProfile> {
  const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}/profile`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load user profile");
  return res.json();
}

export async function fetchContestUserProfile(code: string, username: string): Promise<ContestUserProfile> {
  const res = await fetch(`${API_BASE}/contests/${encodeURIComponent(code)}/users/${encodeURIComponent(username)}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load contest user profile");
  return res.json();
}

export async function suggestUsers(query: string, wikiUrl?: string): Promise<string[]> {
  const clean = query.trim();
  if (!clean) return [];
  const params = new URLSearchParams({ q: clean });
  if (wikiUrl) params.set("wiki", wikiUrl);
  try {
    const res = await fetch(`${API_BASE}/users/suggest?${params.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  // Client-side fallback to direct MediaWiki Action API if backend proxy is unreachable
  try {
    const base = wikiUrl?.replace(/\/+$/, "") || "https://meta.wikimedia.org";
    const res = await fetch(
      `${base}/w/api.php?action=query&list=allusers&auprefix=${encodeURIComponent(clean)}&aulimit=10&format=json&origin=*`
    );
    if (res.ok) {
      const data = await res.json();
      return (data?.query?.allusers || []).map((u: { name: string }) => u.name);
    }
  } catch {}

  return [];
}

export interface AvailableContestSummary {
  id: number;
  code: string;
  name: string;
  wiki_dbname: string;
  wiki_url: string;
  wiki_lang: string;
  start_date: string;
  end_date: string;
  status: string;
  total_articles: number;
}

export async function fetchAvailableContests(parentCode: string, search?: string): Promise<AvailableContestSummary[]> {
  const q = search?.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
  const res = await fetch(`${API_BASE}/contests/${encodeURIComponent(parentCode)}/available-contests${q}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load available contests");
  return res.json();
}

export async function attachContestToCampaign(
  parentCode: string,
  payload: { contest_id?: number; contest_code?: string }
): Promise<any> {
  const res = await fetch(`${API_BASE}/contests/${encodeURIComponent(parentCode)}/attach-contest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to attach contest to campaign");
  }
  return res.json();
}

export async function detachContestFromCampaign(
  parentCode: string,
  payload: { contest_id?: number; contest_code?: string }
): Promise<any> {
  const res = await fetch(`${API_BASE}/contests/${encodeURIComponent(parentCode)}/detach-contest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to detach contest from campaign");
  }
  return res.json();
}

export interface UpdateContestPayload {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  wiki_tz?: string;
  rule_must_be_creator: boolean;
  rule_no_redirect: boolean;
  rule_no_disambig: boolean;
  rule_mainspace_only: boolean;
  rule_created_in_window: boolean;
  min_bytes: number;
  min_words: number;
  min_refs: number;
  max_submissions_per_user: number;
  rank_by_words: boolean;
  add_talk_template: boolean;
  talk_template_name?: string;
  distribute_jury_queue?: boolean;
  juries?: string[];
}

export async function updateContest(code: string, payload: UpdateContestPayload): Promise<any> {
  const res = await fetch(`${API_BASE}/contests/${encodeURIComponent(code)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Failed to update contest");
  }
  return res.json();
}

// -------------------------------------------------------------
// Admin & Platform Management API
// -------------------------------------------------------------

export interface AdminOverview {
  total_contests: number;
  pending_contests: number;
  active_contests: number;
  ended_contests: number;
  total_articles: number;
  total_users: number;
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const res = await fetch(`${API_BASE}/admin/overview`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch admin overview");
  }
  return res.json();
}

export async function fetchAdminContests(status?: string): Promise<Contest[]> {
  const url = new URL(`${API_BASE}/admin/contests`, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  if (status && status !== "all") {
    url.searchParams.set("status", status);
  }
  const res = await fetch(url.toString(), {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch admin contests");
  }
  return res.json();
}

export async function approveContest(code: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/admin/contests/${encodeURIComponent(code)}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to approve contest");
  }
  return res.json();
}

export async function rejectContest(code: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/admin/contests/${encodeURIComponent(code)}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to reject contest");
  }
  return res.json();
}

export async function deleteContest(code: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/contests/${encodeURIComponent(code)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete contest");
  }
  return res.json();
}

// -------------------------------------------------------------
// Talk Page Template Queue API
// -------------------------------------------------------------

export interface TalkQueueJob {
  id: number;
  article_id: number;
  title: string;
  status: "queued" | "processing" | "done" | "failed";
  attempts: number;
  error?: string;
  retry_after?: string;
  created_at: string;
  processed_at?: string;
}

export interface TalkQueueResponse {
  enabled: boolean;
  talk_template_name: string;
  counts: {
    queued: number;
    processing: number;
    done: number;
    failed: number;
    total: number;
  };
  jobs?: TalkQueueJob[];
}

export async function fetchTalkQueue(code: string): Promise<TalkQueueResponse> {
  const res = await fetch(`${API_BASE}/contests/${encodeURIComponent(code)}/talk-queue`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch talk queue status");
  }
  return res.json();
}

export async function retryTalkQueue(code: string): Promise<{ message: string; retried: number }> {
  const res = await fetch(`${API_BASE}/contests/${encodeURIComponent(code)}/talk-queue/retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to retry talk queue");
  }
  return res.json();
}

export async function enqueueMissingTalkQueue(code: string): Promise<{ message: string; enqueued: number }> {
  const res = await fetch(`${API_BASE}/contests/${encodeURIComponent(code)}/talk-queue/enqueue-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to enqueue missing talk page jobs");
  }
  return res.json();
}


