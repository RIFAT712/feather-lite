---
type: community
cohesion: 0.11
members: 21
---

# Backend HTTP Endpoints & Chi

**Cohesion:** 0.11 - loosely connected
**Members:** 21 nodes

## Members
- [[BulkSubmitRequest]] - code - backend/internal/handlers/handlers.go
- [[ReviewDecisionRequest]] - code - backend/internal/handlers/handlers.go
- [[generateContestCode()]] - code - backend/internal/handlers/handlers.go
- [[go_pkg_crypto_rand]] - concept
- [[go_pkg_encoding_hex]] - concept
- [[go_pkg_encoding_json]] - concept
- [[go_pkg_feather_backend_internal_auth]] - concept
- [[go_pkg_feather_backend_internal_balancer]] - concept
- [[go_pkg_feather_backend_internal_database]] - concept
- [[go_pkg_feather_backend_internal_handlers]] - concept
- [[go_pkg_feather_backend_internal_mwclient]] - concept
- [[go_pkg_feather_backend_internal_worker]] - concept
- [[go_pkg_github_com_go_chi_chi_v5]] - concept
- [[go_pkg_github_com_go_chi_chi_v5_middleware]] - concept
- [[go_pkg_github_com_go_chi_cors]] - concept
- [[go_pkg_net_http]] - concept
- [[go_pkg_os_signal]] - concept
- [[go_pkg_strconv]] - concept
- [[go_pkg_syscall]] - concept
- [[handlers.go]] - code - backend/internal/handlers/handlers.go
- [[servermain.go]] - code - backend/cmd/server/main.go

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Backend_HTTP_Endpoints__Chi
SORT file.name ASC
```

## Connections to other communities
- 7 edges to [[_COMMUNITY_Backend Auth & JWT Session]]
- 5 edges to [[_COMMUNITY_Zero-CGO SQLite WAL Database]]
- 4 edges to [[_COMMUNITY_Server Entrypoint & Seeder]]
- 4 edges to [[_COMMUNITY_Throttled Talk Queue Worker]]
- 3 edges to [[_COMMUNITY_Keyset Models & DTOs]]
- 2 edges to [[_COMMUNITY_Benchmark & Performance Suite]]
- 1 edge to [[_COMMUNITY_Wikitext & Unicode Word Count]]

## Top bridge nodes
- [[handlers.go]] - degree 26, connects to 6 communities
- [[servermain.go]] - degree 18, connects to 4 communities
- [[go_pkg_net_http]] - degree 4, connects to 1 community
- [[go_pkg_feather_backend_internal_database]] - degree 3, connects to 1 community
- [[generateContestCode()]] - degree 2, connects to 1 community