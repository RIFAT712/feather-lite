package models

import "time"

type User struct {
	ID               int64     `json:"id"`
	WikiUsername     string    `json:"wiki_username"`
	Role             string    `json:"role"` // "participant", "jury", "owner"
	OAuthAccessToken string    `json:"-"`
	CreatedAt        time.Time `json:"created_at"`
}

type Contest struct {
	ID                    int64      `json:"id"`
	Code                  string     `json:"code"`
	Name                  string     `json:"name"`
	Description           string     `json:"description"`
	WikiDbName            string     `json:"wiki_dbname"`
	WikiURL               string     `json:"wiki_url"`
	WikiLang              string     `json:"wiki_lang"`
	WikiTZ                string     `json:"wiki_tz"`
	StartDate             time.Time  `json:"start_date"`
	EndDate               time.Time  `json:"end_date"`
	Status                string     `json:"status"` // "draft", "active", "ended"
	IsDraft               bool       `json:"is_draft"`
	RuleMustBeCreator     bool       `json:"rule_must_be_creator"`
	RuleNoRedirect        bool       `json:"rule_no_redirect"`
	RuleNoDisambig        bool       `json:"rule_no_disambig"`
	RuleMainspaceOnly     bool       `json:"rule_mainspace_only"`
	RuleCreatedInWindow   bool       `json:"rule_created_in_window"`
	MinBytes              int        `json:"min_bytes"`
	MinWords              int        `json:"min_words"`
	MinRefs               int        `json:"min_refs"`
	MaxSubmissionsPerUser int        `json:"max_submissions_per_user"`
	RankByWords           bool       `json:"rank_by_words"`
	ResultsPublishedAt    *time.Time `json:"results_published_at,omitempty"`
	AddTalkTemplate       bool       `json:"add_talk_template"`
	TalkTemplateName      string     `json:"talk_template_name"`
	CreatedByID           *int64     `json:"created_by_id,omitempty"`
	CreatedAt             time.Time  `json:"created_at"`
	
	// Aggregated stats (calculated)
	TotalArticles    int      `json:"total_articles,omitempty"`
	AcceptedArticles int      `json:"accepted_articles,omitempty"`
	PendingArticles  int      `json:"pending_articles,omitempty"`
	TotalJuries      int      `json:"total_juries,omitempty"`
	Juries           []string `json:"juries,omitempty"`
}

type Article struct {
	ID                 int64      `json:"id"`
	ContestID          int64      `json:"contest_id"`
	Title              string     `json:"title"`
	SubmitterID        int64      `json:"submitter_id"`
	SubmitterUsername  string     `json:"submitter_username,omitempty"`
	Status             string     `json:"status"` // "pending", "accepted", "rejected", "validation_failed"
	ValidationError    string     `json:"validation_error,omitempty"`
	WikiCreator        string     `json:"wiki_creator,omitempty"`
	WikiCreationDate   *time.Time `json:"wiki_creation_date,omitempty"`
	ByteCount          int        `json:"byte_count"`
	WordCount          int        `json:"word_count"`
	WordCountVerified  bool       `json:"word_count_verified"`
	AssignedToID       *int64     `json:"assigned_to_id,omitempty"`
	AssignedToUsername string     `json:"assigned_to_username,omitempty"`
	SubmittedAt        time.Time  `json:"submitted_at"`
	LockedUntil        *time.Time `json:"locked_until,omitempty"`
	LockedByID         *int64     `json:"locked_by_id,omitempty"`
	
	ReviewCount int      `json:"review_count,omitempty"`
	Reviews     []Review `json:"reviews,omitempty"`
}

type Review struct {
	ID               int64     `json:"id"`
	ArticleID        int64     `json:"article_id"`
	ReviewerID       int64     `json:"reviewer_id"`
	ReviewerUsername string    `json:"reviewer_username,omitempty"`
	Status           string    `json:"status"` // "accepted", "rejected", "skipped"
	Comment          string    `json:"comment"`
	Timestamp        time.Time `json:"timestamp"`
}

type TalkPageJob struct {
	ID          int64      `json:"id"`
	ContestID   int64      `json:"contest_id"`
	ArticleID   int64      `json:"article_id"`
	Title       string     `json:"title"`
	Status      string     `json:"status"` // "queued", "processing", "done", "failed"
	Attempts    int        `json:"attempts"`
	Error       string     `json:"error,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	ProcessedAt *time.Time `json:"processed_at,omitempty"`
}

type KeysetPaginationResult struct {
	Items      []Article `json:"items"`
	Total      int       `json:"total"`
	NextCursor int64     `json:"next_cursor,omitempty"`
	HasMore    bool      `json:"has_more"`
}

type CreateContestRequest struct {
	Name                  string   `json:"name"`
	Code                  string   `json:"code"`
	Description           string   `json:"description"`
	WikiDbName            string   `json:"wiki_dbname"`
	WikiURL               string   `json:"wiki_url"`
	WikiLang              string   `json:"wiki_lang"`
	WikiTZ                string   `json:"wiki_tz"`
	StartDate             string   `json:"start_date"`
	EndDate               string   `json:"end_date"`
	RuleMustBeCreator     bool     `json:"rule_must_be_creator"`
	RuleNoRedirect        bool     `json:"rule_no_redirect"`
	RuleNoDisambig        bool     `json:"rule_no_disambig"`
	RuleMainspaceOnly     bool     `json:"rule_mainspace_only"`
	RuleCreatedInWindow   bool     `json:"rule_created_in_window"`
	MinBytes              int      `json:"min_bytes"`
	MinWords              int      `json:"min_words"`
	MinRefs               int      `json:"min_refs"`
	MaxSubmissionsPerUser int      `json:"max_submissions_per_user"`
	RankByWords           bool     `json:"rank_by_words"`
	AddTalkTemplate       bool     `json:"add_talk_template"`
	TalkTemplateName      string   `json:"talk_template_name"`
	Juries                []string `json:"juries"`
}

type StandingEntry struct {
	Rank           int    `json:"rank"`
	Username       string `json:"username"`
	AcceptedCount  int    `json:"accepted_count"`
	TotalWords     int    `json:"total_words"`
	TotalBytes     int    `json:"total_bytes"`
	SubmittedCount int    `json:"submitted_count"`
}
