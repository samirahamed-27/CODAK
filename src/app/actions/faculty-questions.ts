'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { parseAndValidateQuestionsCsv } from '@/lib/csv-questions';
import { writeAuditLog } from '@/lib/audit-logs';
import { isDemoAccount } from '@/lib/auth/demo';

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

export interface EditQuestionInput extends ManualQuestionInput {
  id: string;
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
  rejection_reason?: string | null;
  created_at: string;
  created_by?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  approved_at?: string | null;
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createAdminClient(supabaseUrl, serviceRoleKey);
}

/**
 * Ensures caller is logged in and possesses 'faculty' or 'admin' role.
 * Returns 403 Forbidden for students.
 */
export async function authenticateFaculty() {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized: You must be logged in.', statusCode: 401, user: null };
  }

  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  const userEmail = profile?.email || user.email;
  if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin' && !isDemoAccount(userEmail))) {
    return { error: 'Forbidden: Faculty or Administrator access required.', statusCode: 403, user: null };
  }

  return { error: null, statusCode: 200, user };
}

/**
 * Fetch all questions for faculty question management.
 */
export async function getFacultyQuestionsAction() {
  const auth = await authenticateFaculty();
  if (auth.error || !auth.user) {
    return { success: false, statusCode: auth.statusCode, error: auth.error, questions: [] };
  }

  const adminClient = getAdminClient();
  const { data, error } = await adminClient
    .from('questions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, statusCode: 500, error: error.message, questions: [] };
  }

  return { success: true, statusCode: 200, questions: (data || []) as QuestionRecord[] };
}

/**
 * Add a single question manually.
 */
export async function addQuestionManualAction(input: ManualQuestionInput) {
  const auth = await authenticateFaculty();
  if (auth.error || !auth.user) {
    return { success: false, statusCode: auth.statusCode, error: auth.error };
  }

  // Validate fields
  if (!input.topic?.trim()) return { success: false, statusCode: 400, error: 'Topic is required.' };
  if (!input.questionText?.trim()) return { success: false, statusCode: 400, error: 'Question text is required.' };
  if (!input.optionA?.trim() || !input.optionB?.trim() || !input.optionC?.trim() || !input.optionD?.trim()) {
    return { success: false, statusCode: 400, error: 'All 4 options must be non-empty.' };
  }
  if (!input.explanation?.trim()) return { success: false, statusCode: 400, error: 'Explanation is required.' };

  // Check distinct options
  const opts = [input.optionA.trim(), input.optionB.trim(), input.optionC.trim(), input.optionD.trim()];
  const uniqueOpts = new Set(opts.map((o) => o.toLowerCase()));
  if (uniqueOpts.size !== 4) {
    return { success: false, statusCode: 400, error: 'All 4 answer options must be distinct from each other.' };
  }

  if (!['A', 'B', 'C', 'D'].includes(input.correctOption)) {
    return { success: false, statusCode: 400, error: 'Correct option must be A, B, C, or D.' };
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
    return { success: false, statusCode: 404, error: 'Default subject CS101 not found.' };
  }

  const nowIso = new Date().toISOString();
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
    reviewed_at: nowIso,
    approved_at: nowIso,
  });

  if (error) {
    return { success: false, statusCode: 500, error: error.message };
  }

  return { success: true, statusCode: 200 };
}

/**
 * Upload and validate a CSV of questions.
 * Imported questions are marked 'pending' by default for faculty review.
 */
