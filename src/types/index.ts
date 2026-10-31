export type MOIUnit = 'kg_m2' | 'g_cm2' | 'lb_in2' | 'oz_in2' | 'lb_ft2';
export type MassUnit = 'g' | 'kg' | 'lb' | 'oz';
export type LengthUnit = 'mm' | 'cm' | 'in';
export type SpeedUnit = 'mph' | 'm_s' | 'ft_s' | 'km_h';
export type EnergyUnit = 'J' | 'ft_lbf';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface AxisConfig {
  origin: Vector3D;       // A point on the axis (e.g. hole center or [0,0,0])
  direction: Vector3D;    // Unit vector indicating axis direction (e.g. [0, 0, 1])
  name: string;           // Descriptive label (e.g., 'Z-Axis (Origin)', 'Custom Shaft')
  spinReversed: boolean;  // False = CCW / Normal, True = CW / Reversed
}

export interface MaterialCategory {
  id: string;
  name: string;
}

export interface MaterialPreset {
  id: string;
  name: string;
  category: 'steel' | 'titanium' | 'aluminum' | 'plastic' | 'custom';
  densityGPerCm3: number; // Density in g/cm^3
  description: string;
  appearance: {
    color: string;
    metalness: number;
    roughness: number;
    opacity?: number;
    transparent?: boolean;
    clearcoat?: number;
  };
  isInfillAdjustable?: boolean;
  defaultInfill?: number; // 0 - 100 percentage
}

export interface MeshBodyData {
  id: string;
  name: string;
  positions: Float32Array;
  normals?: Float32Array;
  indices: Uint32Array;
  volumeMm3: number;
  massGrams: number;
  centroid: Vector3D;
  boundingBox: {
    min: Vector3D;
    max: Vector3D;
    size: Vector3D;
  };
  // Inertia tensor about this body's COM in g * mm^2
  inertiaCom: {
    Ixx: number;
    Iyy: number;
    Izz: number;
    Ixy: number;
    Iyz: number;
    Izx: number;
  };
}

export interface InertiaTensor {
  Ixx: number;
  Iyy: number;
  Izz: number;
  Ixy: number;
  Iyz: number;
  Izx: number;
}

export interface WeaponAnalysisResult {
  // Aggregate geometric properties
  totalVolumeMm3: number;
  totalMassGrams: number;
  centroid: Vector3D; // Global Center of Mass (mm)
  boundingBox: {
    min: Vector3D;
    max: Vector3D;
    size: Vector3D;
  };

  // Inertia Tensors (stored internally in g * mm^2)
  inertiaOrigin: InertiaTensor;
  inertiaCom: InertiaTensor;

  // Moment of Inertia about chosen rotation axis (g * mm^2)
  moiAxis: number;

  // Balance and eccentricity
  eccentricityMm: number; // Perpendicular distance from COM to axis
  isStaticallyBalanced: boolean;
  radialImbalanceForceN: number; // Centrifugal force at target RPM (Newtons)

  // Reach & Tip geometry
  tipRadiusMm: number;    // Maximum distance from rotation axis to any vertex
  cuttingDiameterMm: number; // 2 * tipRadiusMm

  // Dynamic parameters at target RPM
  targetRpm: number;
  angularVelocityRadS: number;
  kineticEnergyJoules: number;
  tipSpeedMPerS: number;
  tipSpeedMph: number;

  // Spin-up estimate
  spinUpTimeSec: number;

  // Individual bodies
  bodies: MeshBodyData[];
}

export interface SampleModel {
  id: string;
  title: string;
  filename: string;
  weaponType: 'spinner_bar' | 'anti_vert_bar' | 'beater_bar' | 'single_tooth_disc';
  weightClass: string;
  defaultMaterialId: string;
  defaultAxis: AxisConfig;
  defaultRpm: number;
  description: string;
  url: string;
}

export interface PowertrainConfig {
  cellCount: number; // 2S to 16S
  cellVoltage: number; // Volts per cell (default 3.7V nominal)
  motorKv: number; // Motor velocity constant (RPM/V)
  driver: number; // Driver pulley or gear (allows decimal)
  driven: number; // Driven pulley or gear (allows decimal)
}
