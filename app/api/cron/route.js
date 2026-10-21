// a4: scheduled work. Call with ?key=$CRON_KEY (Vercel cron, or any scheduler).
// Sends due reminders, due scheduled surprises, and the weekly digest.
import { runReminders, runWeeklyThanks } from '@/lib/reminders';
import { sendDueSurprises } from '@/lib/surprise';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const key = new URL(req.url).searchParams.get('key');
  const auth = req.headers.get('authorization');
  const want = process.env.CRON_KEY;
  if (!want || (key !== want && auth !== `Bearer ${want}`)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const surprises = await sendDueSurprises();
  const reminders = await runReminders();
  const digest = await runWeeklyThanks();
  return Response.json({ ok: true, surprises, reminders, digest });
}
