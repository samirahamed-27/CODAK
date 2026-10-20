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

export class PixelCrumbleEngine {
  public particles: CrumbleParticle[] = [];
  public gravity: number = 0.4; // ay = +0.4 downward acceleration
  public friction: number = 0.985;
  public cameraDistance: number = 320; // Perspective FOV camera distance

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

    const originX = x + width / 2;
    const originY = y + height / 2;

    const newParticles: CrumbleParticle[] = [];

    for (let i = 0; i < count; i++) {
      // Distribute particle inside the token bounding box
      const px = x + Math.random() * width;
      const py = y + Math.random() * height;
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

      // 8 local 3D vertices of the voxel cube centered at origin
      const rawVerts = [
        { x: -h, y: -h, z: -h }, // 0: Top-Left-Front
        { x: h, y: -h, z: -h }, // 1: Top-Right-Front
        { x: h, y: h, z: -h }, // 2: Bottom-Right-Front
        { x: -h, y: h, z: -h }, // 3: Bottom-Left-Front
        { x: -h, y: -h, z: h }, // 4: Top-Left-Back
        { x: h, y: -h, z: h }, // 5: Top-Right-Back
        { x: h, y: h, z: h }, // 6: Bottom-Right-Back
        { x: -h, y: h, z: h }, // 7: Bottom-Left-Back
      ];

      // Precalculate 3D rotation trigonometric values
      const cosX = Math.cos(p.rotX);
      const sinX = Math.sin(p.rotX);
      const cosY = Math.cos(p.rotY);
      const sinY = Math.sin(p.rotY);
      const cosZ = Math.cos(p.rotZ);
      const sinZ = Math.sin(p.rotZ);

      // Rotate vertex around X, Y, and Z axes
      const rotate = (v: { x: number; y: number; z: number }) => {
        // Pitch (around X)
        const y1 = v.y * cosX - v.z * sinX;
        const z1 = v.y * sinX + v.z * cosX;
        // Yaw (around Y)
        const x2 = v.x * cosY + z1 * sinY;
        const z2 = -v.x * sinY + z1 * cosY;
        // Roll (around Z)
        const x3 = x2 * cosZ - y1 * sinZ;
        const y3 = x2 * sinZ + y1 * cosZ;
        return { x: x3, y: y3, z: z2 };
      };

      const verts = rawVerts.map(rotate);

      // Define 6 voxel faces with outward normal vectors:
      // Front:  [0, 1, 2, 3], norm: (0, 0, -1)
      // Back:   [5, 4, 7, 6], norm: (0, 0, 1)
      // Top:    [4, 5, 1, 0], norm: (0, -1, 0)
      // Bottom: [3, 2, 6, 7], norm: (0, 1, 0)
      // Right:  [1, 5, 6, 2], norm: (1, 0, 0)
      // Left:   [4, 0, 3, 7], norm: (-1, 0, 0)
      const faces = [
        { indices: [0, 1, 2, 3], norm: { x: 0, y: 0, z: -1 }, type: 'front' as const },
        { indices: [5, 4, 7, 6], norm: { x: 0, y: 0, z: 1 }, type: 'back' as const },
        { indices: [4, 5, 1, 0], norm: { x: 0, y: -1, z: 0 }, type: 'top' as const },
        { indices: [3, 2, 6, 7], norm: { x: 0, y: 1, z: 0 }, type: 'bottom' as const },
        { indices: [1, 5, 6, 2], norm: { x: 1, y: 0, z: 0 }, type: 'right' as const },
        { indices: [4, 0, 3, 7], norm: { x: -1, y: 0, z: 0 }, type: 'left' as const },
      ];

      // Identify visible faces (Backface Culling: normal points towards camera if rNorm.z < 0)
      const visibleFaces = [];
      for (const face of faces) {
        const rNorm = rotate(face.norm);
        if (rNorm.z < 0) {
          const pts = face.indices.map((idx) => verts[idx]);
          const avgZ = (pts[0].z + pts[1].z + pts[2].z + pts[3].z) / 4;
          visibleFaces.push({ face, pts, rNorm, avgZ });
        }
      }

      // Sort visible faces by avgZ descending (draw farthest face first)
      visibleFaces.sort((a, b) => b.avgZ - a.avgZ);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = projSize >= 4 ? 6 : 2;

      for (const { face, pts, rNorm } of visibleFaces) {
        ctx.beginPath();
        ctx.moveTo(projX + pts[0].x, projY + pts[0].y);
        ctx.lineTo(projX + pts[1].x, projY + pts[1].y);
        ctx.lineTo(projX + pts[2].x, projY + pts[2].y);
        ctx.lineTo(projX + pts[3].x, projY + pts[3].y);
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
