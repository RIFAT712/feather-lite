# AGENTS.md — Feather

Welcome to **Feather** (`feather-lite`). This document outlines the system architecture, design invariants, operational workflows, and engineering guardrails for AI coding agents and human developers working in this repository.

---

## 1. Project Overview & Mission

**Feather** is an enterprise-grade, high-throughput Wiki Article Contest Management and Judging Platform built from scratch for **Wikimedia** projects (Bengali Wikipedia, English Wikipedia, Wiktionary, Commons, Wikisource, and sister wikis). It is engineered as a modern, high-performance, and user-friendly successor to Wikimedia Fountain.

### Primary Scale & Performance Target
* **50,000+ entries** per contest.
* **Sub-millisecond query response times** using composite indexes and cursor-based keyset pagination.
* **60 FPS zero-lag UI** using viewport virtualization (`@tanstack/react-virtual`).
* **Strict Wikimedia compliance**: 1 edit per 3 seconds rate-limiting, OAuth 2.0 token security, and accurate Bengali/multi-script Unicode word counting.
* **Unified Branding**: Always brand as **Feather** (never "Feather 2.0").

---

## 2. Repository Structure

```
├── backend/                       # Go REST API service
│   ├── cmd/
│   │   ├── server/main.go         # Entry point, Chi router, CORS, graceful shutdown
│   │   └── benchmark/main.go      # 50,000+ article benchmark & performance suite
│   ├── internal/
│   │   ├── auth/                  # JWT auth middleware, claims, global steward/admin detection
│   │   ├── balancer/              # Scarcity-first jury assignment algorithm
│   │   ├── config/                # Environment configuration loader (.env)
│   │   ├── database/              # Pure-Go SQLite WAL & MariaDB engine (schema.sql)
│   │   ├── handlers/              # Chi HTTP endpoints (auth, contests, articles, review, admin)
│   │   ├── models/                # Domain models, DTOs, and KeysetPaginationResult
│   │   ├── mwclient/              # Real MediaWiki Action API & OAuth 2.0 client
│   │   ├── wikitext/              # Wikitext cleaner and Unicode word count engine
│   │   └── worker/                # Throttled talk-page queue worker (1 edit / 3s)
│   ├── go.mod                     # Go module definitions
│   └── go.sum
│
├── frontend/                      # Next.js 16 + React 19 + Tailwind CSS v4 application
│   ├── src/
│   │   ├── app/                   # App Router pages and API routes
│   │   │   ├── layout.tsx         # Root layout with Navbar, Footer, and Query Provider
│   │   │   ├── page.tsx           # Active contests portal
│   │   │   ├── admin/             # Platform admin management portal
│   │   │   ├── license/           # Open source GPL-3.0 & CC BY-SA 4.0 license page
│   │   │   ├── users/             # User profiles & global activity
│   │   │   ├── contests/[code]/   # Contest dashboard & tabs (Articles, Leaderboard, Rules)
│   │   │   │   ├── jury/          # Jury stats hub & queue redistribution
│   │   │   │   ├── review/        # Split-pane review queue, keyboard shortcuts, diffs
│   │   │   │   ├── submit/        # Multi-check article submission modal
│   │   │   │   └── users/[user]/  # Contest-specific user contribution view
│   │   │   └── contests/new/      # Contest creation wizard
│   │   ├── components/
│   │   │   ├── contests/          # WikiSelector, TimezoneSelector
│   │   │   ├── icons/             # CodexIcons (Wikimedia design system icons)
│   │   │   ├── layout/            # Navbar, Footer, LanguageSwitcher
│   │   │   ├── users/             # UserBadge (role badges: Owner, Admin, Jury, Participant)
│   │   │   └── ui/                # Base-UI / shadcn primitives (Button, Card, Dialog, Table, etc.)
│   │   ├── i18n/                  # Translatewiki-compliant i18n (bn.json, en.json, qqq.json, etc.)
│   │   └── lib/                   # API client (api.ts), time helpers, wikis database
│   ├── package.json               # Dependencies and scripts
│   └── tsconfig.json
│
├── LICENSE                        # GNU General Public License v3.0 (GPL-3.0-or-later)
├── AGENTS.md                      # This guide for AI agents & developers
└── README.md                      # Public project documentation
```

