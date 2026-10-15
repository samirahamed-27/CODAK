-- ==============================================================================
-- PHASE 2 MIGRATION: 003_daily_quiz_streaks.sql
-- Gamified Learning Platform - Question Bank, Daily Quizzes & Streak Engine
-- ==============================================================================

-- 1. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Pilot Subject: CS101
INSERT INTO public.subjects (name, code, description)
VALUES (
  'Computer Systems & Programming',
  'CS101',
  'Foundational computational thinking, Python programming, algorithms, and computer systems architecture for first-year engineering students.'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 2. QUESTION BANK TABLE
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  explanation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NULL REFERENCES auth.users(id),
  reviewed_by UUID NULL REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ensure 4 distinct, non-empty answer choices
  CONSTRAINT chk_distinct_options CHECK (
    option_a <> option_b AND option_a <> option_c AND option_a <> option_d AND
    option_b <> option_c AND option_b <> option_d AND
    option_c <> option_d
  ),
  CONSTRAINT chk_non_empty_fields CHECK (
    trim(topic) <> '' AND
    trim(question_text) <> '' AND
    trim(option_a) <> '' AND trim(option_b) <> '' AND trim(option_c) <> '' AND trim(option_d) <> '' AND
    trim(explanation) <> ''
  )
);

-- Index for fast daily quiz question selection
CREATE INDEX IF NOT EXISTS idx_questions_subject_status ON public.questions (subject_id, status, is_active);

-- 3. QUIZ ATTEMPTS TABLE (Sessions)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  quiz_date DATE NOT NULL, -- Asia/Kolkata date
  mode TEXT NOT NULL DEFAULT 'daily' CHECK (mode IN ('daily', 'practice')),
  question_ids UUID[] NOT NULL,
  options_order JSONB NOT NULL DEFAULT '{}'::jsonb, -- Map of question_id -> array of option keys ['B', 'A', 'D', 'C']
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  score INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 5,
  xp_awarded INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL
);

-- At most ONE daily quiz attempt per student per Asia/Kolkata calendar date
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_daily_quiz_attempt 
ON public.quiz_attempts (student_id, quiz_date) 
WHERE mode = 'daily';

-- 4. QUIZ ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
  selected_option TEXT NOT NULL CHECK (selected_option IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id)
);

-- 5. STUDENT STREAKS TABLE
CREATE TABLE IF NOT EXISTS public.student_streaks (
  student_id UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_quiz_date DATE NULL,
  freeze_days_used_this_month INT NOT NULL DEFAULT 0,
  freeze_days_month TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. STREAK AUDIT & EVENT LOG TABLE
CREATE TABLE IF NOT EXISTS public.streak_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('streak_increment', 'streak_freeze', 'streak_reset', 'milestone_bonus')),
  quiz_date DATE NOT NULL,
  streak_before INT NOT NULL,
  streak_after INT NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. APP & STREAK CONFIGURATION SETTINGS
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Default Settings
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('max_freeze_days_per_month', '2'::jsonb, 'Maximum freeze days allowed per student per calendar month'),
  ('questions_per_daily_quiz', '5'::jsonb, 'Number of approved questions selected for daily quiz'),
  ('streak_bonus_interval', '7'::jsonb, 'Consecutive day milestone that awards the streak bonus')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- SUBJECTS POLICIES
DROP POLICY IF EXISTS "subjects_select_policy" ON public.subjects;
CREATE POLICY "subjects_select_policy" ON public.subjects
FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "subjects_modify_policy" ON public.subjects;
CREATE POLICY "subjects_modify_policy" ON public.subjects
FOR ALL TO authenticated USING (public.get_my_role() IN ('faculty', 'admin'));

-- QUESTIONS POLICIES
-- Faculty & Admins can read all questions (including correct_option & explanation)
DROP POLICY IF EXISTS "questions_faculty_select_policy" ON public.questions;
CREATE POLICY "questions_faculty_select_policy" ON public.questions
FOR SELECT TO authenticated USING (public.get_my_role() IN ('faculty', 'admin'));

