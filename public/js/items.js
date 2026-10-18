/**
 * Codemons Heal Chip Item System
 * Config, drop roll logic, inventory state tracking, and localStorage persistence.
 */

// 1. CHIP CONFIG
const CHIPS = {
  low: { id: "low", name: "Low Chip", heal: 5, sourceDifficulty: "easy", dropChance: 0.30, rarityLabel: "RARE" },
  normal: { id: "normal", name: "Normal Chip", heal: 10, sourceDifficulty: "medium", dropChance: 0.15, rarityLabel: "RARER" },
  advance: { id: "advance", name: "Advance Chip", heal: 15, sourceDifficulty: "hard", dropChance: 0.06, rarityLabel: "RAREST" }
};

/**
 * getRewardChipForDifficulty(difficulty)
 * Helper to dynamically read reward chip configuration for a challenge difficulty ('easy', 'medium', 'hard').
 * All card reward names, heal values, rarity labels and drop chances must be read through this helper.
 */
function getRewardChipForDifficulty(difficulty) {
  if (!difficulty) return null;
  const diff = String(difficulty).toLowerCase().trim();
  const chip = Object.values(CHIPS).find(c => c.sourceDifficulty === diff);
  if (!chip) return null;
  return {
    ...chip,
    healText: `+${chip.heal} HP`,
    dropPercentText: `${Math.round(chip.dropChance * 100)}%`,
    rarityBadge: chip.rarityLabel,
    isAdvance: chip.id === 'advance'
  };
}

const ITEM_CONFIG = {
  maxPerType: 9,
  maxChipUsesPerTurn: 1
};

// 1. CHIP ICON ART & PALETTE
// Palette colors strictly from style.css
const CHIP_PALETTE = {
  0: null,                  // transparent
  1: '#0c1015',             // --gb-darkest (chip outer border outline)
  2: '#38b764',             // --gb-green (low chip body: light green)
  3: '#206d39',             // --gb-green-dark (low chip: dark green plus)
  4: '#38bdf8',             // --gb-blue (normal chip body: mid blue)
  5: '#1e40af',             // --gb-blue-dark (blue dark border accent)
  6: '#f4b41b',             // --gb-yellow (advance chip body: gold/yellow)
  7: '#9f7209',             // --gb-yellow-dark (gold dark accent)
  8: '#eef5fc'              // --gb-lightest (white plus / light plus & 1px sparkle corner)
};

// 10x10 array of palette indexes for each chip:
// - Low chip: light green chip, dark plus.
// - Normal chip: mid blue chip, light plus.
// - Advance chip: gold/yellow chip with a white plus and a 1px sparkle corner at [1, 8].
const CHIP_PIXEL_ART = {
  low: [
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 3, 3, 2, 2, 2, 1],
    [1, 2, 2, 2, 3, 3, 2, 2, 2, 1],
    [1, 2, 3, 3, 3, 3, 3, 3, 2, 1],
    [1, 2, 3, 3, 3, 3, 3, 3, 2, 1],
    [1, 2, 2, 2, 3, 3, 2, 2, 2, 1],
    [1, 2, 2, 2, 3, 3, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0]
  ],
  normal: [
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    [1, 4, 4, 4, 8, 8, 4, 4, 4, 1],
    [1, 4, 4, 4, 8, 8, 4, 4, 4, 1],
    [1, 4, 8, 8, 8, 8, 8, 8, 4, 1],
    [1, 4, 8, 8, 8, 8, 8, 8, 4, 1],
    [1, 4, 4, 4, 8, 8, 4, 4, 4, 1],
    [1, 4, 4, 4, 8, 8, 4, 4, 4, 1],
    [1, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0]
  ],
  advance: [
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 6, 6, 6, 6, 6, 6, 6, 8, 1],
    [1, 6, 6, 6, 8, 8, 6, 6, 6, 1],
    [1, 6, 6, 6, 8, 8, 6, 6, 6, 1],
    [1, 6, 8, 8, 8, 8, 8, 8, 6, 1],
    [1, 6, 8, 8, 8, 8, 8, 8, 6, 1],
    [1, 6, 6, 6, 8, 8, 6, 6, 6, 1],
    [1, 6, 6, 6, 8, 8, 6, 6, 6, 1],
    [1, 6, 6, 6, 6, 6, 6, 6, 6, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0]
  ]
};

/**
 * drawChipIcon(ctx, chipId, x, y, scale)
 * Renders 10x10 pixel art with fillRect per pixel (no images, no smoothing).
 * Only uses palette colors from style.css.
 */