---

## 3. Tech Stack & Dependencies

| Layer | Technology | Details / Rationale |
|---|---|---|
| **Backend Language** | Go 1.22+ | Compiled, low memory, high concurrency |
| **HTTP Router** | `go-chi/chi/v5` | Lightweight, idiomatic standard `net/http` compatibility |
| **Database Engine** | `modernc.org/sqlite` | **Zero CGO** SQLite with WAL mode for local dev; MariaDB driver for Toolforge |
| **Auth** | Wikimedia OAuth 2.0 + `golang-jwt/jwt/v5` | Secure HTTP-only `feather_token` cookie, Steward/Admin detection |
| **Frontend Framework** | Next.js 16.4+ (App Router) + React 19 | Server & Client components, modern web architecture |
| **Styling** | Tailwind CSS v4 + Base-UI / `shadcn` | Clean, modern, accessible interface |
| **State & Data Fetching** | `@tanstack/react-query` | Dynamic caching, invalidation, background revalidation |
| **Virtualization** | `@tanstack/react-virtual` | 60 FPS rendering for 50,000+ article tables |
| **Internationalization** | Custom Context + Translatewiki format | Synchronous `bn.json`, `en.json`, and `qqq.json` |

---

## 4. Development & Deployment Workflow

### Backend Commands (`backend/`)
```powershell
# Run the Go backend server (port 8080)
cd "backend"
go run ./cmd/server

# Run unit tests (balancer, wikitext, worker, etc.)
go test ./...

# Build Windows local binary
go build -o feather-server.exe ./cmd/server

# IMPORTANT: Compile Linux amd64 binaries for Toolforge deployment
# Whenever any backend Go code, models, or routes change, recompile both:
$env:CGO_ENABLED="0"; $env:GOOS="linux"; $env:GOARCH="amd64"
go build -ldflags="-s -w" -o feather-server-amd64 ./cmd/server
cp feather-server-amd64 feather-server-linux
```

### Frontend Commands (`frontend/`)
```powershell
# Install dependencies (use pnpm)
cd "frontend"
pnpm install

# Start development server (port 3000)
pnpm dev

# Typecheck source code
pnpm exec tsc --noEmit --incremental false

# Build production bundle
pnpm build
```

### Wikimedia Toolforge Deployment
Feather is deployed to Wikimedia Cloud Services (Toolforge) under tool `feather-lite`.
* **Live Toolforge URL**: `https://feather-lite.toolforge.org`
* **Source Repository**: `https://github.com/RIFAT712/feather-lite.git` (`main` branch)
* **Toolforge Build & Deploy**:
  ```bash
  # 1. Trigger build via SSH
  ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new login.toolforge.org \
    "become feather-lite toolforge build start https://github.com/RIFAT712/feather-lite.git"
  
  # 2. Restart webservice after successful build
  ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new login.toolforge.org \
    "become feather-lite toolforge webservice restart"
  ```

---

## 5. Architectural Guardrails & Invariants

All agents modifying code in this repository must uphold the following rules:

### A. Zero CGO Requirement
* The Go backend **MUST NOT** require CGO. Always use `modernc.org/sqlite` for local SQLite development.
* Do not introduce packages that depend on gcc/CGO compilers (e.g., `mattn/go-sqlite3` is prohibited).

### B. Keyset Cursor Pagination (O(1) at 50,000+ Rows)
* **NEVER use SQL `OFFSET` pagination** for articles, reviews, or log queries.
* Always use cursor-based keyset pagination:
  ```sql
  SELECT ... FROM articles
  WHERE contest_id = ? AND id < ?
  ORDER BY id DESC LIMIT ?;
  ```