-- Faculty & Admins can insert/update questions
DROP POLICY IF EXISTS "questions_faculty_modify_policy" ON public.questions;
CREATE POLICY "questions_faculty_modify_policy" ON public.questions
FOR ALL TO authenticated USING (public.get_my_role() IN ('faculty', 'admin'));

-- QUIZ ATTEMPTS POLICIES
-- Students can select their own attempts; Faculty & Admin can inspect all
DROP POLICY IF EXISTS "quiz_attempts_select_policy" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_select_policy" ON public.quiz_attempts
FOR SELECT TO authenticated USING (
  student_id = auth.uid() OR public.get_my_role() IN ('faculty', 'admin')
);

-- QUIZ ANSWERS POLICIES
DROP POLICY IF EXISTS "quiz_answers_select_policy" ON public.quiz_answers;
CREATE POLICY "quiz_answers_select_policy" ON public.quiz_answers
FOR SELECT TO authenticated USING (
  attempt_id IN (SELECT id FROM public.quiz_attempts WHERE student_id = auth.uid()) 
  OR public.get_my_role() IN ('faculty', 'admin')
);

-- STUDENT STREAKS POLICIES
DROP POLICY IF EXISTS "student_streaks_select_policy" ON public.student_streaks;
CREATE POLICY "student_streaks_select_policy" ON public.student_streaks
FOR SELECT TO authenticated USING (
  student_id = auth.uid() OR public.get_my_role() IN ('faculty', 'admin')
);

-- STREAK EVENTS POLICIES
DROP POLICY IF EXISTS "streak_events_select_policy" ON public.streak_events;
CREATE POLICY "streak_events_select_policy" ON public.streak_events
FOR SELECT TO authenticated USING (
  student_id = auth.uid() OR public.get_my_role() IN ('faculty', 'admin')
);

-- APP SETTINGS POLICIES
DROP POLICY IF EXISTS "app_settings_select_policy" ON public.app_settings;
CREATE POLICY "app_settings_select_policy" ON public.app_settings
FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "app_settings_modify_policy" ON public.app_settings;
CREATE POLICY "app_settings_modify_policy" ON public.app_settings
FOR ALL TO authenticated USING (public.get_my_role() = 'admin');

-- ==============================================================================
-- 9. SEED 30 PILOT QUESTIONS FOR FACULTY REVIEW (CS101)
-- All questions seeded as 'pending' so faculty can review & approve in /faculty/questions
-- ==============================================================================

DO $$
DECLARE
  v_subject_id UUID;
