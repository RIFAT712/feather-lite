# Feather

A high-throughput, modern Wiki Article Contest Management & Judging Platform built from scratch for **Wikimedia** projects (Bengali Wikipedia, Wiktionary, Commons, Wikisource, and sister wikis).

Engineered specifically to handle **50,000+ entries** with sub-millisecond query response times, zero DOM lag, and a sleek modern interface.

* **Live on Wikimedia Toolforge:** [https://feather.toolforge.org](https://feather.toolforge.org)
* **License:** GNU General Public License v3.0 (GPL-3.0-or-later)

---

## Architecture Overview

```
├── backend/                  # High-throughput Go REST API service
│   ├── cmd/
│   │   ├── server/main.go    # Server entry point, chi router, CORS, graceful shutdown
│   │   └── benchmark/main.go # 50,000+ entries benchmark & performance suite
│   ├── internal/
│   │   ├── auth/             # JWT claims, cookie management (feather_token), steward/admin rights
│   │   ├── balancer/         # Scarcity-first jury load balancer
│   │   ├── config/           # Environment configuration loader (.env)
│   │   ├── database/         # Pure-Go SQLite WAL & MariaDB keyset engine
│   │   ├── mwclient/         # Real MediaWiki API client (OAuth 2.0, action=query, action=parse)
│   │   ├── models/           # Domain models & DTOs
│   │   ├── handlers/         # REST endpoints (auth, contests, keyset articles, preview, submit, review, standings)
│   │   └── worker/           # Throttled talk-page queue worker (1 edit per 3 seconds)
│   ├── go.mod
│   └── go.sum
│
├── frontend/                 # Next.js 16 + Tailwind CSS v4 + Base-UI / shadcn application
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx    # Root layout with modern Navbar, Footer & Query Provider
│   │   │   ├── page.tsx      # Active contests portal
│   │   │   ├── admin/        # Platform admin management
│   │   │   ├── license/      # Dedicated Open Source (GPL-3.0 & CC BY-SA 4.0) license page
│   │   │   ├── users/        # User profiles & global activity
│   │   │   └── contests/[code]/
│   │   │       ├── page.tsx  # Contest overview & participant leaderboard
│   │   │       ├── jury/     # Jury stats hub & queue redistribution
│   │   │       ├── review/   # Virtualized split-screen review queue with live MediaWiki preview
│   │   │       └── submit/   # Bulk article submission page with author validation
│   │   ├── components/
│   │   │   ├── layout/       # Navbar with dynamic Wikimedia OAuth session indicator & actions
│   │   │   └── ui/           # Base-UI primitive components (Card, Button, Badge, Table, Input, Textarea, Dialog)
│   │   ├── i18n/             # Translatewiki-compliant multilingual system (bn, en, qqq)
│   │   └── lib/api.ts        # Typed API client with credentials inclusion
│   └── package.json
│
├── LICENSE                   # GNU General Public License v3.0
├── AGENTS.md                 # System architecture & engineering guidelines
└── README.md
```

---

## 50,000+ Scale & Engineering Highlights

1. **Wikimedia OAuth 2.0 & Session Management:**
   - Authorization redirect: `https://meta.wikimedia.org/w/rest.php/oauth2/authorize`
   - Code-token exchange: `https://meta.wikimedia.org/w/rest.php/oauth2/access_token`
   - Profile retrieval: `https://meta.wikimedia.org/w/rest.php/oauth2/resource/profile`
   - Secure HTTP-only JWT cookies (`feather_token`) with role management (`owner`, `admin`, `jury`, `participant`).
   - Dynamic user session display in Navbar and automatic global steward/admin detection.

2. **Real MediaWiki API Integration (Zero Fake Placeholders):**
   - **Page Verification:** `action=query&prop=info|revisions&rvdir=newer&rvlimit=1` queries the true original page creator, creation timestamp, and byte length.
   - **Unicode Word Count:** Accurate Unicode word counter supporting Bengali and multi-script lexicons.
   - **Live Rendered HTML Preview:** `action=parse&prop=text` fetches the actual MediaWiki-rendered HTML and styles it for seamless review in the jury console.

3. **O(1) Keyset Pagination for 50k+ Rows:**  
   Replaced slow SQL `OFFSET` pagination with cursor-based keyset pagination (`WHERE (contest_id, id) < (?, ?) ORDER BY id DESC LIMIT ?`) backed by composite indexes (`idx_articles_contest_keyset`). Delivers consistent **< 1ms query speeds** even on 50,000+ entries.

4. **Virtualized 60 FPS Review Queue:**  
   Built with `@tanstack/react-virtual`. The browser renders only the ~15 rows visible in the viewport, allowing juries to scroll through thousands of articles smoothly without browser memory leaks or lag.

5. **Rapid Keyboard Shortcuts:**  
   Juries can rapidly review entries using keyboard hotkeys:
   - <kbd>A</kbd> — Accept
   - <kbd>R</kbd> — Reject
   - <kbd>S</kbd> — Skip
   - <kbd>C</kbd> — Focus Comment
   - <kbd>Q</kbd> — Toggle Queue Panel
   - <kbd>U</kbd> — Undo last review

6. **Wikimedia Rate-Limiting:**  
   Throttled background worker (`chan TalkPageJob`) running on a `time.Ticker(3s)` guarantees compliance with Wikimedia's 1-edit-per-3-seconds rule.

7. **Zero CGO Runtime:**  
   Uses `modernc.org/sqlite` (pure Go SQLite) with WAL mode for local zero-config development, and standard MariaDB drivers for Wikimedia Toolforge deployment.

---

## How to Run

### 1. Start the Go Backend (Port `8080`)
```powershell
cd "backend"
go run ./cmd/server
# Or run the compiled binary:
.\server.exe
```
> Automatically initializes `feather.db` in SQLite WAL mode with 50k composite indexes, loads Wikimedia OAuth credentials from `.env`, and seeds active contest `bnwiki26`.

### 2. Start the Next.js Frontend (Port `3000`)
```powershell
cd "frontend"
pnpm dev
```
> Open **http://localhost:3000** in your browser.
