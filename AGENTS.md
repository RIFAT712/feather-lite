# AGENTS.md — Feather 2.0 (Feather New)

Welcome to **Feather 2.0** (`Feather New`). This document outlines the system architecture, design invariants, operational workflows, and engineering guardrails for AI coding agents and human developers working in this repository.

---

## 1. Project Overview & Mission

**Feather 2.0** is an enterprise-grade, high-throughput Wiki Article Contest Management and Judging Platform built from scratch for **Wikimedia** projects (Bengali Wikipedia, Wiktionary, Commons, Wikisource, and sister wikis). It is engineered as a modern, high-performance successor to Wikimedia Fountain.

### Primary Scale & Performance Target
* **50,000+ entries** per contest.
* **Sub-millisecond query response times** using composite indexes and cursor-based keyset pagination.
* **60 FPS zero-lag UI** using viewport virtualization (`@tanstack/react-virtual`).
* **Strict Wikimedia compliance**: 1 edit per 3 seconds rate-limiting, OAuth 2.0 token security, and accurate Bengali/multi-script Unicode word counting.

---

## 2. Repository Structure

```
D:\WikiTools\Feather New\
├── backend/                       # Go REST API service
│   ├── cmd/server/main.go         # Entry point, Chi router, CORS, graceful shutdown
│   ├── internal/
│   │   ├── auth/                  # JWT auth middleware, claims, cookie management
│   │   ├── balancer/              # Scarcity-first jury assignment algorithm
│   │   ├── config/                # Environment configuration loader (.env)
│   │   ├── database/              # Pure-Go SQLite WAL & MariaDB engine (schema.sql)
│   │   ├── handlers/              # Chi HTTP endpoints (auth, contests, articles, review)
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
│   │   │   ├── contests/[code]/   # Contest dashboard, leaderboard, submit, review
│   │   │   └── contests/new/      # Contest creation wizard
│   │   ├── components/
│   │   │   ├── contests/          # WikiSelector, TimezoneSelector
│   │   │   ├── icons/             # CodexIcons (Wikimedia design system icons)
│   │   │   ├── layout/            # Navbar, Footer, LanguageSwitcher
│   │   │   └── ui/                # shadcn primitives (Button, Card, Dialog, Table, etc.)
│   │   ├── i18n/                  # Translatewiki-compliant i18n (bn.json, en.json, qqq.json)
│   │   └── lib/                   # API client (api.ts), time helpers, wikis database
│   ├── package.json               # Dependencies and scripts
│   └── tsconfig.json
│
├── .gitignore                     # Ignores *.exe, *.db, *.db-wal, node_modules, .env
├── AGENTS.md                      # This guide for AI agents
└── README.md                      # Public project documentation
```

---

## 3. Tech Stack & Dependencies

| Layer | Technology | Details / Rationale |
|---|---|---|
| **Backend Language** | Go 1.22+ | Compiled, low memory, high concurrency |
| **HTTP Router** | `go-chi/chi/v5` | Lightweight, idiomatic standard `net/http` compatibility |
| **Database Engine** | `modernc.org/sqlite` | **Zero CGO** SQLite with WAL mode for local dev; MariaDB driver for Toolforge |
| **Auth** | Wikimedia OAuth 2.0 + `golang-jwt/jwt/v5` | Secure HTTP-only `feather_token` cookie |
| **Frontend Framework** | Next.js 16.4+ (App Router) + React 19 | Server & Client components, modern web architecture |
| **Styling** | Tailwind CSS v4 + `shadcn/ui` | Clean, modern, accessible interface |
| **State & Data Fetching** | `@tanstack/react-query` | Dynamic caching, invalidation, background revalidation |
| **Virtualization** | `@tanstack/react-virtual` | 60 FPS rendering for 50,000+ article tables |
| **Internationalization** | Custom Context + Translatewiki format | Standardized `bn.json`, `en.json`, and `qqq.json` |

---

## 4. Development Workflow & Commands

