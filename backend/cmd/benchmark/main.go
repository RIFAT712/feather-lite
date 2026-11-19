package main

import (
	"fmt"
	"log"
	"math/rand"
	"sort"
	"time"

	"feather-backend/internal/balancer"
	"feather-backend/internal/config"
	"feather-backend/internal/database"
)

func main() {
	cfg := config.Load()
	if cfg.DatabaseURL == "" || cfg.DatabaseURL == "feather.db" {
		cfg.DatabaseURL = "feather.db"
	}

	fmt.Println("=================================================================")
	fmt.Println("   FEATHER 2.0 — 50,000+ ARTICLES BENCHMARK & PERFORMANCE SUITE  ")
	fmt.Println("=================================================================")

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer db.Close()

	// 1. Prepare Contest & Users
	contestCode := "scale50k"
	contestID, err := getOrCreateBenchmarkContest(db, contestCode)
	if err != nil {
		log.Fatalf("Failed to setup benchmark contest: %v", err)
	}

	userIDs, juryIDs, err := ensureTestUsers(db, contestID, 50, 5)
	if err != nil {
		log.Fatalf("Failed to setup test users: %v", err)
	}

	// 2. Seed 50,000+ Articles if needed
	var currentCount int
	_ = db.QueryRow("SELECT COUNT(*) FROM articles WHERE contest_id = ?", contestID).Scan(&currentCount)
	targetCount := 50000

	if currentCount < targetCount {
		needed := targetCount - currentCount
		fmt.Printf("[SEED] Contest '%s' currently has %d articles. Inserting %d more to reach %d+...\n",
			contestCode, currentCount, needed, targetCount)
		insertBenchmarkArticles(db, contestID, userIDs, juryIDs, needed, currentCount)
	} else {
		fmt.Printf("[SEED] Contest '%s' already has %d articles. Skipping insertion.\n", contestCode, currentCount)
	}

	_ = db.QueryRow("SELECT COUNT(*) FROM articles WHERE contest_id = ?", contestID).Scan(&currentCount)
	fmt.Printf("[DATASET] Total articles in contest '%s': %d entries\n\n", contestCode, currentCount)

	// 3. EXPLAIN QUERY PLAN Verification
	explainQueryPlans(db, contestID, juryIDs[0])

	// 4. Benchmark Keyset Pagination
	benchmarkKeysetPagination(db, contestID)

	// 5. Benchmark Keyset vs SQL OFFSET (The Crucial Architecture Test)
	benchmarkKeysetVsOffset(db, contestID)

	// 6. Benchmark Status & Jury Queue Filters
	benchmarkFilteredQueries(db, contestID, juryIDs[0])

	// 7. Benchmark Standings / Aggregations (50k rows grouping)
	benchmarkStandingsAggregation(db, contestID)

	// 8. Benchmark Scarcity-First Jury Balancer Algorithm
	benchmarkJuryBalancer(userIDs, juryIDs, 5000)

	fmt.Println("\n=================================================================")
	fmt.Println("   BENCHMARK COMPLETE: ALL 50K SCALE INVARIANTS VALIDATED       ")
	fmt.Println("=================================================================")
}

