import {
  AxisConfig,
  InertiaTensor,
  MeshBodyData,
  MOIUnit,
  Vector3D,
  WeaponAnalysisResult,
} from '../types';

/**
 * Calculates volume, centroid, and inertia tensor for a triangular surface mesh
 * using polyhedral integration (Divergence Theorem over tetrahedra).
 *
 * Positions are expected in millimeters.
 * Density in g/mm^3 (e.g. steel = 0.00785 g/mm^3).
 */
export function computeBodyMassProperties(
  id: string,
  name: string,
  positions: Float32Array,
  indices: Uint32Array,
  densityGPerMm3: number,
  normals?: Float32Array
): MeshBodyData {
  let totalVolume = 0;
  let cx = 0, cy = 0, cz = 0;
  let int_x2 = 0, int_y2 = 0, int_z2 = 0;
  let int_xy = 0, int_yz = 0, int_zx = 0;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  const numTriangles = indices.length / 3;

  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;

    const x1 = positions[i0], y1 = positions[i0 + 1], z1 = positions[i0 + 2];
    const x2 = positions[i1], y2 = positions[i1 + 1], z2 = positions[i1 + 2];
    const x3 = positions[i2], y3 = positions[i2 + 1], z3 = positions[i2 + 2];

    // Track bounding box
    minX = Math.min(minX, x1, x2, x3);
    maxX = Math.max(maxX, x1, x2, x3);
    minY = Math.min(minY, y1, y2, y3);
    maxY = Math.max(maxY, y1, y2, y3);
    minZ = Math.min(minZ, z1, z2, z3);
    maxZ = Math.max(maxZ, z1, z2, z3);

    // Signed volume of tetrahedron formed by origin and triangle (v1, v2, v3)
    const det = x1 * (y2 * z3 - y3 * z2) -
                y1 * (x2 * z3 - x3 * z2) +
                z1 * (x2 * y3 - x3 * y2);
    const vTet = det / 6.0;

    totalVolume += vTet;

    // Centroid contribution
    cx += vTet * (x1 + x2 + x3) / 4.0;
    cy += vTet * (y1 + y2 + y3) / 4.0;
    cz += vTet * (z1 + z2 + z3) / 4.0;

    // Volume integrals of polynomials over tetrahedron
    int_x2 += (vTet / 10.0) * (x1*x1 + x2*x2 + x3*x3 + x1*x2 + x2*x3 + x3*x1);
    int_y2 += (vTet / 10.0) * (y1*y1 + y2*y2 + y3*y3 + y1*y2 + y2*y3 + y3*y1);
    int_z2 += (vTet / 10.0) * (z1*z1 + z2*z2 + z3*z3 + z1*z2 + z2*z3 + z3*z1);

    int_xy += (vTet / 20.0) * (2*x1*y1 + 2*x2*y2 + 2*x3*y3 + x1*y2 + x2*y1 + x2*y3 + x3*y2 + x3*y1 + x1*y3);
    int_yz += (vTet / 20.0) * (2*y1*z1 + 2*y2*z2 + 2*y3*z3 + y1*z2 + y2*z1 + y2*z3 + y3*z2 + y3*z1 + y1*z3);
    int_zx += (vTet / 20.0) * (2*z1*x1 + 2*z2*x2 + 2*z3*x3 + z1*x2 + z2*x1 + z2*x3 + z3*x2 + z3*x1 + z1*x3);
  }

  // Handle triangle orientation (winding)
  const sign = totalVolume < 0 ? -1 : 1;
  const volMm3 = Math.abs(totalVolume);
  const massGrams = volMm3 * densityGPerMm3;

  const comX = volMm3 > 1e-9 ? (cx / totalVolume) : 0;
  const comY = volMm3 > 1e-9 ? (cy / totalVolume) : 0;
  const comZ = volMm3 > 1e-9 ? (cz / totalVolume) : 0;

  // Inertia tensor about origin in g * mm^2
  const Ixx_O = sign * densityGPerMm3 * (int_y2 + int_z2);
  const Iyy_O = sign * densityGPerMm3 * (int_x2 + int_z2);
  const Izz_O = sign * densityGPerMm3 * (int_x2 + int_y2);
  const Ixy_O = -sign * densityGPerMm3 * int_xy;
  const Iyz_O = -sign * densityGPerMm3 * int_yz;
  const Izx_O = -sign * densityGPerMm3 * int_zx;

  // Parallel axis theorem to transfer to body COM:
  const Ixx_com = Ixx_O - massGrams * (comY * comY + comZ * comZ);
  const Iyy_com = Iyy_O - massGrams * (comX * comX + comZ * comZ);
  const Izz_com = Izz_O - massGrams * (comX * comX + comY * comY);
  const Ixy_com = Ixy_O + massGrams * (comX * comY);
  const Iyz_com = Iyz_O + massGrams * (comY * comZ);
  const Izx_com = Izx_O + massGrams * (comZ * comX);

  return {
    id,
    name,
    positions,
    normals,
    indices,
    volumeMm3: volMm3,
    massGrams,
    centroid: { x: comX, y: comY, z: comZ },
    boundingBox: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
    },
    inertiaCom: {
      Ixx: Math.max(0, Ixx_com),
      Iyy: Math.max(0, Iyy_com),
      Izz: Math.max(0, Izz_com),
      Ixy: Ixy_com,
      Iyz: Iyz_com,
      Izx: Izx_com,
    },
  };
}

