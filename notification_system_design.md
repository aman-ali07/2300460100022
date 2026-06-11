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

