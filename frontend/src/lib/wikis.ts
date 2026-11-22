import rawWikisData from "./wikimedia-wikis.json";

export interface WikiInfo {
  dbname: string;
  nativeName: string;
  englishName: string;
  lang: string;
  project: string;
  url: string;
  domain: string;
  icon?: string;
  timezone?: string;
}

/**
 * Maps Wikimedia project names or codes to local SVG icon assets.
 */
export function getWikiIcon(project?: string): string {
  const p = (project || "wiki").toLowerCase().trim();
  switch (p) {
    case "wiki":
    case "wikipedia":
      return "/icons/projects/wikipedia.svg";
    case "wiktionary":
      return "/icons/projects/wiktionary.svg";
    case "wikivoyage":
      return "/icons/projects/wikivoyage.svg";
    case "wikisource":
      return "/icons/projects/wikisource.svg";
    case "wikibooks":
      return "/icons/projects/wikibooks.svg";
    case "wikiquote":
      return "/icons/projects/wikiquote.svg";
    case "wikinews":
      return "/icons/projects/wikinews.svg";
    case "wikiversity":
      return "/icons/projects/wikiversity.svg";
    case "commons":
      return "/icons/projects/commons.svg";
    case "wikidata":
      return "/icons/projects/wikidata.svg";
    case "meta":
      return "/icons/projects/meta.svg";
    case "wikimedia":
      return "/icons/projects/wikimedia.svg";
    case "mediawiki":
      return "/icons/projects/mediawiki.svg";
    default:
      return "/icons/projects/wikipedia.svg";
  }
}

export interface ProjectMeta {
  id: string;
  name: string;
  nativeName: string;
  icon: string;
}

/**
 * Extracts friendly project identity, localized name, and icon from any dbname or project code.
 */
export function getProjectMeta(dbnameOrProject?: string): ProjectMeta {
  const raw = (dbnameOrProject || "wiki").toLowerCase().trim().replace(/[^a-z0-9]/g, "");

  if (raw === "wiktionary" || raw.endsWith("wiktionary")) {
    return {
      id: "wiktionary",
      name: "Wiktionary",
      nativeName: "উইকিঅভিধান",
      icon: "/icons/projects/wiktionary.svg",
    };
  }
  if (raw === "wikibooks" || raw.endsWith("wikibooks")) {
    return {
      id: "wikibooks",
      name: "Wikibooks",
      nativeName: "উইকিবই",
      icon: "/icons/projects/wikibooks.svg",
    };
  }
  if (raw === "wikisource" || raw.endsWith("wikisource")) {
    return {
      id: "wikisource",
      name: "Wikisource",
      nativeName: "উইকিসংকলন",
      icon: "/icons/projects/wikisource.svg",
    };
  }
  if (raw === "wikivoyage" || raw.endsWith("wikivoyage")) {
    return {
      id: "wikivoyage",
      name: "Wikivoyage",
      nativeName: "উইকিভ্রমণ",
      icon: "/icons/projects/wikivoyage.svg",
    };
  }
  if (raw === "wikiquote" || raw.endsWith("wikiquote")) {
    return {
      id: "wikiquote",
      name: "Wikiquote",
      nativeName: "উইকিউক্তি",
      icon: "/icons/projects/wikiquote.svg",
    };
  }
  if (raw === "wikinews" || raw.endsWith("wikinews")) {
    return {
      id: "wikinews",
      name: "Wikinews",
      nativeName: "উইকিসংবাদ",
      icon: "/icons/projects/wikinews.svg",
    };
  }
  if (raw === "wikiversity" || raw.endsWith("wikiversity")) {
    return {
      id: "wikiversity",
      name: "Wikiversity",
      nativeName: "উইকিবিশ্ববিদ্যালয়",
      icon: "/icons/projects/wikiversity.svg",
    };
  }
  if (raw === "commons" || raw === "commonswiki" || raw.endsWith("commons")) {
    return {
      id: "commons",
      name: "Commons",
      nativeName: "কমন্স",
      icon: "/icons/projects/commons.svg",
    };
  }
  if (raw === "wikidata" || raw === "wikidatawiki" || raw.endsWith("wikidata")) {
    return {
      id: "wikidata",
      name: "Wikidata",
      nativeName: "উইকিউপাত্ত",
      icon: "/icons/projects/wikidata.svg",
    };
  }
  if (raw === "meta" || raw === "metawiki" || raw === "wikimedia") {
    return {
      id: "meta",
      name: "Meta-Wiki",
      nativeName: "মেটা-উইকি",
      icon: "/icons/projects/meta.svg",
    };
  }
  if (raw === "mediawiki" || raw === "mediawikiwiki") {
    return {
      id: "mediawiki",
      name: "MediaWiki",
      nativeName: "মিডিয়াউইকি",
      icon: "/icons/projects/mediawiki.svg",
    };
  }
  return {
    id: "wikipedia",
    name: "Wikipedia",
    nativeName: "উইকিপিডিয়া",
    icon: "/icons/projects/wikipedia.svg",
  };
}

