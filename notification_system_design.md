# Notification System Design

## Stage 1 — API Design

REST for list/read/mark-as-read and priority endpoints. SSE for live updates since data flows server-to-client only.

## Stage 2 — Database Design

PostgreSQL for stability, constraints, and indexing. Schema is normalized with read/unread state per student. Partitioning, replicas, and caching can be added later when traffic grows.

## Stage 3 — Query Optimization

No `SELECT *`. Composite index matching the filter and sort pattern instead of indexing every column.

## Stage 4 — Caching Strategy

Redis with a short TTL to reduce repeated reads. Cursor-based pagination to avoid offset scans. Read replicas if read traffic gets heavy, but not the first fix.

## Stage 5 — Bulk Notification Reliability

Use jobs with retries and progress tracking instead of a single loop. DB writes first, then async email/push delivery. Failures are visible and retriable.

## Stage 6 — Priority Inbox Algorithm

Rank by type weight (Placement=3, Result=2, Event=1) then recency: `score = weight / (hours_old + 1)`. Top items stay sorted in a small list. See implementation: [notification_app_be/src/utils/priority.ts](notification_app_be/src/utils/priority.ts)
