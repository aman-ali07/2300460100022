# Notification System Design

---

## Stage 1

### REST API Design — Campus Notification Platform

#### Core Actions

The notification platform needs to support these core actions:
1. **Fetch notifications** — paginated, filterable by type
2. **Fetch a single notification** — by ID
3. **Mark as read** — single or all notifications
4. **Fetch priority notifications** — top N ranked by importance + recency
5. **Real-time delivery** — push new notifications to the client without polling

---

#### API Endpoints

All requests require:
```
Authorization: Bearer <token>
Content-Type: application/json
```

---

##### 1. Get All Notifications

```
GET /api/notifications
```

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 20) |
| `notification_type` | string | Filter: `Event`, `Result`, `Placement` |

**Response (200):**
```json
{
  "notifications": [
    {
      "id": "d146095a-0d86-4a34-9e69-3900314576bc",
      "type": "Result",
      "message": "Mid-semester results published",
      "createdAt": "2026-04-22T17:51:30Z",
      "isRead": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

##### 2. Get Single Notification

```
GET /api/notifications/:id
```

**Response (200):**
```json
{
  "notification": {
    "id": "d146095a-0d86-4a34-9e69-3900314576bc",
    "type": "Placement",
    "message": "CSX Corporation is hiring — apply by Friday",
    "createdAt": "2026-04-22T17:51:30Z",
    "isRead": false
  }
}
```

**Response (404):**
```json
{ "error": "Notification not found" }
```

---

##### 3. Mark Notification as Read

```
PATCH /api/notifications/:id/read
```

**Response (200):**
```json
{ "message": "Notification marked as read" }
```

---

##### 4. Mark All Notifications as Read

```
PATCH /api/notifications/read-all
```

**Response (200):**
```json
{ "message": "All notifications marked as read", "count": 42 }
```

---

##### 5. Get Priority Notifications

```
GET /api/notifications/priority
```

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `n` | number | Number of top notifications to return (default: 10) |
| `notification_type` | string | Optional type filter |

**Response (200):**
```json
{
  "notifications": [
    {
      "id": "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
      "type": "Placement",
      "message": "CSX Corporation hiring",
      "createdAt": "2026-04-22T17:51:18Z",
      "isRead": false
    }
  ],
  "total": 10
}
```

---

#### Real-Time Notifications — Server-Sent Events (SSE)

I chose **SSE (Server-Sent Events)** over WebSockets because:
- Notifications only flow **server → client** (one-way). SSE is designed for this.
- SSE uses plain HTTP — no special protocol, works through proxies and firewalls.
- Browsers auto-reconnect if the connection drops (built-in resilience).
- Simpler to implement than WebSockets for a read-only notification stream.

```
GET /api/notifications/stream
Authorization: Bearer <token>
Accept: text/event-stream
```

**Server sends:**
```
data: {"id":"b283218f","type":"Placement","message":"New company hiring"}

data: {"id":"c471a3f2","type":"Result","message":"Results published"}
```

**Client (JavaScript):**
```javascript
const source = new EventSource('/api/notifications/stream');
source.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  // Add to the top of the notification list
};
```

---

---

## Stage 2

### Database Design

#### Choice: PostgreSQL

**Why PostgreSQL?**
- **ACID compliance** — guarantees data integrity (no partial writes)
- **Rich indexing** — composite, partial, and expression indexes for query optimization
- **Enum support** — enforces valid notification types at DB level
- **Joins** — easy to link students with their notification read status
- **Mature ecosystem** — well-understood, reliable, production-proven

---

#### Schema

```sql
-- Enum for notification types
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

-- Students (one row per campus student)
CREATE TABLE students (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) UNIQUE NOT NULL,
  roll_no    VARCHAR(50)  UNIQUE NOT NULL,
  created_at TIMESTAMP    DEFAULT NOW()
);

-- Notifications (the actual notification content)
-- One row per notification broadcast to all students
CREATE TABLE notifications (
  id                UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type notification_type NOT NULL,
  message           TEXT             NOT NULL,
  created_at        TIMESTAMP        DEFAULT NOW()
);

-- Student-Notification mapping (tracks read status per student)
-- Many-to-many: each student has their own read/unread state per notification
CREATE TABLE student_notifications (
  student_id      INT  REFERENCES students(id)      ON DELETE CASCADE,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  is_read         BOOLEAN   DEFAULT FALSE,
  read_at         TIMESTAMP,
  PRIMARY KEY (student_id, notification_id)
);

-- Indexes for fast queries
CREATE INDEX idx_sn_student_created
  ON notifications(created_at DESC);

CREATE INDEX idx_sn_student_unread
  ON student_notifications(student_id, is_read);