const LANGUAGE_NAMES: Record<string, { en: string; bn: string }> = {
  bn: { en: "Bengali", bn: "বাংলা" },
  en: { en: "English", bn: "ইংরেজি" },
  as: { en: "Assamese", bn: "অসমীয়া" },
  bpy: { en: "Bishnupriya", bn: "বিষ্ণুপ্রিয়া মণিপুরী" },
  hi: { en: "Hindi", bn: "হিন্দি" },
  ur: { en: "Urdu", bn: "উর্দু" },
  ta: { en: "Tamil", bn: "তামিল" },
  te: { en: "Telugu", bn: "তেলেগু" },
  ne: { en: "Nepali", bn: "নেপালি" },
  or: { en: "Odia", bn: "ওড়িয়া" },
  pa: { en: "Punjabi", bn: "পাঞ্জাবি" },
  fr: { en: "French", bn: "ফরাসি" },
  es: { en: "Spanish", bn: "স্প্যানিশ" },
  de: { en: "German", bn: "জার্মান" },
  ja: { en: "Japanese", bn: "জাপানি" },
  ar: { en: "Arabic", bn: "আরবি" },
  ru: { en: "Russian", bn: "রুশ" },
  zh: { en: "Chinese", bn: "চীনা" },
};

/**
 * Returns friendly human name for a language code (e.g. "bn" -> "Bengali" or "বাংলা").
 */
export function getLanguageName(code: string, locale: string = "en"): string {
  const c = code.toLowerCase().trim();
  const entry = LANGUAGE_NAMES[c];
  if (entry) {
    return locale === "bn" ? entry.bn : entry.en;
  }
  return c.toUpperCase();
}

// Curated priority order for initial recommendations
const PRIORITY_DBNAMES = [
  // Bengali priority
  "bnwiki",
  "bnwiktionary",
  "bnwikivoyage",
  "bnwikisource",
  "bnwikibooks",
  "bnwikiquote",
  // Regional South Asian
  "aswiki",
  "aswikisource",
  "bpywiki",
  "hiwiki",
  "hiwiktionary",
  "hiwikivoyage",
  "urwiki",
  "tawiki",
  "tewiki",
  "newiki",
  "orwiki",
  "pawiki",
  // Major International
  "enwiki",
  "enwiktionary",
  "enwikivoyage",
  "enwikibooks",
  "enwikisource",
  "commonswiki",
  "wikidatawiki",
  "metawiki",
  "eswiki",
  "frwiki",
  "dewiki",
  "jawiki",
  "arwiki",
];

// Load and sort all 860+ wikis from the Wikimedia database
export const ALL_WIKIS: WikiInfo[] = (() => {
  const list = rawWikisData as WikiInfo[];

  const priorityMap = new Map<string, number>();
  PRIORITY_DBNAMES.forEach((dbname, idx) => {
    priorityMap.set(dbname, idx);
  });

  return [...list].sort((a, b) => {
    const aPriority = priorityMap.has(a.dbname) ? (priorityMap.get(a.dbname) as number) : 9999;
    const bPriority = priorityMap.has(b.dbname) ? (priorityMap.get(b.dbname) as number) : 9999;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    // Priority for Bengali language
    if (a.lang === "bn" && b.lang !== "bn") return -1;
    if (b.lang === "bn" && a.lang !== "bn") return 1;

    return a.dbname.localeCompare(b.dbname);
  });
})();

// In-memory runtime cache that can be enriched dynamically
let runtimeWikis: WikiInfo[] = ALL_WIKIS;

/**
 * Searches the Wikimedia wikis catalog by keyword, dbname, language, or native name.
 * Directly searches 860+ Wikimedia wikis fetched from Wikimedia's official database.
 */
export function searchWikis(query: string): WikiInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    // Return curated priority suggestions
    return runtimeWikis.slice(0, 15);
  }

  // Filter matches from the official database
  const matches = runtimeWikis.filter((w) => {
    return (
      w.dbname.toLowerCase().includes(q) ||
      w.nativeName.toLowerCase().includes(q) ||
      w.englishName.toLowerCase().includes(q) ||
      w.lang.toLowerCase() === q ||
      w.domain.toLowerCase().includes(q)
    );
  });

  // If query resembles a synthetic wiki pattern like "svwikivoyage" or "kowiki"
  // but isn't explicitly in the catalog, generate an on-the-fly candidate
  const syntheticMatch = parseSyntheticWiki(q);
  if (syntheticMatch && !matches.some((w) => w.dbname === syntheticMatch.dbname)) {
    return [syntheticMatch, ...matches.slice(0, 30)];
  }

  return matches.slice(0, 30);
}

