'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { isTestMode } from '@/lib/texts';

export async function clearTexts() {
  db().prepare('DELETE FROM texts').run();
  revalidatePath('/dev/texts');
}

export async function devLogin(fd) {
  if (!isTestMode()) return;
  const userId = String(fd.get('userId') || '');
  const u = db().prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!u) return;
  await createSession(u.id);
  redirect('/home');
}
