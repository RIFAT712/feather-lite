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
	Name                  string   `json:"name"`
	Description           string   `json:"description"`
	StartDate             string   `json:"start_date"`
	EndDate               string   `json:"end_date"`
	Status                string   `json:"status"`
	WikiTZ                string   `json:"wiki_tz,omitempty"`
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
	DistributeJuryQueue   bool     `json:"distribute_jury_queue"`
	Juries                []string `json:"juries"`
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
	TotalWords       int      `json:"total_words"`
	TotalBytes       int      `json:"total_bytes"`
	SubmittedCount   int      `json:"submitted_count"`
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
