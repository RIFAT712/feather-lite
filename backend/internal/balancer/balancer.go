package balancer

import (
	"container/heap"
	"sort"
)

// ArticleItem represents a pending article candidate for queue placement
type ArticleItem struct {
	ArticleID      int64
	SubmitterID    int64
	CurrentOwnerID int64
}

// juryLoad represents a jury member's current load in the min-heap
type juryLoad struct {
	juryID int64
	load   int
}

// minHeap implements heap.Interface for juryLoad
type minHeap []juryLoad

func (h minHeap) Len() int           { return len(h) }
func (h minHeap) Less(i, j int) bool { return h[i].load < h[j].load }
func (h minHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *minHeap) Push(x any) {
	*h = append(*h, x.(juryLoad))
}

func (h *minHeap) Pop() any {
	old := *h
	n := len(old)
	item := old[n-1]
	*h = old[0 : n-1]
	return item
}

type group struct {
	eligible []int64
	items    []ArticleItem
}

// PlanScarcityFirst picks an owner for every movable article, placing the most-constrained
// blocks first to ensure fairness and prevent jury starvation when self-review or COI rules apply.
//
// Algorithm origin: Fountain & Feather scarcity-first constraint satisfaction.
func PlanScarcityFirst(
	movable []ArticleItem,
	loads map[int64]int,
	eligibleBySubmitter map[int64][]int64,
) map[int64]int64 {
	bySubmitter := make(map[int64][]ArticleItem)
	for _, item := range movable {
		bySubmitter[item.SubmitterID] = append(bySubmitter[item.SubmitterID], item)
	}

	var groups []group
	for submitterID, items := range bySubmitter {
		eligible := eligibleBySubmitter[submitterID]
		if len(eligible) > 0 {
			groups = append(groups, group{
				eligible: eligible,
				items:    items,
			})
		}
	}

	// Scarcest first (fewest eligible juries); ties broken by largest item count first
	sort.Slice(groups, func(i, j int) bool {
		if len(groups[i].eligible) != len(groups[j].eligible) {
			return len(groups[i].eligible) < len(groups[j].eligible)
		}
		return len(groups[i].items) > len(groups[j].items)
	})

	plan := make(map[int64]int64)

	for _, g := range groups {
		quota := make(map[int64]int)
		h := &minHeap{}
		heap.Init(h)

		for _, jid := range g.eligible {
			heap.Push(h, juryLoad{juryID: jid, load: loads[jid]})
		}

		// Water-fill quotas using the min-heap
		for range g.items {
			top := heap.Pop(h).(juryLoad)
			quota[top.juryID]++
			loads[top.juryID] = top.load + 1
			heap.Push(h, juryLoad{juryID: top.juryID, load: top.load + 1})
		}

		// Stability: let juries keep articles they already own if within their quota
		var leftovers []int64
		for _, item := range g.items {
			if quota[item.CurrentOwnerID] > 0 {
				quota[item.CurrentOwnerID]--
				plan[item.ArticleID] = item.CurrentOwnerID
			} else {
				leftovers = append(leftovers, item.ArticleID)
			}
		}

		// Distribute remaining openings to leftovers
		var openings []int64
		for jid, count := range quota {
			for c := 0; c < count; c++ {
				openings = append(openings, jid)
			}
		}

		for idx, aid := range leftovers {
			if idx < len(openings) {
				plan[aid] = openings[idx]
			}
		}
	}

	return plan
}
