import { SupabaseClient } from '@supabase/supabase-js';
import { Campus } from '@/types/database';

/**
 * Formats a campus's display label according to specifications:
 * - "Name, City" for standard campuses
 * - Custom typed name (or "Other") for the Other campus
 * - "Other campuses" when used in aggregate standings
 */
export function formatCampusDisplayName(
  campus: { name: string; city?: string; is_other?: boolean } | null | undefined,
  otherName?: string | null
): string {
  if (!campus) return 'Unassigned';
  if (campus.is_other) {
    return otherName ? otherName.trim() : 'Other';
  }
  return campus.city ? `${campus.name}, ${campus.city}` : campus.name;
}

/**
 * Sanitizes the custom campus name for the "Other" option:
 * Trims whitespace, strips HTML tags, and restricts length to 60 characters.
 */
export function sanitizeCampusOtherName(name: string): string {
  if (!name) return '';
  return name
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Fetches all active campuses ordered by sort_order.
 * Works for both anon and authenticated users.
 */
export async function getActiveCampuses(client: SupabaseClient): Promise<Campus[]> {
  const { data, error } = await client
    .from('campuses')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data) {
    console.error('Error fetching campuses:', error);
    return [];
  }

  return data as Campus[];
}

/**
 * Server-side validation of campus selection.
 * Enforces that campus exists, is active, and if "Other", has a 2-60 character name.
 * Accepts either an array of Campus models or a SupabaseClient.
 */
export async function validateCampusInput(
  campusId: string,
  otherName: string | undefined,
  campusesOrClient: Campus[] | SupabaseClient
): Promise<{
  valid: boolean;
  isValid: boolean;
  error?: string;
  campus?: Campus;
  campusOtherName?: string;
  sanitizedOtherName?: string;
}> {
  if (!campusId) {
    return { valid: false, isValid: false, error: 'Campus selection is required.' };
  }

  let campuses: Campus[];
  if (Array.isArray(campusesOrClient)) {
    campuses = campusesOrClient;
  } else {
    campuses = await getActiveCampuses(campusesOrClient);
  }

  const campus = campuses.find((c) => c.id === campusId && c.is_active);
  if (!campus) {
    return { valid: false, isValid: false, error: 'Selected campus does not exist or is inactive.' };
  }

  let sanitizedOther: string | undefined = undefined;
  if (campus.is_other) {
    sanitizedOther = sanitizeCampusOtherName(otherName || '');
    if (!sanitizedOther) {
      return {
        valid: false,
        isValid: false,
        error: 'Please provide your campus name (between 2 and 60 characters).',
      };
    }
    if (sanitizedOther.length < 2) {
      return {
        valid: false,
        isValid: false,
        error: 'Campus name must be at least 2 characters.',
      };
    }
    if (sanitizedOther.length > 60) {
      return {
        valid: false,
        isValid: false,
        error: 'Campus name must not exceed 60 characters.',
      };
    }
  }

  return {
    valid: true,
    isValid: true,
    campus,
    campusOtherName: sanitizedOther,
    sanitizedOtherName: sanitizedOther,
  };
}
