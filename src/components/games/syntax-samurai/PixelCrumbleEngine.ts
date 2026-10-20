/**
 * Pixel Crumble Physics Engine - 60 FPS Voxel Explosion Engine
 * Phase 1 Optimization: Locked 60 FPS 3D Voxel Explosions
 *
 * Performance Optimizations:
 * 1. Zero Shadow Overhead: Removed all ctx.shadowBlur and ctx.shadowColor from render loop
 * 2. Zero Stack Overhead: Removed per-particle ctx.save() / ctx.restore(); single canvas state wrapping
 * 3. Zero GC Churn: Eliminated per-frame array allocations and .sort()
 * 4. Direct Arithmetic Coordinates: 3D isometric faces rendered via direct scalar vector arithmetic
 * 5. Pre-computed Isometric Palettes: Instant lookup for base, top (highlight), and side (shadow)
 * 6. In-Place Physics Updates: Single backward loop with air drag (0.95) and gravity (0.42)
 * 7. Optimal Particle Density: Default count = 38 particles, lifetime capped at 0.45s - 0.75s
 */

export interface VoxelPalette {
  base: string; // Front face vibrant shade
  top: string; // Top face highlight shade
  side: string; // Side face drop-shadow shade
}

export interface CrumbleParticle {
  x: number;
  y: number;
  z: number; // z < 0 toward camera/screen, z > 0 into background
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  vz: number;
  size: number; // 2, 3, or 4px base cube edge length
  color: string;
  palette: VoxelPalette; // Pre-computed base, top, side isometric shades
  // 3D Angular Rotations & Angular Velocities
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  rotation?: number; // backwards-compatible alias to rotZ
  life: number;
  maxLife: number; // seconds (0.45s - 0.75s)
}

export interface ShockwaveRing {
  x: number;
  y: number;
  currentRadius: number;
  startRadius: number; // 4px
  maxRadius: number; // 80px
  duration: number; // 0.28s (280ms)
  elapsed: number; // seconds
  color: string; // #ef4444
}

export interface ExplodeBoxOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  cutAngle?: number;
  count?: number; // Default 38 particles
  colors?: string[];
}

// Built-in pre-computed palettes for fast lookup
const DEFAULT_PALETTES: Record<string, VoxelPalette> = {
  '#ef4444': { base: '#ef4444', top: '#fca5a5', side: '#b91c1c' },
  '#f87171': { base: '#f87171', top: '#fecaca', side: '#dc2626' },
  '#f59e0b': { base: '#f59e0b', top: '#fde68a', side: '#b45309' },
  '#ffffff': { base: '#ffffff', top: '#ffffff', side: '#cbd5e1' },
  '#991b1b': { base: '#991b1b', top: '#ef4444', side: '#5f0f0f' },
  '#10b981': { base: '#10b981', top: '#6ee7b7', side: '#047857' },
  '#34d399': { base: '#34d399', top: '#a7f3d0', side: '#059669' },
};

const PALETTE_CACHE = new Map<string, VoxelPalette>();

/**
 * Resolves or pre-computes an isometric 3-shade palette for any color
 */
export function getVoxelPalette(color: string): VoxelPalette {
  if (DEFAULT_PALETTES[color]) return DEFAULT_PALETTES[color];
  const cached = PALETTE_CACHE.get(color);
  if (cached) return cached;

  // Compute isometric shades for custom colors
  let r = 239,
    g = 68,
    b = 68;
  if (color.startsWith('#') && color.length === 7) {
    r = parseInt(color.slice(1, 3), 16) || 0;
    g = parseInt(color.slice(3, 5), 16) || 0;
    b = parseInt(color.slice(5, 7), 16) || 0;
  }
  const top = `rgb(${Math.min(255, r + 70)}, ${Math.min(255, g + 70)}, ${Math.min(255, b + 70)})`;
  const side = `rgb(${Math.max(0, r - 60)}, ${Math.max(0, g - 60)}, ${Math.max(0, b - 60)})`;
  const palette: VoxelPalette = { base: color, top, side };
  PALETTE_CACHE.set(color, palette);
  return palette;
}

