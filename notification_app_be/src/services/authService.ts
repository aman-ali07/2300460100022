import { Log, setLoggerToken } from '../utils/logger';

const AUTH_URL = 'http://4.224.186.213/evaluation-service/auth';

let activeToken = '';
let tokenExpiresAt = 0; // unix ms

export async function initAuth(): Promise<void> {
  await refreshToken();
}

export async function getToken(): Promise<string> {
  // refresh 5min before expiry to avoid mid-request expiration
  if (!activeToken || Date.now() >= tokenExpiresAt - 5 * 60_000) {
    await refreshToken();
  }
  return activeToken;
}

async function refreshToken(): Promise<void> {
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.AFFORDMED_EMAIL,
      name: process.env.AFFORDMED_NAME,
      rollNo: process.env.AFFORDMED_ROLL_NO,
      accessCode: process.env.AFFORDMED_ACCESS_CODE,
      clientID: process.env.AFFORDMED_CLIENT_ID,
      clientSecret: process.env.AFFORDMED_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status}`);
  }

  // expires_in is a unix timestamp in seconds
  const { access_token, expires_in } = await response.json() as {
    access_token: string;
    expires_in: number;
  };

  activeToken = access_token;
  tokenExpiresAt = expires_in * 1000;
  setLoggerToken(activeToken);

  await Log('backend', 'info', 'auth', 'Token refreshed');
}
