const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export type Stack = 'backend' | 'frontend';
export type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogPackage =
  | 'api' | 'component' | 'hook' | 'page' | 'state' | 'style'
  | 'auth' | 'config' | 'middleware' | 'utils';

// frontend logs proxy through backend (has the auth token)
export async function Log(
  stack: Stack,
  level: Level,
  pkg: LogPackage,
  message: string
): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stack, level, package: pkg, message }),
    });
  } catch {
    // ignore logging failures
  }
}
