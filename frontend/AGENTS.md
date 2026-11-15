<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Frontend Engineering Standards: Modern Web Guidance & Ponytail

## 1. Modern Web Platform Guidance (Google Chrome)
All frontend tasks in this application (HTML, CSS, client-side JS, animations, dialogs, forms, layout) must align with modern web platform standards:

* **Query Before Writing**: Run `modern-web-guidance search "<query>"` before writing custom modals, popovers, custom selects, complex layout calculations, or adding third-party packages.
* **Native Over Polyfill**:
  * **Dialogs & Modals**: Use native `<dialog>` with `.showModal()` and `::backdrop` rather than custom portal overlays.
  * **Tooltips & Popovers**: Use the HTML `popover` attribute and `popovertarget` API.
  * **Anchored Elements**: Use CSS Anchor Positioning (`anchor-name`, `position-anchor`) where appropriate.
  * **Layouts**: Prefer CSS Subgrid (`grid-template-columns: subgrid`) and Container Queries (`@container`) over JavaScript-driven resize handlers.
  * **Transitions**: Use native View Transitions (`document.startViewTransition`) for route/state changes.
* **Performance & Core Web Vitals**:
  * Optimize Interaction to Next Paint (INP) using `scheduler.yield()` for heavy tasks.
  * Use `content-visibility: auto` and `contain-intrinsic-size` for offscreen list sections.
  * Use `fetchpriority="high"` for above-the-fold images / LCP candidates.
* **Accessibility (a11y)**:
  * Strict semantic HTML elements (`<button>`, `<dialog>`, `<nav>`, `<main>`) before `<div>` + role.
  * Keyboard navigation and focus trapping managed via native dialog semantics.

## 2. Ponytail Mode (Lazy Senior Dev Discipline)
* **The Ladder of Restraint**:
  1. Does this need to be built at all? (YAGNI)
  2. Does it already exist in `src/components/` or `src/lib/`? Reuse existing components and utilities.
  3. Does standard HTML/CSS or React 19 standard library already do this?
  4. Does an installed package (`shadcn/ui`, `@tanstack/react-virtual`, `@tanstack/react-query`) cover it?
  5. Can this be one line? Make it one line.
  6. Only then: write the minimum code that works.
* **Deletion Over Addition**: Eliminate dead wrapper divs, redundant CSS classes, and speculative helper abstractions.
* **Root-Cause Fixes**: Grep and trace the real state/prop flow; do not patch UI bugs with band-aids like `z-index: 99999` or arbitrary `setTimeout`.
* **Shortcuts & Ceilings**: Document deliberate simplifications with a `// ponytail:` comment detailing the boundary.

