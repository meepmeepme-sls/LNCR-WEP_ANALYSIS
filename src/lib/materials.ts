import { MaterialPreset } from '../types';

export const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    id: 'steel',
    name: 'Steel',
    category: 'steel',
    densityGPerCm3: 7.85,
    description: 'High-toughness combat robotics steel (AR400/500, S7 tool steel, 4140 chromoly, mild steel). Density: 7.85 g/cm³ (0.2836 lb/in³).',
    appearance: {
      color: '#475569',
      metalness: 0.85,
      roughness: 0.35,
    },
  },
  {
    id: 'al_6000',
    name: 'Aluminum 6000 Series Alloy',
    category: 'aluminum',
    densityGPerCm3: 2.70,
    description: 'Structural 6000-series aluminum (6061-T6). High machinability, standard for weapon hubs, pulleys, and beaters. Density: 2.70 g/cm³ (0.0975 lb/in³).',
    appearance: {
      color: '#cbd5e1',
      metalness: 0.8,
      roughness: 0.3,
    },
  },
  {
    id: 'ti_gr5',
    name: 'GR5 Titanium',
    category: 'titanium',
    densityGPerCm3: 4.43,
    description: 'Grade 5 Titanium (Ti-6Al-4V). Superior strength-to-weight ratio, ~40% lighter than steel. Density: 4.43 g/cm³ (0.1600 lb/in³).',
    appearance: {
      color: '#93c5fd',
      metalness: 0.9,
      roughness: 0.25,
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
