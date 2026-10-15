/**
 * Battle Scene Engine & Visuals Module
 * Mirai-Game / Gamify Platform
 * 
 * Implements 160x144 Canvas visual rendering, pixel-grid sprite arrays,
 * HP bar animations, typewriter dialogue, points system, and win/lose conditions.
 */

// ===========================================================================
// BATTLE CONFIGURATION (Easily tweakable parameters)
// ===========================================================================
const BATTLE_CONFIG = {
  turnLimit: 8,
  minPoints: 120,
  points: {
    easy: 10,
    medium: 25,
    hard: 50
  }
};

if (typeof window !== 'undefined') {
  window.BATTLE_CONFIG = BATTLE_CONFIG;
}

// ---------------------------------------------------------------------------
// 1. GAME BOY COLOR PALETTE MAPPING FOR SPRITE ARRAYS
// ---------------------------------------------------------------------------
const SPRITE_PALETTE = [
  'transparent', // 0: Transparent
  '#0c1015',     // 1: gb-darkest
  '#1b2632',     // 2: gb-dark
  '#2c3e50',     // 3: gb-mid
  '#526f8a',     // 4: gb-light
  '#eef5fc',     // 5: gb-lightest
  '#38b764',     // 6: gb-green
  '#206d39',     // 7: gb-green-dark
  '#f4b41b',     // 8: gb-yellow
  '#9f7209',     // 9: gb-yellow-dark
  '#e03c3c',     // 10: gb-red
  '#941e1e',     // 11: gb-red-dark
  '#38bdf8',     // 12: gb-blue
  '#1e40af'      // 13: gb-blue-dark
];

// ---------------------------------------------------------------------------
// 2. 16x16 PIXEL SPRITE GRIDS (Editable arrays of palette indexes)
// ---------------------------------------------------------------------------

// Bugmon Enemy (Front View): Rogue Glitch Spectre with Red Core & Glowing Optics
const SPRITE_BUGMON_FRONT = [
  [0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0],
  [0, 0, 10, 1, 10, 0, 0, 0, 0, 0, 0, 10, 1, 10, 0, 0],
  [0, 0, 0, 10, 1, 10, 0, 0, 0, 0, 10, 1, 10, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 10, 10, 10, 10, 10, 10, 10, 10, 1, 0, 0, 0],
  [0, 0, 1, 10, 5, 5, 10, 10, 10, 5, 5, 10, 1, 0, 0],
  [0, 0, 1, 10, 5, 1, 10, 10, 10, 5, 1, 10, 1, 0, 0],
  [0, 1, 1, 10, 10, 10, 8, 8, 10, 10, 10, 10, 1, 1, 0],
  [1, 10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10, 1],
  [1, 10, 1, 10, 10, 10, 10, 10, 10, 10, 10, 1, 10, 1],
  [0, 1, 1, 10, 1, 10, 1, 1, 10, 1, 10, 1, 1, 0],
  [0, 0, 1, 10, 10, 10, 10, 10, 10, 10, 10, 1, 0, 0],
  [0, 0, 0, 1, 10, 10, 10, 10, 10, 10, 1, 0, 0, 0],
  [0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0],
  [0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0],
  [1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1]
];

// Pyrawr Player (Back View): Python Yellow / Blue Crest & Armored Spine
const SPRITE_PYRAWR_BACK = [
  [0, 0, 0, 0, 8, 8, 0, 0, 0, 0, 12, 12, 0, 0, 0, 0],
  [0, 0, 0, 8, 8, 8, 8, 0, 0, 12, 12, 12, 12, 0, 0, 0],
  [0, 0, 0, 8, 1, 8, 8, 0, 0, 12, 1, 12, 12, 0, 0, 0],
  [0, 0, 0, 0, 8, 8, 8, 8, 12, 12, 12, 12, 0, 0, 0, 0],
  [0, 0, 0, 1, 8, 8, 8, 8, 12, 12, 12, 12, 1, 0, 0, 0],
  [0, 0, 1, 8, 8, 8, 12, 12, 12, 12, 12, 12, 1, 0, 0],
  [0, 0, 1, 8, 8, 12, 1, 1, 12, 12, 12, 12, 1, 0, 0],
  [0, 1, 8, 8, 12, 12, 1, 1, 12, 12, 12, 12, 1, 0],
  [0, 1, 8, 8, 12, 12, 12, 12, 12, 12, 13, 13, 1, 0],
  [0, 1, 8, 12, 12, 12, 1, 1, 12, 13, 13, 13, 1, 0],
  [0, 1, 12, 12, 12, 12, 1, 1, 13, 13, 13, 13, 1, 0],
  [0, 0, 1, 12, 12, 13, 13, 13, 13, 13, 13, 1, 0, 0],
  [0, 0, 1, 13, 13, 13, 13, 13, 13, 13, 13, 1, 0, 0],
  [0, 1, 0, 1, 13, 13, 0, 0, 13, 13, 1, 0, 1, 0],
  [0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0],
  [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1]
];

