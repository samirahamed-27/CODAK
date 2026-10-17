'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

/**
 * Server action to sign out the current user, revoke session, and clear auth cookies.
 */
export async function signOutAction() {
  const supabase = await createClient();
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Error during signOutAction:', err);
  }

  // Explicitly delete any Supabase auth cookies stored in next/headers
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  for (const c of allCookies) {
    if (c.name.startsWith('sb-') || c.name.includes('auth-token')) {
      cookieStore.delete(c.name);
    }
  }

  redirect('/login');
}
