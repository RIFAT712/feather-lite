---
type: community
cohesion: 0.23
members: 14
---

# Wikitext & Unicode Word Count

**Cohesion:** 0.23 - loosely connected
**Members:** 14 nodes

## Members
- [[CleanWikitext()]] - code - backend/internal/wikitext/wikitext.go
- [[CountPlaintextWords()]] - code - backend/internal/wikitext/wikitext.go
- [[CountRefs()]] - code - backend/internal/wikitext/wikitext.go
- [[CountWords()]] - code - backend/internal/wikitext/wikitext.go
- [[HasWordToken()]] - code - backend/internal/wikitext/wikitext.go
- [[IsScriptioContinua()]] - code - backend/internal/wikitext/wikitext.go
- [[StripTemplates()]] - code - backend/internal/wikitext/wikitext.go
- [[TestWikitextCleaningAndCounting()]] - code - backend/internal/wikitext/wikitext_test.go
- [[go_pkg_regexp]] - concept
- [[go_pkg_strings]] - concept
- [[go_pkg_testing]] - concept
- [[go_pkg_unicode]] - concept
- [[wikitext.go]] - code - backend/internal/wikitext/wikitext.go
- [[wikitext_test.go]] - code - backend/internal/wikitext/wikitext_test.go

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Wikitext__Unicode_Word_Count
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_Backend Auth & JWT Session]]
- 2 edges to [[_COMMUNITY_Scarcity-First Jury Balancer]]
- 1 edge to [[_COMMUNITY_Backend HTTP Endpoints & Chi]]

## Top bridge nodes
- [[go_pkg_strings]] - degree 4, connects to 2 communities
- [[TestWikitextCleaningAndCounting()]] - degree 6, connects to 1 community
- [[CountWords()]] - degree 5, connects to 1 community
- [[CountRefs()]] - degree 3, connects to 1 community
- [[go_pkg_testing]] - degree 2, connects to 1 community