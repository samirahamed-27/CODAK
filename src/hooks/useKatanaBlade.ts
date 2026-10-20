'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  SlashPoint,
  TokenBoundingBox,
  SlashHitEvent,
  BladeSpark,
} from '@/types/syntaxSamurai';

// Line-segment to Axis-Aligned Bounding Box (AABB) intersection
function segmentIntersectsBox(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  box: { x: number; y: number; width: number; height: number }
): boolean {
  // 1. Check if either endpoint is inside the box
  const minX = box.x;
  const maxX = box.x + box.width;
  const minY = box.y;
  const maxY = box.y + box.height;

  const inBox = (p: { x: number; y: number }) =>
    p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;

  if (inBox(p1) || inBox(p2)) return true;

  // 2. Check segment intersection with all 4 bounding edges
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

  // Top edge
  if (linesIntersect(p1.x, p1.y, p2.x, p2.y, minX, minY, maxX, minY)) return true;
  // Bottom edge
  if (linesIntersect(p1.x, p1.y, p2.x, p2.y, minX, maxY, maxX, maxY)) return true;
  // Left edge
  if (linesIntersect(p1.x, p1.y, p2.x, p2.y, minX, minY, minX, maxY)) return true;
  // Right edge
  if (linesIntersect(p1.x, p1.y, p2.x, p2.y, maxX, minY, maxX, maxY)) return true;

  return false;
}

export interface UseKatanaBladeOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  targets: TokenBoundingBox[];
  themeColor?: string;
  onHit?: (event: SlashHitEvent) => void;
  onParry?: (event: SlashHitEvent) => void;
  onSlashMiss?: () => void;
  soundEnabled?: boolean;
  disabled?: boolean;
}