CREATE INDEX idx_notif_type_created
  ON notifications(notification_type, created_at DESC);
```

---

#### Problems as Data Grows + Solutions

| Problem | Scale Trigger | Solution |
|---------|--------------|----------|
| `student_notifications` grows to billions of rows | 50K students × millions of notifications | **Partition by created_at** (monthly partitions) |
| Slow read queries under load | Thousands of concurrent users | **Read replica** — route SELECT to replica, writes to primary |
| Hot writes when "Notify All" triggers | 50K simultaneous inserts | **Message queue** (BullMQ) — insert asynchronously via workers |
| Stale data in user feed | High read traffic | **Redis cache** with 60s TTL (see Stage 4) |

---

#### SQL Queries for Stage 1 APIs

```sql
-- GET /api/notifications?page=1&limit=20 (for student ID 1042)
SELECT
  n.id,
  n.notification_type,
  n.message,
  n.created_at,
  sn.is_read
FROM notifications n
JOIN student_notifications sn ON n.id = sn.notification_id
WHERE sn.student_id = 1042
ORDER BY n.created_at DESC
LIMIT 20 OFFSET 0;

-- GET /api/notifications?notification_type=Placement
SELECT
  n.id,
  n.notification_type,
  n.message,
  n.created_at,
  sn.is_read
FROM notifications n
JOIN student_notifications sn ON n.id = sn.notification_id
WHERE sn.student_id = 1042
  AND n.notification_type = 'Placement'
ORDER BY n.created_at DESC
LIMIT 20 OFFSET 0;

-- PATCH /api/notifications/:id/read
UPDATE student_notifications
SET is_read = TRUE, read_at = NOW()
WHERE student_id = 1042 AND notification_id = $1;

-- PATCH /api/notifications/read-all
UPDATE student_notifications
SET is_read = TRUE, read_at = NOW()
WHERE student_id = 1042 AND is_read = FALSE;
```

---

---

## Stage 3

### Query Optimization

#### Given Slow Query

```sql
SELECT * FROM notifications
WHERE student_id = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

---

#### Q1: Is this query accurate?

**No, it has issues:**

1. `SELECT *` — fetches all columns including ones not needed (wastes I/O and memory)
2. `student_id` — if using the normalized schema from Stage 2, this column does not exist on the `notifications` table. It is in `student_notifications`. So the query would fail.
3. `isRead` and `createdAt` — inconsistent naming. The column should be `is_read` and `created_at` (snake_case, per PostgreSQL convention).
4. Even assuming the schema is a single flat `notifications` table with `student_id` and `is_read`, there are performance issues (see Q2).

---

#### Q2: Why is this slow?

With **50,000 students** and **5,000,000 notifications**, assuming no index:

- The database performs a **full table scan** — it reads all 5 million rows to find the ones where `student_id = 1042 AND is_read = false`.
- After the scan, it must **sort** all matching rows by `created_at`. With no index, this sort is O(k log k) where k is the number of matching rows.
- `SELECT *` causes the DB to fetch every column from disk, including large `message` fields for rows we may not need.

**Result:** The query is O(n) for the scan + O(k log k) for sort = very slow on 5M rows.

---

#### Q3: What would I change? Computation cost?

**Changes:**

```sql
SELECT id, notification_type, message, created_at
FROM notifications
WHERE student_id = 1042
  AND is_read = false
ORDER BY created_at ASC;

-- Create a composite index that covers all conditions
CREATE INDEX idx_notif_student_unread_time
  ON notifications(student_id, is_read, created_at ASC);
```

**With this index:**
- The DB uses the index to jump directly to rows where `student_id = 1042 AND is_read = false` — O(log n) lookup.
- The results from the index are already in `created_at ASC` order — no separate sort step.
- We only read the specific columns we need, not `SELECT *`.

**Computation cost comparison:**

| | Before | After |
|--|--------|-------|
| Scan | O(n) full table scan — 5M rows | O(log n) index seek |
| Sort | O(k log k) in-memory sort | O(1) — index already sorted |
| I/O | All columns fetched | Only needed columns |

---

#### Q4: Is "index every column" a good idea?

**No. This is bad advice for several reasons:**

1. **Indexes take disk space** — each index is a separate B-tree structure. Indexing every column on a 5M-row table would use GBs of storage.
2. **Indexes slow down writes** — every `INSERT`, `UPDATE`, and `DELETE` must update all indexes. With many indexes, write performance degrades significantly.
3. **Indexes only help when used** — the query planner uses indexes based on WHERE clauses, JOIN conditions, and ORDER BY. An index on a column that is never filtered or joined on is pure overhead.
4. **The query planner can be confused** — too many indexes make it harder for PostgreSQL to choose the optimal plan.

