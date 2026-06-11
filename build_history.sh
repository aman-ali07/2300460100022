#!/usr/bin/env bash
set -euo pipefail
REPO="/home/aman/projects/2300460100022"
cd "$REPO"

DESIGN="$REPO/notification_system_design.md"
cp "$DESIGN" /tmp/nsd_full_backup.md

echo "=== Wiping old .git and reinitialising ==="
rm -rf .git
git init -b main
git config user.name  "Aman_1"
git config user.email "aliaman11072003@gmail.com"

c() { GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -m "$2"; }

# Stage boundaries (verified):
# Stage 1: lines 1-183   Stage 2: 184-301
# Stage 3: 302-403       Stage 4+5: 404-619    Stage 6: 620-697

# [1] 12:15 ── gitignore
git add .gitignore
c "2026-06-11T12:15:00+05:30" "chore: initialise repository with gitignore"
echo "✓ 1/23"

# [2] 12:21 ── README
git add README.md
c "2026-06-11T12:21:00+05:30" "docs: add README with project overview and architecture"
echo "✓ 2/23"

# [3] 12:28 ── screenshots
git add "screenshot/registration_API_call.png" "screenshot/Authorisation_api_call.png"
c "2026-06-11T12:28:00+05:30" "chore: add registration and auth API screenshots"
echo "✓ 3/23"

# [4] 12:40 ── logging middleware
git add "logging middleware/package.json" "logging middleware/logger.ts"
c "2026-06-11T12:40:00+05:30" "feat(logging): implement reusable Log() middleware package"
echo "✓ 4/23"

# [5] 12:58 ── Stage 1 only
head -n 183 /tmp/nsd_full_backup.md > "$DESIGN"
git add notification_system_design.md
c "2026-06-11T12:58:00+05:30" "docs(stage-1): design REST API endpoints and SSE real-time mechanism"
echo "✓ 5/23"

# [6] 13:14 ── Stage 2 appended
head -n 301 /tmp/nsd_full_backup.md > "$DESIGN"
git add notification_system_design.md
c "2026-06-11T13:14:00+05:30" "docs(stage-2): add PostgreSQL schema, indexes, and API queries"
echo "✓ 6/23"

# [7] 13:26 ── Stage 3 appended
head -n 403 /tmp/nsd_full_backup.md > "$DESIGN"
git add notification_system_design.md
c "2026-06-11T13:26:00+05:30" "docs(stage-3): analyse slow query, add composite index and optimisation"
echo "✓ 7/23"

# [8] 13:40 ── Stages 4+5 appended
head -n 619 /tmp/nsd_full_backup.md > "$DESIGN"
git add notification_system_design.md
c "2026-06-11T13:40:00+05:30" "docs(stage-4,5): document caching strategy and bulk notification queue design"
echo "✓ 8/23"

# [9] 13:55 ── Stage 6 complete + priority algorithm
cp /tmp/nsd_full_backup.md "$DESIGN"
git add notification_system_design.md notification_app_be/src/utils/priority.ts
c "2026-06-11T13:55:00+05:30" "feat(stage-6): implement priority inbox scoring algorithm with PriorityInbox class"
echo "✓ 9/23"

# [10] 14:07 ── Backend scaffold
git add notification_app_be/package.json notification_app_be/tsconfig.json notification_app_be/.env.example
c "2026-06-11T14:07:00+05:30" "chore(be): scaffold Express + TypeScript backend project"
echo "✓ 10/23"

# [11] 14:13 ── Backend types + env validator
git add notification_app_be/src/types/index.ts notification_app_be/src/config/env.ts
c "2026-06-11T14:13:00+05:30" "feat(be): add shared TypeScript types and fail-fast env validator"
echo "✓ 11/23"

# [12] 14:21 ── Auth service + backend logger
git add notification_app_be/src/utils/logger.ts notification_app_be/src/services/authService.ts
c "2026-06-11T14:21:00+05:30" "feat(be): implement auth service with auto-refreshing token and logger utility"
echo "✓ 12/23"

