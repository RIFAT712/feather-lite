# Graph Report - Feather New  (2026-11-15)

## Corpus Check
- 81 files · ~97,495 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .ico 1, .css 1)

## Summary
- 458 nodes · 1049 edges · 21 communities (18 shown, 3 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 69 edges (avg confidence: 0.55)
- Token cost: 1,250 input · 850 output

## Community Hubs (Navigation)
- Frontend Contest & Review UI
- Backend Auth & JWT Session
- Wikimedia Sister Wikis & API
- Frontend Linting & Tooling
- Scarcity-First Jury Balancer
- shadcn Component Registry
- Backend HTTP Endpoints & Chi
- Codex Icons & Translatewiki i18n
- TypeScript Compiler Options
- Next.js Root Layout & Fonts
- Frontend Runtime Dependencies
- Benchmark & Performance Suite
- Throttled Talk Queue Worker
- Wikitext & Unicode Word Count
- Keyset Models & DTOs
- Zero-CGO SQLite WAL Database
- Server Entrypoint & Seeder
- Contest Creation Wizard & Time
- Next.js Configuration
- Backend Module Definition

## God Nodes (most connected - your core abstractions)
1. `react` - 23 edges
2. `Handler` - 21 edges
3. `cn` - 17 edges
4. `lucide-react` - 17 edges
5. `useI18n()` - 17 edges
6. `DB` - 16 edges
7. `compilerOptions` - 16 edges
8. `Scarcity-First Jury Load Balancer` - 16 edges
9. `jsonResponse()` - 15 edges
10. `Keyset Cursor Pagination (O(1) at 50k+ Rows)` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Keyset Cursor Pagination (O(1) at 50k+ Rows)` --implements--> `$schema`  [INFERRED]
  AGENTS.md → frontend/components.json
- `Scarcity-First Jury Load Balancer` --implements--> `benchmarkJuryBalancer()`  [INFERRED]
  AGENTS.md → backend/cmd/benchmark/main.go
- `Scarcity-First Jury Load Balancer` --implements--> `juryLoad`  [INFERRED]
  AGENTS.md → backend/internal/balancer/balancer.go
- `Keyset Cursor Pagination (O(1) at 50k+ Rows)` --implements--> `DB`  [INFERRED]
  AGENTS.md → backend/internal/database/db.go
- `Keyset Cursor Pagination (O(1) at 50k+ Rows)` --implements--> `Connect()`  [INFERRED]
  AGENTS.md → backend/internal/database/db.go

## Import Cycles
- None detected.

## Communities (21 total, 3 thin omitted)

### Community 0 - "Frontend Contest & Review UI"
Cohesion: 0.06
Nodes (75): ContestDashboardPage(), ReviewQueuePage(), SubmitArticlesPage(), HomePage(), SortOption, WikimediaLogoIcon(), Footer(), LanguageSwitcher() (+67 more)

### Community 1 - "Backend Auth & JWT Session"
Cohesion: 0.11
Nodes (33): Claims, contextKey, ClearAuthCookie(), GenerateToken(), GetUser(), GetUserFromRequest(), Middleware(), ParseToken() (+25 more)

### Community 2 - "Wikimedia Sister Wikis & API"
Cohesion: 0.12
Nodes (33): Wikimedia Sister Wiki Brand Assets, Keyset Cursor Pagination (O(1) at 50k+ Rows), fetchWikimediaDbTimezones(), GET(), getProjectIconName(), revalidate, GET(), revalidate (+25 more)

### Community 3 - "Frontend Linting & Tooling"
Cohesion: 0.06
Nodes (33): eslintConfig, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/turbopack, @types/node, @types/react (+25 more)

### Community 4 - "Scarcity-First Jury Balancer"
Cohesion: 0.15
Nodes (16): ArticleItem, PlanScarcityFirst(), TestPlanScarcityFirstEqualDistribution(), TestPlanScarcityFirstPreventsJuryStarvation(), group, juryLoad, minHeap, Feather 2.0 Architecture & Guardrails (+8 more)

### Community 5 - "shadcn Component Registry"
Cohesion: 0.09
Nodes (22): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+14 more)

### Community 6 - "Backend HTTP Endpoints & Chi"
Cohesion: 0.11
Nodes (19): generateContestCode(), go_pkg_crypto_rand, go_pkg_encoding_hex, go_pkg_encoding_json, go_pkg_feather_backend_internal_auth, go_pkg_feather_backend_internal_balancer, go_pkg_feather_backend_internal_database, go_pkg_feather_backend_internal_handlers (+11 more)

### Community 7 - "Codex Icons & Translatewiki i18n"
Cohesion: 0.13
Nodes (11): CodexLanguageIcon(), LanguageOption, LANGUAGES, DropdownMenu(), DropdownMenuContent(), DropdownMenuGroup(), DropdownMenuItem(), DropdownMenuLabel() (+3 more)

### Community 8 - "TypeScript Compiler Options"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 9 - "Next.js Root Layout & Fonts"
Cohesion: 0.13
Nodes (13): frontend_src_app_globals, geistMono, geistSans, metadata, Providers(), Toaster(), frontend_src_i18n_bn, frontend_src_i18n_en (+5 more)

### Community 10 - "Frontend Runtime Dependencies"
Cohesion: 0.12
Nodes (16): dependencies, @base-ui/react, class-variance-authority, clsx, cn, lucide-react, next, next-themes (+8 more)

### Community 11 - "Benchmark & Performance Suite"
Cohesion: 0.30
Nodes (14): benchmarkFilteredQueries(), benchmarkJuryBalancer(), benchmarkKeysetPagination(), benchmarkKeysetVsOffset(), benchmarkStandingsAggregation(), ensureTestUsers(), explainQueryPlans(), getOrCreateBenchmarkContest() (+6 more)

### Community 12 - "Throttled Talk Queue Worker"
Cohesion: 0.25
Nodes (10): TalkPageJob, TalkQueueWorker, NewTalkQueueWorker(), Wikimedia Compliance & Throttled Bot Queue, go_pkg_context, go_pkg_feather_backend_internal_models, go_pkg_log, go_pkg_sync (+2 more)

### Community 13 - "Wikitext & Unicode Word Count"
Cohesion: 0.23
Nodes (12): CleanWikitext(), CountPlaintextWords(), CountRefs(), CountWords(), HasWordToken(), IsScriptioContinua(), StripTemplates(), TestWikitextCleaningAndCounting() (+4 more)

### Community 14 - "Keyset Models & DTOs"
Cohesion: 0.24
Nodes (10): parseFlexibleDate(), KeysetPaginationResult, User, go_pkg_time, time.Time, Article, Contest, CreateContestRequest (+2 more)

### Community 16 - "Zero-CGO SQLite WAL Database"
Cohesion: 0.25
Nodes (7): go_pkg_database_sql, go_pkg_embed, go_pkg_feather_backend_internal_config, go_pkg_fmt, go_pkg_github_com_go_sql_driver_mysql, go_pkg_modernc_org_sqlite, go_pkg_path_filepath

### Community 17 - "Server Entrypoint & Seeder"
Cohesion: 0.29
Nodes (6): main(), seedContest(), Load(), New(), go_pkg_github_com_joho_godotenv, go_pkg_os

### Community 18 - "Contest Creation Wizard & Time"
Cohesion: 0.48
Nodes (6): NewContestPage(), createContest(), calculateEndOfDay(), fetchWikiSiteinfo(), getBeginningOfDay(), getTodayDateString()

## Knowledge Gaps
- **104 isolated node(s):** `feather-backend`, `contextKey`, `BulkSubmitRequest`, `ReviewDecisionRequest`, `CreateContestRequest` (+99 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 158 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Keyset Cursor Pagination (O(1) at 50k+ Rows)` connect `Wikimedia Sister Wikis & API` to `Frontend Contest & Review UI`, `Scarcity-First Jury Balancer`, `shadcn Component Registry`, `Benchmark & Performance Suite`, `Keyset Models & DTOs`, `Zero-CGO SQLite WAL Database`?**
  _High betweenness centrality (0.493) - this node is a cross-community bridge._
- **Why does `react` connect `Frontend Contest & Review UI` to `Wikimedia Sister Wikis & API`, `Frontend Linting & Tooling`, `Codex Icons & Translatewiki i18n`, `Next.js Root Layout & Fonts`, `Sheet & Drawer Navigation`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Why does `DB` connect `Benchmark & Performance Suite` to `Backend Auth & JWT Session`, `Wikimedia Sister Wikis & API`, `Keyset Models & DTOs`, `Zero-CGO SQLite WAL Database`, `Server Entrypoint & Seeder`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Are the 24 inferred relationships involving `Wikimedia Sister Wiki Brand Assets` (e.g. with `wikis/route.ts` and `GET()`) actually correct?**
  _`Wikimedia Sister Wiki Brand Assets` has 24 INFERRED edges - model-reasoned connections that need verification._
- **What connects `feather-backend`, `contextKey`, `BulkSubmitRequest` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Contest & Review UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06316831683168317 - nodes in this community are weakly interconnected._
- **Should `Backend Auth & JWT Session` be split into smaller, more focused modules?**
  _Cohesion score 0.10857142857142857 - nodes in this community are weakly interconnected._