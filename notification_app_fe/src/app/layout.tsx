import type { Metadata } from 'next';
import ThemeRegistry from '@/components/ThemeRegistry';
import Navbar from '@/components/Navbar';
import Box from '@mui/material/Box';

export const metadata: Metadata = {
  title: 'Campus Notification Platform',
  description:
    'Stay updated with real-time Placement, Event, and Result notifications.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, backgroundColor: '#0f172a' }}>
        <ThemeRegistry>
          <Navbar />
          <Box
            component="main"
            sx={{
              maxWidth: 860,
              mx: 'auto',
              px: { xs: 2, sm: 3 },
              py: 4,
            }}
          >
            {children}
          </Box>
        </ThemeRegistry>
      </body>
    </html>
  );
}
