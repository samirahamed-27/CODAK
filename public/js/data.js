/**
 * Codemon Stats & Question Loader
 * Mirai-Game / Gamify Platform
 */

// ---------------------------------------------------------------------------
// STARTER CODEMONS (CODEMONS)
// ---------------------------------------------------------------------------
const CODEMONS = [
  {
    id: 'pyrawr',
    name: 'Pyrawr',
    language: 'Python',
    maxHp: 100,
    hp: 100,
    attackPower: 1.0, // Balanced
    spriteFront: 'assets/pyrawr-front.svg',
    spriteBack: 'assets/pyrawr-back.svg',
    description: 'Balanced Python striker with clean indentation and steady algorithmic execution.',
    typeColor: 'var(--pixel-yellow)',
    bugmonVariant: {
      name: 'Bug-Pyrawr',
      sprite: 'assets/bug-pyrawr.svg',
      maxHp: 150, // 1.5x normal (100 * 1.5)
      palette: {
        primary: '#e03c3c',
        secondary: '#9b51e0',
        dark: '#35084a',
        glow: '#ff1744'
      }
    },
    moves: [
      { name: 'Indent Zap', power: 25, type: 'Python', accuracy: 0.95 },
      { name: 'List Slicing', power: 30, type: 'Python', accuracy: 0.90 },
      { name: 'Try/Except Shield', power: 0, heal: 25, type: 'Support', accuracy: 1.0 },
      { name: 'Async Bolt', power: 45, type: 'Python', accuracy: 0.80 }
    ]
  },
  {
    id: 'jaskull',
    name: 'Jaskull',
    language: 'JavaScript',
    maxHp: 90,
    hp: 90,
    attackPower: 1.1, // Glass cannon
    spriteFront: 'assets/jaskull-front.svg',
    spriteBack: 'assets/jaskull-back.svg',
    description: 'Glass cannon JavaScript speedster with high attack bursts and event-driven strikes.',
    typeColor: 'var(--pixel-yellow)',
    bugmonVariant: {
      name: 'Bug-Jaskull',
      sprite: 'assets/bug-jaskull.svg',
      maxHp: 135, // 1.5x normal (90 * 1.5)
      palette: {
        primary: '#d50000',
        secondary: '#8a2be2',
        dark: '#260033',
        glow: '#ea80fc'
      }
    },
    moves: [
      { name: 'Promise Surge', power: 28, type: 'JavaScript', accuracy: 0.95 },
      { name: 'Event Loop', power: 34, type: 'JavaScript', accuracy: 0.85 },
      { name: 'Strict Mode', power: 0, heal: 20, type: 'Support', accuracy: 1.0 },
      { name: 'Callback Storm', power: 46, type: 'JavaScript', accuracy: 0.80 }
    ]
  },
  {
    id: 'cplusaur',
    name: 'Cplusaur',
    language: 'C++',
    maxHp: 120,
    hp: 120,
    attackPower: 0.9, // Tanky
    spriteFront: 'assets/cplusaur-front.svg',
    spriteBack: 'assets/cplusaur-back.svg',
    description: 'Tanky C++ heavyweight armored in raw memory pointers with zero abstraction overhead.',
    typeColor: 'var(--pixel-blue)',
    bugmonVariant: {
      name: 'Bug-Cplusaur',
      sprite: 'assets/bug-cplusaur.svg',
      maxHp: 180, // 1.5x normal (120 * 1.5)
      palette: {
        primary: '#c62828',
        secondary: '#6a1b9a',
        dark: '#1a0033',
        glow: '#ff5252'
      }
    },
    moves: [
      { name: 'Pointer Jab', power: 22, type: 'C++', accuracy: 0.95 },
      { name: 'Vector Smash', power: 30, type: 'C++', accuracy: 0.85 },
      { name: 'Malloc Fortify', power: 0, heal: 35, type: 'Support', accuracy: 1.0 },
      { name: 'Kernel Blast', power: 42, type: 'C++', accuracy: 0.75 }
    ]
  }
];

