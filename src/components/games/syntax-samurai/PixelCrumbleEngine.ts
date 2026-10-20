/**
 * Pixel Crumble Physics Engine - High-Velocity 3D Explosion & Shockwave Ring
 * Phase 3 Upgrade: Explosive 3D radial launch physics & cut epicenter shockwave ring.
 *
 * Manages 3D voxel particles & impact shockwaves with:
 * - Expanding Shockwave Ring: radius expanding from 4px to 80px over 280ms with fading neon red glow (#ef4444)
 * - 3D Spherical Radial Launch: theta (azimuth), phi (elevation), high speed blastSpeed (8-22px/frame)
 * - Upward explosive impulse: vy = sin(phi) * blastSpeed - (2..6)
 * - High-speed Z-depth blast: vz = cos(phi) * sin(theta) * blastSpeed * 1.5
 * - Air Drag & Downward Gravity: vx, vy, vz *= 0.96; vy += 0.45
 * - Tumbling 3D Rotations & Shaded Voxel Polygons with Painter's depth sorting
 */

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
  // 3D Angular Rotations & Angular Velocities
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  rotation?: number; // backwards-compatible alias to rotZ
  life: number;
  maxLife: number; // seconds
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
  count?: number; // 40-80 particles
  colors?: string[];
}

// 8 canonical unit cube vertices
const UNIT_CUBE_VERTS = [
  { x: -1, y: -1, z: -1 }, // 0: Top-Left-Front
  { x: 1, y: -1, z: -1 }, // 1: Top-Right-Front
  { x: 1, y: 1, z: -1 }, // 2: Bottom-Right-Front
  { x: -1, y: 1, z: -1 }, // 3: Bottom-Left-Front
  { x: -1, y: -1, z: 1 }, // 4: Top-Left-Back
  { x: 1, y: -1, z: 1 }, // 5: Top-Right-Back
  { x: 1, y: 1, z: 1 }, // 6: Bottom-Right-Back
  { x: -1, y: 1, z: 1 }, // 7: Bottom-Left-Back
] as const;

// 6 canonical voxel faces with outward normals
const CUBE_FACES = [
  { indices: [0, 1, 2, 3], norm: { x: 0, y: 0, z: -1 }, type: 'front' as const },
  { indices: [5, 4, 7, 6], norm: { x: 0, y: 0, z: 1 }, type: 'back' as const },
  { indices: [4, 5, 1, 0], norm: { x: 0, y: -1, z: 0 }, type: 'top' as const },
  { indices: [3, 2, 6, 7], norm: { x: 0, y: 1, z: 0 }, type: 'bottom' as const },
  { indices: [1, 5, 6, 2], norm: { x: 1, y: 0, z: 0 }, type: 'right' as const },
  { indices: [4, 0, 3, 7], norm: { x: -1, y: 0, z: 0 }, type: 'left' as const },
] as const;

export class PixelCrumbleEngine {
  public particles: CrumbleParticle[] = [];
  public shockwaves: ShockwaveRing[] = [];
  public gravity: number = 0.45; // ay = +0.45 downward acceleration
  public friction: number = 0.96; // Air drag 0.96
  public cameraDistance: number = 320; // Perspective FOV camera distance

  // Reusable 8-vertex buffer to eliminate per-particle GC allocations
  private rotVerts = [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
  ];

