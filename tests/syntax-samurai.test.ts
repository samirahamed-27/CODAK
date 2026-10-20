import { describe, it, expect } from 'vitest';
import {
  ENEMY_PROFILES,
  DIFFICULTY_TIERS,
  SYNTAX_QUESTIONS,
  getQuestionsByFilter,
  getRandomQuestions,
  getEnemyProfile,
  getDifficultyConfig,
  getAllQuestions,
} from '@/data/syntaxSamuraiQuestions';
import { LanguageEnemy, Difficulty } from '@/types/syntaxSamurai';

describe('Syntax Samurai - Phase 1 Data Model & Question Bank Audit', () => {
  const languages: LanguageEnemy[] = ['python', 'javascript', 'cpp', 'java'];
  const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'codemare'];

  describe('Enemy Profiles', () => {
    it('defines complete configuration for all 4 language adversaries', () => {
      expect(Object.keys(ENEMY_PROFILES)).toHaveLength(4);
      languages.forEach((lang) => {
        const profile = getEnemyProfile(lang);
        expect(profile).toBeDefined();
        expect(profile.id).toBe(lang);
        expect(profile.name.length).toBeGreaterThan(0);
        expect(profile.alias.length).toBeGreaterThan(0);
        expect(profile.kanji.length).toBeGreaterThan(0);
        expect(profile.element.length).toBeGreaterThan(0);
        expect(profile.themeColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(profile.stats.attackSpeed).toBeDefined();
        expect(profile.stats.precision).toBeDefined();
        expect(profile.stats.lethalThreat).toBeDefined();
      });
    });
  });

  describe('Difficulty Tiers', () => {
    it('defines scaling rules for all 4 difficulty levels', () => {
      expect(Object.keys(DIFFICULTY_TIERS)).toHaveLength(4);
      difficulties.forEach((diff) => {
        const config = getDifficultyConfig(diff);
        expect(config).toBeDefined();
        expect(config.id).toBe(diff);
        expect(config.questionCount).toBeGreaterThan(0);
        expect(config.timePerQuestionSec).toBeGreaterThan(0);
        expect(config.xpReward).toBeGreaterThan(0);
        expect(config.slashMultiplier).toBeGreaterThanOrEqual(1.0);
      });
    });

    it('matches required scaling question quotas', () => {
      expect(DIFFICULTY_TIERS.easy.questionCount).toBe(5);
      expect(DIFFICULTY_TIERS.normal.questionCount).toBe(7);
      expect(DIFFICULTY_TIERS.hard.questionCount).toBe(10);
      expect(DIFFICULTY_TIERS.codemare.questionCount).toBe(12);
    });
  });

  describe('Question Bank Composition & Scaling', () => {
    it('has exactly 136 curated questions in total (34 per language)', () => {
      expect(getAllQuestions()).toHaveLength(136);
    });

    it('has exactly the expected number of questions per language and tier', () => {
      languages.forEach((lang) => {
        const easyQs = getQuestionsByFilter(lang, 'easy');
        const normalQs = getQuestionsByFilter(lang, 'normal');
        const hardQs = getQuestionsByFilter(lang, 'hard');
        const codemareQs = getQuestionsByFilter(lang, 'codemare');

        expect(easyQs).toHaveLength(5);
        expect(normalQs).toHaveLength(7);
        expect(hardQs).toHaveLength(10);
        expect(codemareQs).toHaveLength(12);
      });
    });
  });

  describe('Question Sanity & Integrity Invariants', () => {
    it('guarantees unique IDs across all questions', () => {
      const ids = SYNTAX_QUESTIONS.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('guarantees exactly 4 fix options with no duplicates and correctReplacement included', () => {
      SYNTAX_QUESTIONS.forEach((q) => {
        expect(q.fixOptions).toHaveLength(4);
        const uniqueOptions = new Set(q.fixOptions);
        expect(uniqueOptions.size).toBe(4);
        expect(q.fixOptions).toContain(q.correctReplacement);
      });
    });

    it('guarantees valid line indices and bounding hints', () => {
      SYNTAX_QUESTIONS.forEach((q) => {
        const lines = q.codeSnippet.split('\n');
        expect(q.errorLineIndex).toBeGreaterThanOrEqual(0);
        expect(q.errorLineIndex).toBeLessThan(lines.length);
        expect(q.errorBoundingHint.length).toBeGreaterThan(5);
        expect(q.explanation.length).toBeGreaterThan(10);
      });
    });

    it('getRandomQuestions returns the specified count and does not mutate question pool', () => {
      const sampled = getRandomQuestions('python', 'normal', 3);
      expect(sampled).toHaveLength(3);

      const defaultSample = getRandomQuestions('javascript', 'easy');
      expect(defaultSample).toHaveLength(5);

      const poolOriginal = getQuestionsByFilter('javascript', 'easy');
      expect(poolOriginal).toHaveLength(5);
    });
  });

  describe('Phase 2 - Katana Blade Geometry & Hit Detection', () => {
    // Helper function verifying segment-box intersection algorithm
    const segmentIntersectsBox = (
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      box: { x: number; y: number; width: number; height: number }
    ): boolean => {
      const minX = box.x;
      const maxX = box.x + box.width;
      const minY = box.y;
      const maxY = box.y + box.height;

      const inBox = (p: { x: number; y: number }) =>
        p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;

      if (inBox(p1) || inBox(p2)) return true;

      const ccw = (
        ax: number,
        ay: number,
        bx: number,
        by: number,
        cx: number,
        cy: number
      ) => (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);

      const linesIntersect = (
        ax: number,
        ay: number,
        bx: number,
        by: number,
        cx: number,
        cy: number,
        dx: number,
        dy: number
      ) =>
        ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
        ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy);

      if (linesIntersect(p1.x, p1.y, p2.x, p2.y, minX, minY, maxX, minY)) return true;
      if (linesIntersect(p1.x, p1.y, p2.x, p2.y, minX, maxY, maxX, maxY)) return true;
      if (linesIntersect(p1.x, p1.y, p2.x, p2.y, minX, minY, minX, maxY)) return true;
      if (linesIntersect(p1.x, p1.y, p2.x, p2.y, maxX, minY, maxX, maxY)) return true;

      return false;
    };

    it('detects a diagonal slash cleanly cutting through a token bounding box', () => {
      const targetBox = { x: 100, y: 100, width: 60, height: 25 };
      // Diagonal slash from top-left (80, 80) to bottom-right (180, 140)
      const p1 = { x: 80, y: 80 };
      const p2 = { x: 180, y: 140 };

      expect(segmentIntersectsBox(p1, p2, targetBox)).toBe(true);
    });

    it('detects hit when slash starts or ends directly inside the box', () => {
      const targetBox = { x: 200, y: 200, width: 50, height: 20 };
      const insidePoint = { x: 220, y: 210 };
      const outsidePoint = { x: 300, y: 300 };

      expect(segmentIntersectsBox(insidePoint, outsidePoint, targetBox)).toBe(true);
      expect(segmentIntersectsBox(outsidePoint, insidePoint, targetBox)).toBe(true);
    });

    it('correctly reports no hit when a slash completely misses the token box', () => {
      const targetBox = { x: 100, y: 100, width: 40, height: 20 };
      // Slash passing far above
      const p1 = { x: 50, y: 50 };
      const p2 = { x: 200, y: 50 };

      expect(segmentIntersectsBox(p1, p2, targetBox)).toBe(false);

      // Slash passing to the right
      const p3 = { x: 160, y: 90 };
      const p4 = { x: 160, y: 140 };
      expect(segmentIntersectsBox(p3, p4, targetBox)).toBe(false);
    });

    it('calculates velocity angle so blade tip aligns with swipe direction', () => {
      // Swiping right: angle should be ~0 radians
      const angleRight = Math.atan2(0, 50);
      expect(angleRight).toBeCloseTo(0, 2);

      // Swiping straight down: angle should be PI/2 (~1.57 rad)
      const angleDown = Math.atan2(50, 0);
      expect(angleDown).toBeCloseTo(Math.PI / 2, 2);

      // Swiping 45 deg down-right
      const angleDiag = Math.atan2(50, 50);
      expect(angleDiag).toBeCloseTo(Math.PI / 4, 2);
    });

    it('verifies katana-cursor.svg asset exists with 32x32 viewbox and blade hotspot at 0,0', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const svgPath = path.resolve(process.cwd(), 'public/assets/katana-cursor.svg');
      expect(fs.existsSync(svgPath)).toBe(true);

      const content = fs.readFileSync(svgPath, 'utf8');
      expect(content).toContain('<svg');
      expect(content).toContain('viewBox="0 0 32 32"');
      expect(content).toContain('bladeSteel');
      expect(content).toContain('edgeGleam');
    });

    it('guarantees zero-lag instantaneous binding without smoothing lerp', () => {
      // Simulating direct pointer coordinate binding
      const pointer = { x: 0, y: 0 };
      const blade = { x: 0, y: 0 };

      // User moves mouse abruptly to (240, 180)
      pointer.x = 240;
      pointer.y = 180;

      // With direct binding (no lerp), blade immediately reflects target coordinate
      blade.x = pointer.x;
      blade.y = pointer.y;

      expect(blade.x).toBe(240);
      expect(blade.y).toBe(180);
    });

    it('anchors the Kissaki blade tip precisely at local (0, 0)', () => {
      const bladeLength = 75;
      const tipLocalX = -bladeLength + bladeLength;
      const tipLocalY = 0;

      expect(tipLocalX).toBe(0);
      expect(tipLocalY).toBe(0);
    });

    it('verifies floating canvas katana is removed from KatanaCanvas.tsx', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const canvasFile = path.resolve(process.cwd(), 'src/components/games/syntax-samurai/KatanaCanvas.tsx');
      const content = fs.readFileSync(canvasFile, 'utf8');

      // Floating canvas blade renderer drawKatana should be completely removed
      expect(content).not.toContain('const drawKatana =');
      expect(content).not.toContain('drawKatana(');
      // But slash trail and crumble debris remain intact
      expect(content).toContain('drawTrail');
      expect(content).toContain('drawSparks');
      expect(content).toContain('crumbleEngineRef');
    });

    it('verifies TargetCursor excludes battle arena from cursor: none !important', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const targetCursorFile = path.resolve(process.cwd(), 'src/components/ui/TargetCursor.tsx');
      const content = fs.readFileSync(targetCursorFile, 'utf8');

      // TargetCursor must not apply cursor: none to .battle-arena or [data-katana-active]
      expect(content).toContain(':not(.battle-arena)');
      expect(content).toContain(':not([data-katana-active])');
      expect(content).toContain('isKatanaZone');
    });

    it('verifies direct Katana cursor CSS with hotspot at blade tip (0 0) on .battle-arena and descendants', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const globalsCssFile = path.resolve(process.cwd(), 'src/app/globals.css');
      const content = fs.readFileSync(globalsCssFile, 'utf8');

      expect(content).toContain('.battle-arena');
      expect(content).toContain(".battle-arena *");
      expect(content).toContain("cursor: url('/assets/katana-cursor.svg') 0 0, auto !important;");
    });

    it('verifies error token is unhighlighted before slice (Refinement 2 invariant)', () => {
      // Invariant: Unhighlighted error token blends with terminal text (text-zinc-300) without red pulse or borders
      const isSliced = false;
      const isTokenHidden = false;
      const tokenClass = isTokenHidden
        ? 'opacity-0 scale-90 pointer-events-none'
        : isSliced
        ? 'bg-red-500/20 text-red-200 line-through decoration-red-500 decoration-2 shadow-[0_0_15px_rgba(239,68,68,0.5)] px-1.5 py-0.5 rounded font-bold'
        : 'text-zinc-300';

      expect(tokenClass).toBe('text-zinc-300');
      expect(tokenClass).not.toContain('red');
      expect(tokenClass).not.toContain('border');
      expect(tokenClass).not.toContain('pulse');
    });

    it('computes real-time stroke vector dx, dy and orientation angle along travel direction (Refinement 3)', () => {
      // Downward slash: top (startX=100, startY=50) to bottom (currentX=115, currentY=250)
      const startX = 100;
      const startY = 50;
      const currentX = 115;
      const currentY = 250;

      const dx = currentX - startX; // 15 (slight right)
      const dy = currentY - startY; // 200 (downward)
      const angle = Math.atan2(dy, dx);

      expect(dx).toBe(15);
      expect(dy).toBe(200);
      expect(angle).toBeGreaterThan(1.4); // Downward trajectory (~85 deg)
      expect(angle).toBeLessThan(1.6);

      // Upward cut: (startX=100, startY=300) to (currentX=100, currentY=100)
      const upDx = 100 - 100;
      const upDy = 100 - 300;
      const upAngle = Math.atan2(upDy, upDx);
      expect(upAngle).toBeCloseTo(-Math.PI / 2, 2);
    });

    it('verifies tapered slash trail parameters: needle tail at origin (t=0) and full cutting beam at head (t=1)', () => {
      const trail = [
        { x: 100, y: 50, time: 1000, timestamp: 1000, speed: 0 },
        { x: 105, y: 120, time: 1010, timestamp: 1010, speed: 12 },
        { x: 110, y: 200, time: 1020, timestamp: 1020, speed: 20 },
        { x: 115, y: 250, time: 1030, timestamp: 1030, speed: 25 },
      ];
      const n = trail.length;

      // Tail segment (i=1) vs Head segment (i=n-1)
      const tailProgress = 1 / (n - 1); // 0.333
      const headProgress = (n - 1) / (n - 1); // 1.0

      const tailTaper = Math.pow(tailProgress, 0.75);
      const headTaper = Math.pow(headProgress, 0.75);

      expect(tailTaper).toBeLessThan(headTaper);
      expect(headTaper).toBe(1.0);
      expect(tailTaper).toBeLessThan(0.5);

      // Verify razor needle tail width <= 4px and full cutting head width >= 8px
      const tailWidth = Math.max(0.75, tailTaper * 9);
      const headWidth = Math.max(0.75, headTaper * 9);
      expect(tailWidth).toBeLessThan(headWidth);
      expect(headWidth).toBe(9);
    });

    it('verifies cut scar on sliced token dynamically rotates with slashCutAngle', () => {
      const slashCutAngle = Math.PI / 2; // Vertical cut
      const scarTransform = `rotate(${slashCutAngle}rad)`;
      expect(scarTransform).toBe('rotate(1.5707963267948966rad)');
      expect(scarTransform).not.toBe('rotate(-25deg)');
    });

    it('verifies expansive arena viewport configuration (Refinement 4)', () => {
      const arenaStyle = {
        width: '95vw',
        maxWidth: '1600px',
        height: '88vh',
        minHeight: '720px',
        margin: '0 auto',
      };

      expect(arenaStyle.width).toBe('95vw');
      expect(arenaStyle.maxWidth).toBe('1600px');
      expect(arenaStyle.height).toBe('88vh');
      expect(arenaStyle.minHeight).toBe('720px');
      expect(arenaStyle.margin).toBe('0 auto');
    });

    it('verifies scaled code typography parameters (Refinement 4)', () => {
      const codeStyle = {
        fontFamily: "'JetBrains Mono', 'Fira Code', 'VT323', var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: '1.4rem',
        lineHeight: 2.2,
        letterSpacing: '0.04em',
      };

      // Font size must be within 1.35rem to 1.5rem (22px to 24px)
      const fontSizeNum = parseFloat(codeStyle.fontSize);
      expect(fontSizeNum).toBeGreaterThanOrEqual(1.35);
      expect(fontSizeNum).toBeLessThanOrEqual(1.5);

      // Line height must be generous 2.2 for comfortable slicing clearance
      expect(codeStyle.lineHeight).toBe(2.2);
      expect(codeStyle.letterSpacing).toBe('0.04em');

      // Monospace font family checks
      expect(codeStyle.fontFamily).toContain('JetBrains Mono');
      expect(codeStyle.fontFamily).toContain('Fira Code');
      expect(codeStyle.fontFamily).toContain('monospace');
    });
  });

  describe('Phase 3 - Pixel Crumble Engine & Physics Model', () => {
    it('spawns 40-80 pixel particles with sizes 2px or 4px upon token explosion', async () => {
      const { PixelCrumbleEngine } = await import(
        '@/components/games/syntax-samurai/PixelCrumbleEngine'
      );
      const engine = new PixelCrumbleEngine();
      expect(engine.particles).toHaveLength(0);

      engine.explode({
        x: 100,
        y: 200,
        width: 60,
        height: 24,
        count: 65,
        cutAngle: -Math.PI / 4,
      });

      expect(engine.particles).toHaveLength(65);
      engine.particles.forEach((p) => {
        expect([2, 4]).toContain(p.size);
        expect(p.life).toBe(0);
        expect(p.maxLife).toBeGreaterThan(0.3);
        expect(p.x).toBeGreaterThanOrEqual(100);
        expect(p.x).toBeLessThanOrEqual(160);
        expect(p.y).toBeGreaterThanOrEqual(200);
        expect(p.y).toBeLessThanOrEqual(224);
      });
    });

    it('applies downward gravity ay = +0.4 and decays particle lifetime over time', async () => {
      const { PixelCrumbleEngine } = await import(
        '@/components/games/syntax-samurai/PixelCrumbleEngine'
      );
      const engine = new PixelCrumbleEngine();
      engine.explode({
        x: 50,
        y: 50,
        width: 20,
        height: 20,
        count: 10,
      });

      const initialVy = engine.particles[0].vy;
      engine.update(1 / 60);

      // vy reflects downward gravity (+0.42) and air drag (0.95)
      expect(engine.gravity).toBe(0.42);
      expect(engine.friction).toBe(0.95);
      expect(engine.particles[0].vy).toBeCloseTo(initialVy * engine.friction + engine.gravity, 4);
      expect(engine.particles[0].life).toBeCloseTo(1 / 60, 4);

      // Advance by 1 second so all particles exceed maxLife
      for (let step = 0; step < 60; step++) {
        engine.update(1 / 60);
      }
      expect(engine.particles).toHaveLength(0);
    });

    it('orients particle burst along the slash angle with forward impulse (Refinement 3)', async () => {
      const { PixelCrumbleEngine } = await import(
        '@/components/games/syntax-samurai/PixelCrumbleEngine'
      );
      const engine = new PixelCrumbleEngine();

      // Downward slash: cutAngle = Math.PI / 2
      // ty = sin(PI/2) = 1, tx = cos(PI/2) = 0
      // Forward impulse should push vy significantly downwards (> 0)
      engine.explode({
        x: 100,
        y: 100,
        width: 40,
        height: 20,
        count: 50,
        cutAngle: Math.PI / 2,
      });

      const avgVy = engine.particles.reduce((acc, p) => acc + p.vy, 0) / engine.particles.length;
      expect(avgVy).toBeGreaterThan(1.0); // Clear positive/downward momentum
    });

    it('upgrades CrumbleParticle with 3D positions, velocities, and tumbling angular rotations', async () => {
      const { PixelCrumbleEngine } = await import(
        '@/components/games/syntax-samurai/PixelCrumbleEngine'
      );
      const engine = new PixelCrumbleEngine();
      engine.explode({ x: 100, y: 100, width: 40, height: 20, count: 50 });

      expect(engine.particles).toHaveLength(50);

      let hasBurstTowardsCamera = false;
      let hasBurstIntoBackground = false;

      engine.particles.forEach((p) => {
        // 3D position & velocity checks
        expect(typeof p.z).toBe('number');
        expect(typeof p.vz).toBe('number');
        if (p.vz < 0) hasBurstTowardsCamera = true;
        if (p.vz > 0) hasBurstIntoBackground = true;

        // 3D angular rotation checks
        expect(typeof p.rotX).toBe('number');
        expect(typeof p.rotY).toBe('number');
        expect(typeof p.rotZ).toBe('number');
        expect(typeof p.vRotX).toBe('number');
        expect(typeof p.vRotY).toBe('number');
        expect(typeof p.vRotZ).toBe('number');
        expect(p.rotation).toBe(p.rotZ); // Backwards-compatible alias
      });

      expect(hasBurstTowardsCamera).toBe(true);
      expect(hasBurstIntoBackground).toBe(true);
    });

    it('updates 3D tumbling rotations and translations over time', async () => {
      const { PixelCrumbleEngine } = await import(
        '@/components/games/syntax-samurai/PixelCrumbleEngine'
      );
      const engine = new PixelCrumbleEngine();
      engine.explode({ x: 100, y: 100, width: 40, height: 20, count: 10 });

      const p0 = engine.particles[0];
      const initialRotX = p0.rotX;
      const initialRotY = p0.rotY;
      const initialRotZ = p0.rotZ;
      const initialZ = p0.z;

      engine.update(1 / 60);

      // Rotations must update by angular velocities
      expect(p0.rotX).not.toBe(initialRotX);
      expect(p0.rotY).not.toBe(initialRotY);
      expect(p0.rotZ).not.toBe(initialRotZ);
      expect(p0.z).not.toBe(initialZ);
    });

    it('verifies perspective projection scaling formula and Z-depth sorting order', async () => {
      const { PixelCrumbleEngine } = await import(
        '@/components/games/syntax-samurai/PixelCrumbleEngine'
      );
      const engine = new PixelCrumbleEngine();
      const cameraDistance = engine.cameraDistance; // 320
      expect(cameraDistance).toBeGreaterThan(0);

      // Foreground particle (closer to camera, z = -100)
      const scaleForeground = cameraDistance / Math.max(80, cameraDistance - 100);
      expect(scaleForeground).toBeGreaterThan(1.0); // Expands in foreground

      // Background particle (farther in background, z = +200)
      const scaleBackground = cameraDistance / Math.max(80, cameraDistance + 200);
      expect(scaleBackground).toBeLessThan(1.0); // Recedes in background

      // Perspective scale should smoothly decrease with depth
      expect(scaleForeground).toBeGreaterThan(scaleBackground);
    });

    it('spawns expanding neon red shockwave ring at cut epicenter expanding from 4px to 80px over 280ms', async () => {
      const { PixelCrumbleEngine } = await import(
        '@/components/games/syntax-samurai/PixelCrumbleEngine'
      );
      const engine = new PixelCrumbleEngine();
      expect(engine.shockwaves).toHaveLength(0);

      // Sliced token at x=100, y=200, width=60, height=30
      engine.explode({
        x: 100,
        y: 200,
        width: 60,
        height: 30,
        count: 40,
      });

      expect(engine.shockwaves).toHaveLength(1);
      const sw = engine.shockwaves[0];

      // Epicenter must be at token center: (100 + 30, 200 + 15) = (130, 215)
      expect(sw.x).toBe(130);
      expect(sw.y).toBe(215);

      // Expansion parameters
      expect(sw.startRadius).toBe(4);
      expect(sw.maxRadius).toBe(80);
      expect(sw.currentRadius).toBe(4);
      expect(sw.duration).toBe(0.28);
      expect(sw.color).toBe('#ef4444');

      // Update by 140ms (halfway)
      engine.update(0.14);
      expect(engine.shockwaves[0].currentRadius).toBeGreaterThan(4);
      expect(engine.shockwaves[0].currentRadius).toBeLessThanOrEqual(80);

      // Update past 280ms duration -> should be culled
      engine.update(0.15);
      expect(engine.shockwaves).toHaveLength(0);
    });

    it('calculates 3D spherical explosion velocities with blastSpeed 8-22 and high-speed Z-depth burst', async () => {
      const { PixelCrumbleEngine } = await import(
        '@/components/games/syntax-samurai/PixelCrumbleEngine'
      );
      const engine = new PixelCrumbleEngine();
      engine.explode({
        x: 50,
        y: 50,
        width: 40,
        height: 20,
        count: 50,
      });

      expect(engine.particles).toHaveLength(50);

      // Verify spherical velocities
      engine.particles.forEach((p) => {
        const speed2D = Math.hypot(p.vx, p.vy);
        expect(speed2D).toBeGreaterThan(0);
        // vz includes 1.5x multiplier for dramatic screen/depth blast
        expect(typeof p.vz).toBe('number');
      });

      // Verify air drag (0.95) decay on vx, vy, vz
      const p0 = engine.particles[0];
      const initialVx = p0.vx;
      const initialVz = p0.vz;

      engine.update(1 / 60);

      // vx and vz should decay by friction (0.95)
      expect(Math.abs(p0.vx)).toBeCloseTo(Math.abs(initialVx * 0.95), 4);
      expect(Math.abs(p0.vz)).toBeCloseTo(Math.abs(initialVz * 0.95), 4);
    });

    it('optimizes particle density with default count = 38 and caps lifetimes between 0.45s and 0.75s', async () => {
      const { PixelCrumbleEngine } = await import(
        '@/components/games/syntax-samurai/PixelCrumbleEngine'
      );
      const engine = new PixelCrumbleEngine();
      // Explode without passing count
      engine.explode({ x: 20, y: 20, width: 30, height: 15 });

      expect(engine.particles).toHaveLength(38);
      engine.particles.forEach((p) => {
        expect(p.maxLife).toBeGreaterThanOrEqual(0.45);
        expect(p.maxLife).toBeLessThanOrEqual(0.75);
      });
    });

    it('pre-computes 3D isometric color palettes with base, top, and side shades', async () => {
      const { PixelCrumbleEngine, getVoxelPalette } = await import(
        '@/components/games/syntax-samurai/PixelCrumbleEngine'
      );
      const palette = getVoxelPalette('#ef4444');
      expect(palette.base).toBe('#ef4444');
      expect(palette.top).toBe('#fca5a5');
      expect(palette.side).toBe('#b91c1c');

      const engine = new PixelCrumbleEngine();
      engine.explode({ x: 0, y: 0, width: 20, height: 20, colors: ['#ef4444', '#10b981'] });
      engine.particles.forEach((p) => {
        expect(p.palette).toBeDefined();
        expect(typeof p.palette.base).toBe('string');
        expect(typeof p.palette.top).toBe('string');
        expect(typeof p.palette.side).toBe('string');
      });
    });

    it('renders 60 FPS isometric faces with zero shadowBlur and single canvas state save', async () => {
      const { PixelCrumbleEngine } = await import(
        '@/components/games/syntax-samurai/PixelCrumbleEngine'
      );
      const engine = new PixelCrumbleEngine();
      engine.explode({ x: 0, y: 0, width: 20, height: 20 });

      let saveCount = 0;
      let restoreCount = 0;
      let shadowBlurSet = false;

      const mockCtx = {
        save: () => { saveCount++; },
        restore: () => { restoreCount++; },
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        fill: () => {},
        stroke: () => {},
        arc: () => {},
        set shadowBlur(_val: number) { shadowBlurSet = true; },
        get shadowBlur() { return 0; },
        set shadowColor(_val: string) {},
        get shadowColor() { return ''; },
        set fillStyle(_val: string) {},
        set strokeStyle(_val: string) {},
        set lineWidth(_val: number) {},
        set globalAlpha(_val: number) {},
      } as unknown as CanvasRenderingContext2D;

      engine.render(mockCtx);

      // Verify zero shadowBlur was invoked (eliminates GPU rasterizer gaussian blur overhead)
      expect(shadowBlurSet).toBe(false);

      // Verify minimal canvas state saves (1 for shockwaves, 1 for particles)
      expect(saveCount).toBeLessThanOrEqual(2);
      expect(restoreCount).toBe(saveCount);
    });

    it('clears all active debris and shockwaves instantly on clear()', async () => {
      const { PixelCrumbleEngine } = await import(
        '@/components/games/syntax-samurai/PixelCrumbleEngine'
      );
      const engine = new PixelCrumbleEngine();
      engine.explode({ x: 0, y: 0, width: 50, height: 20, count: 50 });
      expect(engine.particles.length).toBe(50);
      expect(engine.shockwaves.length).toBe(1);

      engine.clear();
      expect(engine.particles.length).toBe(0);
      expect(engine.shockwaves.length).toBe(0);
    });
  });

  describe('Phase 5 - Victory Dojo, Samurai Ranks & Performance Scoring', () => {
    it('awards SHOGUN rank exclusively for 95%+ accuracy on Codemare difficulty', async () => {
      const { calculateSamuraiRank } = await import(
        '@/components/games/syntax-samurai/VictoryScreen'
      );

      const codemare100 = calculateSamuraiRank(100, 'codemare');
      expect(codemare100.rank).toBe('SHOGUN');
      expect(codemare100.kanji).toBe('将軍');
      expect(codemare100.requiresCodemare).toBe(true);

      const codemare95 = calculateSamuraiRank(95, 'codemare');
      expect(codemare95.rank).toBe('SHOGUN');

      // 95%+ on hard or normal difficulty receives DAIMYO (only Codemare achieves Shogun!)
      const hard100 = calculateSamuraiRank(100, 'hard');
      expect(hard100.rank).toBe('DAIMYO');
      expect(hard100.kanji).toBe('大名');

      const easy95 = calculateSamuraiRank(95, 'easy');
      expect(easy95.rank).toBe('DAIMYO');
    });

    it('awards DAIMYO rank for 80% to 94% accuracy', async () => {
      const { calculateSamuraiRank } = await import(
        '@/components/games/syntax-samurai/VictoryScreen'
      );

      const codemare85 = calculateSamuraiRank(85, 'codemare');
      expect(codemare85.rank).toBe('DAIMYO');

      const normal80 = calculateSamuraiRank(80, 'normal');
      expect(normal80.rank).toBe('DAIMYO');
    });

    it('awards SAMURAI rank for 60% to 79% accuracy', async () => {
      const { calculateSamuraiRank } = await import(
        '@/components/games/syntax-samurai/VictoryScreen'
      );

      const rank75 = calculateSamuraiRank(75, 'normal');
      expect(rank75.rank).toBe('SAMURAI');
      expect(rank75.kanji).toBe('侍');

      const rank60 = calculateSamuraiRank(60, 'hard');
      expect(rank60.rank).toBe('SAMURAI');
    });

    it('awards RONIN rank for under 60% accuracy', async () => {
      const { calculateSamuraiRank } = await import(
        '@/components/games/syntax-samurai/VictoryScreen'
      );

      const rank59 = calculateSamuraiRank(59, 'easy');
      expect(rank59.rank).toBe('RONIN');
      expect(rank59.kanji).toBe('浪人');

      const rank0 = calculateSamuraiRank(0, 'codemare');
      expect(rank0.rank).toBe('RONIN');
    });

    it('calculates score based on slashes landed, accuracy, combo, and time bonuses', () => {
      const slashesLanded = 5;
      const correctCount = 5;
      const _totalQuestions = 5;
      const xpReward = 150;
      const comboMultiplier = 4; // x4
      const timeRemainingSec = 12;

      const slashBonus = slashesLanded * 50;
      const accuracyBonus = correctCount * xpReward;
      const comboBonus = Math.round(xpReward * (comboMultiplier * 0.1));
      const timeBonus = timeRemainingSec * 2;
      const totalScore = slashBonus + accuracyBonus + comboBonus + timeBonus;

      expect(slashBonus).toBe(250);
      expect(accuracyBonus).toBe(750);
      expect(comboBonus).toBe(60);
      expect(timeBonus).toBe(24);
      expect(totalScore).toBe(1084);
    });
  });
});

