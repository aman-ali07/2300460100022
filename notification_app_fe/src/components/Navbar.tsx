'use client';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import NotificationsIcon from '@mui/icons-material/Notifications';
import StarIcon from '@mui/icons-material/Star';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: '#0a1628',
        borderBottom: '1px solid #1e293b',
      }}
    >
      <Toolbar>
        {/* Logo */}
        <NotificationsIcon sx={{ color: '#6366f1', mr: 1 }} />
        <Typography
          variant="h6"
          sx={{ flexGrow: 1, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}
        >
          Campus
          <Box component="span" sx={{ color: '#6366f1' }}>
            Notify
          </Box>
        </Typography>

        {/* Navigation */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            component={Link}
            href="/"
            startIcon={<NotificationsIcon />}
            variant={pathname === '/' ? 'contained' : 'text'}
            color="primary"
            size="small"
          >
            All
          </Button>
          <Button
            component={Link}
            href="/priority"
            startIcon={<StarIcon />}
            variant={pathname === '/priority' ? 'contained' : 'text'}
            sx={{
              color: pathname === '/priority' ? '#fff' : '#94a3b8',
              backgroundColor: pathname === '/priority' ? '#f59e0b' : 'transparent',
              '&:hover': { backgroundColor: pathname === '/priority' ? '#d97706' : '#1e293b' },
            }}
            size="small"
          >
            Priority
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