/**
 * Normalizes a 3D vector.
 */
export function normalizeVector(v: Vector3D): Vector3D {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 1e-9) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * Computes cross product of two vectors: a x b
 */
export function crossProduct(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/**
 * Computes full assembly mass properties, combined inertia tensor,
 * and moment of inertia about the user-selected rotation axis.
 */
export function analyzeWeaponAssembly(
  bodies: MeshBodyData[],
  axis: AxisConfig,
  targetRpm: number,
  motorTorqueNm = 1.2
): WeaponAnalysisResult {
  let totalVolumeMm3 = 0;
  let totalMassGrams = 0;
  let cxSum = 0, cySum = 0, czSum = 0;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const b of bodies) {
    totalVolumeMm3 += b.volumeMm3;
    totalMassGrams += b.massGrams;
    cxSum += b.massGrams * b.centroid.x;
    cySum += b.massGrams * b.centroid.y;
    czSum += b.massGrams * b.centroid.z;

    minX = Math.min(minX, b.boundingBox.min.x);
    minY = Math.min(minY, b.boundingBox.min.y);
    minZ = Math.min(minZ, b.boundingBox.min.z);
    maxX = Math.max(maxX, b.boundingBox.max.x);
    maxY = Math.max(maxY, b.boundingBox.max.y);
    maxZ = Math.max(maxZ, b.boundingBox.max.z);
  }

  const comX = totalMassGrams > 1e-9 ? cxSum / totalMassGrams : 0;
  const comY = totalMassGrams > 1e-9 ? cySum / totalMassGrams : 0;
  const comZ = totalMassGrams > 1e-9 ? czSum / totalMassGrams : 0;
  const globalCom: Vector3D = { x: comX, y: comY, z: comZ };

  // Combine inertia tensors about global COM
  let comIxx = 0, comIyy = 0, comIzz = 0;
  let comIxy = 0, comIyz = 0, comIzx = 0;

  for (const b of bodies) {
    // Distance from body COM to global COM
    const dx = b.centroid.x - comX;
    const dy = b.centroid.y - comY;
    const dz = b.centroid.z - comZ;

    // Parallel axis shift from body COM to global COM
    comIxx += b.inertiaCom.Ixx + b.massGrams * (dy * dy + dz * dz);
    comIyy += b.inertiaCom.Iyy + b.massGrams * (dx * dx + dz * dz);
    comIzz += b.inertiaCom.Izz + b.massGrams * (dx * dx + dy * dy);
    comIxy += b.inertiaCom.Ixy - b.massGrams * (dx * dy);
    comIyz += b.inertiaCom.Iyz - b.massGrams * (dy * dz);
    comIzx += b.inertiaCom.Izx - b.massGrams * (dz * dx);
  }

  // Combined inertia tensor about origin (0,0,0)
  const origIxx = comIxx + totalMassGrams * (comY * comY + comZ * comZ);
  const origIyy = comIyy + totalMassGrams * (comX * comX + comZ * comZ);
  const origIzz = comIzz + totalMassGrams * (comX * comX + comY * comY);
  const origIxy = comIxy - totalMassGrams * (comX * comY);
  const origIyz = comIyz - totalMassGrams * (comY * comZ);
  const origIzx = comIzx - totalMassGrams * (comZ * comX);

  const inertiaCom: InertiaTensor = {
    Ixx: Math.max(0, comIxx),
    Iyy: Math.max(0, comIyy),
    Izz: Math.max(0, comIzz),
    Ixy: comIxy,
    Iyz: comIyz,
    Izx: comIzx,
  };

  const inertiaOrigin: InertiaTensor = {
    Ixx: Math.max(0, origIxx),
    Iyy: Math.max(0, origIyy),
    Izz: Math.max(0, origIzz),
    Ixy: origIxy,
    Iyz: origIyz,
    Izx: origIzx,
  };

  // Rotation Axis unit vector
  const u = normalizeVector(axis.direction);
  const p = axis.origin;

  // Moment of Inertia about an arbitrary axis:
  // 1. Calculate MOI about parallel axis passing through global COM:
  //    I_com_axis = u^T * I_com * u
  const I_com_axis =
    u.x * (inertiaCom.Ixx * u.x + inertiaCom.Ixy * u.y + inertiaCom.Izx * u.z) +
    u.y * (inertiaCom.Ixy * u.x + inertiaCom.Iyy * u.y + inertiaCom.Iyz * u.z) +
    u.z * (inertiaCom.Izx * u.x + inertiaCom.Iyz * u.y + inertiaCom.Izz * u.z);

  // 2. Parallel axis distance from global COM to rotation axis line:
  // Vector from point P on axis to COM: d = C - P
  const dCom: Vector3D = {
    x: globalCom.x - p.x,
    y: globalCom.y - p.y,
    z: globalCom.z - p.z,
  };
  // Perpendicular distance is ||d x u||
  const dCrossU = crossProduct(dCom, u);
  const eccentricityMm = Math.sqrt(
    dCrossU.x * dCrossU.x + dCrossU.y * dCrossU.y + dCrossU.z * dCrossU.z
  );

  // MOI about specified rotation axis (g * mm^2):
  // I_axis = I_com_axis + M * (eccentricity)^2
  const moiAxis = Math.max(0, I_com_axis + totalMassGrams * (eccentricityMm * eccentricityMm));

  // Determine maximum tip reach / radius from rotation axis
  let maxTipRadiusMm = 0;
  for (const b of bodies) {
    const pos = b.positions;
    for (let i = 0; i < pos.length; i += 3) {
      const vx = pos[i] - p.x;
      const vy = pos[i + 1] - p.y;
      const vz = pos[i + 2] - p.z;
      // Perpendicular distance from vertex to axis line: ||(v - p) x u||
      const cx = vy * u.z - vz * u.y;
      const cy = vz * u.x - vx * u.z;
      const cz = vx * u.y - vy * u.x;
      const r = Math.sqrt(cx * cx + cy * cy + cz * cz);
      if (r > maxTipRadiusMm) {
        maxTipRadiusMm = r;
      }
    }
  }

  // Combat robotics dynamic parameters:
  const omega = (targetRpm * 2 * Math.PI) / 60; // rad/s

  // SI conversions:
  // 1 g * mm^2 = 1e-9 kg * m^2
  const moiAxisSi = moiAxis * 1e-9; // kg * m^2
  const massKg = totalMassGrams / 1000.0;
  const tipRadiusM = maxTipRadiusMm / 1000.0;

  // Kinetic Energy: 1/2 * I * omega^2 (Joules)
  const kineticEnergyJoules = 0.5 * moiAxisSi * (omega * omega);

  // Tip speed: omega * tipRadius (m/s)
  const tipSpeedMPerS = omega * tipRadiusM;
  const tipSpeedMph = tipSpeedMPerS * 2.236936;

  // Static unbalance radial force: F = M * e * omega^2 (Newtons)
  const eccentricityM = eccentricityMm / 1000.0;
  const radialImbalanceForceN = massKg * eccentricityM * (omega * omega);

  // Spin up time to 95% full RPM: t ~= 3 * (I * omega) / tau_motor
  // (Assuming typical BLDC motor torque curve)
  const spinUpTimeSec = motorTorqueNm > 1e-3
    ? Math.max(0.05, (3.0 * moiAxisSi * omega) / motorTorqueNm)
    : 0;

  const isStaticallyBalanced = eccentricityMm < 0.05; // Less than 50 microns

  return {
    totalVolumeMm3,
    totalMassGrams,
    centroid: globalCom,
    boundingBox: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
    },
    inertiaOrigin,
    inertiaCom,
    moiAxis,
    eccentricityMm,
    isStaticallyBalanced,
    radialImbalanceForceN,
    tipRadiusMm: maxTipRadiusMm,
    cuttingDiameterMm: maxTipRadiusMm * 2,
    targetRpm,
    angularVelocityRadS: omega,
    kineticEnergyJoules,
    tipSpeedMPerS,
    tipSpeedMph,
    spinUpTimeSec,
    bodies,
  };
}

