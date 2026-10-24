// a4: scheduled work. Vercel cron (vercel.json, every 15 min) sends `Authorization: Bearer $CRON_SECRET`.
// Any other scheduler: ?key=$CRON_KEY or `Authorization: Bearer $CRON_KEY`.
// Sends due reminders, due scheduled surprises, and the weekly digest.
import { runReminders, runWeeklyThanks } from '@/lib/reminders';
import { sendDueSurprises } from '@/lib/surprise';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const key = new URL(req.url).searchParams.get('key');
  const auth = req.headers.get('authorization');
  const cronKey = process.env.CRON_KEY;
  const cronSecret = process.env.CRON_SECRET;
  const ok = (cronKey && (key === cronKey || auth === `Bearer ${cronKey}`)) || (cronSecret && auth === `Bearer ${cronSecret}`);
  if (!ok) return Response.json({ error: 'unauthorized' }, { status: 401 });
  let bank = null; try { bank = await (await import('@/lib/payments')).settlePendingGifts(); } catch {}
  let disputes = null; try { disputes = await (await import('@/lib/disputes')).syncDisputes(); } catch {}
  const surprises = await sendDueSurprises();
  const reminders = await runReminders();
  const digest = await runWeeklyThanks();
  return Response.json({ ok: true, bank, disputes, surprises, reminders, digest });
}
