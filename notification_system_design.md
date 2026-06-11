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