function drawChipIcon(ctx, chipId, x = 0, y = 0, scale = 1) {
  if (!ctx || !chipId) return;
  const key = typeof chipId === 'string' ? chipId.toLowerCase().trim() : '';
  const art = CHIP_PIXEL_ART[key];
  if (!art) return;

  // Disable smoothing for crisp pixel rendering
  ctx.imageSmoothingEnabled = false;
  if ('webkitImageSmoothingEnabled' in ctx) ctx.webkitImageSmoothingEnabled = false;
  if ('mozImageSmoothingEnabled' in ctx) ctx.mozImageSmoothingEnabled = false;
  if ('msImageSmoothingEnabled' in ctx) ctx.msImageSmoothingEnabled = false;

  const s = Math.max(1, Math.floor(scale));
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const colorIndex = art[r][c];
      const color = CHIP_PALETTE[colorIndex];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x + c * s), Math.floor(y + r * s), s, s);
      }
    }
  }
}

/**
 * Helper to obtain gameState across browser / node / global environments
 */
function getGameState() {
  if (typeof window !== 'undefined' && window.gameState) {
    return window.gameState;
  }
  if (typeof global !== 'undefined' && global.gameState) {
    return global.gameState;
  }
  return null;
}

/**
 * 4. PERSISTENCE
 * Writes gameState.inventory to localStorage under the key "codemons_inventory".
 * Call it every time the inventory changes.
 */
function saveInventory() {
  try {
    const inv = getInventory();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('codemons_inventory', JSON.stringify(inv));
    }
  } catch (err) {
    console.warn('saveInventory error:', err);
  }
}

/**
 * Runs on game start and restores it, falling back to all zeros if missing or broken.
 */
function loadInventory() {
  const fallback = { low: 0, normal: 0, advance: 0 };
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('codemons_inventory');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            low: Math.max(0, Math.min(ITEM_CONFIG.maxPerType, Number(parsed.low) || 0)),
            normal: Math.max(0, Math.min(ITEM_CONFIG.maxPerType, Number(parsed.normal) || 0)),
            advance: Math.max(0, Math.min(ITEM_CONFIG.maxPerType, Number(parsed.advance) || 0))
          };
        }
      }
    }
  } catch (_err) {
    // Falls back to all zeros if the data is missing or broken
  }
  return fallback;
}

// Fallback inventory store for environments without global gameState
let fallbackInventory = null;

/**
 * Helper to get the current inventory object
 */
function getInventory() {
  const state = getGameState();
  if (state) {
    if (!state.inventory || typeof state.inventory !== 'object') {
      state.inventory = loadInventory();
    }
    return state.inventory;
  }
  if (!fallbackInventory) {
    fallbackInventory = loadInventory();
  }
  return fallbackInventory;
}

/**
 * 2. DROP ROLL
 * Finds the chip whose sourceDifficulty matches.
 * Uses Math.random() < dropChance to decide if it drops.
 * Returns the chip id string, or null if nothing dropped.
 */
function rollChipDrop(difficulty) {
  if (!difficulty || typeof difficulty !== 'string') return null;
  const diffKey = difficulty.trim().toLowerCase();
  const chip = Object.values(CHIPS).find(c => c.sourceDifficulty === diffKey);
  if (!chip) return null;

  if (Math.random() < chip.dropChance) {
    return chip.id;
  }
  return null;
}

/**
 * 3. INVENTORY STATE
 * addChip(id): +1 to that chip, capped at ITEM_CONFIG.maxPerType.
 * Returns true if added, false if the stack was already full.
 */
function addChip(id) {
  if (!id || !CHIPS[id]) return false;
  const inv = getInventory();
  const current = Number(inv[id]) || 0;
  if (current >= ITEM_CONFIG.maxPerType) {
    return false;
  }
  inv[id] = current + 1;
  saveInventory();
  if (typeof updateChipInventoryBar === 'function') {
    updateChipInventoryBar();
  }
  return true;
}

/**
 * getChipCount(id)
 */
function getChipCount(id) {
  if (!id) return 0;
  const inv = getInventory();
  return Number(inv[id]) || 0;
}

/**
 * hasAnyChip(): true if any count is above 0.
 */
function hasAnyChip() {
  const inv = getInventory();
  return (Number(inv.low) || 0) > 0 ||
         (Number(inv.normal) || 0) > 0 ||
         (Number(inv.advance) || 0) > 0;
}

/**
 * removeChip(id): -1, never below 0.
 */