export async function uploadQuestionsCsvAction(csvContent: string) {
  const auth = await authenticateFaculty();
  if (auth.error || !auth.user) {
    return { success: false, statusCode: auth.statusCode, error: auth.error, importedCount: 0, errors: [] };
  }

  const parseResult = parseAndValidateQuestionsCsv(csvContent);
  if (!parseResult.success || parseResult.questions.length === 0) {
    return {
      success: false,
      statusCode: 400,
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
    return { success: false, statusCode: 404, error: 'Default subject CS101 not found.', importedCount: 0, errors: [] };
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
    return { success: false, statusCode: 500, error: error.message, importedCount: 0, errors: [] };
  }

  return {
    success: true,
    statusCode: 200,
    importedCount: rowsToInsert.length,
    errors: [],
  };
}

/**
 * Approves a pending question, setting approved_at and recording who approved.
 */
export async function approveQuestionAction(questionId: string) {
  const auth = await authenticateFaculty();
  if (auth.error || !auth.user) {
    return { success: false, statusCode: auth.statusCode, error: auth.error };
  }

  const adminClient = getAdminClient();
  const nowIso = new Date().toISOString();

  const { error } = await adminClient
    .from('questions')
    .update({
      status: 'approved',
      approved_at: nowIso,
      reviewed_by: auth.user.id,
      reviewed_at: nowIso,
      rejection_reason: null,
    })
    .eq('id', questionId);

  if (error) {
    return { success: false, statusCode: 500, error: error.message };
  }

  await writeAuditLog({
    actorId: auth.user.id,
    action: 'approve_question',
    targetType: 'question',
    targetId: questionId,
    reason: 'Faculty approved question for active pool',
  });

  return { success: true, statusCode: 200 };
}

/**
 * Approves multiple pending questions in batch.
 * Can take specific questionIds or a topic, or approves all pending active questions.
 */
export async function approveAllQuestionsAction(params?: { questionIds?: string[]; topic?: string }) {
  const auth = await authenticateFaculty();
  if (auth.error || !auth.user) {
    return { success: false, statusCode: auth.statusCode, error: auth.error, approvedCount: 0 };
  }

  const adminClient = getAdminClient();
  const nowIso = new Date().toISOString();

  let query = adminClient
    .from('questions')
    .update({
      status: 'approved',
      approved_at: nowIso,
      reviewed_by: auth.user.id,
      reviewed_at: nowIso,
      rejection_reason: null,
    })
    .eq('status', 'pending')
    .eq('is_active', true);

  if (params?.questionIds && params.questionIds.length > 0) {
    query = query.in('id', params.questionIds);
  } else if (params?.topic && params.topic !== 'all') {
    query = query.eq('topic', params.topic);
  }

  const { data, error } = await query.select('id');

  if (error) {
    return { success: false, statusCode: 500, error: error.message, approvedCount: 0 };
  }

  const approvedCount = data?.length || 0;

  if (approvedCount > 0) {
    await writeAuditLog({
      actorId: auth.user.id,
      action: 'approve_all_questions',
      targetType: 'questions_batch',
      targetId: 'batch',
      reason: `Batch-approved ${approvedCount} question(s) for active pool`,
    });
  }

  return { success: true, statusCode: 200, approvedCount };
}

/**
 * Rejects a question with a mandatory rejection reason.
 */
export async function rejectQuestionAction(questionId: string, rejectionReason: string) {
  const auth = await authenticateFaculty();
  if (auth.error || !auth.user) {
    return { success: false, statusCode: auth.statusCode, error: auth.error };
  }

  if (!rejectionReason || !rejectionReason.trim()) {
    return { success: false, statusCode: 400, error: 'Rejection reason is required.' };
  }

  const adminClient = getAdminClient();
  const nowIso = new Date().toISOString();

  const { error } = await adminClient
    .from('questions')
    .update({
      status: 'rejected',
      rejection_reason: rejectionReason.trim(),
      reviewed_by: auth.user.id,
      reviewed_at: nowIso,
      approved_at: null,
    })
    .eq('id', questionId);

  if (error) {
    return { success: false, statusCode: 500, error: error.message };
  }

  await writeAuditLog({
    actorId: auth.user.id,
    action: 'reject_question',
    targetType: 'question',
    targetId: questionId,
    reason: rejectionReason.trim(),
  });

  return { success: true, statusCode: 200 };
}

/**
 * Edits a question.
 * Crucial Rule: Editing an approved question moves it back to pending.
 */
export async function editQuestionAction(input: EditQuestionInput) {
  const auth = await authenticateFaculty();
  if (auth.error || !auth.user) {
    return { success: false, statusCode: auth.statusCode, error: auth.error };
  }

  if (!input.id) return { success: false, statusCode: 400, error: 'Question ID is required.' };
  if (!input.topic?.trim()) return { success: false, statusCode: 400, error: 'Topic is required.' };
  if (!input.questionText?.trim()) return { success: false, statusCode: 400, error: 'Question text is required.' };
  if (!input.optionA?.trim() || !input.optionB?.trim() || !input.optionC?.trim() || !input.optionD?.trim()) {
    return { success: false, statusCode: 400, error: 'All 4 options must be non-empty.' };
  }
  if (!input.explanation?.trim()) return { success: false, statusCode: 400, error: 'Explanation is required.' };

  const opts = [input.optionA.trim(), input.optionB.trim(), input.optionC.trim(), input.optionD.trim()];
  const uniqueOpts = new Set(opts.map((o) => o.toLowerCase()));
  if (uniqueOpts.size !== 4) {
    return { success: false, statusCode: 400, error: 'All 4 answer options must be distinct from each other.' };
  }

  if (!['A', 'B', 'C', 'D'].includes(input.correctOption)) {
    return { success: false, statusCode: 400, error: 'Correct option must be A, B, C, or D.' };
  }

  const adminClient = getAdminClient();

  // Update details and move status back to pending, clearing approved_at and reviewed metadata
  const { error } = await adminClient
    .from('questions')
    .update({
      topic: input.topic.trim(),
      question_text: input.questionText.trim(),
      option_a: input.optionA.trim(),
      option_b: input.optionB.trim(),
      option_c: input.optionC.trim(),
      option_d: input.optionD.trim(),
      correct_option: input.correctOption,
      explanation: input.explanation.trim(),
      status: 'pending', // Reset to pending for re-review
      approved_at: null,
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
    })
    .eq('id', input.id);

  if (error) {
    return { success: false, statusCode: 500, error: error.message };
  }

  return { success: true, statusCode: 200 };
}

/**
 * Legacy wrapper for updateQuestionStatusAction
 */
export async function updateQuestionStatusAction(questionId: string, status: 'approved' | 'rejected', rejectionReason?: string) {
  if (status === 'approved') {
    return approveQuestionAction(questionId);
  } else {
    return rejectQuestionAction(questionId, rejectionReason || 'Rejected by faculty');
  }
}
