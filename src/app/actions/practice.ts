'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  PracticeLink,
  PracticeFilter,
  SEED_PRACTICE_LINKS,
  filterPracticeLinks,
} from '@/lib/practice';
import { checkRateLimit } from '@/lib/rate-limits';

export async function getPracticeLinksAction(filter?: PracticeFilter): Promise<{
  success: boolean;
  links: PracticeLink[];
  topics: string[];
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return {
      success: false,
      links: [],
      topics: [],
      error: 'Unauthorized',
    };
  }

  if (filter?.search) {
    const rl = await checkRateLimit(user.id, 'search');
    if (!rl.allowed) {
      return { success: false, links: [], topics: [], error: rl.error };
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  let allLinks: PracticeLink[] = [];

  if (supabaseUrl && serviceRoleKey) {
    try {
      const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
      const { data, error } = await adminClient
        .from('practice_links')
        .select('id, platform, problem_id, title, topic, difficulty, link, created_at')
        .order('topic', { ascending: true })
        .order('difficulty', { ascending: true });

      if (!error && data && data.length > 0) {
        allLinks = data as PracticeLink[];
      }
    } catch (err) {
      // Graceful fallback to static seeds
      console.warn('Practice links table fetch error, using curated seeds:', err);
    }
  }

  // Fallback to verified seed links if database table not yet populated
  if (allLinks.length === 0) {
    allLinks = SEED_PRACTICE_LINKS;
  }

  const distinctTopics = Array.from(new Set(allLinks.map((l) => l.topic)));
  const filtered = filterPracticeLinks(allLinks, filter);

  return {
    success: true,
    links: filtered,
    topics: distinctTopics,
  };
}