export function useKatanaBlade({
  containerRef,
  targets,
  themeColor = '#10b981',
  onHit,
  onParry,
  onSlashMiss,
  soundEnabled = true,
  disabled = false,
}: UseKatanaBladeOptions) {
  const [isInside, setIsInside] = useState(false);
  const [isSlashing, setIsSlashing] = useState(false);

  // Mutable refs for 60fps rendering without React re-render thrashing
  const pointerPos = useRef({ x: -100, y: -100, isDown: false });
  const bladeState = useRef({
    x: -100,
    y: -100,
    angle: -Math.PI / 4,
    speed: 0,
    isSlashing: false,
  });
  const trailRef = useRef<SlashPoint[]>([]);
  const sparksRef = useRef<BladeSpark[]>([]);
  const strokeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Stroke tracking for deliberate slash attempts & stamina decrement
  const currentStrokeRef = useRef<{
    active: boolean;
    totalDist: number;
    hitError: boolean;
  }>({
    active: false,
    totalDist: 0,
    hitError: false,
  });

  // Hit cooldowns to avoid duplicate hits on a single swipe
  const lastHitTimeRef = useRef<number>(0);
  const lastParryTimeRef = useRef<number>(0);

  // Audio synthesizer for sword swoosh and sparks
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = useCallback(() => {
    if (typeof window === 'undefined' || !soundEnabled) return;
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, [soundEnabled]);

  const playSfx = useCallback(
    (type: 'swoosh' | 'hit' | 'parry') => {
      if (!soundEnabled) return;
      try {
        initAudio();
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        const now = ctx.currentTime;

        if (type === 'swoosh') {
          // Subtle high-speed whoosh
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === 'hit') {
          // Critical Slash: sharp razor chime + explosive blade strike
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
          osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);

          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.25);

          // Sub-bass impact
          const bass = ctx.createOscillator();
          const bassGain = ctx.createGain();
          bass.type = 'triangle';
          bass.frequency.setValueAtTime(150, now);
          bass.frequency.exponentialRampToValueAtTime(40, now + 0.2);
          bassGain.gain.setValueAtTime(0.25, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          bass.connect(bassGain);
          bassGain.connect(ctx.destination);
          bass.start(now);
          bass.stop(now + 0.2);
        } else if (type === 'parry') {
          // Metallic deflection 'ting'
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'triangle';
          osc1.frequency.setValueAtTime(1800, now);
          osc2.frequency.setValueAtTime(2340, now);

          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.18);
          osc2.stop(now + 0.18);
        }
      } catch {
        // Fallback for audio policy
      }
    },
    [initAudio, soundEnabled]
  );

  // Spawn spark burst oriented along cut angle
  const spawnSparks = useCallback(
    (
      x: number,
      y: number,
      count: number,
      baseColor: string,
      velocityScale = 6,
      cutAngle?: number
    ) => {
      const newSparks: BladeSpark[] = [];
      for (let i = 0; i < count; i++) {
        let angle: number;
        if (cutAngle !== undefined) {
          // Orient along the slash angle with a forward/perpendicular spray cone
          // 75% spray forward along cut line (+- 0.6 rad), 25% spray perpendicular (+- 1.2 rad)
          const spread =
            Math.random() < 0.75
              ? (Math.random() - 0.5) * 1.2
              : (Math.random() - 0.5) * 2.4;
          angle = cutAngle + spread;
        } else {
          angle = Math.random() * Math.PI * 2;
        }
        const speed = (Math.random() * 0.7 + 0.3) * velocityScale;
        newSparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color:
            Math.random() > 0.4
              ? baseColor
              : Math.random() > 0.5
              ? '#ffffff'
              : '#f59e0b',
          size: Math.random() * 3 + 1.5,
          life: 0,
          maxLife: Math.random() * 0.25 + 0.2, // seconds
        });
      }
      sparksRef.current.push(...newSparks);
    },
    []
  );

  // Pointer event listeners on the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = performance.now();

      const prevX = pointerPos.current.x >= 0 ? pointerPos.current.x : x;
      const prevY = pointerPos.current.y >= 0 ? pointerPos.current.y : y;
      const dx = x - prevX;
      const dy = y - prevY;

      pointerPos.current.x = x;
      pointerPos.current.y = y;

      // Direct, instantaneous binding with zero lag, friction, or trailing delay
      bladeState.current.x = x;
      bladeState.current.y = y;

      const moveDist = Math.hypot(dx, dy);
      if (moveDist > 2) {
        bladeState.current.angle = Math.atan2(dy, dx);
      }

      if (!isInside) setIsInside(true);

      // Accumulate stroke distance during dragging
      if (currentStrokeRef.current.active) {
        currentStrokeRef.current.totalDist += moveDist;

        // Anti-scribble safeguard: If dragging continuously > 320px without hitting error,
        // finish this stroke segment as a miss and restart so players cannot drag endlessly
        if (!disabled && !currentStrokeRef.current.hitError && currentStrokeRef.current.totalDist > 320) {
          onSlashMiss?.();
          currentStrokeRef.current.totalDist = 0;
        }
      }

      // If dragging and stroke start wasn't captured yet, record origin
      if (pointerPos.current.isDown && !strokeStartRef.current) {
        strokeStartRef.current = { x: prevX, y: prevY, time: now };
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (disabled) return;
      initAudio();
      pointerPos.current.isDown = true;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = performance.now();

      pointerPos.current.x = x;
      pointerPos.current.y = y;
      bladeState.current.x = x;
      bladeState.current.y = y;
      bladeState.current.isSlashing = true;
      setIsSlashing(true);

      currentStrokeRef.current = {
        active: true,
        totalDist: 0,
        hitError: false,
      };

      // Initialize stroke start point and trajectory
      strokeStartRef.current = { x, y, time: now };
      trailRef.current = [
        {
          x,
          y,
          time: now,
          timestamp: now,
          speed: 0,
        },
      ];
    };

    const handlePointerUp = () => {
      if (currentStrokeRef.current.active) {
        currentStrokeRef.current.active = false;
        // Deliberate slash completed without cutting the bug:
        if (!disabled && !currentStrokeRef.current.hitError && currentStrokeRef.current.totalDist >= 25) {
          onSlashMiss?.();
        }
      }
      pointerPos.current.isDown = false;
      bladeState.current.isSlashing = false;
      setIsSlashing(false);
    };

    const handlePointerEnter = (e: PointerEvent) => {
      setIsInside(true);
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      pointerPos.current.x = x;
      pointerPos.current.y = y;
      bladeState.current.x = x;
      bladeState.current.y = y;
      bladeState.current.angle = -Math.PI / 4;
    };

    const handlePointerLeave = () => {
      setIsInside(false);
      if (currentStrokeRef.current.active) {
        currentStrokeRef.current.active = false;
        if (!disabled && !currentStrokeRef.current.hitError && currentStrokeRef.current.totalDist >= 25) {
          onSlashMiss?.();
        }
      }
      pointerPos.current.isDown = false;
      bladeState.current.isSlashing = false;
      setIsSlashing(false);
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    container.addEventListener('pointerenter', handlePointerEnter);
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      container.removeEventListener('pointerenter', handlePointerEnter);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [containerRef, disabled, initAudio, isInside, onSlashMiss]);

  // Main 60fps Blade Physics and Hit Detection loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let swooshThrottle = 0;

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const ptr = pointerPos.current;
      const b = bladeState.current;

      // 1. Direct Blade Coordinate Binding (NO LERP / NO DELAY)
      const prevX = b.x;
      const prevY = b.y;

      if (ptr.x >= 0 && ptr.y >= 0) {
        b.x = ptr.x;
        b.y = ptr.y;
      }

      const dx = b.x - prevX;
      const dy = b.y - prevY;
      const dist = Math.hypot(dx, dy);
      const speed = dt > 0 ? dist / (dt * 60) : 0;
      b.speed = speed;

      // 2. Direct Angle Calculation without sluggish damping
      if (dist > 3) {
        b.angle = Math.atan2(dy, dx);
      } else if (!ptr.isDown) {
        b.angle = -Math.PI / 4;
      }

      // Slashing threshold: mouse pressed or rapid movement
      const slashingNow = ptr.isDown || speed > 15;
      b.isSlashing = slashingNow;
      setIsSlashing(slashingNow);

      if (slashingNow && speed > 22 && currentTime - swooshThrottle > 280) {
        swooshThrottle = currentTime;
        playSfx('swoosh');
      }

      // 3. Add point to Trail along stroke trajectory
      if (ptr.x >= 0 && ptr.y >= 0) {
        if (slashingNow) {
          if (!strokeStartRef.current) {
            strokeStartRef.current = { x: b.x, y: b.y, time: currentTime };
          }
          trailRef.current.push({
            x: b.x,
            y: b.y,
            time: currentTime,
            timestamp: currentTime,
            speed,
          });
        }
      }

      // 4. Prune old trail points (max 220ms lifetime)
      const trailExpiry = currentTime - 220;
      while (trailRef.current.length > 0 && trailRef.current[0].time < trailExpiry) {
        trailRef.current.shift();
      }
      if (trailRef.current.length === 0 && !ptr.isDown) {
        strokeStartRef.current = null;
      }

      // 5. Update Sparks Physics
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const spark = sparksRef.current[i];
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vy += 0.22; // subtle gravity
        spark.life += dt;
        if (spark.life >= spark.maxLife) {
          sparksRef.current.splice(i, 1);
        }
      }

      // 6. Hit Detection along the latest slash segment
      if (slashingNow && trailRef.current.length >= 2) {
        const len = trailRef.current.length;
        const p1 = trailRef.current[len - 2];
        const p2 = trailRef.current[len - 1];

        // Compute stroke vector: dx = currentX - startX, dy = currentY - startY
        const startPt = strokeStartRef.current || trailRef.current[0];
        let strokeDx = p2.x - startPt.x;
        let strokeDy = p2.y - startPt.y;

        // Fallback to immediate segment if start and current point are too close
        if (Math.hypot(strokeDx, strokeDy) < 4) {
          strokeDx = p2.x - p1.x;
          strokeDy = p2.y - p1.y;
        }
        const slashAngle = Math.atan2(strokeDy, strokeDx);

        // Check targets
        if (!disabled) {
          for (const target of targets) {
            if (segmentIntersectsBox(p1, p2, target)) {
              if (target.isError) {
                // CRITICAL HIT
                currentStrokeRef.current.hitError = true;
                if (currentTime - lastHitTimeRef.current > 400) {
                lastHitTimeRef.current = currentTime;
                playSfx('hit');
                spawnSparks(p2.x, p2.y, 28, themeColor, 8, slashAngle);
                onHit?.({
                  type: 'critical_slash',
                  token: target,
                  point: { x: p2.x, y: p2.y },
                  cutSegment: { p1, p2 },
                  slashAngle,
                  strokeVector: { dx: strokeDx, dy: strokeDy },
                  timestamp: currentTime,
                });
              }
            } else {
              // PARRY / MISS on healthy code
              if (
                currentTime - lastParryTimeRef.current > 350 &&
                currentTime - lastHitTimeRef.current > 300
              ) {
                lastParryTimeRef.current = currentTime;
                playSfx('parry');
                spawnSparks(p2.x, p2.y, 14, '#38bdf8', 5, slashAngle);
                onParry?.({
                  type: 'parry_deflect',
                  token: target,
                  point: { x: p2.x, y: p2.y },
                  cutSegment: { p1, p2 },
                  slashAngle,
                  strokeVector: { dx: strokeDx, dy: strokeDy },
                  timestamp: currentTime,
                });
              }
            }
            break; // Handle first intersected token per frame
          }
        }
      }
    }

    animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [disabled, onHit, onParry, playSfx, spawnSparks, targets, themeColor]);

  return {
    bladeState,
    trailRef,
    sparksRef,
    isInside,
    isSlashing,
    spawnSparks,
    playSfx,
  };
}