* Leverage the composite indexes defined in `schema.sql`:
  * `idx_articles_contest_keyset ON articles(contest_id, id DESC)`
  * `idx_articles_contest_status ON articles(contest_id, status, id DESC)`
  * `idx_articles_jury_queue ON articles(contest_id, assigned_to_id, status, id DESC)`

### C. Wikimedia API & Rate-Limiting Guardrails
* **Talk Page Edit Throttle:** Wikimedia policy strictly requires bot edits to be throttled. All talk-page notification jobs MUST pass through `worker.TalkQueueWorker` using a `time.Ticker(3s)` (1 edit per 3 seconds max).
* **Edit Summary Standard:**
  * Clean single-link attribution: `[[:m:Feather|Feather]]`.
  * Localized by target wiki language (e.g., Bengali for `bnwiki`, English default for others).
  * Do not duplicate the tool name in edit summaries.
* **Real MediaWiki API Integration:**
  * Use real MediaWiki Action API endpoints (`action=query&prop=info|revisions`, `action=parse`, `action=compare`).
  * Never introduce fake mocked responses into production paths.
* **Accurate Unicode Bengali Counting:**
  * Wikitext must be stripped of templates, refs, comments, and opaque blocks before counting words (`internal/wikitext/wikitext.go`).
  * Unicode Bengali punctuation (`।`, `॥`, etc.) and multi-script boundaries must be preserved.

### D. Jury Load Balancing & Review Workflow
* **1:1 Feather Review Console (`/contests/[code]/review`):**
  * Exact 1:1 pixel-perfect port of Feather v1 (`ReviewQueue.vue` + `ReviewQueue.css`, originally deployed at `https://feather.toolforge.org/86be15/jury/review-v2`).
  * Utilizes `@wikimedia/codex` stylesheets and `@wikimedia/codex-icons` (`<CdxIcon />`) for native Wikimedia styling.
  * Desktop features: Resizable drawer (`--rq-panel-w`, 260px–640px, default 340px) with splitter handle, queue tabs (`Queue`, `Re-review`, `Other judges`), search filtering with diacritic normalization, bulk selection with shift-click ranges, sandboxed Wikipedia preview iframe with `LIGHT_CSS` & `COLLAPSIBLE_JS`, split-pane raw wikitext with copy-to-clipboard, flow progress bar (`X of Y judged · Z%`), and 2-second animated undo toast.
  * Mobile features: Fixed bottom docking with `.rq-decision-panel` positioned at `bottom: 60px` immediately above the 60px `.rq-mobile-nav`. 4-column compact touch actions (`Accept`, `Reject`, `Skip`, `Delete`) without obscuring the article preview. Tab switching between `Queue` (with badge count) and `Review`.
  * Top navigation bar and footer are hidden on the review route (`pathname.includes('/review')`) so the review console occupies the entire viewport (`100dvh`).
* **Scarcity-First Balancer:** Assignment of pending articles to juries is handled via `balancer.PlanScarcityFirst`.
* **Conflict of Interest (COI):** Juries must not review their own articles unless explicitly permitted by contest settings.
* **Review Locking:** Juries acquire a soft lock on an article (`acquireArticleLock`) while reviewing to prevent collision.
* **Keyboard Navigation:** Review screen supports rapid customizable keyboard shortcuts (`A` accept, `R` reject, `S` skip, `C` comment, `Q` queue toggle, `U` undo, `W` wikitext toggle, `↑/↓` arrow queue list navigation, `PgUp/PgDn`, `Space` toggle selection, `Ctrl+A` select all, `Enter` open focused article, `Esc` cancel/close, `/` or `?` shortcut modal).
* **Bulk Review & Bulk Delete API:** Go backend endpoints `POST /api/articles/bulk-review` and `POST /api/articles/bulk-delete` handle batched operations returning `succeeded` and `failed` lists.