// Jaskull Player (Back View): JavaScript Amber Ghost Skull & Energy Trails
const SPRITE_JASKULL_BACK = [
  [0, 0, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0, 8, 8, 0, 0],
  [0, 0, 0, 8, 8, 0, 0, 0, 0, 0, 0, 8, 8, 0, 0, 0],
  [0, 0, 0, 0, 8, 8, 0, 0, 0, 0, 8, 8, 0, 0, 0, 0],
  [0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0],
  [0, 0, 1, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 1, 0, 0],
  [0, 1, 5, 5, 5, 5, 4, 4, 4, 5, 5, 5, 5, 1, 0],
  [0, 1, 5, 5, 5, 4, 4, 4, 4, 4, 5, 5, 5, 1, 0],
  [0, 1, 5, 5, 5, 4, 4, 1, 4, 4, 5, 5, 5, 1, 0],
  [0, 1, 5, 5, 5, 5, 4, 4, 4, 5, 5, 5, 5, 1, 0],
  [0, 0, 1, 5, 5, 5, 5, 5, 5, 5, 5, 5, 1, 0, 0],
  [0, 0, 0, 1, 5, 1, 5, 1, 5, 1, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 1, 0, 0, 0],
  [0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 1, 0, 0],
  [0, 1, 8, 8, 0, 8, 8, 8, 8, 0, 8, 8, 1, 0],
  [0, 1, 8, 0, 0, 0, 8, 8, 0, 0, 0, 8, 1, 0],
  [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0]
];

