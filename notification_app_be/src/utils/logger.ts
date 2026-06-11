const LOGS_API = 'http://4.224.186.213/evaluation-service/logs';

export type Stack = 'backend' | 'frontend';
export type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogPackage =
  | 'cache' | 'controller' | 'cron job' | 'db' | 'domain'
  | 'handler' | 'repository' | 'route' | 'service'
  | 'api' | 'component' | 'hook' | 'page' | 'state' | 'style'
  | 'auth' | 'config' | 'middleware' | 'utils';

let token = '';

// called by authservice on token refresh
export function setLoggerToken(freshToken: string): void {
  token = freshToken;
}

export async function Log(
  stack: Stack,
  level: Level,
  pkg: LogPackage,
  message: string
): Promise<void> {
  // skip if token not yet available (startup)
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
    // ignore logging failures
  }
}
