import { cookies } from "next/headers";
import {
  UserSession,
  Contest,
  JuryStatsResponse,
  PlatformOverview,
  GlobalUserProfile,
  ContestUserProfile,
  StandingEntry,
  KeysetResponse,
} from "./api";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || "http://127.0.0.1:8081";

async function getAuthHeader(): Promise<HeadersInit> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("feather_token")?.value;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["Cookie"] = `feather_token=${token}`;
    } else {
      const allCookies = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
      if (allCookies) {
        headers["Cookie"] = allCookies;
      }
    }
    return headers;
  } catch {
    return { Accept: "application/json" };
  }
}

export async function getServerMe(): Promise<UserSession | null> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${INTERNAL_API_URL}/api/me`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getServerContests(): Promise<Contest[]> {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/contests`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 15 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("[SSR] Failed to fetch contests:", err);
    return [];
  }
}

export async function getServerContest(code: string): Promise<Contest | null> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${INTERNAL_API_URL}/api/contests/${encodeURIComponent(code)}`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`[SSR] Failed to fetch contest ${code}:`, err);
    return null;
  }
}

export async function getServerPlatformOverview(): Promise<PlatformOverview | null> {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/overview`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("[SSR] Failed to fetch platform overview:", err);
    return null;
  }
}

export async function getServerJuryStats(code: string): Promise<JuryStatsResponse | null> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${INTERNAL_API_URL}/api/contests/${encodeURIComponent(code)}/jury-stats`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getServerUserProfile(username: string): Promise<GlobalUserProfile | null> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${INTERNAL_API_URL}/api/users/${encodeURIComponent(username)}`, {
      headers,
      next: { revalidate: 15 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getServerContestUserProfile(
  code: string,
  username: string
): Promise<ContestUserProfile | null> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(
      `${INTERNAL_API_URL}/api/contests/${encodeURIComponent(code)}/users/${encodeURIComponent(username)}`,
      {
        headers,
        next: { revalidate: 15 },
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getServerStandings(code: string): Promise<StandingEntry[]> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${INTERNAL_API_URL}/api/contests/${encodeURIComponent(code)}/standings`, {
      headers,
      next: { revalidate: 15 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getServerContestArticles(
  code: string,
  limit: number = 50,
  beforeId?: number,
  status?: string
): Promise<KeysetResponse | null> {
  try {
    const headers = await getAuthHeader();
    const params = new URLSearchParams();
    params.set("limit", limit.toString());
    if (beforeId) params.set("before_id", beforeId.toString());
    if (status) params.set("status", status);

    const res = await fetch(
      `${INTERNAL_API_URL}/api/contests/${encodeURIComponent(code)}/articles?${params.toString()}`,
      {
        headers,
        next: { revalidate: 15 },
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
