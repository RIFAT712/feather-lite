package models

import "time"

type User struct {
	ID                int64     `json:"id"`
	WikiUsername      string    `json:"wiki_username"`
	Role              string    `json:"role"` // "participant", "jury", "owner"
	OAuthAccessToken  string    `json:"-"`
	OAuthRefreshToken string    `json:"-"`
	CreatedAt         time.Time `json:"created_at"`
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
	RuleCreatedInWindow     bool       `json:"rule_created_in_window"`
	CustomCreationStartDate *time.Time `json:"custom_creation_start_date,omitempty"`
	CustomCreationEndDate   *time.Time `json:"custom_creation_end_date,omitempty"`
	MinBytes                int        `json:"min_bytes"`
	MinWords              int        `json:"min_words"`
	MinRefs               int        `json:"min_refs"`
	MaxSubmissionsPerUser int        `json:"max_submissions_per_user"`
	RankByWords           bool       `json:"rank_by_words"`
	ResultsPublishedAt    *time.Time `json:"results_published_at,omitempty"`
	AddTalkTemplate       bool       `json:"add_talk_template"`
	TalkTemplateName      string     `json:"talk_template_name"`
	OnwikiPageURL         string     `json:"onwiki_page_url,omitempty"`
	DistributeJuryQueue   bool       `json:"distribute_jury_queue"`
	IsUmbrella            bool       `json:"is_umbrella"`
	ParentContestID       *int64     `json:"parent_contest_id,omitempty"`
	ParentContestCode     string     `json:"parent_contest_code,omitempty"`
	ParentContestName     string     `json:"parent_contest_name,omitempty"`
	SubContestCount       int        `json:"sub_contest_count,omitempty"`
	SubContests           []SubContestSummary `json:"sub_contests,omitempty"`
	CreatedByID           *int64     `json:"created_by_id,omitempty"`
	CreatedByUsername     string     `json:"created_by_username,omitempty"`
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
	ContestCode        string     `json:"contest_code,omitempty"`
	WikiDbName         string     `json:"wiki_dbname,omitempty"`
	WikiURL            string     `json:"wiki_url,omitempty"`
	WikiLang           string     `json:"wiki_lang,omitempty"`
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
	LockedByUsername   string     `json:"locked_by_username,omitempty"`
	
	ReReviewRequested  bool       `json:"re_review_requested"`
	ReReviewNote       string     `json:"re_review_note,omitempty"`
	ReReviewedAt       *time.Time `json:"re_reviewed_at,omitempty"`
	
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
	RetryAfter  *time.Time `json:"retry_after,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	ProcessedAt *time.Time `json:"processed_at,omitempty"`
}

type KeysetPaginationResult struct {
	Items      []Article `json:"items"`
	Total      int       `json:"total"`
	NextCursor int64     `json:"next_cursor,omitempty"`
	HasMore    bool      `json:"has_more"`
}

type Notification struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	ContestID int64     `json:"contest_id"`
	ArticleID *int64    `json:"article_id,omitempty"`
	Type      string    `json:"type"` // "article_rejected", "article_accepted", "re_review_requested", "article_message"
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	LinkURL   string    `json:"link_url"`
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

type NotificationKeysetResult struct {
	Items       []Notification `json:"items"`
	UnreadCount int            `json:"unread_count"`
	NextCursor  int64          `json:"next_cursor,omitempty"`
	HasMore     bool           `json:"has_more"`
}

type ArticleMessage struct {
	ID        int64     `json:"id"`
	ArticleID int64     `json:"article_id"`
	UserID    int64     `json:"user_id"`
	Username  string    `json:"username"`
	Role      string    `json:"role"`
	Message   string    `json:"message"`
	IsSystem  bool      `json:"is_system"`
	CreatedAt time.Time `json:"created_at"`
}

type SubContestSummary struct {
	ID               int64     `json:"id"`
	Code             string    `json:"code"`
	Name             string    `json:"name"`
	WikiDbName       string    `json:"wiki_dbname"`
	WikiURL          string    `json:"wiki_url"`
	WikiLang         string    `json:"wiki_lang"`
	WikiTZ           string    `json:"wiki_tz"`
	StartDate        time.Time `json:"start_date"`
	EndDate          time.Time `json:"end_date"`
	Status           string    `json:"status"`
	MinWords         int       `json:"min_words"`
	MinBytes         int       `json:"min_bytes"`
	TotalArticles    int       `json:"total_articles"`
	AcceptedArticles int       `json:"accepted_articles"`
	PendingArticles  int       `json:"pending_articles"`
	TotalJuries      int       `json:"total_juries"`
	TotalSubmitters  int       `json:"total_submitters"`
}

type CommunityRuleConfig struct {
	DbName            string   `json:"wiki_dbname"`
	URL               string   `json:"wiki_url"`
	Lang              string   `json:"wiki_lang"`
	Name              string   `json:"name"`
	Timezone          string   `json:"timezone,omitempty"`
	MinWords          int      `json:"min_words"`
	MinBytes          int      `json:"min_bytes"`
	MinRefs           int      `json:"min_refs"`
	RuleMustBeCreator bool     `json:"rule_must_be_creator"`
	TalkTemplateName  string   `json:"talk_template_name"`
	Juries            []string `json:"juries"`
}

type CreateSubContestRequest struct {
	Name              string   `json:"name"`
	WikiDbName        string   `json:"wiki_dbname"`
	WikiURL           string   `json:"wiki_url"`
	WikiLang          string   `json:"wiki_lang"`
	WikiTZ            string   `json:"wiki_tz"`
	MinWords          int      `json:"min_words"`
	MinBytes          int      `json:"min_bytes"`
	MinRefs           int      `json:"min_refs"`
	RuleMustBeCreator bool     `json:"rule_must_be_creator"`
	TalkTemplateName  string   `json:"talk_template_name"`
	Juries            []string `json:"juries"`
}

type AttachContestRequest struct {
	ContestID   int64  `json:"contest_id,omitempty"`
	ContestCode string `json:"contest_code,omitempty"`
}

type DetachContestRequest struct {
	ContestID   int64  `json:"contest_id,omitempty"`
	ContestCode string `json:"contest_code,omitempty"`
}

type AvailableContestSummary struct {
	ID            int64  `json:"id"`
	Code          string `json:"code"`
	Name          string `json:"name"`
	WikiDbName    string `json:"wiki_dbname"`
	WikiURL       string `json:"wiki_url"`
	WikiLang      string `json:"wiki_lang"`
	StartDate     string `json:"start_date"`
	EndDate       string `json:"end_date"`
	Status        string `json:"status"`
	TotalArticles int    `json:"total_articles"`
}

type UpdateContestRequest struct {
	Name                    string   `json:"name"`
	Description             string   `json:"description"`
	WikiDbName              string   `json:"wiki_dbname,omitempty"`
	WikiURL                 string   `json:"wiki_url,omitempty"`
	WikiLang                string   `json:"wiki_lang,omitempty"`
	StartDate               string   `json:"start_date"`
	EndDate                 string   `json:"end_date"`
	Status                  string   `json:"status"`
	WikiTZ                  string   `json:"wiki_tz,omitempty"`
	IsUmbrella              *bool    `json:"is_umbrella,omitempty"`
	ExistingContestCodes    []string `json:"existing_contest_codes,omitempty"`
	RuleMustBeCreator       bool     `json:"rule_must_be_creator"`
	RuleNoRedirect          bool     `json:"rule_no_redirect"`
	RuleNoDisambig          bool     `json:"rule_no_disambig"`
	RuleMainspaceOnly       bool     `json:"rule_mainspace_only"`
	RuleCreatedInWindow     bool     `json:"rule_created_in_window"`
	CustomCreationStartDate string   `json:"custom_creation_start_date,omitempty"`
	CustomCreationEndDate   string   `json:"custom_creation_end_date,omitempty"`
	MinBytes                int      `json:"min_bytes"`
	MinWords                int      `json:"min_words"`
	MinRefs                 int      `json:"min_refs"`
	MaxSubmissionsPerUser   int      `json:"max_submissions_per_user"`
	RankByWords             bool     `json:"rank_by_words"`
	AddTalkTemplate         bool     `json:"add_talk_template"`
	TalkTemplateName        string   `json:"talk_template_name"`
	OnwikiPageURL           string   `json:"onwiki_page_url,omitempty"`
	DistributeJuryQueue     bool     `json:"distribute_jury_queue"`
	Juries                  []string `json:"juries"`
}

type GlobalStandingEntry struct {
	Rank             int      `json:"rank"`
	Username         string   `json:"username"`
	Role             string   `json:"role,omitempty"`
	AcceptedCount    int      `json:"accepted_count"`
	TotalWords       int      `json:"total_words"`
	TotalBytes       int      `json:"total_bytes"`
	SubmittedCount   int      `json:"submitted_count"`
	WikisContributed []string `json:"wikis_contributed"`
}

type CreateContestRequest struct {
	Name                  string                `json:"name"`
	Code                  string                `json:"code"`
	Description           string                `json:"description"`
	WikiDbName            string                `json:"wiki_dbname"`
	WikiURL               string                `json:"wiki_url"`
	WikiLang              string                `json:"wiki_lang"`
	WikiTZ                string                `json:"wiki_tz"`
	OnwikiPageURL         string                `json:"onwiki_page_url,omitempty"`
	StartDate             string                `json:"start_date"`
	EndDate               string                `json:"end_date"`
	IsUmbrella            bool                  `json:"is_umbrella"`
	ParticipatingWikis    []CommunityRuleConfig `json:"participating_wikis,omitempty"`
	ExistingContestCodes  []string              `json:"existing_contest_codes,omitempty"`
	ExistingContestIDs    []int64               `json:"existing_contest_ids,omitempty"`
	RuleMustBeCreator     bool                  `json:"rule_must_be_creator"`
	RuleNoRedirect        bool                  `json:"rule_no_redirect"`
	RuleNoDisambig        bool                  `json:"rule_no_disambig"`
	RuleMainspaceOnly     bool                  `json:"rule_mainspace_only"`
	RuleCreatedInWindow   bool                  `json:"rule_created_in_window"`
	CustomCreationStartDate string              `json:"custom_creation_start_date,omitempty"`
	CustomCreationEndDate   string              `json:"custom_creation_end_date,omitempty"`
	MinBytes              int                   `json:"min_bytes"`
	MinWords              int                   `json:"min_words"`
	MinRefs               int                   `json:"min_refs"`
	MaxSubmissionsPerUser int                   `json:"max_submissions_per_user"`
	RankByWords           bool                  `json:"rank_by_words"`
	AddTalkTemplate       bool                  `json:"add_talk_template"`
	TalkTemplateName      string                `json:"talk_template_name"`
	DistributeJuryQueue   bool                  `json:"distribute_jury_queue"`
	Juries                []string              `json:"juries"`
}

type StandingEntry struct {
	Rank             int      `json:"rank"`
	Username         string   `json:"username"`
	Role             string   `json:"role,omitempty"`
	AcceptedCount    int      `json:"accepted_count"`
	PendingCount     int      `json:"pending_count"`
	RejectedCount    int      `json:"rejected_count"`
	TotalWords       int      `json:"total_words"`
	TotalBytes       int      `json:"total_bytes"`
	SubmittedCount   int      `json:"submitted_count"`
	SubmittedWords   int      `json:"submitted_words"`
	SubmittedBytes   int      `json:"submitted_bytes"`
	WikisContributed []string `json:"wikis_contributed,omitempty"`
}

type GlobalProfileContestArticle struct {
	ID               int64      `json:"id"`
	Title            string     `json:"title"`
	Status           string     `json:"status"`
	ValidationError  string     `json:"validation_error"`
	WordCount        int        `json:"word_count"`
	ByteCount        int        `json:"byte_count"`
	WikiCreator      string     `json:"wiki_creator"`
	WikiCreationDate *time.Time `json:"wiki_creation_date,omitempty"`
	SubmittedAt      time.Time  `json:"submitted_at"`
}

type GlobalProfileParticipatedContest struct {
	Code       string                        `json:"code"`
	Name       string                        `json:"name"`
	StartDate  *time.Time                    `json:"start_date,omitempty"`
	EndDate    *time.Time                    `json:"end_date,omitempty"`
	WikiURL    string                        `json:"wiki_url"`
	WikiDbName string                        `json:"wiki_dbname"`
	Articles   []GlobalProfileContestArticle `json:"articles"`
}

type GlobalProfileReview struct {
	ArticleTitle string    `json:"article_title"`
	Submitter    string    `json:"submitter"`
	Decision     string    `json:"decision"`
	Comment      string    `json:"comment"`
	ReviewedAt   time.Time `json:"reviewed_at"`
}

type GlobalProfileJudgedContest struct {
	Code          string                `json:"code"`
	Name          string                `json:"name"`
	StartDate     *time.Time            `json:"start_date,omitempty"`
	EndDate       *time.Time            `json:"end_date,omitempty"`
	WikiURL       string                `json:"wiki_url"`
	RoleInContest string                `json:"role_in_contest"`
	Stats         map[string]int        `json:"stats"`
	Reviews       []GlobalProfileReview `json:"reviews"`
}

type GlobalUserProfile struct {
	Username             string                             `json:"username"`
	Role                 string                             `json:"role"`
	ParticipatedContests []GlobalProfileParticipatedContest `json:"participated_contests"`
	JudgedContests       []GlobalProfileJudgedContest       `json:"judged_contests"`
}

type ContestUserSubmissionReview struct {
	Jury       string    `json:"jury"`
	Decision   string    `json:"decision"`
	Comment    string    `json:"comment"`
	ReviewedAt time.Time `json:"reviewed_at"`
}

type ContestUserSubmission struct {
	ID              int64                         `json:"id"`
	Title           string                        `json:"title"`
	Status          string                        `json:"status"`
	ValidationError string                        `json:"validation_error"`
	WordCount       int                           `json:"word_count"`
	ByteCount       int                           `json:"byte_count"`
	SubmittedAt     time.Time                     `json:"submitted_at"`
	Reviews         []ContestUserSubmissionReview `json:"reviews"`
}

type ContestUserProfile struct {
	Username    string                  `json:"username"`
	Role        string                  `json:"role"`
	ContestCode string                  `json:"contest_code"`
	ContestName string                  `json:"contest_name"`
	WikiURL     string                  `json:"wiki_url"`
	RankByWords bool                    `json:"rank_by_words"`
	MinWords    int                     `json:"min_words"`
	MinBytes    int                     `json:"min_bytes"`
	Standing    *StandingEntry          `json:"standing,omitempty"`
	Submissions []ContestUserSubmission `json:"submissions"`
	Reviews     []GlobalProfileReview   `json:"reviews"`
}

type AdminOverview struct {
	TotalContests   int `json:"total_contests"`
	PendingContests int `json:"pending_contests"`
	ActiveContests  int `json:"active_contests"`
	EndedContests   int `json:"ended_contests"`
	TotalArticles   int `json:"total_articles"`
	TotalUsers      int `json:"total_users"`
}

type PlatformOverviewTotals struct {
	Words       int64 `json:"words"`
	Articles    int   `json:"articles"`
	Submissions int   `json:"submissions"`
	People      int   `json:"people"`
	Wikis       int   `json:"wikis"`
	Contests    int   `json:"contests"`
}

type PlatformOverviewMonth struct {
	Entries int   `json:"entries"`
	Words   int64 `json:"words"`
	People  int   `json:"people"`
}

type PlatformOverviewTrendItem struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type PlatformOverview struct {
	Totals PlatformOverviewTotals      `json:"totals"`
	Month  PlatformOverviewMonth       `json:"month"`
	Trend  []PlatformOverviewTrendItem `json:"trend"`
}

type ContestDailyStat struct {
	Date            string `json:"date"`
	Count           int    `json:"count"`
	Words           int    `json:"words"`
	Judged          int    `json:"judged"`
	CumulativeCount int    `json:"cumulative_count"`
	CumulativeWords int    `json:"cumulative_words"`
}

type ContestWordStats struct {
	TotalWords    int     `json:"total_words"`
	AcceptedWords int     `json:"accepted_words"`
	PendingWords  int     `json:"pending_words"`
	RejectedWords int     `json:"rejected_words"`
	AvgWords      float64 `json:"avg_words"`
}

type ContestParticipantStat struct {
	Username string `json:"username"`
	Total    int    `json:"total"`
	Accepted int    `json:"accepted"`
	Pending  int    `json:"pending"`
	Rejected int    `json:"rejected"`
	Words    int    `json:"words"`
}

type ContestLargestArticle struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	WordCount int    `json:"word_count"`
	ByteCount int    `json:"byte_count"`
	Submitter string `json:"submitter"`
	Status    string `json:"status"`
}

type ContestJuryPerformance struct {
	Username       string  `json:"username"`
	TotalReviews   int     `json:"total_reviews"`
	AcceptedCount  int     `json:"accepted_count"`
	RejectedCount  int     `json:"rejected_count"`
	AcceptanceRate float64 `json:"acceptance_rate"`
	ActiveDays     int     `json:"active_days"`
	LastReviewedAt string  `json:"last_reviewed_at"`
}

type ContestStatsSummary struct {
	TotalSubmissions     int     `json:"total_submissions"`
	ThisWeekSubmissions  int     `json:"this_week_submissions"`
	TotalParticipants    int     `json:"total_participants"`
	AcceptedParticipants int     `json:"accepted_participants"`
	ActiveJuries         int     `json:"active_juries"`
	TotalJuries          int     `json:"total_juries"`
	TotalReviews         int     `json:"total_reviews"`
	OrganizersCount      int     `json:"organizers_count"`
	ProgressPercent      int     `json:"progress_percent"`
	DecidedCount         int     `json:"decided_count"`
	RetentionPercent     float64 `json:"retention_percent"`
	BusiestDay           string  `json:"busiest_day"`
	BusiestDayCount      int     `json:"busiest_day_count"`
	DailyAvgSubmissions  float64 `json:"daily_avg_submissions"`
	ActiveSubmissionDays int     `json:"active_submission_days"`
	TotalContestDays     int     `json:"total_contest_days"`
}

type ContestStatsResponse struct {
	StatusCounts    map[string]int           `json:"status_counts"`
	Words           ContestWordStats         `json:"words"`
	Summary         ContestStatsSummary      `json:"summary"`
	Daily           []ContestDailyStat       `json:"daily"`
	TopParticipants []ContestParticipantStat `json:"top_participants"`
	LargestArticles []ContestLargestArticle  `json:"largest_articles"`
	JuryPerformance []ContestJuryPerformance `json:"jury_performance"`
	Signature       string                   `json:"signature"`
}

// ---------------------------------------------------------------------------
// Community Chat & Moderation Models
// ---------------------------------------------------------------------------

type CommunityChatMessage struct {
	ID             int    `json:"id"`
	ContestID      int    `json:"contest_id"`
	IsCampaignChat bool   `json:"is_campaign_chat"`
	UserID         int    `json:"user_id"`
	Username       string `json:"username"`
	UserRole       string `json:"user_role"`
	Message        string `json:"message"`
	IsDeleted      bool   `json:"is_deleted"`
	DeletedBy      string `json:"deleted_by,omitempty"`
	DeletedReason  string `json:"deleted_reason,omitempty"`
	CreatedAt      string `json:"created_at"`
}

type ChatMessageKeysetResult struct {
	Items      []CommunityChatMessage `json:"items"`
	NextCursor *int                   `json:"next_cursor,omitempty"`
	HasMore    bool                   `json:"has_more"`
}

type UserChatModeration struct {
	ID           int     `json:"id"`
	UserID       int     `json:"user_id"`
	Username     string  `json:"username"`
	ContestID    *int    `json:"contest_id,omitempty"`
	Action       string  `json:"action"` // 'warn', 'timeout', 'ban', 'unban'
	TimeoutUntil *string `json:"timeout_until,omitempty"`
	Reason       string  `json:"reason"`
	ModeratedBy  string  `json:"moderated_by"`
	CreatedAt    string  `json:"created_at"`
}

type UserChatStatus struct {
	CanChat      bool    `json:"can_chat"`
	Status       string  `json:"status"` // 'active', 'timed_out', 'banned'
	TimeoutUntil *string `json:"timeout_until,omitempty"`
	WarningCount int     `json:"warning_count"`
	BanReason    string  `json:"ban_reason,omitempty"`
}

type PostChatMessageRequest struct {
	Message        string `json:"message"`
	IsCampaignChat bool   `json:"is_campaign_chat"`
}

type ModerateUserRequest struct {
	Username        string `json:"username"`
	Action          string `json:"action"` // 'warn', 'timeout', 'ban', 'unban'
	DurationMinutes int    `json:"duration_minutes,omitempty"`
	Reason          string `json:"reason"`
}

type DeleteChatMessageRequest struct {
	Reason string `json:"reason"`
}