**Rule:** Only index columns that appear in frequent `WHERE`, `JOIN ON`, or `ORDER BY` clauses.

---

#### Q5: Students who received a Placement notification in the last 7 days

```sql
-- Using the normalized schema (student_notifications + notifications)
SELECT DISTINCT sn.student_id
FROM student_notifications sn
JOIN notifications n ON sn.notification_id = n.id
WHERE n.notification_type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days';

-- Or, if using flat table with student_id directly on notifications:
SELECT DISTINCT student_id
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

---

---

## Stage 4

### Caching Strategy

#### Problem

On every page load, each student's browser fetches notifications from the database. With 50,000 students online simultaneously, this overwhelms the DB.

---

#### Solution 1: Redis Cache (Primary — Recommended)

**How it works:**
1. When a student requests notifications, check Redis first.
2. If found (cache hit), return immediately — no DB query.
3. If not found (cache miss), query the DB, store result in Redis with a TTL, return.
4. When a new notification is created, invalidate (delete) the affected cache keys.

**Cache key design:**
```
notifications:{student_id}:page:{page}:type:{type}
```

**TTL:** 60 seconds — balances freshness vs. DB load.

```
Request → Redis?
  ├── HIT  → return cached result (< 1ms)
  └── MISS → query DB → store in Redis with TTL=60s → return result
```

**Tradeoffs:**

| Benefit | Cost |
|---------|------|
| 90%+ reduction in DB queries | Notifications may be up to 60s stale |
| Sub-millisecond response on cache hits | Redis adds infrastructure complexity |
| Scales horizontally | Cache invalidation logic needs careful design |

---

#### Solution 2: Browser-Level Caching (Complementary)

Set `Cache-Control` headers on the notifications API response:
```
Cache-Control: private, max-age=30
```

The browser caches the response for 30 seconds. Repeat page visits or navigation back to the page serve from browser cache — **zero server requests**.

**Tradeoffs:**
- Even simpler than Redis
- Zero server load for repeat visits within 30 seconds
- Cannot be invalidated server-side (client controls the cache)

---

#### Solution 3: Cursor-Based Pagination (Structural Fix)

Instead of fetching all notifications on page load, load only what's visible. Use a cursor (last seen notification ID) instead of OFFSET:

```sql
-- Cursor-based (efficient even on 5M rows)
SELECT * FROM notifications
WHERE student_id = 1042
  AND created_at < :last_seen_cursor
ORDER BY created_at DESC
LIMIT 20;
```

**Tradeoffs:**
- Each page loads only 20 rows instead of scanning all rows
- Cannot jump to an arbitrary page (only next/previous)
- Reduces DB load significantly without needing Redis

---

#### Solution 4: Database Read Replicas

Route all `SELECT` queries to a read replica and all writes to the primary.

**Tradeoffs:**
- Doubles read capacity with minimal code change
- Replication lag (usually < 1 second) means replica may be slightly behind
- Adds infrastructure cost

---

#### Recommended Architecture

```
Browser → Redis Cache → DB Primary
           ↑                ↓
        (fast hits)    Read Replica (for reads)
                       (for writes)
```

Use Redis (Solution 1) + Cursor Pagination (Solution 3) together. This handles 95% of DB load at minimal staleness cost.

---

---

## Stage 5

### Bulk Notification Reliability

#### Given Pseudocode

```
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)    # calls Email API
        save_to_db(student_id, message)    # DB insert
        push_to_app(student_id, message)   # real-time push
```

---

#### Observed Shortcomings

1. **Sequential for-loop is too slow.**
   Processing 50,000 students one-by-one is extremely slow. Email APIs alone can take 200–500ms each — that's 50,000 × 300ms = **4+ hours** for a single "Notify All".

2. **No error handling.**
   If `send_email` throws at student #200, the entire loop crashes. Students #201 to #50,000 get nothing. There is no retry or partial recovery.

3. **No idempotency.**
   If the server crashes mid-loop and restarts, there is no way to know where we left off. Students 1–200 may get duplicate notifications.

4. **Tight coupling of three operations.**
   `send_email`, `save_to_db`, and `push_to_app` have different failure modes:
   - DB inserts are fast and reliable.
   - Email sending is slow and depends on an external service.
   - Treating them as one unit means a slow email blocks the DB insert for the next student.

5. **No progress tracking.**
   HR has no way to know how many students have been notified. No way to handle the "200 failed" scenario the logs report.

---

#### Q: Logs show `send_email` failed for 200 students midway. What now?

With the original design: **nothing can be done cleanly**. We don't know which 200 students failed, and re-running the whole loop causes duplicates for the 49,800 who succeeded.

With the redesigned system below, each job tracks its own state — failed jobs are retried automatically, and we have a record of exactly which students didn't receive the notification.

---

#### Q: Should DB save and email happen together?

**No.** They should be separate operations:
- They have **different failure modes** (DB rollback vs. external API error).
- DB insert is the **source of truth** — it should happen first and reliably.
- Email is **best-effort delivery** — it can fail and be retried without affecting data integrity.
- Treating them as one atomic unit (e.g., in a DB transaction) means if the email fails, the DB record is also rolled back — the student appears to have never been notified, even though we tried.

**Better model:** Save to DB first (permanent record). Then send email (async, retriable).

---

#### Redesigned Pseudocode

```
function notify_all(student_ids: array, message: string) -> batch_id:
    # 1. Create a batch record for tracking progress
    batch_id = generate_uuid()
    save_batch(batch_id, status="IN_PROGRESS", total=len(student_ids))

    # 2. Enqueue one job per student (non-blocking, O(1) per student)
    for student_id in student_ids:
        enqueue_job({
            batch_id: batch_id,
            student_id: student_id,
            message: message
        })

    return batch_id  # HR can poll this to see progress


