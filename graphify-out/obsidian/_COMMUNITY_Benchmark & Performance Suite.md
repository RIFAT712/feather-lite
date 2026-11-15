---
type: community
cohesion: 0.30
members: 15
---

# Benchmark & Performance Suite

**Cohesion:** 0.30 - loosely connected
**Members:** 15 nodes

## Members
- [[Connect()]] - code - backend/internal/database/db.go
- [[DB]] - code - backend/internal/database/db.go
- [[benchmarkmain.go]] - code - backend/cmd/benchmark/main.go
- [[benchmarkFilteredQueries()]] - code - backend/cmd/benchmark/main.go
- [[benchmarkJuryBalancer()]] - code - backend/cmd/benchmark/main.go
- [[benchmarkKeysetPagination()]] - code - backend/cmd/benchmark/main.go
- [[benchmarkKeysetVsOffset()]] - code - backend/cmd/benchmark/main.go
- [[benchmarkStandingsAggregation()]] - code - backend/cmd/benchmark/main.go
- [[databasesql.DB]] - code
- [[ensureTestUsers()]] - code - backend/cmd/benchmark/main.go
- [[explainQueryPlans()]] - code - backend/cmd/benchmark/main.go
- [[getOrCreateBenchmarkContest()]] - code - backend/cmd/benchmark/main.go
- [[go_pkg_math_rand]] - concept
- [[insertBenchmarkArticles()]] - code - backend/cmd/benchmark/main.go
- [[main()]] - code - backend/cmd/benchmark/main.go

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Benchmark__Performance_Suite
SORT file.name ASC
```

## Connections to other communities
- 4 edges to [[_COMMUNITY_Zero-CGO SQLite WAL Database]]
- 4 edges to [[_COMMUNITY_Server Entrypoint & Seeder]]
- 3 edges to [[_COMMUNITY_Scarcity-First Jury Balancer]]
- 3 edges to [[_COMMUNITY_Wikimedia Sister Wikis & API]]
- 2 edges to [[_COMMUNITY_Backend HTTP Endpoints & Chi]]
- 2 edges to [[_COMMUNITY_Keyset Models & DTOs]]
- 2 edges to [[_COMMUNITY_Backend Auth & JWT Session]]
- 1 edge to [[_COMMUNITY_Throttled Talk Queue Worker]]

## Top bridge nodes
- [[benchmarkmain.go]] - degree 18, connects to 5 communities
- [[DB]] - degree 16, connects to 5 communities
- [[Connect()]] - degree 6, connects to 4 communities
- [[main()]] - degree 12, connects to 1 community
- [[benchmarkJuryBalancer()]] - degree 4, connects to 1 community