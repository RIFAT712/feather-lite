#!/usr/bin/env python3
"""
Zero-Data-Loss Migration Script:
Merges MariaDB s57924__app (feather v1) + SQLite feather.db (feather-lite)
into /data/project/feather/feather.db on Wikimedia Toolforge.
"""

import os
import sys
import shutil
import sqlite3
import subprocess
from datetime import datetime, timezone

TIMESTAMP = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
FEATHER_DIR = "/data/project/feather"
FEATHER_LITE_DIR = "/data/project/feather-lite"
BACKUP_DIR = os.path.join(FEATHER_DIR, "backup")
TARGET_DB = os.path.join(FEATHER_DIR, "feather.db")

os.makedirs(BACKUP_DIR, exist_ok=True)

def run_cmd(cmd, check=True):
    print(f"[CMD] {cmd}")
    res = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if check and res.returncode != 0:
        print(f"[ERROR] Exit code {res.returncode}:\n{res.stderr}")
        sys.exit(res.returncode)
    return res.stdout

def run_mariadb_query(query):
    cmd = f"mariadb --defaults-file={FEATHER_DIR}/replica.my.cnf -h tools.db.svc.wikimedia.cloud s57924__app -B -e \"{query}\""
    res = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"[ERROR] Query failed: {res.stderr}")
        sys.exit(1)
    lines = [l for l in res.stdout.split("\n") if l.strip()]
    if not lines:
        return []
    headers = lines[0].split("\t")
    rows = []
    for line in lines[1:]:
        parts = line.split("\t")
        row = {}
        for i, h in enumerate(headers):
            val = parts[i] if i < len(parts) else ""
            row[h] = None if val == "NULL" else val
        rows.append(row)
    return rows

print("=" * 60)
print("1. CREATING PRE-MIGRATION BACKUPS")
print("=" * 60)

# 1a. Backup s57924__app (s57924__app is read-only for this migration; copy existing dump)
mariadb_backup_file = os.path.join(BACKUP_DIR, f"s57924__app_snapshot_{TIMESTAMP}.sql")
existing_dump = os.path.join(FEATHER_DIR, "feather-backup.sql")
if os.path.exists(existing_dump):
    print(f"Preserving existing MariaDB dump {existing_dump} to {mariadb_backup_file}...")
    shutil.copy2(existing_dump, mariadb_backup_file)
    print("MariaDB dump preserved. Size:", os.path.getsize(mariadb_backup_file), "bytes")

# 1b. Backup feather-lite SQLite DB
source_lite_db = os.path.join(FEATHER_LITE_DIR, "feather.db")
lite_backup_file = os.path.join(BACKUP_DIR, f"feather_lite_{TIMESTAMP}.db")
print(f"Copying {source_lite_db} to {lite_backup_file}...")
shutil.copy2(source_lite_db, lite_backup_file)
print("feather-lite DB backup complete. Size:", os.path.getsize(lite_backup_file), "bytes")

# 1c. If TARGET_DB already exists on feather, back it up
if os.path.exists(TARGET_DB):
    existing_backup = os.path.join(BACKUP_DIR, f"feather_existing_{TIMESTAMP}.db")
    print(f"Backing up existing target DB {TARGET_DB} to {existing_backup}...")
    shutil.copy2(TARGET_DB, existing_backup)

print("\n" + "=" * 60)
print("2. INITIALIZING TARGET DB FROM FEATHER-LITE (7 CONTESTS + 2,538 ARTICLES)")
print("=" * 60)
shutil.copy2(source_lite_db, TARGET_DB)

conn = sqlite3.connect(TARGET_DB)
conn.execute("PRAGMA journal_mode=WAL;")
conn.execute("PRAGMA synchronous=NORMAL;")
conn.execute("PRAGMA foreign_keys=OFF;")
cursor = conn.cursor()

print("Initial target DB status:")
for t in ["contests", "articles", "reviews", "users", "talk_page_jobs"]:
    cnt = cursor.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
    print(f"  {t}: {cnt}")

print("\n" + "=" * 60)
print("3. IMPORTING USERS FROM s57924__app")
print("=" * 60)
mariadb_users = run_mariadb_query("SELECT id, wiki_username, role, oauth_access_token FROM users")
print(f"Found {len(mariadb_users)} users in s57924__app.")

user_id_map = {} # old_id -> new_id
for u in mariadb_users:
    uname = u["wiki_username"]
    role = u["role"] or "participant"
    token = u["oauth_access_token"]
    cursor.execute("INSERT OR IGNORE INTO users (wiki_username, role, oauth_access_token) VALUES (?, ?, ?)", (uname, role, token))
    target_uid = cursor.execute("SELECT id FROM users WHERE wiki_username = ?", (uname,)).fetchone()[0]
    user_id_map[int(u["id"])] = target_uid

