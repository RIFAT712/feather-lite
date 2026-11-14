import { NextResponse } from "next/server";
import fallbackWikis from "@/lib/wikimedia-wikis.json";
import { WikiInfo } from "@/lib/wikis";

export const revalidate = 86400; // 24 hours

/**
 * Parses official wiki-specific timezones directly from Wikimedia's central NOC database
 * (operations/mediawiki-config InitialiseSettings.php).
 */
async function fetchWikimediaDbTimezones(): Promise<Record<string, string>> {
  try {
    const res = await fetch("https://noc.wikimedia.org/conf/InitialiseSettings.php.txt", {
      headers: {
        "User-Agent": "FeatherBot/2.0 (Wikimedia Contest Platform; https://toolforge.org/feather)",
      },
      next: { revalidate: 604800 }, // 7 days
    });
    if (!res.ok) return {};
    const text = await res.text();
    const start = text.indexOf("'wgLocaltimezone' => [");
    if (start === -1) return {};
    const end = text.indexOf("],", start);
    const block = text.slice(start, end);
    const tzMap: Record<string, string> = {};
    block.split("\n").forEach((line) => {
      const m = line.match(/'([a-zA-Z0-9_]+)'\s*=>\s*'([^']+)'/);
      if (m && m[1] !== "default") {
        tzMap[m[1]] = m[2];
      }
    });
    return tzMap;
  } catch (err) {
    console.debug("[Wikis API] InitialiseSettings fetch failed:", err);
    return {};
  }
}

export async function GET() {
  try {
    const [sitematrixRes, dbTimezones] = await Promise.all([
      fetch("https://meta.wikimedia.org/w/api.php?action=sitematrix&format=json", {
        headers: {
          "User-Agent": "FeatherBot/2.0 (Wikimedia Contest Platform; https://toolforge.org/feather)",
          "Accept": "application/json",
        },
        next: { revalidate: 86400 },
      }),
      fetchWikimediaDbTimezones(),
    ]);

    if (!sitematrixRes.ok) {
      throw new Error(`Wikimedia API returned ${sitematrixRes.status}`);
    }

    const data = await sitematrixRes.json();
    const matrix = data.sitematrix;
    if (!matrix) {
      throw new Error("Invalid sitematrix structure");
    }

    const wikis: WikiInfo[] = [];

    // Process languages
    for (const key in matrix) {
      if (key === "count" || key === "specials") continue;
      const langObj = matrix[key];
      const langCode = langObj.code;
      const langNative = langObj.name || langCode;
      const langEnglish = langObj.localname || langCode;

      if (Array.isArray(langObj.site)) {
        for (const s of langObj.site) {
          if (s.closed !== undefined) continue;

          let nativeName = "";
          if (s.sitename) {
            if (s.sitename.toLowerCase().includes(langNative.toLowerCase())) {
              nativeName = s.sitename;
            } else {
              nativeName = `${langNative} ${s.sitename}`;
            }
          } else {
            nativeName = `${langNative} ${s.code}`;
          }

          let domain = "";
          try {
            domain = new URL(s.url).hostname;
          } catch {
            domain = s.url;
          }

          // Direct database timezone lookup from Wikimedia's wgLocaltimezone database
          const timezone = dbTimezones[s.dbname] || "UTC";

          wikis.push({
            dbname: s.dbname,
            nativeName: nativeName.trim(),
            englishName: `${langEnglish} ${s.sitename || s.code}`.trim(),
            lang: langCode,
            project: s.code,
            url: s.url,
            domain: domain,
            icon: `/icons/projects/${getProjectIconName(s.code)}.svg`,
            timezone: timezone,
          });
        }
      }
    }

    // Process special projects (Commons, Wikidata, Meta, etc.)
    if (Array.isArray(matrix.specials)) {
      for (const spec of matrix.specials) {
        if (spec.closed !== undefined || spec.private !== undefined) continue;
        let proj = "wikimedia";
        if (spec.dbname === "commonswiki") proj = "commons";
        else if (spec.dbname === "wikidatawiki") proj = "wikidata";
        else if (spec.dbname === "metawiki") proj = "meta";

        let domain = "";
        try {
          domain = new URL(spec.url).hostname;
        } catch {
          domain = spec.url;
        }

        const timezone = dbTimezones[spec.dbname] || "UTC";

        wikis.push({
          dbname: spec.dbname,
          nativeName: spec.sitename,
          englishName: spec.sitename,
          lang: spec.lang || "en",
          project: proj,
          url: spec.url,
          domain: domain,
          icon: `/icons/projects/${getProjectIconName(proj)}.svg`,
          timezone: timezone,
        });
      }
    }

    return NextResponse.json(wikis, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.warn("[Wikis API] Falling back to bundled wikis:", err);
    return NextResponse.json(fallbackWikis, {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
}

function getProjectIconName(code: string): string {
  switch (code.toLowerCase()) {
    case "wiki":
      return "wikipedia";
    case "wiktionary":
      return "wiktionary";
    case "wikivoyage":
      return "wikivoyage";
    case "wikisource":
      return "wikisource";
    case "wikibooks":
      return "wikibooks";
    case "wikiquote":
      return "wikiquote";
    case "wikinews":
      return "wikinews";
    case "wikiversity":
      return "wikiversity";
    case "commons":
      return "commons";
    case "wikidata":
      return "wikidata";
    case "meta":
    case "wikimedia":
      return "wikimedia";
    case "mediawiki":
      return "mediawiki";
    default:
      return "wikipedia";
  }
}
