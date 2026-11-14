package balancer

import (
	"testing"
)

func TestPlanScarcityFirstEqualDistribution(t *testing.T) {
	// 3 Juries: 1, 2, 3
	loads := map[int64]int{1: 0, 2: 0, 3: 0}
	eligible := map[int64][]int64{
		100: {1, 2, 3},
	}

	var movable []ArticleItem
	for i := int64(1); i <= 9; i++ {
		movable = append(movable, ArticleItem{ArticleID: i, SubmitterID: 100})
	}

	plan := PlanScarcityFirst(movable, loads, eligible)

	if len(plan) != 9 {
		t.Fatalf("Expected 9 assigned articles, got %d", len(plan))
	}

	// Loads should be perfectly 3, 3, 3
	if loads[1] != 3 || loads[2] != 3 || loads[3] != 3 {
		t.Fatalf("Expected balanced loads {3, 3, 3}, got %+v", loads)
	}
}

func TestPlanScarcityFirstPreventsJuryStarvation(t *testing.T) {
	// Juries: 1, 2, 3
	// Submitter 101 is Jury 1 (cannot self-review -> only Juries 2 and 3 eligible)
	// Submitter 102 is an external user -> all Juries 1, 2, 3 eligible
	loads := map[int64]int{1: 0, 2: 0, 3: 0}
	eligible := map[int64][]int64{
		101: {2, 3},       // Scarce group (only 2 juries)
		102: {1, 2, 3},    // Unconstrained group (all 3 juries)
	}

	var movable []ArticleItem
	// Submitter 101 submits 6 articles
	for i := int64(1); i <= 6; i++ {
		movable = append(movable, ArticleItem{ArticleID: i, SubmitterID: 101})
	}
	// Submitter 102 submits 6 articles
	for i := int64(7); i <= 12; i++ {
		movable = append(movable, ArticleItem{ArticleID: i, SubmitterID: 102})
	}

	plan := PlanScarcityFirst(movable, loads, eligible)

	if len(plan) != 12 {
		t.Fatalf("Expected 12 assigned articles, got %d", len(plan))
	}

	// Total 12 articles across 3 juries = 4 each!
	// Without scarcity-first, Jury 1 would get starved. With scarcity-first:
	// Submitter 101's 6 articles go to 2 & 3 (3 each: loads {1:0, 2:3, 3:3}).
	// Submitter 102's 6 articles water-fill: 1 gets 4, 2 gets 1, 3 gets 1 -> all end at 4!
	if loads[1] != 4 || loads[2] != 4 || loads[3] != 4 {
		t.Fatalf("Expected perfectly leveled loads {1:4, 2:4, 3:4}, got %+v", loads)
	}
}