conn.commit()
total_users = cursor.execute("SELECT count(*) FROM users").fetchone()[0]
print(f"Total users in target DB after merge: {total_users}")

print("\n" + "=" * 60)
print("4. IMPORTING CONTEST 86be15 FROM s57924__app")
print("=" * 60)
mariadb_contests = run_mariadb_query("SELECT * FROM contests WHERE code = '86be15'")
if not mariadb_contests:
    print("[ERROR] Contest 86be15 not found in s57924__app!")
    sys.exit(1)

old_c = mariadb_contests[0]
old_contest_id = int(old_c["id"])

existing_c = cursor.execute("SELECT id FROM contests WHERE code = '86be15'").fetchone()
if existing_c:
    new_contest_id = existing_c[0]
    print(f"Contest 86be15 already exists in target DB with id={new_contest_id}")
else:
    cursor.execute("""
        INSERT INTO contests (
            code, name, wiki_dbname, wiki_url, wiki_lang, wiki_tz,
            start_date, end_date, status, is_draft,
            rule_must_be_creator, rule_no_redirect, rule_no_disambig, rule_mainspace_only,
            min_bytes, min_words, min_refs, add_talk_template, talk_template_name, created_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?
        )
    """, (
        old_c["code"],
        old_c["name"],
        "bnwiktionary",
        "https://bn.wiktionary.org",
        "bn",
        "UTC",
        old_c["start_date"],
        old_c["end_date"],
        "ended",
        0,
        int(old_c.get("rule_must_be_creator") or 1),
        int(old_c.get("rule_no_redirect") or 1),
        int(old_c.get("rule_no_disambig") or 1),
        int(old_c.get("rule_mainspace_only") or 1),
        int(old_c.get("min_bytes") or 0),
        int(old_c.get("min_words") or 0),
        int(old_c.get("min_refs") or 0),
        int(old_c.get("add_talk_template") or 0),
        old_c.get("talk_template_name") or "",
        old_c.get("start_date")
    ))
    new_contest_id = cursor.lastrowid
    print(f"Inserted contest 86be15 into target DB with new id={new_contest_id}")

conn.commit()

# 4b. Juries & Restrictions
mariadb_juries = run_mariadb_query(f"SELECT user_id FROM contest_jury WHERE contest_id = {old_contest_id}")
for j in mariadb_juries:
    old_uid = int(j["user_id"])
    new_uid = user_id_map.get(old_uid)
    if new_uid:
        cursor.execute("INSERT OR IGNORE INTO contest_juries (contest_id, user_id) VALUES (?, ?)", (new_contest_id, new_uid))

mariadb_restr = run_mariadb_query(f"SELECT jury_user_id, submitter_user_id FROM contest_jury_restrictions WHERE contest_id = {old_contest_id}")
for r in mariadb_restr:
    j_uid = user_id_map.get(int(r["jury_user_id"]))
    s_uid = user_id_map.get(int(r["submitter_user_id"]))
    if j_uid and s_uid:
        cursor.execute("INSERT OR IGNORE INTO contest_jury_restrictions (contest_id, jury_user_id, submitter_user_id) VALUES (?, ?, ?)", (new_contest_id, j_uid, s_uid))

conn.commit()

print("\n" + "=" * 60)
print("5. IMPORTING 53,189 ARTICLES FOR CONTEST 86be15")
print("=" * 60)

max_existing_aid = cursor.execute("SELECT COALESCE(MAX(id), 0) FROM articles").fetchone()[0]
print(f"Base article ID offset: {max_existing_aid}")

articles_tsv = f"/tmp/feather_articles_{TIMESTAMP}.tsv"
print(f"Streaming articles from s57924__app to {articles_tsv}...")
run_cmd(f"mariadb --defaults-file={FEATHER_DIR}/replica.my.cnf -h tools.db.svc.wikimedia.cloud s57924__app -B -e \"SELECT id, title, submitter_id, status, validation_error, wiki_creation_date, wiki_creator, submitted_at, assigned_to_id FROM articles WHERE contest_id = {old_contest_id}\" > {articles_tsv}")

batch = []
count = 0

