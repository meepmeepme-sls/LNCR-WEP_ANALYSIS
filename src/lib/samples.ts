import { SampleModel } from '../types';

export const SAMPLE_MODELS: SampleModel[] = [
  {
    id: 'sample-av-bar',
    title: '6" Anti-Vertical Weapon Bar (Asymmetric Tooth)',
    filename: '6_inch_av_bar.step',
    weaponType: 'anti_vert_bar',
    weightClass: '3 lb Beetleweight',
    defaultMaterialId: 'steel',
    defaultAxis: {
      name: '⚡ Center of Mass (COM) - X-Axis',
      origin: { x: 0, y: 0, z: 0 },
      direction: { x: 1, y: 0, z: 0 },
      spinReversed: false,
    },
    defaultRpm: 9000,
    description: 'Heavy shock tool steel bar engineered to counter vertical spinners with an aggressive single bite.',
    url: './samples/6_inch_av_bar.step',
  },
  {
    id: 'sample-hubmotor-drum',
    title: '1lb Hubmotor Drum Assembly (25 Bodies)',
    filename: 'hubmotor_drum.step',
    weaponType: 'beater_bar',
    weightClass: '1 lb Antweight',
    defaultMaterialId: 'steel',
    defaultAxis: {
      name: '⚡ Center of Mass (COM) - X-Axis',
      origin: { x: -31.45, y: -41.52, z: 57.26 },
      direction: { x: 1, y: 0, z: 0 },
      spinReversed: false,
    },
    defaultRpm: 14000,
    description: 'Full multi-solid assembly of a direct-drive hubmotor drum weapon with teeth, magnets, bearings, and axle.',
    url: './samples/hubmotor_drum.step',
  },
];
