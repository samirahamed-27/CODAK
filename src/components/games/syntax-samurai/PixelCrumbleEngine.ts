/**
 * Pixel Crumble Physics Engine - 3D Voxel Particle Engine Upgrade
 * Phase 2 Upgrade: True 3D Voxel Cubes with depth, tumbling rotations, and shaded faces.
 *
 * Manages 3D voxel particles erupting from sliced syntax tokens with:
 * - 3D Positions: (x, y, z) where z < 0 is toward camera/screen, z > 0 into background
 * - 3D Velocities: (vx, vy, vz) with downward gravity ay = +0.4 and air friction
 * - 3D Angular Rotations: (rotX, rotY, rotZ) and tumbling angular velocities (vRotX, vRotY, vRotZ)
 * - Perspective Projection: scale = cameraDistance / Math.max(80, cameraDistance + p.z)
 * - Depth Z-sorting: Farthest particles drawn first (Painter's algorithm occlusion)
 * - 3D Shaded Voxel Faces: Top face highlight (#ffffff / #fca5a5), front face base color, side/bottom drop-shadow shading
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
  { x: 1, y: -1, z: -1 },  // 1: Top-Right-Front
  { x: 1, y: 1, z: -1 },   // 2: Bottom-Right-Front
  { x: -1, y: 1, z: -1 },  // 3: Bottom-Left-Front
  { x: -1, y: -1, z: 1 },  // 4: Top-Left-Back
  { x: 1, y: -1, z: 1 },   // 5: Top-Right-Back
  { x: 1, y: 1, z: 1 },    // 6: Bottom-Right-Back
  { x: -1, y: 1, z: 1 },   // 7: Bottom-Left-Back
] as const;

// 6 canonical voxel faces with outward normals
const CUBE_FACES = [
  { indices: [0, 1, 2, 3], norm: { x: 0, y: 0, z: -1 }, type: 'front' as const },
  { indices: [5, 4, 7, 6], norm: { x: 0, y: 0, z: 1 },  type: 'back' as const },
  { indices: [4, 5, 1, 0], norm: { x: 0, y: -1, z: 0 }, type: 'top' as const },
  { indices: [3, 2, 6, 7], norm: { x: 0, y: 1, z: 0 },  type: 'bottom' as const },
  { indices: [1, 5, 6, 2], norm: { x: 1, y: 0, z: 0 },  type: 'right' as const },
  { indices: [4, 0, 3, 7], norm: { x: -1, y: 0, z: 0 }, type: 'left' as const },
] as const;

export class PixelCrumbleEngine {
  public particles: CrumbleParticle[] = [];
  public gravity: number = 0.4; // ay = +0.4 downward acceleration
  public friction: number = 0.985;
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
   * Spawns 40–80 3D voxel cube particles from the sliced token bounding box
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
    // Tangent vector along the slash stroke direction
    const tx = Math.cos(cutAngle);
    const ty = Math.sin(cutAngle);

    // Normal vector perpendicular to the cut line
    const nx = -Math.sin(cutAngle);
    const ny = Math.cos(cutAngle);

    const boxW = width > 0 ? width : 16;
    const boxH = height > 0 ? height : 16;
    const originX = x + boxW / 2;
    const originY = y + boxH / 2;

    const newParticles: CrumbleParticle[] = [];

    for (let i = 0; i < count; i++) {
      // Distribute particle inside the token bounding box
      const px = x + Math.random() * boxW;
      const py = y + Math.random() * boxH;
      const pz = (Math.random() - 0.5) * 16; // initial depth jitter around cut plane

      // Stroke forward impulse along the slash travel direction
      const forwardImpulse = (Math.random() * 0.6 + 0.4) * 4.5;

      // Two halves blast apart perpendicular to the cut seam
      const side = Math.random() > 0.5 ? 1 : -1;
      const blastPower = Math.random() * 3.5 + 2.0;

      // Slight natural scatter jitter
      const jitter = (Math.random() - 0.5) * 2.0;

      const vx = tx * forwardImpulse + side * nx * blastPower + jitter;
      const vy = ty * forwardImpulse + side * ny * blastPower + jitter;

      // 3D Z-velocity: 60% burst forward towards the screen/camera (z < 0), 40% into depth (z > 0)
      const vz =
        Math.random() > 0.4
          ? -(Math.random() * 4.2 + 1.2) // bursting out of screen
          : Math.random() * 2.8 + 0.6; // flying into background

      // 2x2px and 4x4px base cube voxel sizes
      const size = Math.random() > 0.6 ? 4 : 2;
      const color = colors[Math.floor(Math.random() * colors.length)];

      // 3D Rotational angles & tumbling angular velocities
      const rotX = Math.random() * Math.PI * 2;
      const rotY = Math.random() * Math.PI * 2;
      const rotZ = Math.random() * Math.PI * 2;

      const vRotX = (Math.random() - 0.5) * 0.35;
      const vRotY = (Math.random() - 0.5) * 0.35;
      const vRotZ = (Math.random() - 0.5) * 0.35;

      const maxLife = Math.random() * 0.35 + 0.45; // 0.45s to 0.8s

      newParticles.push({
        x: px,
        y: py,
        z: pz,
        originX,
        originY,
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
   * Update 3D particle physics step (60fps delta)
   */
  public update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Gravity & air friction
      p.vy += this.gravity;
      p.vx *= this.friction;
      p.vy *= this.friction;
      p.vz *= this.friction;

      // 3D Translation
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;

      // 3D Tumbling Angular Rotations
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
   * Render 3D voxel cubes to 2D canvas context with perspective projection and depth shading
   */
  public render(ctx: CanvasRenderingContext2D) {
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
   * Clear all active particles
   */
  public clear() {
    this.particles = [];
  }
}

export default PixelCrumbleEngine;