### E. Translatewiki-Compliant i18n & `l10n` Branch Synchronization
* **No hardcoded text** in UI components.
* All user-facing strings must be localized using keys in `frontend/src/i18n/`:
  * `bn.json` — Bengali (idiomatic, natural, formal/polite).
  * `en.json` — English (canonical base messages).
  * `qqq.json` — Parameter descriptions and translator notes for Translatewiki.
* When adding a new key, update all three files synchronously with proper numeric placeholders (`$1`, `$2`) documented in `qqq.json`.
* **Mandatory `l10n` Branch Sync Invariant:**
  * The repository uses a pull-request localization workflow with Translatewiki.net (`Source branch: main`, `Push branch: l10n`).
  * Whenever any commit is pushed to `main` that touches i18n files, UI text, or source code, the `l10n` branch MUST be immediately synchronized with `main`:
    ```bash
    git checkout l10n
    git merge main
    git push origin l10n
    git checkout main
    ```
  * In addition, an automated GitHub Actions workflow (`.github/workflows/sync-l10n.yml`) automatically fast-forwards `l10n` on every push to `main` as a fail-safe.

### F. Global Rights & Auth Architecture
* **OAuth 2.0 Handshake:** Secure token exchange with Wikimedia Meta-Wiki.
* **Global Rights Recognition:** When fetching user rights, global steward, global sysop, and local admin rights must be recognized without requiring manual role overrides.
* **Dev Login Bypass:** When Wikimedia OAuth is unavailable locally, use `http://localhost:8080/auth/dev-login?username=YourUsername` to generate a valid JWT session cookie without going through Meta-Wiki.

### G. Clean "Feather" Branding
* Always brand the application simply as **Feather** (never "Feather 2.0" or "Feather New" in user-facing UI or copy).
* No version badge pills next to the logo in headers or footers.

### H. Next.js 16 & React 19 Standards (Server-Side Rendering SSR & Client Split)
* **Hybrid SSR Architecture:** Pages (`page.tsx`) MUST be Server Components without `"use client"`. They execute server-side data fetching (`getServerPlatformOverview`, `getServerContest`, `getServerMe`, `getServerContests`, `getServerUserProfile`, `getServerContestUserProfile` in `frontend/src/lib/server-api.ts`), generate dynamic SEO metadata (`generateMetadata()`), and pass pre-fetched data as `initialData` into interactive client components (`*Client.tsx`).
* **Covered SSR Routes:**
  * `/` (`page.tsx` -> `HomeClient.tsx`): Pre-fetches `getServerContests()` and `getServerPlatformOverview()`, completely eliminating skeleton flash on Platform Pulse metrics and daily activity sparkline.
  * `/contests/[code]` (`page.tsx` -> `ContestDashboardClient.tsx`): Pre-renders contest metadata, description, wiki details, and generates OpenGraph tags via `getServerContest()`.
  * `/contests/[code]/settings` (`page.tsx` -> `SettingsClient.tsx`): Pre-renders contest configuration and settings form.
  * `/contests/[code]/stats` (`page.tsx` -> `ContestStatsClient.tsx`): Pre-renders contest metadata, status counts, daily submission and judgment curves, and submitter standings.
  * `/contests/[code]/jury` (`page.tsx` -> `JuryHubClient.tsx`): Pre-fetches contest configuration and user auth session.
  * `/contests/[code]/review` (`page.tsx` -> `ReviewQueueClient.tsx`): Pre-fetches contest metadata and user auth session.
  * `/users/[username]` (`page.tsx` -> `UserGlobalProfileClient.tsx`): Pre-fetches user statistics via `getServerUserProfile()`.
  * `/contests/[code]/users/[username]` (`page.tsx` -> `ContestUserProfileClient.tsx`): Pre-fetches user contest contributions via `getServerContestUserProfile()`.
