'use client';

import React, { useEffect, useRef } from 'react';
import { SlashPoint, BladeSpark } from '@/types/syntaxSamurai';
import { PixelCrumbleEngine } from '@/components/games/syntax-samurai/PixelCrumbleEngine';

export interface KatanaCanvasProps {
  containerRef: React.RefObject<HTMLElement | null>;
  bladeState: React.MutableRefObject<{
    x: number;
    y: number;
    angle: number;
    speed: number;
    isSlashing: boolean;
  }>;
  trailRef: React.MutableRefObject<SlashPoint[]>;
  sparksRef: React.MutableRefObject<BladeSpark[]>;
  crumbleEngineRef?: React.MutableRefObject<PixelCrumbleEngine | null>;
  isInside: boolean;
  themeColor?: string;
  accentColor?: string;
  renderBladeOverlay?: boolean;
}

export const KatanaCanvas: React.FC<KatanaCanvasProps> = ({
  containerRef,
  bladeState,
  trailRef,
  sparksRef,
  crumbleEngineRef,
  isInside,
  themeColor = '#10b981',
  accentColor = '#34d399',
  renderBladeOverlay = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    // Draw dynamic glowing slash trail strictly along travel direction from (startX, startY) to (currentX, currentY)
    const drawTrail = (trail: SlashPoint[]) => {
      const n = trail.length;
      if (n < 2) return;

      const now = performance.now();

      // 1. Outer Neon Glow Pass (Tapered from needle tail to wide cutting head)
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 18;

      for (let i = 1; i < n; i++) {
        const p1 = trail[i - 1];
        const p2 = trail[i];
        const age = now - p2.time;
        const ageFactor = Math.max(0, 1 - age / 220); // 1 = newest, 0 = oldest
        if (ageFactor <= 0) continue;

        // Position along stroke travel: 0 = startX/startY (tail), 1 = currentX/currentY (cutting head)
        const strokeProgress = i / (n - 1);
        const taper = Math.pow(strokeProgress, 0.75) * ageFactor;

        ctx.strokeStyle = themeColor;
        // Razor thin at tail, thick neon core at cutting head
        ctx.lineWidth = Math.max(0.75, taper * 9);
        ctx.globalAlpha = Math.max(0.04, Math.pow(strokeProgress, 0.6) * 0.9 * ageFactor);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Inner Razor-White Core Pass (Sharp tapered blade edge)
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 1; i < n; i++) {
        const p1 = trail[i - 1];
        const p2 = trail[i];
        const age = now - p2.time;
        const ageFactor = Math.max(0, 1 - age / 180);
        if (ageFactor <= 0) continue;

        const strokeProgress = i / (n - 1);
        const coreTaper = Math.pow(strokeProgress, 0.85) * ageFactor;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(0.4, coreTaper * 3.2);
        ctx.globalAlpha = Math.max(0.08, Math.pow(strokeProgress, 0.6) * ageFactor);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Leading Cutting Head Gleam at the sword edge (currentX, currentY)
      const head = trail[n - 1];
      const headAge = now - head.time;
      if (headAge < 100) {
        const headIntensity = Math.max(0, 1 - headAge / 100);
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 14 * headIntensity;
        ctx.globalAlpha = headIntensity;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 2.5 * headIntensity, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    // Draw active sparks
    const drawSparks = (sparks: BladeSpark[]) => {
      if (sparks.length === 0) return;

      ctx.save();
      for (const spark of sparks) {
        const alpha = Math.max(0, 1 - spark.life / spark.maxLife);
        ctx.fillStyle = spark.color;
        ctx.shadowColor = spark.color;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = alpha;

        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    // Main 60fps render loop
    const render = () => {
      const rect = container.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Render Trail
      drawTrail(trailRef.current);

      // Render Sparks
      drawSparks(sparksRef.current);

      // Render Pixel Crumble Debris
      if (crumbleEngineRef?.current) {
        crumbleEngineRef.current.update(1 / 60);
        crumbleEngineRef.current.render(ctx);
      }


      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [accentColor, bladeState, containerRef, crumbleEngineRef, isInside, renderBladeOverlay, sparksRef, themeColor, trailRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-30"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default KatanaCanvas;