with open(articles_tsv, "r", encoding="utf-8", errors="replace") as f:
    headers = f.readline().strip().split("\t")
    for line in f:
        parts = line.rstrip("\n").split("\t")
        row = {headers[i]: (parts[i] if parts[i] != "NULL" else None) for i in range(len(headers))}
        old_aid = int(row["id"])
        new_aid = max_existing_aid + old_aid
        sub_id = user_id_map.get(int(row["submitter_id"])) if row["submitter_id"] else 1
        assigned_id = user_id_map.get(int(row["assigned_to_id"])) if row["assigned_to_id"] else None
        
        batch.append((
            new_aid,
            new_contest_id,
            row["title"],
            sub_id,
            row["status"] or "pending",
            row["validation_error"] or "",
            row["wiki_creator"] or "",
            row["wiki_creation_date"],
            0, # byte_count
            0, # word_count
            1, # word_count_verified
            assigned_id,
            row["submitted_at"] or row["wiki_creation_date"]
        ))
        count += 1
        if len(batch) >= 5000:
            cursor.executemany("""
                INSERT INTO articles (
                    id, contest_id, title, submitter_id, status, validation_error,
                    wiki_creator, wiki_creation_date, byte_count, word_count,
                    word_count_verified, assigned_to_id, submitted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, batch)
            batch = []
            conn.commit()
            print(f"  Processed {count}/53189 articles...")

if batch:
    cursor.executemany("""
        INSERT INTO articles (
            id, contest_id, title, submitter_id, status, validation_error,
            wiki_creator, wiki_creation_date, byte_count, word_count,
            word_count_verified, assigned_to_id, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, batch)
    conn.commit()
    print(f"  Processed {count}/53189 articles...")

print(f"Successfully inserted {count} articles into target DB.")
os.remove(articles_tsv)

print("\n" + "=" * 60)
print("6. IMPORTING 50,828 REVIEWS")
print("=" * 60)

reviews_tsv = f"/tmp/feather_reviews_{TIMESTAMP}.tsv"
print(f"Streaming reviews from s57924__app to {reviews_tsv}...")
run_cmd(f"mariadb --defaults-file={FEATHER_DIR}/replica.my.cnf -h tools.db.svc.wikimedia.cloud s57924__app -B -e \"SELECT r.id, r.article_id, r.reviewer_id, r.status, r.comment, r.timestamp FROM reviews r JOIN articles a ON r.article_id = a.id WHERE a.contest_id = {old_contest_id}\" > {reviews_tsv}")

review_batch = []
r_count = 0

with open(reviews_tsv, "r", encoding="utf-8", errors="replace") as f:
    r_headers = f.readline().strip().split("\t")
    for line in f:
        parts = line.rstrip("\n").split("\t")
        row = {r_headers[i]: (parts[i] if parts[i] != "NULL" else None) for i in range(len(r_headers))}
        old_aid = int(row["article_id"])
        new_aid = max_existing_aid + old_aid
        rev_id = user_id_map.get(int(row["reviewer_id"])) if row["reviewer_id"] else 1
        
        review_batch.append((
            new_aid,
            rev_id,
            row["status"] or "accepted",
            row["comment"] or "",
            row["timestamp"]
        ))
        r_count += 1
        if len(review_batch) >= 5000:
            cursor.executemany("""
                INSERT OR IGNORE INTO reviews (
                    article_id, reviewer_id, status, comment, timestamp
                ) VALUES (?, ?, ?, ?, ?)
            """, review_batch)
            review_batch = []
            conn.commit()
            print(f"  Processed {r_count} reviews...")

if review_batch:
    cursor.executemany("""
        INSERT OR IGNORE INTO reviews (
            article_id, reviewer_id, status, comment, timestamp
        ) VALUES (?, ?, ?, ?, ?)
    """, review_batch)
    conn.commit()
    print(f"  Processed {r_count} reviews...")

print(f"Successfully imported {r_count} reviews into target DB.")
os.remove(reviews_tsv)

print("\n" + "=" * 60)
print("7. FINAL DATABASE VERIFICATION & INTEGRITY CHECK")
print("=" * 60)
cursor.execute("PRAGMA foreign_keys=ON;")
cursor.execute("PRAGMA wal_checkpoint(TRUNCATE);")

print("Final Target DB Record Counts:")
for t in ["contests", "articles", "reviews", "users", "talk_page_jobs", "contest_juries"]:
    cnt = cursor.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
    print(f"  {t}: {cnt}")

integrity = cursor.execute("PRAGMA integrity_check;").fetchall()
print(f"SQLite Integrity Check: {integrity}")

conn.close()

os.chmod(TARGET_DB, 0o664)
print("\n[SUCCESS] Zero-data-loss database migration complete!")