* **Zero-Stale-Data Invariant on Dynamic Management & Portal Routes:**
  * Dedicated settings and management pages (`/contests/[code]/settings`, `/`, `/contests/[code]/stats`) MUST declare `export const dynamic = "force-dynamic"` and `export const revalidate = 0`.
  * Server fetchers for editable entities (`getServerContest`, `getServerContests`) MUST use `cache: "no-store"` to prevent Next.js from caching stale entity snapshots.
  * Interactive queries in React Query (`useQuery`) that track contest states or listings MUST specify `initialDataUpdatedAt: 0`, `staleTime: 0`, and `refetchOnMount: "always"` to guarantee zero-latency live updates upon navigation.
  * All mutation handlers (e.g. `handleSaveSettings`) must call `router.refresh()` alongside React Query cache invalidation (`queryClient.invalidateQueries`) to bust Next.js client-side router caches.
* **Dual Route Resiliency:**
  * Contest update endpoints must support both `PUT /api/contests/{code}/settings` and `PUT /api/contests/{code}` in Chi router (`h.UpdateContest`), syncing both `status` and `is_draft`.
  * Client API caller `updateContest` in `frontend/src/lib/api.ts` must maintain automatic fallback to `PUT /contests/{code}` if `/settings` returns 404.
* **Interactive Client Components:** Use `"use client"` ONLY in leaf/interactive components (e.g. `JuryHubClient.tsx`, `ReviewQueueClient.tsx`, `HomeClient.tsx`, `SettingsClient.tsx`, `ContestDashboardClient.tsx`) that require state, browser event listeners, keyboard shortcuts, or React Query cache management.
* **Virtualization:** Table rows for contests with many submissions must use `@tanstack/react-virtual` to avoid rendering large numbers of DOM nodes.
* **Button Primitives:** Button primitives in this repo use `@base-ui/react/button` and do not support Radix `asChild`. Use `buttonVariants({ variant, size })` on links.
* **Modern Switch Toggles:** Option, threshold, and rule toggles across forms (Contest Settings, Contest Creation Wizard, Submit on Behalf) MUST use the accessible animated `<Switch />` primitive (`frontend/src/components/ui/switch.tsx`) built on `@base-ui/react/switch`. Never use raw native checkbox ticks for settings/rule toggles (multi-select batch lists such as Review Queue bulk selection retain standard item checkboxes).

### I. Modern Web Guidance (Google Chrome Platform Standards)
* Native primitives over heavy polyfills: `<dialog>` for modals, HTML `popover` for popovers, CSS Anchor Positioning, and View Transitions API.
* Core Web Vitals: Optimize INP with `scheduler.yield()`, prevent CLS, and use `content-visibility: auto` on lengthy DOM fragments.

### J. Ponytail Engineering Discipline (Lazy Senior Dev Mode)
* **The Principle:** Lazy means efficient and disciplined, not careless. The best code is code you never had to write.
* **Climb the Ladder Before Writing Code:**
  1. YAGNI: Does this feature or abstraction actually need to exist?
  2. Internal reuse: Does a helper, util, or component already exist in this repo?
  3. Standard library: Does Go stdlib or JS/Web standard library already do this?
  4. Native platform: Does SQLite, HTML5, or modern CSS solve it directly?
  5. Installed dependencies: Does an existing package (`chi`, `shadcn`, `@tanstack/react-query`) solve it?
  6. Concise code: Can it be a clean one-liner?
  7. Minimum working code: Write the shortest working diff once root cause is proven.
* **Anti-Bloat Invariants:** No unrequested abstractions, no speculative generic layers, no new dependencies without explicit necessity.
* **Shortcut Accountability:** Mark any intentional shortcut with a `// ponytail:` comment detailing the boundary and upgrade path.

### K. MCP Tooling & Diagnostic Protocol
* **Puppeteer MCP (`puppeteer`):**
  * Use `puppeteer_navigate`, `puppeteer_screenshot`, and `puppeteer_evaluate` to verify live deployments on Toolforge (`https://feather-lite.toolforge.org`), inspect rendered DOM trees, test inputs, and validate responsive layouts.
