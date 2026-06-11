// validate required env vars at startup
export function validateEnv(): void {
  const required = [
    'AFFORDMED_EMAIL',
    'AFFORDMED_NAME',
    'AFFORDMED_ROLL_NO',
    'AFFORDMED_ACCESS_CODE',
    'AFFORDMED_CLIENT_ID',
    'AFFORDMED_CLIENT_SECRET',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing env: ${key}`);
    }
  }
}
