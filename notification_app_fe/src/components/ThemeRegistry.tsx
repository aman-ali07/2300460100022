'use client';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

/**
 * Dark theme inspired by modern dashboards.
 * Colors:
 *   Primary (Indigo)   — #6366f1 — used for actions and highlights
 *   Secondary (Emerald)— #10b981 — used for priority/success states
 *   Background         — #0f172a (dark navy)
 *   Paper/Card         — #1e293b (slightly lighter navy)
 */
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
      light: '#818cf8',
    },
    secondary: {
      main: '#10b981',
      light: '#34d399',
    },
    error: {
      main: '#f59e0b', // amber — for Placement (most important)
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', sans-serif",
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: '#334155',
          color: '#94a3b8',
          '&.Mui-selected': {
            backgroundColor: '#6366f125',
            color: '#818cf8',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
