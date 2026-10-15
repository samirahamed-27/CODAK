/**
 * Main Controller: Screen Switching, 160x144 Canvas Rendering & Codemon Selection
 * Mirai-Game / Gamify Platform
 */

// Global Game State
window.gameState = window.gameState || {
  player: null,
  enemy: null,
  turn: 1,
  score: 0,
  phase: 'idle'
};

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
  const startersContainer = document.getElementById('starters-list');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');

  // Code Panel DOM Elements
  const pickerCardsContainer = document.getElementById('picker-cards-container');
  const pickerStatusBadge = document.getElementById('picker-status-badge');

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
  const btnHint = document.getElementById('btn-hint');
  const btnResetCode = document.getElementById('btn-reset-code');

  const consoleStatusBadge = document.getElementById('console-status-badge');
  const consoleOutput = document.getElementById('console-output');

  // State
  let currentScreen = 'title';
  let selectedIndex = 0;
  let selectedCodemon = null;
  let activeEnemy = null;
  let soundEnabled = true;
  let challengesCatalog = [];
  let animFrameId = null;
  let animTick = 0;

  // Battle & Turn State
  let battleActive = false;
  let currentPoints = 0;
  const targetPoints = 120;
  let turnsLeft = 8;
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

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.setValueAtTime(0.01, now + 0.07);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'select') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(780, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.setValueAtTime(0.01, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'battle') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.setValueAtTime(440, now + 0.12);
        osc.frequency.setValueAtTime(880, now + 0.25);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.setValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.16);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
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
  activeEnemy = window.ENEMY_BUGMON || (window.CodemonData ? window.CodemonData.ENEMY_BUGMON : {
    id: 'bugmon',
    name: 'Bugmon',
    language: 'Bug/Glitch',
    maxHp: 130,
    hp: 130,
    attackPower: 1.0,
    spriteFront: 'assets/nullpointer.svg',
    spriteBack: 'assets/nullpointer.svg',
    moves: [{ name: 'Segfault Slam', power: 26 }]
  });
  
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
    currentScreen = targetScreen;

    if (targetScreen === 'select') {
      renderStarters();
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
      `;

      // Hover highlights card with blinking border
      card.addEventListener('mouseenter', () => {
        selectStarterIndex(idx, false);
      });

      // Arrow-key focusing highlights card
      card.addEventListener('focus', () => {
        selectStarterIndex(idx, false);
      });

      // Clicking a card stores choice in gameState.player and calls showScreen("battle")
      card.addEventListener('click', () => {
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

    const newIndex = (selectedIndex + direction + codemonsList.length) % codemonsList.length;
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

    // Store enemy in gameState
    window.gameState.enemy = window.gameState.enemy || {
      ...(window.ENEMY_BUGMON || (window.CodemonData ? window.CodemonData.ENEMY_BUGMON : {
        id: 'bugmon',
        name: 'Bugmon',
        language: 'Bug/Glitch',
        maxHp: 130,
        hp: 130,
        attackPower: 1.0,
        spriteFront: 'assets/nullpointer.svg',
        spriteBack: 'assets/nullpointer.svg'
      }))
    };

    playSound('battle');
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

  // Gutter line numbers and scroll synchronization
  function updateGutter() {
    if (!editorGutter || !codeTextarea) return;
    const lines = (codeTextarea.value.split('\n').length) || 1;
    editorGutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
    editorGutter.scrollTop = codeTextarea.scrollTop;
  }

  if (codeTextarea) {
    codeTextarea.addEventListener('input', updateGutter);
    codeTextarea.addEventListener('scroll', () => {
      if (editorGutter) {
        editorGutter.scrollTop = codeTextarea.scrollTop;
      }
    });

    // Tab key inserts 2 spaces instead of changing focus
    codeTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = codeTextarea.selectionStart;
        const end = codeTextarea.selectionEnd;
        const val = codeTextarea.value;
        codeTextarea.value = val.substring(0, start) + '  ' + val.substring(end);
        codeTextarea.selectionStart = codeTextarea.selectionEnd = start + 2;
        updateGutter();
      }
    });
  }

  // Turn Timer Helpers (60s easy, 90s medium, 120s hard)
  function startTurnTimer(seconds) {
    stopTurnTimer();
    timerRemaining = seconds;
    timerTotal = seconds;
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

  function stopTurnTimer() {
    if (turnTimerId) {
      clearInterval(turnTimerId);
      turnTimerId = null;
    }
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

    activeChallenge = null;
    hintUsedThisTurn = false;
    stopTurnTimer();

    // 3 challenge cards: 1 Easy (10 dmg), 1 Medium (20 dmg), 1 Hard (35 dmg)
    const easyCard = pickRandomChallenge('easy');
    const mediumCard = pickRandomChallenge('medium');
    const hardCard = pickRandomChallenge('hard');

    currentTurnCards = [easyCard, mediumCard, hardCard].filter(Boolean);
    renderPickerCards(currentTurnCards);

    // Reset Editor Area to waiting prompt
    if (currentChallengeBadge) {
      currentChallengeBadge.textContent = 'NO MOVE SELECTED';
      currentChallengeBadge.className = 'badge-difficulty font-pixel';
    }
    if (editorChallengeTitle) editorChallengeTitle.textContent = 'SELECT A CHALLENGE CARD ABOVE';
    if (editorChallengeTopic) editorChallengeTopic.textContent = 'TOPIC: NONE';
    if (editorChallengeDesc) {
      editorChallengeDesc.textContent = 'Pick an attack challenge above (Easy: 10 DMG, Medium: 20 DMG, Hard: 35 DMG) to load your coding turn.';
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
    if (btnHint) {
      btnHint.disabled = true;
      btnHint.textContent = '? HINT (-5 PTS)';
    }
    if (btnResetCode) btnResetCode.disabled = true;

    if (pickerStatusBadge) {
      pickerStatusBadge.textContent = 'SELECT DIFFICULTY TO ATTACK';
      pickerStatusBadge.className = 'section-badge font-code text-yellow';
    }
    if (consoleStatusBadge) {
      consoleStatusBadge.textContent = 'SYS: READY';
      consoleStatusBadge.className = 'section-badge font-code text-green';
    }
  }

  function renderPickerCards(cards) {
    if (!pickerCardsContainer) return;
    pickerCardsContainer.innerHTML = '';

    cards.forEach((challenge) => {
      const dmgMap = { easy: 10, medium: 20, hard: 35 };
      const dmg = dmgMap[challenge.difficulty] || 10;

      const card = document.createElement('div');
      card.className = `picker-card ${challenge.difficulty}`;
      card.id = `card-${challenge.id}`;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${challenge.difficulty.toUpperCase()} challenge: ${challenge.title}. Deals ${dmg} damage.`);

      card.innerHTML = `
        <div class="picker-card-header">
          <span class="picker-badge font-pixel">${challenge.difficulty.toUpperCase()}</span>
          <span class="picker-card-dmg font-pixel">${dmg} DMG</span>
        </div>
        <div class="picker-card-title font-pixel">${challenge.title}</div>
        <div class="picker-card-desc font-code">${challenge.description}</div>
        <div class="picker-card-topic font-pixel">TOPIC: ${challenge.topic.toUpperCase()}</div>
      `;

      card.addEventListener('click', () => {
        selectChallengeCard(challenge, card);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectChallengeCard(challenge, card);
        }
      });

      pickerCardsContainer.appendChild(card);
    });
  }

  function selectChallengeCard(challenge, cardElement) {
    if (!battleActive || activeChallenge) return;

    playSound('select');
    activeChallenge = challenge;
    battleUsedChallenges.add(challenge.id);

    // Clicking a card selects it, locks the other two for this turn
    const allCards = pickerCardsContainer ? pickerCardsContainer.querySelectorAll('.picker-card') : [];
    allCards.forEach((c) => {
      if (c === cardElement) {
        c.classList.add('selected');
        c.classList.remove('locked');
        c.setAttribute('aria-selected', 'true');
      } else {
        c.classList.add('locked');
        c.classList.remove('selected');
        c.setAttribute('aria-disabled', 'true');
        c.tabIndex = -1;
      }
    });

    if (pickerStatusBadge) {
      pickerStatusBadge.textContent = `MOVE LOCKED: ${challenge.difficulty.toUpperCase()}`;
      pickerStatusBadge.className = 'section-badge font-code text-green';
    }

    const dmgMap = { easy: 10, medium: 20, hard: 35 };
    const dmg = dmgMap[challenge.difficulty] || 10;

    // Load the challenge into editor
    if (currentChallengeBadge) {
      currentChallengeBadge.textContent = `[${challenge.difficulty.toUpperCase()}] ${dmg} DMG`;
      currentChallengeBadge.className = `badge-difficulty ${challenge.difficulty} font-pixel`;
    }
    if (editorChallengeTitle) editorChallengeTitle.textContent = challenge.title;
    if (editorChallengeTopic) editorChallengeTopic.textContent = `TOPIC: ${challenge.topic.toUpperCase()}`;
    if (editorChallengeDesc) editorChallengeDesc.textContent = challenge.description;
    if (challengeHintBox) challengeHintBox.style.display = 'none';

    if (codeTextarea) {
      codeTextarea.disabled = false;
      codeTextarea.value = challenge.starterCode || `function ${challenge.functionName}() {\n  \n}`;
      codeTextarea.focus();
    }
    updateGutter();

    if (btnRunTests) btnRunTests.disabled = false;
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
        appendConsoleLine(`> HINT UNLOCKED (-5 PTS). Current score: ${newPts} / ${targetPoints}.`, 'console-warn');
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
          stopTurnTimer();
          if (consoleStatusBadge) {
            consoleStatusBadge.textContent = 'SYS: PASSED';
            consoleStatusBadge.className = 'section-badge font-code text-green';
          }
          appendConsoleLine(`> PASS: All ${outcome.results.length} tests passed cleanly! Unleashing attack...`, 'console-pass');

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
        }

      } catch (err) {
        appendConsoleLine(`UNEXPECTED RUNNER ERROR: ${err.message || String(err)}`, 'console-error');
        btnRunTests.disabled = false;
      } finally {
        isTestingCode = false;
      }
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

    // Win check
    if (newEnemyHp <= 0 || currentPoints >= targetPoints) {
      setTimeout(() => {
        handleBattleOutcome('victory');
      }, 1400);
      return;
    }

    // Turns exhausted check
    if (turnsLeft <= 0) {
      setTimeout(() => {
        handleBattleOutcome('defeat');
      }, 1400);
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
    if (btnHint) btnHint.disabled = true;
    if (btnResetCode) btnResetCode.disabled = true;

    appendConsoleLine('> ENEMY TURN...', 'console-warn');

    const baseEnemyDmg = 16;
    const enemyDmg = isBonusDamage ? Math.round(baseEnemyDmg * 1.5) : baseEnemyDmg;

    if (window.typeText) {
      const atkDesc = isBonusDamage
        ? `${enemy.name.toUpperCase()} strikes with 50% BONUS DAMAGE (${enemyDmg} DMG)!`
        : `${enemy.name.toUpperCase()} countered with Segfault Slam (${enemyDmg} DMG)!`;
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

      const prevPlayerHp = player.hp || player.maxHp;
      const newPlayerHp = Math.max(0, prevPlayerHp - enemyDmg);
      player.hp = newPlayerHp;
      player.currentHp = newPlayerHp;

      if (window.setHp) {
        window.setHp('player', newPlayerHp, player.maxHp);
      }

      appendConsoleLine(`> ${enemy.name} struck player for ${enemyDmg} DMG!`, 'console-fail');

      // Defeat check
      if (newPlayerHp <= 0 || turnsLeft <= 0) {
        setTimeout(() => {
          handleBattleOutcome('defeat');
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

    const player = window.gameState.player || { name: 'Codemon' };
    const enemy = window.gameState.enemy || { name: 'Bugmon' };

    if (outcome === 'victory') {
      playSound('battle');
      if (window.typeText) {
        window.typeText(`VICTORY! ${enemy.name.toUpperCase()} was debugged! You reached ${currentPoints} PTS!`, 22);
      }
      appendConsoleLine('========================================', 'console-pass');
      appendConsoleLine('★ BATTLE VICTORY! BUG MONSTER DEFEATED ★', 'console-pass');
      appendConsoleLine(`Final Score: ${currentPoints} / ${targetPoints} Points. Turns remaining: ${turnsLeft}.`, 'console-pass');
      appendConsoleLine('========================================', 'console-pass');

      if (pickerStatusBadge) {
        pickerStatusBadge.textContent = 'VICTORY ACHIEVED!';
        pickerStatusBadge.className = 'section-badge font-code text-green';
      }
      if (consoleStatusBadge) {
        consoleStatusBadge.textContent = 'SYS: VICTORY';
        consoleStatusBadge.className = 'section-badge font-code text-green';
      }
    } else {
      playSound('hit');
      const reason = player.hp <= 0 ? `${player.name.toUpperCase()} fainted!` : 'Turn limit reached!';
      if (window.typeText) {
        window.typeText(`DEFEAT! ${reason} Bugmon overwhelmed your code.`, 22);
      }
      appendConsoleLine('========================================', 'console-fail');
      appendConsoleLine('✖ BATTLE DEFEAT: SYSTEM OVERFLOW ✖', 'console-fail');
      appendConsoleLine(`Final Score: ${currentPoints} / ${targetPoints} Points.`, 'console-fail');
      appendConsoleLine('========================================', 'console-fail');

      if (pickerStatusBadge) {
        pickerStatusBadge.textContent = 'BATTLE OVER';
        pickerStatusBadge.className = 'section-badge font-code text-red';
      }
      if (consoleStatusBadge) {
        consoleStatusBadge.textContent = 'SYS: CRASHED';
        consoleStatusBadge.className = 'section-badge font-code text-red';
      }
    }

    if (codeTextarea) codeTextarea.disabled = true;
    if (btnRunTests) btnRunTests.disabled = true;
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

    currentPoints = 0;
    turnsLeft = 8;
    battleActive = true;
    window.gameState.battleActive = true;
    battleUsedChallenges.clear();

    if (window.updateHud) {
      window.updateHud(0, 8);
    }

    const versusTitle = document.getElementById('battle-versus-title');
    if (versusTitle && enemy) {
      versusTitle.textContent = `${player.name.toUpperCase()} VS ${enemy.name.toUpperCase()}`;
    }

    showScreen('battle');

    clearConsole();
    appendConsoleLine('> Codemons Sandbox Kernel v2.4 initialized.', 'console-info');
    appendConsoleLine(`> Target: ${targetPoints} Points within ${turnsLeft} Turns.`, 'console-info');
    appendConsoleLine('> Web Worker secure test runner mounted.', 'console-info');
    appendConsoleLine('> Select an attack challenge card above to begin your turn.', 'console-warn');

    if (window.typeText && enemy) {
      window.typeText(`A wild ${enemy.name} appeared! Compile code on the right to strike.`, 22);
    }

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
      showScreen('select');
    });
  }

  document.addEventListener('keydown', (e) => {
    if (currentScreen === 'title') {
      if (e.key === 'Enter') {
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
      } else if (e.key === 'Enter') {
        e.preventDefault();
        confirmStarterChoice();
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

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundToggleBtn.textContent = soundEnabled ? 'SFX: ON' : 'SFX: OFF';
      playSound('click');
    });
  }

  // Expose methods for BattleEngine in battle.js and external integration
  window.startPlayerTurn = startPlayerTurn;
  window.appendConsoleLine = appendConsoleLine;
  window.handleBattleOutcome = handleBattleOutcome;

  // Initial setup
  renderStarters();
});
