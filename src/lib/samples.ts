import { SampleModel } from '../types';

export const SAMPLE_MODELS: SampleModel[] = [
  {
    id: 'sample-6in-bar',
    title: '6" Beetleweight Spinner Bar (Symmetric)',
    filename: '6_inch_bar_v4hub.step',
    weaponType: 'spinner_bar',
    weightClass: '3 lb Beetleweight',
    defaultMaterialId: 'ar500',
    defaultAxis: {
      name: 'Central Shaft Bore',
      origin: { x: -5.86, y: 74.20, z: 47.50 },
      direction: { x: 1, y: 0, z: 0 },
      spinReversed: false,
    },
    defaultRpm: 10000,
    description: 'Real combat robotics 6-inch double-ended impact blade with central 4-bolt hub mount.',
    url: './samples/6_inch_bar_v4hub.step',
  },
  {
    id: 'sample-av-bar',
    title: '6" Anti-Vertical Weapon Bar (Asymmetric)',
    filename: '6_inch_av_bar.step',
    weaponType: 'anti_vert_bar',
    weightClass: '3 lb Beetleweight',
    defaultMaterialId: 's7',
    defaultAxis: {
      name: 'Center Shaft',
      origin: { x: 0, y: 0, z: 0 },
      direction: { x: 1, y: 0, z: 0 },
      spinReversed: false,
    },
    defaultRpm: 9000,
    description: 'High impact tool steel bar designed to counter vertical spinners with aggressive single-bite geometry.',
    url: './samples/6_inch_av_bar.step',
  },
];