export class PixelCrumbleEngine {
  public particles: CrumbleParticle[] = [];
  public shockwaves: ShockwaveRing[] = [];
  public gravity: number = 0.42; // Downward gravity 0.42
  public friction: number = 0.95; // Air drag 0.95
  public cameraDistance: number = 320; // Perspective FOV camera distance

  /**
   * Spawns high-velocity 3D voxel particles & impact shockwave ring from cut epicenter
   * Optimized with default count = 38 and lifetimes capped at 0.45s - 0.75s
   */
  public explode({
    x,
    y,
    width,
    height,
    cutAngle = -Math.PI / 4,
    count = 38,
    colors = ['#ef4444', '#f87171', '#f59e0b', '#ffffff', '#991b1b'],
  }: ExplodeBoxOptions) {
    const boxW = width > 0 ? width : 16;
    const boxH = height > 0 ? height : 16;
    const centerX = x + boxW / 2;
    const centerY = y + boxH / 2;

    // 1. Spawn expanding shockwave ring at cut epicenter
    this.shockwaves.push({
      x: centerX,
      y: centerY,
      currentRadius: 4,
      startRadius: 4,
      maxRadius: 80,
      duration: 0.28, // 280ms
      elapsed: 0,
      color: '#ef4444',
    });

    // Slash impulse components along travel direction
    const tx = Math.cos(cutAngle);
    const ty = Math.sin(cutAngle);
    const forwardImpulse = 5.5;

    const newParticles: CrumbleParticle[] = [];

    // 2. Spawn 3D spherical radial explosion particles
    for (let i = 0; i < count; i++) {
      const px = x + Math.random() * boxW;
      const py = y + Math.random() * boxH;
      const pz = (Math.random() - 0.5) * 16;

      // 3D Spherical explosion angles:
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      // High initial blast speed: 8 to 22 px/frame
      const blastSpeed = Math.random() * 14 + 8;

      // Radial spherical velocities + upward explosive impulse
      let vx = Math.cos(phi) * Math.cos(theta) * blastSpeed;
      let vy = Math.sin(phi) * blastSpeed - (Math.random() * 3 + 1.5);
      const vz = Math.cos(phi) * Math.sin(theta) * blastSpeed * 1.5;

      // Add forward momentum along the blade cut path
      vx += tx * forwardImpulse;
      vy += ty * forwardImpulse;

      // 2x2px and 4x4px base cube voxel sizes
      const size = Math.random() > 0.6 ? 4 : 2;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const palette = getVoxelPalette(color);

      // 3D Rotational angles & high-speed tumbling angular velocities
      const rotX = Math.random() * Math.PI * 2;
      const rotY = Math.random() * Math.PI * 2;
      const rotZ = Math.random() * Math.PI * 2;

      const vRotX = (Math.random() - 0.5) * 0.5;
      const vRotY = (Math.random() - 0.5) * 0.5;
      const vRotZ = (Math.random() - 0.5) * 0.5;

      // Lifetime capped between 0.45s and 0.75s
      const maxLife = Math.random() * 0.3 + 0.45;

      newParticles.push({
        x: px,
        y: py,
        z: pz,
        originX: centerX,
        originY: centerY,
        vx,
        vy,
        vz,
        size,
        color,
        palette,
        rotX,
        rotY,
        rotZ,
        vRotX,
        vRotY,
        vRotZ,
        rotation: rotZ,
        life: 0,
        maxLife,
      });
    }

    this.particles.push(...newParticles);
  }

