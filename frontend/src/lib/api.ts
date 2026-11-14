const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
export const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_URL || "/auth";

export interface UserSession {
  is_authenticated: boolean;
  user_id?: number;
  wiki_username?: string;
  role: "owner" | "jury" | "participant" | "anonymous";
}

export interface Contest {
  id: number;
  code: string;
  name: string;
  description: string;
  wiki_dbname: string;
  wiki_url: string;
  wiki_lang: string;
  start_date: string;
  end_date: string;
  status: string;
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
  total_articles?: number;
  accepted_articles?: number;
  pending_articles?: number;
  total_juries?: number;
  juries?: string[];
}

export interface Article {
  id: number;
  contest_id: number;
  title: string;
  submitter_id: number;
  submitter_username: string;
  status: "pending" | "accepted" | "rejected" | "validation_failed";
  validation_error?: string;
  wiki_creator?: string;
  byte_count: number;
  word_count: number;
  assigned_to_id?: number;
  assigned_to_username?: string;
  submitted_at: string;
}

export interface ArticlePreview {
  id: number;
  title: string;
  word_count: number;
  byte_count: number;
  html: string;
  wiki_url: string;
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
  limit: number = 50
): Promise<KeysetResponse> {
  const params = new URLSearchParams();
  if (beforeId) params.set("before_id", beforeId.toString());
  if (status) params.set("status", status);
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
  status: "accepted" | "rejected" | "skipped",
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

export async function fetchStandings(code: string): Promise<StandingEntry[]> {
  const res = await fetch(`${API_BASE}/contests/${code}/standings`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch standings");
  return res.json();
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
  rule_must_be_creator?: boolean;
  rule_no_redirect?: boolean;
  rule_no_disambig?: boolean;
  rule_mainspace_only?: boolean;
  rule_created_in_window?: boolean;
  min_bytes?: number;
  min_words?: number;
  min_refs?: number;
  max_submissions_per_user?: number;
  rank_by_words?: boolean;
  add_talk_template?: boolean;
  talk_template_name?: string;
  juries?: string[];
}

export async function createContest(
  payload: CreateContestPayload
): Promise<{ code: string; message: string; contest: any }> {
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