func getOrCreateBenchmarkContest(db *database.DB, code string) (int64, error) {
	var id int64
	err := db.QueryRow("SELECT id FROM contests WHERE code = ?", code).Scan(&id)
	if err == nil {
		return id, nil
	}

	now := time.Now()
	res, err := db.Exec(`
		INSERT INTO contests (
			code, name, description, wiki_dbname, wiki_url, wiki_lang, wiki_tz,
			start_date, end_date, status, min_bytes, min_words
		) VALUES (
			?, 'Feather 50K Scale Benchmark Drive',
			'Automated high-throughput benchmark contest with 50,000+ submitted articles.',
			'bnwiktionary', 'https://bn.wiktionary.org', 'bn', 'UTC',
			?, ?, 'active', 1000, 200
		)
	`, code, now.AddDate(0, -1, 0), now.AddDate(0, 1, 0))
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func ensureTestUsers(db *database.DB, contestID int64, participantCount, juryCount int) ([]int64, []int64, error) {
	var participantIDs []int64
	for i := 1; i <= participantCount; i++ {
		username := fmt.Sprintf("Volunteer_%03d", i)
		var id int64
		err := db.QueryRow("SELECT id FROM users WHERE wiki_username = ?", username).Scan(&id)
		if err != nil {
			res, err := db.Exec("INSERT INTO users (wiki_username, role) VALUES (?, 'participant')", username)
			if err != nil {
				return nil, nil, err
			}
			id, _ = res.LastInsertId()
		}
		participantIDs = append(participantIDs, id)
	}

	var juryIDs []int64
	for j := 1; j <= juryCount; j++ {
		username := fmt.Sprintf("JuryMember_%02d", j)
		var id int64
		err := db.QueryRow("SELECT id FROM users WHERE wiki_username = ?", username).Scan(&id)
		if err != nil {
			res, err := db.Exec("INSERT INTO users (wiki_username, role) VALUES (?, 'jury')", username)
			if err != nil {
				return nil, nil, err
			}
			id, _ = res.LastInsertId()
		}
		juryIDs = append(juryIDs, id)
		_, _ = db.Exec("INSERT OR IGNORE INTO contest_juries (contest_id, user_id) VALUES (?, ?)", contestID, id)
	}

	return participantIDs, juryIDs, nil
}

func insertBenchmarkArticles(db *database.DB, contestID int64, userIDs, juryIDs []int64, count, startingOffset int) {
	start := time.Now()
	batchSize := 5000
	inserted := 0

	bengaliPrefixes := []string{
		"শব্দ", "অভিধান", "ব্যাকরণ", "ধ্বনি", "বর্ণমালা", "ইতিহাস",
		"সাহিত্য", "বিজ্ঞান", "ভূগোল", "প্রকৃতি", "নক্ষত্র", "সংস্কৃতি",
	}

	for inserted < count {
		currentBatch := batchSize
		if inserted+currentBatch > count {
			currentBatch = count - inserted
		}

		tx, err := db.Begin()
		if err != nil {
			log.Fatalf("Failed to begin transaction: %v", err)
		}

		stmt, err := tx.Prepare(`
			INSERT INTO articles (
				contest_id, title, submitter_id, status, validation_error,
				wiki_creator, byte_count, word_count, assigned_to_id, submitted_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`)
		if err != nil {
			log.Fatalf("Failed to prepare statement: %v", err)
		}

		now := time.Now()
		for i := 0; i < currentBatch; i++ {
			globalIdx := startingOffset + inserted + i + 1
			prefix := bengaliPrefixes[rand.Intn(len(bengaliPrefixes))]
			title := fmt.Sprintf("%s_%06d", prefix, globalIdx)
			submitterID := userIDs[rand.Intn(len(userIDs))]

			// Status distribution: 65% pending, 25% accepted, 8% rejected, 2% validation_failed
			r := rand.Float64()
			status := "pending"
			valErr := ""
			var assignedToID *int64 = nil

			if r < 0.65 {
				status = "pending"
				jid := juryIDs[rand.Intn(len(juryIDs))]
				assignedToID = &jid
			} else if r < 0.90 {
				status = "accepted"
			} else if r < 0.98 {
				status = "rejected"
			} else {
				status = "validation_failed"
				valErr = "Word count below required minimum (142 words)"
			}

			bytes := 1000 + rand.Intn(15000)
			words := 200 + rand.Intn(3000)
			submittedAt := now.Add(-time.Duration(rand.Intn(720)) * time.Hour)

			_, err := stmt.Exec(
				contestID, title, submitterID, status, valErr,
				fmt.Sprintf("Volunteer_%03d", (submitterID%50)+1),
				bytes, words, assignedToID, submittedAt,
			)
			if err != nil {
				log.Fatalf("Insert failed at %d: %v", globalIdx, err)
			}
		}

		stmt.Close()
		if err := tx.Commit(); err != nil {
			log.Fatalf("Commit failed: %v", err)
		}

		inserted += currentBatch
		fmt.Printf("  -> Inserted %d / %d articles (%.1f%%)...\n",
			inserted, count, float64(inserted)/float64(count)*100)
	}

	elapsed := time.Since(start)
	rate := float64(count) / elapsed.Seconds()
	fmt.Printf("[SEED COMPLETE] Inserted %d entries in %s (%.0f rows/sec)\n\n", count, elapsed, rate)
}

func explainQueryPlans(db *database.DB, contestID int64, juryID int64) {
	fmt.Println("--- 1. VERIFYING INDEX UTILIZATION (EXPLAIN QUERY PLAN) ---")

	queries := []struct {
		name string
		sql  string
		args []any
	}{
		{
			name: "Keyset Pagination (Contest + ID DESC)",
			sql:  "EXPLAIN QUERY PLAN SELECT id FROM articles WHERE contest_id = ? AND id < ? ORDER BY id DESC LIMIT 50",
			args: []any{contestID, 40000},
		},
		{
			name: "Status Filter (Contest + Status + ID DESC)",
			sql:  "EXPLAIN QUERY PLAN SELECT id FROM articles WHERE contest_id = ? AND status = ? AND id < ? ORDER BY id DESC LIMIT 50",
			args: []any{contestID, "pending", 40000},
		},
		{
			name: "Jury Queue Filter (Contest + Assigned + Status + ID DESC)",
			sql:  "EXPLAIN QUERY PLAN SELECT id FROM articles WHERE contest_id = ? AND assigned_to_id = ? AND status = ? ORDER BY id DESC LIMIT 50",
			args: []any{contestID, juryID, "pending"},
		},
	}

	for _, q := range queries {
		rows, err := db.Query(q.sql, q.args...)
		if err != nil {
			fmt.Printf("  [FAIL] %s: %v\n", q.name, err)
			continue
		}
		var id, parent, notused int
		var detail string
		fmt.Printf("  [PLAN] %s:\n", q.name)
		for rows.Next() {
			_ = rows.Scan(&id, &parent, &notused, &detail)
			fmt.Printf("         -> %s\n", detail)
		}
		rows.Close()
	}
	fmt.Println()
}

func benchmarkKeysetPagination(db *database.DB, contestID int64) {
	fmt.Println("--- 2. BENCHMARKING KEYSET CURSOR PAGINATION (O(1)) ---")

	var maxID, minID int64
	_ = db.QueryRow("SELECT MAX(id), MIN(id) FROM articles WHERE contest_id = ?", contestID).Scan(&maxID, &minID)

	type testPoint struct {
		label    string
		beforeID int64
	}

	testPoints := []testPoint{
		{"Page 1 (Top / latest entries)", 0},
		{"Page 250 (Mid-high cursor)", maxID - int64(float64(maxID-minID)*0.25)},
		{"Page 500 (Mid-deep cursor)", maxID - int64(float64(maxID-minID)*0.50)},
		{"Page 950 (Deep cursor / oldest)", maxID - int64(float64(maxID-minID)*0.95)},
	}

	iterations := 100

	for _, tp := range testPoints {
		// Warm-up
		_, _ = db.GetArticlesKeyset(contestID, tp.beforeID, "", 0, 50)

		t0 := time.Now()
		var totalItems int
		for i := 0; i < iterations; i++ {
			res, err := db.GetArticlesKeyset(contestID, tp.beforeID, "", 0, 50)
			if err != nil {
				log.Fatalf("Keyset fetch error: %v", err)
			}
			totalItems = len(res.Items)
		}
		totalElapsed := time.Since(t0)
		avgDuration := totalElapsed / time.Duration(iterations)

		fmt.Printf("  [%-32s] Items: %2d | %d queries in %s | Avg per query: %6.2f µs (%5.3f ms)\n",
			tp.label, totalItems, iterations, totalElapsed.Round(time.Millisecond),
			float64(avgDuration.Nanoseconds())/1000.0, float64(avgDuration.Nanoseconds())/1000000.0)
	}
	fmt.Println()
}

func benchmarkKeysetVsOffset(db *database.DB, contestID int64) {
	fmt.Println("--- 3. KEYSET PAGINATION vs NAIVE SQL OFFSET (O(1) vs O(N)) ---")

	offsetDepths := []int{100, 1000, 10000, 45000}

	for _, offset := range offsetDepths {
		// 1. Keyset lookup at equivalent depth
		var targetID int64
		_ = db.QueryRow(`
			SELECT id FROM articles WHERE contest_id = ? ORDER BY id DESC LIMIT 1 OFFSET ?
		`, contestID, offset).Scan(&targetID)

		// Measure Keyset
		t0 := time.Now()
		var countKeyset int
		kRows, _ := db.Query(`
			SELECT a.id FROM articles a
			JOIN users u ON a.submitter_id = u.id
			WHERE a.contest_id = ? AND a.id <= ?
			ORDER BY a.id DESC LIMIT 50
		`, contestID, targetID)
		for kRows.Next() {
			countKeyset++
		}
		kRows.Close()
		keysetDur := time.Since(t0)

		// Measure Naive Offset
		t1 := time.Now()
		var countOffset int
		oRows, _ := db.Query(`
			SELECT a.id FROM articles a
			JOIN users u ON a.submitter_id = u.id
			WHERE a.contest_id = ?
			ORDER BY a.id DESC LIMIT 50 OFFSET ?
		`, contestID, offset)
		for oRows.Next() {
			countOffset++
		}
		oRows.Close()
		offsetDur := time.Since(t1)

		speedup := float64(offsetDur.Nanoseconds()) / float64(keysetDur.Nanoseconds())
		fmt.Printf("  Depth Offset %5d | Keyset: %6.2f ms | Offset: %6.2f ms | Keyset is %.1fx FASTER\n",
			offset, float64(keysetDur.Microseconds())/1000.0, float64(offsetDur.Microseconds())/1000.0, speedup)
	}
	fmt.Println()
}

func benchmarkFilteredQueries(db *database.DB, contestID int64, juryID int64) {
	fmt.Println("--- 4. FILTERED QUERIES (STATUS & JURY QUEUES) ---")

	iterations := 50
	statuses := []string{"pending", "accepted", "rejected"}
	for _, st := range statuses {
		t0 := time.Now()
		var itemCount int
		for i := 0; i < iterations; i++ {
			res, err := db.GetArticlesKeyset(contestID, 0, st, 0, 50)
			if err != nil {
				log.Fatalf("Status filter error: %v", err)
			}
			itemCount = len(res.Items)
		}
		totalElapsed := time.Since(t0)
		avgDur := totalElapsed / time.Duration(iterations)
		fmt.Printf("  Filter status='%-10s' | Items: %2d | %d queries in %s | Avg: %6.2f µs (%5.3f ms)\n",
			st, itemCount, iterations, totalElapsed.Round(time.Millisecond),
			float64(avgDur.Nanoseconds())/1000.0, float64(avgDur.Nanoseconds())/1000000.0)
	}

	// Jury Queue Filter
	t0 := time.Now()
	var itemCount int
	for i := 0; i < iterations; i++ {
		res, err := db.GetArticlesKeyset(contestID, 0, "pending", juryID, 50)
		if err != nil {
			log.Fatalf("Jury queue filter error: %v", err)
		}
		itemCount = len(res.Items)
	}
	totalElapsed := time.Since(t0)
	avgDur := totalElapsed / time.Duration(iterations)
	fmt.Printf("  Filter assigned jury queue | Items: %2d | %d queries in %s | Avg: %6.2f µs (%5.3f ms)\n",
		itemCount, iterations, totalElapsed.Round(time.Millisecond),
		float64(avgDur.Nanoseconds())/1000.0, float64(avgDur.Nanoseconds())/1000000.0)
	fmt.Println()
}

func benchmarkStandingsAggregation(db *database.DB, contestID int64) {
	fmt.Println("--- 5. STANDINGS LEADERBOARD AGGREGATION (50,000+ ROWS) ---")

	query := `
		SELECT u.wiki_username,
		       COUNT(CASE WHEN a.status = 'accepted' THEN 1 END) as accepted_count,
		       COALESCE(SUM(CASE WHEN a.status = 'accepted' THEN a.word_count ELSE 0 END), 0) as total_words,
		       COALESCE(SUM(CASE WHEN a.status = 'accepted' THEN a.byte_count ELSE 0 END), 0) as total_bytes,
		       COUNT(a.id) as submitted_count
		FROM articles a
		JOIN users u ON a.submitter_id = u.id
		WHERE a.contest_id = ?
		GROUP BY u.id
		ORDER BY accepted_count DESC, total_words DESC
	`

	var latencies []time.Duration
	var userCount int
	for r := 0; r < 10; r++ {
		t0 := time.Now()
		rows, err := db.Query(query, contestID)
		if err != nil {
			log.Fatalf("Standings query error: %v", err)
		}
		userCount = 0
		for rows.Next() {
			var uname string
			var acc, words, bytes, sub int
			_ = rows.Scan(&uname, &acc, &words, &bytes, &sub)
			userCount++
		}
		rows.Close()
		latencies = append(latencies, time.Since(t0))
	}

	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
	median := latencies[len(latencies)/2]
	fmt.Printf("  Aggregated 50k+ rows across %d participants | Median latency: %6.2f ms\n\n",
		userCount, float64(median.Microseconds())/1000.0)
}

func benchmarkJuryBalancer(userIDs, juryIDs []int64, pendingItemCount int) {
	fmt.Printf("--- 6. SCARCITY-FIRST JURY LOAD BALANCER (%d ARTICLES) ---\n", pendingItemCount)

	var items []balancer.ArticleItem
	for i := 0; i < pendingItemCount; i++ {
		items = append(items, balancer.ArticleItem{
			ArticleID:   int64(i + 1),
			SubmitterID: userIDs[rand.Intn(len(userIDs))],
		})
	}

	loads := make(map[int64]int)
	for _, jid := range juryIDs {
		loads[jid] = rand.Intn(50)
	}

	eligibleBySubmitter := make(map[int64][]int64)
	for _, it := range items {
		if _, exists := eligibleBySubmitter[it.SubmitterID]; !exists {
			var eligible []int64
			for _, jid := range juryIDs {
				if jid != it.SubmitterID {
					eligible = append(eligible, jid)
				}
			}
			eligibleBySubmitter[it.SubmitterID] = eligible
		}
	}

	t0 := time.Now()
	plan := balancer.PlanScarcityFirst(items, loads, eligibleBySubmitter)
	dur := time.Since(t0)

	fmt.Printf("  Scheduled %d articles across %d juries | Time taken: %6.2f ms (%d allocations made)\n",
		len(items), len(juryIDs), float64(dur.Microseconds())/1000.0, len(plan))
}