BEGIN
  SELECT id INTO v_subject_id FROM public.subjects WHERE code = 'CS101';

  INSERT INTO public.questions (subject_id, topic, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, status)
  VALUES
    -- Topic 1: Variables & Data Types (5 Questions)
    (v_subject_id, 'Variables & Types', 'What is the output of type(4 / 2) in Python 3?', 'int', 'float', 'number', 'double', 'B', 'The regular division operator (/) always returns a float in Python 3, even if the division has no remainder (2.0).', 'pending'),
    (v_subject_id, 'Variables & Types', 'Which of the following is an invalid variable name in Python?', '_total_score', 'student2', '2nd_attempt', 'user_name_$', 'C', 'Variable names in Python cannot start with a digit. They must start with a letter (a-z, A-Z) or an underscore (_).', 'pending'),
    (v_subject_id, 'Variables & Types', 'What is the value of bool("") in Python?', 'True', 'False', 'None', 'Error', 'B', 'Empty sequences and collections (such as empty strings, lists, or tuples) evaluate to False in boolean context.', 'pending'),
    (v_subject_id, 'Variables & Types', 'What does the expression 3 * "AB" produce in Python?', 'ABABAB', 'Error', '3AB', '["AB", "AB", "AB"]', 'A', 'When the multiplication operator (*) is applied to a string and an integer, it performs sequence repetition.', 'pending'),
    (v_subject_id, 'Variables & Types', 'Which data type is immutable in Python?', 'list', 'dict', 'set', 'tuple', 'D', 'Tuples are immutable sequences; once created, their elements cannot be modified, added, or removed.', 'pending'),

    -- Topic 2: Operators & Expressions (5 Questions)
    (v_subject_id, 'Operators & Expressions', 'What is the result of 17 // 5 in Python?', '3.4', '3', '2', '4', 'B', 'The floor division operator (//) divides numbers and rounds down to the nearest integer.', 'pending'),
    (v_subject_id, 'Operators & Expressions', 'What is the value of 2 ** 3 ** 2?', '64', '512', '36', '256', 'B', 'The exponentiation operator (**) is right-associative in Python. Therefore, 2 ** (3 ** 2) = 2 ** 9 = 512.', 'pending'),
    (v_subject_id, 'Operators & Expressions', 'What is the output of 10 % 3?', '1', '3', '0', '3.33', 'A', 'The modulus operator (%) returns the remainder of the integer division. 10 divided by 3 is 3 with a remainder of 1.', 'pending'),
    (v_subject_id, 'Operators & Expressions', 'What does the expression 5 == 5.0 evaluate to?', 'True', 'False', 'TypeError', 'None', 'A', 'The equality operator (==) compares numeric values. Since 5 and 5.0 represent the same numerical value, it evaluates to True.', 'pending'),
    (v_subject_id, 'Operators & Expressions', 'What does True + True evaluate to in Python?', 'True', '2', '1', 'TypeError', 'B', 'In Python, bool is a subclass of int where True has value 1 and False has value 0. Thus, 1 + 1 = 2.', 'pending'),

    -- Topic 3: Conditionals & Control Flow (5 Questions)
    (v_subject_id, 'Conditionals', 'Which keyword is used for "else if" branching in Python?', 'elseif', 'else if', 'elif', 'elsif', 'C', 'Python uses the keyword elif to chain multiple conditional branches cleanly.', 'pending'),
    (v_subject_id, 'Conditionals', 'What is the output of: x = 10; print("High" if x > 15 else "Low")?', 'High', 'Low', 'None', 'SyntaxError', 'B', 'This is a Python ternary conditional expression. Since 10 > 15 is False, it evaluates to "Low".', 'pending'),
    (v_subject_id, 'Conditionals', 'In Python, what is the value of: not (5 > 2 and 3 < 1)?', 'True', 'False', 'None', 'Error', 'A', 'Inside the parentheses, 5 > 2 is True and 3 < 1 is False, so (True and False) is False. not False evaluates to True.', 'pending'),
    (v_subject_id, 'Conditionals', 'What happens if no condition in an if-elif ladder matches and there is no else block?', 'A runtime error occurs', 'The program stops', 'Execution continues past the block', 'The first block runs anyway', 'C', 'If no conditional branch evaluates to True and there is no else clause, Python simply skips the entire conditional structure.', 'pending'),
    (v_subject_id, 'Conditionals', 'Which comparison operator checks if two variables reference the exact same object in memory?', '==', 'equals', 'is', '===', 'C', 'The "is" keyword checks identity (whether both operands refer to the same object in memory), whereas == checks value equality.', 'pending'),

    -- Topic 4: Loops & Iteration (5 Questions)
    (v_subject_id, 'Loops & Iteration', 'How many times will this loop execute: for i in range(2, 8, 2)?', '6 times', '3 times', '4 times', '2 times', 'B', 'The range(2, 8, 2) generates values 2, 4, 6 (stopping before 8), which means the loop runs exactly 3 times.', 'pending'),
    (v_subject_id, 'Loops & Iteration', 'Which keyword immediately terminates the enclosing loop?', 'continue', 'pass', 'break', 'return', 'C', 'The break statement terminates the current loop immediately and transfers program control to the statement following the loop.', 'pending'),
    (v_subject_id, 'Loops & Iteration', 'What does the continue statement do in a loop?', 'Exits the loop entirely', 'Skips to the next iteration', 'Restarts the loop from index 0', 'Pauses execution', 'B', 'The continue statement skips the rest of the current iteration and jumps directly to the loop condition evaluation for the next iteration.', 'pending'),
    (v_subject_id, 'Loops & Iteration', 'When does a loop else clause execute in Python?', 'When the loop terminates normally without encountering break', 'Whenever break is encountered', 'Every time an iteration finishes', 'Only if the condition was initially false', 'A', 'In Python, the else block attached to a for or while loop executes only when the loop completes all iterations without encountering a break.', 'pending'),
    (v_subject_id, 'Loops & Iteration', 'What is the output of: list(range(3))?', '[1, 2, 3]', '[0, 1, 2]', '[0, 1, 2, 3]', '[1, 2]', 'B', 'range(n) starts at 0 by default and produces n integers up to n-1. Therefore, range(3) produces [0, 1, 2].', 'pending'),

    -- Topic 5: Functions & Scope (5 Questions)
    (v_subject_id, 'Functions & Scope', 'What keyword is used to declare a function in Python?', 'func', 'function', 'def', 'define', 'C', 'Functions in Python are defined using the def keyword followed by the function name and parameter list.', 'pending'),
    (v_subject_id, 'Functions & Scope', 'What does a Python function return by default if it has no return statement?', '0', 'False', 'None', 'Empty string', 'C', 'If a function finishes executing without an explicit return statement, it implicitly returns the special singleton object None.', 'pending'),
    (v_subject_id, 'Functions & Scope', 'What keyword allows modifying a variable defined outside the function in the global scope?', 'nonlocal', 'global', 'outer', 'extern', 'B', 'The global keyword declares that a variable inside a function refers to the module-level global variable rather than creating a local variable.', 'pending'),
    (v_subject_id, 'Functions & Scope', 'What does *args in a function parameter list represent?', 'Keyword arguments', 'A pointer variable', 'Variable number of positional arguments', 'Required arguments', 'C', 'The *args syntax allows a function to accept any number of additional positional arguments as a tuple.', 'pending'),
    (v_subject_id, 'Functions & Scope', 'What is a lambda function in Python?', 'A function that never returns', 'An anonymous, inline single-expression function', 'A recursive generator function', 'A function with no arguments', 'B', 'A lambda function is a small, anonymous function that can have any number of arguments but only a single expression whose result is returned.', 'pending'),

    -- Topic 6: Lists, Strings & Dictionaries (5 Questions)
    (v_subject_id, 'Data Structures', 'What is the result of "hello"[1:4] in Python?', '"ell"', '"ello"', '"hel"', '"el"', 'A', 'String slicing [start:stop] is inclusive of start and exclusive of stop. Indices 1, 2, 3 correspond to "e", "l", "l".', 'pending'),
    (v_subject_id, 'Data Structures', 'Which method adds an element to the end of a Python list?', 'push()', 'append()', 'add()', 'insert()', 'B', 'In Python, list.append(x) appends element x to the end of the list in O(1) amortized time.', 'pending'),
    (v_subject_id, 'Data Structures', 'What happens when accessing a non-existent key with dict.get(key, "default")?', 'KeyError is raised', 'Returns "default"', 'Returns None', 'Creates the key', 'B', 'The .get() method looks up a key safely and returns the fallback default value if the key does not exist, without raising a KeyError.', 'pending'),
    (v_subject_id, 'Data Structures', 'What is the output of len(set([1, 2, 2, 3, 3, 3]))?', '6', '1', '3', '4', 'C', 'A set contains only unique elements. Passing the list into set() removes duplicates, leaving {1, 2, 3}, which has length 3.', 'pending'),
    (v_subject_id, 'Data Structures', 'What is the time complexity of looking up a key in a Python dictionary on average?', 'O(n)', 'O(1)', 'O(log n)', 'O(n log n)', 'B', 'Python dictionaries are implemented using hash tables, offering O(1) average-time complexity for key lookups, insertions, and deletions.', 'pending')
  ON CONFLICT DO NOTHING;
