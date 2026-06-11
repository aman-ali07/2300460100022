'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Pagination from '@mui/material/Pagination';
import NotificationCard from '@/components/NotificationCard';
import { useNotifications } from '@/hooks/useNotifications';
import { useViewedNotifications } from '@/hooks/useViewedNotifications';
import { Log } from '@/utils/logger';

const TYPES = ['All', 'Placement', 'Result', 'Event'] as const;
const PAGE_SIZE = 10;

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('All');

  const { notifications, loading, error, refetch } = useNotifications({
    page,
    limit: PAGE_SIZE,
    notification_type: filter === 'All' ? undefined : filter,
  });
  const { isViewed, markViewed, markAllViewed } = useViewedNotifications();

  useEffect(() => {
    Log('frontend', 'info', 'page', 'Notifications page mounted');
  }, []);

  const newCount = notifications.filter((n) => !isViewed(n.ID)).length;

  function handleTypeChange(_: unknown, val: string | null) {
    if (!val) return;
    setFilter(val);
    setPage(1);
    Log('frontend', 'debug', 'page', `Filter: ${val}`);
  }

  function handleMarkAllRead() {
    markAllViewed(notifications.map((n) => n.ID));
    Log('frontend', 'info', 'page', 'Marked all as read');
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#f1f5f9' }}>
            All Notifications
          </Typography>
          {newCount > 0 && (
            <Typography variant="body2" sx={{ color: '#818cf8', mt: 0.5 }}>
              {newCount} new
            </Typography>
          )}
        </Box>
        {newCount > 0 && (
          <Button
            variant="outlined"
            size="small"
            onClick={handleMarkAllRead}
            sx={{ color: '#94a3b8', borderColor: '#334155' }}
          >
            Mark all read
          </Button>
        )}
      </Box>

      <ToggleButtonGroup
        value={filter}
        exclusive
        onChange={handleTypeChange}
        size="small"
        sx={{ mb: 3 }}
      >
        {TYPES.map((type) => (
          <ToggleButton key={type} value={type}>
            {type}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={refetch}>Retry</Button>}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {!loading && !error && notifications.length === 0 && (
        <Alert severity="info">No notifications found for this filter.</Alert>
      )}

      {!loading && !error && notifications.map((notification) => (
        <NotificationCard
          key={notification.ID}
          notification={notification}
          isViewed={isViewed(notification.ID)}
          onClick={() => {
            markViewed(notification.ID);
            Log('frontend', 'debug', 'page', `Viewed: ${notification.ID}`);
          }}
        />
      ))}

      {!loading && notifications.length === PAGE_SIZE && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={page + 1}
            page={page}
            onChange={(_, val) => setPage(val)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
}