### Backend Commands (`backend/`)
```powershell
# Run the Go backend server (port 8080)
cd "D:\WikiTools\Feather New\backend"
go run ./cmd/server

# Run unit tests (balancer, wikitext, etc.)
go test ./...

# Build binary
go build -o feather-server.exe ./cmd/server
```

### Frontend Commands (`frontend/`)
```powershell
# Install dependencies (use pnpm)
cd "D:\WikiTools\Feather New\frontend"
pnpm install

# Start development server (port 3000)
pnpm dev

# Build production bundle
pnpm build

# Lint source code
pnpm lint
```

### Development Bypass & Testing
* **Dev Login Bypass:** When Wikimedia OAuth is unavailable locally, use `http://localhost:8080/auth/dev-login?username=YourUsername` to automatically generate a valid JWT session cookie without going through Meta-Wiki.
* **Port Setup:**
  * Backend: `http://localhost:8080`
  * Frontend: `http://localhost:3000`

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
* **Talk Page Edit Throttle:** Wikimedia policy requires bot edits to be throttled. All talk-page notification jobs MUST pass through `worker.TalkQueueWorker` using a `time.Ticker(3s)` (1 edit per 3 seconds max).
* **Real MediaWiki API Integration:**
  * Use real MediaWiki Action API endpoints (`action=query&prop=info|revisions`, `action=parse`).
  * Never introduce fake mocked responses into production paths.
* **Accurate Unicode Bengali Counting:**
  * Wikitext must be stripped of templates, refs, comments, and opaque blocks before counting words (`internal/wikitext/wikitext.go`).
  * Unicode Bengali punctuation (`।`, `॥`, etc.) and multi-script boundaries must be preserved.

### D. Jury Load Balancing & Scarcity-First Allocation
* The assignment of pending articles to juries is handled via `balancer.PlanScarcityFirst`.
* When implementing jury rules:
  * Prevent Conflict of Interest (COI) — juries must not review their own articles unless explicitly permitted.
  * Allocate the most constrained articles first (scarcity-first min-heap) to avoid jury starvation.

### E. Translatewiki-Compliant i18n
* **No hardcoded text** in UI components.
* All user-facing strings must be localized using keys in `frontend/src/i18n/`:
  * `bn.json` — Bengali (idiomatic, natural, formal/polite).
  * `en.json` — English (clean, modern interface English).
  * `qqq.json` — Parameter descriptions and translator notes for Translatewiki.
* When adding a new key, update all three files synchronously.

### F. Next.js 16 & React 19 Standards
* Respect `frontend/AGENTS.md` regarding breaking changes in Next.js 16 / React 19.
* Use Server Components where possible; use `"use client"` only for interactive components (hooks, state, event handlers).
* Table rows for contests with many submissions must use `@tanstack/react-virtual` to avoid rendering large numbers of DOM nodes.

---

## 6. Database Schema Summary

Key tables in SQLite (`feather.db`) / MariaDB:

1. **`users`**: Wikimedia users (`wiki_username`, `role` = `participant` | `jury` | `owner`, `oauth_access_token`).
2. **`contests`**: Contest configurations, rules (creator check, byte/word minimums, date windows, talk template options).
3. **`contest_juries`**: Association of users acting as juries for a contest.
4. **`contest_jury_restrictions`**: COI and submitter-jury restrictions.
5. **`articles`**: Submitted articles with verification metadata (`status` = `pending` | `accepted` | `rejected` | `validation_failed`, word/byte counts, assigned jury).
6. **`reviews`**: Jury decisions (`accepted`, `rejected`, `skipped`) with optional comments.
7. **`talk_page_jobs`**: Throttled queue for writing talk page templates.

---

## 7. Git & Commit Guidelines

* **Do NOT commit binary files or databases:** Ensure `*.exe`, `*.db`, `*.db-wal`, and `*.db-shm` remain ignored.
* **Keep commits clean and focused:** Write descriptive, conventional commit messages (`feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`).
* Keep `pnpm-lock.yaml` and `go.sum` consistent when adding dependencies.
