-- MIGRATION 013: ALIGN SUBMIT_BATTLE_ANSWER WITH QUESTIONS TABLE SCHEMA
-- Align correct_option check with public.questions column

CREATE OR REPLACE FUNCTION public.submit_battle_answer(
  p_battle_id UUID,
  p_student_id UUID,
  p_question_id UUID,
  p_answer TEXT,
  p_submission_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_battle_status TEXT;
  v_ends_at TIMESTAMPTZ;
  v_points_per_correct INT := 10;
  v_actual_correct TEXT;
  v_is_correct BOOLEAN := FALSE;
  v_points INT := 0;
  v_existing_id UUID;
  v_existing_correct BOOLEAN;
  v_existing_points INT;
  v_member_count INT;
  v_total_points INT;
  v_answered_count INT;
  v_avg_points NUMERIC(10, 4);
BEGIN
  -- A. Idempotency Check on submission_id
  SELECT id, is_correct, points, team_id
  INTO v_existing_id, v_existing_correct, v_existing_points, v_team_id
  FROM public.battle_submissions
  WHERE submission_id = p_submission_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'duplicate_submission',
      'is_correct', v_existing_correct,
      'points', v_existing_points,
      'team_id', v_team_id,
      'submission_id', p_submission_id
    );
  END IF;

  -- B. Membership Check
  SELECT team_id INTO v_team_id
  FROM public.battle_team_members
  WHERE battle_id = p_battle_id AND student_id = p_student_id;

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'not_a_member',
      'error', 'Student is not an enrolled member of this battle'
    );
  END IF;

  -- C. Battle Active & Deadline Check
  SELECT status, ends_at, COALESCE((config->>'points_per_correct')::int, 10)
  INTO v_battle_status, v_ends_at, v_points_per_correct
  FROM public.battles
  WHERE id = p_battle_id;

  IF v_battle_status IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'battle_not_found',
      'error', 'Battle does not exist'
    );
  END IF;

  IF v_battle_status != 'live' THEN
    RETURN jsonb_build_object(
      'status', 'battle_not_live',
      'error', 'Battle is not active'
    );
  END IF;

  IF v_ends_at IS NOT NULL AND NOW() > v_ends_at THEN
    RETURN jsonb_build_object(
      'status', 'battle_ended',
      'error', 'Battle deadline has passed'
    );
  END IF;

  -- D. Question Belongs to Battle Check
  PERFORM 1 FROM public.battle_questions
  WHERE battle_id = p_battle_id AND question_id = p_question_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'question_not_in_battle',
      'error', 'Question is not part of this battle'
    );
  END IF;

  -- E. Already Answered Check (unique per student + battle + question)
  SELECT id, is_correct, points
  INTO v_existing_id, v_existing_correct, v_existing_points
  FROM public.battle_submissions
  WHERE battle_id = p_battle_id
    AND student_id = p_student_id
    AND question_id = p_question_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'already_answered',
      'is_correct', v_existing_correct,
      'points', v_existing_points,
      'team_id', v_team_id,
      'submission_id', p_submission_id
    );
  END IF;

  -- F. Check Answer Against Server Key (supports correct_option from questions table)
  SELECT correct_option INTO v_actual_correct
  FROM public.questions
  WHERE id = p_question_id;

  IF UPPER(TRIM(COALESCE(v_actual_correct, ''))) = UPPER(TRIM(COALESCE(p_answer, ''))) THEN
    v_is_correct := TRUE;
    v_points := v_points_per_correct;
  ELSE
    v_is_correct := FALSE;
    v_points := 0;
  END IF;

  -- G. Store Submission Row
  INSERT INTO public.battle_submissions (
    battle_id,
    team_id,
    student_id,
    question_id,
    answer,
    is_correct,
    points,
    submitted_at,
    submission_id
  ) VALUES (
    p_battle_id,
    v_team_id,
    p_student_id,
    p_question_id,
    p_answer,
    v_is_correct,
    v_points,
    NOW(),
    p_submission_id
  );

  -- H. Atomically update battle_scores aggregate table
  UPDATE public.battle_scores
  SET
    total_points = total_points + v_points,
    answered_count = answered_count + 1,
    avg_points = ROUND((total_points + v_points)::NUMERIC / GREATEST(member_count, 1), 4),
    last_submission_at = NOW(),
    updated_at = NOW()
  WHERE battle_id = p_battle_id AND team_id = v_team_id
  RETURNING avg_points INTO v_avg_points;

  RETURN jsonb_build_object(
    'status', 'submitted',
    'is_correct', v_is_correct,
    'points', v_points,
    'team_id', v_team_id,
    'team_avg_points', v_avg_points,
    'submission_id', p_submission_id
  );
END;
$$;
