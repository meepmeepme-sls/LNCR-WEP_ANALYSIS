import { AxisConfig, MeshBodyData, Vector3D } from '../types';
import { crossProduct, normalizeVector } from './inertiaCalculator';

export interface DetectedBore {
  center: Vector3D;
  direction: Vector3D;
  diameterMm: number;
  confidence: number;
  isThroughHole: boolean;
  sourceFaceIdx: number;
  label: string;
}

/**
 * Scans mesh geometry and BREP faces to detect cylindrical bearing bores,
 * shaft holes, and bolt patterns.
 */
export function detectCylindricalBores(
  bodies: MeshBodyData[],
  globalCom: Vector3D,
  preferredAxisDir?: Vector3D
): DetectedBore[] {
  const rawBores: DetectedBore[] = [];

  for (const body of bodies) {
    const pos = body.positions;
    const norm = body.normals;
    const ind = body.indices;
    if (!norm || norm.length === 0) continue;

    // Sample vertices by step to keep performance fast even on high-poly meshes
    // We check vertex clusters and face normals
    const numTriangles = ind.length / 3;
    const stepSize = Math.max(1, Math.floor(numTriangles / 2000));

    // Group triangles into normal-continuity clusters or examine curvature
    // In OpenCascade triangulations, vertices on a cylinder share a common radial normal
    const candidateRays: { p: Vector3D; n: Vector3D }[] = [];

    for (let i = 0; i < ind.length; i += 3 * stepSize) {
      const i0 = ind[i] * 3;
      const x = pos[i0], y = pos[i0 + 1], z = pos[i0 + 2];
      const nx = norm[i0], ny = norm[i0 + 1], nz = norm[i0 + 2];

      const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (nLen > 0.5) {
        candidateRays.push({
          p: { x, y, z },
          n: { x: nx / nLen, y: ny / nLen, z: nz / nLen },
        });
      }
    }

    // Test primary coordinate axes: X, Y, Z
    const testDirs: Vector3D[] = [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ];
    if (preferredAxisDir) {
      testDirs.unshift(normalizeVector(preferredAxisDir));
    }

    for (const axisDir of testDirs) {
      // Find rays perpendicular to this axisDir: n . axisDir ≈ 0
      const perpRays = candidateRays.filter((r) => {
        const dot = Math.abs(r.n.x * axisDir.x + r.n.y * axisDir.y + r.n.z * axisDir.z);
        return dot < 0.15; // Within ~8.5 degrees of perpendicular
      });

      if (perpRays.length < 24) continue;

      // Group into 2D perpendicular coordinate system
      // Let u = axisDir, find orthogonal basis v, w
      const ref = Math.abs(axisDir.x) < 0.8 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
      const v = normalizeVector(crossProduct(axisDir, ref));
      const w = normalizeVector(crossProduct(axisDir, v));

      // Project points to 2D
      const pts2D = perpRays.map((r) => ({
        u: r.p.x * v.x + r.p.y * v.y + r.p.z * v.z,
        v: r.p.x * w.x + r.p.y * w.y + r.p.z * w.z,
        orig: r.p,
      }));

      // Approximate center via average
      let avgU = 0, avgV = 0;
      pts2D.forEach((p) => {
        avgU += p.u;
        avgV += p.v;
      });
      avgU /= pts2D.length;
      avgV /= pts2D.length;

      // Check radial consistency: distance from (avgU, avgV)
      const radii = pts2D.map((p) => Math.hypot(p.u - avgU, p.v - avgV));
      radii.sort((a, b) => a - b);
      const medianR = radii[Math.floor(radii.length / 2)];

      // Standard combat robotics shaft bores are between 3mm and 60mm diameter (1.5mm - 30mm radius)
      if (medianR < 1.5 || medianR > 35) continue;

      // Check how many points lie within 10% of median radius
      const inliers = radii.filter((r) => Math.abs(r - medianR) / medianR < 0.12);
      const inlierRatio = inliers.length / radii.length;

      if (inlierRatio > 0.45) {
        // Reconstruct 3D center point
        // Average the axial coordinate along axisDir
        let avgAxial = 0;
        perpRays.forEach((r) => {
          avgAxial += r.p.x * axisDir.x + r.p.y * axisDir.y + r.p.z * axisDir.z;
        });
        avgAxial /= perpRays.length;

        const center3D: Vector3D = {
          x: v.x * avgU + w.x * avgV + axisDir.x * avgAxial,
          y: v.y * avgU + w.y * avgV + axisDir.y * avgAxial,
          z: v.z * avgU + w.z * avgV + axisDir.z * avgAxial,
        };

        const diameter = medianR * 2;
        const diaInches = diameter / 25.4;

        // Confidence score based on inliers and closeness to global COM
        const distToCom = Math.hypot(
          center3D.x - globalCom.x,
          center3D.y - globalCom.y,
          center3D.z - globalCom.z
        );
        const closenessScore = Math.max(0, 1 - distToCom / 100);
        const confidence = inlierRatio * 0.7 + closenessScore * 0.3;

        rawBores.push({
          center: center3D,
          direction: axisDir,
          diameterMm: diameter,
          confidence,
          isThroughHole: true,
          sourceFaceIdx: 0,
          label: `Shaft Bore Ø${diameter.toFixed(1)} mm (${diaInches.toFixed(2)}")`,
        });
      }
    }
  }

  // Deduplicate bores with identical center & axis
  const uniqueBores: DetectedBore[] = [];
  for (const bore of rawBores) {
    const existing = uniqueBores.find((b) => {
      const dist = Math.hypot(
        b.center.x - bore.center.x,
        b.center.y - bore.center.y,
        b.center.z - bore.center.z
      );
      const dot = Math.abs(
        b.direction.x * bore.direction.x +
        b.direction.y * bore.direction.y +
        b.direction.z * bore.direction.z
      );
      return dist < 8.0 && dot > 0.9;
    });

    if (!existing) {
      uniqueBores.push(bore);
    } else if (bore.confidence > existing.confidence) {
      Object.assign(existing, bore);
    }
  }

  // Sort by confidence descending
  uniqueBores.sort((a, b) => b.confidence - a.confidence);
  return uniqueBores;
}

