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

    // Draw authentic Katana sprite pointing along its angle
    const drawKatana = (
      x: number,
      y: number,
      angle: number,
      isSlashing: boolean
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Katana dimensions
      // The tip of the blade will be near (0, 0) or offset slightly ahead of cursor
      const bladeLength = 75;
      const handleLength = 26;
      const tsubaRadius = 5;

      // Handle (Tsuka) drawn backwards from -10 to -36
      ctx.save();
      ctx.translate(-bladeLength, 0);

      // Pommel (Kashira)
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(-handleLength, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Handle wrap (Tsuka-ito)
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-handleLength, -3, handleLength, 6);

      // Handle diamond braid details
      ctx.fillStyle = '#d97706';
      for (let i = 0; i < handleLength - 4; i += 5) {
        ctx.beginPath();
        ctx.moveTo(-handleLength + i, -2);
        ctx.lineTo(-handleLength + i + 2.5, 0);
        ctx.lineTo(-handleLength + i, 2);
        ctx.stroke();
      }

      // Guard (Tsuba)
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.5, tsubaRadius * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Blade Collar (Habaki)
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(0, -2.5, 4, 5);

      // Steel Blade (Nagasa & Kissaki)
      // Slight upward curvature (Sori), Kissaki tip anchored precisely at (0, 0)
      ctx.beginPath();
      ctx.moveTo(4, -2.5); // Spine base
      ctx.quadraticCurveTo(bladeLength * 0.55, -3.5, bladeLength - 4, -1); // Curved spine
      ctx.lineTo(bladeLength, 0); // Kissaki tip at exactly (0, 0)
      ctx.lineTo(bladeLength - 6, 2.5); // Cutting edge tip
      ctx.quadraticCurveTo(bladeLength * 0.55, 3.5, 4, 2.5); // Cutting edge
      ctx.closePath();

      // Steel gradient fill
      const steelGrad = ctx.createLinearGradient(0, -3, 0, 3);
      steelGrad.addColorStop(0, '#64748b'); // Slate spine
      steelGrad.addColorStop(0.5, '#f8fafc'); // Polished core
      steelGrad.addColorStop(1, '#ffffff'); // Razor sharp cutting edge
      ctx.fillStyle = steelGrad;
      ctx.fill();

      // Hamon (wavy temper line along the blade)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(8, 0.5);
      for (let gx = 10; gx < bladeLength - 8; gx += 6) {
        ctx.quadraticCurveTo(gx + 3, (gx % 12 === 0 ? 1.8 : 0.2), gx + 6, 0.5);
      }
      ctx.stroke();

      // Neon edge aura when slashing
      if (isSlashing) {
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(4, 2.5);
        ctx.quadraticCurveTo(bladeLength * 0.55, 3.5, bladeLength - 6, 2.5);
        ctx.lineTo(bladeLength, 0);
        ctx.stroke();
      }

      ctx.restore(); // end handle-relative

      // Glowing Katana Tip Gleam at the cursor
      if (isSlashing) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Cross flare on tip
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(6, 0);
        ctx.moveTo(0, -6);
        ctx.lineTo(0, 6);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    };

    // Draw dynamic glowing slash trail
    const drawTrail = (trail: SlashPoint[]) => {
      if (trail.length < 2) return;

      const now = performance.now();

      // 1. Outer Neon Glow Pass
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 18;

      for (let i = 1; i < trail.length; i++) {
        const p1 = trail[i - 1];
        const p2 = trail[i];
        const age = now - p2.time;
        const progress = Math.max(0, 1 - age / 220); // 1 = newest, 0 = oldest
        if (progress <= 0) continue;

        ctx.strokeStyle = themeColor;
        ctx.lineWidth = Math.max(1, progress * 8);
        ctx.globalAlpha = progress * 0.85;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Inner Razor-White Core Pass
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 1; i < trail.length; i++) {
        const p1 = trail[i - 1];
        const p2 = trail[i];
        const age = now - p2.time;
        const progress = Math.max(0, 1 - age / 180);
        if (progress <= 0) continue;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(0.5, progress * 2.8);
        ctx.globalAlpha = progress;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();
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

      // Render Katana Blade Overlay:
      // When actively slashing (isSlashing === true), or when renderBladeOverlay is enabled
      const shouldDrawBlade = renderBladeOverlay || bladeState.current.isSlashing;
      if (isInside && shouldDrawBlade && bladeState.current.x >= 0 && bladeState.current.y >= 0) {
        drawKatana(
          bladeState.current.x,
          bladeState.current.y,
          bladeState.current.angle,
          bladeState.current.isSlashing
        );
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
