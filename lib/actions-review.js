'use server';

import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { currentUser } from './auth';
import { decideReview } from './review';

const digits = (p) => String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

// Founder clears or keeps holding a paused cash-out (only ADMIN_PHONES can).
export async function decideReviewAction(fd) {
  const me = await currentUser();
  const admins = String(process.env.ADMIN_PHONES || '').split(',').map(digits).filter(Boolean);
  if (!me || !admins.includes(digits(me.phone))) notFound();
  await decideReview(String(fd.get('id') || ''), String(fd.get('approve')) === '1');
  revalidatePath('/admin');
}
