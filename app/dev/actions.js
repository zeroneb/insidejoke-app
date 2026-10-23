'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { get, run } from '@/lib/db';
import { seedDemo } from '@/lib/seed';
import { createSession } from '@/lib/auth';
import { isTestMode } from '@/lib/texts';

export async function clearTexts() {
  if (!isTestMode()) return;
  await run('DELETE FROM texts');
  revalidatePath('/dev/texts');
}

export async function devLogin(fd) {
  if (!isTestMode()) return;
  const userId = String(fd.get('userId') || '');
  const u = await get('SELECT id FROM users WHERE id = ?', userId);
  if (!u) return;
  await createSession(u.id);
  redirect('/home');
}

export async function loadDemo() {
  if (!isTestMode()) return;
  await seedDemo();
  revalidatePath('/dev/login');
  redirect('/dev/login');
}
