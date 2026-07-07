/**
 * In-process reminder scheduler — runs the cron tick hourly without external
 * infrastructure (same pattern as reconfirm). An external cron hitting
 * /api/cron/tick with CRON_SECRET also works and dedupes via ReminderLog.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DISABLE_INTERNAL_CRON === "1") return;

  const intervalMs = 60 * 60 * 1000; // hourly

  const tick = async () => {
    try {
      const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const headers: Record<string, string> = {};
      if (process.env.CRON_SECRET) {
        headers.authorization = `Bearer ${process.env.CRON_SECRET}`;
      }
      await fetch(`${base}/api/cron/tick`, { headers });
    } catch {
      // server may not be ready yet — fine, next tick will catch up
    }
  };

  setTimeout(tick, 30_000); // first tick shortly after boot
  setInterval(tick, intervalMs);
}
