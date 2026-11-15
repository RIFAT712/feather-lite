---
type: community
cohesion: 0.11
members: 50
---

# Backend Auth & JWT Session

**Cohesion:** 0.11 - loosely connected
**Members:** 50 nodes

## Members
- [[dot-Callback()]] - code - backend/internal/handlers/handlers.go
- [[dot-CreateContest()]] - code - backend/internal/handlers/handlers.go
- [[dot-DevLogin()]] - code - backend/internal/handlers/handlers.go
- [[dot-GetArticlePreview()]] - code - backend/internal/handlers/handlers.go
- [[dot-GetContest()]] - code - backend/internal/handlers/handlers.go
- [[dot-GetContestArticles()]] - code - backend/internal/handlers/handlers.go
- [[dot-GetMe()]] - code - backend/internal/handlers/handlers.go
- [[dot-GetStandings()]] - code - backend/internal/handlers/handlers.go
- [[dot-GetUserCreatedArticles()]] - code - backend/internal/handlers/handlers.go
- [[dot-Health()]] - code - backend/internal/handlers/handlers.go
- [[dot-ListContests()]] - code - backend/internal/handlers/handlers.go
- [[dot-Login()]] - code - backend/internal/handlers/handlers.go
- [[dot-Logout()]] - code - backend/internal/handlers/handlers.go
- [[dot-ReviewArticle()]] - code - backend/internal/handlers/handlers.go
- [[dot-SubmitArticles()]] - code - backend/internal/handlers/handlers.go
- [[Claims]] - code - backend/internal/auth/auth.go
- [[ClearAuthCookie()]] - code - backend/internal/auth/auth.go
- [[Config]] - code - backend/internal/config/config.go
- [[ExchangeCodeForToken()]] - code - backend/internal/mwclient/mwclient.go
- [[FetchPageInfo()]] - code - backend/internal/mwclient/mwclient.go
- [[FetchPagesBatch()]] - code - backend/internal/mwclient/mwclient.go
- [[FetchRenderedHTML()]] - code - backend/internal/mwclient/mwclient.go
- [[FetchUserCreatedArticles()]] - code - backend/internal/mwclient/mwclient.go
- [[FetchUserProfile()]] - code - backend/internal/mwclient/mwclient.go
- [[GenerateToken()]] - code - backend/internal/auth/auth.go
- [[GetAuthorizeURL()]] - code - backend/internal/mwclient/mwclient.go
- [[GetUser()]] - code - backend/internal/auth/auth.go
- [[GetUserFromRequest()]] - code - backend/internal/auth/auth.go
- [[Handler]] - code - backend/internal/handlers/handlers.go
- [[Middleware()]] - code - backend/internal/auth/auth.go
- [[PageInfo]] - code - backend/internal/mwclient/mwclient.go
- [[ParseToken()]] - code - backend/internal/auth/auth.go
- [[SetAuthCookie()]] - code - backend/internal/auth/auth.go
- [[UserCreation]] - code - backend/internal/mwclient/mwclient.go
- [[UserProfile]] - code - backend/internal/mwclient/mwclient.go
- [[auth.go]] - code - backend/internal/auth/auth.go
- [[contextKey]] - code - backend/internal/auth/auth.go
- [[go_pkg_errors]] - concept
- [[go_pkg_feather_backend_internal_wikitext]] - concept
- [[go_pkg_github_com_golang_jwt_jwt_v5]] - concept
- [[go_pkg_io]] - concept
- [[go_pkg_net_url]] - concept
- [[jsonError()]] - code - backend/internal/handlers/handlers.go
- [[jsonResponse()]] - code - backend/internal/handlers/handlers.go
- [[jwt.RegisteredClaims]] - code
- [[mwQueryResponse]] - code - backend/internal/mwclient/mwclient.go
- [[mwclient.go]] - code - backend/internal/mwclient/mwclient.go
- [[nethttp.Handler]] - code
- [[nethttp.Request]] - code
- [[nethttp.ResponseWriter]] - code

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Backend_Auth__JWT_Session
SORT file.name ASC
```

## Connections to other communities
- 7 edges to [[_COMMUNITY_Backend HTTP Endpoints & Chi]]
- 5 edges to [[_COMMUNITY_Server Entrypoint & Seeder]]
- 5 edges to [[_COMMUNITY_Throttled Talk Queue Worker]]
- 5 edges to [[_COMMUNITY_Keyset Models & DTOs]]
- 3 edges to [[_COMMUNITY_Zero-CGO SQLite WAL Database]]
- 3 edges to [[_COMMUNITY_Wikitext & Unicode Word Count]]
- 2 edges to [[_COMMUNITY_Benchmark & Performance Suite]]
- 2 edges to [[_COMMUNITY_Scarcity-First Jury Balancer]]

## Top bridge nodes
- [[mwclient.go]] - degree 22, connects to 5 communities
- [[Handler]] - degree 21, connects to 5 communities
- [[auth.go]] - degree 16, connects to 4 communities
- [[Config]] - degree 11, connects to 2 communities
- [[dot-CreateContest()]] - degree 8, connects to 2 communities