/**
 * Converts Moment of Inertia from internal unit (g * mm^2) to target unit.
 */
export function convertMOI(valueG_Mm2: number, targetUnit: MOIUnit): number {
  switch (targetUnit) {
    case 'kg_m2':
      // 1 g * mm^2 = 1e-9 kg * m^2
      return valueG_Mm2 * 1e-9;
    case 'g_cm2':
      // 1 g * mm^2 = 0.01 g * cm^2
      return valueG_Mm2 * 0.01;
    case 'lb_in2':
      // 1 kg * m^2 = 3417.1718 lb * in^2
      return valueG_Mm2 * 1e-9 * 3417.17188;
    case 'oz_in2':
      // 1 lb * in^2 = 16 oz * in^2
      return valueG_Mm2 * 1e-9 * 3417.17188 * 16;
    case 'lb_ft2':
      // 1 lb * ft^2 = lb * in^2 / 144
      return (valueG_Mm2 * 1e-9 * 3417.17188) / 144.0;
    default:
      return valueG_Mm2 * 1e-9;
  }
}

/**
 * Format MOI value cleanly with adaptive engineering notation.
 */
export function formatMOI(valueG_Mm2: number, unit: MOIUnit): string {
  const converted = convertMOI(valueG_Mm2, unit);
  if (converted === 0) return '0.00';
  if (converted < 0.0001 || converted >= 1000000) {
    return converted.toExponential(4);
  }
  if (converted < 0.1) {
    return converted.toFixed(5);
  }
  if (converted < 10) {
    return converted.toFixed(3);
  }
  return converted.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}
