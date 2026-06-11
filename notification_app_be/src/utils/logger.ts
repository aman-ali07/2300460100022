const LOGS_API = 'http://4.224.186.213/evaluation-service/logs';

export type Stack = 'backend' | 'frontend';
export type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogPackage =
  | 'cache' | 'controller' | 'cron job' | 'db' | 'domain'
  | 'handler' | 'repository' | 'route' | 'service'
  | 'api' | 'component' | 'hook' | 'page' | 'state' | 'style'
  | 'auth' | 'config' | 'middleware' | 'utils';

let token = '';

// authService calls this on every refresh so the logger always has a live token
export function setLoggerToken(freshToken: string): void {
  token = freshToken;
}

export async function Log(
  stack: Stack,
  level: Level,
  pkg: LogPackage,
  message: string
): Promise<void> {
  // Empty during startup auth — skip rather than queue
  if (!token) return;

  try {
    await fetch(LOGS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stack, level, package: pkg, message }),
    });
  } catch {
    // A logging failure should never surface to the caller
  }
}
