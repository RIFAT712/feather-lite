import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 86400; // Cache 24 hours

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url");
  const dbname = searchParams.get("dbname");

  if (!rawUrl && !dbname) {
    return NextResponse.json({ error: "Missing url or dbname parameter" }, { status: 400 });
  }

  let domain = "";
  try {
    if (rawUrl) {
      domain = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).hostname;
    }
  } catch {
    domain = rawUrl || "";
  }

  if (!domain) {
    return NextResponse.json({ error: "Invalid wiki domain" }, { status: 400 });
  }

  const apiEndpoint = `https://${domain}/w/api.php?action=query&meta=siteinfo&siprop=general&format=json`;

  try {
    const res = await fetch(apiEndpoint, {
      headers: {
        "User-Agent": "FeatherBot/2.0 (Wikimedia Contest Platform; https://toolforge.org/feather)",
        "Accept": "application/json",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      throw new Error(`MediaWiki siteinfo API responded with HTTP ${res.status}`);
    }

    const data = await res.json();
    const general = data?.query?.general;

    if (!general) {
      throw new Error("Invalid siteinfo response format from MediaWiki API");
    }

    return NextResponse.json({
      dbname: general.wikiid || dbname || "",
      domain: domain,
      sitename: general.sitename || "",
      timezone: general.timezone || "UTC",
      timeoffset: typeof general.timeoffset === "number" ? general.timeoffset : 0,
      serverTime: general.time || "",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || "Failed to query MediaWiki siteinfo database",
        timezone: "UTC",
        timeoffset: 0,
      },
      { status: 502 }
    );
  }
}
