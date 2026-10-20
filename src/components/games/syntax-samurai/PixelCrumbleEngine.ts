/**
 * Pixel Crumble Physics Engine
 * Phase 3: Pixel Particle Crumble FX & Typewriter Code Transitions
 *
 * Manages 2x2px and 4x4px pixel debris erupting from sliced syntax tokens
 * with velocity, gravity (ay = +0.4), rotational spin, and alpha decay.
 */

export interface CrumbleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number; // 2, 3, or 4px
  color: string;
  rotation: number;
  vRot: number; // rotational velocity
  life: number;
  maxLife: number; // seconds
}

export interface ExplodeBoxOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  cutAngle?: number;
  count?: number; // 40-80 particles
  colors?: string[];
}

export class PixelCrumbleEngine {
  public particles: CrumbleParticle[] = [];
  public gravity: number = 0.4; // ay = +0.4 downward acceleration
  public friction: number = 0.985;

  /**
   * Spawns 40–80 square pixel particles from the sliced token bounding box
   */
  public explode({
    x,
    y,
    width,
    height,
    cutAngle = -Math.PI / 4,
    count = 60,
    colors = ['#ef4444', '#f87171', '#f59e0b', '#ffffff', '#991b1b'],
  }: ExplodeBoxOptions) {
    // Tangent vector along the slash stroke direction
    const tx = Math.cos(cutAngle);
    const ty = Math.sin(cutAngle);

    // Normal vector perpendicular to the cut line
    const nx = -Math.sin(cutAngle);
    const ny = Math.cos(cutAngle);

    const newParticles: CrumbleParticle[] = [];

    for (let i = 0; i < count; i++) {
      // Distribute particle inside the token bounding box
      const px = x + Math.random() * width;
      const py = y + Math.random() * height;

      // Stroke forward impulse along the slash travel direction
      const forwardImpulse = (Math.random() * 0.6 + 0.4) * 4.5;

      // Two halves blast apart perpendicular to the cut seam
      const side = Math.random() > 0.5 ? 1 : -1;
      const blastPower = Math.random() * 3.5 + 2.0;

      // Slight natural scatter jitter
      const jitter = (Math.random() - 0.5) * 2.0;

      const vx = tx * forwardImpulse + side * nx * blastPower + jitter;
      const vy = ty * forwardImpulse + side * ny * blastPower + jitter;

      // 2x2px and 4x4px square particles
      const size = Math.random() > 0.6 ? 4 : 2;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const rotation = Math.random() * Math.PI * 2;
      const vRot = (Math.random() - 0.5) * 0.4;
      const maxLife = Math.random() * 0.35 + 0.45; // 0.45s to 0.8s

      newParticles.push({
        x: px,
        y: py,
        vx,
        vy,
        size,
        color,
        rotation,
        vRot,
        life: 0,
        maxLife,
      });
    }

    this.particles.push(...newParticles);
  }

  /**
   * Update particle physics step (60fps delta)
   */
  public update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Gravity & friction
      p.vy += this.gravity;
      p.vx *= this.friction;
      p.vy *= this.friction;

      p.x += p.vx;
      p.y += p.vy;

      // Rotational spin
      p.rotation += p.vRot;

      // Age particle
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Render particles to 2D canvas context
   */
  public render(ctx: CanvasRenderingContext2D) {
    if (this.particles.length === 0) return;

    ctx.save();
    for (const p of this.particles) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size >= 4 ? 6 : 2;

      // Draw square pixel block
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Clear all active particles
   */
  public clear() {
    this.particles = [];
  }
}
