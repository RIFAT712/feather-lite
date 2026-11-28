import type { Contest, PlatformOverview, StandingEntry, Article } from "@/lib/api";

export const MOCK_OVERVIEW: PlatformOverview = {
  totals: {
    words: 4829100,
    articles: 12480,
    submissions: 14920,
    people: 1840,
    wikis: 24,
    contests: 38,
  },
  month: {
    entries: 742,
    words: 318400,
    people: 196,
  },
  trend: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
    count: Math.max(4, Math.round(18 + Math.sin(i * 0.45) * 12 + (i % 5) * 3)),
  })),
};

export const MOCK_CONTESTS: Contest[] = [
  {
    id: 1,
    code: "bn-science-2026",
    name: "Bengali Wikipedia Science Edit-a-thon 2026",
    description:
      "Community writing drive expanding verified science, astronomy, and climate articles on Bengali Wikipedia.",
    wiki_dbname: "bnwiki",
    wiki_lang: "bn",
    wiki_url: "https://bn.wikipedia.org",
    wiki_tz: "Asia/Dhaka",
    start_date: new Date(Date.now() - 12 * 86400000).toISOString(),
    end_date: new Date(Date.now() + 18 * 86400000).toISOString(),
    status: "active",
    min_words: 300,
    min_bytes: 3000,
    total_articles: 412,
    accepted_articles: 289,
    pending_articles: 89,
    total_juries: 6,
    juries: ["Rifat", "Tahmid", "Nusrat", "Anik", "Sadia", "Karim"],
    organizers: ["Rifat", "Tahmid"],
  },
  {
    id: 2,
    code: "wiki-folklore-2026",
    name: "Wiki Loves Folklore South Asia 2026",
    description:
      "Multi-community campaign documenting regional folk traditions, festivals, and intangible heritage.",
    wiki_dbname: "metawiki",
    wiki_lang: "en",
    wiki_url: "https://meta.wikimedia.org",
    wiki_tz: "UTC",
    start_date: new Date(Date.now() - 5 * 86400000).toISOString(),
    end_date: new Date(Date.now() + 25 * 86400000).toISOString(),
    status: "active",
    is_umbrella: true,
    sub_contest_count: 8,
    min_words: 250,
    min_bytes: 2500,
    total_articles: 1290,
    accepted_articles: 940,
    pending_articles: 272,
    organizers: ["Rifat", "Mehedi"],
  },
  {
    id: 3,
    code: "en-women-stem",
    name: "Women in STEM Biography Drive",
    description:
      "Creating and improving biographies of notable women scientists, engineers, and mathematicians.",
    wiki_dbname: "enwiki",
    wiki_lang: "en",
    wiki_url: "https://en.wikipedia.org",
    wiki_tz: "UTC",
    start_date: new Date(Date.now() + 4 * 86400000).toISOString(),
    end_date: new Date(Date.now() + 34 * 86400000).toISOString(),
    status: "active",
    min_words: 400,
    min_bytes: 4000,
    total_articles: 0,
    accepted_articles: 0,
    total_juries: 4,
    organizers: ["Alex", "Sam"],
  },
  {
    id: 4,
    code: "bn-wikisource-proofread",
    name: "Bengali Wikisource Classic Proofread",
    description:
      "Digitizing and proofreading 19th-century Bengali literary works and historical journals.",
    wiki_dbname: "bnwikisource",
    wiki_lang: "bn",
    wiki_url: "https://bn.wikisource.org",
    wiki_tz: "Asia/Dhaka",
    start_date: new Date(Date.now() - 45 * 86400000).toISOString(),
    end_date: new Date(Date.now() - 10 * 86400000).toISOString(),
    status: "ended",
    min_words: 150,
    min_bytes: 1500,
    total_articles: 620,
    accepted_articles: 588,
    pending_articles: 0,
    total_juries: 5,
    organizers: ["Tahmid"],
  },
];

export const MOCK_STANDINGS: StandingEntry[] = [
  { rank: 1, username: "TanvirH", accepted_count: 24, submitted_count: 26, total_words: 18420, total_bytes: 194000 },
  { rank: 2, username: "NusratJahan", accepted_count: 19, submitted_count: 21, total_words: 14210, total_bytes: 151200 },
  { rank: 3, username: "ArafatWiki", accepted_count: 15, submitted_count: 18, total_words: 11340, total_bytes: 118900 },
  { rank: 4, username: "SadiaRahman", accepted_count: 12, submitted_count: 13, total_words: 9200, total_bytes: 96400 },
  { rank: 5, username: "MehediHasan", accepted_count: 9, submitted_count: 11, total_words: 6850, total_bytes: 72100 },
];

