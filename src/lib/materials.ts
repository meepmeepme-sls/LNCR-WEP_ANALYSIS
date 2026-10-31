import { MaterialPreset } from '../types';

export const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    id: 'ar500',
    name: 'AR500 Armor Steel',
    category: 'steel',
    densityGPerCm3: 7.85,
    description: 'High-hardness abrasion-resistant steel. Standard for combat robot weapon teeth & spinner bars.',
    appearance: {
      color: '#475569',
      metalness: 0.85,
      roughness: 0.35,
    },
  },
  {
    id: 's7',
    name: 'S7 Shock Tool Steel',
    category: 'steel',
    densityGPerCm3: 7.83,
    description: 'Shock-resistant tool steel. Exceptional toughness against high-energy kinetic impacts.',
    appearance: {
      color: '#334155',
      metalness: 0.88,
      roughness: 0.3,
    },
  },
  {
    id: '4140',
    name: '4140 Chromoly Steel',
    category: 'steel',
    densityGPerCm3: 7.85,
    description: 'High-strength chromium-molybdenum alloy steel. Widely used for weapon shafts and beater bars.',
    appearance: {
      color: '#64748b',
      metalness: 0.8,
      roughness: 0.4,
    },
  },
  {
    id: 'mild_steel',
    name: 'Mild Steel (A36 / 1018)',
    category: 'steel',
    densityGPerCm3: 7.85,
    description: 'Standard structural carbon steel. Easy to machine and weld, economical prototype material.',
    appearance: {
      color: '#94a3b8',
      metalness: 0.75,
      roughness: 0.45,
    },
  },
  {
    id: 'ti_gr5',
    name: 'Titanium Grade 5 (Ti-6Al-4V)',
    category: 'titanium',
    densityGPerCm3: 4.43,
    description: 'Premier combat robotics metal. ~40% lighter than steel with comparable yield strength.',
    appearance: {
      color: '#93c5fd',
      metalness: 0.9,
      roughness: 0.25,
    },
  },
  {
    id: 'ti_gr2',
    name: 'Titanium Grade 2 (CP Ti)',
    category: 'titanium',
    densityGPerCm3: 4.51,
    description: 'Commercially pure titanium. Highly corrosion resistant, moderate strength.',
    appearance: {
      color: '#bfdbfe',
      metalness: 0.85,
      roughness: 0.3,
    },
  },
  {
    id: 'al_7075',
    name: 'Aluminum 7075-T6',
    category: 'aluminum',
    densityGPerCm3: 2.81,
    description: 'High-strength zinc alloy aluminum. Comparable yield to mild steel at 1/3 the weight.',
    appearance: {
      color: '#e2e8f0',
      metalness: 0.85,
      roughness: 0.2,
    },
  },
  {
    id: 'al_6061',
    name: 'Aluminum 6061-T6',
    category: 'aluminum',
    densityGPerCm3: 2.70,
    description: 'Ubiquitous structural aluminum. Great machinability, commonly used for weapon hubs & pulleys.',
    appearance: {
      color: '#cbd5e1',
      metalness: 0.75,
      roughness: 0.35,
    },
  },
  {
    id: 'polycarbonate',
    name: 'Polycarbonate (Lexan)',
    category: 'plastic',
    densityGPerCm3: 1.20,
    description: 'Extreme impact-resistant transparent thermoplastic. Standard for arena walls and robot armor.',
    appearance: {
      color: '#e0f2fe',
      metalness: 0.1,
      roughness: 0.1,
      opacity: 0.75,
      transparent: true,
      clearcoat: 1.0,
    },
  },
  {
    id: 'uhmw',
    name: 'UHMW-PE',
    category: 'plastic',
    densityGPerCm3: 0.94,
    description: 'Ultra-High Molecular Weight Polyethylene. Extremely slick, floats on water, great energy absorption.',
    appearance: {
      color: '#f8fafc',
      metalness: 0.05,
      roughness: 0.5,
    },
  },
  {
    id: 'tpu_95a',
    name: 'TPU 95A (3D Printed)',
    category: 'plastic',
    densityGPerCm3: 1.21,
    description: 'Thermoplastic Polyurethane. Elastic, virtually indestructible in ant/beetleweight classes.',
    appearance: {
      color: '#f97316',
      metalness: 0.1,
      roughness: 0.6,
    },
    isInfillAdjustable: true,
    defaultInfill: 100,
  },
  {
    id: 'cf_nylon',
    name: 'CF-Nylon (Onyx / PA-CF)',
    category: 'plastic',
    densityGPerCm3: 1.15,
    description: 'Carbon-fiber chopped filled polyamide. Rigid, lightweight, matte black finish.',
    appearance: {
      color: '#1e293b',
      metalness: 0.2,
      roughness: 0.7,
    },
    isInfillAdjustable: true,
    defaultInfill: 100,
  },
  {
    id: 'custom',
    name: 'Custom Material',
    category: 'custom',
    densityGPerCm3: 7.85,
    description: 'Define your own exact material density in g/cm³ or lb/in³.',
    appearance: {
      color: '#a855f7',
      metalness: 0.7,
      roughness: 0.3,
    },
  },
];

export const DENSITY_CONVERSIONS = {
  // Convert g/cm^3 to other units
  toLbPerIn3: (gPerCm3: number) => gPerCm3 * 0.0361273,
  toKgPerM3: (gPerCm3: number) => gPerCm3 * 1000,
  toGPerMm3: (gPerCm3: number) => gPerCm3 / 1000,

  // Convert other units to g/cm^3
  fromLbPerIn3: (lbPerIn3: number) => lbPerIn3 / 0.0361273,
  fromKgPerM3: (kgPerM3: number) => kgPerM3 / 1000,
};