/**
 * Look up wiki metadata by database name (e.g. "bnwiktionary", "enwiki").
 */
export function getWikiInfo(dbname: string): WikiInfo | null {
  if (!dbname) return null;
  const match = runtimeWikis.find((w) => w.dbname.toLowerCase() === dbname.toLowerCase());
  if (match) return match;
  return parseSyntheticWiki(dbname);
}

/**
 * Dynamically fetches live Wikimedia sitematrix database from the backend or Meta-Wiki.
 * Automatically updates runtime cache and client localStorage.
 */
export async function fetchLiveWikimediaWikis(): Promise<WikiInfo[]> {
  try {
    const res = await fetch("/api/wikis");
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data: WikiInfo[] = await res.json();
    if (Array.isArray(data) && data.length > 50) {
      runtimeWikis = data;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("feather_live_wikis_v2", JSON.stringify(data));
        } catch {
          // LocalStorage quota safety
        }
      }
      return data;
    }
  } catch (err) {
    console.debug("[Wikis] Using bundled Wikimedia database:", err);
  }
  return runtimeWikis;
}

/**
 * Parses user input like "frwikivoyage", "bnwikibooks", or "plwiktionary" dynamically.
 */
export function parseSyntheticWiki(raw: string): WikiInfo | null {
  const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  const projects = [
    { suffix: "wikivoyage", proj: "wikivoyage", domainSuffix: "wikivoyage.org", en: "Wikivoyage", bn: "উইকিভ্রমণ" },
    { suffix: "wiktionary", proj: "wiktionary", domainSuffix: "wiktionary.org", en: "Wiktionary", bn: "উইকিঅভিধান" },
    { suffix: "wikisource", proj: "wikisource", domainSuffix: "wikisource.org", en: "Wikisource", bn: "উইকিসংকলন" },
    { suffix: "wikibooks", proj: "wikibooks", domainSuffix: "wikibooks.org", en: "Wikibooks", bn: "উইকিবই" },
    { suffix: "wikiquote", proj: "wikiquote", domainSuffix: "wikiquote.org", en: "Wikiquote", bn: "উইকিউক্তি" },
    { suffix: "wikinews", proj: "wikinews", domainSuffix: "wikinews.org", en: "Wikinews", bn: "উইকিসংবাদ" },
    { suffix: "wikiversity", proj: "wikiversity", domainSuffix: "wikiversity.org", en: "Wikiversity", bn: "উইকিবিশ্ববিদ্যালয়" },
    { suffix: "wiki", proj: "wiki", domainSuffix: "wikipedia.org", en: "Wikipedia", bn: "উইকিপিডিয়া" },
  ];

  for (const p of projects) {
    if (clean.endsWith(p.suffix) && clean.length > p.suffix.length) {
      const lang = clean.slice(0, clean.length - p.suffix.length);
      if (/^[a-z]{2,7}$/.test(lang)) {
        return {
          dbname: `${lang}${p.suffix}`,
          nativeName: `${lang.toUpperCase()} ${p.bn}`,
          englishName: `${lang.toUpperCase()} ${p.en}`,
          lang: lang,
          project: p.proj,
          url: `https://${lang}.${p.domainSuffix}`,
          domain: `${lang}.${p.domainSuffix}`,
          icon: getWikiIcon(p.proj),
        };
      }
    }
  }

  return null;
}

/**
 * Resolves an on-wiki contest page URL or title to a clean, clickable Wikimedia URL.
 * Handles full URLs (https://...) as well as page titles (e.g. "Wikipedia:উইকিটেশব প্রতিযোগিতা ২০২৬").
 */
export function getOnwikiPageLink(onwikiPageUrl?: string, wikiUrl?: string): string {
  const trimmed = (onwikiPageUrl || "").trim();
  const baseWiki = (wikiUrl || "https://meta.wikimedia.org").trim();
  const formattedBase = baseWiki.startsWith("http://") || baseWiki.startsWith("https://")
    ? baseWiki.replace(/\/+$/, "")
    : `https://${baseWiki.replace(/\/+$/, "")}`;

  if (!trimmed) {
    return formattedBase;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Treat as on-wiki title
  const cleanTitle = trimmed.replace(/^\/+/, "").replace(/^wiki\//i, "").replace(/ /g, "_");
  const encodedPath = encodeURI(cleanTitle);
  return `${formattedBase}/wiki/${encodedPath}`;
}
