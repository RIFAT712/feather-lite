package worker

import (
	"context"
	"log"
	"sync"
	"time"

	"feather-backend/internal/models"
)

type TalkQueueWorker struct {
	jobChan chan models.TalkPageJob
	mu      sync.Mutex
	running bool
}

func NewTalkQueueWorker(bufferSize int) *TalkQueueWorker {
	if bufferSize <= 0 {
		bufferSize = 1000
	}
	return &TalkQueueWorker{
		jobChan: make(chan models.TalkPageJob, bufferSize),
	}
}

// Start spawns the rate-limited background worker (1 edit per 3 seconds)
func (w *TalkQueueWorker) Start(ctx context.Context) {
	w.mu.Lock()
	if w.running {
		w.mu.Unlock()
		return
	}
	w.running = true
	w.mu.Unlock()

	go func() {
		log.Println("[TalkQueueWorker] Throttled worker started (1 edit per 3.0s).")
		ticker := time.NewTicker(3 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				log.Println("[TalkQueueWorker] Stopping background worker...")
				return
			case job := <-w.jobChan:
				<-ticker.C
				w.processJob(job)
			}
		}
	}()
}

// Enqueue adds a talk page job to the background queue
func (w *TalkQueueWorker) Enqueue(job models.TalkPageJob) bool {
	select {
	case w.jobChan <- job:
		return true
	default:
		log.Printf("[TalkQueueWorker] Queue buffer full, dropped job for article %s", job.Title)
		return false
	}
}

func (w *TalkQueueWorker) processJob(job models.TalkPageJob) {
	log.Printf("[TalkQueueWorker] [Throttled Edit] Adding template to talk page for: %s", job.Title)
}
