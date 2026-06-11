# Notification System Design

---

## Stage 1 — API Design

This stage keeps the API simple: list notifications, read one item, mark as read, and fetch priority items.

I chose REST because it is easy to understand, easy to test, and enough for this use case.

For live updates, SSE fits better than WebSockets because the data flows only from server to client.

---

## Stage 2 — Database Design

PostgreSQL is the main choice here because it is stable, supports strong constraints, and handles indexing well.

The schema is normalized so notifications stay clean and the read/unread state is stored per student.

The main idea is to keep writes simple, keep reads fast, and add partitioning, replicas, and caching only when traffic grows.

---

## Stage 3 — Query Optimization

The focus here is to avoid unnecessary work: do not use `SELECT *`, and keep column names consistent with the schema.

A composite index is better than indexing everything because it matches the real filter and sort pattern.

The rule is simple: index the columns used often in `WHERE`, `JOIN`, and `ORDER BY`, not every column in the table.

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
