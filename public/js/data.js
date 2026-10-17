/**
 * Codemon Stats & Question Loader
 * Mirai-Game / CODAK Platform
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
  },
  {
    id: 'javagron',
    name: 'Javagron',
    language: 'Java',
    maxHp: 110,
    hp: 110,
    attackPower: 0.95,
    spriteFront: 'assets/javagron-front.svg',
    spriteBack: 'assets/javagron-back.svg',
    description: 'Enterprise-grade Java juggernaut with JVM memory shields and robust multithreaded defenses.',
    typeColor: 'var(--pixel-yellow)',
    bugmonVariant: {
      name: 'Bug-Javagron',
      sprite: 'assets/bug-javagron.svg',
      maxHp: 165,
      palette: {
        primary: '#e03c3c',
        secondary: '#9b51e0',
        dark: '#2a040d',
        glow: '#ea80fc'
      },
      description: 'A colossal corrupted JVM beast oozing memory leaks, heap churn, and infinite deadlock threads.',
      moves: [
        { name: 'OutOfMemoryError Core', power: 20, type: 'Glitch' },
        { name: 'ClassCastException Stomp', power: 18, type: 'Glitch' },
        { name: 'Deadlock Threadlock', power: 19, type: 'Glitch' },
        { name: 'PermGen Depletion', power: 17, type: 'Glitch' },
        { name: 'Garbage Collection Freeze', power: 20, type: 'Glitch' },
        { name: 'StackOverflow Spiral', power: 19, type: 'Glitch' },
        { name: 'ClassNotFound Catastrophe', power: 18, type: 'Glitch' },
        { name: 'Jar Hell Infestation', power: 17, type: 'Glitch' }
      ]
    },
    moves: [
      { name: 'JVM Thread Jab', power: 26, type: 'Java', accuracy: 0.95 },
      { name: 'Bytecode Blast', power: 32, type: 'Java', accuracy: 0.88 },
      { name: 'Garbage Collector Sweep', power: 0, heal: 30, type: 'Support', accuracy: 1.0 },
      { name: 'Spring Boot Surge', power: 44, type: 'Java', accuracy: 0.82 },
      { name: 'Polymorphic Slam', power: 36, type: 'Java', accuracy: 0.86 },
      { name: 'Abstract Factory Shield', power: 0, heal: 35, type: 'Support', accuracy: 1.0 },
      { name: 'Static Void Strike', power: 40, type: 'Java', accuracy: 0.85 },
      { name: 'Maven Package Crush', power: 35, type: 'Java', accuracy: 0.88 },
      { name: 'Synchronized Lock', power: 30, type: 'Java', accuracy: 0.90 },
      { name: 'NPE Ward Impact', power: 48, type: 'Java', accuracy: 0.75 }
    ]
  },
  {
    id: 'rubicorn',
    name: 'Rubicorn',
    language: 'Ruby',
    maxHp: 95,
    hp: 95,
    attackPower: 1.05,
    spriteFront: 'assets/rubicorn-front.svg',
    spriteBack: 'assets/rubicorn-back.svg',
    description: 'Dynamic Ruby unicorn with gem-forged horn strikes and elegant, expressive metaprogramming.',
    typeColor: 'var(--pixel-red)',
    bugmonVariant: {
      name: 'Bug-Rubicorn',
      sprite: 'assets/bug-rubicorn.svg',
      maxHp: 143,
      palette: {
        primary: '#d50000',
        secondary: '#9c27b0',
        dark: '#150308',
        glow: '#ff0055'
      },
      description: 'A savage crystal beast with shattered ruby gems, reckless monkey patching, and thread race conditions.',
      moves: [
        { name: 'Broken Gemfile Blight', power: 18, type: 'Glitch' },
        { name: 'NoMethodError Gore', power: 20, type: 'Glitch' },
        { name: 'Reckless Monkey Patch', power: 19, type: 'Glitch' },
        { name: 'Fiber Deadlock Vortex', power: 18, type: 'Glitch' },
        { name: 'Unbound Method Glitch', power: 17, type: 'Glitch' },
        { name: 'Global Interpreter Strife', power: 19, type: 'Glitch' },
        { name: 'YARD Doc Corruption', power: 16, type: 'Glitch' },
        { name: 'Migration Rollback Ruin', power: 20, type: 'Glitch' }
      ]
    },
    moves: [
      { name: 'Gem Piercer', power: 28, type: 'Ruby', accuracy: 0.95 },
      { name: 'Block Yield', power: 34, type: 'Ruby', accuracy: 0.88 },
      { name: 'Metaprogram Magic', power: 38, type: 'Ruby', accuracy: 0.85 },
      { name: 'ActiveRecord Cascade', power: 42, type: 'Ruby', accuracy: 0.82 },
      { name: 'Ruby on Rails Rush', power: 45, type: 'Ruby', accuracy: 0.80 },
      { name: 'Monkey Patch Mending', power: 0, heal: 28, type: 'Support', accuracy: 1.0 },
      { name: 'Symbol Splat', power: 32, type: 'Ruby', accuracy: 0.90 },
      { name: 'Duck Typing Dance', power: 30, type: 'Ruby', accuracy: 0.92 },
      { name: 'Enumerable Map Slam', power: 36, type: 'Ruby', accuracy: 0.86 },
      { name: 'Pry Debugger Pierce', power: 50, type: 'Ruby', accuracy: 0.72 }
    ]
  },
  {
    id: 'sqloph',
    name: 'Sqloph',
    language: 'SQL',
    maxHp: 115,
    hp: 115,
    attackPower: 0.92,
    spriteFront: 'assets/sqloph-front.svg',
    spriteBack: 'assets/sqloph-back.svg',
    description: 'Relational database titan armored in immutable schema tables, ACID transactions, and indexed query cannons.',
    typeColor: 'var(--pixel-blue)',
    bugmonVariant: {
      name: 'Bug-Sqloph',
      sprite: 'assets/bug-sqloph.svg',
      maxHp: 173,
      palette: {
        primary: '#c62828',
        secondary: '#7b1fa2',
        dark: '#150308',
        glow: '#ff1744'
      },
      description: 'A fractured monolith of corrupted schemas, unindexed table scans, and catastrophic SQL injection voids.',
      moves: [
        { name: 'SQL Injection Nova', power: 20, type: 'Glitch' },
        { name: 'Corrupt Primary Key', power: 19, type: 'Glitch' },
        { name: 'Deadlock Lock Escalation', power: 20, type: 'Glitch' },
        { name: 'Full Table Scan Quake', power: 18, type: 'Glitch' },
        { name: 'Database Connection Exhaust', power: 19, type: 'Glitch' },
        { name: 'Orphaned Foreign Key', power: 17, type: 'Glitch' },
        { name: 'Transaction Timeout', power: 18, type: 'Glitch' },
        { name: 'Corrupt WAL Log Blast', power: 20, type: 'Glitch' }
      ]
    },
    moves: [
      { name: 'Select All Strike', power: 24, type: 'SQL', accuracy: 0.95 },
      { name: 'Inner Join Blast', power: 32, type: 'SQL', accuracy: 0.88 },
      { name: 'B-Tree Index Rush', power: 35, type: 'SQL', accuracy: 0.85 },
      { name: 'ACID Rollback Barrier', power: 0, heal: 35, type: 'Support', accuracy: 1.0 },
      { name: 'Partition Prune', power: 38, type: 'SQL', accuracy: 0.85 },
      { name: 'Foreign Key Bind', power: 30, type: 'SQL', accuracy: 0.90 },
      { name: 'Group By Aggregation', power: 42, type: 'SQL', accuracy: 0.82 },
      { name: 'Transaction Commit', power: 0, heal: 40, type: 'Support', accuracy: 1.0 },
      { name: 'Query Optimizer Laser', power: 46, type: 'SQL', accuracy: 0.78 },
      { name: 'Drop Table Cataclysm', power: 52, type: 'SQL', accuracy: 0.70 }
    ]
  }
];

// ---------------------------------------------------------------------------
// DEDICATED ERROR ENEMIES (Error Names & Numbers)
// ---------------------------------------------------------------------------
const ENEMY_CHARACTERS = [
  {
    id: 'error_404',
    name: 'Error 404',
    language: 'HTTP 404',
    maxHp: 115,
    hp: 115,
    attackPower: 1.05,
    spriteFront: 'assets/enemy-404.svg',
    spriteBack: 'assets/enemy-404.svg',
    description: 'A phantom glitch stalker that dissolves into the digital void, leaving only missing routes and broken links.',
    typeColor: 'var(--pixel-blue)',
    bugmonVariant: {
      name: 'Bug-404',
      sprite: 'assets/enemy-404.svg',
      maxHp: 172,
      palette: { primary: '#ff1744', secondary: '#9c27b0', dark: '#150308', glow: '#ff0055' },
      description: 'The void anomaly: an absolute 404 breakdown that erases memory coordinates from existence.',
      moves: [
        { name: 'Total Route Oblivion', power: 20, type: 'Glitch' },
        { name: 'Hyperlink Sever', power: 19, type: 'Glitch' },
        { name: 'Null Response Void', power: 20, type: 'Glitch' },
        { name: 'DNS Blackhole Pull', power: 18, type: 'Glitch' },
        { name: 'Zero Bytes Transferred', power: 19, type: 'Glitch' },
        { name: 'Connection Reset Peer', power: 18, type: 'Glitch' },
        { name: 'Stateless Horror', power: 17, type: 'Glitch' },
        { name: 'Broken Gateway Apocalypse', power: 20, type: 'Glitch' }
      ]
    },
    moves: [
      { name: 'Route Not Found', power: 18, type: 'Error' },
      { name: 'Broken Hyperlink', power: 16, type: 'Error' },
      { name: 'Phantom Request', power: 19, type: 'Error' },
      { name: 'Null Payload', power: 17, type: 'Error' },
      { name: 'DNS Blackhole', power: 20, type: 'Error' },
      { name: 'Dead Link Slash', power: 18, type: 'Error' },
      { name: 'Vanishing Endpoint', power: 19, type: 'Error' },
      { name: '404 Wipeout', power: 20, type: 'Error' }
    ]
  },
  {
    id: 'syntax_error',
    name: 'Syntax Error',
    language: 'Syntax Error',
    maxHp: 120,
    hp: 120,
    attackPower: 1.1,
    spriteFront: 'assets/enemy-syntax.svg',
    spriteBack: 'assets/enemy-syntax.svg',
    description: 'A jagged anomaly of misplaced tokens, unclosed parentheses, and parsing chaos that tears code apart.',
    typeColor: 'var(--pixel-red)',
    bugmonVariant: {
      name: 'Bug-Syntax',
      sprite: 'assets/enemy-syntax.svg',
      maxHp: 180,
      palette: { primary: '#e03c3c', secondary: '#7b1fa2', dark: '#2a040d', glow: '#ea80fc' },
      description: 'A rogue AST parser demon that chews through tokens and emits violent compile-time screams.',
      moves: [
        { name: 'Catastrophic Parse Fail', power: 20, type: 'Glitch' },
        { name: 'Token Stream Corruption', power: 19, type: 'Glitch' },
        { name: 'Mismatched Brace Carnage', power: 20, type: 'Glitch' },
        { name: 'Lexical Grammar Shred', power: 18, type: 'Glitch' },
        { name: 'Unterminated String Ripper', power: 19, type: 'Glitch' },
        { name: 'Indentation Cataclysm', power: 17, type: 'Glitch' },
        { name: 'Semicolon Desolation', power: 18, type: 'Glitch' },
        { name: 'Abstract Tree Shatter', power: 20, type: 'Glitch' }
      ]
    },
    moves: [
      { name: 'Unexpected Token <', power: 19, type: 'Error' },
      { name: 'Missing Semicolon', power: 18, type: 'Error' },
      { name: 'Unclosed Parenthesis', power: 20, type: 'Error' },
      { name: 'Indentation Mismatch', power: 16, type: 'Error' },
      { name: 'Malformed Expression', power: 19, type: 'Error' },
      { name: 'Token Shredder', power: 20, type: 'Error' },
      { name: 'Parse Tree Collapse', power: 18, type: 'Error' },
      { name: 'Grammar Rupture', power: 19, type: 'Error' }
    ]
  },
  {
    id: 'error_500',
    name: 'Error 500',
    language: 'HTTP 500',
    maxHp: 135,
    hp: 135,
    attackPower: 1.15,
    spriteFront: 'assets/enemy-500.svg',
    spriteBack: 'assets/enemy-500.svg',
    description: 'A molten core of catastrophic server meltdowns, unhandled backend panics, and gateway collapse.',
    typeColor: 'var(--pixel-red)',
    bugmonVariant: {
      name: 'Bug-500',
      sprite: 'assets/enemy-500.svg',
      maxHp: 200,
      palette: { primary: '#d50000', secondary: '#4a148c', dark: '#150308', glow: '#ff1744' },
      description: 'A critical reactor failure: an unrecoverable 500 server inferno that incinerates cloud clusters.',
      moves: [
        { name: 'Cluster Meltdown Nova', power: 20, type: 'Glitch' },
        { name: 'Process Exit Code 137', power: 20, type: 'Glitch' },
        { name: 'OOM Killer Stampede', power: 19, type: 'Glitch' },
        { name: 'Gateway Collapse 504', power: 19, type: 'Glitch' },
        { name: 'Unhandled Panic Cascade', power: 20, type: 'Glitch' },
        { name: 'Server Room Inferno', power: 18, type: 'Glitch' },
        { name: 'Cloud Region Evaporation', power: 20, type: 'Glitch' },
        { name: 'Hard Reboot Shockwave', power: 19, type: 'Glitch' }
      ]
    },
    moves: [
      { name: 'Internal Meltdown', power: 20, type: 'Error' },
      { name: 'Gateway Timeout 504', power: 19, type: 'Error' },
      { name: 'Bad Gateway 502', power: 18, type: 'Error' },
      { name: 'Service Unavailable 503', power: 20, type: 'Error' },
      { name: 'Backend Crash Wave', power: 19, type: 'Error' },
      { name: 'Unhandled Runtime Spike', power: 18, type: 'Error' },
      { name: 'Process Exit 1', power: 20, type: 'Error' },
      { name: 'Catastrophic Failover', power: 19, type: 'Error' }
    ]
  },
  {
    id: 'null_pointer',
    name: 'Null Pointer',
    language: 'Null Pointer',
    maxHp: 110,
    hp: 110,
    attackPower: 1.1,
    spriteFront: 'assets/nullpointer.svg',
    spriteBack: 'assets/nullpointer.svg',
    description: 'A hollow spectre that feeds on uninitialized memory and dereferences objects into nothingness.',
    typeColor: 'var(--pixel-yellow)',
    bugmonVariant: {
      name: 'Bug-NullPointer',
      sprite: 'assets/nullpointer.svg',
      maxHp: 165,
      palette: { primary: '#9c27b0', secondary: '#e03c3c', dark: '#1f002b', glow: '#ff0055' },
      description: 'The void phantom that unlinks memory addresses and leaves raw memory completely hollow.',
      moves: [
        { name: 'Null Pointer Oblivion', power: 20, type: 'Glitch' },
        { name: 'Zero Memory Absorption', power: 19, type: 'Glitch' },
        { name: 'Uninitialized Dread', power: 18, type: 'Glitch' },
        { name: 'Hollow Reference Claws', power: 20, type: 'Glitch' },
        { name: 'Segmentation Sever', power: 19, type: 'Glitch' },
        { name: 'Dangling Memory Haunt', power: 18, type: 'Glitch' },
        { name: 'Invalid Address Warp', power: 20, type: 'Glitch' },
        { name: 'Total Void Nullification', power: 20, type: 'Glitch' }
      ]
    },
    moves: [
      { name: 'Null Dereference', power: 20, type: 'Error' },
      { name: 'Void Gaze', power: 17, type: 'Error' },
      { name: 'Undefined Invocation', power: 19, type: 'Error' },
      { name: 'Zero Address Strike', power: 18, type: 'Error' },
      { name: 'Segmentation Rip', power: 20, type: 'Error' },
      { name: 'Dangling Hook', power: 18, type: 'Error' },
      { name: 'Unchecked Optional', power: 17, type: 'Error' },
      { name: 'Absolute Zero Null', power: 20, type: 'Error' }
    ]
  },
  {
    id: 'stack_overflow',
    name: 'Stack Overflow',
    language: 'Stack Overflow',
    maxHp: 125,
    hp: 125,
    attackPower: 1.2,
    spriteFront: 'assets/enemy-overflow.svg',
    spriteBack: 'assets/enemy-overflow.svg',
    description: 'An endless vortex of self-calling recursion that exhausts the call stack until memory shatters.',
    typeColor: 'var(--pixel-yellow)',
    bugmonVariant: {
      name: 'Bug-StackOverflow',
      sprite: 'assets/enemy-overflow.svg',
      maxHp: 188,
      palette: { primary: '#ea80fc', secondary: '#d50000', dark: '#260033', glow: '#ff1744' },
      description: 'A bottomless recursive whirlpool that devours stack frames with zero base cases.',
      moves: [
        { name: 'Call Stack Collapse Nova', power: 20, type: 'Glitch' },
        { name: 'Infinite Frame Swarm', power: 19, type: 'Glitch' },
        { name: 'Base Case Obliteration', power: 20, type: 'Glitch' },
        { name: 'Memory Exhaust Whirlwind', power: 19, type: 'Glitch' },
        { name: 'Recursive Singularity', power: 20, type: 'Glitch' },
        { name: 'Execution Thread Crush', power: 18, type: 'Glitch' },
        { name: 'Tail Call Annihilation', power: 19, type: 'Glitch' },
        { name: 'Depth Exceeded Apocalypse', power: 20, type: 'Glitch' }
      ]
    },
    moves: [
      { name: 'Infinite Recursion', power: 20, type: 'Error' },
      { name: 'Frame Depletion', power: 19, type: 'Error' },
      { name: 'Base Case Forgotten', power: 20, type: 'Error' },
      { name: 'Call Stack Blast', power: 18, type: 'Error' },
      { name: 'Maximum Depth Exceeded', power: 20, type: 'Error' },
      { name: 'Recursive Whirlpool', power: 19, type: 'Error' },
      { name: 'Memory Saturation', power: 18, type: 'Error' },
      { name: 'Stack Tear Claws', power: 20, type: 'Error' }
    ]
  }
];

// ---------------------------------------------------------------------------
// ENEMY BUGMON (Classic Prime Rogue Glitch)
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
window.ENEMY_CHARACTERS = ENEMY_CHARACTERS;

window.CodemonData = {
  CODEMONS,
  CODEMONS_LIST: CODEMONS,
  CODEMON_DEX: CODEMONS,
  ENEMY_BUGMON,
  ENEMY_CHARACTERS,
  FALLBACK_QUESTIONS,
  loadQuestions
};