// ---------------------------------------------------------------------------
// ENEMY BUGMON
// ---------------------------------------------------------------------------
const ENEMY_BUGMON = {
  id: 'bugmon',
  name: 'Bugmon',
  language: 'Bug/Glitch',
  maxHp: 130,
  hp: 130,
  attackPower: 1.0,
  spriteFront: 'assets/nullpointer.svg',
  spriteBack: 'assets/nullpointer.svg',
  description: 'A shadowy rogue syntax glitch that lurks uninitialized in unallocated memory.',
  typeColor: 'var(--pixel-red)',
  bugmonVariant: {
    name: 'Bug-Bugmon',
    sprite: 'assets/nullpointer.svg',
    maxHp: 195, // 1.5x normal (130 * 1.5)
    palette: {
      primary: '#e03c3c',
      secondary: '#9c27b0',
      dark: '#1f002b',
      glow: '#ff0055'
    }
  },
  moves: [
    { name: 'Segfault Slam', power: 26, type: 'Dark' },
    { name: 'Memory Leak', power: 32, type: 'Dark' },
    { name: 'Infinite Loop', power: 40, type: 'Dark' },
    { name: 'Undefined Crush', power: 48, type: 'Dark' }
  ]
};

// ---------------------------------------------------------------------------
// FALLBACK QUESTIONS POOL
// ---------------------------------------------------------------------------
const FALLBACK_QUESTIONS = [
  {
    id: 'q1',
    topic: 'Algorithms',
    question: 'What is the worst-case time complexity of standard Binary Search on a sorted array of size N?',
    options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'],
    answerIndex: 1,
    explanation: 'Binary search halves the search space with every comparison, leading to O(log N) worst-case time.'
  },
  {
    id: 'q2',
    topic: 'Data Structures',
    question: 'Which data structure operates on a Last-In, First-Out (LIFO) order?',
    options: ['Queue', 'Linked List', 'Stack', 'Min-Heap'],
    answerIndex: 2,
    explanation: 'A Stack strictly follows Last-In, First-Out (LIFO), such as call stacks and undo history.'
  },
  {
    id: 'q3',
    topic: 'Web Development',
    question: 'What does the HTTP 404 status code indicate?',
    options: ['Unauthorized', 'Bad Request', 'Server Error', 'Not Found'],
    answerIndex: 3,
    explanation: 'HTTP 404 indicates that the server cannot find the requested resource.'
  },
  {
    id: 'q4',
    topic: 'Object Oriented',
    question: 'Which OOP concept refers to restricting direct access to some of an object\'s components?',
    options: ['Encapsulation', 'Polymorphism', 'Inheritance', 'Compilation'],
    answerIndex: 0,
    explanation: 'Encapsulation bundles data with methods that operate on that data and hides internal details.'
  },
  {
    id: 'q5',
    topic: 'Database',
    question: 'In SQL, which clause is used to filter records resulting from a GROUP BY statement?',
    options: ['WHERE', 'HAVING', 'FILTER', 'ORDER BY'],
    answerIndex: 1,
    explanation: 'HAVING filters aggregated grouped results, whereas WHERE filters individual rows before grouping.'
  }
];

/**
 * Loads questions from data/questions.json.
 * If empty or unreachable, cleanly falls back to the curated questions array.
 */
async function loadQuestions() {
  try {
    const response = await fetch('data/questions.json');
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return FALLBACK_QUESTIONS;
  } catch (err) {
    console.info('Using fallback questions pool:', err.message);
    return FALLBACK_QUESTIONS;
  }
}

// Global namespace attachment for standard vanilla JS scripting
window.CODEMONS = CODEMONS;
window.ENEMY_BUGMON = ENEMY_BUGMON;

window.CodemonData = {
  CODEMONS,
  CODEMONS_LIST: CODEMONS,
  CODEMON_DEX: CODEMONS,
  ENEMY_BUGMON,
  FALLBACK_QUESTIONS,
  loadQuestions
};
