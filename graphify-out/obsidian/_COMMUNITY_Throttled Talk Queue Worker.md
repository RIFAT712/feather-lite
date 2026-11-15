---
type: community
cohesion: 0.25
members: 14
---

# Throttled Talk Queue Worker

**Cohesion:** 0.25 - loosely connected
**Members:** 14 nodes

## Members
- [[dot-Enqueue()]] - code - backend/internal/worker/worker.go
- [[dot-Start()]] - code - backend/internal/worker/worker.go
- [[dot-processJob()]] - code - backend/internal/worker/worker.go
- [[NewTalkQueueWorker()]] - code - backend/internal/worker/worker.go
- [[TalkPageJob]] - code - backend/internal/models/models.go
- [[TalkQueueWorker]] - code - backend/internal/worker/worker.go
- [[Wikimedia Compliance & Throttled Bot Queue]] - document - AGENTS.md
- [[context.Context]] - code
- [[go_pkg_context]] - concept
- [[go_pkg_feather_backend_internal_models]] - concept
- [[go_pkg_log]] - concept
- [[go_pkg_sync]] - concept
- [[sync.Mutex]] - code
- [[worker.go]] - code - backend/internal/worker/worker.go

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Throttled_Talk_Queue_Worker
SORT file.name ASC
```

## Connections to other communities
- 5 edges to [[_COMMUNITY_Backend Auth & JWT Session]]
- 4 edges to [[_COMMUNITY_Backend HTTP Endpoints & Chi]]
- 3 edges to [[_COMMUNITY_Keyset Models & DTOs]]
- 2 edges to [[_COMMUNITY_Server Entrypoint & Seeder]]
- 2 edges to [[_COMMUNITY_Zero-CGO SQLite WAL Database]]
- 1 edge to [[_COMMUNITY_Benchmark & Performance Suite]]
- 1 edge to [[_COMMUNITY_Scarcity-First Jury Balancer]]

## Top bridge nodes
- [[go_pkg_log]] - degree 5, connects to 3 communities
- [[go_pkg_feather_backend_internal_models]] - degree 4, connects to 3 communities
- [[TalkQueueWorker]] - degree 10, connects to 2 communities
- [[go_pkg_context]] - degree 3, connects to 2 communities
- [[worker.go]] - degree 8, connects to 1 community