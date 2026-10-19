-- Migration 025: Seed Second Subject (CS102: Data Structures & Algorithms)
-- Fulfills MSOT Competition Deliverable: Sample quiz bank for at least 2 subjects

-- 1. Insert CS102 into public.subjects
INSERT INTO public.subjects (code, name)
VALUES ('CS102', 'Data Structures & Algorithms')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name;

-- 2. Seed 20 curated syllabus questions for CS102 (10 approved, 10 pending)
DO $$
DECLARE
  v_subject_id UUID;
BEGIN
  SELECT id INTO v_subject_id FROM public.subjects WHERE code = 'CS102';

  INSERT INTO public.questions (subject_id, topic, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, status, is_active)
  VALUES
    -- TOPIC 1: Arrays & Time Complexity (Approved)
    (v_subject_id, 'Arrays & Hashing', 'What is the time complexity of searching for an element in an unsorted array of size N?', 'O(1)', 'O(log N)', 'O(N)', 'O(N^2)', 'C', 'In an unsorted array, an element may be anywhere, requiring a linear scan checking up to N elements.', 'approved', true),
    (v_subject_id, 'Arrays & Hashing', 'Which data structure allows O(1) average time complexity for insertion, deletion, and lookup?', 'Binary Search Tree', 'Hash Map', 'Singly Linked List', 'Max Heap', 'B', 'Hash tables use hash functions to compute array indices, achieving O(1) average time for basic operations.', 'approved', true),

    -- TOPIC 2: Stacks & Queues (Approved)
    (v_subject_id, 'Stacks & Queues', 'Which data structure follows the Last-In, First-Out (LIFO) operational principle?', 'Queue', 'Stack', 'Priority Queue', 'Deque', 'B', 'A stack operates on LIFO order: elements pushed last are popped first.', 'approved', true),
    (v_subject_id, 'Stacks & Queues', 'What is the minimum number of stacks required to implement a FIFO queue?', '1', '2', '3', '4', 'B', 'Two stacks (an input stack and an output stack) are sufficient to reverse LIFO order twice to achieve FIFO.', 'approved', true),

    -- TOPIC 3: Linked Lists (Approved)
    (v_subject_id, 'Linked Lists', 'What is the primary advantage of a singly linked list over a fixed-size dynamic array?', 'O(1) random index access', 'O(1) insertion at the head without shifting elements', 'Better CPU cache locality', 'Lower memory overhead per element', 'B', 'Inserting at the head of a linked list only requires updating pointer references in O(1) without shifting contiguous memory.', 'approved', true),
    (v_subject_id, 'Linked Lists', 'Which algorithm detects a cycle in a linked list using O(1) auxiliary space?', 'Dijkstra Algorithm', 'Floyds Tortoise and Hare Algorithm', 'Kruskals Algorithm', 'Bellman-Ford Algorithm', 'B', 'Floyds cycle-finding algorithm uses two pointers moving at speeds 1 and 2 to detect loops in O(1) space.', 'approved', true),

    -- TOPIC 4: Binary Trees & BSTs (Approved)
    (v_subject_id, 'Binary Trees', 'In a Binary Search Tree (BST), which traversal produces values in strictly sorted ascending order?', 'Pre-order traversal', 'Post-order traversal', 'In-order traversal', 'Level-order traversal', 'C', 'In-order traversal visits left subtree, root, and right subtree, visiting keys in non-decreasing order for any valid BST.', 'approved', true),
    (v_subject_id, 'Binary Trees', 'What is the worst-case time complexity of searching a key in an unbalanced BST of N nodes?', 'O(1)', 'O(log N)', 'O(N)', 'O(N log N)', 'C', 'When a BST degrades into a skewed linked list (e.g. elements inserted in sorted order), tree height is N, making search O(N).', 'approved', true),

    -- TOPIC 5: Recursion & Divide-and-Conquer (Approved)
    (v_subject_id, 'Recursion & Divide', 'What occurs when a recursive function lacks a base case or the base case is unreachable?', 'Memory leak in heap', 'Stack Overflow error', 'Deadlock', 'Garbage collection pause', 'B', 'Without a terminating base case, recursive stack frames accumulate on the call stack until memory is exhausted.', 'approved', true),
    (v_subject_id, 'Recursion & Divide', 'What is the average time complexity of Merge Sort on an array of N elements?', 'O(N)', 'O(N log N)', 'O(N^2)', 'O(log N)', 'B', 'Merge sort divides the problem in halves log N times and merges in O(N) at each level, guaranteeing O(N log N) time.', 'approved', true),

    -- PENDING QUESTIONS FOR FACULTY REVIEW QUEUE (10 Questions)
    (v_subject_id, 'Heap & Priority Queue', 'What is the time complexity to extract the minimum element from a Min-Heap of N nodes?', 'O(1)', 'O(log N)', 'O(N)', 'O(N log N)', 'B', 'Removing the root and restoring the heap property via heapify-down takes logarithmic time O(log N).', 'pending', true),
    (v_subject_id, 'Heap & Priority Queue', 'In a 0-indexed array representation of a binary heap, what is the left child index of node at index i?', '2 * i', '2 * i + 1', '2 * i + 2', 'i / 2', 'B', 'For 0-based indexing, the left child of node i is at 2i + 1 and the right child is at 2i + 2.', 'pending', true),

    -- Graph Algorithms (Pending)
    (v_subject_id, 'Graphs', 'Which graph traversal uses a FIFO queue to discover vertices level-by-level?', 'Depth-First Search (DFS)', 'Breadth-First Search (BFS)', 'Topological Sort', 'Prim Algorithm', 'B', 'BFS explores neighboring nodes level by level using a queue data structure.', 'pending', true),
    (v_subject_id, 'Graphs', 'What is the time complexity of Breadth-First Search using an adjacency list representation with V vertices and E edges?', 'O(V)', 'O(E)', 'O(V + E)', 'O(V * E)', 'C', 'BFS visits every vertex once and inspects every edge once in an adjacency list representation, taking O(V + E).', 'pending', true),

    -- Dynamic Programming (Pending)
    (v_subject_id, 'Dynamic Programming', 'What are the two essential properties a problem must possess to be solvable via Dynamic Programming?', 'Linear time and constant space', 'Optimal substructure and overlapping subproblems', 'Greedy choice and recursion', 'Divide-and-conquer and backtracking', 'B', 'Dynamic Programming applies when subproblems overlap and an optimal solution is composed of optimal subsolutions.', 'pending', true),
    (v_subject_id, 'Dynamic Programming', 'What is the time complexity of computing the N-th Fibonacci number using memoized dynamic programming?', 'O(2^N)', 'O(N^2)', 'O(N)', 'O(1)', 'C', 'Memoization stores results of subproblems 0 through N once, reducing exponential O(2^N) time to linear O(N).', 'pending', true),

    -- Sorting & Searching (Pending)
    (v_subject_id, 'Sorting & Searching', 'Which sorting algorithm is considered stable?', 'Quick Sort', 'Heap Sort', 'Merge Sort', 'Selection Sort', 'C', 'Merge Sort preserves the relative order of duplicate elements, making it a stable sorting algorithm.', 'pending', true),
    (v_subject_id, 'Sorting & Searching', 'What is the worst-case time complexity of Quick Sort with naive pivot selection?', 'O(N log N)', 'O(N^2)', 'O(N)', 'O(2^N)', 'B', 'When the pivot is consistently the minimum or maximum element (e.g. sorted input), Quick Sort partitions degrade to O(N^2).', 'pending', true),

    -- Advanced Data Structures (Pending)
    (v_subject_id, 'Advanced Trees', 'In an AVL Tree, what is the maximum allowed difference between heights of left and right subtrees?', '0', '1', '2', 'log N', 'B', 'An AVL tree is a strictly height-balanced BST where the balance factor (height(left) - height(right)) must be -1, 0, or 1.', 'pending', true),
    (v_subject_id, 'Advanced Trees', 'Which data structure is optimal for autocomplete search prefix lookups?', 'Trie (Prefix Tree)', 'Red-Black Tree', 'B-Tree', 'Hash Set', 'A', 'A Trie stores strings character by character along path branches, making prefix lookups O(L) where L is prefix length.', 'pending', true);
END $$;