  /**
   * In-place physics updates in a single backward loop with splice on expired items
   */
  public update(dt: number) {
    // 1. Expand and fade active shockwave rings
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.elapsed += dt;
      const progress = Math.min(1, sw.elapsed / sw.duration);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      sw.currentRadius = sw.startRadius + (sw.maxRadius - sw.startRadius) * easeOut;

      if (sw.elapsed >= sw.duration) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 2. In-place particle updates: air drag (0.95), gravity (0.42), 3D rotations
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Air drag (0.95) & downward gravity (0.42)
      p.vx *= this.friction;
      p.vy *= this.friction;
      p.vz *= this.friction;
      p.vy += this.gravity;

      // 3D Translation
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;

      // 3D Tumbling Angular Rotations
      p.rotX += p.vRotX;
      p.rotY += p.vRotY;
      p.rotZ += p.vRotZ;
      p.rotation = p.rotZ; // backwards-compatible alias

      // Age particle & splice expired
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * High-performance 60 FPS renderer:
   * - No per-particle save/restore
   * - No shadowBlur / shadowColor
   * - No per-frame array allocations or .sort()
   * - Direct arithmetic isometric voxel face rendering
   */
  public render(ctx: CanvasRenderingContext2D) {
    // 1. Render Shockwave Rings without shadowBlur overhead
    if (this.shockwaves.length > 0) {
      ctx.save();
      for (let i = 0; i < this.shockwaves.length; i++) {
        const sw = this.shockwaves[i];
        const progress = Math.min(1, sw.elapsed / sw.duration);
        const alpha = Math.max(0, 1 - progress);
        if (alpha <= 0) continue;

        // Outer neon ring
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = Math.max(1, 3.5 * (1 - progress));
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.currentRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner razor edge
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(0.5, 1.2 * (1 - progress));
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.currentRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.particles.length === 0) return;

    // Single canvas state save/restore wrapping all particles
    ctx.save();

    // Iterate directly without per-frame array copying or .sort()
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (alpha <= 0) continue;

      ctx.globalAlpha = alpha;

      // Perspective Projection
      const scale = this.cameraDistance / Math.max(80, this.cameraDistance + p.z);
      const cx = p.originX + (p.x - p.originX) * scale;
      const cy = p.originY + (p.y - p.originY) * scale;
      const half = Math.max(1.0, (p.size * scale) * 0.5);

      // Precalculate 3D rotation trigonometric values for basis vectors
      const cosZ = Math.cos(p.rotZ);
      const sinZ = Math.sin(p.rotZ);
      const cosX = Math.cos(p.rotX);
      const sinX = Math.sin(p.rotX);
      const cosY = Math.cos(p.rotY);
      const sinY = Math.sin(p.rotY);

      // Direct arithmetic 3D isometric basis vectors:
      // u: right/front axis
      const ux = cosY * cosZ * half;
      const uy = cosY * sinZ * half;

      // v: top/vertical axis
      const vx = (-sinX * -sinY * cosZ + cosX * -sinZ) * half;
      const vy = (-sinX * -sinY * sinZ + cosX * cosZ) * half;

      // w: side/depth axis
      const wx = (cosX * -sinY * cosZ + sinX * sinZ) * half;
      const wy = (cosX * -sinY * sinZ - sinX * cosZ) * half;

      // Direct arithmetic isometric voxel face rendering:
      // 1. Top Face (Highlight)
      ctx.fillStyle = p.palette.top;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + ux, cy + uy);
      ctx.lineTo(cx + ux + wx, cy + uy + wy);
      ctx.lineTo(cx + wx, cy + wy);
      ctx.closePath();
      ctx.fill();

      // 2. Front Face (Base color)
      ctx.fillStyle = p.palette.base;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + ux, cy + uy);
      ctx.lineTo(cx + ux + vx, cy + uy + vy);
      ctx.lineTo(cx + vx, cy + vy);
      ctx.closePath();
      ctx.fill();

      // 3. Side Face (Darker shadow)
      ctx.fillStyle = p.palette.side;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + wx, cy + wy);
      ctx.lineTo(cx + wx + vx, cy + wy + vy);
      ctx.lineTo(cx + vx, cy + vy);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Clear all active particles and shockwave rings
   */
  public clear() {
    this.particles = [];
    this.shockwaves = [];
  }
}

export default PixelCrumbleEngine;