export const MOCK_ARTICLES: Article[] = [
  {
    id: 101,
    contest_id: 1,
    title: "James Webb Space Telescope",
    submitter_id: 1,
    submitter_username: "TanvirH",
    status: "accepted",
    word_count: 1240,
    byte_count: 14200,
    submitted_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 102,
    contest_id: 1,
    title: "Quantum Error Correction",
    submitter_id: 2,
    submitter_username: "NusratJahan",
    status: "pending",
    word_count: 860,
    byte_count: 9800,
    submitted_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 103,
    contest_id: 1,
    title: "Sundarbans Mangrove Ecology",
    submitter_id: 3,
    submitter_username: "ArafatWiki",
    status: "accepted",
    word_count: 940,
    byte_count: 10900,
    submitted_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 104,
    contest_id: 1,
    title: "CRISPR Gene Editing",
    submitter_id: 4,
    submitter_username: "SadiaRahman",
    status: "rejected",
    word_count: 210,
    byte_count: 2200,
    submitted_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

export interface SandboxCommunityStat {
  code: string;
  eventName: string;
  wikiName: string;
  wikiLang: string;
  participants: number;
  submitted: number;
  accepted: number;
  words: number;
  status: "active" | "ended";
}

export interface SandboxCrossWikiParticipant {
  username: string;
  wikis: number;
  submitted: number;
  accepted: number;
  words: number;
}

export const MOCK_COMMUNITY_STATS: SandboxCommunityStat[] = [
  { code: "id-folklore-2026", eventName: "Wiki Loves Folklore Indonesia 2026", wikiName: "Bahasa Indonesia Wikipedia", wikiLang: "id", participants: 45, submitted: 497, accepted: 310, words: 248900, status: "active" },
  { code: "de-folklore-2026", eventName: "Wiki Loves Folklore Deutschland 2026", wikiName: "Deutsch Wikipedia", wikiLang: "de", participants: 40, submitted: 437, accepted: 410, words: 389400, status: "active" },
  { code: "pt-folklore-2026", eventName: "Wiki Loves Folklore Brasil & Portugal", wikiName: "Português Wikipédia", wikiLang: "pt", participants: 18, submitted: 394, accepted: 293, words: 312100, status: "active" },
  { code: "bn-science-2026", eventName: "উইকিপিডিয়া এশীয় মাস ও লোকসংস্কৃতি ২০২৬", wikiName: "বাংলা উইকিপিডিয়া", wikiLang: "bn", participants: 24, submitted: 248, accepted: 196, words: 164200, status: "active" },
  { code: "en-folklore-2026", eventName: "Wiki Loves Folklore English 2026", wikiName: "English Wikipedia", wikiLang: "en", participants: 21, submitted: 186, accepted: 124, words: 118500, status: "active" },
  { code: "es-folklore-2026", eventName: "Wiki Loves Folklore en Español", wikiName: "Español Wikipedia", wikiLang: "es", participants: 20, submitted: 221, accepted: 142, words: 134800, status: "active" },
  { code: "ja-folklore-2026", eventName: "ウィキペディア・フォークロア 2026", wikiName: "日本語 Wikipedia", wikiLang: "ja", participants: 28, submitted: 167, accepted: 94, words: 86400, status: "active" },
  { code: "ar-folklore-2026", eventName: "ويكيبيديا الفولكلور ٢٠٢٦", wikiName: "العربية ويكيبيديا", wikiLang: "ar", participants: 15, submitted: 146, accepted: 118, words: 109300, status: "active" },
];

export const MOCK_CROSS_WIKI_PARTICIPANTS: SandboxCrossWikiParticipant[] = [
  { username: "Daniel G Rego", wikis: 1, submitted: 158, accepted: 138, words: 327252 },
  { username: "Kandarpajit Kallol", wikis: 4, submitted: 160, accepted: 112, words: 52302 },
  { username: "Intisar Ali", wikis: 1, submitted: 76, accepted: 76, words: 63943 },
  { username: "Rang Djambak", wikis: 2, submitted: 80, accepted: 66, words: 33213 },
  { username: "TanvirH", wikis: 2, submitted: 64, accepted: 59, words: 80163 },
  { username: "NusratJahan", wikis: 1, submitted: 61, accepted: 51, words: 23191 },
  { username: "César Aquino Bezerra", wikis: 1, submitted: 54, accepted: 51, words: 25070 },
  { username: "Afdhal Sy", wikis: 2, submitted: 34, accepted: 31, words: 13065 },
];