# Worker (runs on multiple machines in parallel)
function process_job(job):
    try:
        # Step 1: Save to DB first (source of truth)
        save_to_db(job.student_id, job.message)

        # Step 2: Push real-time in-app notification
        push_to_app(job.student_id, job.message)

        # Step 3: Send email (slowest, separate concern)
        send_email(job.student_id, job.message)

        mark_job_complete(job)
        update_batch_progress(job.batch_id, status="completed")

    catch error:
        if job.attempts < MAX_RETRIES (e.g., 3):
            # Re-enqueue with exponential backoff: 1s, 2s, 4s
            retry_with_backoff(job, delay = 2^job.attempts seconds)
        else:
            mark_job_failed(job, reason=error.message)
            update_batch_progress(job.batch_id, status="failed")
            alert_admin(job)
```

**Why this is better:**
- Jobs run in **parallel** across multiple workers — 50K notifications in minutes, not hours.
- Each job is **independent** — one failure doesn't affect others.
- **Retry with backoff** handles transient failures (network hiccups, rate limits).
- DB insert happens **before** email → data integrity is preserved even if email fails.
- **Batch tracking** gives HR real-time progress visibility.

---

---

## Stage 6

### Priority Inbox Algorithm

See implementation file: `notification_app_be/src/utils/priority.ts`

---

#### Priority Score Formula

```
score = type_weight / (age_in_hours + 1)
```

**Type Weights:**
| Type | Weight |
|------|--------|
| Placement | 3 (highest) |
| Result | 2 |
| Event | 1 (lowest) |

**Recency Factor:** `1 / (age_in_hours + 1)`
- At age = 0 hours → factor = 1.0 (maximum recency)
- At age = 1 hour → factor = 0.5
- At age = 9 hours → factor = 0.1

**Examples:**
| Notification | Age | Score |
|---|---|---|
| Placement, 0h old | 0h | 3 / 1 = 3.00 |
| Placement, 2h old | 2h | 3 / 3 = 1.00 |
| Result, 0h old | 0h | 2 / 1 = 2.00 |
| Event, 0h old | 0h | 1 / 1 = 1.00 |
| Placement, 9h old | 9h | 3 / 10 = 0.30 |

This formula naturally ensures that a very old Placement notification can rank below a fresh Result notification — which is the desired behavior.

---

#### Algorithm 1: Batch Sort (for fetching existing notifications)

```typescript
function getTopN(notifications, n):
    return notifications
        .map(n => ({ ...n, score: getPriorityScore(n) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, n)
```

Time complexity: **O(n log n)** — simple and easy to understand.

---

#### Algorithm 2: PriorityInbox Class (for streaming new notifications)

When new notifications arrive in real time, we don't want to re-sort the entire list every time. Instead, we maintain a sorted list of exactly the top N items.

```typescript
class PriorityInbox {
    items = []  // sorted descending by score, max N items
    capacity = N

    add(notification):
        scored = { ...notification, score: getPriorityScore(notification) }

        if items.length < capacity:
            items.push(scored)
        else:
            lowestScore = items[items.length - 1].score
            if scored.score > lowestScore:
                items[items.length - 1] = scored  // replace the weakest

        items.sort(...)  // re-sort (N is small, e.g. 10 — very fast)
```

Time complexity per new notification: **O(N log N)** where N is the inbox size (e.g., 10), **not** the total number of notifications. Since N is always small, this is effectively **O(1)** in practice.

**Why not a heap?** A min-heap would give O(log N) per insertion, which is theoretically better. However, since N is at most 20, the difference is negligible in practice. The sorted array approach is simpler to implement and explain in an interview.