  /**
   * Spawns high-velocity 3D voxel particles & impact shockwave ring from cut epicenter
   */
  public explode({
    x,
    y,
    width,
    height,
    cutAngle = -Math.PI / 4,
    count = 65,
    colors = ['#ef4444', '#f87171', '#f59e0b', '#ffffff', '#991b1b'],
  }: ExplodeBoxOptions) {
    const boxW = width > 0 ? width : 16;
    const boxH = height > 0 ? height : 16;
    const centerX = x + boxW / 2;
    const centerY = y + boxH / 2;

    // 1. Spawn expanding shockwave ring at cut epicenter:
    // Expanding radius from 4px to 80px over 280ms with fading neon red glow (#ef4444)
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
      // Distribute particle inside the token bounding box
      const px = x + Math.random() * boxW;
      const py = y + Math.random() * boxH;
      const pz = (Math.random() - 0.5) * 16;

      // 3D Spherical explosion velocities:
      // Azimuth angle: theta in [0, 2*PI]
      // Elevation angle: phi in [-PI/2, PI/2]
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

      // 3D Rotational angles & high-speed tumbling angular velocities
      const rotX = Math.random() * Math.PI * 2;
      const rotY = Math.random() * Math.PI * 2;
      const rotZ = Math.random() * Math.PI * 2;

      const vRotX = (Math.random() - 0.5) * 0.5;
      const vRotY = (Math.random() - 0.5) * 0.5;
      const vRotZ = (Math.random() - 0.5) * 0.5;

      const maxLife = Math.random() * 0.35 + 0.45; // 0.45s to 0.8s

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
   * Update 3D particle physics & shockwave expansion (60fps delta)
   */
  public update(dt: number) {
    // 1. Expand and fade active shockwave rings
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.elapsed += dt;
      const progress = Math.min(1, sw.elapsed / sw.duration);
      // Ease-out cubic for rapid initial shockwave expansion
      const easeOut = 1 - Math.pow(1 - progress, 3);
      sw.currentRadius = sw.startRadius + (sw.maxRadius - sw.startRadius) * easeOut;

      if (sw.elapsed >= sw.duration) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 2. Update 3D particles: Air drag (0.96), downward gravity (+0.45), rotations
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Air drag: p.vx *= 0.96; p.vy *= 0.96; p.vz *= 0.96;
      p.vx *= this.friction;
      p.vy *= this.friction;
      p.vz *= this.friction;

      // Downward gravity: p.vy += 0.45;
      p.vy += this.gravity;

      // 3D Translation
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;

      // 3D Tumbling Angular Rotations: p.rotX += p.vRotX; p.rotY += p.vRotY; p.rotZ += p.vRotZ;
      p.rotX += p.vRotX;
      p.rotY += p.vRotY;
      p.rotZ += p.vRotZ;
      p.rotation = p.rotZ; // backwards-compatible alias

      // Age particle
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Render shockwave rings and 3D voxel cubes to 2D canvas context
   */
  public render(ctx: CanvasRenderingContext2D) {
    // 1. Render Shockwave Rings at cut epicenter
    if (this.shockwaves.length > 0) {
      ctx.save();
      for (const sw of this.shockwaves) {
        const progress = Math.min(1, sw.elapsed / sw.duration);
        const alpha = Math.max(0, 1 - progress);
        if (alpha <= 0) continue;

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.currentRadius, 0, Math.PI * 2);

        // Neon red outer glowing shockwave stroke
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = Math.max(1, 3.5 * (1 - progress));
        ctx.globalAlpha = alpha;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 18 * alpha;
        ctx.stroke();

        // Razor-white inner edge gleam
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(0.5, 1.2 * (1 - progress));
        ctx.globalAlpha = alpha * 0.9;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8 * alpha;
        ctx.stroke();

        ctx.restore();
      }
      ctx.restore();
    }

    if (this.particles.length === 0) return;

    ctx.save();

    // Sort particles by Z-depth (draw farthest / highest Z first for correct occlusion)
    const sorted = [...this.particles].sort((a, b) => b.z - a.z);

    for (const p of sorted) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (alpha <= 0) continue;

      // Perspective Projection: scale = cameraDistance / Math.max(80, cameraDistance + p.z)
      const scale = this.cameraDistance / Math.max(80, this.cameraDistance + p.z);
      const projX = p.originX + (p.x - p.originX) * scale;
      const projY = p.originY + (p.y - p.originY) * scale;
      const projSize = Math.max(1.2, p.size * scale);
      const h = projSize / 2;

      // Precalculate 3D rotation trigonometric values
      const cosX = Math.cos(p.rotX);
      const sinX = Math.sin(p.rotX);
      const cosY = Math.cos(p.rotY);
      const sinY = Math.sin(p.rotY);
      const cosZ = Math.cos(p.rotZ);
      const sinZ = Math.sin(p.rotZ);

      // Rotate 3D normal vector
      const rotateNorm = (n: { readonly x: number; readonly y: number; readonly z: number }) => {
        const y1 = n.y * cosX - n.z * sinX;
        const z1 = n.y * sinX + n.z * cosX;
        const x2 = n.x * cosY + z1 * sinY;
        const z2 = -n.x * sinY + z1 * cosY;
        return {
          x: x2 * cosZ - y1 * sinZ,
          y: x2 * sinZ + y1 * cosZ,
          z: z2,
        };
      };

      // Rotate 8 vertices directly into reusable buffer
      for (let vi = 0; vi < 8; vi++) {
        const uv = UNIT_CUBE_VERTS[vi];
        const vx = uv.x * h;
        const vy = uv.y * h;
        const vz = uv.z * h;
        // Pitch (around X)
        const y1 = vy * cosX - vz * sinX;
        const z1 = vy * sinX + vz * cosX;
        // Yaw (around Y)
        const x2 = vx * cosY + z1 * sinY;
        const z2 = -vx * sinY + z1 * cosY;
        // Roll (around Z)
        this.rotVerts[vi].x = x2 * cosZ - y1 * sinZ;
        this.rotVerts[vi].y = x2 * sinZ + y1 * cosZ;
        this.rotVerts[vi].z = z2;
      }

      // Identify visible faces (Backface Culling: normal points towards camera if rNorm.z < 0)
      const visibleFaces = [];
      for (const face of CUBE_FACES) {
        const rNorm = rotateNorm(face.norm);
        if (rNorm.z < 0) {
          const idxs = face.indices;
          const avgZ =
            (this.rotVerts[idxs[0]].z +
              this.rotVerts[idxs[1]].z +
              this.rotVerts[idxs[2]].z +
              this.rotVerts[idxs[3]].z) *
            0.25;
          visibleFaces.push({ face, rNorm, avgZ });
        }
      }

      // Sort visible faces by avgZ descending (draw farthest face first)
      visibleFaces.sort((a, b) => b.avgZ - a.avgZ);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = projSize >= 4 ? 6 : 2;

      for (const { face, rNorm } of visibleFaces) {
        const idxs = face.indices;
        const p0 = this.rotVerts[idxs[0]];
        const p1 = this.rotVerts[idxs[1]];
        const p2 = this.rotVerts[idxs[2]];
        const p3 = this.rotVerts[idxs[3]];

        ctx.beginPath();
        ctx.moveTo(projX + p0.x, projY + p0.y);
        ctx.lineTo(projX + p1.x, projY + p1.y);
        ctx.lineTo(projX + p2.x, projY + p2.y);
        ctx.lineTo(projX + p3.x, projY + p3.y);
        ctx.closePath();

        // 1. Base face fill
        ctx.fillStyle = p.color;
        ctx.fill();

        // 2. 3D Face Shading:
        // Top Face: Lighter highlight tint (#ffffff / #fca5a5)
        // Front Face: Base particle color
        // Side/Bottom Edge: Darker drop-shadow shading (rgba(0, 0, 0, 0.45))
        if (face.type === 'top' || rNorm.y < -0.35) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
          ctx.fill();
        } else if (face.type === 'bottom' || rNorm.y > 0.35) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.fill();
        } else if (
          face.type === 'right' ||
          face.type === 'left' ||
          Math.abs(rNorm.x) > 0.35
        ) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.fill();
        } else {
          // Front face subtle shine
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fill();
        }

        // Crisp 3D voxel edges
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      ctx.restore();
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
