import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Defensive helper to guarantee that a valid public.students record exists for any authenticated user.
 * Prevents foreign key violations (quiz_attempts_student_id_fkey, xp_events_student_id_fkey, etc.)
 * when admins/faculty preview student features or if a user record was created without the trigger.
 */
export async function ensureStudentRecord(
  adminClient: SupabaseClient,
  user: { id: string; email?: string | null; user_metadata?: Record<string, any> }
): Promise<boolean> {
  try {
    // 1. Check if student record already exists
    const { data: student } = await adminClient
      .from('students')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (student) {
      return true;
    }

    // 2. Ensure profile exists first (students references profiles.id)
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      const email = user.email || `${user.id}@dev.local`;
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Student User';

      await adminClient.from('profiles').upsert(
        {
          id: user.id,
          email,
          full_name: fullName,
          role: 'student',
          is_anonymous: false,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }

    // 3. Upsert into students with collision-resistant roll number
    const userRoll = user.user_metadata?.roll_no;
    const cleanId = user.id.replace(/-/g, '').toUpperCase();
    const fallbackRoll = `ROLL-${cleanId.slice(0, 12)}`;

    const { error: studentErr } = await adminClient.from('students').upsert(
      {
        id: user.id,
        roll_no: userRoll || fallbackRoll,
        department: user.user_metadata?.department || (profile?.role === 'admin' ? 'Administration' : profile?.role === 'faculty' ? 'Faculty' : 'General Studies'),
        year_of_study: 1,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    if (studentErr) {
      // If error was a unique roll_no collision, retry with full 32-char UUID
      if (studentErr.code === '23505' || studentErr.message?.includes('roll_no')) {
        await adminClient.from('students').upsert(
          {
            id: user.id,
            roll_no: `ROLL-${cleanId}`,
            department: user.user_metadata?.department || 'General Studies',
            year_of_study: 1,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      } else {
        console.error('ensureStudentRecord error:', studentErr);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('ensureStudentRecord unexpected error:', err);
    return false;
  }
}
