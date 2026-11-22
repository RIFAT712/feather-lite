package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"feather-backend/internal/auth"
	"feather-backend/internal/config"
	"feather-backend/internal/database"
	"feather-backend/internal/handlers"
	"feather-backend/internal/worker"
)

func main() {
	cfg := config.Load()
	log.Printf("[Feather-New] Initializing high-speed Go service on port %s...", cfg.Port)

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Fatal: Database initialization error: %v", err)
	}
	defer db.Close()

	// Clean up legacy validation_failed entries so only valid submissions are retained
	_, _ = db.Exec("DELETE FROM articles WHERE status = 'validation_failed'")

	seedContest(db)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	talkQueue := worker.NewTalkQueueWorker(db.DB, cfg)
	talkQueue.Start(ctx)

	h := handlers.New(cfg, db, talkQueue)
	go h.SyncUnverifiedUsers()

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(auth.Middleware(cfg))

	r.Get("/health", h.Health)

	// Wikimedia OAuth 2.0 routes
	r.Route("/auth", func(authRouter chi.Router) {
		authRouter.Get("/login", h.Login)
		authRouter.Get("/dev-login", h.DevLogin)
		authRouter.Get("/callback", h.Callback)
		authRouter.Post("/logout", h.Logout)
	})

	r.Route("/api", func(api chi.Router) {
		api.Get("/me", h.GetMe)
		api.Get("/overview", h.GetOverview)
		api.Get("/contests", h.ListContests)
		api.Get("/available-contests", h.ListGlobalAvailableContests)
		api.Post("/contests", h.CreateContest)
		api.Get("/contests/{code}", h.GetContest)
		api.Get("/contests/{code}/settings", h.GetContest)
		api.Put("/contests/{code}", h.UpdateContest)
		api.Put("/contests/{code}/settings", h.UpdateContest)
		api.Delete("/contests/{code}", h.DeleteContest)
		api.Post("/contests/{code}/sub-contests", h.CreateSubContest)
		api.Get("/contests/{code}/available-contests", h.GetAvailableContests)
		api.Post("/contests/{code}/attach-contest", h.AttachContest)
		api.Post("/contests/{code}/detach-contest", h.DetachContest)
		api.Get("/contests/{code}/articles", h.GetContestArticles)
		api.Get("/contests/{code}/articles/{id}/preview", h.GetArticlePreview)
		api.Get("/contests/{code}/user-created-articles", h.GetUserCreatedArticles)
		api.Post("/contests/{code}/submit", h.SubmitArticles)
		api.Get("/contests/{code}/standings", h.GetStandings)
		api.Get("/contests/{code}/stats", h.GetContestStats)
		api.Get("/contests/{code}/statistics", h.GetContestStats)
		api.Get("/contests/{code}/jury-stats", h.GetJuryStats)
		api.Post("/contests/{code}/redistribute", h.RedistributeQueues)
		api.Get("/contests/{code}/users/{username}", h.GetContestUserProfile)
		api.Get("/contests/{code}/talk-queue", h.GetTalkQueue)
		api.Post("/contests/{code}/talk-queue/retry", h.RetryTalkQueue)
		api.Post("/contests/{code}/talk-queue/enqueue-all", h.EnqueueMissingTalkJobs)
		api.Get("/users/{username}/profile", h.GetUserGlobalProfile)

		// Admin & Platform Management routes
		api.Get("/admin/overview", h.GetAdminOverview)
		api.Get("/admin/contests", h.GetAdminContests)
		api.Post("/admin/contests/{code}/approve", h.ApproveContest)
		api.Post("/admin/contests/{code}/reject", h.RejectContest)
		api.Delete("/admin/contests/{code}", h.DeleteContest)

		api.Post("/articles/{id}/review", h.ReviewArticle)
		api.Post("/articles/{id}/review/undo", h.UndoReview)
		api.Post("/articles/{id}/lock", h.AcquireArticleLock)
		api.Delete("/articles/{id}/lock", h.ReleaseArticleLock)
		api.Delete("/articles/{id}", h.DeleteArticle)
		api.Post("/articles/bulk-review", h.BulkReview)
		api.Post("/articles/bulk-delete", h.BulkDeleteArticles)
		api.Get("/users/suggest", h.SuggestUsers)
		api.Get("/users/elevated", h.GetElevatedUsers)
		api.Get("/users/{username}/role", h.GetUserRole)
	})

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("[Feather-New] Backend listening on http://localhost:%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-stop
	log.Println("[Feather-New] Shutting down gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}
	log.Println("[Feather-New] Stopped.")
}

func seedContest(db *database.DB) {
	var count int
	_ = db.QueryRow("SELECT COUNT(*) FROM contests").Scan(&count)
	if count == 0 {
		now := time.Now()
		start := now.AddDate(0, -1, 0)
		end := now.AddDate(0, 1, 0)
		res, err := db.Exec(`
			INSERT INTO contests (
				code, name, description, wiki_dbname, wiki_url, wiki_lang, wiki_tz,
				start_date, end_date, status, min_bytes, min_words
			) VALUES (
				'bnwiki26', 'Bangla Wikipedia Article Drive 2026',
				'Community competition to enrich Bengali Wikipedia with comprehensive articles and citations.',
				'bnwiki', 'https://bn.wikipedia.org', 'bn', 'UTC',
				?, ?, 'active', 1000, 200
			)
		`, start, end)
		if err == nil {
			cid, _ := res.LastInsertId()
			_, _ = db.Exec("INSERT INTO users (wiki_username, role) VALUES ('R1F4T', 'owner')")
			_, _ = db.Exec("INSERT INTO users (wiki_username, role) VALUES ('WikiVolunteer', 'participant')")
			
			sampleTitles := []string{
				"অভিধান",
				"ব্যাকরণ",
				"উচ্চারণ",
				"ভাষাবিজ্ঞান",
				"বই",
				"বাংলা",
			}
			for i, t := range sampleTitles {
				status := "pending"
				if i == 0 {
					status = "accepted"
				}
				_, _ = db.Exec(`
					INSERT INTO articles (contest_id, title, submitter_id, status, byte_count, word_count, wiki_creator)
					VALUES (?, ?, 2, ?, ?, ?, 'WikiVolunteer')
				`, cid, t, status, 1500+i*200, 320+i*50)
			}
			fmt.Println("[DB] Sample contest 'bnwiki26' and seed articles created.")
		}
	}
}
