import { cookies } from "next/headers";
import { UserSession, Contest, JuryStatsResponse } from "./api";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || "http://127.0.0.1:8081";

async function getAuthHeader(): Promise<HeadersInit> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("feather_token")?.value;
    const cookieHeader = cookieStore.toString();
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  } catch {
    return { Accept: "application/json" };
  }
}

export async function getServerMe(): Promise<UserSession | null> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${INTERNAL_API_URL}/auth/me`, {
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
    const headers = await getAuthHeader();
    const res = await fetch(`${INTERNAL_API_URL}/api/contests`, {
      headers,
      next: { revalidate: 15 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getServerContest(code: string): Promise<Contest | null> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${INTERNAL_API_URL}/api/contests/${encodeURIComponent(code)}`, {
      headers,
      next: { revalidate: 15 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
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
