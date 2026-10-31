import { InertiaTensor, Vector3D } from '../types';
import { normalizeVector } from './inertiaCalculator';

export interface EigenResult {
  eigenvalue: number; // Principal moment of inertia (g * mm^2)
  vector: Vector3D;   // Orthonormal principal axis direction
}

export interface WeaponClassification {
  type: 'planar_blade_disc' | 'cylindrical_drum_beater' | 'general_3d';
  primaryRotationAxis: Vector3D;
  confidence: number;
  reason: string;
}

/**
 * Robust 3x3 symmetric matrix eigensolver using Jacobi cyclic rotations.
 * Guaranteed to converge in ~10-20 iterations for real symmetric positive-definite inertia tensors.
 */
export function eigenSymmetric3x3(tensor: InertiaTensor): EigenResult[] {
  const A = [
    [tensor.Ixx, tensor.Ixy, tensor.Izx],
    [tensor.Ixy, tensor.Iyy, tensor.Iyz],
    [tensor.Izx, tensor.Iyz, tensor.Izz],
  ];

  let V = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  let d = [A[0][0], A[1][1], A[2][2]];
  let B = [
    [A[0][0], A[0][1], A[0][2]],
    [A[1][0], A[1][1], A[1][2]],
    [A[2][0], A[2][1], A[2][2]],
  ];

  for (let iter = 0; iter < 50; iter++) {
    // Find largest off-diagonal element
    let maxOff = 0;
    let p = 0;
    let q = 1;

    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        if (Math.abs(B[i][j]) > maxOff) {
          maxOff = Math.abs(B[i][j]);
          p = i;
          q = j;
        }
      }
    }

    if (maxOff < 1e-10) break; // Converged

    const diff = d[q] - d[p];
    let t: number;
    if (Math.abs(B[p][q]) < 1e-12) {
      t = 0;
    } else {
      const phi = diff / (2.0 * B[p][q]);
      t = 1.0 / (Math.abs(phi) + Math.sqrt(phi * phi + 1.0));
      if (phi < 0) t = -t;
    }

    const c = 1.0 / Math.sqrt(t * t + 1.0);
    const s = t * c;
    const tau = s / (1.0 + c);
    const h = t * B[p][q];

    d[p] -= h;
    d[q] += h;
    B[p][q] = 0;

    for (let j = 0; j < 3; j++) {
      if (j !== p && j !== q) {
        const g = B[Math.min(j, p)][Math.max(j, p)];
        const h2 = B[Math.min(j, q)][Math.max(j, q)];
        const bp = g - s * (h2 + g * tau);
        const bq = h2 + s * (g - h2 * tau);
        B[Math.min(j, p)][Math.max(j, p)] = bp;
        B[Math.min(j, q)][Math.max(j, q)] = bq;
      }
    }

    for (let j = 0; j < 3; j++) {
      const g = V[j][p];
      const h2 = V[j][q];
      V[j][p] = g - s * (h2 + g * tau);
      V[j][q] = h2 + s * (g - h2 * tau);
    }
  }

  // Sort by eigenvalue ascending: lambda_1 <= lambda_2 <= lambda_3
  const indices = [0, 1, 2].sort((i, j) => d[i] - d[j]);

  return indices.map((i) => {
    const rawVec = { x: V[0][i], y: V[1][i], z: V[2][i] };
    // Standardize vector orientation so primary component is positive
    const maxComp = Math.max(Math.abs(rawVec.x), Math.abs(rawVec.y), Math.abs(rawVec.z));
    let sign = 1;
    if (Math.abs(rawVec.x) === maxComp && rawVec.x < 0) sign = -1;
    else if (Math.abs(rawVec.y) === maxComp && rawVec.y < 0) sign = -1;
    else if (Math.abs(rawVec.z) === maxComp && rawVec.z < 0) sign = -1;

    return {
      eigenvalue: Math.max(0, d[i]),
      vector: normalizeVector({
        x: rawVec.x * sign,
        y: rawVec.y * sign,
        z: rawVec.z * sign,
      }),
    };
  });
}

/**
 * Classifies weapon geometry and determines the most likely rotation axis
 * based on principal moments of inertia and bounding box dimensions.
 */
export function classifyWeaponType(
  eigenResults: EigenResult[],
  boundingBoxSize: Vector3D
): WeaponClassification {
  const l1 = eigenResults[0].eigenvalue; // Min MOI
  const l2 = eigenResults[1].eigenvalue; // Mid MOI
  const l3 = eigenResults[2].eigenvalue; // Max MOI

  const v1 = eigenResults[0].vector; // Axis of min MOI
  const v3 = eigenResults[2].vector; // Axis of max MOI

  // Check dimensions
  const dims = [boundingBoxSize.x, boundingBoxSize.y, boundingBoxSize.z].sort((a, b) => a - b);
  const minDim = dims[0];
  const maxDim = dims[2];
  const isThinPlate = minDim < maxDim * 0.35; // e.g. 0.25in thick blade vs 6in diameter

  // Perpendicular Axis Theorem for flat plates: I_normal ≈ I_1 + I_2
  const planarDifference = Math.abs(l3 - (l1 + l2)) / Math.max(1, l3);

  if (isThinPlate || planarDifference < 0.25) {
    // Planar spinning blade or disc (rotates about normal to plate)
    return {
      type: 'planar_blade_disc',
      primaryRotationAxis: v3, // Maximum principal axis is normal to the disc/blade
      confidence: 0.95,
      reason: 'Planar blade/disc geometry: rotation axis is normal to plate (maximum MOI axis)',
    };
  }

  // Cylindrical drum / beater bar: rotates along cylinder lengthwise axis (minimum MOI axis)
  if (l1 < l2 * 0.75) {
    return {
      type: 'cylindrical_drum_beater',
      primaryRotationAxis: v1, // Minimum principal axis is longitudinal cylinder centerline
      confidence: 0.9,
      reason: 'Cylindrical drum/beater geometry: rotation axis is cylinder centerline (minimum MOI axis)',
    };
  }

  // Fallback: Default to maximum inertia axis (safest for vertical/horizontal discs)
  return {
    type: 'general_3d',
    primaryRotationAxis: v3,
    confidence: 0.75,
    reason: 'Primary principal inertia axis (maximum MOI)',
  };
}
