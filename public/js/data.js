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
      },
      description: 'A towering serpentine glitch dino with blazing syntax horns and an insatiable infinite recursion loop.',
      moves: [
        { name: 'Infinite Recursion', power: 18, type: 'Glitch' },
        { name: 'Stack Overflow Flame', power: 20, type: 'Glitch' },
        { name: 'Unhandled Exception', power: 16, type: 'Glitch' },
        { name: 'Race Condition Burn', power: 19, type: 'Glitch' },
        { name: 'Kernel Panic Pyro', power: 20, type: 'Glitch' },
        { name: 'Indentation Shock', power: 15, type: 'Glitch' },
        { name: 'Memory Spike Claws', power: 17, type: 'Glitch' },
        { name: 'Bytecode Corruption', power: 18, type: 'Glitch' }
      ]
    },
    moves: [
      { name: 'Indent Zap', power: 25, type: 'Python', accuracy: 0.95 },
      { name: 'List Slicing', power: 30, type: 'Python', accuracy: 0.90 },
      { name: 'Try/Except Shield', power: 0, heal: 25, type: 'Support', accuracy: 1.0 },
      { name: 'Async Bolt', power: 45, type: 'Python', accuracy: 0.80 },
      { name: 'Lambda Strike', power: 32, type: 'Python', accuracy: 0.90 },
      { name: 'List Comprehension', power: 38, type: 'Python', accuracy: 0.85 },
      { name: 'Generator Surge', power: 35, type: 'Python', accuracy: 0.90 },
      { name: 'GIL Overdrive', power: 48, type: 'Python', accuracy: 0.75 },
      { name: 'Decorator Blitz', power: 40, type: 'Python', accuracy: 0.85 },
      { name: 'Dunder Smash', power: 50, type: 'Python', accuracy: 0.70 }
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
      },
      description: 'An unhandled promise reaper shrouded in cyclic closures and spectral callback doom.',
      moves: [
        { name: 'Undefined Is Not A Function', power: 20, type: 'Glitch' },
        { name: 'Uncaught Promise Terror', power: 18, type: 'Glitch' },
        { name: 'Type Coercion Doom', power: 17, type: 'Glitch' },
        { name: 'Cyclic Dependency', power: 19, type: 'Glitch' },
        { name: 'Garbage Collector Feast', power: 16, type: 'Glitch' },
        { name: 'Call Stack Meltdown', power: 20, type: 'Glitch' },
        { name: 'Memory Leak Haunt', power: 18, type: 'Glitch' },
        { name: 'NaN Phantom Strike', power: 15, type: 'Glitch' }
      ]
    },
    moves: [
      { name: 'Promise Surge', power: 28, type: 'JavaScript', accuracy: 0.95 },
      { name: 'Event Loop', power: 34, type: 'JavaScript', accuracy: 0.85 },
      { name: 'Strict Mode', power: 0, heal: 20, type: 'Support', accuracy: 1.0 },
      { name: 'Callback Storm', power: 46, type: 'JavaScript', accuracy: 0.80 },
      { name: 'Prototype Pierce', power: 30, type: 'JavaScript', accuracy: 0.90 },
      { name: 'Destructure Jab', power: 33, type: 'JavaScript', accuracy: 0.88 },
      { name: 'V8 Ignition', power: 42, type: 'JavaScript', accuracy: 0.82 },
      { name: 'Closure Trap', power: 36, type: 'JavaScript', accuracy: 0.86 },
      { name: 'Async/Await Rush', power: 40, type: 'JavaScript', accuracy: 0.85 },
      { name: 'DOM Cataclysm', power: 52, type: 'JavaScript', accuracy: 0.70 }
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
      },
      description: 'A hulking behemoth of corrupted heap memory and jagged dangling-pointer claws.',
      moves: [
        { name: 'Dangling Pointer Jab', power: 17, type: 'Glitch' },
        { name: 'Segmentation Fault Slam', power: 20, type: 'Glitch' },
        { name: 'Double Free Devastation', power: 19, type: 'Glitch' },
        { name: 'Null Pointer Derelict', power: 18, type: 'Glitch' },
        { name: 'Memory Corruption Vine', power: 16, type: 'Glitch' },
        { name: 'Strict Aliasing Strike', power: 17, type: 'Glitch' },
        { name: 'Heap Spray Stampede', power: 20, type: 'Glitch' },
        { name: 'Buffer Overflow Crush', power: 19, type: 'Glitch' }
      ]
    },
    moves: [
      { name: 'Pointer Jab', power: 22, type: 'C++', accuracy: 0.95 },
      { name: 'Vector Smash', power: 30, type: 'C++', accuracy: 0.85 },
      { name: 'Malloc Fortify', power: 0, heal: 35, type: 'Support', accuracy: 1.0 },
      { name: 'Kernel Blast', power: 42, type: 'C++', accuracy: 0.75 },
      { name: 'Template Fusion', power: 36, type: 'C++', accuracy: 0.85 },
      { name: 'Destructor Crush', power: 44, type: 'C++', accuracy: 0.80 },
      { name: 'Const Ref Pierce', power: 28, type: 'C++', accuracy: 0.92 },
      { name: 'RAII Bulwark', power: 0, heal: 40, type: 'Support', accuracy: 1.0 },
      { name: 'Direct Memory Poke', power: 38, type: 'C++', accuracy: 0.85 },
      { name: 'Zero Overhead Slam', power: 50, type: 'C++', accuracy: 0.70 }
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
    },
    description: 'The prime anomaly: a rogue kernel glitch that consumes unallocated memory blocks.',
    moves: [
      { name: 'Fatal Segfault Apex', power: 20, type: 'Glitch' },
      { name: 'Kernel Panic Apocalypse', power: 20, type: 'Glitch' },
      { name: 'Heap Overrun Frenzy', power: 19, type: 'Glitch' },
      { name: 'Null Pointer Oblivion', power: 20, type: 'Glitch' },
      { name: 'Stack Corruption Nova', power: 19, type: 'Glitch' },
      { name: 'Out Of Bounds Devastation', power: 18, type: 'Glitch' },
      { name: 'Zombie Process Swarm', power: 17, type: 'Glitch' },
      { name: 'Hardware Interruption', power: 20, type: 'Glitch' }
    ]
  },
  moves: [
    { name: 'Segfault Slam', power: 20, type: 'Dark' },
    { name: 'Memory Leak Siphon', power: 18, type: 'Dark' },
    { name: 'Infinite Loop Trap', power: 19, type: 'Dark' },
    { name: 'Undefined Crush', power: 17, type: 'Dark' },
    { name: 'Core Dump Catastrophe', power: 20, type: 'Dark' },
    { name: 'Zero Day Exploit', power: 19, type: 'Dark' },
    { name: 'Byte Corruption Shock', power: 16, type: 'Dark' },
    { name: 'Bus Error Blast', power: 18, type: 'Dark' },
    { name: 'Kernel Trap Wave', power: 17, type: 'Dark' },
    { name: 'Deadlock Strangle', power: 20, type: 'Dark' }
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