function removeChip(id) {
  if (!id || !CHIPS[id]) return false;
  const inv = getInventory();
  const current = Number(inv[id]) || 0;
  if (current <= 0) {
    inv[id] = 0;
    saveInventory();
    if (typeof updateChipInventoryBar === 'function') {
      updateChipInventoryBar();
    }
    return false;
  }
  inv[id] = current - 1;
  saveInventory();
  if (typeof updateChipInventoryBar === 'function') {
    updateChipInventoryBar();
  }
  return true;
}

/**
 * "Reset Progress" (if it exists) clears the inventory too.
 * When starting a new game or playing again, the item count starts from zero.
 */
function clearInventory() {
  const inv = getInventory();
  inv.low = 0;
  inv.normal = 0;
  inv.advance = 0;
  const state = getGameState();
  if (state) {
    state.inventory = inv;
  }
  fallbackInventory = inv;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('codemons_inventory');
    }
  } catch (err) {
    console.warn('clearInventory error:', err);
  }
  if (typeof updateChipInventoryBar === 'function') {
    updateChipInventoryBar();
  }
  if (typeof renderInventory === 'function') {
    renderInventory();
  } else if (typeof window !== 'undefined' && typeof window.renderInventory === 'function') {
    window.renderInventory();
  }
  if (typeof updateInventoryStatusBar === 'function') {
    updateInventoryStatusBar();
  } else if (typeof window !== 'undefined' && typeof window.updateInventoryStatusBar === 'function') {
    window.updateInventoryStatusBar();
  }
  if (typeof selectChipSlot === 'function') {
    selectChipSlot(null);
  } else if (typeof window !== 'undefined' && typeof window.selectChipSlot === 'function') {
    window.selectChipSlot(null);
  }
  return inv;
}

function resetInventory() {
  return clearInventory();
}

/**
 * 5. DEBUG HELPER
 * window.debugGiveChip(id, amount)
 */
function debugGiveChip(id, amount = 1) {
  if (!id || !CHIPS[id]) {
    console.warn(`[debugGiveChip] Unknown chip id "${id}". Valid IDs: low, normal, advance`);
    return 0;
  }
  const inv = getInventory();
  const amt = typeof amount === 'number' && !isNaN(amount) ? amount : 1;
  const current = Number(inv[id]) || 0;
  const newCount = Math.max(0, Math.min(ITEM_CONFIG.maxPerType, current + amt));
  inv[id] = newCount;
  saveInventory();
  if (typeof updateChipInventoryBar === 'function') {
    updateChipInventoryBar();
  }
  console.log(`[debugGiveChip] Added ${amt} ${CHIPS[id].name}. Current total: ${newCount}/${ITEM_CONFIG.maxPerType}`);
  return newCount;
}

// ---------------------------------------------------------------------------
// TURN LIMIT & CHIP USE TRACKING
// ---------------------------------------------------------------------------
let chipsUsedThisTurn = 0;

function resetChipsUsedThisTurn() {
  chipsUsedThisTurn = 0;
  if (typeof window !== 'undefined') {
    window.chipsUsedThisTurn = 0;
  }
}

function getChipsUsedThisTurn() {
  if (typeof window !== 'undefined' && typeof window.chipsUsedThisTurn === 'number') {
    return window.chipsUsedThisTurn;
  }
  return chipsUsedThisTurn;
}

/**
 * Check if enemy is currently attacking or it's enemy turn.
 */
