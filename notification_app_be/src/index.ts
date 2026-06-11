import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// dotenv must run before we import our own modules — they read process.env at import time
dotenv.config();

import { validateEnv } from './config/env';
import { initAuth } from './services/authService';
import { Log } from './utils/logger';
import notificationRoutes from './routes/notificationRoutes';

validateEnv();

const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(cors({ origin: 'http://localhost:3000', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

app.use('/api', notificationRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  try {
    await initAuth(); // token must exist before we accept requests
    app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
    await Log('backend', 'info', 'config', `Server started on port ${PORT}`);
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

start();