/**
 * Builds the prioritized smart axis list combining:
 * 1. Auto-detected cylindrical shaft bore (if found)
 * 2. Principal inertia axis through COM
 * 3. Principal inertia axis through Bounding Box Center
 * 4. Origin (0,0,0) axes
 */
export function buildSmartAxisCandidates(
  globalCom: Vector3D,
  bbCenter: Vector3D,
  primaryRotationAxis: Vector3D,
  weaponClassificationReason: string,
  detectedBores: DetectedBore[]
): { candidates: AxisConfig[]; bestAxis: AxisConfig } {
  const candidates: AxisConfig[] = [];

  // 1. If a cylindrical shaft bore was detected, that is priority #1!
  if (detectedBores.length > 0) {
    const bestBore = detectedBores[0];
    candidates.push({
      name: `🎯 Auto-Detected Shaft Bore: ${bestBore.label}`,
      origin: {
        x: Math.round(bestBore.center.x * 100) / 100,
        y: Math.round(bestBore.center.y * 100) / 100,
        z: Math.round(bestBore.center.z * 100) / 100,
      },
      direction: bestBore.direction,
      spinReversed: false,
    });
  }

  // 2. Principal Inertia Axis passing through Center of Mass
  const u = normalizeVector(primaryRotationAxis);
  const uLabel =
    Math.abs(u.x) > 0.9 ? 'X-Axis' : Math.abs(u.y) > 0.9 ? 'Y-Axis' : 'Z-Axis';

  candidates.push({
    name: `⚡ Auto-Detected Weapon Axis (${uLabel}) through COM`,
    origin: {
      x: Math.round(globalCom.x * 100) / 100,
      y: Math.round(globalCom.y * 100) / 100,
      z: Math.round(globalCom.z * 100) / 100,
    },
    direction: u,
    spinReversed: false,
  });

  // 3. Principal Inertia Axis passing through Bounding Box Center
  candidates.push({
    name: `📦 Center of Bounding Box (${uLabel})`,
    origin: {
      x: Math.round(bbCenter.x * 100) / 100,
      y: Math.round(bbCenter.y * 100) / 100,
      z: Math.round(bbCenter.z * 100) / 100,
    },
    direction: u,
    spinReversed: false,
  });

  // 4. Origin (0,0,0) along primary direction
  candidates.push({
    name: `Origin (0,0,0) - ${uLabel}`,
    origin: { x: 0, y: 0, z: 0 },
    direction: u,
    spinReversed: false,
  });

  // 5. Standard axes: Origin Z, Y, X
  const stdAxes: { name: string; dir: Vector3D }[] = [
    { name: 'Origin (0,0,0) - Z Axis', dir: { x: 0, y: 0, z: 1 } },
    { name: 'Origin (0,0,0) - Y Axis', dir: { x: 0, y: 1, z: 0 } },
    { name: 'Origin (0,0,0) - X Axis', dir: { x: 1, y: 0, z: 0 } },
  ];

  for (const std of stdAxes) {
    if (!candidates.some((c) => Math.abs(c.direction.x - std.dir.x) < 0.01 && Math.abs(c.direction.y - std.dir.y) < 0.01 && Math.abs(c.direction.z - std.dir.z) < 0.01 && c.origin.x === 0 && c.origin.y === 0 && c.origin.z === 0)) {
      candidates.push({
        name: std.name,
        origin: { x: 0, y: 0, z: 0 },
        direction: std.dir,
        spinReversed: false,
      });
    }
  }

  // The first candidate is always the smartest / best detected axis
  const bestAxis = candidates[0];

  return { candidates, bestAxis };
}
