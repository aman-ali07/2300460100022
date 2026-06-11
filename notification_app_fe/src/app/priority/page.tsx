'use client';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import StarIcon from '@mui/icons-material/Star';
import NotificationCard from '@/components/NotificationCard';
import { useViewedNotifications } from '@/hooks/useViewedNotifications';
import { fetchPriorityNotifications } from '@/utils/api';
import { Log } from '@/utils/logger';
import { Notification } from '@/types/notification';

// Type weights for display
const TYPE_WEIGHTS = [
  { type: 'Placement', weight: 3, color: 'warning' as const },
  { type: 'Result', weight: 2, color: 'primary' as const },
  { type: 'Event', weight: 1, color: 'success' as const },
];

export default function PriorityPage() {
  const [n, setN] = useState<number>(10);
  const [typeFilter, setTypeFilter] = useState('All');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isViewed, markViewed } = useViewedNotifications();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Log(
        'frontend',
        'info',
        'page',
        `Loading priority notifications: n=${n}, type=${typeFilter}`
      );
      const data = await fetchPriorityNotifications(
        n,
        typeFilter === 'All' ? undefined : typeFilter
      );
      setNotifications(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      await Log('frontend', 'error', 'page', `Priority page error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [n, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Log('frontend', 'info', 'page', 'Priority inbox page mounted');
  }, []);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <StarIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
        <Typography variant="h5" fontWeight={700} sx={{ color: '#f1f5f9' }}>
          Priority Inbox
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Notifications ranked by importance (Placement &gt; Result &gt; Event) ×
        recency.
      </Typography>

      {/* Controls Panel */}
      <Paper
        sx={{
          p: 2.5,
          mb: 3,
          backgroundColor: '#1a2d45',
          border: '1px solid #1e3a5f',
        }}
      >
        {/* N Selector */}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Show top{' '}
          <Box component="span" sx={{ color: '#f1f5f9', fontWeight: 600 }}>
            {n}
          </Box>{' '}
          notifications
        </Typography>
        <Slider
          value={n}
          onChange={(_, val) => setN(val as number)}
          min={5}
          max={20}
          step={5}
          marks={[
            { value: 5, label: '5' },
            { value: 10, label: '10' },
            { value: 15, label: '15' },
            { value: 20, label: '20' },
          ]}
          sx={{ width: '90%', mb: 2.5, color: '#f59e0b' }}
        />

        {/* Type Filter */}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Filter by type
        </Typography>
        <ToggleButtonGroup
          value={typeFilter}
          exclusive
          onChange={(_, val) => {
            if (val) {
              setTypeFilter(val);
              Log('frontend', 'debug', 'page', `Priority type filter: ${val}`);
            }
          }}
          size="small"
        >
          {['All', 'Placement', 'Result', 'Event'].map((type) => (
            <ToggleButton key={type} value={type}>
              {type}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Paper>

      {/* Scoring Legend */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {TYPE_WEIGHTS.map(({ type, weight, color }) => (
          <Chip
            key={type}
            label={`${type} — weight ${weight}`}
            color={color}
            size="small"
            variant="outlined"
          />
        ))}
        <Chip
          label="Score = weight / (hours_old + 1)"
          size="small"
          sx={{ borderColor: '#334155', color: '#94a3b8' }}
          variant="outlined"
        />
      </Box>

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: '#f59e0b' }} />
        </Box>
      )}

      {/* Error */}
      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={load}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Empty state */}
      {!loading && !error && notifications.length === 0 && (
        <Alert severity="info">No notifications match the current filter.</Alert>
      )}

      {/* Priority Notification List */}
      {!loading &&
        !error &&
        notifications.map((notification, index) => (
          <NotificationCard
            key={notification.ID}
            notification={notification}
            isViewed={isViewed(notification.ID)}
            rank={index + 1}
            onClick={() => {
              markViewed(notification.ID);
              Log('frontend', 'debug', 'page', `Priority notification ${notification.ID} viewed`);
            }}
          />
        ))}
    </Box>
  );
}