function isEnemyTurnOrAttacking() {
  if (typeof window !== 'undefined') {
    if (window.gameState && (window.gameState.isEnemyTurn || window.gameState.isEnemyAttacking)) {
      return true;
    }
    if (window.BattleEngine && window.BattleEngine.visualState) {
      if (window.BattleEngine.visualState.isEnemyTurn || window.BattleEngine.visualState.isEnemyAttacking) {
        return true;
      }
    }
    if (typeof document !== 'undefined') {
      const pickerBadge = document.getElementById('picker-status-badge');
      if (pickerBadge && pickerBadge.textContent && pickerBadge.textContent.includes('ENEMY TURN')) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Helper to show dialogue message across typewriter / DOM
 */
function showChipDialogue(message) {
  if (typeof window !== 'undefined') {
    if (window.typeText) {
      window.typeText(message, 20);
    } else if (window.showMessage) {
      window.showMessage(message);
    } else if (typeof document !== 'undefined') {
      const dialogueText = document.getElementById('battle-dialogue-text');
      const dialogueOverlay = document.getElementById('battle-dialogue-overlay');
      if (dialogueText) dialogueText.textContent = message;
      if (dialogueOverlay) dialogueOverlay.classList.add('active');
    }
  }
}

/**
 * Helper to append floating green heal text above target sprite
 */
function showFloatingHeal(target = 'player', amount = 10) {
  if (typeof document === 'undefined') return;
  const layer = document.getElementById('combat-floating-damage-layer');
  if (!layer) return;

  const healEl = document.createElement('div');
  healEl.className = 'combat-floating-damage heal';
  healEl.textContent = `+${amount}`;

  if (target === 'player') {
    healEl.style.left = '26%';
    healEl.style.top = '60%';
  } else {
    healEl.style.left = '74%';
    healEl.style.top = '22%';
  }

  layer.appendChild(healEl);

  const detachHeal = () => {
    try {
      if (typeof healEl.remove === 'function') {
        healEl.remove();
      } else if (healEl.parentNode && typeof healEl.parentNode.removeChild === 'function') {
        healEl.parentNode.removeChild(healEl);
      }
    } catch {
      // Element already removed
    }
  };

  if (typeof healEl.addEventListener === 'function') {
    healEl.addEventListener('animationend', detachHeal);
  }
  setTimeout(detachHeal, 1000);
}

/**
 * 3. USE A CHIP: useChip(id)
 * - Allowed any time during battle, including while a question is open and timer is running.
 * - Does NOT pause timer; is a FREE action (does not use up a turn).
 * - Limit: ITEM_CONFIG.maxChipUsesPerTurn (default 1). Reset at start of player turn.
 * - Blocked cases (shows dialogue, NO chip spent):
 *     1. During enemy attack animation / enemy turn: "WAIT FOR YOUR TURN!"
 *     2. Limit reached: "ONLY 1 CHIP PER TURN!"
 *     3. No chips of that type: "NO CHIPS LEFT!"
 *     4. Player HP already full: "HP IS ALREADY FULL!"
 * - On success:
 *     1. removeChip(id) and saveInventory()
 *     2. newHp = Math.min(player.maxHp, player.hp + chip.heal)
 *     3. Animate HP bar going up with setHp()
 *     4. Show floating green "+5" / "+10" / "+15" above player sprite
 *     5. Dialogue: "Used a Normal Chip! Recovered 10 HP!"
 *     6. Play short rising heal sound via Web Audio helper
 */
function useChip(id) {
  if (!id) return false;
  const key = typeof id === 'string' ? id.trim().toLowerCase() : (id && id.id);
  const chip = CHIPS[key];
  if (!chip) return false;

  // Blocked Case: During enemy attack animation / turn
  if (isEnemyTurnOrAttacking()) {
    showChipDialogue("WAIT FOR YOUR TURN!");
    return false;
  }

  // Turn Limit Check: default 1 chip per turn
  const used = getChipsUsedThisTurn();
  const maxUses = (ITEM_CONFIG && ITEM_CONFIG.maxChipUsesPerTurn) || 1;
  if (used >= maxUses) {
    showChipDialogue("ONLY 1 CHIP PER TURN!");
    return false;
  }

  // Blocked Case: No chips left of that type
  if (getChipCount(key) <= 0) {
    showChipDialogue("NO CHIPS LEFT!");
    return false;
  }

  // Retrieve player HP state
  const state = getGameState();
  const player = (state && state.player) || (typeof window !== 'undefined' && window.selectedCodemon) || null;
  const maxHp = (player && (player.maxHp || player.hpMax)) || 100;
  const currentHp = (player && typeof player.hp === 'number') ? player.hp : ((player && typeof player.currentHp === 'number') ? player.currentHp : maxHp);

  // Blocked Case: HP already full
  if (currentHp >= maxHp) {
    showChipDialogue("HP IS ALREADY FULL!");
    if (typeof document !== 'undefined') {
      const hintEl = document.getElementById('inv-footer-hint');
      if (hintEl) {
        hintEl.textContent = '> HP IS ALREADY FULL!';
        hintEl.style.color = '#f87171';
        setTimeout(() => {
          if (hintEl) {
            hintEl.textContent = '> SELECT A CHIP TO USE DURING BATTLE.';
            hintEl.style.color = '';
          }
        }, 2200);
      }
    }
    return false;
  }

  // --- ON SUCCESS ---
  // 1. removeChip(id) & saveInventory()
  removeChip(key);
  chipsUsedThisTurn = used + 1;
  if (typeof window !== 'undefined') {
    window.chipsUsedThisTurn = chipsUsedThisTurn;
  }

  // 2. newHp = Math.min(player.maxHp, player.hp + chip.heal)
  const healedAmt = chip.heal;
  const newHp = Math.min(maxHp, currentHp + healedAmt);
  if (player) {
    player.hp = newHp;
    player.currentHp = newHp;
  }
  if (typeof window !== 'undefined' && window.BattleEngine && window.BattleEngine.visualState && window.BattleEngine.visualState.hp && window.BattleEngine.visualState.hp.player) {
    window.BattleEngine.visualState.hp.player.current = newHp;
  }

  // 3. Animate HP bar going up with setHp()
  const triggerSetHp = (typeof window !== 'undefined' && window.setHp) || null;
  if (triggerSetHp) {
    triggerSetHp('player', newHp, maxHp, false);
  }

  // 4. Show floating green "+5" / "+10" / "+15" above player sprite
  showFloatingHeal('player', healedAmt);

  // 5. Dialogue: "Used a Normal Chip! Recovered 10 HP!"
  const dialogueMsg = `Used a ${chip.name}! Recovered ${healedAmt} HP!`;
  showChipDialogue(dialogueMsg);

  if (typeof window !== 'undefined' && window.appendConsoleLine) {
    window.appendConsoleLine(`> [HEAL]: Used ${chip.name}! Recovered ${healedAmt} HP! (${newHp}/${maxHp} HP)`, 'console-pass');
  }

  // Track chipsUsed in gameState.stats
  if (state) {
    state.stats = state.stats || {};
    state.stats.chipsUsed = (state.stats.chipsUsed || 0) + 1;
  }

  // 6. Play short rising heal sound using Web Audio helper
  if (typeof window !== 'undefined' && window.playSound) {
    window.playSound('heal');
  }

  // Update Inventory quickbar UI
  if (typeof updateChipInventoryBar === 'function') {
    updateChipInventoryBar();
  }

  return true;
}

// ---------------------------------------------------------------------------
// INVENTORY QUICKBAR UI HELPERS
// ---------------------------------------------------------------------------
let selectedChipSlot = null;

function selectChipSlot(chipId) {
  selectedChipSlot = chipId;
  const chips = ['low', 'normal', 'advance'];
  chips.forEach((id) => {
    if (typeof document === 'undefined') return;
    const slotEl = document.getElementById(`chip-slot-${id}`);
    if (slotEl) {
      if (chipId && id === chipId) {
        slotEl.classList.add('selected');
      } else {
        slotEl.classList.remove('selected');
      }
    }
  });
}

function updateChipInventoryBar() {
  if (typeof document === 'undefined') return;

  // Render canvas icons for left quickbar
  const lowCanvas = document.getElementById('chip-icon-low');
  const normalCanvas = document.getElementById('chip-icon-normal');
  const advanceCanvas = document.getElementById('chip-icon-advance');

  if (lowCanvas && lowCanvas.getContext) {
    const ctx = lowCanvas.getContext('2d');
    ctx.clearRect(0, 0, lowCanvas.width, lowCanvas.height);
    drawChipIcon(ctx, 'low', 0, 0, 2);
  }
  if (normalCanvas && normalCanvas.getContext) {
    const ctx = normalCanvas.getContext('2d');
    ctx.clearRect(0, 0, normalCanvas.width, normalCanvas.height);
    drawChipIcon(ctx, 'normal', 0, 0, 2);
  }
  if (advanceCanvas && advanceCanvas.getContext) {
    const ctx = advanceCanvas.getContext('2d');
    ctx.clearRect(0, 0, advanceCanvas.width, advanceCanvas.height);
    drawChipIcon(ctx, 'advance', 0, 0, 2);
  }

  const chips = ['low', 'normal', 'advance'];
  chips.forEach((chipId) => {
    const count = getChipCount(chipId);
    const countEl = document.getElementById(`chip-count-${chipId}`);
    const slotEl = document.getElementById(`chip-slot-${chipId}`);

    if (countEl) {
      countEl.textContent = `x${count}`;
    }
    if (slotEl) {
      if (count <= 0) {
        slotEl.classList.add('dimmed');
      } else {
        slotEl.classList.remove('dimmed');
      }
      if (typeof slotEl.querySelector === 'function') {
        const tooltip = slotEl.querySelector('.chip-tooltip');
        if (tooltip && CHIPS[chipId]) {
          tooltip.textContent = `${CHIPS[chipId].name.toUpperCase()} +${CHIPS[chipId].heal} HP`;
        }
      }
      if (typeof slotEl.setAttribute === 'function' && CHIPS[chipId]) {
        slotEl.setAttribute('aria-label', `${CHIPS[chipId].name} (+${CHIPS[chipId].heal} HP) - Count: ${count}`);
      }
    }
  });

  // Synchronize FULL badge on question cards if chips at maxPerType
  updateQuestionCardChipFullBadges();

  // Synchronize inventory modal dialog if present
  if (typeof renderInventory === 'function') {
    renderInventory();
  } else if (typeof window !== 'undefined' && typeof window.renderInventory === 'function') {
    window.renderInventory();
  }
}

/**
 * updateQuestionCardChipFullBadges()
 * Shows a small "FULL" badge over the question card's chip image if the chip's stack
 * is already full (ITEM_CONFIG.maxPerType). The card is still usable.
 */
function updateQuestionCardChipFullBadges() {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
  const cards = document.querySelectorAll('.picker-card');
  cards.forEach((card) => {
    let diff = null;
    if (card.classList && typeof card.classList.contains === 'function') {
      if (card.classList.contains('easy')) diff = 'easy';
      else if (card.classList.contains('medium')) diff = 'medium';
      else if (card.classList.contains('hard')) diff = 'hard';
    }

    if (!diff) return;
    const reward = getRewardChipForDifficulty(diff);
    if (!reward) return;

    if (typeof card.querySelector === 'function') {
      const fullBadge = card.querySelector('.chip-full-badge');
      if (fullBadge && fullBadge.classList) {
        const count = getChipCount(reward.id);
        if (count >= ITEM_CONFIG.maxPerType) {
          fullBadge.classList.add('visible');
        } else {
          fullBadge.classList.remove('visible');
        }
      }
    }
  });
}

/**
 * triggerCardDropAnimation(difficulty, droppedChipId)
 * Plays the drop animation on the chosen question card:
 * - If droppedChipId: "pop" animation on chip image (scale up then down with steps(2) sparkle)
 *   and float a "+1" upward from the icon.
 * - If nothing drops: tiny dim flicker on chip image only (no "no drop" message).
 */
function triggerCardDropAnimation(difficulty, droppedChipId) {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return;
  const diff = String(difficulty || '').toLowerCase().trim();
  const card = document.querySelector('.picker-card.selected') || document.querySelector(`.picker-card.${diff}`);

  if (card && typeof card.querySelector === 'function') {
    const canvas = card.querySelector('.card-chip-canvas');
    const wrapper = card.querySelector('.card-chip-wrapper');
    if (canvas && canvas.classList) {
      if (droppedChipId) {
        // Pop animation on chip image
        canvas.classList.remove('chip-pop-anim');
        canvas.classList.remove('chip-dim-flicker');
        if (typeof canvas.offsetWidth !== 'undefined') void canvas.offsetWidth;
        canvas.classList.add('chip-pop-anim');

        // Float "+1" upward from icon
        if (wrapper && typeof wrapper.appendChild === 'function') {
          if (typeof wrapper.querySelectorAll === 'function') {
            const existingFloats = wrapper.querySelectorAll('.chip-floating-plus');
            existingFloats.forEach((f) => f.remove());
          }

          const floatEl = document.createElement('span');
          floatEl.className = 'chip-floating-plus font-pixel';
          floatEl.textContent = '+1';
          wrapper.appendChild(floatEl);

          setTimeout(() => {
            if (floatEl && floatEl.parentNode) {
              floatEl.parentNode.removeChild(floatEl);
            }
          }, 950);
        }

        setTimeout(() => {
          canvas.classList.remove('chip-pop-anim');
        }, 750);
      } else {
        // Tiny dim flicker on chip image only, no message
        canvas.classList.remove('chip-pop-anim');
        canvas.classList.remove('chip-dim-flicker');
        void canvas.offsetWidth;
        canvas.classList.add('chip-dim-flicker');

        setTimeout(() => {
          canvas.classList.remove('chip-dim-flicker');
        }, 450);
      }
    }
  }

  // Also animate mini preview chip canvas in difficulty bar tab if present
  try {
    const tab = document.querySelector(`.picker-diff-tab.${diff}`) || document.querySelector('.picker-diff-tab.active');
    if (tab && typeof tab.querySelector === 'function') {
      const tabCanvas = tab.querySelector('.diff-tab-chip-canvas');
      if (tabCanvas && tabCanvas.classList) {
        if (droppedChipId) {
          tabCanvas.classList.remove('chip-pop-anim');
          tabCanvas.classList.remove('chip-dim-flicker');
          if (typeof tabCanvas.offsetWidth !== 'undefined') void tabCanvas.offsetWidth;
          tabCanvas.classList.add('chip-pop-anim');
          setTimeout(() => tabCanvas.classList.remove('chip-pop-anim'), 750);
        } else {
          tabCanvas.classList.remove('chip-pop-anim');
          tabCanvas.classList.remove('chip-dim-flicker');
          if (typeof tabCanvas.offsetWidth !== 'undefined') void tabCanvas.offsetWidth;
          tabCanvas.classList.add('chip-dim-flicker');
          setTimeout(() => tabCanvas.classList.remove('chip-dim-flicker'), 450);
        }
      }
    }
  } catch (e) {
    // Tab animation optional
  }
}

/**
 * showRewardPopup(chipId)
 * Shows a pixel pop-up in #output-console: "ITEM FOUND! +1 [chip name]"
 * with chip icon, sparkle animation (CSS steps()), and rising chime sound.
 * Advance chip gets a bigger, golden effect.
 */
function showRewardPopup(chipId) {
  if (typeof document === 'undefined') return;
  const chip = CHIPS[chipId];
  if (!chip) return;

  const consoleSection = document.getElementById('output-console');
  if (!consoleSection) return;

  // Unhide console if currently hidden so reward is visible
  if (consoleSection.classList.contains('card-hidden')) {
    if (typeof window !== 'undefined' && typeof window.setConsoleVisibility === 'function') {
      window.setConsoleVisibility(true);
    } else {
      consoleSection.classList.remove('card-hidden');
    }
  }

  // Clear existing pop-up if one is active
  const existing = consoleSection.querySelector('.chip-reward-popup');
  if (existing) {
    existing.remove();
  }

  const isAdvance = chipId === 'advance';
  const popup = document.createElement('div');
  popup.className = `chip-reward-popup font-pixel ${isAdvance ? 'advance-gold' : ''}`;
  popup.setAttribute('role', 'status');
  popup.setAttribute('aria-live', 'polite');

  const canvasSize = isAdvance ? 30 : 20;
  const canvasScale = isAdvance ? 3 : 2;

  popup.innerHTML = `
    <div class="reward-sparkles left font-pixel" aria-hidden="true">✦ ✧ ✦</div>
    <canvas class="reward-icon-canvas" width="${canvasSize}" height="${canvasSize}"></canvas>
    <div class="reward-text-wrap">
      <div class="reward-title-banner">ITEM FOUND!</div>
      <div class="reward-chip-name">+1 ${chip.name.toUpperCase()}</div>
    </div>
    <div class="reward-sparkles right font-pixel" aria-hidden="true">✦ ✧ ✦</div>
  `;

  consoleSection.appendChild(popup);

  const canvas = popup.querySelector('.reward-icon-canvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    drawChipIcon(ctx, chipId, 0, 0, canvasScale);
  }

  // Rising chime sound
  if (typeof window !== 'undefined' && window.playSound) {
    if (isAdvance) {
      window.playSound('item_found_advance');
    } else {
      window.playSound('item_found');
    }
  }

  // Auto fade and remove after 2.5s (2500ms) per spec
  setTimeout(() => {
    if (popup && popup.parentElement) {
      popup.classList.add('fade-out');
      setTimeout(() => {
        if (popup && popup.parentElement) {
          popup.remove();
        }
      }, 400);
    }
  }, 2500);
}

/**
 * simulateChipDrops(passesPerDifficulty = 1000)
 * Simulates passesPerDifficulty passes per difficulty and prints the real drop rate.
 * Checks that advance is rarest and numbers match the config.
 */
function simulateChipDrops(passesPerDifficulty = 1000) {
  const passes = Math.max(1, passesPerDifficulty);
  const diffs = ['easy', 'medium', 'hard'];
  const summary = {};

  diffs.forEach((diff) => {
    const chip = Object.values(CHIPS).find(c => c.sourceDifficulty === diff);
    let drops = 0;
    for (let i = 0; i < passes; i++) {
      const dropped = rollChipDrop(diff);
      if (dropped) drops++;
    }
    const realRate = drops / passes;
    summary[diff] = {
      chipId: chip ? chip.id : null,
      chipName: chip ? chip.name : null,
      difficulty: diff,
      drops,
      passes,
      realDropRate: realRate,
      realDropPercent: `${(realRate * 100).toFixed(1)}%`,
      configRate: chip ? chip.dropChance : 0,
      configPercent: `${((chip ? chip.dropChance : 0) * 100).toFixed(0)}%`,
      heal: chip ? chip.heal : 0,
      rarityLabel: chip ? chip.rarityLabel : ''
    };
  });

  const lowRate = summary.easy ? summary.easy.realDropRate : 0;
  const normalRate = summary.medium ? summary.medium.realDropRate : 0;
  const advanceRate = summary.hard ? summary.hard.realDropRate : 0;

  summary.advanceIsRarest = advanceRate < normalRate && normalRate < lowRate;

  if (typeof console !== 'undefined') {
    if (typeof console.table === 'function') {
      console.log(`[CHIP DROP SIMULATION: ${passes} PASSES PER DIFFICULTY]`);
      console.table(summary);
    } else {
      console.log('[CHIP DROP SIMULATION]:', summary);
    }
    console.log(`Advance is rarest (${summary.hard.realDropPercent} < ${summary.medium.realDropPercent} < ${summary.easy.realDropPercent}):`, summary.advanceIsRarest ? 'PASS ✓' : 'FAIL ✗');
  }

  return summary;
}

// Global browser attachments
if (typeof window !== 'undefined') {
  window.CHIPS = CHIPS;
  window.ITEM_CONFIG = ITEM_CONFIG;
  window.CHIP_PALETTE = CHIP_PALETTE;
  window.CHIP_PIXEL_ART = CHIP_PIXEL_ART;
  window.drawChipIcon = drawChipIcon;
  window.rollChipDrop = rollChipDrop;
  window.addChip = addChip;
  window.getChipCount = getChipCount;
  window.hasAnyChip = hasAnyChip;
  window.removeChip = removeChip;
  window.saveInventory = saveInventory;
  window.loadInventory = loadInventory;
  window.clearInventory = clearInventory;
  window.resetInventory = resetInventory;
  window.resetProgress = clearInventory;
  window.debugGiveChip = debugGiveChip;
  window.useChip = useChip;
  window.resetChipsUsedThisTurn = resetChipsUsedThisTurn;
  window.getChipsUsedThisTurn = getChipsUsedThisTurn;
  window.selectChipSlot = selectChipSlot;
  window.getRewardChipForDifficulty = getRewardChipForDifficulty;
  window.updateQuestionCardChipFullBadges = updateQuestionCardChipFullBadges;
  window.triggerCardDropAnimation = triggerCardDropAnimation;
  window.updateChipInventoryBar = updateChipInventoryBar;
  window.showRewardPopup = showRewardPopup;
  window.simulateChipDrops = simulateChipDrops;
  window.showFloatingHeal = showFloatingHeal;

  // Ensure window.gameState has all baseline fields and loaded inventory
  window.gameState = window.gameState || {};
  if (window.gameState.player === undefined) window.gameState.player = null;
  if (window.gameState.enemy === undefined) window.gameState.enemy = null;
  if (window.gameState.turn === undefined) window.gameState.turn = 1;
  if (window.gameState.score === undefined) window.gameState.score = 0;
  if (window.gameState.phase === undefined) window.gameState.phase = 'idle';
  if (!window.gameState.stats) {
    window.gameState.stats = { chipsFound: 0, chipsUsed: 0 };
  }
  if (!window.gameState.inventory) {
    window.gameState.inventory = loadInventory();
  }
  window.gameState.addChip = addChip;
  window.gameState.getChipCount = getChipCount;
  window.gameState.hasAnyChip = hasAnyChip;
  window.gameState.removeChip = removeChip;
  window.gameState.useChip = useChip;
  window.gameState.clearInventory = clearInventory;
  window.gameState.resetInventory = resetInventory;

  // Auto-init quickbar and card badges upon DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        updateChipInventoryBar();
      });
    } else {
      updateChipInventoryBar();
    }
  }
}

// CommonJS export support for automated test suites
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHIPS,
    ITEM_CONFIG,
    CHIP_PALETTE,
    CHIP_PIXEL_ART,
    drawChipIcon,
    getRewardChipForDifficulty,
    updateQuestionCardChipFullBadges,
    triggerCardDropAnimation,
    rollChipDrop,
    addChip,
    getChipCount,
    hasAnyChip,
    removeChip,
    saveInventory,
    loadInventory,
    clearInventory,
    resetInventory,
    debugGiveChip,
    useChip,
    resetChipsUsedThisTurn,
    getChipsUsedThisTurn,
    selectChipSlot,
    updateChipInventoryBar,
    showRewardPopup,
    simulateChipDrops,
    showFloatingHeal
  };
}
