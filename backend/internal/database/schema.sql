-- Schema for Feather 2.0 (High throughput, 50,000+ entries)

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wiki_username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'participant', -- 'participant', 'jury', 'owner'
    oauth_access_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    wiki_dbname TEXT NOT NULL DEFAULT 'bnwiki',
    wiki_url TEXT NOT NULL DEFAULT 'https://bn.wikipedia.org',
    wiki_lang TEXT NOT NULL DEFAULT 'bn',
    wiki_tz TEXT NOT NULL DEFAULT 'UTC',
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'draft', 'active', 'ended'
    is_draft INTEGER NOT NULL DEFAULT 0,
    rule_must_be_creator INTEGER NOT NULL DEFAULT 1,
    rule_no_redirect INTEGER NOT NULL DEFAULT 1,
    rule_no_disambig INTEGER NOT NULL DEFAULT 1,
    rule_mainspace_only INTEGER NOT NULL DEFAULT 1,
    rule_created_in_window INTEGER NOT NULL DEFAULT 1,
    custom_creation_start_date DATETIME,
    custom_creation_end_date DATETIME,
    min_bytes INTEGER NOT NULL DEFAULT 0,
    min_words INTEGER NOT NULL DEFAULT 0,
    min_refs INTEGER NOT NULL DEFAULT 0,
    max_submissions_per_user INTEGER NOT NULL DEFAULT 0,
    rank_by_words INTEGER NOT NULL DEFAULT 0,
    results_published_at DATETIME,
    add_talk_template INTEGER NOT NULL DEFAULT 0,
    talk_template_name TEXT DEFAULT '',
    distribute_jury_queue INTEGER NOT NULL DEFAULT 0,
    is_umbrella INTEGER NOT NULL DEFAULT 0,
    parent_contest_id INTEGER REFERENCES contests(id) ON DELETE SET NULL,
    created_by_id INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contest_juries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(contest_id, user_id)
);

CREATE TABLE IF NOT EXISTS contest_jury_restrictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    jury_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submitter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(contest_id, jury_user_id, submitter_user_id)
);

CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    submitter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'validation_failed'
    validation_error TEXT DEFAULT '',
    wiki_creator TEXT DEFAULT '',
    wiki_creation_date DATETIME,
    byte_count INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    word_count_verified INTEGER DEFAULT 1,
    assigned_to_id INTEGER REFERENCES users(id),
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    locked_until DATETIME,
    locked_by_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'accepted', 'rejected', 'skipped'
    comment TEXT DEFAULT '',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(article_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS talk_page_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'processing', 'done', 'failed'
    attempts INTEGER NOT NULL DEFAULT 0,
    error TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME
);

-- Crucial composite indexes for 50k+ scale keyset pagination (O(1) lookups)
CREATE INDEX IF NOT EXISTS idx_articles_contest_keyset ON articles(contest_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_articles_contest_status ON articles(contest_id, status, id DESC);
CREATE INDEX IF NOT EXISTS idx_articles_jury_queue ON articles(contest_id, assigned_to_id, status, id DESC);
CREATE INDEX IF NOT EXISTS idx_articles_submitter ON articles(contest_id, submitter_id);
CREATE INDEX IF NOT EXISTS idx_reviews_article ON reviews(article_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_talk_jobs_status ON talk_page_jobs(status, id);
CREATE INDEX IF NOT EXISTS idx_contests_parent ON contests(parent_contest_id);
CREATE INDEX IF NOT EXISTS idx_contests_is_umbrella ON contests(is_umbrella);