* **Ponytail MCP (`ponytail`):**
  * Channels senior developer discipline via `ponytail_instructions`. Enforce minimal working diffs, stdlib-first solutions, and prompt root-cause resolutions over symptomatic patches.
* **Context-Mode MCP (`context-mode`):**
  * Use `ctx_execute` / `ctx_stats` for processing large command outputs, log diagnostics, and audit outputs to avoid context bloat.
* **Shadcn MCP (`shadcn`):**
  * Leverage `get_audit_checklist`, registry searches, and accessible Base-UI component patterns.

### L. Contest Lifecycle & Analytics Architecture
* **Contest Soft-Delete & Restore:**
  * Deleting a contest MUST NEVER wipe submitted articles, jury evaluations, talk-page queue jobs, or historical records.
  * `DELETE /api/contests/{code}` and `DELETE /api/admin/contests/{code}` perform a non-destructive soft delete (`UPDATE contests SET status = 'deleted' WHERE id = ? OR parent_contest_id = ?`).
  * Soft-deleted contests are excluded from public discovery queries (`AND c.status != 'deleted'`), home page, and search, but are accessible to platform admins/owners in `/admin` with a "Restore" capability (`POST /api/contests/{code}/restore`).
* **Zury-Grade Statistics & Analytics (`/contests/[code]/stats` & `/statistics`):**
  * Provides a comprehensive Wikimedia contest analytics suite matching and exceeding Zury (`zury.toolforge.org`):
    * 4 Summary KPI cards: Submissions with word breakdown, Participants with active reviewers & reviews conducted, Judging Progress bar, and Article Survival rate (100% intact).
    * Submissions by Day Interactive SVG Chart with dual linear/log scale, series toggles, hover crosshair tooltips, drag-to-zoom, and 4-metric strip (Busiest day, Daily average, Active submission days, This week volume).
    * Top 10 Participants Horizontal Stacked Bar Chart (Accepted, Pending, Rejected segments and word counts).
    * Status & Word Distribution with Top Largest Articles list.
    * Cumulative Growth Chart over time (Total Words & Total Articles).
    * Reviewer / Jury Performance Table (Reviewer UserBadge, total reviews, accepted count, rejected count, acceptance rate % with visual mini-bar, active days, last review timestamp).
    * Submitter Standings preview table with direct link to leaderboard.

---

## 6. Database Schema Summary

Key tables in SQLite (`feather.db`) / MariaDB:

1. **`users`**: Wikimedia users (`wiki_username`, `role` = `participant` | `jury` | `admin` | `owner`, `oauth_access_token`).
2. **`contests`**: Contest configurations, rules (creator check, byte/word minimums, date windows, talk template options).
3. **`contest_juries`**: Association of users acting as juries for a contest.
4. **`contest_jury_restrictions`**: COI and submitter-jury restrictions.
5. **`articles`**: Submitted articles with verification metadata (`status` = `pending` | `accepted` | `rejected` | `validation_failed`, word/byte counts, assigned jury).
6. **`reviews`**: Jury decisions (`accepted`, `rejected`, `skipped`) with optional comments and timestamps.
7. **`talk_page_jobs`**: Throttled queue for writing talk page templates (`status` = `queued` | `processing` | `done` | `failed`, `retry_count`).

---

## 7. Git & Commit Guidelines

* **Do NOT commit local test binaries or databases:** Ensure `*.exe`, `*.db`, `*.db-wal`, and `*.db-shm` remain ignored.
* **Toolforge Precompiled Linux Binaries:** `backend/feather-server-amd64` and `backend/feather-server-linux` ARE tracked in Git because Toolforge's Buildpack pipeline relies on them via `start-toolforge.sh`. Always compile and commit both whenever backend Go code changes.
* **Keep commits clean and focused:** Write descriptive, conventional commit messages (`feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`).
* Keep `pnpm-lock.yaml` and `go.sum` consistent when adding dependencies.
