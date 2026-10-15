'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { parseAndValidateQuestionsCsv } from '@/lib/csv-questions';

export interface ManualQuestionInput {
  subjectId?: string;
  topic: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface QuestionRecord {
  id: string;
  subject_id: string;
  topic: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createAdminClient(supabaseUrl, serviceRoleKey);
}

/**
 * Ensures caller is logged in and possesses 'faculty' or 'admin' role.
 */
async function authenticateFaculty() {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized: You must be logged in.', user: null };
  }

  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
    return { error: 'Forbidden: Faculty or Administrator access required.', user: null };
  }

  return { error: null, user };
}

/**
 * Fetch all questions for faculty question management.
 */
export async function getFacultyQuestionsAction() {
  const auth = await authenticateFaculty();
  if (auth.error || !auth.user) {
    return { success: false, error: auth.error, questions: [] };
  }

  const adminClient = getAdminClient();
  const { data, error } = await adminClient
    .from('questions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message, questions: [] };
  }

  return { success: true, questions: (data || []) as QuestionRecord[] };
}

/**
 * Add a single question manually.
 */
export async function addQuestionManualAction(input: ManualQuestionInput) {
  const auth = await authenticateFaculty();
  if (auth.error || !auth.user) {
    return { success: false, error: auth.error };
  }

  // Validate fields
  if (!input.topic?.trim()) return { success: false, error: 'Topic is required.' };
  if (!input.questionText?.trim()) return { success: false, error: 'Question text is required.' };
  if (!input.optionA?.trim() || !input.optionB?.trim() || !input.optionC?.trim() || !input.optionD?.trim()) {
    return { success: false, error: 'All 4 options must be non-empty.' };
  }
  if (!input.explanation?.trim()) return { success: false, error: 'Explanation is required.' };

  // Check distinct options
  const opts = [input.optionA.trim(), input.optionB.trim(), input.optionC.trim(), input.optionD.trim()];
  const uniqueOpts = new Set(opts.map((o) => o.toLowerCase()));
  if (uniqueOpts.size !== 4) {
    return { success: false, error: 'All 4 answer options must be distinct from each other.' };
  }

  if (!['A', 'B', 'C', 'D'].includes(input.correctOption)) {
    return { success: false, error: 'Correct option must be A, B, C, or D.' };
  }

  const adminClient = getAdminClient();

  // Get pilot subject ID
  let subjectId = input.subjectId;
  if (!subjectId) {
    const { data: subject } = await adminClient
      .from('subjects')
      .select('id')
      .eq('code', 'CS101')
      .single();
    subjectId = subject?.id;
  }

  if (!subjectId) {
    return { success: false, error: 'Default subject CS101 not found.' };
  }

  const { error } = await adminClient.from('questions').insert({
    subject_id: subjectId,
    topic: input.topic.trim(),
    question_text: input.questionText.trim(),
    option_a: input.optionA.trim(),
    option_b: input.optionB.trim(),
    option_c: input.optionC.trim(),
    option_d: input.optionD.trim(),
    correct_option: input.correctOption,
    explanation: input.explanation.trim(),
    status: 'approved', // Direct faculty entry is marked approved
    created_by: auth.user.id,
    reviewed_by: auth.user.id,
    reviewed_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Upload and validate a CSV of questions.
 * Imported questions are marked 'pending' by default for faculty review.
 */
export async function uploadQuestionsCsvAction(csvContent: string) {
  const auth = await authenticateFaculty();
  if (auth.error || !auth.user) {
    return { success: false, error: auth.error, importedCount: 0, errors: [] };
  }

  const parseResult = parseAndValidateQuestionsCsv(csvContent);
  if (!parseResult.success || parseResult.questions.length === 0) {
    return {
      success: false,
      error: 'CSV validation failed. Please correct the highlighted errors.',
      importedCount: 0,
      errors: parseResult.errors,
    };
  }

  const adminClient = getAdminClient();

  // Find pilot subject
  const { data: subject } = await adminClient
    .from('subjects')
    .select('id')
    .eq('code', 'CS101')
    .single();

  if (!subject) {
    return { success: false, error: 'Default subject CS101 not found.', importedCount: 0, errors: [] };
  }

  const rowsToInsert = parseResult.questions.map((q) => ({
    subject_id: subject.id,
    topic: q.topic,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_option: q.correct_option,
    explanation: q.explanation,
    status: 'pending' as const, // Pending review by default
    created_by: auth.user?.id,
  }));

  const { error } = await adminClient.from('questions').insert(rowsToInsert);
  if (error) {
    return { success: false, error: error.message, importedCount: 0, errors: [] };
  }

  return {
    success: true,
    importedCount: rowsToInsert.length,
    errors: [],
  };
}

/**
 * Reviewer action: Approve or reject a question.
 */
export async function updateQuestionStatusAction(questionId: string, status: 'approved' | 'rejected') {
  const auth = await authenticateFaculty();
  if (auth.error || !auth.user) {
    return { success: false, error: auth.error };
  }

  const adminClient = getAdminClient();
  const { error } = await adminClient
    .from('questions')
    .update({
      status,
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', questionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
