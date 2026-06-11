/**
 * Reusable Logging Middleware
 *
 * This package can be consumed by both the backend and frontend.
 * It strictly adheres to the schema and constraints of the Evaluation API.
 */

export type Stack = 'backend' | 'frontend';
export type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogPackage =
  | 'cache' | 'controller' | 'cron job' | 'db' | 'domain'
  | 'handler' | 'repository' | 'route' | 'service'
  | 'api' | 'component' | 'hook' | 'page' | 'state' | 'style'
  | 'auth' | 'config' | 'middleware' | 'utils';

const LOGS_API = 'http://4.224.186.213/evaluation-service/logs';
let activeToken = '';

/**
 * Updates the Bearer token used for logging.
 * The backend should call this whenever the auth token refreshes.
 */
export function setLoggerToken(token: string): void {
  activeToken = token;
}

/**
 * Sends a log entry to the Evaluation Logging Service.
 * Fails silently so it never crashes the application.
 */
export async function Log(
  stack: Stack,
  level: Level,
  pkg: LogPackage,
  message: string
): Promise<void> {
  // If running on frontend, we assume a local proxy routes to backend.
  // If running on backend, we need the activeToken.
  const isFrontend = typeof window !== 'undefined';
  const targetUrl = isFrontend ? '/api/log' : LOGS_API;

  if (!isFrontend && !activeToken) return;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!isFrontend) headers['Authorization'] = `Bearer ${activeToken}`;

    await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ stack, level, package: pkg, message }),
    });
  } catch {
    // Logging failure should never crash the host application
  }
}
