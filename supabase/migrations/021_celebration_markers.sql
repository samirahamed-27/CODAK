-- Migration: 021_celebration_markers.sql
-- Description: Store server-side celebration markers (last_celebrated_level, last_celebrated_rank)
-- Protected by security trigger to reject direct client writes, backfilled to each student's current level & rank.

-- 1. Add celebration marker columns to public.students
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS last_celebrated_level INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_celebrated_rank TEXT NOT NULL DEFAULT 'apprentice';

-- 2. Trigger function: Prevent direct client writes to celebration columns
CREATE OR REPLACE FUNCTION public.prevent_direct_celebration_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role, superuser, or when app.allow_celebration_update is explicitly 'on'
  IF current_setting('app.allow_celebration_update', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'service_role' OR auth.role() IS NULL OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF (NEW.last_celebrated_level IS DISTINCT FROM OLD.last_celebrated_level) OR 
     (NEW.last_celebrated_rank IS DISTINCT FROM OLD.last_celebrated_rank) THEN
    RAISE EXCEPTION 'Direct client updates to last_celebrated_level and last_celebrated_rank are prohibited. Use server action.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_direct_celebration_update ON public.students;
CREATE TRIGGER trg_prevent_direct_celebration_update
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_direct_celebration_update();

-- 3. Backfill each existing student to their CURRENT level and rank so no one gets flooded with old celebrations
DO $$
DECLARE
  v_updated INT;
BEGIN
  SET LOCAL app.allow_celebration_update = 'on';

  WITH student_xp AS (
    SELECT 
      s.id,
      COALESCE(SUM(e.xp_amount), 0) AS total_xp
    FROM public.students s
    LEFT JOIN public.xp_events e ON e.student_id = s.id AND e.status = 'valid'
    GROUP BY s.id
  ),
  student_calc AS (
    SELECT 
      id,
      CASE 
        WHEN total_xp < 100 THEN 1
        WHEN total_xp < 250 THEN 2
        WHEN total_xp < 450 THEN 3
        WHEN total_xp < 700 THEN 4
        WHEN total_xp < 1000 THEN 5
        ELSE 6 + FLOOR((total_xp - 1000) / 350)::INT
      END AS calc_level
    FROM student_xp
  ),
  student_ranks AS (
    SELECT 
      id,
      calc_level,
      CASE 
        WHEN calc_level >= 18 THEN 'grandmaster'
        WHEN calc_level >= 15 THEN 'innovator'
        WHEN calc_level >= 12 THEN 'strategist'
        WHEN calc_level >= 8  THEN 'architect'
        WHEN calc_level >= 4  THEN 'debugger'
        WHEN calc_level >= 2  THEN 'scripter'
        ELSE 'apprentice'
      END AS calc_rank
    FROM student_calc
  )
  UPDATE public.students s
  SET 
    last_celebrated_level = sr.calc_level,
    last_celebrated_rank = sr.calc_rank
  FROM student_ranks sr
  WHERE s.id = sr.id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Backfilled celebration markers for % students', v_updated;
END $$;
