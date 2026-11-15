---
type: community
cohesion: 0.24
members: 12
---

# Keyset Models & DTOs

**Cohesion:** 0.24 - loosely connected
**Members:** 12 nodes

## Members
- [[dot-GetArticlesKeyset()]] - code - backend/internal/database/db.go
- [[Article]] - code - backend/internal/models/models.go
- [[Contest]] - code - backend/internal/models/models.go
- [[CreateContestRequest]] - code - backend/internal/models/models.go
- [[KeysetPaginationResult]] - code - backend/internal/models/models.go
- [[Review]] - code - backend/internal/models/models.go
- [[StandingEntry]] - code - backend/internal/models/models.go
- [[User]] - code - backend/internal/models/models.go
- [[go_pkg_time]] - concept
- [[models.go]] - code - backend/internal/models/models.go
- [[parseFlexibleDate()]] - code - backend/internal/handlers/handlers.go
- [[time.Time]] - code

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Keyset_Models__DTOs
SORT file.name ASC
```

## Connections to other communities
- 5 edges to [[_COMMUNITY_Backend Auth & JWT Session]]
- 3 edges to [[_COMMUNITY_Backend HTTP Endpoints & Chi]]
- 3 edges to [[_COMMUNITY_Throttled Talk Queue Worker]]
- 2 edges to [[_COMMUNITY_Benchmark & Performance Suite]]
- 1 edge to [[_COMMUNITY_Zero-CGO SQLite WAL Database]]
- 1 edge to [[_COMMUNITY_Wikimedia Sister Wikis & API]]

## Top bridge nodes
- [[go_pkg_time]] - degree 8, connects to 5 communities
- [[time.Time]] - degree 7, connects to 2 communities
- [[parseFlexibleDate()]] - degree 3, connects to 2 communities
- [[dot-GetArticlesKeyset()]] - degree 3, connects to 2 communities
- [[models.go]] - degree 9, connects to 1 community