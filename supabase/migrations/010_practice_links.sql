-- ==============================================================================
-- PHASE 3 MIGRATION: 010_practice_links.sql
-- Curated Practice Problem Links Directory (Metadata & External Links Only)
-- Strictly stores NO problem statements, descriptions, or solutions.
-- ==============================================================================

-- 1. PRACTICE LINKS TABLE
CREATE TABLE IF NOT EXISTS public.practice_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  problem_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  link TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_practice_links_topic ON public.practice_links(topic);
CREATE INDEX IF NOT EXISTS idx_practice_links_difficulty ON public.practice_links(difficulty);

-- 2. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.practice_links ENABLE ROW LEVEL SECURITY;

-- Read policy: Accessible to all authenticated users
DROP POLICY IF EXISTS "practice_links_select_all" ON public.practice_links;
CREATE POLICY "practice_links_select_all"
ON public.practice_links
FOR SELECT
TO authenticated
USING (true);

-- Revoke write policies from authenticated/anon (Server/Admin only)
REVOKE INSERT, UPDATE, DELETE ON public.practice_links FROM authenticated, anon, public;

-- 3. SEED 15 PRACTICE LINKS ACROSS 3 TOPICS (5 per topic: Easy, Medium, Hard)
-- Storing ONLY platform, problem_id, title, topic, difficulty, link.
INSERT INTO public.practice_links (platform, problem_id, title, topic, difficulty, link)
VALUES
  -- TOPIC 1: Arrays & Strings (5 problems)
  ('LeetCode', 'leetcode:1', 'Two Sum', 'Arrays & Strings', 'Easy', 'https://leetcode.com/problems/two-sum/'),
  ('LeetCode', 'leetcode:121', 'Best Time to Buy and Sell Stock', 'Arrays & Strings', 'Easy', 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/'),
  ('LeetCode', 'leetcode:15', '3Sum', 'Arrays & Strings', 'Medium', 'https://leetcode.com/problems/3sum/'),
  ('Codeforces', 'codeforces:158B', 'Taxi', 'Arrays & Strings', 'Medium', 'https://codeforces.com/problemset/problem/158/B'),
  ('LeetCode', 'leetcode:42', 'Trapping Rain Water', 'Arrays & Strings', 'Hard', 'https://leetcode.com/problems/trapping-rain-water/'),

  -- TOPIC 2: Dynamic Programming (5 problems)
  ('LeetCode', 'leetcode:70', 'Climbing Stairs', 'Dynamic Programming', 'Easy', 'https://leetcode.com/problems/climbing-stairs/'),
  ('HackerRank', 'hackerrank:fibonacci-modified', 'Fibonacci Modified', 'Dynamic Programming', 'Easy', 'https://www.hackerrank.com/challenges/fibonacci-modified/problem'),
  ('LeetCode', 'leetcode:322', 'Coin Change', 'Dynamic Programming', 'Medium', 'https://leetcode.com/problems/coin-change/'),
  ('Codeforces', 'codeforces:455A', 'Boredom', 'Dynamic Programming', 'Medium', 'https://codeforces.com/problemset/problem/455/A'),
  ('LeetCode', 'leetcode:72', 'Edit Distance', 'Dynamic Programming', 'Hard', 'https://leetcode.com/problems/edit-distance/'),

  -- TOPIC 3: Trees & Graphs (5 problems)
  ('LeetCode', 'leetcode:104', 'Maximum Depth of Binary Tree', 'Trees & Graphs', 'Easy', 'https://leetcode.com/problems/maximum-depth-of-binary-tree/'),
  ('LeetCode', 'leetcode:226', 'Invert Binary Tree', 'Trees & Graphs', 'Easy', 'https://leetcode.com/problems/invert-binary-tree/'),
  ('LeetCode', 'leetcode:200', 'Number of Islands', 'Trees & Graphs', 'Medium', 'https://leetcode.com/problems/number-of-islands/'),
  ('Codeforces', 'codeforces:520B', 'Two Buttons', 'Trees & Graphs', 'Medium', 'https://codeforces.com/problemset/problem/520/B'),
  ('LeetCode', 'leetcode:297', 'Serialize and Deserialize Binary Tree', 'Trees & Graphs', 'Hard', 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/')
ON CONFLICT (problem_id) DO UPDATE SET
  title = EXCLUDED.title,
  topic = EXCLUDED.topic,
  difficulty = EXCLUDED.difficulty,
  link = EXCLUDED.link;
