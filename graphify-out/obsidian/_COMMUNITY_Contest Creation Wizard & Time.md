---
type: community
cohesion: 0.48
members: 7
---

# Contest Creation Wizard & Time

**Cohesion:** 0.48 - moderately connected
**Members:** 7 nodes

## Members
- [[NewContestPage()]] - code - frontend/src/app/contests/new/page.tsx
- [[calculateEndOfDay()]] - code - frontend/src/lib/time.ts
- [[createContest()]] - code - frontend/src/lib/api.ts
- [[fetchWikiSiteinfo()]] - code - frontend/src/lib/time.ts
- [[getBeginningOfDay()]] - code - frontend/src/lib/time.ts
- [[getTodayDateString()]] - code - frontend/src/lib/time.ts
- [[time.ts]] - code - frontend/src/lib/time.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Contest_Creation_Wizard__Time
SORT file.name ASC
```

## Connections to other communities
- 8 edges to [[_COMMUNITY_Frontend Contest & Review UI]]
- 3 edges to [[_COMMUNITY_Wikimedia Sister Wikis & API]]

## Top bridge nodes
- [[time.ts]] - degree 7, connects to 2 communities
- [[fetchWikiSiteinfo()]] - degree 4, connects to 2 communities
- [[NewContestPage()]] - degree 6, connects to 1 community
- [[calculateEndOfDay()]] - degree 4, connects to 1 community
- [[getBeginningOfDay()]] - degree 4, connects to 1 community