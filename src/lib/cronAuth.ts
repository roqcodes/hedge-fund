/** Validate Vercel cron Authorization header against CRON_SECRET (trims whitespace). */
export function isAuthorizedCronRequest(authHeader: string | null): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return true;
  const expected = `Bearer ${cronSecret}`;
  return authHeader?.trim() === expected;
}
