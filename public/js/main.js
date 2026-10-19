/**
 * Main Controller: Screen Switching, 160x144 Canvas Rendering & Codemon Selection
 * Mirai-Game / CODAK Platform
 */

// Global Game State
window.gameState = Object.assign({
  player: null,
  enemy: null,
  turn: 1,
  score: 0,
  phase: 'idle',
  inventory: { low: 0, normal: 0, advance: 0 }
}, window.gameState);

if (!window.gameState.inventory) {
  window.gameState.inventory = (typeof loadInventory === 'function')
    ? loadInventory()
    : { low: 0, normal: 0, advance: 0 };
} else if (typeof loadInventory === 'function') {
  window.gameState.inventory = loadInventory();
}

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const gamePanel = document.getElementById('game-panel');
  const codePanel = document.getElementById('code-panel');
  const codeLockedOverlay = document.getElementById('code-panel-locked');

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
  }

  const screens = {
    title: document.getElementById('screen-title'),
    select: document.getElementById('screen-select'),
    battle: document.getElementById('screen-battle')
  };

  const btnHowToPlay = document.getElementById('btn-how-to-play');
  const howToPlayBox = document.getElementById('how-to-play-box');
  const btnCloseHowToPlay = document.getElementById('btn-close-how-to-play');

  const btnStartGame = document.getElementById('btn-start-game');
  const btnBackToTitle = document.getElementById('btn-back-to-title');
  const btnConfirmStarter = document.getElementById('btn-confirm-starter');
  const btnForfeitBattle = document.getElementById('btn-forfeit-battle');
  const btnBugMode = document.getElementById('btn-bug-mode');
  const startersContainer = document.getElementById('starters-list');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const musicToggleBtn = document.getElementById('music-toggle-btn');
  const effectsToggleBtn = document.getElementById('effects-toggle-btn');

  // Pause Menu & HUD Pause DOM Elements
  const btnHudPause = document.getElementById('btn-hud-pause');
  const pauseMenuOverlay = document.getElementById('pause-menu-overlay');
  const btnPauseResume = document.getElementById('btn-pause-resume');
  const btnPauseMute = document.getElementById('btn-pause-mute');
  const btnPauseMusic = document.getElementById('btn-pause-music');
  const btnPauseEffects = document.getElementById('btn-pause-effects');
  const btnPauseQuit = document.getElementById('btn-pause-quit');

  // Code Panel DOM Elements
  const pickerCardsContainer = document.getElementById('picker-cards-container');
  const pickerDifficultyBar = document.getElementById('picker-difficulty-bar');
  const pickerStatusBadge = document.getElementById('picker-status-badge');
  const pickerBody = document.getElementById('picker-body');
  const pickerExpandedOverlay = document.getElementById('picker-expanded-overlay');
  const pickerExpandedTabs = document.getElementById('picker-expanded-tabs');
  const pickerExpandedBody = document.getElementById('picker-expanded-body');

  const currentChallengeBadge = document.getElementById('current-challenge-badge');
  const turnTimerText = document.getElementById('turn-timer-text');
  const turnTimerFill = document.getElementById('turn-timer-fill');

  const editorChallengeTitle = document.getElementById('editor-challenge-title');
  const editorChallengeTopic = document.getElementById('editor-challenge-topic');
  const editorChallengeDesc = document.getElementById('editor-challenge-desc');
  const challengeHintBox = document.getElementById('challenge-hint-box');
  const challengeHintText = document.getElementById('challenge-hint-text');

  const editorGutter = document.getElementById('editor-gutter');
  const codeTextarea = document.getElementById('code-textarea');

  const btnRunTests = document.getElementById('btn-run-tests');
  const btnDevPower = document.getElementById('btn-dev-power');
  const btnInventory = document.getElementById('btn-inventory');
  const btnInventoryBattle = document.getElementById('btn-inventory-battle');
  const btnHolyHeal = document.getElementById('btn-holy-heal');
  const btnHint = document.getElementById('btn-hint');
  const btnResetCode = document.getElementById('btn-reset-code');

  const inventoryOverlay = document.getElementById('inventory-overlay');
  const btnInventoryClose = document.getElementById('btn-inventory-close');
  const btnInventoryCloseBottom = document.getElementById('btn-inventory-close-bottom');
  const inventoryItemsContainer = document.getElementById('inventory-items-container');
  const invActiveCodemon = document.getElementById('inv-active-codemon');
  const invActiveHp = document.getElementById('inv-active-hp');
  const invActiveTurns = document.getElementById('inv-active-turns');

  const consoleStatusBadge = document.getElementById('console-status-badge');
  const consoleOutput = document.getElementById('console-output');

  // State
  let currentScreen = 'title';
  let selectedIndex = 0;
  let selectedCodemon = null;
  let activeEnemy = null;
  let isGamePaused = false;
  let isTimerPaused = false;
  let isQuestionLocked = false;

  // Sound state with localStorage persistence
  let soundEnabled = true;
  try {
    const savedMute = localStorage.getItem('codemons_sound_muted');
    if (savedMute !== null) {
      soundEnabled = (savedMute !== 'true');
    }
  } catch {
    soundEnabled = true;
  }

  // Accessibility effects state with localStorage persistence
  let effectsDisabled = false;
  try {
    const savedEffects = localStorage.getItem('codemons_disable_effects');
    if (savedEffects !== null) {
      effectsDisabled = (savedEffects === 'true');
    } else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      effectsDisabled = true;
    }
  } catch {
    effectsDisabled = false;
  }

  function updateSoundUI() {
    if (soundToggleBtn) {
      soundToggleBtn.textContent = soundEnabled ? 'SFX: ON' : 'SFX: OFF';
      soundToggleBtn.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
    }
    if (btnPauseMute) {
      btnPauseMute.textContent = soundEnabled ? '🔊 MUTE SOUND' : '🔇 UNMUTE SOUND';
      btnPauseMute.setAttribute('aria-pressed', soundEnabled ? 'false' : 'true');
    }
    if (window.MusicEngine && window.MusicEngine.updateMusicUI) {
      window.MusicEngine.updateMusicUI();
    }
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    try {
      localStorage.setItem('codemons_sound_muted', soundEnabled ? 'false' : 'true');
    } catch {}
    updateSoundUI();
    if (soundEnabled) {
      playSound('click');
    }
  }

  function toggleMusic() {
    if (window.toggleBgm) {
      window.toggleBgm();
    } else if (window.MusicEngine && window.MusicEngine.toggleBgm) {
      window.MusicEngine.toggleBgm();
    }
  }

  function updateEffectsUI() {
    if (typeof document !== 'undefined' && document.body) {
      if (effectsDisabled) {
        document.body.classList.add('reduce-motion-active');
      } else {
        document.body.classList.remove('reduce-motion-active');
      }
    }
    if (effectsToggleBtn) {
      effectsToggleBtn.textContent = effectsDisabled ? '⚡ FX: OFF' : '⚡ FX: ON';
      effectsToggleBtn.setAttribute('aria-pressed', effectsDisabled ? 'false' : 'true');
    }
    if (btnPauseEffects) {
      btnPauseEffects.textContent = effectsDisabled ? '⚡ ENABLE EFFECTS' : '⚡ DISABLE EFFECTS';
      btnPauseEffects.setAttribute('aria-pressed', effectsDisabled ? 'true' : 'false');
    }
  }

  function toggleEffects() {
    effectsDisabled = !effectsDisabled;
    try {
      localStorage.setItem('codemons_disable_effects', effectsDisabled ? 'true' : 'false');
    } catch {}
    updateEffectsUI();
    playSound('click');
  }

  window.isEffectsDisabled = () => effectsDisabled;
  window.toggleSound = toggleSound;
  window.toggleEffects = toggleEffects;

  updateSoundUI();
  updateEffectsUI();
  let challengesCatalog = [];
  let animFrameId = null;
  let animTick = 0;

  // Battle & Turn State
  let battleActive = false;
  let currentPoints = 0;
  function getMinPoints() {
    return (typeof window !== 'undefined' && window.BATTLE_CONFIG && window.BATTLE_CONFIG.minPoints) || 120;
  }
  let targetPoints = getMinPoints();
  let turnsLeft = (typeof window !== 'undefined' && window.BATTLE_CONFIG && window.BATTLE_CONFIG.turnLimit) || 8;
  const battleUsedChallenges = new Set();
  let currentTurnCards = [];
  let activeChallenge = null;
  let hintUsedThisTurn = false;
  let turnTimerId = null;
  let timerRemaining = 0;
  let timerTotal = 60;
  let isTestingCode = false;

  // Web Audio Context for Retro 8-bit Sound FX
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      function playTone(freq, startOffset, duration, waveType = 'square', peakGain = 0.16) {
        const toneOsc = ctx.createOscillator();
        const toneGain = ctx.createGain();
        toneOsc.type = waveType;
        toneOsc.frequency.setValueAtTime(freq, now + startOffset);
        toneGain.gain.setValueAtTime(peakGain, now + startOffset);
        toneGain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
        toneOsc.connect(toneGain);
        toneGain.connect(ctx.destination);
        toneOsc.start(now + startOffset);
        toneOsc.stop(now + startOffset + duration);
      }

      function playNoiseBurst(duration = 0.12, centerFreq = 1100, peakGain = 0.24) {
        try {
          const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(centerFreq, now);
          filter.Q.setValueAtTime(1.2, now);
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(peakGain, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + duration);
        } catch {
          const fallbackOsc = ctx.createOscillator();
          const fallbackGain = ctx.createGain();
          fallbackOsc.type = 'sawtooth';
          fallbackOsc.frequency.setValueAtTime(centerFreq, now);
          fallbackOsc.frequency.exponentialRampToValueAtTime(40, now + duration);
          fallbackGain.gain.setValueAtTime(peakGain, now);
          fallbackGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
          fallbackOsc.connect(fallbackGain);
          fallbackGain.connect(ctx.destination);
          fallbackOsc.start(now);
          fallbackOsc.stop(now + duration);
        }
      }

      const t = (type || '').toLowerCase();

      if (t === 'correct' || t === 'correct answer') {
        // Rising two-note chime (C5 523.25Hz -> G5 783.99Hz)
        playTone(523.25, 0.00, 0.09, 'square', 0.14);
        playTone(783.99, 0.09, 0.18, 'square', 0.16);
      } else if (t === 'wrong' || t === 'wrong answer') {
        // Low buzz (descending raspy sawtooth 115Hz -> 75Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(115, now);
        osc.frequency.linearRampToValueAtTime(75, now + 0.22);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (t === 'hit') {
        // Short noise burst
        playNoiseBurst(0.12, 1000, 0.24);
      } else if (t === 'level-up' || t === 'levelup' || t === 'level_up') {
        // 4-note ascending arpeggio (C5 -> E5 -> G5 -> C6)
        playTone(523.25, 0.00, 0.08, 'square', 0.15);
        playTone(659.25, 0.07, 0.08, 'square', 0.15);
        playTone(783.99, 0.14, 0.08, 'square', 0.16);
        playTone(1046.50, 0.21, 0.22, 'square', 0.20);
      } else if (t === 'bugmon_transform' || t === 'transform' || t === 'glitch') {
        // Descending glitch (pitch drop + noise crackle)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1100, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.38);
        gain.gain.setValueAtTime(0.24, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.40);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.40);
        playNoiseBurst(0.24, 750, 0.18);
      } else if (t === 'victory' || t === 'victory jingle') {
        // Victory jingle (8-bit celebratory motif)
        playTone(392.00, 0.00, 0.08, 'square', 0.14); // G4
        playTone(523.25, 0.08, 0.08, 'square', 0.15); // C5
        playTone(659.25, 0.16, 0.08, 'square', 0.15); // E5
        playTone(783.99, 0.24, 0.14, 'square', 0.18); // G5
        playTone(659.25, 0.40, 0.08, 'square', 0.15); // E5
        playTone(783.99, 0.48, 0.16, 'square', 0.18); // G5
        playTone(1046.50, 0.64, 0.35, 'square', 0.22); // C6
      } else if (t === 'defeat' || t === 'defeat jingle') {
        // Defeat jingle (sad descending minor motif)
        playTone(622.25, 0.00, 0.12, 'triangle', 0.18); // Eb5
        playTone(587.33, 0.12, 0.12, 'triangle', 0.18); // D5
        playTone(523.25, 0.24, 0.14, 'triangle', 0.18); // C5
        playTone(415.30, 0.38, 0.16, 'triangle', 0.16); // Ab4
        playTone(392.00, 0.54, 0.38, 'triangle', 0.14); // G4
      } else if (t === 'click') {
        playTone(440, 0.00, 0.04, 'triangle', 0.12);
        playTone(880, 0.04, 0.04, 'triangle', 0.10);
      } else if (t === 'select') {
        playTone(520, 0.00, 0.07, 'square', 0.12);
        playTone(780, 0.07, 0.08, 'square', 0.12);
      } else if (t === 'battle') {
        playTone(220, 0.00, 0.10, 'sawtooth', 0.16);
        playTone(440, 0.10, 0.10, 'sawtooth', 0.16);
        playTone(880, 0.20, 0.18, 'sawtooth', 0.18);
      } else if (t === 'heal') {
        playTone(523.25, 0.00, 0.08, 'triangle', 0.18);
        playTone(659.25, 0.08, 0.08, 'triangle', 0.18);
        playTone(783.99, 0.16, 0.08, 'triangle', 0.18);
        playTone(1046.50, 0.24, 0.20, 'triangle', 0.20);
      } else if (t === 'item_found' || t === 'item_found_chip' || t === 'chip_found') {
        // Rising chime sound (C5 -> E5 -> G5 -> B5 -> C6)
        playTone(523.25, 0.00, 0.08, 'triangle', 0.18);
        playTone(659.25, 0.07, 0.08, 'triangle', 0.18);
        playTone(783.99, 0.14, 0.08, 'triangle', 0.18);
        playTone(987.77, 0.21, 0.08, 'triangle', 0.20);
        playTone(1046.50, 0.28, 0.25, 'triangle', 0.22);
      } else if (t === 'item_found_advance') {
        // Golden advance chip chime sound (larger, sparkling higher chords)
        playTone(523.25, 0.00, 0.07, 'square', 0.14);
        playTone(659.25, 0.06, 0.07, 'square', 0.15);
        playTone(783.99, 0.12, 0.07, 'square', 0.16);
        playTone(1046.50, 0.18, 0.08, 'square', 0.18);
        playTone(1318.51, 0.25, 0.30, 'square', 0.22);
      } else if (t === 'static') {
        playNoiseBurst(0.28, 1400, 0.25);
      }
    } catch {
      // Audio playback blocked or unsupported
    }
  }

  // Expose sound system globally for battle module and code panel
  window.playSound = playSound;

  // Load challenges data from data/challenges.json
  try {
    const res = await fetch('data/challenges.json');
    if (res.ok) {
      challengesCatalog = await res.json();
    }
  } catch (err) {
    console.warn('Could not load data/challenges.json:', err);
  }
  window.challengesCatalog = challengesCatalog;

  // Starters Catalog from js/data.js (CODEMONS)
  const starters = window.CODEMONS || (window.CodemonData ? window.CodemonData.CODEMONS : []);
  const enemyList = window.ENEMY_CHARACTERS || (window.CodemonData ? window.CodemonData.ENEMY_CHARACTERS : []);
  activeEnemy = (enemyList && enemyList.length > 0)
    ? enemyList[0]
    : (window.ENEMY_BUGMON || (window.CodemonData ? window.CodemonData.ENEMY_BUGMON : {
    id: 'bugmon',
    name: 'Bugmon',
    language: 'Bug/Glitch',
    maxHp: 130,
    hp: 130,
    attackPower: 1.0,
    spriteFront: 'assets/nullpointer.svg',
    spriteBack: 'assets/nullpointer.svg',
    moves: [{ name: 'Segfault Slam', power: 26 }]
  }));
  
  selectedCodemon = starters[0] || null;

  // -------------------------------------------------------------------------
  // 160x144 RETRO CANVAS PIXEL RENDERER
  // -------------------------------------------------------------------------
  function drawPixelRect(x, y, w, h, color) {
    if (!ctx) return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }

  function renderGameScene() {
    if (!ctx) return;
    animTick++;

    // Clear low-res 160x144 canvas with dark background
    ctx.fillStyle = '#0c1015';
    ctx.fillRect(0, 0, 160, 144);

    if (currentScreen === 'title') {
      // 1. Sky / Arena Ceiling Grid
      for (let y = 0; y < 70; y += 8) {
        drawPixelRect(0, y, 160, 1, '#1b2632');
      }

      // 2. Horizon divider
      drawPixelRect(0, 72, 160, 2, '#2c3e50');

      // 3. Ground Arena Matrix Floor
      for (let y = 74; y < 144; y += 10) {
        drawPixelRect(0, y, 160, 1, '#1b2632');
      }
      for (let x = 0; x < 160; x += 16) {
        drawPixelRect(x, 74, 1, 70, '#1b2632');
      }

      // 4. Logo Banner Box (160x144 Pixel Art)
      drawPixelRect(16, 20, 128, 36, '#1b2632');
      drawPixelRect(14, 18, 132, 40, '#2c3e50');
      drawPixelRect(18, 22, 124, 32, '#0c1015');

      // Title Text
      ctx.fillStyle = '#f4b41b';
      ctx.font = '8px monospace';
      ctx.fillText('CODEMONS', 48, 36);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '6px monospace';
      ctx.fillText('BYTE BATTLE ARENA', 30, 47);

      // Blinking Prompt
      if (Math.floor(animTick / 30) % 2 === 0) {
        ctx.fillStyle = '#38b764';
        ctx.font = '6px monospace';
        ctx.fillText('► PRESS START BATTLE', 26, 92);
      }

      // Small pixel mascot sprite on canvas
      const bob = Math.sin(animTick * 0.1) * 2;
      drawPixelRect(74, 106 + bob, 14, 14, '#f4b41b');
      drawPixelRect(76, 110 + bob, 2, 3, '#0c1015');
      drawPixelRect(82, 110 + bob, 2, 3, '#0c1015');
      drawPixelRect(78, 116 + bob, 4, 1, '#e03c3c');

    } else if (currentScreen === 'select') {
      // Starter Selection View on 160x144 Canvas
      drawPixelRect(0, 0, 160, 24, '#1b2632');
      drawPixelRect(0, 24, 160, 2, '#2c3e50');

      ctx.fillStyle = '#eef5fc';
      ctx.font = '6px monospace';
      ctx.fillText('CHOOSE YOUR CODEMON', 20, 16);

      // 3 Starter Podiums: Pyrawr, Jaskull, Cplusaur
      const podiums = [
        { name: 'PYRAWR',   color: '#f4b41b', x: 26 },
        { name: 'JASKULL',  color: '#eef5fc', x: 80 },
        { name: 'CPLUSAUR', color: '#38bdf8', x: 134 }
      ];

      podiums.forEach((st, idx) => {
        const isSel = idx === selectedIndex;
        const bob = isSel ? Math.sin(animTick * 0.15) * 3 : 0;

        // Podium Base
        drawPixelRect(st.x - 14, 100, 28, 8, isSel ? '#526f8a' : '#1b2632');
        drawPixelRect(st.x - 16, 102, 32, 4, isSel ? '#f4b41b' : '#2c3e50');

        // Sprite Silhouette
        drawPixelRect(st.x - 8, 76 + bob, 16, 18, st.color);
        drawPixelRect(st.x - 5, 80 + bob, 3, 4, '#0c1015');
        drawPixelRect(st.x + 2, 80 + bob, 3, 4, '#0c1015');

        // Selection Marker Arrow
        if (isSel) {
          ctx.fillStyle = '#f4b41b';
          ctx.font = '6px monospace';
          ctx.fillText('▲', st.x - 3, 118);

          // Name under podium
          ctx.fillStyle = '#38b764';
          ctx.font = '5px monospace';
          ctx.fillText(st.name, st.x - 14, 128);
        }
      });

    } else if (currentScreen === 'battle') {
      // Delegate battle scene rendering to BattleEngine
      if (window.BattleEngine && typeof window.BattleEngine.render === 'function') {
        window.BattleEngine.render(ctx, animTick);
      }
    }

    animFrameId = requestAnimationFrame(renderGameScene);
  }

  // Start continuous 160x144 canvas loop
  renderGameScene();

  // -------------------------------------------------------------------------
  // SCREEN MANAGER: showScreen() swaps screens inside #game-panel ONLY
  // -------------------------------------------------------------------------
  function showScreen(targetScreen) {
    playSound('click');
    const wipeEl = document.getElementById('screen-wipe-overlay');
    const effectsOff = (window.isEffectsDisabled && window.isEffectsDisabled());
    const prevScreen = currentScreen;
    currentScreen = targetScreen;

    if (targetScreen === 'select') {
      renderStarters();
    }

    // Play appropriate retro BGM based on active screen
    if (targetScreen === 'title' || targetScreen === 'select') {
      if (window.playBgm) {
        window.playBgm('title');
      }
    } else if (targetScreen === 'battle') {
      if (window.playBgm) {
        window.playBgm('battle');
      }
    }

    // Swap active screen inside #game-panel
    Object.keys(screens).forEach((key) => {
      if (screens[key]) {
        if (key === targetScreen) {
          screens[key].classList.add('active');
          screens[key].setAttribute('aria-hidden', 'false');
        } else {
          screens[key].classList.remove('active');
          screens[key].setAttribute('aria-hidden', 'true');
        }
      }
    });

    // Control dialogue overlay on canvas
    const dialogueOverlay = document.getElementById('battle-dialogue-overlay');
    if (dialogueOverlay) {
      if (targetScreen === 'battle') {
        dialogueOverlay.classList.add('active');
        if (window.updateChipInventoryBar) {
          window.updateChipInventoryBar();
        }
        if (window.snapCanvasPixelScale) {
          requestAnimationFrame(() => {
            window.snapCanvasPixelScale();
          });
        }
      } else {
        dialogueOverlay.classList.remove('active');
      }
    }

    // Control #code-panel separately:
    // "Until a battle starts, show a message in #code-panel: START A BATTLE TO UNLOCK THE CODE LAB"
    if (codeLockedOverlay) {
      if (targetScreen === 'battle') {
        codeLockedOverlay.classList.add('unlocked');
      } else {
        codeLockedOverlay.classList.remove('unlocked');
        battleActive = false;
        stopTurnTimer();
      }
    }

    if (gamePanel) {
      gamePanel.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Visual horizontal wipe screen transition
    if (wipeEl && !effectsOff && targetScreen !== prevScreen) {
      wipeEl.classList.remove('wipe-out');
      wipeEl.classList.add('wipe-in');
      setTimeout(() => {
        wipeEl.classList.remove('wipe-in');
        wipeEl.classList.add('wipe-out');
        setTimeout(() => {
          wipeEl.classList.remove('wipe-out');
        }, 220);
      }, 160);
    }
  }

  // Backward compatibility alias
  window.showScreen = showScreen;
  window.switchScreen = showScreen;

  // -------------------------------------------------------------------------
  // STARTER CODEMON SELECTION & KEYBOARD SUPPORT
  // -------------------------------------------------------------------------
  function renderStarters() {
    if (!startersContainer) return;
    startersContainer.innerHTML = '';

    const codemonsList = window.CODEMONS || (window.CodemonData ? window.CodemonData.CODEMONS : []);

    codemonsList.forEach((codemon, idx) => {
      const card = document.createElement('div');
      card.className = `starter-pixel-card ${idx === selectedIndex ? 'selected' : ''}`;
      card.id = `starter-${codemon.id}`;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${codemon.name}, ${codemon.language} type, HP ${codemon.maxHp}, Attack Power ${codemon.attackPower}`);

      card.innerHTML = `
        <div class="starter-pixel-img">
          <img src="${codemon.spriteFront}" alt="${codemon.name}" width="64" height="64" class="starter-sprite-img" />
        </div>
        <div class="starter-pixel-name font-pixel text-yellow">${codemon.name}</div>
        <div class="starter-pixel-lang font-pixel">
          <span class="lang-badge">${codemon.language}</span>
        </div>
        <div class="starter-pixel-stats font-pixel">
          <span class="stat-hp">HP ${codemon.maxHp}</span>
          <span class="stat-atk">ATK ${codemon.attackPower}x</span>
        </div>
        <div class="starter-pixel-desc font-code">${codemon.description}</div>
        <div class="starter-pixel-moves font-code">
          <span class="moves-count-label text-green">MOVES (${(codemon.moves || []).length}):</span>
          <div class="moves-chips-row">${(codemon.moves || []).slice(0, 3).map(m => `<span class="move-mini-chip">${m.name}</span>`).join('')}</div>
        </div>
      `;

      // Arrow-key focusing highlights card
      card.addEventListener('focus', () => {
        selectStarterIndex(idx, false);
      });

      // Clicking a card selects it. If already selected, confirms and enters battle.
      card.addEventListener('click', () => {
        if (selectedIndex === idx) {
          confirmStarterChoice();
        } else {
          selectStarterIndex(idx, true);
        }
      });

      // Double-clicking immediately confirms and enters battle
      card.addEventListener('dblclick', () => {
        selectStarterIndex(idx, false);
        confirmStarterChoice();
      });

      startersContainer.appendChild(card);
    });

    selectStarterIndex(selectedIndex, false);
  }

  function selectStarterIndex(index, playSfx = true) {
    const codemonsList = window.CODEMONS || (window.CodemonData ? window.CodemonData.CODEMONS : []);
    if (!codemonsList.length) return;

    selectedIndex = Math.max(0, Math.min(index, codemonsList.length - 1));
    selectedCodemon = codemonsList[selectedIndex];

    const cards = document.querySelectorAll('.starter-pixel-card');
    cards.forEach((card, idx) => {
      if (idx === selectedIndex) {
        card.classList.add('selected');
        card.setAttribute('aria-selected', 'true');
      } else {
        card.classList.remove('selected');
        card.setAttribute('aria-selected', 'false');
      }
    });

    if (btnConfirmStarter && selectedCodemon) {
      btnConfirmStarter.textContent = `CONFIRM ${selectedCodemon.name} ▶`;
    }

    if (playSfx) {
      playSound('select');
    }
  }

  function moveSelection(direction) {
    const codemonsList = window.CODEMONS || (window.CodemonData ? window.CodemonData.CODEMONS : []);
    if (!codemonsList.length) return;

    const len = codemonsList.length;
    const newIndex = ((selectedIndex + direction) % len + len) % len;
    selectStarterIndex(newIndex, true);

    const cards = document.querySelectorAll('.starter-pixel-card');
    if (cards[newIndex]) {
      cards[newIndex].focus();
    }
  }

  function confirmStarterChoice() {
    const codemonsList = window.CODEMONS || (window.CodemonData ? window.CodemonData.CODEMONS : []);
    if (!codemonsList.length) return;

    const chosen = codemonsList[selectedIndex] || codemonsList[0];
    selectedCodemon = chosen;

    // Store choice in global gameState object (gameState.player)
    window.gameState.player = {
      ...chosen,
      hp: chosen.maxHp,
      currentHp: chosen.maxHp
    };

    // Store enemy in gameState (pick error enemy character if not already set)
    if (!window.gameState.enemy) {
      const enemies = (window.ENEMY_CHARACTERS && window.ENEMY_CHARACTERS.length > 0)
        ? window.ENEMY_CHARACTERS
        : (window.CodemonData && window.CodemonData.ENEMY_CHARACTERS && window.CodemonData.ENEMY_CHARACTERS.length > 0)
          ? window.CodemonData.ENEMY_CHARACTERS
          : null;
      if (enemies && enemies.length > 0) {
        const randomIndex = Math.floor(Math.random() * enemies.length);
        window.gameState.enemy = { ...enemies[randomIndex] };
      } else {
        const rivals = codemonsList.filter(c => c.id !== chosen.id);
        const rivalChoice = rivals.length > 0 ? rivals[0] : (window.ENEMY_BUGMON || codemonsList[0]);
        window.gameState.enemy = { ...rivalChoice };
      }
    }

    playSound('battle');
    if (typeof clearInventory === 'function') {
      clearInventory();
    } else if (typeof window !== 'undefined' && typeof window.clearInventory === 'function') {
      window.clearInventory();
    }
    initBattle();
  }

  // -------------------------------------------------------------------------
  // CODE PANEL CONTROLLER & BATTLE ENGINE INTEGRATION
  // -------------------------------------------------------------------------

  // Output console helpers
  function clearConsole() {
    if (consoleOutput) {
      consoleOutput.innerHTML = '';
    }
  }

  function appendConsoleLine(text, className = '') {
    if (!consoleOutput) return;
    const line = document.createElement('div');
    line.className = `console-line ${className}`.trim();
    line.textContent = text;
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  function formatOutputValue(val) {
    if (val === undefined) return 'undefined';
    if (val === null) return 'null';
    if (typeof val === 'string') return `"${val}"`;
    try {
      return JSON.stringify(val);
    } catch (_) {
      return String(val);
    }
  }

  // -------------------------------------------------------------------------
  // VSCODE-LIKE CODE EDITOR CONTROLLER (AUTO-CLOSE, AUTO-INDENT, TABS & STATUS)
  // -------------------------------------------------------------------------

  // Auto-close pairs mapping
  const AUTO_CLOSE_PAIRS = {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"',
    "'": "'",
    '`': '`'
  };

  const CLOSING_CHARS = new Set([')', ']', '}', '"', "'", '`']);

  // Updates Ln X, Col Y and selection count in the VSCode status bar
  function updateCursorPos() {
    if (!codeTextarea) return;
    const pos = codeTextarea.selectionStart || 0;
    const val = codeTextarea.value || '';
    const lines = val.substring(0, pos).split('\n');
    const lineNum = lines.length;
    const colNum = lines[lines.length - 1].length + 1;

    const cursorEl = document.getElementById('editor-cursor-pos');
    if (cursorEl) {
      cursorEl.textContent = `Ln ${lineNum}, Col ${colNum}`;
    }

    const selEl = document.getElementById('editor-selection-pos');
    if (selEl) {
      const selLen = Math.abs((codeTextarea.selectionEnd || 0) - (codeTextarea.selectionStart || 0));
      selEl.textContent = selLen > 0 ? `(${selLen} selected)` : '';
    }

    // Keep active line in gutter highlighted
    updateGutter(lineNum);
  }

  // Gutter line numbers and scroll synchronization
  function updateGutter(activeLineNum) {
    if (!editorGutter || !codeTextarea) return;
    const val = codeTextarea.value || '';
    const linesCount = (val.split('\n').length) || 1;
    
    // Determine active line if not explicitly passed
    let activeLine = activeLineNum;
    if (typeof activeLine !== 'number') {
      const pos = codeTextarea.selectionStart || 0;
      activeLine = (val.substring(0, pos).split('\n').length) || 1;
    }

    // Build line numbers HTML
    let html = '';
    for (let i = 1; i <= linesCount; i++) {
      const isActive = i === activeLine;
      html += `<div class="gutter-line ${isActive ? 'active' : ''}">${i}</div>`;
    }
    editorGutter.innerHTML = html;
    editorGutter.scrollTop = codeTextarea.scrollTop;
  }

  // VSCode Undo/Redo stack for programmatic edits
  const editorHistory = {
    undoStack: [],
    redoStack: [],
    maxSize: 50,
    push(val, start, end) {
      if (this.undoStack.length > 0) {
        const last = this.undoStack[this.undoStack.length - 1];
        if (last.val === val) return;
      }
      this.undoStack.push({ val, start, end });
      if (this.undoStack.length > this.maxSize) {
        this.undoStack.shift();
      }
      this.redoStack = [];
    },
    undo(textarea) {
      if (this.undoStack.length <= 1) return false;
      const current = this.undoStack.pop();
      this.redoStack.push(current);
      const prev = this.undoStack[this.undoStack.length - 1];
      textarea.value = prev.val;
      textarea.selectionStart = prev.start;
      textarea.selectionEnd = prev.end;
      return true;
    },
    redo(textarea) {
      if (this.redoStack.length === 0) return false;
      const next = this.redoStack.pop();
      this.undoStack.push(next);
      textarea.value = next.val;
      textarea.selectionStart = next.start;
      textarea.selectionEnd = next.end;
      return true;
    }
  };

  if (codeTextarea) {
    // Record initial state
    editorHistory.push(codeTextarea.value, 0, 0);

    codeTextarea.addEventListener('input', () => {
      editorHistory.push(codeTextarea.value, codeTextarea.selectionStart, codeTextarea.selectionEnd);
      updateGutter();
      updateCursorPos();
    });

    codeTextarea.addEventListener('scroll', () => {
      if (editorGutter) {
        editorGutter.scrollTop = codeTextarea.scrollTop;
      }
    });

    codeTextarea.addEventListener('click', updateCursorPos);
    codeTextarea.addEventListener('keyup', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
        updateCursorPos();
      }
    });
    codeTextarea.addEventListener('select', updateCursorPos);

    codeTextarea.addEventListener('keydown', (e) => {
      const start = codeTextarea.selectionStart;
      const end = codeTextarea.selectionEnd;
      const val = codeTextarea.value;
      const hasSelection = start !== end;

      // 1. Undo / Redo (Ctrl+Z / Cmd+Z, Ctrl+Y / Cmd+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            editorHistory.redo(codeTextarea);
          } else {
            editorHistory.undo(codeTextarea);
          }
          updateGutter();
          updateCursorPos();
          return;
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          editorHistory.redo(codeTextarea);
          updateGutter();
          updateCursorPos();
          return;
        }
      }

      // 2. Auto-close opening brackets & quotes: (, [, {, ", ', `
      if (AUTO_CLOSE_PAIRS[e.key]) {
        const openChar = e.key;
        const closeChar = AUTO_CLOSE_PAIRS[openChar];

        // 2a. Text is selected: wrap selection with pair!
        if (hasSelection) {
          e.preventDefault();
          const selectedText = val.substring(start, end);
          codeTextarea.value = val.substring(0, start) + openChar + selectedText + closeChar + val.substring(end);
          codeTextarea.selectionStart = start + 1;
          codeTextarea.selectionEnd = end + 1;
          editorHistory.push(codeTextarea.value, codeTextarea.selectionStart, codeTextarea.selectionEnd);
          updateGutter();
          updateCursorPos();
          return;
        }

        // 2b. Quotes: don't auto-close if cursor is immediately before an identifier character
        if ((openChar === "'" || openChar === '"' || openChar === '`') && start < val.length) {
          const nextChar = val[start];
          if (/[a-zA-Z0-9_]/.test(nextChar)) {
            // Let normal typing occur
            return;
          }
        }

        // 2c. Insert pair and position cursor inside: (|)
        e.preventDefault();
        codeTextarea.value = val.substring(0, start) + openChar + closeChar + val.substring(end);
        codeTextarea.selectionStart = codeTextarea.selectionEnd = start + 1;
        editorHistory.push(codeTextarea.value, codeTextarea.selectionStart, codeTextarea.selectionEnd);
        updateGutter();
        updateCursorPos();
        return;
      }

      // 3. Overtyping closing characters: ), ], }, ", ', `
      if (CLOSING_CHARS.has(e.key) && !hasSelection) {
        if (start < val.length && val[start] === e.key) {
          e.preventDefault();
          codeTextarea.selectionStart = codeTextarea.selectionEnd = start + 1;
          updateCursorPos();
          return;
        }

        // Auto-dedent when typing closing bracket on a line that has only spaces
        if (e.key === '}' || e.key === ']' || e.key === ')') {
          const lastNl = val.lastIndexOf('\n', start - 1);
          const lineStart = lastNl === -1 ? 0 : lastNl + 1;
          const lineBefore = val.substring(lineStart, start);
          if (lineBefore.length >= 2 && /^ +$/.test(lineBefore)) {
            e.preventDefault();
            // Dedent 2 spaces and insert closing bracket
            codeTextarea.value = val.substring(0, start - 2) + e.key + val.substring(start);
            codeTextarea.selectionStart = codeTextarea.selectionEnd = start - 1;
            editorHistory.push(codeTextarea.value, codeTextarea.selectionStart, codeTextarea.selectionEnd);
            updateGutter();
            updateCursorPos();
            return;
          }
        }
      }

      // 4. Backspace with empty pair: () -> backspace deletes both!
      if (e.key === 'Backspace' && !hasSelection && start > 0 && start < val.length) {
        const prev = val[start - 1];
        const next = val[start];
        const isPair = (
          (prev === '(' && next === ')') ||
          (prev === '[' && next === ']') ||
          (prev === '{' && next === '}') ||
          (prev === '"' && next === '"') ||
          (prev === "'" && next === "'") ||
          (prev === '`' && next === '`')
        );
        if (isPair) {
          e.preventDefault();
          codeTextarea.value = val.substring(0, start - 1) + val.substring(start + 1);
          codeTextarea.selectionStart = codeTextarea.selectionEnd = start - 1;
          editorHistory.push(codeTextarea.value, codeTextarea.selectionStart, codeTextarea.selectionEnd);
          updateGutter();
          updateCursorPos();
          return;
        }
      }

      // 5. Enter key: Auto-Indentation and Split-Braces Expansion
      if (e.key === 'Enter') {
        e.preventDefault();
        const lastNl = val.lastIndexOf('\n', start - 1);
        const lineStart = lastNl === -1 ? 0 : lastNl + 1;
        const lineBeforeCursor = val.substring(lineStart, start);
        const indentMatch = lineBeforeCursor.match(/^[ \t]*/);
        const baseIndent = indentMatch ? indentMatch[0] : '';

        // Check if cursor is directly between opening and closing brackets: {|} or (|) or [|]
        const prevChar = start > 0 ? val[start - 1] : '';
        const nextChar = start < val.length ? val[start] : '';
        const isSplitBrackets = (
          (prevChar === '{' && nextChar === '}') ||
          (prevChar === '(' && nextChar === ')') ||
          (prevChar === '[' && nextChar === ']')
        );

        if (isSplitBrackets) {
          // VSCode style expansion:
          // {\n  [cursor]\n}
          const extraIndent = '  ';
          const insertion = '\n' + baseIndent + extraIndent + '\n' + baseIndent;
          codeTextarea.value = val.substring(0, start) + insertion + val.substring(end);
          codeTextarea.selectionStart = codeTextarea.selectionEnd = start + 1 + baseIndent.length + extraIndent.length;
          editorHistory.push(codeTextarea.value, codeTextarea.selectionStart, codeTextarea.selectionEnd);
          updateGutter();
          updateCursorPos();
          return;
        }

        // Check if current line opens a block (ends with {, [, (, or :)
        const trimmedBefore = lineBeforeCursor.trimEnd();
        const opensBlock = /[{[(:]$/.test(trimmedBefore);
        const nextIndent = baseIndent + (opensBlock ? '  ' : '');
        const insertion = '\n' + nextIndent;

        codeTextarea.value = val.substring(0, start) + insertion + val.substring(end);
        codeTextarea.selectionStart = codeTextarea.selectionEnd = start + insertion.length;
        editorHistory.push(codeTextarea.value, codeTextarea.selectionStart, codeTextarea.selectionEnd);
        updateGutter();
        updateCursorPos();
        return;
      }

      // 6. Tab / Shift+Tab indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        // Multi-line selection indent/outdent
        if (hasSelection && val.substring(start, end).includes('\n')) {
          const firstLineStart = val.lastIndexOf('\n', start - 1) + 1;
          const nextNl = val.indexOf('\n', end);
          const lastLineEnd = nextNl === -1 ? val.length : nextNl;

          const block = val.substring(firstLineStart, lastLineEnd);
          const lines = block.split('\n');

          let newBlock;
          let delta = 0;
          if (e.shiftKey) {
            // Unindent lines
            newBlock = lines.map(line => {
              if (line.startsWith('  ')) {
                delta -= 2;
                return line.substring(2);
              } else if (line.startsWith(' ')) {
                delta -= 1;
                return line.substring(1);
              }
              return line;
            }).join('\n');
          } else {
            // Indent lines
            newBlock = lines.map(line => {
              delta += 2;
              return '  ' + line;
            }).join('\n');
          }

          codeTextarea.value = val.substring(0, firstLineStart) + newBlock + val.substring(lastLineEnd);
          codeTextarea.selectionStart = start;
          codeTextarea.selectionEnd = Math.max(start, end + delta);
          editorHistory.push(codeTextarea.value, codeTextarea.selectionStart, codeTextarea.selectionEnd);
          updateGutter();
          updateCursorPos();
          return;
        }

        // Single line Shift+Tab unindent
        if (e.shiftKey) {
          const lastNl = val.lastIndexOf('\n', start - 1);
          const lineStart = lastNl === -1 ? 0 : lastNl + 1;
          const lineText = val.substring(lineStart);
          if (lineText.startsWith('  ')) {
            codeTextarea.value = val.substring(0, lineStart) + lineText.substring(2);
            codeTextarea.selectionStart = Math.max(lineStart, start - 2);
            codeTextarea.selectionEnd = Math.max(lineStart, end - 2);
          } else if (lineText.startsWith(' ')) {
            codeTextarea.value = val.substring(0, lineStart) + lineText.substring(1);
            codeTextarea.selectionStart = Math.max(lineStart, start - 1);
            codeTextarea.selectionEnd = Math.max(lineStart, end - 1);
          }
          editorHistory.push(codeTextarea.value, codeTextarea.selectionStart, codeTextarea.selectionEnd);
          updateGutter();
          updateCursorPos();
          return;
        }

        // Standard Tab: insert 2 spaces
        codeTextarea.value = val.substring(0, start) + '  ' + val.substring(end);
        codeTextarea.selectionStart = codeTextarea.selectionEnd = start + 2;
        editorHistory.push(codeTextarea.value, codeTextarea.selectionStart, codeTextarea.selectionEnd);
        updateGutter();
        updateCursorPos();
      }
    });
  }

  // Turn Timer Helpers (60s easy, 90s medium, 120s hard)
  function startTurnTimer(seconds) {
    stopTurnTimer();
    timerRemaining = seconds;
    timerTotal = seconds;
    isTimerPaused = false;
    updateTimerUI();

    turnTimerId = setInterval(() => {
      timerRemaining--;
      updateTimerUI();

      if (timerRemaining <= 0) {
        stopTurnTimer();
        handleTurnTimeout();
      }
    }, 1000);
  }

  function pauseTurnTimer() {
    if (turnTimerId) {
      clearInterval(turnTimerId);
      turnTimerId = null;
      isTimerPaused = true;
    }
  }

  function resumeTurnTimer() {
    if (isTimerPaused && timerRemaining > 0 && battleActive) {
      isTimerPaused = false;
      turnTimerId = setInterval(() => {
        timerRemaining--;
        updateTimerUI();

        if (timerRemaining <= 0) {
          stopTurnTimer();
          handleTurnTimeout();
        }
      }, 1000);
    }
  }

  function stopTurnTimer() {
    if (turnTimerId) {
      clearInterval(turnTimerId);
      turnTimerId = null;
    }
    isTimerPaused = false;
  }

  function updateTimerUI() {
    if (!turnTimerText || !turnTimerFill) return;

    if (timerRemaining <= 0 && !activeChallenge) {
      turnTimerText.textContent = 'TIME: --';
      turnTimerFill.style.width = '100%';
      turnTimerFill.className = 'turn-timer-fill';
      return;
    }

    const pct = Math.max(0, Math.min(100, (timerRemaining / timerTotal) * 100));
    turnTimerText.textContent = `TIME: ${timerRemaining}s`;
    turnTimerFill.style.width = `${pct}%`;

    if (pct <= 25) {
      turnTimerFill.className = 'turn-timer-fill timer-danger';
    } else if (pct <= 50) {
      turnTimerFill.className = 'turn-timer-fill timer-warning';
    } else {
      turnTimerFill.className = 'turn-timer-fill';
    }
  }

  function handleTurnTimeout() {
    if (!battleActive || !activeChallenge) return;

    stopTurnTimer();
    if (codeTextarea) codeTextarea.disabled = true;
    if (btnRunTests) btnRunTests.disabled = true;
    if (btnDevPower) btnDevPower.disabled = true;
    if (btnInventory) btnInventory.disabled = true;
    if (btnInventoryBattle) btnInventoryBattle.disabled = true;
    if (btnHolyHeal) btnHolyHeal.disabled = true;
    if (btnHint) btnHint.disabled = true;
    if (btnResetCode) btnResetCode.disabled = true;

    if (window.BattleEngine && typeof window.BattleEngine.handleTurnTimeout === 'function') {
      window.BattleEngine.handleTurnTimeout();
    } else if (window.handleTurnTimeout) {
      window.handleTurnTimeout();
    } else {
      playSound('hit');
      if (window.showMessage) {
        window.showMessage("Out of time!");
      }
      setTimeout(() => {
        if (!battleActive) return;
        executeEnemyTurn(true);
      }, 1000);
    }
  }

  // -------------------------------------------------------------------------
  // QUESTION PICKER: 3 cards (EASY 10 dmg, MEDIUM 20 dmg, HARD 35 dmg)
  // -------------------------------------------------------------------------
  function pickRandomChallenge(difficulty) {
    const diffPool = challengesCatalog.filter(c => c.difficulty === difficulty);
    if (!diffPool.length) return null;

    let available = diffPool.filter(c => !battleUsedChallenges.has(c.id));
    if (available.length === 0) {
      diffPool.forEach(c => battleUsedChallenges.delete(c.id));
      available = diffPool;
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
  }

  function startPlayerTurn() {
    if (!battleActive) return;

    if (window.BattleEngine && typeof window.BattleEngine.setCodePanelEnemyTurnUI === 'function') {
      window.BattleEngine.setCodePanelEnemyTurnUI(false);
    }
    if (window.gameState) {
      window.gameState.isEnemyTurn = false;
      window.gameState.isEnemyAttacking = false;
    }
    if (window.resetChipsUsedThisTurn) {
      window.resetChipsUsedThisTurn();
    }
    if (window.updateChipInventoryBar) {
      window.updateChipInventoryBar();
    }
    if (window.selectChipSlot) {
      window.selectChipSlot(null);
    }

    activeChallenge = null;
    isQuestionLocked = false;
    hintUsedThisTurn = false;
    if (window.gameState) {
      window.gameState.hintUsedThisTurn = false;
    }
    stopTurnTimer();

    // Check if Bugmon battle is active
    const isBugmon = (window.gameState && window.gameState.isBugmonBattle) ||
                     (window.BattleEngine && window.BattleEngine.visualState && window.BattleEngine.visualState.isBugmon);

    // 3 challenge cards: Easy (LOCKED in Bugmon battle), Medium (20 dmg), Hard (35 dmg)
    let easyCard = null;
    if (isBugmon) {
      easyCard = {
        id: 'locked-easy',
        title: 'LOCKED',
        difficulty: 'easy',
        description: 'Easy challenges disabled during Bugmon encounter. Medium & Hard only.',
        topic: 'LOCKED',
        locked: true
      };
    } else {
      easyCard = pickRandomChallenge('easy');
    }

    const mediumCard = pickRandomChallenge('medium');
    const hardCard = pickRandomChallenge('hard');

    currentTurnCards = [easyCard, mediumCard, hardCard].filter(Boolean);
    const rewardHelper = window.getRewardChipForDifficulty || (typeof getRewardChipForDifficulty === 'function' ? getRewardChipForDifficulty : null);
    currentTurnCards.forEach((c) => {
      if (c && !c.locked) {
        const diff = (c.difficulty || 'easy').toLowerCase();
        const r = rewardHelper ? rewardHelper(diff) : null;
        if (r && Math.random() < r.dropChance) {
          c.willReceiveItem = r;
        } else {
          c.willReceiveItem = null;
        }
      } else if (c) {
        c.willReceiveItem = null;
      }
    });
    renderPickerCards(currentTurnCards);

    // Reset Editor Area to waiting prompt
    if (currentChallengeBadge) {
      currentChallengeBadge.textContent = 'NO MOVE SELECTED';
      currentChallengeBadge.className = 'badge-difficulty font-pixel';
    }
    if (editorChallengeTitle) editorChallengeTitle.textContent = 'SELECT A CHALLENGE CARD ABOVE';
    if (editorChallengeTopic) editorChallengeTopic.textContent = 'TOPIC: NONE';
    if (editorChallengeDesc) {
      editorChallengeDesc.textContent = isBugmon
        ? 'Pick a challenge card above (Medium: 20 DMG, Hard: 35 DMG) to battle the Bugmon. Easy mode is LOCKED.'
        : 'Pick an attack challenge above (Easy: 10 DMG, Medium: 20 DMG, Hard: 35 DMG) to load your coding turn.';
    }
    if (challengeHintBox) challengeHintBox.style.display = 'none';

    if (codeTextarea) {
      codeTextarea.value = '';
      codeTextarea.placeholder = '// Select an attack card above to begin coding...';
      codeTextarea.disabled = true;
    }
    updateGutter();

    if (turnTimerText) turnTimerText.textContent = 'TIME: --';
    if (turnTimerFill) {
      turnTimerFill.style.width = '100%';
      turnTimerFill.className = 'turn-timer-fill';
    }

    if (btnRunTests) btnRunTests.disabled = true;
    if (btnDevPower) btnDevPower.disabled = true;
    if (btnInventory) btnInventory.disabled = false;
    if (btnInventoryBattle) btnInventoryBattle.disabled = false;
    if (btnHolyHeal) btnHolyHeal.disabled = false;
    if (btnHint) {
      btnHint.disabled = true;
      btnHint.textContent = '? HINT (-5 PTS)';
    }
    if (btnResetCode) btnResetCode.disabled = true;

    if (pickerStatusBadge) {
      pickerStatusBadge.textContent = isBugmon ? 'BUGMON BATTLE: MED & HARD ONLY' : 'SELECT DIFFICULTY TO ATTACK';
      pickerStatusBadge.className = isBugmon ? 'section-badge font-code text-red' : 'section-badge font-code text-yellow';
    }
    if (consoleStatusBadge) {
      consoleStatusBadge.textContent = isBugmon ? 'SYS: BUGMON COMBAT' : 'SYS: READY';
      consoleStatusBadge.className = isBugmon ? 'section-badge font-code text-red' : 'section-badge font-code text-green';
    }
  }

  let activeExpandedIndex = 0;

  function showExpandedPicker(index) {
    if (!battleActive || activeChallenge || isQuestionLocked || !pickerExpandedOverlay) return;
    if (!currentTurnCards || currentTurnCards.length === 0) return;
    if (typeof isEnemyTurn !== 'undefined' && isEnemyTurn) return;

    activeExpandedIndex = Math.max(0, Math.min(index, currentTurnCards.length - 1));
    updateExpandedOverlayUI();
    pickerExpandedOverlay.style.display = 'flex';
  }

  function hideExpandedPicker() {
    if (pickerExpandedOverlay) {
      pickerExpandedOverlay.style.display = 'none';
    }
  }

  function updateExpandedOverlayUI() {
    if (!pickerExpandedTabs || !pickerExpandedBody || !currentTurnCards) return;
    const cards = currentTurnCards;
    const dmgMap = { easy: 10, medium: 20, hard: 35 };

    pickerExpandedTabs.innerHTML = '';
    cards.forEach((challenge, idx) => {
      const dmg = dmgMap[challenge.difficulty] || 10;
      const isActive = (idx === activeExpandedIndex);
      const isLocked = challenge.locked === true;

      const tab = document.createElement('div');
      tab.className = `picker-tab ${challenge.difficulty} ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('tabindex', isLocked ? '-1' : '0');
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.id = `picker-tab-${challenge.id || idx}`;

      tab.innerHTML = `
        <div class="picker-tab-badge-row">
          <span class="picker-badge font-pixel ${isLocked ? 'text-red' : ''}">${isLocked ? 'LOCKED' : (challenge.difficulty || 'EASY').toUpperCase()}</span>
          <span class="picker-tab-dmg font-pixel">${isLocked ? 'LOCKED' : `${dmg} DMG`}</span>
        </div>
        <div class="picker-tab-title font-pixel">${isLocked ? 'LOCKED' : (challenge.title || 'Challenge')}</div>
      `;

      tab.addEventListener('mouseenter', () => {
        if (activeExpandedIndex !== idx) {
          activeExpandedIndex = idx;
          updateExpandedOverlayUI();
          if (!isLocked) {
            playSound('select');
          }
        }
      });

      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isLocked || isQuestionLocked) return;
        const allCardEls = pickerCardsContainer ? pickerCardsContainer.querySelectorAll('.picker-card') : [];
        const cardEl = allCardEls[idx];
        hideExpandedPicker();
        selectChallengeCard(challenge, cardEl);
      });

      tab.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextTab = (idx + 1) % cards.length;
          activeExpandedIndex = nextTab;
          updateExpandedOverlayUI();
          const newTabs = pickerExpandedTabs.querySelectorAll('.picker-tab');
          if (newTabs[nextTab]) newTabs[nextTab].focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prevTab = (idx - 1 + cards.length) % cards.length;
          activeExpandedIndex = prevTab;
          updateExpandedOverlayUI();
          const newTabs = pickerExpandedTabs.querySelectorAll('.picker-tab');
          if (newTabs[prevTab]) newTabs[prevTab].focus();
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          if (isLocked || isQuestionLocked) return;
          const allCardEls = pickerCardsContainer ? pickerCardsContainer.querySelectorAll('.picker-card') : [];
          const cardEl = allCardEls[idx];
          hideExpandedPicker();
          selectChallengeCard(challenge, cardEl);
        }
      });

      pickerExpandedTabs.appendChild(tab);
    });

    const currentChallenge = cards[activeExpandedIndex];
    if (!currentChallenge) return;

    const dmg = dmgMap[currentChallenge.difficulty] || 10;
    const isLocked = currentChallenge.locked === true;
    const currentDiff = (currentChallenge.difficulty || 'easy').toLowerCase();
    const willReceiveExpItem = Boolean(currentChallenge && currentChallenge.willReceiveItem);
    const expItemChip = willReceiveExpItem ? currentChallenge.willReceiveItem : null;
    const dropLineExpanded = willReceiveExpItem && expItemChip ? `
      <div class="picker-expanded-drop font-pixel">
        <canvas class="picker-expanded-chip-canvas" width="20" height="20" data-chip="${expItemChip.id}"></canvas>
        <span>ITEM REWARD: ${expItemChip.name.toUpperCase()} (${expItemChip.rarityBadge || expItemChip.rarityLabel}) &bull; +${expItemChip.heal} HP</span>
      </div>
    ` : '';

    pickerExpandedBody.className = `picker-expanded-body font-pixel ${currentChallenge.difficulty} ${isLocked ? 'locked' : ''}`;
    pickerExpandedBody.setAttribute('aria-label', `${currentChallenge.difficulty} challenge: ${currentChallenge.title}`);

    pickerExpandedBody.innerHTML = `
      <div class="picker-expanded-header">
        <div class="picker-expanded-meta">
          <span class="picker-badge font-pixel ${isLocked ? 'text-red' : ''}">${isLocked ? 'LOCKED' : (currentChallenge.difficulty || 'EASY').toUpperCase()}</span>
          <span class="picker-expanded-dmg font-pixel">${isLocked ? 'LOCKED' : `${dmg} DMG`}</span>
          <span class="picker-expanded-topic font-pixel">TOPIC: ${(currentChallenge.topic || 'LOGIC').toUpperCase()}</span>
        </div>
        <span class="picker-expanded-cta font-pixel">${isLocked ? 'RESTRICTED IN ENCOUNTER' : '► CLICK OR PRESS ENTER TO ATTACK'}</span>
      </div>
      <div class="picker-expanded-title font-pixel">${isLocked ? 'LOCKED MOVE' : (currentChallenge.title || 'Challenge')}</div>
      <div class="picker-expanded-desc font-code">${currentChallenge.description || ''}</div>
      ${dropLineExpanded}
    `;

    const expChipCanvas = pickerExpandedBody.querySelector('canvas.picker-expanded-chip-canvas');
    if (expChipCanvas && expItemChip && expChipCanvas.getContext) {
      const ctx = expChipCanvas.getContext('2d');
      const drawFn = window.drawChipIcon || (typeof drawChipIcon === 'function' ? drawChipIcon : null);
      if (drawFn) {
        drawFn(ctx, expItemChip.id, 0, 0, 2);
      }
    }

    pickerExpandedBody.onclick = () => {
      if (isLocked || isQuestionLocked) return;
      const allCardEls = pickerCardsContainer ? pickerCardsContainer.querySelectorAll('.picker-card') : [];
      const cardEl = allCardEls[activeExpandedIndex];
      hideExpandedPicker();
      selectChallengeCard(currentChallenge, cardEl);
    };

    pickerExpandedBody.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (isLocked || isQuestionLocked) return;
        const allCardEls = pickerCardsContainer ? pickerCardsContainer.querySelectorAll('.picker-card') : [];
        const cardEl = allCardEls[activeExpandedIndex];
        hideExpandedPicker();
        selectChallengeCard(currentChallenge, cardEl);
      }
    };
  }

  let activeDifficultyIndex = 0;

  function renderPickerCards(cards) {
    if (!pickerCardsContainer) return;
    pickerCardsContainer.innerHTML = '';
    const diffBar = document.getElementById('picker-difficulty-bar') || pickerDifficultyBar;
    if (diffBar) diffBar.innerHTML = '';
    hideExpandedPicker();

    if (pickerBody) {
      pickerBody.classList.add('tabbed-view');
    }

    const rewardFn = window.getRewardChipForDifficulty || (typeof getRewardChipForDifficulty === 'function' ? getRewardChipForDifficulty : null);
    const countFn = window.getChipCount || (typeof getChipCount === 'function' ? getChipCount : null);
    const maxPerType = (window.ITEM_CONFIG && window.ITEM_CONFIG.maxPerType) || 9;
    const dmgMap = { easy: 10, medium: 20, hard: 35 };

    // Ensure willReceiveItem is determined for all cards
    cards.forEach((challenge) => {
      if (challenge && typeof challenge.willReceiveItem === 'undefined') {
        if (!challenge.locked) {
          const diff = (challenge.difficulty || 'easy').toLowerCase();
          const r = rewardFn ? rewardFn(diff) : null;
          challenge.willReceiveItem = (r && Math.random() < r.dropChance) ? r : null;
        } else {
          challenge.willReceiveItem = null;
        }
      }
    });

    // Determine initial active index (first non-locked challenge)
    let defaultIndex = 0;
    if (activeChallenge) {
      const foundIdx = cards.findIndex(c => c && (c.id === activeChallenge.id || c.difficulty === activeChallenge.difficulty));
      if (foundIdx !== -1) defaultIndex = foundIdx;
    } else {
      const nonLockedIdx = cards.findIndex(c => !c.locked);
      if (nonLockedIdx !== -1) defaultIndex = nonLockedIdx;
    }
    activeDifficultyIndex = defaultIndex;

    const cardElements = [];

    // 1. Render all 3 cards into container (active one visible, matching Image 2)
    cards.forEach((challenge, idx) => {
      const dmg = dmgMap[challenge.difficulty] || 10;
      const isLocked = challenge.locked === true;
      const diff = (challenge.difficulty || 'easy').toLowerCase();
      const willReceiveItem = Boolean(challenge && challenge.willReceiveItem);
      const itemChip = willReceiveItem ? challenge.willReceiveItem : null;
      const currentCount = (itemChip && countFn) ? countFn(itemChip.id) : 0;
      const isFull = currentCount >= maxPerType;
      const isActive = (idx === activeDifficultyIndex);

      // Show item image and reward area ONLY when we will receive the item (no chance percentages)
      const rewardStripHtml = willReceiveItem && itemChip ? `
        <div class="picker-card-reward-strip font-pixel">
          <div class="card-chip-wrapper">
            <canvas class="card-chip-canvas" width="40" height="40" data-chip="${itemChip.id}"></canvas>
            <span class="chip-full-badge font-pixel ${isFull ? 'visible' : ''}">FULL</span>
          </div>
          <div class="card-chip-info">
            <div class="card-chip-top-row">
              <span class="card-chip-name font-pixel">${itemChip.name.toUpperCase()}</span>
              <span class="card-chip-heal font-pixel">${itemChip.healText || `+${itemChip.heal} HP`}</span>
            </div>
            <div class="card-chip-bottom-row">
              <span class="card-chip-rarity font-pixel ${itemChip.isAdvance ? 'rarity-golden' : ''}">${itemChip.rarityBadge || itemChip.rarityLabel}</span>
              <span class="card-chip-reward-badge font-pixel">ITEM REWARD</span>
            </div>
          </div>
        </div>
      ` : '';

      const card = document.createElement('div');
      card.className = `picker-card ${challenge.difficulty} ${isActive ? 'active' : ''} ${isLocked ? 'card-disabled locked' : ''}`;
      card.id = `card-${challenge.id}`;
      card.setAttribute('tabindex', isLocked ? '-1' : '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-selected', isActive ? 'true' : 'false');
      card.setAttribute('aria-label', isLocked
        ? 'Easy challenge is locked in Bugmon battle'
        : `${challenge.difficulty.toUpperCase()} challenge: ${challenge.title}. Deals ${dmg} damage.`
      );

      if (isLocked) {
        card.innerHTML = `
          <div class="picker-card-main-col">
            <div class="picker-card-header">
              <span class="picker-badge font-pixel text-red" style="background:#540d1a;">LOCKED</span>
              <span class="picker-card-topic font-pixel text-red">RESTRICTED</span>
              <span class="picker-card-dmg font-pixel text-red">LOCKED</span>
            </div>
            <div class="picker-card-title font-pixel text-red">LOCKED</div>
            <div class="picker-card-desc font-code">${challenge.description}</div>
          </div>
          ${rewardStripHtml}
        `;
      } else {
        card.innerHTML = `
          <div class="picker-card-main-col">
            <div class="picker-card-header">
              <span class="picker-badge font-pixel">${(challenge.difficulty || 'EASY').toUpperCase()}</span>
              <span class="picker-card-topic font-pixel">TOPIC: ${(challenge.topic || 'LOGIC').toUpperCase()}</span>
              <span class="picker-card-dmg font-pixel">${dmg} DMG</span>
            </div>
            <div class="picker-card-title font-pixel">${challenge.title || 'Challenge'}</div>
            <div class="picker-card-desc font-code">${challenge.description || ''}</div>
            <div class="picker-card-action-bar font-pixel">► CLICK QUESTION TO SELECT & START TURN ◄</div>
          </div>
          ${rewardStripHtml}
        `;

        card.addEventListener('click', () => {
          if (isTestingCode || (typeof isEnemyTurn !== 'undefined' && isEnemyTurn)) return;
          if (isQuestionLocked) return;
          setActiveQuestion(idx, true);
        });

        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isTestingCode || (typeof isEnemyTurn !== 'undefined' && isEnemyTurn)) return;
            if (isQuestionLocked) return;
            setActiveQuestion(idx, true);
          }
        });
      }

      if (pickerBody && !pickerBody.classList.contains('tabbed-view')) {
        card.addEventListener('mouseenter', () => {
          showExpandedPicker(idx);
        });
      }

      pickerCardsContainer.appendChild(card);
      cardElements.push(card);

      const chipCanvas = card.querySelector('canvas.card-chip-canvas');
      if (chipCanvas && itemChip && chipCanvas.getContext) {
        const ctx = chipCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const drawFn = window.drawChipIcon || (typeof drawChipIcon === 'function' ? drawChipIcon : null);
        if (drawFn) {
          drawFn(ctx, itemChip.id, 0, 0, 4);
        }
      }
    });

    // 2. Render Difficulty Bar at top (show item image ONLY if question will grant an item)
    if (diffBar) {
      cards.forEach((challenge, idx) => {
        const dmg = dmgMap[challenge.difficulty] || 10;
        const isLocked = challenge.locked === true;
        const willReceiveItem = Boolean(challenge && challenge.willReceiveItem);
        const itemChip = willReceiveItem ? challenge.willReceiveItem : null;
        const isActive = (idx === activeDifficultyIndex);

        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = `picker-diff-tab ${challenge.difficulty} ${isActive ? 'active' : ''} ${isLocked ? 'locked bugmon-locked' : ''}`;
        tab.id = `picker-diff-tab-${challenge.difficulty}`;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tab.setAttribute('tabindex', isLocked ? '-1' : '0');
        tab.title = isLocked
          ? 'Easy challenge is locked in Bugmon battle'
          : `${(challenge.difficulty || 'EASY').toUpperCase()} (${dmg} DMG)${willReceiveItem && itemChip ? ` • Item: ${itemChip.name}` : ''} - Click to preview question`;

        const diffLabel = (challenge.difficulty || 'easy').toUpperCase() === 'MEDIUM' ? 'MED' : (challenge.difficulty || 'easy').toUpperCase();

        tab.innerHTML = `
          <div class="picker-diff-tab-left">
            <span class="picker-diff-tab-label font-pixel">${isLocked ? 'LOCKED' : diffLabel}</span>
            <span class="picker-diff-tab-dmg font-pixel">${isLocked ? 'LOCKED' : `${dmg} DMG`}</span>
          </div>
          ${willReceiveItem && itemChip ? `
            <div class="picker-diff-tab-chip" title="Item Reward: ${itemChip.name} (${itemChip.healText || `+${itemChip.heal} HP`})">
              <canvas class="diff-tab-chip-canvas" width="20" height="20" data-chip="${itemChip.id}"></canvas>
            </div>
          ` : ''}
        `;

        if (willReceiveItem && itemChip) {
          const tabCanvas = tab.querySelector('canvas.diff-tab-chip-canvas');
          if (tabCanvas && tabCanvas.getContext) {
            const ctx = tabCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            const drawFn = window.drawChipIcon || (typeof drawChipIcon === 'function' ? drawChipIcon : null);
            if (drawFn) {
              drawFn(ctx, itemChip.id, 0, 0, 2);
            }
          }
        }

        tab.addEventListener('click', (e) => {
          e.preventDefault();
          if (isQuestionLocked) {
            playSound('error');
            if (window.typeText) window.typeText('Question locked in for this turn! Solve it or wait for next turn.', 20);
            return;
          }
          if (isLocked) {
            playSound('error');
            if (window.typeText) window.typeText('Easy challenges are locked during Bugmon battle!', 20);
            return;
          }
          if (typeof isEnemyTurn !== 'undefined' && isEnemyTurn) return;
          if (isTestingCode) return;
          // Clicking tab previews the question without locking it in
          setActiveQuestion(idx, false);
        });

        tab.addEventListener('keydown', (e) => {
          if (isQuestionLocked) {
            if (['ArrowRight', 'ArrowLeft', 'Enter', ' '].includes(e.key)) {
              e.preventDefault();
            }
            return;
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            const nextIdx = (idx + 1) % cards.length;
            const allTabs = diffBar.querySelectorAll('.picker-diff-tab');
            if (allTabs[nextIdx]) {
              allTabs[nextIdx].focus();
              setActiveQuestion(nextIdx, false);
            }
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prevIdx = (idx - 1 + cards.length) % cards.length;
            const allTabs = diffBar.querySelectorAll('.picker-diff-tab');
            if (allTabs[prevIdx]) {
              allTabs[prevIdx].focus();
              setActiveQuestion(prevIdx, false);
            }
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isLocked) return;
            if (typeof isEnemyTurn !== 'undefined' && isEnemyTurn) return;
            if (isTestingCode) return;
            setActiveQuestion(idx, true);
          }
        });

        diffBar.appendChild(tab);
      });
    }

    function setActiveQuestion(index, openInEditor = true) {
      if (!cards[index]) return;
      if (isQuestionLocked && activeChallenge && cards[index].id !== activeChallenge.id) {
        playSound('error');
        return;
      }
      activeDifficultyIndex = index;
      const targetChallenge = cards[index];
      const targetCard = cardElements[index];

      // Update tabs in bar
      if (diffBar) {
        const allTabs = diffBar.querySelectorAll('.picker-diff-tab');
        allTabs.forEach((t, i) => {
          if (i === index) {
            t.classList.add('active');
            t.setAttribute('aria-selected', 'true');
          } else {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          }
        });
      }

      // Update cards in container
      cardElements.forEach((c, i) => {
        if (i === index) {
          c.classList.add('active');
          c.setAttribute('aria-selected', 'true');
        } else {
          c.classList.remove('active');
          c.classList.remove('selected');
          c.classList.remove('question-locked-in');
          c.setAttribute('aria-selected', 'false');
        }
      });

      if (openInEditor && !targetChallenge.locked) {
        selectChallengeCard(targetChallenge, targetCard, true);
      }
    }

    window.switchPickerQuestion = (idx) => {
      if (isQuestionLocked) return;
      setActiveQuestion(idx, true);
    };

    if (window.updateQuestionCardChipFullBadges) {
      window.updateQuestionCardChipFullBadges();
    }

    if (pickerBody && !pickerBody.__hasHoverListeners) {
      pickerBody.__hasHoverListeners = true;
      pickerBody.addEventListener('mouseleave', () => {
        hideExpandedPicker();
      });
    }
  }

  function selectChallengeCard(challenge, cardElement, allowSwitch = true) {
    if (!battleActive) return;
    if (typeof isEnemyTurn !== 'undefined' && isEnemyTurn) return;
    if (isTestingCode) return;
    if (isQuestionLocked && activeChallenge && activeChallenge.id !== challenge.id) {
      playSound('error');
      return;
    }
    if (activeChallenge && activeChallenge.id === challenge.id && cardElement && cardElement.classList.contains('selected')) {
      return;
    }

    // Once a question is selected and clicked, lock it for the remainder of this turn
    isQuestionLocked = true;
    if (window.gameState) {
      window.gameState.isQuestionLocked = true;
    }

    hideExpandedPicker();
    playSound('select');
    activeChallenge = challenge;
    battleUsedChallenges.add(challenge.id);

    // Clicking a card selects it, activates it, locks it, and syncs tabs
    const allCards = pickerCardsContainer ? pickerCardsContainer.querySelectorAll('.picker-card') : [];
    allCards.forEach((c) => {
      if (c === cardElement) {
        c.classList.add('selected');
        c.classList.add('active');
        c.classList.add('question-locked-in');
        c.classList.remove('locked');
        c.setAttribute('aria-selected', 'true');
        c.removeAttribute('aria-disabled');
        c.tabIndex = 0;
        const actionBar = c.querySelector('.picker-card-action-bar');
        if (actionBar) {
          actionBar.textContent = '🔒 QUESTION LOCKED IN • SOLVE IN EDITOR BELOW';
        }
      } else {
        c.classList.remove('selected');
        c.classList.remove('active');
        c.classList.remove('question-locked-in');
        c.setAttribute('aria-selected', 'false');
      }
    });

    const diffBar = document.getElementById('picker-difficulty-bar') || pickerDifficultyBar;
    if (diffBar) {
      diffBar.classList.add('question-locked');
      const allTabs = diffBar.querySelectorAll('.picker-diff-tab');
      allTabs.forEach((tab) => {
        if (tab.classList.contains(challenge.difficulty)) {
          tab.classList.add('active');
          tab.classList.add('question-locked-tab');
          tab.classList.remove('tab-locked-out');
          tab.setAttribute('aria-selected', 'true');
        } else {
          tab.classList.remove('active');
          tab.classList.remove('question-locked-tab');
          tab.classList.add('tab-locked-out');
          tab.setAttribute('aria-selected', 'false');
          tab.setAttribute('tabindex', '-1');
          tab.setAttribute('aria-disabled', 'true');
        }
      });
    }

    const dmgMap = { easy: 10, medium: 20, hard: 35 };
    const dmg = dmgMap[challenge.difficulty] || 10;

    if (pickerStatusBadge) {
      const itemNote = (challenge && challenge.willReceiveItem) ? ` + [${challenge.willReceiveItem.name.toUpperCase()}]` : '';
      pickerStatusBadge.textContent = `LOCKED IN: ${challenge.difficulty.toUpperCase()} (${dmg} DMG)${itemNote}`;
      pickerStatusBadge.className = 'section-badge font-code text-green';
    }

    // Load the challenge into editor
    if (currentChallengeBadge) {
      currentChallengeBadge.textContent = `[${(challenge.difficulty || 'EASY').toUpperCase()}] ${dmg} DMG`;
      currentChallengeBadge.className = `badge-difficulty ${challenge.difficulty || 'easy'} font-pixel`;
    }
    if (editorChallengeTitle) editorChallengeTitle.textContent = challenge.title || 'Challenge';
    if (editorChallengeTopic) editorChallengeTopic.textContent = `TOPIC: ${(challenge.topic || 'LOGIC').toUpperCase()}`;
    if (editorChallengeDesc) editorChallengeDesc.textContent = challenge.description || '';
    if (challengeHintBox) challengeHintBox.style.display = 'none';

    if (codeTextarea) {
      codeTextarea.disabled = false;
      codeTextarea.value = challenge.starterCode || `function ${challenge.functionName}() {\n  \n}`;
      codeTextarea.focus();
    }
    updateGutter();

    const breadcrumbFunc = document.getElementById('vscode-breadcrumb-func');
    if (breadcrumbFunc && challenge) {
      breadcrumbFunc.textContent = `${challenge.functionName || 'solution'}.js`;
    }
    const filenameEl = document.getElementById('vscode-filename');
    if (filenameEl && challenge) {
      filenameEl.textContent = `${challenge.functionName || 'solution'}.js`;
    }
    updateCursorPos();

    if (btnRunTests) btnRunTests.disabled = false;
    if (btnDevPower) btnDevPower.disabled = false;
    if (btnInventory) btnInventory.disabled = false;
    if (btnInventoryBattle) btnInventoryBattle.disabled = false;
    if (btnHolyHeal) btnHolyHeal.disabled = false;
    if (btnHint) {
      btnHint.disabled = false;
      btnHint.textContent = '? HINT (-5 PTS)';
    }
    if (btnResetCode) btnResetCode.disabled = false;

    // Start turn timer (60s easy, 90s medium, 120s hard)
    const timeMap = { easy: 60, medium: 90, hard: 120 };
    const duration = timeMap[challenge.difficulty] || 60;
    startTurnTimer(duration);

    appendConsoleLine(`> Move selected: "${challenge.title}" [${challenge.difficulty.toUpperCase()} • ${dmg} DMG]`, 'console-info');
    appendConsoleLine(`> Timer started: ${duration}s. Implement ${challenge.functionName}() and click RUN TESTS.`, 'console-info');

    if (window.typeText) {
      window.typeText(`You picked ${challenge.title}! Solve the challenge to unleash ${dmg} DMG!`, 20);
    }
  }

  // -------------------------------------------------------------------------
  // BUTTONS: HINT, RESET, RUN TESTS
  // -------------------------------------------------------------------------
  if (btnHint) {
    btnHint.addEventListener('click', () => {
      if (!battleActive || !activeChallenge) return;
      playSound('click');

      if (!hintUsedThisTurn) {
        hintUsedThisTurn = true;
        if (window.gameState) {
          window.gameState.hintUsedThisTurn = true;
        }
        const pts = (window.BattleEngine && window.BattleEngine.visualState) ? window.BattleEngine.visualState.points : currentPoints;
        const newPts = Math.max(0, pts - 5);
        currentPoints = newPts;
        if (window.BattleEngine && window.BattleEngine.visualState) {
          window.BattleEngine.visualState.points = newPts;
        }
        if (window.gameState) {
          window.gameState.score = newPts;
        }
        const curTurns = (window.BattleEngine && window.BattleEngine.visualState) ? window.BattleEngine.visualState.turnsLeft : turnsLeft;
        if (window.updateHud) {
          window.updateHud(newPts, curTurns);
        }
        appendConsoleLine(`> HINT UNLOCKED (-5 PTS). Current score: ${newPts} / ${getMinPoints()}.`, 'console-warn');
      }

      if (challengeHintBox && challengeHintText) {
        challengeHintText.textContent = activeChallenge.hint || 'No hint provided.';
        challengeHintBox.style.display = 'block';
      }
      btnHint.textContent = '💡 HINT REVEALED';
    });
  }

  if (btnResetCode) {
    btnResetCode.addEventListener('click', () => {
      if (!battleActive || !activeChallenge || !codeTextarea) return;
      playSound('click');
      codeTextarea.value = activeChallenge.starterCode || `function ${activeChallenge.functionName}() {\n  \n}`;
      updateGutter();
      updateCursorPos();
      codeTextarea.focus();
      appendConsoleLine('> Editor code restored to original starter signature.', 'console-info');
    });
  }

  if (btnRunTests) {
    btnRunTests.addEventListener('click', async () => {
      if (!battleActive || !activeChallenge || isTestingCode) return;

      const userCode = codeTextarea ? codeTextarea.value : '';
      if (!userCode.trim()) {
        appendConsoleLine('> Error: Please write some code before running tests.', 'console-fail');
        return;
      }

      isTestingCode = true;
      btnRunTests.disabled = true;
      if (btnDevPower) btnDevPower.disabled = true;
      playSound('click');

      if (consoleStatusBadge) {
        consoleStatusBadge.textContent = 'SYS: COMPILING...';
        consoleStatusBadge.className = 'section-badge font-code text-yellow';
      }

      appendConsoleLine(`> Compiling and running tests for ${activeChallenge.functionName}()...`, 'console-info');

      try {
        const outcome = await window.runCode(userCode, activeChallenge);

        // Shows test results line by line: "TEST 1: PASS", "TEST 2: FAIL (expected 5, got 4)"
        if (outcome.results && outcome.results.length) {
          outcome.results.forEach((test, idx) => {
            if (test.pass) {
              appendConsoleLine(`TEST ${idx + 1}: PASS`, 'console-pass');
            } else {
              const expStr = formatOutputValue(test.expected);
              const gotStr = formatOutputValue(test.got);
              appendConsoleLine(`TEST ${idx + 1}: FAIL (expected ${expStr}, got ${gotStr})`, 'console-fail');
            }
          });
        }

        // Syntax or runtime error in red
        if (outcome.error) {
          appendConsoleLine(`ERROR: ${outcome.error}`, 'console-error');
        }

        if (outcome.passed) {
          playSound('correct');
          stopTurnTimer();
          if (consoleStatusBadge) {
            consoleStatusBadge.textContent = 'SYS: PASSED';
            consoleStatusBadge.className = 'section-badge font-code text-green';
          }
          appendConsoleLine(`> PASS: All ${outcome.results.length} tests passed cleanly! Unleashing attack...`, 'console-pass');

          if (btnDevPower) btnDevPower.disabled = true;
          if (btnInventory) btnInventory.disabled = true;
          if (btnInventoryBattle) btnInventoryBattle.disabled = true;
          if (btnHolyHeal) btnHolyHeal.disabled = true;
          if (btnHint) btnHint.disabled = true;
          if (btnResetCode) btnResetCode.disabled = true;
          if (codeTextarea) codeTextarea.disabled = true;

          if (window.BattleEngine && typeof window.BattleEngine.handlePlayerCodeSuccess === 'function') {
            await window.BattleEngine.handlePlayerCodeSuccess(activeChallenge, outcome);
          } else if (window.handlePlayerCodeSuccess) {
            await window.handlePlayerCodeSuccess(activeChallenge, outcome);
          } else {
            executePlayerAttack();
          }
        } else {
          playSound('wrong');
          // Partial passes (some tests pass, not all): no damage, but show
          // "N/M tests passed" in the console, and the player may keep editing and
          // re-running until the timer ends. Each failed run costs nothing, but only the
          // first full pass counts.
          if (consoleStatusBadge) {
            consoleStatusBadge.textContent = 'SYS: FAILED';
            consoleStatusBadge.className = 'section-badge font-code text-red';
          }

          if (window.BattleEngine && typeof window.BattleEngine.handlePlayerCodePartial === 'function') {
            window.BattleEngine.handlePlayerCodePartial(outcome, activeChallenge);
          } else if (window.handlePlayerCodePartial) {
            window.handlePlayerCodePartial(outcome, activeChallenge);
          } else {
            const results = outcome.results || [];
            const passedCount = results.filter(r => r.pass).length;
            const totalCount = results.length;
            appendConsoleLine(`${passedCount}/${totalCount} tests passed`, 'console-warn');
          }
          btnRunTests.disabled = false;
          if (btnDevPower) btnDevPower.disabled = false;
          if (btnInventory) btnInventory.disabled = false;
          if (btnInventoryBattle) btnInventoryBattle.disabled = false;
          if (btnHolyHeal) btnHolyHeal.disabled = false;
        }

      } catch (err) {
        appendConsoleLine(`UNEXPECTED RUNNER ERROR: ${err.message || String(err)}`, 'console-error');
        btnRunTests.disabled = false;
        if (btnDevPower) btnDevPower.disabled = false;
        if (btnInventory) btnInventory.disabled = false;
        if (btnInventoryBattle) btnInventoryBattle.disabled = false;
        if (btnHolyHeal) btnHolyHeal.disabled = false;
      } finally {
        isTestingCode = false;
      }
    });
  }

  if (btnDevPower) {
    btnDevPower.addEventListener('click', async () => {
      if (!battleActive || isTestingCode) return;

      if (!activeChallenge) {
        appendConsoleLine('> [DEV POWER]: Please select an attack challenge card first!', 'console-warn');
        return;
      }

      isTestingCode = true;
      if (btnRunTests) btnRunTests.disabled = true;
      btnDevPower.disabled = true;
      if (btnInventory) btnInventory.disabled = true;
      if (btnInventoryBattle) btnInventoryBattle.disabled = true;
      if (btnHolyHeal) btnHolyHeal.disabled = true;
      if (btnHint) btnHint.disabled = true;
      if (btnResetCode) btnResetCode.disabled = true;
      if (codeTextarea) codeTextarea.disabled = true;
      playSound('click');

      stopTurnTimer();

      if (consoleStatusBadge) {
        consoleStatusBadge.textContent = 'SYS: DEV OVERRIDE';
        consoleStatusBadge.className = 'section-badge font-code text-yellow';
      }

      appendConsoleLine(`⚡ [DEV POWER ACTIVATED]: Auto-passing all test cases for ${activeChallenge.functionName || 'function'}()!`, 'console-pass');

      const testCases = (activeChallenge.tests && activeChallenge.tests.length)
        ? activeChallenge.tests
        : [{ expected: true, got: true }];

      testCases.forEach((t, idx) => {
        appendConsoleLine(`TEST ${idx + 1}: PASS [DEV POWER OVERRIDE]`, 'console-pass');
      });

      if (consoleStatusBadge) {
        consoleStatusBadge.textContent = 'SYS: PASSED';
        consoleStatusBadge.className = 'section-badge font-code text-green';
      }

      playSound('correct');
      appendConsoleLine(`> PASS: All ${testCases.length}/${testCases.length} tests passed cleanly via Dev Power! Unleashing attack...`, 'console-pass');

      const outcome = {
        passed: true,
        results: testCases.map(t => ({
          pass: true,
          expected: t.expected,
          got: t.expected
        })),
        logs: ['⚡ Dev power override engaged: 100% test pass guaranteed regardless of editor contents.']
      };

      try {
        if (window.BattleEngine && typeof window.BattleEngine.handlePlayerCodeSuccess === 'function') {
          await window.BattleEngine.handlePlayerCodeSuccess(activeChallenge, outcome);
        } else if (window.handlePlayerCodeSuccess) {
          await window.handlePlayerCodeSuccess(activeChallenge, outcome);
        } else {
          executePlayerAttack();
        }
      } catch (err) {
        appendConsoleLine(`DEV POWER RUNNER ERROR: ${err.message || String(err)}`, 'console-error');
      } finally {
        isTestingCode = false;
      }
    });
  }

  // Holy Heal: Full restoration for the user's Codemon
  async function holyHeal() {
    const isBattle = battleActive || (window.gameState && window.gameState.battleActive);
    if (!isBattle) {
      appendConsoleLine('> [HOLY HEAL]: Start a battle before calling holy healing!', 'console-warn');
      return false;
    }

    const player = (window.gameState && window.gameState.player) || selectedCodemon;
    if (!player) return false;

    const maxHp = player.maxHp || 100;
    const prevHp = (typeof player.hp === 'number') ? player.hp : maxHp;

    playSound('heal');

    player.hp = maxHp;
    if (player.currentHp !== undefined) player.currentHp = maxHp;
    if (window.gameState && window.gameState.player) {
      window.gameState.player.hp = maxHp;
      window.gameState.player.currentHp = maxHp;
    }

    const triggerSetHp = window.setHp || (window.BattleEngine && window.BattleEngine.setHp);
    if (triggerSetHp) {
      await triggerSetHp('player', maxHp, maxHp, false);
    }

    const restored = maxHp - prevHp;
    const playerName = player.name || 'Codemon';

    if (restored > 0) {
      appendConsoleLine(`✨ [HOLY HEAL]: Restored ${restored} HP to ${playerName}! (${maxHp}/${maxHp} HP)`, 'console-pass');
    } else {
      appendConsoleLine(`✨ [HOLY HEAL]: Holy light shines on ${playerName}! HP is already maxed (${maxHp}/${maxHp})!`, 'console-pass');
    }

    if (window.typeText) {
      window.typeText(`Holy light shines down! ${playerName} was fully healed!`, 20);
    } else if (window.showMessage) {
      window.showMessage(`Holy light healed ${playerName} to full HP!`);
    }

    return true;
  }
  window.holyHeal = holyHeal;

  if (btnHolyHeal) {
    btnHolyHeal.addEventListener('click', async () => {
      const isBattle = battleActive || (window.gameState && window.gameState.battleActive);
      if (!isBattle || isTestingCode) return;
      await holyHeal();
    });
  }

  // -------------------------------------------------------------------------
  // HEAL CHIPS INVENTORY MODAL SYSTEM
  // -------------------------------------------------------------------------
  function updateInventoryStatusBar() {
    const player = (window.gameState && window.gameState.player) || selectedCodemon;
    if (invActiveCodemon) {
      invActiveCodemon.textContent = player ? `${(player.name || 'CODEMON').toUpperCase()} (LV 5)` : 'NO CODEMON ACTIVE';
    }
    if (invActiveHp) {
      if (player) {
        const maxHp = player.maxHp || 100;
        const hp = (typeof player.hp === 'number') ? player.hp : ((typeof player.currentHp === 'number') ? player.currentHp : maxHp);
        invActiveHp.textContent = `${hp} / ${maxHp} HP`;
        invActiveHp.className = (hp > maxHp * 0.4) ? 'text-green font-code' : 'text-red font-code';
      } else {
        invActiveHp.textContent = '-- / --';
      }
    }
    if (invActiveTurns) {
      invActiveTurns.textContent = `${turnsLeft} TURNS`;
    }
  }

  function renderInventory() {
    if (!inventoryItemsContainer) return;
    updateInventoryStatusBar();
    inventoryItemsContainer.innerHTML = '';

    const chipsConfig = window.CHIPS || (typeof CHIPS !== 'undefined' ? CHIPS : null);
    if (!chipsConfig) return;

    const chipKeys = ['low', 'normal', 'advance'];
    const rarityMap = {
      low: 'RARE',
      normal: 'RARER',
      advance: 'RAREST'
    };

    chipKeys.forEach((chipId) => {
      const chip = chipsConfig[chipId];
      if (!chip) return;

      const getCountFn = window.getChipCount || (typeof getChipCount === 'function' ? getChipCount : null);
      const count = getCountFn ? getCountFn(chipId) : 0;
      const isAdvance = chipId === 'advance';
      const rarityLabel = rarityMap[chipId] || 'RARE';

      const card = document.createElement('div');
      card.className = `inventory-item-card chip-card-${chipId} ${count <= 0 ? 'empty-item' : ''}`;
      card.setAttribute('data-chip-id', chipId);

      // 1. Top row: chip pixel icon canvas, chip name + rarity under name, count badge (e.g. x2)
      const top = document.createElement('div');
      top.className = 'inv-card-top';

      const info = document.createElement('div');
      info.className = 'inv-item-info';

      const canvas = document.createElement('canvas');
      canvas.className = 'inv-chip-canvas';
      canvas.width = 30;
      canvas.height = 30;
      canvas.id = `inv-modal-canvas-${chipId}`;

      const nameGroup = document.createElement('div');
      nameGroup.className = 'inv-item-name-group';

      const nameEl = document.createElement('strong');
      nameEl.className = 'inv-item-name font-pixel';
      nameEl.textContent = chip.name;

      const rarityEl = document.createElement('span');
      rarityEl.className = `inv-item-rarity font-pixel ${isAdvance ? 'rarity-rarest' : ''}`;
      rarityEl.textContent = rarityLabel;

      nameGroup.appendChild(nameEl);
      nameGroup.appendChild(rarityEl);

      info.appendChild(canvas);
      info.appendChild(nameGroup);

      const countBadge = document.createElement('span');
      countBadge.className = 'inv-item-count font-pixel';
      countBadge.id = `inv-modal-count-${chipId}`;
      countBadge.textContent = `x${count}`;

      top.appendChild(info);
      top.appendChild(countBadge);

      // 2. Description line: "Restores 5 HP to your active codemon." (using real heal value from config)
      const desc = document.createElement('p');
      desc.className = 'inv-item-desc font-code';
      desc.textContent = `Restores ${chip.heal} HP to your active codemon.`;

      // 3. Bottom row: heal badge ("+5 HP", "+10 HP", "+15 HP") and "USE ITEM" button
      const btm = document.createElement('div');
      btm.className = 'inv-card-bottom';

      const healBadge = document.createElement('span');
      healBadge.className = `inv-item-badge font-pixel badge-chip-${chipId}`;
      healBadge.textContent = `+${chip.heal} HP`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-use-item font-pixel';
      btn.id = `btn-modal-use-${chipId}`;
      btn.textContent = 'USE ITEM ▶';
      btn.disabled = count <= 0;
      btn.setAttribute('aria-label', `Use ${chip.name}`);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const useFn = window.useChip || (typeof useChip === 'function' ? useChip : null);
        if (useFn) {
          useFn(chipId);
          updateInventoryStatusBar();
          renderInventory();
        }
      });

      btm.appendChild(healBadge);
      btm.appendChild(btn);

      card.appendChild(top);
      card.appendChild(desc);
      card.appendChild(btm);

      inventoryItemsContainer.appendChild(card);

      // Draw pixel art icon with scale 3, pixelated, no smoothing
      if (canvas.getContext) {
        const ctx = canvas.getContext('2d');
        const drawFn = window.drawChipIcon || (typeof drawChipIcon === 'function' ? drawChipIcon : null);
        if (drawFn) {
          drawFn(ctx, chipId, 0, 0, 3);
        }
      }
    });
  }

  function openInventory() {
    if (!inventoryOverlay) return;
    renderInventory();
    inventoryOverlay.style.display = 'flex';
    playSound('select');
  }

  function closeInventory() {
    if (!inventoryOverlay) return;
    inventoryOverlay.style.display = 'none';
    playSound('select');
  }

  window.openInventory = openInventory;
  window.closeInventory = closeInventory;
  window.renderInventory = renderInventory;
  window.updateInventoryStatusBar = updateInventoryStatusBar;

  if (btnInventory) {
    btnInventory.addEventListener('click', () => {
      openInventory();
    });
  }

  if (btnInventoryBattle) {
    btnInventoryBattle.addEventListener('click', () => {
      openInventory();
    });
  }

  if (btnInventoryClose) {
    btnInventoryClose.addEventListener('click', () => {
      closeInventory();
    });
  }

  if (btnInventoryCloseBottom) {
    btnInventoryCloseBottom.addEventListener('click', () => {
      closeInventory();
    });
  }

  if (inventoryOverlay) {
    inventoryOverlay.addEventListener('click', (e) => {
      if (e.target === inventoryOverlay) {
        closeInventory();
      }
    });
  }

  // Chip quickbar slot click / touch handlers (left game panel above dialogue)
  const slotLow = document.getElementById('chip-slot-low');
  const slotNormal = document.getElementById('chip-slot-normal');
  const slotAdvance = document.getElementById('chip-slot-advance');

  if (slotLow) {
    slotLow.addEventListener('click', () => {
      if (window.selectChipSlot) window.selectChipSlot('low');
      if (window.useChip) window.useChip('low');
    });
  }
  if (slotNormal) {
    slotNormal.addEventListener('click', () => {
      if (window.selectChipSlot) window.selectChipSlot('normal');
      if (window.useChip) window.useChip('normal');
    });
  }
  if (slotAdvance) {
    slotAdvance.addEventListener('click', () => {
      if (window.selectChipSlot) window.selectChipSlot('advance');
      if (window.useChip) window.useChip('advance');
    });
  }

  // -------------------------------------------------------------------------
  // COMBAT MOVE EXECUTION & RESOLUTION
  // -------------------------------------------------------------------------
  function executePlayerAttack() {
    const player = window.gameState.player;
    const enemy = window.gameState.enemy;
    if (!player || !enemy) return;

    const dmgMap = { easy: 10, medium: 20, hard: 35 };
    const pointsMap = { easy: 10, medium: 25, hard: 50 };
    const diff = (activeChallenge && activeChallenge.difficulty) ? activeChallenge.difficulty.toLowerCase() : 'easy';
    const baseDmg = dmgMap[diff] || 10;
    const multiplier = player.attackPower || 1.0;
    const finalDmg = Math.round(baseDmg * multiplier);
    const earnedPoints = pointsMap[diff] || 10;

    currentPoints += earnedPoints;
    turnsLeft = Math.max(0, turnsLeft - 1);

    if (window.updateHud) {
      window.updateHud(currentPoints, turnsLeft);
    }

    // Roll heal chip drop on full test pass (only if hint was not used)
    const hintUsed = (window.gameState && window.gameState.hintUsedThisTurn) || hintUsedThisTurn;
    let droppedChipId = null;
    if (!hintUsed) {
      if (activeChallenge && activeChallenge.willReceiveItem) {
        droppedChipId = activeChallenge.willReceiveItem.id;
      } else if (activeChallenge && activeChallenge.willReceiveItem === null) {
        droppedChipId = null;
      } else {
        const chipRoller = (typeof rollChipDrop === 'function')
          ? rollChipDrop
          : (typeof window !== 'undefined' && typeof window.rollChipDrop === 'function' ? window.rollChipDrop : null);
        if (chipRoller) {
          droppedChipId = chipRoller(diff);
        }
      }
      if (droppedChipId) {
          const chipAdder = (typeof addChip === 'function')
            ? addChip
            : (typeof window !== 'undefined' && typeof window.addChip === 'function' ? window.addChip : null);
          if (chipAdder) {
            const added = chipAdder(droppedChipId);
            if (added) {
              if (window.gameState) {
                window.gameState.stats = window.gameState.stats || {};
                window.gameState.stats.chipsFound = (window.gameState.stats.chipsFound || 0) + 1;
              }
              const showPopup = window.showRewardPopup || (typeof showRewardPopup === 'function' ? showRewardPopup : null);
              if (showPopup) {
                showPopup(droppedChipId);
              }
            }
          }
        }
      }

    // Trigger drop pop animation or dim flicker on question card's chip image
    const dropAnimTrigger = window.triggerCardDropAnimation || (typeof triggerCardDropAnimation === 'function' ? triggerCardDropAnimation : null);
    if (dropAnimTrigger) {
      dropAnimTrigger(diff, droppedChipId);
    }

    // Call playAttackAnimation("player") and playHitAnimation("enemy")
    if (window.playAttackAnimation) {
      window.playAttackAnimation('player');
    }
    setTimeout(() => {
      if (window.playHitAnimation) {
        window.playHitAnimation('enemy');
      }
    }, 280);
    playSound('hit');

    const prevEnemyHp = enemy.hp || enemy.maxHp;
    const newEnemyHp = Math.max(0, prevEnemyHp - finalDmg);
    enemy.hp = newEnemyHp;
    enemy.currentHp = newEnemyHp;

    if (window.setHp) {
      window.setHp('enemy', newEnemyHp, enemy.maxHp);
    }

    if (window.typeText) {
      window.typeText(`${player.name.toUpperCase()} executed clean code! Dealt ${finalDmg} DMG to ${enemy.name.toUpperCase()}! (+${earnedPoints} PTS)`, 20);
    }

    appendConsoleLine(`> Attack hit! +${earnedPoints} Points. Bugmon took ${finalDmg} DMG.`, 'console-info');

    // End-of-battle check if enemy HP <= 0:
    const minPts = (window.BATTLE_CONFIG && window.BATTLE_CONFIG.minPoints) || 120;
    if (newEnemyHp <= 0) {
      if (currentPoints >= minPts) {
        setTimeout(() => {
          handleBattleOutcome('victory');
        }, 1400);
      } else {
        setTimeout(async () => {
          if (window.typeText) {
            window.typeText('The enemy is still glitching...', 20);
          }
          if (window.triggerBugmonTransformation) {
            await window.triggerBugmonTransformation();
          } else {
            handleBattleOutcome('transformation');
          }
        }, 1400);
      }
      return;
    }

    // Bugmon counter-attacks after delay
    setTimeout(() => {
      if (!battleActive) return;
      executeEnemyTurn(false);
    }, 1500);
  }

  function executeEnemyTurn(isBonusDamage = false) {
    const player = window.gameState.player;
    const enemy = window.gameState.enemy;
    if (!player || !enemy || !battleActive) return;

    if (window.gameState) {
      window.gameState.isEnemyTurn = true;
      window.gameState.isEnemyAttacking = true;
    }

    // During enemy turn, disable editor and show "ENEMY TURN..." in the code panel
    if (pickerStatusBadge) {
      pickerStatusBadge.textContent = 'ENEMY TURN...';
      pickerStatusBadge.className = 'section-badge font-code text-red';
    }
    if (currentChallengeBadge) {
      currentChallengeBadge.textContent = 'ENEMY TURN...';
      currentChallengeBadge.className = 'badge-difficulty hard font-pixel';
    }
    if (consoleStatusBadge) {
      consoleStatusBadge.textContent = 'SYS: ENEMY TURN';
      consoleStatusBadge.className = 'section-badge font-code text-red';
    }
    if (codeTextarea) codeTextarea.disabled = true;
    if (btnRunTests) btnRunTests.disabled = true;
    if (btnDevPower) btnDevPower.disabled = true;
    if (btnInventory) btnInventory.disabled = true;
    if (btnInventoryBattle) btnInventoryBattle.disabled = true;
    if (btnHolyHeal) btnHolyHeal.disabled = true;
    if (btnHint) btnHint.disabled = true;
    if (btnResetCode) btnResetCode.disabled = true;
    if (pickerCardsContainer) {
      const cards = pickerCardsContainer.querySelectorAll('.picker-card');
      cards.forEach((c) => {
        c.classList.remove('selected');
        c.classList.add('locked');
        c.style.pointerEvents = 'none';
      });
    }

    appendConsoleLine('> ENEMY TURN...', 'console-warn');

    const baseEnemyDmg = 16;
    const enemyDmg = isBonusDamage ? Math.round(baseEnemyDmg * 1.5) : baseEnemyDmg;

    const isBugmon = (window.gameState && window.gameState.isBugmonBattle) || (enemy && enemy.isBugmon);
    let moveName = isBugmon ? 'Glitch Strike' : 'Segfault Slam';
    const movePool = (isBugmon && enemy.bugmonVariant && Array.isArray(enemy.bugmonVariant.moves) && enemy.bugmonVariant.moves.length > 0)
      ? enemy.bugmonVariant.moves
      : (Array.isArray(enemy.moves) && enemy.moves.length > 0 ? enemy.moves : null);
    if (movePool && movePool.length > 0) {
      const picked = movePool[Math.floor(Math.random() * movePool.length)];
      if (picked && picked.name) {
        moveName = picked.name;
      }
    }

    if (window.typeText) {
      const atkDesc = isBonusDamage
        ? `${enemy.name.toUpperCase()} strikes with 50% BONUS DAMAGE via ${moveName} (${enemyDmg} DMG)!`
        : `${enemy.name.toUpperCase()} countered with ${moveName} (${enemyDmg} DMG)!`;
      window.typeText(atkDesc, 20);
    }

    setTimeout(() => {
      if (!battleActive) return;

      if (window.playAttackAnimation) {
        window.playAttackAnimation('enemy');
      }
      setTimeout(() => {
        if (window.playHitAnimation) {
          window.playHitAnimation('player');
        }
      }, 280);
      playSound('hit');

      const finalEnemyDmg = enemyDmg;

      const prevPlayerHp = player.hp || player.maxHp;
      const newPlayerHp = Math.max(0, prevPlayerHp - finalEnemyDmg);
      player.hp = newPlayerHp;
      player.currentHp = newPlayerHp;

      if (window.setHp) {
        window.setHp('player', newPlayerHp, player.maxHp);
      }

      appendConsoleLine(`> ${enemy.name} struck player for ${finalEnemyDmg} DMG!`, 'console-fail');

      // End of full round: update turnsLeft
      const minPts = (window.BATTLE_CONFIG && window.BATTLE_CONFIG.minPoints) || 120;
      turnsLeft = Math.max(0, turnsLeft - 1);
      if (window.updateHud) {
        window.updateHud(currentPoints, turnsLeft);
      }
      if (window.gameState) {
        window.gameState.turnsLeft = turnsLeft;
      }

      // 4. If player HP <= 0: lose.
      if (newPlayerHp <= 0) {
        setTimeout(() => {
          handleBattleOutcome('defeat');
        }, 1200);
        return;
      }

      // 3. If turns run out and points < minPoints: trigger Bugmon transformation.
      if (turnsLeft <= 0) {
        setTimeout(async () => {
          if (currentPoints < minPts) {
            if (window.triggerBugmonTransformation) {
              await window.triggerBugmonTransformation();
            } else {
              handleBattleOutcome('transformation');
            }
          } else {
            handleBattleOutcome('defeat');
          }
        }, 1200);
        return;
      }

      // When it's player's turn again, show 3 new challenge cards
      setTimeout(() => {
        if (!battleActive) return;
        startPlayerTurn();
      }, 1400);
    }, 1000);
  }

  function handleBattleOutcome(outcome) {
    battleActive = false;
    if (window.gameState) {
      window.gameState.battleActive = false;
    }
    stopTurnTimer();

    if (window.BattleEngine && window.BattleEngine.visualState) {
      currentPoints = window.BattleEngine.visualState.points;
      turnsLeft = window.BattleEngine.visualState.turnsLeft;
    } else if (window.gameState) {
      if (typeof window.gameState.score === 'number') currentPoints = window.gameState.score;
      if (typeof window.gameState.turnsLeft === 'number') turnsLeft = window.gameState.turnsLeft;
    }

    const isBugmon = (window.gameState && window.gameState.isBugmonBattle) ||
                     (window.BattleEngine && window.BattleEngine.visualState && window.BattleEngine.visualState.isBugmon);
    const minPoints = (window.BATTLE_CONFIG && window.BATTLE_CONFIG.minPoints) || (isBugmon ? 150 : targetPoints);
    const player = window.gameState.player || { name: 'Codemon' };
    const enemy = window.gameState.enemy || { name: 'Bugmon' };

    const resultOverlay = document.getElementById('battle-result-overlay');
    const resultBadge = document.getElementById('result-badge');
    const resultTitle = document.getElementById('result-title');
    const resultSubtitle = document.getElementById('result-subtitle');
    const resultScoreVal = document.getElementById('result-score-val');
    const resultTargetVal = document.getElementById('result-target-val');
    const resultTurnsVal = document.getElementById('result-turns-val');
    const btnResultAction = document.getElementById('btn-result-action');

    // 1. Bugmon failure / run away: "The bug got away..." with small XP penalty
    if (outcome === 'bugmon_escaped') {
      playSound('hit');
      if (window.gameState) {
        const currentXp = typeof window.gameState.xp === 'number' ? window.gameState.xp : 100;
        window.gameState.xp = Math.max(0, currentXp - 15);
        window.gameState.isBugmonBattle = false;
      }

      if (window.typeText) {
        window.typeText('The bug got away...', 24);
      } else if (window.showMessage) {
        window.showMessage('The bug got away...');
      }

      appendConsoleLine('========================================', 'console-error');
      appendConsoleLine('✖ The bug got away... (-15 XP Penalty)', 'console-error');
      appendConsoleLine(`XP Remaining: ${window.gameState ? window.gameState.xp : 85}. Returning to selection screen.`, 'console-warn');
      appendConsoleLine('========================================', 'console-error');

      const battleScreen = document.getElementById('screen-battle');
      const canvasFrame = document.getElementById('canvas-frame');
      if (battleScreen) {
        battleScreen.classList.remove('bugmon-battle-tint', 'bugmon-glitch-active');
      }
      if (canvasFrame) {
        canvasFrame.classList.remove('screen-glitch-active');
      }

      if (window.BattleEngine && window.BattleEngine.visualState) {
        window.BattleEngine.visualState.isBugmon = false;
        window.BattleEngine.visualState.isGlitching = false;
      }

      setTimeout(() => {
        showScreen('select');
      }, 1500);
      return;
    }

    if (outcome === 'victory') {
      if (window.pauseBgm) {
        window.pauseBgm();
      }
      playSound('victory');
      if (isBugmon) {
        // Defeating a Bugmon gives double XP and sets gameState.bugmonsDefeated += 1
        const currentXp = typeof window.gameState.xp === 'number' ? window.gameState.xp : 100;
        window.gameState.xp = currentXp + 100; // Double XP (+100 instead of standard +50)
        window.gameState.bugmonsDefeated = (window.gameState.bugmonsDefeated || 0) + 1;
      } else {
        const currentXp = typeof window.gameState.xp === 'number' ? window.gameState.xp : 100;
        window.gameState.xp = currentXp + 50;
      }

      if (window.typeText) {
        window.typeText(`VICTORY! ${enemy.name.toUpperCase()} was debugged! You reached ${currentPoints} PTS!`, 22);
      }
      appendConsoleLine('========================================', 'console-pass');
      appendConsoleLine(isBugmon ? '★ BUGMON VANQUISHED! DOUBLE XP EARNED ★' : '★ BATTLE VICTORY! BUG MONSTER DEFEATED ★', 'console-pass');
      appendConsoleLine(`Final Score: ${currentPoints} / ${minPoints} Points. Turns remaining: ${turnsLeft}.`, 'console-pass');
      if (isBugmon) {
        appendConsoleLine(`> Bugmons Defeated Total: ${window.gameState.bugmonsDefeated} | XP: ${window.gameState.xp}`, 'console-pass');
      }
      appendConsoleLine('========================================', 'console-pass');

      if (pickerStatusBadge) {
        pickerStatusBadge.textContent = 'VICTORY ACHIEVED!';
        pickerStatusBadge.className = 'section-badge font-code text-green';
      }
      if (consoleStatusBadge) {
        consoleStatusBadge.textContent = 'SYS: VICTORY';
        consoleStatusBadge.className = 'section-badge font-code text-green';
      }

      if (resultOverlay) {
        if (resultBadge) {
          resultBadge.className = 'result-badge victory font-pixel';
          resultBadge.textContent = isBugmon ? '★ BUGMON VANQUISHED ★' : '★ BATTLE VICTORY ★';
        }
        if (resultTitle) resultTitle.textContent = isBugmon ? `${enemy.name.toUpperCase()} DEFEATED!` : 'BUGMON DEBUGGED!';
        if (resultSubtitle) {
          resultSubtitle.textContent = isBugmon
            ? `Epic victory! Earned DOUBLE XP (+100 XP)! Total Bugmons Defeated: ${window.gameState.bugmonsDefeated}.`
            : `Clean code eliminated all bugs and reached ${currentPoints} PTS! (+50 XP)`;
        }
        if (resultScoreVal) resultScoreVal.textContent = `${currentPoints} / ${minPoints} PTS`;
        if (resultTargetVal) {
          resultTargetVal.className = 'text-green';
          resultTargetVal.textContent = `TARGET MET (${minPoints} MIN)`;
        }
        if (resultTurnsVal) resultTurnsVal.textContent = `${turnsLeft} REMAINING`;
        if (btnResultAction) btnResultAction.textContent = 'PLAY AGAIN ▶';
        resultOverlay.style.display = 'flex';
      }
    } else if (outcome === 'transformation') {
      playSound('bugmon_transform');
      if (window.typeText) {
        window.typeText(`The enemy is still glitching... Bugmon initiated Glitch Transformation!`, 22);
      }
      appendConsoleLine('========================================', 'console-error');
      appendConsoleLine('⚠ GLITCH MUTATION: INSUFFICIENT MINIMUM POINTS ⚠', 'console-error');
      appendConsoleLine(`Score ${currentPoints} / ${minPoints} PTS. Enemy absorbed unhandled exceptions!`, 'console-warn');
      appendConsoleLine('========================================', 'console-error');

      if (pickerStatusBadge) {
        pickerStatusBadge.textContent = 'ENEMY GLITCHING...';
        pickerStatusBadge.className = 'section-badge font-code text-red';
      }
      if (consoleStatusBadge) {
        consoleStatusBadge.textContent = 'SYS: GLITCH CORRUPTION';
        consoleStatusBadge.className = 'section-badge font-code text-red';
      }

      if (resultOverlay) {
        if (resultBadge) {
          resultBadge.className = 'result-badge transformation font-pixel';
          resultBadge.textContent = '⚠ GLITCH MUTATION ⚠';
        }
        if (resultTitle) resultTitle.textContent = 'THE ENEMY IS STILL GLITCHING...';
        if (resultSubtitle) resultSubtitle.textContent = `Points: ${currentPoints}/${minPoints} PTS. Easy-only play cannot defeat Bugmon without medium/hard challenges!`;
        if (resultScoreVal) resultScoreVal.textContent = `${currentPoints} / ${minPoints} PTS`;
        if (resultTargetVal) {
          resultTargetVal.className = 'text-red';
          resultTargetVal.textContent = `FAILED (<${minPoints} MIN)`;
        }
        if (resultTurnsVal) resultTurnsVal.textContent = `${turnsLeft} REMAINING`;
        if (btnResultAction) btnResultAction.textContent = 'CONTINUE ▶';
        resultOverlay.style.display = 'flex';
      }
    } else {
      if (window.pauseBgm) {
        window.pauseBgm();
      }
      playSound('defeat');
      const reason = player.hp <= 0 ? `${player.name.toUpperCase()} fainted!` : 'Turn limit reached!';
      if (window.typeText) {
        window.typeText(`DEFEAT! ${reason} Bugmon overwhelmed your code.`, 22);
      }
      appendConsoleLine('========================================', 'console-fail');
      appendConsoleLine('✖ BATTLE DEFEAT: SYSTEM OVERFLOW ✖', 'console-fail');
      appendConsoleLine(`Final Score: ${currentPoints} / ${minPoints} Points.`, 'console-fail');
      appendConsoleLine('========================================', 'console-fail');

      if (pickerStatusBadge) {
        pickerStatusBadge.textContent = 'BATTLE OVER';
        pickerStatusBadge.className = 'section-badge font-code text-red';
      }
      if (consoleStatusBadge) {
        consoleStatusBadge.textContent = 'SYS: CRASHED';
        consoleStatusBadge.className = 'section-badge font-code text-red';
      }

      if (resultOverlay) {
        if (resultBadge) {
          resultBadge.className = 'result-badge defeat font-pixel';
          resultBadge.textContent = '✖ BATTLE DEFEAT ✖';
        }
        if (resultTitle) resultTitle.textContent = player.hp <= 0 ? `${player.name.toUpperCase()} FAINTED!` : 'SYSTEM CRASH';
        if (resultSubtitle) resultSubtitle.textContent = player.hp <= 0 ? 'Bugmon overwhelmed your defenses with fatal errors.' : 'Turn limit expired before Bugmon could be debugged.';
        if (resultScoreVal) resultScoreVal.textContent = `${currentPoints} / ${minPoints} PTS`;
        if (resultTargetVal) {
          resultTargetVal.className = currentPoints >= minPoints ? 'text-green' : 'text-red';
          resultTargetVal.textContent = currentPoints >= minPoints ? `MET (${minPoints} MIN)` : `FAILED (<${minPoints})`;
        }
        if (resultTurnsVal) resultTurnsVal.textContent = `${turnsLeft} REMAINING`;
        if (btnResultAction) btnResultAction.textContent = 'TRY AGAIN ▶';
        resultOverlay.style.display = 'flex';
      }
    }

    // Update chips found and used in end-of-battle stats card
    const resultChipsFoundVal = document.getElementById('result-chips-found-val');
    const resultChipsUsedVal = document.getElementById('result-chips-used-val');
    const chipsFound = (window.gameState && window.gameState.stats && typeof window.gameState.stats.chipsFound === 'number')
      ? window.gameState.stats.chipsFound
      : 0;
    const chipsUsed = (window.gameState && window.gameState.stats && typeof window.gameState.stats.chipsUsed === 'number')
      ? window.gameState.stats.chipsUsed
      : 0;
    if (resultChipsFoundVal) resultChipsFoundVal.textContent = `${chipsFound}`;
    if (resultChipsUsedVal) resultChipsUsedVal.textContent = `${chipsUsed}`;

    if (codeTextarea) codeTextarea.disabled = true;
    if (btnRunTests) btnRunTests.disabled = true;
    if (btnDevPower) btnDevPower.disabled = true;
    if (btnInventory) btnInventory.disabled = true;
    if (btnInventoryBattle) btnInventoryBattle.disabled = true;
    if (btnHolyHeal) btnHolyHeal.disabled = true;
    if (btnHint) btnHint.disabled = true;
    if (btnResetCode) btnResetCode.disabled = true;
  }

  // -------------------------------------------------------------------------
  // BATTLE INITIALIZATION & CODE LAB UNLOCK
  // -------------------------------------------------------------------------
  function initBattle() {
    const player = window.gameState.player || selectedCodemon;
    const enemy = window.gameState.enemy || activeEnemy;
    if (!player) return;

    window.gameState.player = {
      ...player,
      hp: player.maxHp,
      currentHp: player.maxHp
    };
    window.gameState.enemy = {
      ...enemy,
      hp: enemy.maxHp,
      currentHp: enemy.maxHp
    };

    if (window.setHp) {
      window.setHp('player', player.maxHp, player.maxHp, true);
      window.setHp('enemy', enemy.maxHp, enemy.maxHp, true);
    }

    const startingTurns = 8;
    currentPoints = 0;
    turnsLeft = startingTurns;
    targetPoints = 120;
    battleActive = true;
    isQuestionLocked = false;
    window.gameState.battleActive = true;
    window.gameState.isBugmonBattle = false;
    window.gameState.xp = typeof window.gameState.xp === 'number' ? window.gameState.xp : 100;
    window.gameState.bugmonsDefeated = typeof window.gameState.bugmonsDefeated === 'number' ? window.gameState.bugmonsDefeated : 0;
    window.gameState.stats = {
      chipsFound: 0,
      chipsUsed: 0
    };
    window.gameState.hintUsedThisTurn = false;
    battleUsedChallenges.clear();

    // Reset items so item count always starts from zero on a new game or play again
    if (typeof clearInventory === 'function') {
      clearInventory();
    } else if (typeof window !== 'undefined' && typeof window.clearInventory === 'function') {
      window.clearInventory();
    } else if (window.gameState) {
      window.gameState.inventory = { low: 0, normal: 0, advance: 0 };
    }

    if (window.BATTLE_CONFIG) {
      window.BATTLE_CONFIG.turnLimit = 8;
      window.BATTLE_CONFIG.minPoints = 120;
    }

    if (window.BattleEngine && window.BattleEngine.visualState) {
      window.BattleEngine.visualState.isGlitching = false;
      window.BattleEngine.visualState.isBugmon = false;
      window.BattleEngine.visualState.points = 0;
      window.BattleEngine.visualState.maxPoints = 120;
      window.BattleEngine.visualState.turnsLeft = startingTurns;
    }

    // Set thematic background based on active enemy
    const setBg = window.setBackground || (window.BattleEngine && window.BattleEngine.setBackground);
    const getBgForEnemy = window.getBackgroundForEnemy || (window.BattleEngine && window.BattleEngine.getBackgroundForEnemy);
    if (setBg && getBgForEnemy) {
      setBg(getBgForEnemy(enemy));
    }

    // Reset battle tint and overlays
    const battleScreen = document.getElementById('screen-battle');
    const canvasFrame = document.getElementById('canvas-frame');
    if (battleScreen) {
      battleScreen.classList.remove('bugmon-battle-tint', 'bugmon-glitch-active');
    }
    if (canvasFrame) {
      canvasFrame.classList.remove('screen-glitch-active');
    }

    const bugmonDecisionOverlay = document.getElementById('bugmon-decision-overlay');
    if (bugmonDecisionOverlay) {
      bugmonDecisionOverlay.style.display = 'none';
    }

    const resultOverlay = document.getElementById('battle-result-overlay');
    if (resultOverlay) {
      resultOverlay.style.display = 'none';
    }

    if (window.updateHud) {
      window.updateHud(0, startingTurns);
    }

    const versusTitle = document.getElementById('battle-versus-title');
    if (versusTitle && enemy) {
      versusTitle.textContent = `${player.name.toUpperCase()} VS ${enemy.name.toUpperCase()}`;
    }

    showScreen('battle');

    clearConsole();
    appendConsoleLine('> Codemons Sandbox Kernel v2.4 initialized.', 'console-info');
    appendConsoleLine(`> Target: ${getMinPoints()} Points within ${turnsLeft} Turns.`, 'console-info');
    appendConsoleLine('> Web Worker secure test runner mounted.', 'console-info');
    appendConsoleLine('> Select an attack challenge card above to begin your turn.', 'console-warn');

    if (window.typeText && enemy) {
      window.typeText(`A wild ${enemy.name} appeared! Compile code on the right to strike.`, 22);
    }

    if (btnInventory) btnInventory.disabled = false;
    if (btnInventoryBattle) btnInventoryBattle.disabled = false;
    if (btnHolyHeal) btnHolyHeal.disabled = false;
    if (btnBugMode) btnBugMode.disabled = false;
    if (window.resetChipsUsedThisTurn) window.resetChipsUsedThisTurn();
    if (window.updateChipInventoryBar) window.updateChipInventoryBar();
    if (window.selectChipSlot) window.selectChipSlot(null);
    renderInventory();
    startPlayerTurn();
  }

  // -------------------------------------------------------------------------
  // EVENT LISTENERS & KEYBOARD CONTROLS
  // -------------------------------------------------------------------------
  if (btnHowToPlay && howToPlayBox) {
    btnHowToPlay.addEventListener('click', () => {
      playSound('click');
      const isHidden = howToPlayBox.style.display === 'none' || !howToPlayBox.style.display;
      howToPlayBox.style.display = isHidden ? 'block' : 'none';
    });
  }

  if (btnCloseHowToPlay && howToPlayBox) {
    btnCloseHowToPlay.addEventListener('click', () => {
      playSound('click');
      howToPlayBox.style.display = 'none';
    });
  }

  if (btnStartGame) {
    btnStartGame.addEventListener('click', () => {
      if (typeof clearInventory === 'function') {
        clearInventory();
      } else if (typeof window !== 'undefined' && typeof window.clearInventory === 'function') {
        window.clearInventory();
      }
      showScreen('select');
    });
  }

  // Arena Background Switcher Button
  const btnSwitchArena = document.getElementById('btn-switch-arena');
  if (btnSwitchArena) {
    btnSwitchArena.addEventListener('click', () => {
      playSound('click');
      const getNext = window.getNextBackground || (window.BattleEngine && window.BattleEngine.getNextBackground);
      if (getNext) {
        const nextBg = getNext();
        const isBugmon = (window.BattleEngine && window.BattleEngine.visualState && window.BattleEngine.visualState.isBugmon) || (window.gameState && window.gameState.isBugmonBattle);
        const nameToShow = isBugmon ? nextBg.bugmonName : nextBg.name;
        appendConsoleLine(`> Arena shifted: ${nameToShow}`, 'console-info');
      }
    });
  }

  // -------------------------------------------------------------------------
  // PAUSE MENU CONTROLLER
  // -------------------------------------------------------------------------
  function openPauseMenu() {
    if (isGamePaused || !pauseMenuOverlay) return;
    isGamePaused = true;
    pauseTurnTimer();
    pauseMenuOverlay.style.display = 'flex';
    playSound('click');
    if (btnPauseResume) {
      btnPauseResume.focus();
    }
  }

  function closePauseMenu() {
    if (!isGamePaused || !pauseMenuOverlay) return;
    isGamePaused = false;
    pauseMenuOverlay.style.display = 'none';
    resumeTurnTimer();
    playSound('click');
  }

  function togglePauseMenu() {
    if (isGamePaused) {
      closePauseMenu();
    } else {
      openPauseMenu();
    }
  }

  window.openPauseMenu = openPauseMenu;
  window.closePauseMenu = closePauseMenu;
  window.togglePauseMenu = togglePauseMenu;

  if (btnHudPause) {
    btnHudPause.addEventListener('click', () => {
      openPauseMenu();
    });
  }

  if (btnPauseResume) {
    btnPauseResume.addEventListener('click', () => {
      closePauseMenu();
    });
  }

  if (btnPauseMute) {
    btnPauseMute.addEventListener('click', () => {
      toggleSound();
    });
  }

  if (btnPauseMusic) {
    btnPauseMusic.addEventListener('click', () => {
      toggleMusic();
    });
  }

  if (btnPauseEffects) {
    btnPauseEffects.addEventListener('click', () => {
      toggleEffects();
    });
  }

  if (btnPauseQuit) {
    btnPauseQuit.addEventListener('click', () => {
      battleActive = false;
      if (window.gameState) {
        window.gameState.battleActive = false;
      }
      stopTurnTimer();
      if (typeof clearInventory === 'function') {
        clearInventory();
      } else if (typeof window !== 'undefined' && typeof window.clearInventory === 'function') {
        window.clearInventory();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    const isTypingInEditor = document.activeElement && document.activeElement.id === 'code-textarea';

    // 1. Escape key: closes open modals/overlays or toggles pause menu
    if (e.key === 'Escape') {
      e.preventDefault();
      if (inventoryOverlay && inventoryOverlay.style.display === 'flex') {
        closeInventory();
        return;
      } else if (isGamePaused) {
        closePauseMenu();
      } else if (howToPlayBox && (howToPlayBox.style.display === 'block' || howToPlayBox.style.display === 'flex')) {
        howToPlayBox.style.display = 'none';
        playSound('click');
      } else if (bugmonDecisionOverlay && bugmonDecisionOverlay.style.display === 'flex') {
        playSound('click');
        bugmonDecisionOverlay.style.display = 'none';
        handleBattleOutcome('bugmon_escaped');
      } else if (resultOverlay && resultOverlay.style.display === 'flex') {
        playSound('click');
        resultOverlay.style.display = 'none';
        showScreen('title');
      } else if (pickerExpandedOverlay && pickerExpandedOverlay.style.display === 'flex') {
        hideExpandedPicker();
        playSound('click');
      } else if (currentScreen === 'battle') {
        openPauseMenu();
      } else if (currentScreen === 'select') {
        showScreen('title');
      }
      return;
    }

    if (isTypingInEditor) {
      return;
    }

    // Keyboard shortcuts: keys 1, 2, 3 use the low, normal, advance chip
    if (e.key === '1' || e.key === '2' || e.key === '3') {
      const isInput = document.activeElement && (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable
      );
      if (!isInput) {
        e.preventDefault();
        const chipMap = { '1': 'low', '2': 'normal', '3': 'advance' };
        const chipId = chipMap[e.key];
        if (window.selectChipSlot) window.selectChipSlot(chipId);
        if (window.useChip) window.useChip(chipId);
        return;
      }
    }

    // Toggle inventory with 'I' hotkey
    if (e.key === 'i' || e.key === 'I') {
      if (inventoryOverlay && inventoryOverlay.style.display === 'flex') {
        closeInventory();
      } else {
        openInventory();
      }
      return;
    }

    // 2. Navigation when pause menu is open
    if (isGamePaused) {
      const pauseButtons = [btnPauseResume, btnPauseMute, btnPauseMusic, btnPauseEffects, btnPauseQuit].filter(Boolean);
      const activeIdx = pauseButtons.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIdx = (activeIdx + 1) % pauseButtons.length;
        pauseButtons[nextIdx].focus();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIdx = (activeIdx - 1 + pauseButtons.length) % pauseButtons.length;
        pauseButtons[prevIdx].focus();
      }
      return;
    }

    // 3. Screen navigation (Arrows, Enter, Space)
    if (currentScreen === 'title') {
      if (e.key === 'Enter' || e.key === ' ') {
        if (document.activeElement && (document.activeElement.tagName === 'BUTTON' || document.activeElement.tagName === 'A')) {
          return;
        }
        e.preventDefault();
        showScreen('select');
      }
    } else if (currentScreen === 'select') {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const cols = (window.innerWidth && window.innerWidth <= 640) ? 1 : 3;
        moveSelection(-cols);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const cols = (window.innerWidth && window.innerWidth <= 640) ? 1 : 3;
        moveSelection(cols);
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (document.activeElement && (document.activeElement.id === 'btn-back-to-title' || document.activeElement.id === 'sound-toggle-btn' || document.activeElement.id === 'music-toggle-btn' || document.activeElement.id === 'effects-toggle-btn')) {
          return;
        }
        e.preventDefault();
        confirmStarterChoice();
      }
    } else if (currentScreen === 'battle') {
      // Allow arrow keys to cycle between available challenge cards when choosing a challenge
      if (!activeChallenge && pickerCardsContainer) {
        const pickerCards = Array.from(pickerCardsContainer.querySelectorAll('.picker-card:not(.locked)'));
        if (pickerCards.length > 0) {
          const currentCardIdx = pickerCards.indexOf(document.activeElement);
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = currentCardIdx === -1 ? 0 : (currentCardIdx + 1) % pickerCards.length;
            pickerCards[nextIdx].focus();
            showExpandedPicker(nextIdx);
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIdx = currentCardIdx === -1 ? 0 : (currentCardIdx - 1 + pickerCards.length) % pickerCards.length;
            pickerCards[prevIdx].focus();
            showExpandedPicker(prevIdx);
          } else if ((e.key === 'Enter' || e.key === ' ') && currentCardIdx !== -1) {
            e.preventDefault();
            hideExpandedPicker();
            pickerCards[currentCardIdx].click();
          }
        }
      }
    }
  });

  if (btnBackToTitle) {
    btnBackToTitle.addEventListener('click', () => {
      showScreen('title');
    });
  }

  if (btnConfirmStarter) {
    btnConfirmStarter.addEventListener('click', () => {
      confirmStarterChoice();
    });
  }

  if (btnForfeitBattle) {
    btnForfeitBattle.addEventListener('click', () => {
      battleActive = false;
      if (window.gameState) {
        window.gameState.battleActive = false;
      }
      stopTurnTimer();
      showScreen('title');
    });
  }

  // Instant Bugmon Transformation Button ("BUG MODE")
  if (btnBugMode) {
    btnBugMode.addEventListener('click', async () => {
      playSound('click');
      if (!battleActive) return;
      const isAlreadyBugmon = (window.BattleEngine && window.BattleEngine.visualState && window.BattleEngine.visualState.isBugmon) || (window.gameState && window.gameState.isBugmonBattle);
      if (isAlreadyBugmon) {
        appendConsoleLine('> [BUG MODE]: Enemy is already transformed into a BUGMON!', 'console-warn');
        return;
      }
      appendConsoleLine('> ⚡ [BUG MODE ENGAGED]: Instant corruption signal sent! Triggering transformation...', 'console-error');
      btnBugMode.disabled = true;
      if (window.triggerBugmonTransformation) {
        await window.triggerBugmonTransformation();
      } else if (window.BattleEngine && window.BattleEngine.triggerBugmonTransformation) {
        await window.BattleEngine.triggerBugmonTransformation();
      }
    });
  }

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      toggleSound();
    });
  }

  if (musicToggleBtn) {
    musicToggleBtn.addEventListener('click', () => {
      toggleMusic();
    });
  }

  if (effectsToggleBtn) {
    effectsToggleBtn.addEventListener('click', () => {
      toggleEffects();
    });
  }

  // Result overlay buttons
  const btnResultAction = document.getElementById('btn-result-action');
  const btnResultTitle = document.getElementById('btn-result-title');
  const resultOverlay = document.getElementById('battle-result-overlay');

  if (btnResultAction) {
    btnResultAction.addEventListener('click', () => {
      playSound('click');
      if (resultOverlay) resultOverlay.style.display = 'none';
      if (typeof clearInventory === 'function') {
        clearInventory();
      } else if (typeof window !== 'undefined' && typeof window.clearInventory === 'function') {
        window.clearInventory();
      }
      initBattle();
    });
  }

  if (btnResultTitle) {
    btnResultTitle.addEventListener('click', () => {
      playSound('click');
      if (resultOverlay) resultOverlay.style.display = 'none';
      if (typeof clearInventory === 'function') {
        clearInventory();
      } else if (typeof window !== 'undefined' && typeof window.clearInventory === 'function') {
        window.clearInventory();
      }
      showScreen('title');
    });
  }

  // -------------------------------------------------------------------------
  // BUGMON DECISION MODAL ("FIGHT" or "RUN")
  // -------------------------------------------------------------------------
  function showBugmonDecisionModal(variant) {
    const overlay = document.getElementById('bugmon-decision-overlay');
    const titleEl = document.getElementById('decision-enemy-title');
    const spriteEl = document.getElementById('decision-bugmon-sprite');

    if (titleEl && variant) {
      titleEl.textContent = `${variant.name.toUpperCase()} APPEARED!`;
    }
    if (spriteEl && variant && variant.sprite) {
      spriteEl.src = variant.sprite;
      spriteEl.alt = variant.name;
    }

    if (overlay) {
      overlay.style.display = 'flex';
    }

    if (typeof playSound === 'function') {
      playSound('glitch');
    }
  }

  window.showBugmonDecisionModal = showBugmonDecisionModal;

  const btnBugmonFight = document.getElementById('btn-bugmon-fight');
  const btnBugmonRun = document.getElementById('btn-bugmon-run');
  const bugmonDecisionOverlay = document.getElementById('bugmon-decision-overlay');

  if (btnBugmonFight) {
    btnBugmonFight.addEventListener('click', () => {
      playSound('click');
      if (bugmonDecisionOverlay) bugmonDecisionOverlay.style.display = 'none';

      // Bugmon Battle Rules Config: turnLimit 6, minPoints 150
      if (window.BATTLE_CONFIG) {
        window.BATTLE_CONFIG.turnLimit = 6;
        window.BATTLE_CONFIG.minPoints = 150;
      }

      if (window.BattleEngine && window.BattleEngine.visualState) {
        window.BattleEngine.visualState.isBugmon = true;
        window.BattleEngine.visualState.turnsLeft = 6;
        window.BattleEngine.visualState.points = 0;
        window.BattleEngine.visualState.maxPoints = 150;
      }

      currentPoints = 0;
      turnsLeft = 6;
      targetPoints = 150;
      battleActive = true;

      if (window.gameState) {
        window.gameState.isBugmonBattle = true;
        window.gameState.turnsLeft = 6;
        window.gameState.score = 0;
        window.gameState.battleActive = true;
      }

      if (window.updateHud) {
        window.updateHud(0, 6);
      }

      appendConsoleLine('========================================', 'console-error');
      appendConsoleLine('⚔ BUGMON BATTLE ENGAGED! ⚔', 'console-error');
      appendConsoleLine('> Easy difficulty is LOCKED. Medium & Hard questions only.', 'console-warn');
      appendConsoleLine('> New Config: 6 Turns Limit | 150 Min Points Target.', 'console-warn');
      appendConsoleLine('> Bugmon attack power increased to 12 - 20 DMG.', 'console-warn');
      appendConsoleLine('========================================', 'console-error');

      startPlayerTurn();
    });
  }

  if (btnBugmonRun) {
    btnBugmonRun.addEventListener('click', () => {
      playSound('click');
      if (bugmonDecisionOverlay) bugmonDecisionOverlay.style.display = 'none';
      handleBattleOutcome('bugmon_escaped');
    });
  }

  // -------------------------------------------------------------------------
  // RESIZABLE CARDS & SECTIONS (Horizontal / Vertical Splitters & Maximize)
  // -------------------------------------------------------------------------
  function initResizablePanels() {
    const appEl = document.getElementById('app');
    const panelResizerCol = document.getElementById('panel-resizer-col');
    const resizerPickerEditor = document.getElementById('resizer-picker-editor');
    const resizerEditorConsole = document.getElementById('resizer-editor-console');
    const questionPickerSec = document.getElementById('question-picker');
    const editorAreaSec = document.getElementById('editor-area');
    const outputConsoleSec = document.getElementById('output-console');
    const codePanelSections = document.querySelector('.code-panel-sections');

    // 1. Restore saved layout dimensions from localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        const savedColWidth = localStorage.getItem('codemons_panel_width');
        if (savedColWidth && gamePanel) {
          gamePanel.style.width = savedColWidth;
        }
        let savedPickerHeight = localStorage.getItem('codemons_picker_height');
        if (savedPickerHeight && questionPickerSec) {
          if (savedPickerHeight.endsWith('px')) {
            savedPickerHeight = (parseFloat(savedPickerHeight) / 16).toFixed(4) + 'rem';
          }
          questionPickerSec.style.height = savedPickerHeight;
          questionPickerSec.style.flex = `0 0 ${savedPickerHeight}`;
        }
        let savedConsoleHeight = localStorage.getItem('codemons_console_height');
        if (savedConsoleHeight && outputConsoleSec) {
          if (savedConsoleHeight.endsWith('px')) {
            savedConsoleHeight = (parseFloat(savedConsoleHeight) / 16).toFixed(4) + 'rem';
          }
          outputConsoleSec.style.height = savedConsoleHeight;
          outputConsoleSec.style.flex = `0 0 ${savedConsoleHeight}`;
        }
      }
    } catch (e) {
      console.warn('LocalStorage layout retrieval error:', e);
    }

    // 2. Horizontal Split Resizer (Between Game Panel and Code Panel)
    if (panelResizerCol && gamePanel && appEl) {
      let isDraggingCol = false;

      function onColPointerDown(e) {
        e.preventDefault();
        isDraggingCol = true;
        document.body.classList.add('resizing-col');
        window.addEventListener('pointermove', onColPointerMove);
        window.addEventListener('pointerup', onColPointerUp);
        window.addEventListener('pointercancel', onColPointerUp);
      }

      function onColPointerMove(e) {
        if (!isDraggingCol) return;
        const appRect = appEl.getBoundingClientRect();
        
        if (window.innerWidth > 900) {
          // Desktop: horizontal resizing
          const clientX = e.clientX;
          const minW = 320;
          const maxW = appRect.width - 340;
          let newW = clientX - appRect.left;
          if (newW < minW) newW = minW;
          if (newW > maxW) newW = maxW;

          const pct = ((newW / appRect.width) * 100).toFixed(2) + '%';
          gamePanel.style.width = pct;
          try {
            localStorage.setItem('codemons_panel_width', pct);
          } catch (_) {}
        } else {
          // Mobile / Tablet (< 900px): vertical stacked resizing
          const clientY = e.clientY;
          const minH = 220;
          const maxH = appRect.height - 240;
          let newH = clientY - appRect.top;
          if (newH < minH) newH = minH;
          if (newH > maxH) newH = maxH;

          const hRem = (newH / 16).toFixed(4) + 'rem';
          gamePanel.style.setProperty('--game-panel-height', hRem);
          gamePanel.style.height = hRem;
        }

        window.dispatchEvent(new Event('resize'));
      }

      function onColPointerUp() {
        if (!isDraggingCol) return;
        isDraggingCol = false;
        document.body.classList.remove('resizing-col');
        window.removeEventListener('pointermove', onColPointerMove);
        window.removeEventListener('pointerup', onColPointerUp);
        window.removeEventListener('pointercancel', onColPointerUp);
        window.dispatchEvent(new Event('resize'));
      }

      panelResizerCol.addEventListener('pointerdown', onColPointerDown);

      // Double-click resets back to default 55% / 45%
      panelResizerCol.addEventListener('dblclick', () => {
        gamePanel.style.width = '51%';
        gamePanel.style.height = '';
        gamePanel.style.removeProperty('--game-panel-height');
        try {
          localStorage.removeItem('codemons_panel_width');
        } catch (_) {}
        window.dispatchEvent(new Event('resize'));
      });
    }

    // 3. Section Resizer 1 (Question Picker <-> Code Editor)
    if (resizerPickerEditor && questionPickerSec && codePanel) {
      let isDraggingRow1 = false;
      let startY = 0;
      let startHeight = 0;

      function onRow1PointerDown(e) {
        e.preventDefault();
        isDraggingRow1 = true;
        startY = e.clientY;
        startHeight = questionPickerSec.getBoundingClientRect().height;
        document.body.classList.add('resizing-row');
        window.addEventListener('pointermove', onRow1PointerMove);
        window.addEventListener('pointerup', onRow1PointerUp);
        window.addEventListener('pointercancel', onRow1PointerUp);
      }

      function onRow1PointerMove(e) {
        if (!isDraggingRow1) return;
        const delta = e.clientY - startY;
        const containerH = codePanel.getBoundingClientRect().height;
        let newH = startHeight + delta;
        if (newH < 100) newH = 100;
        if (newH > containerH - 240) newH = containerH - 240;

        const hRem = (newH / 16).toFixed(4) + 'rem';
        questionPickerSec.style.height = hRem;
        questionPickerSec.style.flex = `0 0 ${hRem}`;
        try {
          localStorage.setItem('codemons_picker_height', hRem);
        } catch (_) {}
      }

      function onRow1PointerUp() {
        if (!isDraggingRow1) return;
        isDraggingRow1 = false;
        document.body.classList.remove('resizing-row');
        window.removeEventListener('pointermove', onRow1PointerMove);
        window.removeEventListener('pointerup', onRow1PointerUp);
        window.removeEventListener('pointercancel', onRow1PointerUp);
      }

      resizerPickerEditor.addEventListener('pointerdown', onRow1PointerDown);

      resizerPickerEditor.addEventListener('dblclick', () => {
        questionPickerSec.style.height = '';
        questionPickerSec.style.flex = '';
        try {
          localStorage.removeItem('codemons_picker_height');
        } catch (_) {}
      });
    }

    // 4. Section Resizer 2 (Code Editor <-> Output Console)
    if (resizerEditorConsole && outputConsoleSec && codePanel) {
      let isDraggingRow2 = false;
      let startY = 0;
      let startHeight = 0;

      function onRow2PointerDown(e) {
        e.preventDefault();
        isDraggingRow2 = true;
        startY = e.clientY;
        startHeight = outputConsoleSec.getBoundingClientRect().height;
        document.body.classList.add('resizing-row');
        window.addEventListener('pointermove', onRow2PointerMove);
        window.addEventListener('pointerup', onRow2PointerUp);
        window.addEventListener('pointercancel', onRow2PointerUp);
      }

      function onRow2PointerMove(e) {
        if (!isDraggingRow2) return;
        const delta = startY - e.clientY; // Dragging upward increases console height
        const containerH = codePanel.getBoundingClientRect().height;
        let newH = startHeight + delta;
        if (newH < 80) newH = 80;
        if (newH > containerH - 240) newH = containerH - 240;

        const hRem = (newH / 16).toFixed(4) + 'rem';
        outputConsoleSec.style.height = hRem;
        outputConsoleSec.style.flex = `0 0 ${hRem}`;
        try {
          localStorage.setItem('codemons_console_height', hRem);
        } catch (_) {}
      }

      function onRow2PointerUp() {
        if (!isDraggingRow2) return;
        isDraggingRow2 = false;
        document.body.classList.remove('resizing-row');
        window.removeEventListener('pointermove', onRow2PointerMove);
        window.removeEventListener('pointerup', onRow2PointerUp);
        window.removeEventListener('pointercancel', onRow2PointerUp);
      }

      resizerEditorConsole.addEventListener('pointerdown', onRow2PointerDown);

      resizerEditorConsole.addEventListener('dblclick', () => {
        outputConsoleSec.style.height = '';
        outputConsoleSec.style.flex = '';
        try {
          localStorage.removeItem('codemons_console_height');
        } catch (_) {}
      });
    }

    // 5. Maximize / Restore Section Buttons ("⤢")
    document.querySelectorAll('.btn-section-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-section');
        const targetSec = document.getElementById(targetId);
        if (!targetSec || !codePanelSections) return;

        const isCurrentlyMaximized = targetSec.classList.contains('maximized');
        document.querySelectorAll('.code-section').forEach(s => s.classList.remove('maximized'));
        document.querySelectorAll('.btn-section-toggle').forEach(b => {
          b.textContent = '⤢';
          b.title = 'Maximize Section';
        });

        if (!isCurrentlyMaximized) {
          targetSec.classList.add('maximized');
          codePanelSections.classList.add('has-maximized');
          btn.textContent = '✕';
          btn.title = 'Restore Normal Sections';
          playSound('click');
        } else {
          codePanelSections.classList.remove('has-maximized');
          playSound('click');
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // CARD VISIBILITY CONTROLLER: HIDE / UNHIDE CARDS
  // (Game and Coding Editor are strictly protected and must always stay open)
  // -------------------------------------------------------------------------
  function initCardVisibilityToggles() {
    const questionPickerSec = document.getElementById('question-picker');
    const resizerPickerEditor = document.getElementById('resizer-picker-editor');
    const challengeInfoStrip = document.getElementById('challenge-info-strip');
    const outputConsoleSec = document.getElementById('output-console');
    const resizerEditorConsole = document.getElementById('resizer-editor-console');

    // Section Header Action Buttons
    const btnTogglePicker = document.getElementById('btn-toggle-picker');
    const btnToggleDesc = document.getElementById('btn-toggle-desc');
    const btnToggleConsole = document.getElementById('btn-toggle-console');

    // Top Visibility Toolbar Chips
    const barTogglePicker = document.getElementById('bar-toggle-picker');
    const barToggleDesc = document.getElementById('bar-toggle-desc');
    const barToggleConsole = document.getElementById('bar-toggle-console');

    // 1. Toggle Question Picker Cards
    function setQuestionPickerVisibility(visible) {
      if (!questionPickerSec) return;
      if (visible) {
        questionPickerSec.classList.remove('card-hidden');
        if (resizerPickerEditor) resizerPickerEditor.classList.remove('hidden-resizer');
        if (btnTogglePicker) {
          btnTogglePicker.textContent = '[-] HIDE CARDS';
          btnTogglePicker.classList.remove('is-hidden');
          btnTogglePicker.setAttribute('aria-expanded', 'true');
        }
        if (barTogglePicker) {
          barTogglePicker.classList.add('active');
          barTogglePicker.setAttribute('aria-pressed', 'true');
          const dot = barTogglePicker.querySelector('.chip-dot');
          if (dot) dot.textContent = '●';
        }
      } else {
        questionPickerSec.classList.add('card-hidden');
        if (resizerPickerEditor) resizerPickerEditor.classList.add('hidden-resizer');
        if (btnTogglePicker) {
          btnTogglePicker.textContent = '[+] SHOW CARDS';
          btnTogglePicker.classList.add('is-hidden');
          btnTogglePicker.setAttribute('aria-expanded', 'false');
        }
        if (barTogglePicker) {
          barTogglePicker.classList.remove('active');
          barTogglePicker.setAttribute('aria-pressed', 'false');
          const dot = barTogglePicker.querySelector('.chip-dot');
          if (dot) dot.textContent = '○';
        }
      }
      saveCardVisibility();
      window.dispatchEvent(new Event('resize'));
    }

    // 2. Toggle Challenge Description Card
    function setChallengeDescVisibility(visible) {
      if (!challengeInfoStrip) return;
      if (visible) {
        challengeInfoStrip.classList.remove('card-hidden');
        if (btnToggleDesc) {
          btnToggleDesc.textContent = '[-] HIDE DESC';
          btnToggleDesc.classList.remove('is-hidden');
          btnToggleDesc.setAttribute('aria-expanded', 'true');
        }
        if (barToggleDesc) {
          barToggleDesc.classList.add('active');
          barToggleDesc.setAttribute('aria-pressed', 'true');
          const dot = barToggleDesc.querySelector('.chip-dot');
          if (dot) dot.textContent = '●';
        }
      } else {
        challengeInfoStrip.classList.add('card-hidden');
        if (btnToggleDesc) {
          btnToggleDesc.textContent = '[+] SHOW DESC';
          btnToggleDesc.classList.add('is-hidden');
          btnToggleDesc.setAttribute('aria-expanded', 'false');
        }
        if (barToggleDesc) {
          barToggleDesc.classList.remove('active');
          barToggleDesc.setAttribute('aria-pressed', 'false');
          const dot = barToggleDesc.querySelector('.chip-dot');
          if (dot) dot.textContent = '○';
        }
      }
      saveCardVisibility();
      window.dispatchEvent(new Event('resize'));
    }

    // 3. Toggle Output Console Card
    function setConsoleVisibility(visible) {
      if (!outputConsoleSec) return;
      if (visible) {
        outputConsoleSec.classList.remove('card-hidden');
        if (resizerEditorConsole) resizerEditorConsole.classList.remove('hidden-resizer');
        if (btnToggleConsole) {
          btnToggleConsole.textContent = '[-] HIDE CONSOLE';
          btnToggleConsole.classList.remove('is-hidden');
          btnToggleConsole.setAttribute('aria-expanded', 'true');
        }
        if (barToggleConsole) {
          barToggleConsole.classList.add('active');
          barToggleConsole.setAttribute('aria-pressed', 'true');
          const dot = barToggleConsole.querySelector('.chip-dot');
          if (dot) dot.textContent = '●';
        }
      } else {
        outputConsoleSec.classList.add('card-hidden');
        if (resizerEditorConsole) resizerEditorConsole.classList.add('hidden-resizer');
        if (btnToggleConsole) {
          btnToggleConsole.textContent = '[+] SHOW CONSOLE';
          btnToggleConsole.classList.add('is-hidden');
          btnToggleConsole.setAttribute('aria-expanded', 'false');
        }
        if (barToggleConsole) {
          barToggleConsole.classList.remove('active');
          barToggleConsole.setAttribute('aria-pressed', 'false');
          const dot = barToggleConsole.querySelector('.chip-dot');
          if (dot) dot.textContent = '○';
        }
      }
      saveCardVisibility();
      window.dispatchEvent(new Event('resize'));
    }

    function saveCardVisibility() {
      try {
        const state = {
          picker: !questionPickerSec?.classList.contains('card-hidden'),
          desc: !challengeInfoStrip?.classList.contains('card-hidden'),
          console: !outputConsoleSec?.classList.contains('card-hidden')
        };
        localStorage.setItem('codemons_cards_visibility', JSON.stringify(state));
      } catch (_) {}
    }

    // Restore saved card visibility from localStorage
    try {
      const saved = localStorage.getItem('codemons_cards_visibility');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.picker === false) setQuestionPickerVisibility(false);
        if (state.desc === false) setChallengeDescVisibility(false);
        if (state.console === false) setConsoleVisibility(false);
      }
    } catch (_) {}

    // Attach listeners for Question Picker
    if (btnTogglePicker) {
      btnTogglePicker.addEventListener('click', (e) => {
        e.stopPropagation();
        playSound('click');
        const isHidden = questionPickerSec?.classList.contains('card-hidden');
        setQuestionPickerVisibility(isHidden);
      });
    }
    if (barTogglePicker) {
      barTogglePicker.addEventListener('click', (e) => {
        e.stopPropagation();
        playSound('click');
        const isHidden = questionPickerSec?.classList.contains('card-hidden');
        setQuestionPickerVisibility(isHidden);
      });
    }

    // Attach listeners for Challenge Description Card
    if (btnToggleDesc) {
      btnToggleDesc.addEventListener('click', (e) => {
        e.stopPropagation();
        playSound('click');
        const isHidden = challengeInfoStrip?.classList.contains('card-hidden');
        setChallengeDescVisibility(isHidden);
      });
    }
    if (barToggleDesc) {
      barToggleDesc.addEventListener('click', (e) => {
        e.stopPropagation();
        playSound('click');
        const isHidden = challengeInfoStrip?.classList.contains('card-hidden');
        setChallengeDescVisibility(isHidden);
      });
    }

    // Attach listeners for Output Console
    if (btnToggleConsole) {
      btnToggleConsole.addEventListener('click', (e) => {
        e.stopPropagation();
        playSound('click');
        const isHidden = outputConsoleSec?.classList.contains('card-hidden');
        setConsoleVisibility(isHidden);
      });
    }
    if (barToggleConsole) {
      barToggleConsole.addEventListener('click', (e) => {
        e.stopPropagation();
        playSound('click');
        const isHidden = outputConsoleSec?.classList.contains('card-hidden');
        setConsoleVisibility(isHidden);
      });
    }

    // Expose helpers globally
    window.setQuestionPickerVisibility = setQuestionPickerVisibility;
    window.setChallengeDescVisibility = setChallengeDescVisibility;
    window.setConsoleVisibility = setConsoleVisibility;
  }

  // Expose methods for BattleEngine in battle.js and external integration
  window.startPlayerTurn = startPlayerTurn;
  window.appendConsoleLine = appendConsoleLine;
  window.handleBattleOutcome = handleBattleOutcome;
  window.initResizablePanels = initResizablePanels;
  window.initCardVisibilityToggles = initCardVisibilityToggles;
  window.isQuestionLocked = () => isQuestionLocked;
  window.selectChallengeCard = selectChallengeCard;

  // Initial setup
  renderStarters();
  initResizablePanels();
  initCardVisibilityToggles();
  if (window.updateChipInventoryBar) {
    window.updateChipInventoryBar();
  }
});
