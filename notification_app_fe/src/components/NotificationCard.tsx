'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import { Notification } from '@/types/notification';

// Color scheme per notification type
const TYPE_CONFIG: Record<
  string,
  { chipColor: 'warning' | 'primary' | 'success'; borderColor: string }
> = {
  Placement: { chipColor: 'warning', borderColor: '#f59e0b' },
  Result: { chipColor: 'primary', borderColor: '#6366f1' },
  Event: { chipColor: 'success', borderColor: '#10b981' },
};

interface Props {
  notification: Notification;
  isViewed: boolean;
  onClick: () => void;
  rank?: number; // Optional rank number (for priority page)
}

export default function NotificationCard({
  notification,
  isViewed,
  onClick,
  rank,
}: Props) {
  const config = TYPE_CONFIG[notification.Type] ?? TYPE_CONFIG.Event;
  const timeAgo = formatTimeAgo(notification.Timestamp);

  return (
    <Card
      onClick={onClick}
      sx={{
        mb: 1.5,
        cursor: 'pointer',
        backgroundColor: isViewed ? '#1a2332' : '#1e3a5f',
        borderLeft: `3px solid ${
          isViewed ? '#334155' : config.borderColor
        }`,
        opacity: isViewed ? 0.75 : 1,
        transition: 'all 0.15s ease',
        '&:hover': {
          transform: 'translateX(4px)',
          opacity: 1,
          backgroundColor: isViewed ? '#1e2a3d' : '#1e4070',
        },
      }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5,
          }}
        >
          {/* Left: unread dot + type chip + optional rank */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Blue dot for new (unviewed) notifications */}
            {!isViewed && (
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: config.borderColor,
                  flexShrink: 0,
                }}
              />
            )}
            {rank !== undefined && (
              <Typography
                variant="caption"
                sx={{
                  minWidth: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#334155',
                  borderRadius: '50%',
                  color: '#94a3b8',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                }}
              >
                #{rank}
              </Typography>
            )}
            <Chip
              label={notification.Type}
              color={config.chipColor}
              size="small"
              sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
            />
          </Box>

          {/* Right: time ago */}
          <Typography variant="caption" color="text.secondary">
            {timeAgo}
          </Typography>
        </Box>

        {/* Message */}
        <Typography
          variant="body2"
          sx={{
            color: isViewed ? '#64748b' : '#e2e8f0',
            pl: !isViewed ? 2 : 0,
            fontWeight: isViewed ? 400 : 500,
          }}
        >
          {notification.Message}
        </Typography>
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(timestamp).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
