---
type: community
cohesion: 0.29
members: 7
---

# Server Entrypoint & Seeder

**Cohesion:** 0.29 - loosely connected
**Members:** 7 nodes

## Members
- [[Load()]] - code - backend/internal/config/config.go
- [[New()]] - code - backend/internal/handlers/handlers.go
- [[config.go]] - code - backend/internal/config/config.go
- [[go_pkg_github_com_joho_godotenv]] - concept
- [[go_pkg_os]] - concept
- [[main()_1]] - code - backend/cmd/server/main.go
- [[seedContest()]] - code - backend/cmd/server/main.go

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Server_Entrypoint__Seeder
SORT file.name ASC
```

## Connections to other communities
- 5 edges to [[_COMMUNITY_Backend Auth & JWT Session]]
- 4 edges to [[_COMMUNITY_Benchmark & Performance Suite]]
- 4 edges to [[_COMMUNITY_Backend HTTP Endpoints & Chi]]
- 2 edges to [[_COMMUNITY_Throttled Talk Queue Worker]]

## Top bridge nodes
- [[main()_1]] - degree 7, connects to 4 communities
- [[New()]] - degree 6, connects to 4 communities
- [[Load()]] - degree 4, connects to 2 communities
- [[seedContest()]] - degree 3, connects to 2 communities
- [[config.go]] - degree 4, connects to 1 community