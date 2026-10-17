'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { evaluateStudentQuests, Quest } from '@/lib/quests';

export interface GetQuestsResult {
  success: boolean;
  quests: Quest[];
  error?: string;
}

/**
 * Server Action: Evaluate and retrieve all quests with progress for the authenticated student.
 */
export async function getStudentQuestsAction(fakeDate?: string): Promise<GetQuestsResult> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  let studentId = user?.id;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, quests: [], error: 'Server configuration error' };
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  if (!studentId) {
    return { success: false, quests: [], error: 'Unauthorized: Student session required' };
  }

  const result = await evaluateStudentQuests(studentId, adminClient, fakeDate);

  return {
    success: true,
    quests: result.quests,
  };
}