END $$;

-- ==============================================================================
-- 10. ATOMIC QUIZ FINALIZATION PROCEDURE (finalize_daily_quiz)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.finalize_daily_quiz(
  p_attempt_id UUID,
  p_student_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt RECORD;
  v_score INT;
  v_total_answers INT;
  v_quiz_ref TEXT;
  v_xp_res JSONB;
  v_xp_awarded INT := 0;
  v_current_streak_row RECORD;
  v_max_freezes INT := 2;
  v_curr_month TEXT;
  v_streak_month TEXT;
  v_freezes_used INT := 0;
  v_curr_streak INT := 0;
  v_long_streak INT := 0;
  v_diff_days INT;
  v_event_type TEXT := 'none';
  v_notes TEXT := '';
  v_bonus_awarded BOOLEAN := FALSE;
  v_bonus_res JSONB;
BEGIN
  -- 1. Check attempt exists and verify ownership
  SELECT * INTO v_attempt
  FROM public.quiz_attempts
  WHERE id = p_attempt_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quiz session not found.');
  END IF;

  IF v_attempt.student_id <> p_student_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: You do not own this quiz session.');
  END IF;

  -- 2. Idempotency: If already completed, return existing results safely
  IF v_attempt.status = 'completed' THEN
    SELECT * INTO v_current_streak_row
    FROM public.student_streaks
    WHERE student_id = p_student_id;

    RETURN jsonb_build_object(
      'success', true,
      'already_finalized', true,
      'score', v_attempt.score,
      'total_questions', v_attempt.total_questions,
      'xp_awarded', v_attempt.xp_awarded,
      'bonus_awarded', false,
      'current_streak', COALESCE(v_current_streak_row.current_streak, 0),
      'longest_streak', COALESCE(v_current_streak_row.longest_streak, 0),
      'streak_event_type', 'none',
      'notes', 'Quiz already finalized'
    );
  END IF;

  -- 3. Verify all questions are answered
  SELECT count(*), count(*) FILTER (WHERE is_correct = true)
  INTO v_total_answers, v_score
  FROM public.quiz_answers
  WHERE attempt_id = p_attempt_id;

  IF v_total_answers < v_attempt.total_questions THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Please answer all %s questions before submitting.', v_attempt.total_questions)
    );
  END IF;

  -- 4. Award Daily Quiz XP via existing award_xp procedure (base 15 + 5 per correct answer)
  v_quiz_ref := format('daily_quiz_%s_%s', v_attempt.quiz_date, p_student_id);
  v_xp_res := public.award_xp(
    p_student_id => p_student_id,
    p_action_type => 'DAILY_QUIZ',
    p_reference_id => v_quiz_ref,
    p_extra_units => v_score
  );

  IF (v_xp_res->>'status') = 'awarded' THEN
    v_xp_awarded := COALESCE((v_xp_res->>'xp_awarded')::INT, 0);
  ELSIF (v_xp_res->>'status') = 'duplicate' THEN
    SELECT COALESCE(xp_amount, 0) INTO v_xp_awarded
    FROM public.xp_events
    WHERE reference_id = v_quiz_ref AND voided = false
    LIMIT 1;
  END IF;

  -- 5. Read max freeze setting
  SELECT COALESCE((value)::TEXT::INT, 2) INTO v_max_freezes
  FROM public.app_settings
  WHERE key = 'max_freeze_days_per_month';
  IF v_max_freezes IS NULL THEN
    v_max_freezes := 2;
  END IF;

  v_curr_month := to_char(v_attempt.quiz_date, 'YYYY-MM');

  -- 6. Evaluate and update streaks
  SELECT * INTO v_current_streak_row
  FROM public.student_streaks
  WHERE student_id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- First daily quiz ever
    v_curr_streak := 1;
    v_long_streak := 1;
    v_event_type := 'streak_increment';
    v_notes := 'Initial daily quiz completed. Streak started.';

    INSERT INTO public.student_streaks (
      student_id, current_streak, longest_streak, last_quiz_date,
      freeze_days_used_this_month, freeze_days_month, updated_at
    ) VALUES (
      p_student_id, v_curr_streak, v_long_streak, v_attempt.quiz_date,
      0, v_curr_month, now()
    );
  ELSE
    v_curr_streak := v_current_streak_row.current_streak;
    v_long_streak := v_current_streak_row.longest_streak;
    v_freezes_used := v_current_streak_row.freeze_days_used_this_month;
    v_streak_month := v_current_streak_row.freeze_days_month;

    IF v_streak_month <> v_curr_month THEN
      v_freezes_used := 0;
      v_streak_month := v_curr_month;
    END IF;

    IF v_current_streak_row.last_quiz_date = v_attempt.quiz_date THEN
      v_event_type := 'none';
      v_notes := 'Quiz already counted for this date.';
    ELSIF v_current_streak_row.last_quiz_date IS NULL THEN
      v_curr_streak := 1;
      v_long_streak := GREATEST(1, v_long_streak);
      v_event_type := 'streak_increment';
      v_notes := 'Initial daily quiz completed. Streak started.';
    ELSE
      v_diff_days := (v_attempt.quiz_date - v_current_streak_row.last_quiz_date);

      IF v_diff_days = 1 THEN
        v_curr_streak := v_curr_streak + 1;
        v_long_streak := GREATEST(v_curr_streak, v_long_streak);
        v_event_type := 'streak_increment';
        v_notes := format('Consecutive day completed. Streak increased to %s.', v_curr_streak);
      ELSIF v_diff_days = 2 THEN
        IF v_freezes_used < v_max_freezes THEN
          v_freezes_used := v_freezes_used + 1;
          v_curr_streak := v_curr_streak + 1;
          v_long_streak := GREATEST(v_curr_streak, v_long_streak);
          v_event_type := 'streak_freeze';
          v_notes := format('Missed 1 day. Freeze used (%s/%s). Streak preserved and increased to %s.', v_freezes_used, v_max_freezes, v_curr_streak);
        ELSE
          v_curr_streak := 1;
          v_event_type := 'streak_reset';
          v_notes := 'Missed 1 day but freeze days exhausted. Streak reset to 1.';
        END IF;
      ELSE
        v_curr_streak := 1;
        v_event_type := 'streak_reset';
        v_notes := format('Missed %s days. Streak reset to 1.', v_diff_days - 1);
      END IF;
    END IF;

    UPDATE public.student_streaks
    SET
      current_streak = v_curr_streak,
      longest_streak = v_long_streak,
      last_quiz_date = v_attempt.quiz_date,
      freeze_days_used_this_month = v_freezes_used,
      freeze_days_month = v_streak_month,
      updated_at = now()
    WHERE student_id = p_student_id;
  END IF;

  -- Record streak event audit log
  IF v_event_type <> 'none' THEN
    INSERT INTO public.streak_events (
      student_id, event_type, quiz_date, streak_before, streak_after, notes
    ) VALUES (
      p_student_id, v_event_type, v_attempt.quiz_date,
      COALESCE(v_current_streak_row.current_streak, 0), v_curr_streak, v_notes
    );
  END IF;

  -- 7. 7-Day Milestone bonus
  IF v_curr_streak > 0 AND (v_curr_streak % 7 = 0) AND v_event_type IN ('streak_increment', 'streak_freeze') THEN
    v_bonus_res := public.award_xp(
      p_student_id => p_student_id,
      p_action_type => 'STREAK_7_BONUS',
      p_reference_id => format('streak_7_bonus_%s_%s', v_curr_streak, p_student_id),
      p_extra_units => 0
    );
    IF (v_bonus_res->>'status') = 'awarded' THEN
      v_bonus_awarded := TRUE;
      INSERT INTO public.streak_events (
        student_id, event_type, quiz_date, streak_before, streak_after, notes
      ) VALUES (
        p_student_id, 'milestone_bonus', v_attempt.quiz_date,
        v_curr_streak, v_curr_streak, '7-Day Streak Milestone Reached! +50 XP bonus awarded.'
      );
    END IF;
  END IF;

  -- 8. Mark attempt completed
  UPDATE public.quiz_attempts
  SET
    status = 'completed',
    score = v_score,
    xp_awarded = v_xp_awarded,
    completed_at = now()
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_finalized', false,
    'score', v_score,
    'total_questions', v_attempt.total_questions,
    'xp_awarded', v_xp_awarded,
    'bonus_awarded', v_bonus_awarded,
    'current_streak', v_curr_streak,
    'longest_streak', v_long_streak,
    'streak_event_type', v_event_type,
    'notes', v_notes
  );
END;
$$;

-- Security: Only service role can execute finalize_daily_quiz directly
REVOKE EXECUTE ON FUNCTION public.finalize_daily_quiz(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_daily_quiz(UUID, UUID) TO service_role;

-- Revoke direct mutation privileges on answer & streak tables from authenticated & anon
REVOKE INSERT, UPDATE, DELETE ON public.quiz_answers FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.quiz_attempts FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.student_streaks FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.streak_events FROM authenticated, anon;

