const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
export const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_URL || "/auth";

export interface UserSession {
  is_authenticated: boolean;
  user_id?: number;
  wiki_username?: string;
  role: "owner" | "admin" | "jury" | "participant" | "anonymous";
  is_owner?: boolean;
  is_admin?: boolean;
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
  onwiki_page_url?: string;
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
  custom_creation_start_date?: string | null;
  custom_creation_end_date?: string | null;
  rank_by_words?: boolean;
  add_talk_template?: boolean;
  talk_template_name?: string;
  distribute_jury_queue?: boolean;
  total_articles?: number;
  accepted_articles?: number;
  pending_articles?: number;
  my_reviewed_count?: number;
  total_juries?: number;
  juries?: string[];
  organizers?: string[];
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
  re_review_requested?: boolean;
  re_review_note?: string;
  re_reviewed_at?: string | null;
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

export interface ContestDailyStat {
  date: string;
  count: number;
  words: number;
  judged: number;
  cumulative_count: number;
  cumulative_words: number;
}

export interface ContestWordStats {
  total_words: number;
  accepted_words: number;
  pending_words: number;
  rejected_words: number;
  avg_words: number;
}

export interface ContestParticipantStat {
  username: string;
  total: number;
  accepted: number;
  pending: number;
  rejected: number;
  words: number;
}

export interface ContestLargestArticle {
  id: number;
  title: string;
  word_count: number;
  byte_count: number;
  submitter: string;
  status: string;
}

export interface ContestJuryPerformance {
  username: string;
  total_reviews: number;
  accepted_count: number;
  rejected_count: number;
  acceptance_rate: number;
  active_days: number;
  last_reviewed_at: string;
}

export interface ContestStatsSummary {
  total_submissions: number;
  this_week_submissions: number;
  total_participants: number;
  accepted_participants: number;
  active_juries: number;
  total_juries: number;
  total_reviews: number;
  organizers_count: number;
  progress_percent: number;
  decided_count: number;
  retention_percent: number;
  busiest_day: string;
  busiest_day_count: number;
  daily_avg_submissions: number;
  active_submission_days: number;
  total_contest_days: number;
}

export interface ContestStatsResponse {
  status_counts: {
    total: number;
    accepted: number;
    rejected: number;
    pending: number;
    validation_failed?: number;
  };
  words: ContestWordStats;
  summary: ContestStatsSummary;
  daily: ContestDailyStat[];
  top_participants: ContestParticipantStat[];
  largest_articles: ContestLargestArticle[];
  jury_performance: ContestJuryPerformance[];
  signature?: string;
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
  role?: string;
  accepted_count: number;
  pending_count?: number;
  rejected_count?: number;
  total_words: number;
  total_bytes: number;
  submitted_count: number;
  submitted_words?: number;
  submitted_bytes?: number;
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
  assignedTo?: string,
  submitter?: string,
  search?: string
): Promise<KeysetResponse> {
  const params = new URLSearchParams();
  if (beforeId) params.set("before_id", beforeId.toString());
  if (status) params.set("status", status);
  if (assignedTo) params.set("assigned_to", assignedTo);
  if (submitter) params.set("submitter", submitter);
  if (search && search.trim()) params.set("q", search.trim());
  params.set("limit", limit.toString());

  const res = await fetch(`${API_BASE}/contests/${code}/articles?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch articles");
  return res.json();
}

export async function fetchArticleCursors(
  code: string,
  status?: string,
  limit: number = 500,
  beforeId?: number
): Promise<number[]> {
  try {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (beforeId) params.set("before_id", beforeId.toString());
    params.set("limit", limit.toString());
    const res = await fetch(`${API_BASE}/contests/${code}/articles/cursors?${params.toString()}`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.cursors) ? data.cursors : [];
  } catch {
    return [];
  }
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

export async function fetchContestStats(code: string): Promise<ContestStatsResponse> {
  const res = await fetch(`${API_BASE}/contests/${encodeURIComponent(code)}/stats`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch contest statistics");
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
  onwiki_page_url?: string;
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
  existing_contest_codes?: string[];
  existing_contest_ids?: number[];
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
  onwiki_page_url?: string;
  juries?: string[];
  organizers?: string[];
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

export type AvailableContest = AvailableContestSummary;

export async function fetchGlobalAvailableContests(search?: string, wiki?: string): Promise<AvailableContestSummary[]> {
  const params = new URLSearchParams();
  if (search?.trim()) params.set("q", search.trim());
  if (wiki?.trim() && wiki !== "all") params.set("wiki", wiki.trim());
  const q = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/available-contests${q}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch available contests");
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
  re_review_requested?: boolean;
  re_review_note?: string;
  re_reviewed_at?: string;
  reviews: ContestUserSubmissionReview[];
}

export interface ContestUserProfile {
  username: string;
  role: string;
  is_contest_organizer?: boolean;
  is_contest_jury?: boolean;
  contest_code: string;
  contest_name: string;
  wiki_url: string;
  rank_by_words?: boolean;
  min_words?: number;
  min_bytes?: number;
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
  wiki_dbname?: string;
  wiki_url?: string;
  wiki_lang?: string;
  start_date: string;
  end_date: string;
  status: string;
  wiki_tz?: string;
  is_umbrella?: boolean;
  existing_contest_codes?: string[];
  rule_must_be_creator: boolean;
  rule_no_redirect: boolean;
  rule_no_disambig: boolean;
  rule_mainspace_only: boolean;
  rule_created_in_window: boolean;
  custom_creation_start_date?: string;
  custom_creation_end_date?: string;
  min_bytes: number;
  min_words: number;
  min_refs: number;
  max_submissions_per_user: number;
  rank_by_words: boolean;
  add_talk_template: boolean;
  talk_template_name?: string;
  distribute_jury_queue?: boolean;
  onwiki_page_url?: string;
  juries?: string[];
  organizers?: string[];
}

export async function updateContest(code: string, payload: UpdateContestPayload): Promise<any> {
  let res = await fetch(`${API_BASE}/contests/${encodeURIComponent(code)}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (res.status === 404) {
    res = await fetch(`${API_BASE}/contests/${encodeURIComponent(code)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  }
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

export async function rejectContest(code: string, reason?: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/admin/contests/${encodeURIComponent(code)}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reason: reason || "" }),
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

export async function restoreContest(code: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/contests/${encodeURIComponent(code)}/restore`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to restore contest");
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
  auth_valid?: boolean;
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

export async function fetchElevatedUsers(): Promise<Record<string, "owner" | "admin" | "steward">> {
  const res = await fetch(`${API_BASE}/users/elevated`, {
    credentials: "include",
  });
  if (!res.ok) {
    return {};
  }
  return res.json().catch(() => ({}));
}

export async function fetchUserRole(username: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}/role`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.role || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// In-Tool Notifications & Wikipedia Echo-style Integration
// ---------------------------------------------------------------------------

export interface NotificationItem {
  id: number;
  user_id: number;
  contest_id: number;
  contest_name?: string;
  contest_code?: string;
  article_id?: number | null;
  type:
    | "article_rejected"
    | "article_accepted"
    | "re_review_requested"
    | "article_message"
    | "contest_approved"
    | "contest_rejected"
    | string;
  title: string;
  message: string;
  link_url: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationKeysetResponse {
  items: NotificationItem[];
  unread_count: number;
  next_cursor?: number;
  has_more: boolean;
}

export async function fetchNotifications(
  beforeId?: number,
  unreadOnly?: boolean,
  limit: number = 20
): Promise<NotificationKeysetResponse> {
  const params = new URLSearchParams();
  if (beforeId) params.set("before_id", beforeId.toString());
  if (unreadOnly) params.set("unread_only", "true");
  params.set("limit", limit.toString());

  const res = await fetch(`${API_BASE}/notifications?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  try {
    const res = await fetch(`${API_BASE}/notifications/unread-count`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.unread_count || 0;
  } catch {
    return 0;
  }
}

export async function markNotificationRead(id: number): Promise<void> {
  await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch(`${API_BASE}/notifications/mark-all-read`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// In-Tool Article Discussion Thread & Re-Review Requests
// ---------------------------------------------------------------------------

export interface ArticleMessageItem {
  id: number;
  article_id: number;
  user_id: number;
  username: string;
  role: string;
  message: string;
  is_system: boolean;
  created_at: string;
}

export async function fetchArticleMessages(articleId: number): Promise<ArticleMessageItem[]> {
  const res = await fetch(`${API_BASE}/articles/${articleId}/messages`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch article messages");
  const data = await res.json();
  return data.messages || [];
}

export async function postArticleMessage(articleId: number, message: string): Promise<{ success: boolean; message_id: number }> {
  const res = await fetch(`${API_BASE}/articles/${articleId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Failed to post message");
  }
  return res.json();
}

export async function requestArticleReReview(articleId: number, note: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/articles/${articleId}/request-re-review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Failed to request re-review");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Community Chat & Moderation
// ---------------------------------------------------------------------------

export interface CommunityChatMessage {
  id: number;
  contest_id: number;
  is_campaign_chat: boolean;
  user_id: number;
  username: string;
  user_role: string;
  message: string;
  is_deleted: boolean;
  deleted_by?: string;
  deleted_reason?: string;
  created_at: string;
}

export interface ChatMessageKeysetResult {
  items: CommunityChatMessage[];
  next_cursor?: number;
  has_more: boolean;
}

export interface UserChatModeration {
  id: number;
  user_id: number;
  username: string;
  contest_id?: number;
  action: "warn" | "timeout" | "ban" | "unban" | string;
  timeout_until?: string | null;
  reason: string;
  moderated_by: string;
  created_at: string;
}

export interface UserChatStatus {
  can_chat: boolean;
  status: "active" | "timed_out" | "banned" | "unauthenticated" | string;
  timeout_until?: string | null;
  warning_count: number;
  ban_reason?: string;
}

// Single Contest Chat (Dedicated endpoint)
export async function fetchChatMessages(
  contestCode: string,
  beforeId?: number,
  isCampaign?: boolean,
  limit: number = 40
): Promise<ChatMessageKeysetResult> {
  const params = new URLSearchParams();
  if (beforeId) params.set("before_id", beforeId.toString());
  if (isCampaign) params.set("is_campaign", "true");
  params.set("limit", limit.toString());

  const res = await fetch(`${API_BASE}/contests/${encodeURIComponent(contestCode)}/chat?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch contest chat messages");
  return res.json();
}

export async function postChatMessage(
  contestCode: string,
  message: string,
  isCampaignChat?: boolean
): Promise<CommunityChatMessage> {
  const res = await fetch(`${API_BASE}/contests/${encodeURIComponent(contestCode)}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message, is_campaign_chat: isCampaignChat }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Failed to post message");
  }
  return res.json();
}

// Multi-Community Campaign Chat (Dedicated endpoint)
export async function fetchCampaignChatMessages(
  contestCode: string,
  beforeId?: number,
  limit: number = 40
): Promise<ChatMessageKeysetResult> {
  const params = new URLSearchParams();
  if (beforeId) params.set("before_id", beforeId.toString());
  params.set("limit", limit.toString());

  const res = await fetch(`${API_BASE}/contests/${encodeURIComponent(contestCode)}/campaign-chat?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch campaign chat messages");
  return res.json();
}

export async function postCampaignChatMessage(
  contestCode: string,
  message: string
): Promise<CommunityChatMessage> {
  const res = await fetch(`${API_BASE}/contests/${encodeURIComponent(contestCode)}/campaign-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Failed to post campaign message");
  }
  return res.json();
}

export async function deleteChatMessage(
  contestCode: string,
  messageId: number,
  reason?: string
): Promise<{ status: string; message_id: number; deleted_by: string; reason: string }> {
  const res = await fetch(`${API_BASE}/contests/${contestCode}/chat/${messageId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Failed to delete message");
  }
  return res.json();
}

export async function moderateChatUser(
  contestCode: string,
  username: string,
  action: "warn" | "timeout" | "ban" | "unban",
  durationMinutes?: number,
  reason?: string
): Promise<{ status: string; action: string; target_username: string }> {
  const res = await fetch(`${API_BASE}/contests/${contestCode}/chat/moderate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      username,
      action,
      duration_minutes: durationMinutes,
      reason,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Failed to apply moderation action");
  }
  return res.json();
}

export async function fetchChatModerationLog(contestCode: string): Promise<UserChatModeration[]> {
  const res = await fetch(`${API_BASE}/contests/${contestCode}/chat/moderation`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch moderation log");
  const data = await res.json();
  return data.moderation_log || [];
}

export async function fetchMyChatStatus(contestCode: string): Promise<UserChatStatus> {
  try {
    const res = await fetch(`${API_BASE}/contests/${contestCode}/chat/my-status`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) return { can_chat: false, status: "unauthenticated", warning_count: 0 };
    return res.json();
  } catch {
    return { can_chat: false, status: "error", warning_count: 0 };
  }
}



