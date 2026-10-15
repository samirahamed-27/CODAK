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

  // State
  let currentScreen = 'title';
  let selectedIndex = 0;
  let selectedCodemon = null;
  let activeEnemy = null;
  let soundEnabled = true;
  let questionsPool = [];
  let animFrameId = null;
  let animTick = 0;

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

  // Load questions data from data/questions.json
  if (window.CodemonData && typeof window.CodemonData.loadQuestions === 'function') {
    questionsPool = await window.CodemonData.loadQuestions();
  }

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
  // BATTLE INITIALIZATION & CODE LAB UNLOCK
  // -------------------------------------------------------------------------
  function initBattle() {
    const player = window.gameState.player || selectedCodemon;
    const enemy = window.gameState.enemy || activeEnemy;
    if (!player) return;

    // Ensure gameState has both player and enemy
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

    // Initialize HP state with max HP immediately
    if (window.setHp) {
      window.setHp('player', player.maxHp, player.maxHp, true);
      window.setHp('enemy', enemy.maxHp, enemy.maxHp, true);
    }

    // Initialize HUD: 0 points, 8 turns left
    if (window.updateHud) {
      window.updateHud(0, 8);
    }

    // Update Versus title in card
    const versusTitle = document.getElementById('battle-versus-title');
    if (versusTitle && enemy) {
      versusTitle.textContent = `${player.name.toUpperCase()} VS ${enemy.name.toUpperCase()}`;
    }

    // Show battle screen (which unlocks #code-panel)
    showScreen('battle');

    // Type initial battle greeting
    if (window.typeText && enemy) {
      window.typeText(`A wild ${enemy.name} appeared! Compile code on the right to strike.`, 22);
    }
  }

  // -------------------------------------------------------------------------
  // EVENT LISTENERS & KEYBOARD CONTROLS
  // -------------------------------------------------------------------------
  // How to Play text box toggle
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

  // Pressing Start calls showScreen("select")
  if (btnStartGame) {
    btnStartGame.addEventListener('click', () => {
      showScreen('select');
    });
  }

  // Keyboard navigation:
  // - On title: Enter calls showScreen("select")
  // - On select: Left/Right arrows move selection, Enter confirms choice
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

  // Initial setup
  renderStarters();
});