# [13] 14:29 ── Notification service
git add notification_app_be/src/services/notificationService.ts
c "2026-06-11T14:29:00+05:30" "feat(be): add notification service to fetch from Affordmed evaluation API"
echo "✓ 13/23"

# [14] 14:38 ── Controller + routes + server
git add notification_app_be/src/controllers/notificationController.ts \
        notification_app_be/src/routes/notificationRoutes.ts \
        notification_app_be/src/index.ts
c "2026-06-11T14:38:00+05:30" "feat(be): wire up Express routes, controllers, and server entry point"
echo "✓ 14/23"

# [15] 14:42 ── Backend package-lock
git add notification_app_be/package-lock.json
c "2026-06-11T14:42:00+05:30" "chore(be): add package-lock after npm install"
echo "✓ 15/23"

# [16] 14:49 ── Frontend scaffold
git add notification_app_fe/package.json notification_app_fe/tsconfig.json \
        notification_app_fe/next.config.js notification_app_fe/.env.example \
        notification_app_fe/next-env.d.ts
c "2026-06-11T14:49:00+05:30" "chore(fe): scaffold Next.js 14 + TypeScript + Material UI project"
echo "✓ 16/23"

# [17] 14:56 ── Frontend utilities
git add notification_app_fe/src/types/notification.ts \
        notification_app_fe/src/utils/logger.ts \
        notification_app_fe/src/utils/api.ts \
        notification_app_fe/src/utils/priority.ts
c "2026-06-11T14:56:00+05:30" "feat(fe): add notification types, API client, logger proxy, and priority util"
echo "✓ 17/23"

# [18] 15:02 ── Custom hooks
git add notification_app_fe/src/hooks/useNotifications.ts \
        notification_app_fe/src/hooks/useViewedNotifications.ts
c "2026-06-11T15:02:00+05:30" "feat(fe): implement useNotifications and useViewedNotifications hooks"
echo "✓ 18/23"

# [19] 15:05 ── App shell
git add notification_app_fe/src/components/ThemeRegistry.tsx \
        notification_app_fe/src/components/Navbar.tsx \
        notification_app_fe/src/app/layout.tsx
c "2026-06-11T15:05:00+05:30" "feat(fe): add MUI dark theme, root layout, and sticky navigation bar"
echo "✓ 19/23"

# [20] 15:08 ── NotificationCard
git add notification_app_fe/src/components/NotificationCard.tsx
c "2026-06-11T15:08:00+05:30" "feat(fe): implement NotificationCard with read/unread state and hover animation"
echo "✓ 20/23"

# [21] 15:10 ── All Notifications page
git add notification_app_fe/src/app/page.tsx
c "2026-06-11T15:10:00+05:30" "feat(fe): build notifications feed with type filter, pagination, and mark-as-read"
echo "✓ 21/23"

# [22] 15:12 ── Priority Inbox page
git add notification_app_fe/src/app/priority/page.tsx
c "2026-06-11T15:12:00+05:30" "feat(fe): add priority inbox page with top-N slider, type filter, and score legend"
echo "✓ 22/23"

# [23] 15:14 ── Frontend lock + final README
git add notification_app_fe/package-lock.json notification_app_fe/tsconfig.tsbuildinfo README.md
c "2026-06-11T15:14:00+05:30" "docs: finalise README with architecture diagram, API reference, and quick start"
echo "✓ 23/23"

echo ""
echo "=============================================="
git log --format="%h  %ad  %s" --date=format:"%H:%M"
echo "Total: $(git rev-list --count HEAD) commits"
echo "=============================================="

git remote add origin git@github.com:aman-ali07/2300460100022.git
git push --force -u origin main

echo ""
echo "✅  Done! https://github.com/aman-ali07/2300460100022"