// Cplusaur Player (Back View): C++ Steel-Blue Heavy Armor & Pointer Crest
const SPRITE_CPLUSAUR_BACK = [
  [0, 0, 0, 0, 0, 0, 12, 12, 12, 12, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 12, 12, 12, 12, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 12, 12, 12, 12, 12, 12, 12, 12, 0, 0, 0, 0],
  [0, 0, 0, 0, 12, 12, 12, 12, 12, 12, 12, 12, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0],
  [0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0],
  [0, 1, 3, 3, 12, 12, 3, 3, 12, 12, 3, 3, 3, 1, 0],
  [0, 1, 3, 12, 12, 12, 12, 12, 12, 12, 12, 3, 3, 1, 0],
  [0, 1, 3, 12, 12, 1, 12, 12, 1, 12, 12, 3, 3, 1, 0],
  [0, 1, 3, 3, 12, 12, 12, 12, 12, 12, 3, 3, 3, 1, 0],
  [0, 1, 3, 3, 3, 3, 12, 12, 3, 3, 3, 3, 3, 1, 0],
  [0, 0, 1, 2, 2, 3, 3, 3, 3, 2, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
  [0, 1, 4, 4, 1, 0, 0, 0, 0, 1, 4, 4, 1, 0],
  [0, 1, 4, 4, 1, 0, 0, 0, 0, 1, 4, 4, 1, 0],
  [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0]
];

// Helper to draw a pixel sprite from an array
function drawPixelSprite(ctx, grid, startX, startY, pixelSize = 2) {
  if (!ctx || !grid || !grid.length) return;
  const rows = grid.length;
  for (let r = 0; r < rows; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      const colorIdx = row[c];
      if (colorIdx > 0 && SPRITE_PALETTE[colorIdx]) {
        ctx.fillStyle = SPRITE_PALETTE[colorIdx];
        ctx.fillRect(
          Math.floor(startX + c * pixelSize),
          Math.floor(startY + r * pixelSize),
          pixelSize,
          pixelSize
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3. BATTLE VISUAL STATE & ANIMATION ENGINE
// ---------------------------------------------------------------------------
const battleVisualState = {
  // HP State with smooth animated transitions
  hp: {
    player: { current: 100, target: 100, max: 100, display: 100 },
    enemy:  { current: 130, target: 130, max: 130, display: 130 }
  },

  // HUD Stats
  points: 0,
  maxPoints: BATTLE_CONFIG.minPoints,
  turnsLeft: BATTLE_CONFIG.turnLimit,
  isGlitching: false,

  // Animation offsets & effects
  player: {
    offsetX: 0,
    offsetY: 0,
    visible: true,
    flashTick: 0
  },
  enemy: {
    offsetX: 0,
    offsetY: 0,
    visible: true,
    flashTick: 0
  },
  screenShake: {
    x: 0,
    y: 0,
    duration: 0
  }
};

// ---------------------------------------------------------------------------
// 4. TYPEWRITER FUNCTION: typeText(message, speed) & showMessage(text)
// ---------------------------------------------------------------------------
let typewriterTimer = null;
let activeTypewriterResolve = null;

function typeText(message, speed = 24) {
  return new Promise((resolve) => {
    const dialogueBox = document.getElementById('battle-dialogue-overlay');
    const textEl = document.getElementById('battle-dialogue-text');

    if (dialogueBox) {
      dialogueBox.classList.add('active');
      // Click on dialogue box instantly completes typing
      dialogueBox.onclick = () => {
        if (typewriterTimer) {
          clearInterval(typewriterTimer);
          typewriterTimer = null;
          if (textEl) textEl.textContent = message;
          if (activeTypewriterResolve) {
            const res = activeTypewriterResolve;
            activeTypewriterResolve = null;
            res();
          }
        }
      };
    }

    if (!textEl) {
      resolve();
      return;
    }

    // Clear any previous typewriter job
    if (typewriterTimer) {
      clearInterval(typewriterTimer);
      typewriterTimer = null;
    }
    if (activeTypewriterResolve) {
      activeTypewriterResolve();
      activeTypewriterResolve = null;
    }

    activeTypewriterResolve = resolve;
    textEl.textContent = '';
    let idx = 0;

    typewriterTimer = setInterval(() => {
      if (idx < message.length) {
        textEl.textContent += message[idx];
        idx++;
      } else {
        clearInterval(typewriterTimer);
        typewriterTimer = null;
        activeTypewriterResolve = null;
        resolve();
      }
    }, speed);
  });
}

function showMessage(text) {
  return typeText(text);
}

// ---------------------------------------------------------------------------
// 5. HP BARS & setHp(target, current, max) WITH SMOOTH ANIMATION
// ---------------------------------------------------------------------------
function setHp(target, current, max, immediate = false) {
  return new Promise((resolve) => {
    const key = (target === 'player' || target === 'enemy') ? target : 'player';
    const hp = battleVisualState.hp[key];
    
    if (typeof max === 'number' && max > 0) {
      hp.max = max;
    }
    hp.target = Math.max(0, Math.min(current, hp.max));

    if (immediate) {
      hp.current = hp.target;
      hp.display = hp.target;
      resolve();
      return;
    }

    // Update global gameState if present
    if (window.gameState) {
      if (key === 'player' && window.gameState.player) {
        window.gameState.player.hp = hp.target;
        window.gameState.player.maxHp = hp.max;
      } else if (key === 'enemy' && window.gameState.enemy) {
        window.gameState.enemy.hp = hp.target;
        window.gameState.enemy.maxHp = hp.max;
      }
    }

    // Wait until display catches up to target
    let safetyCounter = 0;
    const checkInterval = setInterval(() => {
      safetyCounter++;
      const diff = hp.target - hp.display;
      if (Math.abs(diff) > 0.4) {
        hp.display += diff * 0.25;
      }
      if (Math.abs(hp.display - hp.target) < 0.5 || safetyCounter > 25) {
        hp.display = hp.target;
        hp.current = hp.target;
        clearInterval(checkInterval);
        resolve();
      }
    }, 30);
  });
}

// Helper to determine HP bar color strictly using Game Boy Palette
function getHpColor(percentage) {
  if (percentage > 0.50) {
    return '#38b764'; // High: --gb-green
  } else if (percentage >= 0.20) {
    return '#f4b41b'; // Medium: --gb-yellow
  } else {
    return '#e03c3c'; // Low: --gb-red
  }
}

// ---------------------------------------------------------------------------
// 6. HUD STRIP UPDATE: POINTS & TURNS LEFT
// ---------------------------------------------------------------------------
function updateHud(points, turnsLeft) {
  const minPts = (typeof BATTLE_CONFIG !== 'undefined' && BATTLE_CONFIG.minPoints) || 120;

  if (typeof points === 'number') {
    const prevPoints = battleVisualState.points;
    battleVisualState.points = points;
    const ptsEl = document.getElementById('hud-points-val');
    if (ptsEl) {
      ptsEl.textContent = `${points} / ${minPts}`;

      // Pop animation on points update
      if (points !== prevPoints) {
        ptsEl.classList.remove('hud-pop');
        void ptsEl.offsetWidth; // Force DOM reflow to restart CSS animation
        ptsEl.classList.add('hud-pop');
      }
    }

    // Thin progress bar under HUD points showing progress toward minimum (120)
    const barFill = document.getElementById('hud-points-bar-fill');
    if (barFill) {
      const pct = Math.min(100, Math.round((points / minPts) * 100));
      barFill.style.width = `${pct}%`;
      if (points >= minPts) {
        barFill.classList.add('target-reached');
      } else {
        barFill.classList.remove('target-reached');
      }
    }

    if (window.gameState) {
      window.gameState.score = points;
    }
  }

  if (typeof turnsLeft === 'number') {
    battleVisualState.turnsLeft = turnsLeft;
    const turnsEl = document.getElementById('hud-turns-val');
    if (turnsEl) {
      turnsEl.textContent = `${turnsLeft}`;
      // When 2 turns remain, make the counter blink red as a warning
      if (turnsLeft <= 2) {
        turnsEl.className = 'turn-blink-red font-pixel';
        if (turnsEl.classList && turnsEl.classList.add) {
          turnsEl.classList.add('turn-blink-red');
        }
      } else if (turnsLeft <= 4) {
        turnsEl.className = 'text-yellow font-pixel';
        if (turnsEl.classList && turnsEl.classList.remove) {
          turnsEl.classList.remove('turn-blink-red');
        }
      } else {
        turnsEl.className = 'text-green font-pixel';
        if (turnsEl.classList && turnsEl.classList.remove) {
          turnsEl.classList.remove('turn-blink-red');
        }
      }
    }
    if (window.gameState) {
      window.gameState.turnsLeft = turnsLeft;
    }
  }
}

// ---------------------------------------------------------------------------
// 7. ATTACK & HIT ANIMATIONS
// ---------------------------------------------------------------------------

/**
 * playAttackAnimation(attacker)
 * Lunges the attacking codemon forward and snaps back
 */
function playAttackAnimation(attacker) {
  if (window.playSound) {
    window.playSound('battle');
  }

  return new Promise((resolve) => {
    const isPlayer = attacker === 'player';
    const targetObj = isPlayer ? battleVisualState.player : battleVisualState.enemy;
    const dirX = isPlayer ? 14 : -14;
    const dirY = isPlayer ? -8 : 8;

    const startTime = performance.now();
    const duration = 280; // ms

    function animateAttack(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      if (progress < 0.4) {
        // Lunge forward
        const subP = progress / 0.4;
        targetObj.offsetX = dirX * subP;
        targetObj.offsetY = dirY * subP;
      } else if (progress < 0.7) {
        // Strike hold
        targetObj.offsetX = dirX;
        targetObj.offsetY = dirY;
      } else {
        // Return to base position
        const subP = (progress - 0.7) / 0.3;
        targetObj.offsetX = dirX * (1 - subP);
        targetObj.offsetY = dirY * (1 - subP);
      }

      if (progress < 1) {
        requestAnimationFrame(animateAttack);
      } else {
        targetObj.offsetX = 0;
        targetObj.offsetY = 0;
        resolve();
      }
    }

    requestAnimationFrame(animateAttack);
  });
}

/**
 * playHitAnimation(target)
 * Shakes target codemon and flashes visibility + triggers screen shake
 */
function playHitAnimation(target) {
  if (window.playSound) {
    window.playSound('hit');
  }

  return new Promise((resolve) => {
    const isPlayer = target === 'player';
    const targetObj = isPlayer ? battleVisualState.player : battleVisualState.enemy;

    const startTime = performance.now();
    const duration = 380; // ms

    function animateHit(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      if (progress < 1) {
        // Rapid flash toggle
        targetObj.visible = Math.floor(elapsed / 45) % 2 === 0;

        // Violent horizontal jitter
        targetObj.offsetX = (Math.random() - 0.5) * 6;
        targetObj.offsetY = (Math.random() - 0.5) * 2;

        // Screen shake
        battleVisualState.screenShake.x = (Math.random() - 0.5) * 4;
        battleVisualState.screenShake.y = (Math.random() - 0.5) * 2;

        requestAnimationFrame(animateHit);
      } else {
        targetObj.visible = true;
        targetObj.offsetX = 0;
        targetObj.offsetY = 0;
        battleVisualState.screenShake.x = 0;
        battleVisualState.screenShake.y = 0;
        resolve();
      }
    }

    requestAnimationFrame(animateHit);
  });
}

// ---------------------------------------------------------------------------
// 8. 160x144 CANVAS BATTLE SCENE RENDERER
// ---------------------------------------------------------------------------
function renderBattleScene(ctx, animTick = 0) {
  if (!ctx) return;

  const width = 160;
  const height = 144;

  // Apply screen shake offset
  const shakeX = Math.round(battleVisualState.screenShake.x);
  const shakeY = Math.round(battleVisualState.screenShake.y);

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Smoothly interpolate HP bars
  ['player', 'enemy'].forEach((key) => {
    const hp = battleVisualState.hp[key];
    const diff = hp.target - hp.display;
    if (Math.abs(diff) > 0.3) {
      hp.display += diff * 0.14;
    } else {
      hp.display = hp.target;
    }
  });

  // 1. Cyber Arena Upper Backdrop (y: 0 to 58)
  ctx.fillStyle = '#0c1015'; // --gb-darkest
  ctx.fillRect(0, 0, width, 58);

  // Matrix horizontal grid scanlines
  ctx.fillStyle = '#1b2632'; // --gb-dark
  for (let y = 6; y < 58; y += 8) {
    ctx.fillRect(0, y, width, 1);
  }
  // Matrix vertical grid lines
  for (let x = 16; x < width; x += 24) {
    ctx.fillRect(x, 0, 1, 58);
  }

  // Horizon Divider
  ctx.fillStyle = '#2c3e50'; // --gb-mid
  ctx.fillRect(0, 58, width, 2);

  // 2. "Code Grid" Perspective Floor (y: 60 to 144)
  ctx.fillStyle = '#1b2632'; // --gb-dark
  ctx.fillRect(0, 60, width, 84);

  // Perspective horizontal lines (narrower near horizon, wider near bottom)
  const horizLines = [64, 71, 80, 91, 104, 120, 138];
  ctx.fillStyle = '#2c3e50';
  horizLines.forEach((hy) => {
    ctx.fillRect(0, hy, width, 1);
  });

  // Perspective angled matrix columns
  const floorCols = [-20, 10, 40, 70, 100, 130, 160, 190];
  floorCols.forEach((cx) => {
    ctx.beginPath();
    ctx.moveTo(cx, 60);
    ctx.lineTo(cx + (cx - 80) * 0.8, 144);
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // 3. Cyber Battle Podiums (Drawn with filled rectangles)
  // Enemy Platform (Top-Right: x: 92 to 154, y: 52 to 62)
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(92, 54, 62, 8);
  ctx.fillStyle = '#1b2632';
  ctx.fillRect(94, 55, 58, 6);
  ctx.fillStyle = '#38bdf8'; // Cyan cyber edge
  ctx.fillRect(96, 56, 54, 2);

  // Player Platform (Bottom-Left: x: 8 to 74, y: 104 to 118)
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(8, 106, 66, 12);
  ctx.fillStyle = '#1b2632';
  ctx.fillRect(10, 108, 62, 8);
  ctx.fillStyle = '#38b764'; // Green cyber edge
  ctx.fillRect(12, 109, 58, 2);

  // -------------------------------------------------------------------------
  // 4. TOP-LEFT: ENEMY INFO BOX
  // -------------------------------------------------------------------------
  const enemy = (window.gameState && window.gameState.enemy) || {
    name: 'BUGMON',
    maxHp: 130
  };
  const enemyHp = battleVisualState.hp.enemy;
  const enemyHpPct = Math.max(0, enemyHp.display / enemyHp.max);

  // Outer border & fill
  ctx.fillStyle = '#0c1015';
  ctx.fillRect(5, 6, 80, 26);
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(6, 7, 78, 24);
  ctx.fillStyle = '#1b2632';
  ctx.fillRect(8, 9, 74, 20);

  // Enemy Name & LV
  ctx.fillStyle = '#eef5fc';
  ctx.font = '6px monospace';
  ctx.fillText(enemy.name.toUpperCase().substring(0, 8), 11, 16);

  ctx.fillStyle = '#f4b41b';
  ctx.fillText('LV 5', 64, 16);

  // Enemy HP Bar
  ctx.fillStyle = '#0c1015';
  ctx.fillRect(11, 19, 68, 6);
  ctx.fillStyle = '#f4b41b';
  ctx.font = '5px monospace';
  ctx.fillText('HP', 13, 24);

  // Bar groove
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(23, 20, 54, 4);

  // Bar fill
  const enemyFillW = Math.max(0, Math.min(54, Math.round(54 * enemyHpPct)));
  ctx.fillStyle = getHpColor(enemyHpPct);
  ctx.fillRect(23, 20, enemyFillW, 4);

  // -------------------------------------------------------------------------
  // 5. TOP-RIGHT: ENEMY CODEMON SPRITE (16x16 Pixel Grid Array)
  // -------------------------------------------------------------------------
  if (battleVisualState.enemy.visible) {
    const enemyBob = Math.sin(animTick * 0.08) * 2;
    const enemyX = 110 + battleVisualState.enemy.offsetX;
    const enemyY = 24 + enemyBob + battleVisualState.enemy.offsetY;

    drawPixelSprite(ctx, SPRITE_BUGMON_FRONT, enemyX, enemyY, 2);
  }

  // -------------------------------------------------------------------------
  // 6. BOTTOM-LEFT: PLAYER CODEMON SPRITE (BACK VIEW, 16x16 Pixel Grid Array)
  // -------------------------------------------------------------------------
  if (battleVisualState.player.visible) {
    const player = (window.gameState && window.gameState.player) || { id: 'pyrawr', name: 'Pyrawr' };
    const playerBob = Math.sin(animTick * 0.1) * 1.5;
    const playerX = 22 + battleVisualState.player.offsetX;
    const playerY = 76 + playerBob + battleVisualState.player.offsetY;

    // Pick sprite based on chosen starter
    const pId = (player.id || player.name || '').toLowerCase();
    let playerGrid = SPRITE_PYRAWR_BACK;
    if (pId.includes('jaskull')) {
      playerGrid = SPRITE_JASKULL_BACK;
    } else if (pId.includes('cplusaur')) {
      playerGrid = SPRITE_CPLUSAUR_BACK;
    }

    drawPixelSprite(ctx, playerGrid, playerX, playerY, 2);
  }

  // -------------------------------------------------------------------------
  // 7. BOTTOM-RIGHT: PLAYER INFO BOX (With Numeric HP like 80/100)
  // -------------------------------------------------------------------------
  const player = (window.gameState && window.gameState.player) || {
    name: 'PYRAWR',
    maxHp: 100
  };
  const playerHp = battleVisualState.hp.player;
  const playerHpPct = Math.max(0, playerHp.display / playerHp.max);

  // Outer border & fill
  ctx.fillStyle = '#0c1015';
  ctx.fillRect(72, 68, 83, 34);
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(73, 69, 81, 32);
  ctx.fillStyle = '#1b2632';
  ctx.fillRect(75, 71, 77, 28);

  // Player Name & LV
  ctx.fillStyle = '#eef5fc';
  ctx.font = '6px monospace';
  ctx.fillText(player.name.toUpperCase().substring(0, 8), 79, 79);

  ctx.fillStyle = '#f4b41b';
  ctx.fillText('LV 5', 134, 79);

  // Player HP Bar
  ctx.fillStyle = '#0c1015';
  ctx.fillRect(79, 82, 70, 6);
  ctx.fillStyle = '#f4b41b';
  ctx.font = '5px monospace';
  ctx.fillText('HP', 81, 87);

  // Bar groove
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(91, 83, 56, 4);

  // Bar fill
  const playerFillW = Math.max(0, Math.min(56, Math.round(56 * playerHpPct)));
  ctx.fillStyle = getHpColor(playerHpPct);
  ctx.fillRect(91, 83, playerFillW, 4);

  // Numeric HP display right-aligned (e.g. "80/100")
  ctx.fillStyle = '#eef5fc';
  ctx.font = '6px monospace';
  ctx.textAlign = 'right';
  const numHpStr = `${Math.max(0, Math.round(playerHp.display))}/${playerHp.max}`;
  ctx.fillText(numHpStr, 148, 95);
  ctx.textAlign = 'left';

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 9. BATTLE LOGIC & CODE PANEL INTEGRATION
// ---------------------------------------------------------------------------

// Damage mapping per difficulty: easy 10, medium 20, hard 35
const BASE_DAMAGE = {
  easy: 10,
  medium: 20,
  hard: 35
};

// Points mapping per difficulty: easy 10, medium 25, hard 50
const POINTS_AWARDED = (typeof BATTLE_CONFIG !== 'undefined' && BATTLE_CONFIG.points)
  ? BATTLE_CONFIG.points
  : { easy: 10, medium: 25, hard: 50 };

// Enemy base attack power
const ENEMY_BASE_DAMAGE = 16;

/**
 * evaluateBattleConditions(playerHp, enemyHp, points, turnsLeft)
 * Evaluates the 4 end-of-battle conditions according to BATTLE_CONFIG:
 * 1. If enemy HP <= 0 AND points >= minPoints: WIN. Show a victory screen.
 * 2. If enemy HP <= 0 but points < minPoints: not a true win. Show
 *    "The enemy is still glitching..." and trigger the Bugmon transformation (Piece 7).
 * 3. If turns run out and points < minPoints: trigger the Bugmon transformation.
 * 4. If player HP <= 0: lose.
 */
function evaluateBattleConditions(playerHp, enemyHp, points, turnsLeft) {
  const minPts = (typeof BATTLE_CONFIG !== 'undefined' && BATTLE_CONFIG.minPoints) || 120;

  // 4. If player HP <= 0: lose.
  if (playerHp <= 0) {
    return { outcome: 'defeat', reason: 'player_fainted' };
  }

  // 1 & 2. If enemy HP <= 0
  if (enemyHp <= 0) {
    if (points >= minPts) {
      // 1. If enemy HP <= 0 AND points >= minPoints: WIN. Show a victory screen.
      return { outcome: 'victory', reason: 'enemy_debugged' };
    } else {
      // 2. If enemy HP <= 0 but points < minPoints: not a true win.
      // Show "The enemy is still glitching..." and trigger the Bugmon transformation (Piece 7).
      return { outcome: 'transformation', reason: 'enemy_glitching' };
    }
  }

  // 3. If turns run out and points < minPoints: trigger the Bugmon transformation.
  if (turnsLeft <= 0) {
    if (points < minPts) {
      return { outcome: 'transformation', reason: 'timeout_glitching' };
    } else {
      return { outcome: 'defeat', reason: 'turns_exhausted' };
    }
  }

  return null;
}

/**
 * triggerBugmonTransformation()
 * Triggers the Bugmon transformation (Piece 7).
 * Sets glitch state, displays glitch dialogue and console warnings,
 * activates screen shake, and signals the transformation outcome.
 */
async function triggerBugmonTransformation() {
  battleVisualState.isGlitching = true;
  if (window.gameState) {
    window.gameState.isGlitching = true;
    window.gameState.isTransformed = true;
  }

  // Screen shake & glitch effect
  battleVisualState.screenShake.duration = 20;

  if (window.appendConsoleLine) {
    window.appendConsoleLine('========================================', 'console-error');
    window.appendConsoleLine('⚠ GLITCH PHASE TRIGGERED: BUGMON TRANSFORMATION (PIECE 7) ⚠', 'console-error');
    window.appendConsoleLine('> Insufficient points! Unresolved syntax errors trigger Glitch Mutation!', 'console-warn');
    window.appendConsoleLine('> Bugmon absorbed unhandled exceptions and transformed into Glitch Spectre v2.0!', 'console-warn');
    window.appendConsoleLine('========================================', 'console-error');
  }

  if (window.playSound) {
    window.playSound('hit');
  }

  const triggerMsg = window.showMessage || showMessage;
  const enemy = (window.gameState && window.gameState.enemy) || { name: 'Bugmon' };
  await triggerMsg(`CRITICAL GLITCH! ${enemy.name.toUpperCase()} is mutating into an unstable anomaly!`);

  if (window.handleBattleOutcome) {
    window.handleBattleOutcome('transformation');
  }
}

/**
 * Update code panel elements to reflect "ENEMY TURN..." state
 */
function setCodePanelEnemyTurnUI(isEnemyTurn) {
  const pickerBadge = document.getElementById('picker-status-badge');
  const challengeBadge = document.getElementById('current-challenge-badge');
  const consoleBadge = document.getElementById('console-status-badge');
  const textarea = document.getElementById('code-textarea');
  const btnRun = document.getElementById('btn-run-tests');
  const btnHint = document.getElementById('btn-hint');
  const btnReset = document.getElementById('btn-reset-code');
  const pickerContainer = document.getElementById('picker-cards-container');

  if (isEnemyTurn) {
    if (pickerBadge) {
      pickerBadge.textContent = 'ENEMY TURN...';
      pickerBadge.className = 'section-badge font-code text-red';
    }
    if (challengeBadge) {
      challengeBadge.textContent = 'ENEMY TURN...';
      challengeBadge.className = 'badge-difficulty hard font-pixel';
    }
    if (consoleBadge) {
      consoleBadge.textContent = 'SYS: ENEMY TURN';
      consoleBadge.className = 'section-badge font-code text-red';
    }
    if (textarea) textarea.disabled = true;
    if (btnRun) btnRun.disabled = true;
    if (btnHint) btnHint.disabled = true;
    if (btnReset) btnReset.disabled = true;

    if (pickerContainer) {
      const cards = pickerContainer.querySelectorAll('.picker-card');
      cards.forEach((c) => {
        c.classList.add('locked');
        c.style.pointerEvents = 'none';
      });
    }
  } else {
    if (pickerBadge) {
      pickerBadge.textContent = 'SELECT DIFFICULTY TO ATTACK';
      pickerBadge.className = 'section-badge font-code text-yellow';
    }
    if (consoleBadge) {
      consoleBadge.textContent = 'SYS: READY';
      consoleBadge.className = 'section-badge font-code text-green';
    }
    if (pickerContainer) {
      const cards = pickerContainer.querySelectorAll('.picker-card');
      cards.forEach((c) => {
        c.style.pointerEvents = 'auto';
      });
    }
  }
}

/**
 * handlePlayerCodeSuccess(challenge, outcome)
 * When RUN TESTS returns passed: true, count it as a correct attempt:
 * - damage = baseDamage[difficulty] * player.attackPower (easy 10, medium 20, hard 35)
 * - Call playAttackAnimation("player"), playHitAnimation("enemy")
 * - Animate the enemy HP bar
 * - Award points only on correct answers (easy 10, medium 25, hard 50)
 * - Pop animation on points update
 * - End-of-battle check if enemy HP <= 0
 * - Then start the enemy turn
 */
async function handlePlayerCodeSuccess(challenge, outcome) {
  const player = (window.gameState && window.gameState.player) || { attackPower: 1.0, name: 'Pyrawr' };
  const enemy = (window.gameState && window.gameState.enemy) || { name: 'Bugmon', maxHp: 130 };
  const diff = (challenge && challenge.difficulty) ? challenge.difficulty.toLowerCase() : 'easy';

  // 1. Calculate damage = baseDamage[difficulty] * player.attackPower
  const baseDmg = BASE_DAMAGE[diff] || 10;
  const attackMultiplier = (player && typeof player.attackPower === 'number') ? player.attackPower : 1.0;
  const damage = Math.round(baseDmg * attackMultiplier);

  // 2. Award points only on correct answers (easy 10, medium 25, hard 50)
  const pts = (BATTLE_CONFIG && BATTLE_CONFIG.points && BATTLE_CONFIG.points[diff]) || POINTS_AWARDED[diff] || 10;
  battleVisualState.points += pts;

  // Update HUD with points and small pop animation (turnsLeft updated after full round)
  updateHud(battleVisualState.points, battleVisualState.turnsLeft);

  if (window.gameState) {
    window.gameState.score = battleVisualState.points;
  }

  // 3. Sequential attack and hit animations
  const triggerAttack = window.playAttackAnimation || playAttackAnimation;
  const triggerHit = window.playHitAnimation || playHitAnimation;
  const triggerSetHp = window.setHp || setHp;
  const triggerMsg = window.showMessage || showMessage;

  await triggerAttack('player');
  await triggerHit('enemy');

  // 4. Animate the enemy HP bar
  const currentEnemyHp = (window.gameState && window.gameState.enemy && typeof window.gameState.enemy.hp === 'number')
    ? window.gameState.enemy.hp
    : battleVisualState.hp.enemy.current;
  const newEnemyHp = Math.max(0, currentEnemyHp - damage);

  if (window.gameState && window.gameState.enemy) {
    window.gameState.enemy.hp = newEnemyHp;
    window.gameState.enemy.currentHp = newEnemyHp;
  }

  await triggerSetHp('enemy', newEnemyHp, battleVisualState.hp.enemy.max);

  if (window.appendConsoleLine) {
    window.appendConsoleLine(`> Attack hit! Dealt ${damage} DMG to Bugmon. +${pts} PTS awarded.`, 'console-pass');
  }

  await triggerMsg(`${player.name.toUpperCase()} compiled clean code! Dealt ${damage} DMG to ${enemy.name.toUpperCase()}! (+${pts} PTS)`);

  // End-of-battle check if enemy HP <= 0:
  if (newEnemyHp <= 0) {
    const minPts = (BATTLE_CONFIG && BATTLE_CONFIG.minPoints) || 120;
    if (battleVisualState.points >= minPts) {
      // 1. If enemy HP <= 0 AND points >= minPoints: WIN. Show a victory screen.
      if (window.handleBattleOutcome) {
        window.handleBattleOutcome('victory');
      } else {
        await triggerMsg(`VICTORY! ${enemy.name.toUpperCase()} was debugged! Final Score: ${battleVisualState.points} PTS!`);
      }
      return { outcome: 'victory', damage, points: pts };
    } else {
      // 2. If enemy HP <= 0 but points < minPoints: not a true win. Show
      // "The enemy is still glitching..." and trigger the Bugmon transformation (Piece 7).
      await triggerMsg('The enemy is still glitching...');
      await triggerBugmonTransformation();
      return { outcome: 'transformation', reason: 'enemy_glitching', damage, points: pts };
    }
  }

  // 5. Enemy survived -> start the enemy turn to complete the full round
  const enemyTurnRes = await startEnemyTurn(false);
  return { outcome: (enemyTurnRes && enemyTurnRes.outcome) || 'turn_complete', damage, points: pts };
}

/**
 * handlePlayerCodePartial(outcome, challenge)
 * Partial passes (some tests pass, not all):
 * - No damage, but show "N/M tests passed" in the console.
 * - Player may keep editing and re-running until the timer ends.
 * - Each failed run costs nothing, but only the first full pass counts.
 */
function handlePlayerCodePartial(outcome, challenge) {
  const results = (outcome && outcome.results) ? outcome.results : [];
  const totalCount = results.length;
  const passedCount = results.filter(r => r.pass).length;
  const passSummaryText = `${passedCount}/${totalCount} tests passed`;

  // Show "N/M tests passed" in console
  if (window.appendConsoleLine) {
    window.appendConsoleLine(passSummaryText, 'console-warn');
    window.appendConsoleLine('> No damage dealt. Keep editing and re-run before time expires!', 'console-info');
  }

  if (window.typeText) {
    window.typeText(`${passSummaryText}. Adjust your code and re-run!`, 18);
  }

  return {
    passedCount,
    totalCount,
    summary: passSummaryText
  };
}

/**
 * handleTurnTimeout()
 * When the timer ends without a full pass:
 * - showMessage("Out of time!")
 * - no damage
 * - enemy attacks with 50% bonus damage
 */
async function handleTurnTimeout() {
  if (window.appendConsoleLine) {
    window.appendConsoleLine('TIMEOUT: Out of time! Turn failed. Bugmon attacks with 50% BONUS DAMAGE!', 'console-error');
  }

  const triggerMsg = window.showMessage || showMessage;

  // showMessage("Out of time!")
  await triggerMsg('Out of time!');

  // Enemy attacks with 50% bonus damage and completes the full round
  await startEnemyTurn(true);
}

/**
 * startEnemyTurn(isBonusDamage = false)
 * - During the enemy turn, disable the editor and show "ENEMY TURN..." in the code panel.
 * - Enemy attacks and damages player.
 * - Updates "Turns left: Y" after every full round.
 * - When 2 turns remain, counter blinks red as a warning.
 * - End-of-battle check (run after every round).
 * - When it's the player's turn again, show 3 new challenge cards.
 */
async function startEnemyTurn(isBonusDamage = false) {
  const player = (window.gameState && window.gameState.player) || { name: 'Codemon', maxHp: 100 };
  const enemy = (window.gameState && window.gameState.enemy) || { name: 'Bugmon', maxHp: 130 };

  const triggerAttack = window.playAttackAnimation || playAttackAnimation;
  const triggerHit = window.playHitAnimation || playHitAnimation;
  const triggerSetHp = window.setHp || setHp;
  const triggerMsg = window.showMessage || showMessage;

  // 1. Disable the editor and show "ENEMY TURN..." in the code panel
  setCodePanelEnemyTurnUI(true);

  if (window.appendConsoleLine) {
    window.appendConsoleLine('> ENEMY TURN...', 'console-warn');
  }

  // 2. Compute damage: normal or with 50% bonus damage
  const baseDmg = ENEMY_BASE_DAMAGE;
  const enemyDmg = isBonusDamage ? Math.round(baseDmg * 1.5) : baseDmg;

  await new Promise(r => setTimeout(r, 600));

  if (window.gameState && window.gameState.battleActive === false) {
    return { outcome: 'aborted' };
  }

  if (isBonusDamage) {
    await triggerMsg(`${enemy.name.toUpperCase()} strikes with 50% BONUS DAMAGE (${enemyDmg} DMG)!`);
  } else {
    await triggerMsg(`${enemy.name.toUpperCase()} countered with Segfault Slam (${enemyDmg} DMG)!`);
  }

  // 3. Enemy attack animations
  await triggerAttack('enemy');
  await triggerHit('player');

  // 4. Animate player HP bar
  const currentPlayerHp = (window.gameState && window.gameState.player && typeof window.gameState.player.hp === 'number')
    ? window.gameState.player.hp
    : battleVisualState.hp.player.current;
  const newPlayerHp = Math.max(0, currentPlayerHp - enemyDmg);

  if (window.gameState && window.gameState.player) {
    window.gameState.player.hp = newPlayerHp;
    window.gameState.player.currentHp = newPlayerHp;
  }

  await triggerSetHp('player', newPlayerHp, battleVisualState.hp.player.max);

  if (window.appendConsoleLine) {
    window.appendConsoleLine(`> ${enemy.name} dealt ${enemyDmg} DMG to ${player.name}!`, 'console-fail');
  }

  // =========================================================================
  // END OF FULL ROUND:
  // Update "Turns left: Y" after every full round.
  // When 2 turns remain, make the counter blink red as a warning.
  // =========================================================================
  battleVisualState.turnsLeft = Math.max(0, battleVisualState.turnsLeft - 1);
  updateHud(battleVisualState.points, battleVisualState.turnsLeft);
  if (window.gameState) {
    window.gameState.turnsLeft = battleVisualState.turnsLeft;
  }

  // =========================================================================
  // END-OF-BATTLE CHECK (Run after every round):
  // 1. If enemy HP <= 0 AND points >= minPoints: WIN. Show a victory screen.
  // 2. If enemy HP <= 0 but points < minPoints: not a true win. Show
  //    "The enemy is still glitching..." and trigger the Bugmon transformation (Piece 7).
  // 3. If turns run out and points < minPoints: trigger the Bugmon transformation.
  // 4. If player HP <= 0: lose.
  // =========================================================================
  const roundEval = evaluateBattleConditions(
    newPlayerHp,
    battleVisualState.hp.enemy.current,
    battleVisualState.points,
    battleVisualState.turnsLeft
  );

  if (roundEval) {
    if (roundEval.outcome === 'victory') {
      if (window.handleBattleOutcome) {
        window.handleBattleOutcome('victory');
      } else {
        await triggerMsg(`VICTORY! ${enemy.name.toUpperCase()} was debugged! Final Score: ${battleVisualState.points} PTS!`);
      }
      return roundEval;
    }

    if (roundEval.outcome === 'defeat') {
      if (window.handleBattleOutcome) {
        window.handleBattleOutcome('defeat');
      } else {
        await triggerMsg(newPlayerHp <= 0 ? `DEFEAT! ${player.name.toUpperCase()} fainted!` : `DEFEAT! Turns ran out!`);
      }
      return roundEval;
    }

    if (roundEval.outcome === 'transformation') {
      if (roundEval.reason === 'enemy_glitching') {
        await triggerMsg('The enemy is still glitching...');
      }
      await triggerBugmonTransformation();
      return roundEval;
    }
  }

  // When it's the player's turn again, show 3 new challenge cards
  await new Promise(r => setTimeout(r, 800));
  if (window.startPlayerTurn) {
    window.startPlayerTurn();
  }
  return { outcome: 'player_turn' };
}

// ---------------------------------------------------------------------------
// 10. EXPOSE FUNCTIONS FOR CODE PANEL & GLOBAL SCOPE
// ---------------------------------------------------------------------------
window.BattleEngine = {
  // Constants & Config
  BATTLE_CONFIG,
  BASE_DAMAGE,
  POINTS_AWARDED,
  ENEMY_BASE_DAMAGE,

  // Sprites
  SPRITE_PALETTE,
  SPRITE_BUGMON_FRONT,
  SPRITE_PYRAWR_BACK,
  SPRITE_JASKULL_BACK,
  SPRITE_CPLUSAUR_BACK,
  drawPixelSprite,

  // Visual & Animation Functions
  playAttackAnimation,
  playHitAnimation,
  showMessage,
  typeText,
  setHp,
  updateHud,

  // Battle Logic Handlers & Conditions
  evaluateBattleConditions,
  triggerBugmonTransformation,
  handlePlayerCodeSuccess,
  handlePlayerCodePartial,
  handleTurnTimeout,
  startEnemyTurn,
  setCodePanelEnemyTurnUI,

  // Renderer & state
  render: renderBattleScene,
  visualState: battleVisualState
};

// Global direct bindings for code panel and external modules
window.BATTLE_CONFIG = BATTLE_CONFIG;
window.evaluateBattleConditions = evaluateBattleConditions;
window.triggerBugmonTransformation = triggerBugmonTransformation;
window.playAttackAnimation = playAttackAnimation;
window.playHitAnimation = playHitAnimation;
window.showMessage = showMessage;
window.typeText = typeText;
window.setHp = setHp;
window.updateHud = updateHud;
window.handlePlayerCodeSuccess = handlePlayerCodeSuccess;
window.handlePlayerCodePartial = handlePlayerCodePartial;
window.handleTurnTimeout = handleTurnTimeout;
window.startEnemyTurn = startEnemyTurn;
window.setCodePanelEnemyTurnUI = setCodePanelEnemyTurnUI;
window.BattleScene = window.BattleEngine;

