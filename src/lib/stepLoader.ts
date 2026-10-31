import {
  AxisConfig,
  MeshBodyData,
  WeaponAnalysisResult,
} from '../types';
import { WeaponClassification } from './eigensolver';
import { DetectedBore } from './boreDetector';

export interface StepParseResult {
  filename: string;
  bodies: MeshBodyData[];
  analysis: WeaponAnalysisResult;
  detectedAxes: AxisConfig[];
  bestAxis: AxisConfig;
  classification: WeaponClassification;
  bores: DetectedBore[];
}

export type ProgressCallback = (stage: string, percent: number) => void;

let activeWorker: Worker | null = null;

function getWorker(): Worker {
  if (!activeWorker) {
    activeWorker = new Worker(
      new URL('../workers/cadWorker.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return activeWorker;
}

/**
 * Loads a STEP (.step or .stp) file using a background Web Worker,
 * preventing UI thread freezing and providing live progress updates.
 */
export async function loadStepFileAsync(
  source: File | ArrayBuffer | string,
  densityGPerMm3: number = 0.00785,
  targetRpm: number = 10000,
  onProgress?: ProgressCallback
): Promise<StepParseResult> {
  let buffer: ArrayBuffer;
  let filename = 'model.step';

  if (typeof source === 'string') {
    filename = source.split('/').pop() || 'model.step';
    onProgress?.(`Fetching ${filename}...`, 10);
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to download model from ${source} (Status: ${response.status})`);
    }
    buffer = await response.arrayBuffer();
  } else if (source instanceof File) {
    filename = source.name;
    onProgress?.(`Reading ${filename}...`, 10);
    buffer = await source.arrayBuffer();
  } else {
    buffer = source;
  }

  // Check file header to verify it's a STEP file
  const headerCheck = new Uint8Array(buffer.slice(0, 512));
  const headerStr = String.fromCharCode(...headerCheck);
  if (!headerStr.includes('ISO-10303-21') && !headerStr.includes('STEP')) {
    throw new Error(
      `"${filename}" does not appear to be a standard ISO-10303 STEP file. Please verify the file extension and export format.`
    );
  }

  return new Promise((resolve, reject) => {
    try {
      const worker = getWorker();

      const handleMessage = (e: MessageEvent) => {
        const data = e.data;
        if (data.type === 'PROGRESS') {
          onProgress?.(data.stage, data.percent);
        } else if (data.type === 'SUCCESS') {
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          resolve({
            filename: data.filename,
            bodies: data.bodies,
            analysis: data.analysis,
            detectedAxes: data.detectedAxes,
            bestAxis: data.bestAxis,
            classification: data.classification,
            bores: data.bores,
          });
        } else if (data.type === 'ERROR') {
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          reject(new Error(data.message));
        }
      };

      const handleError = (err: ErrorEvent) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        reject(new Error(`Worker thread error: ${err.message}`));
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      // Post buffer to worker with zero-copy transfer
      worker.postMessage(
        {
          buffer,
          filename,
          densityGPerMm3,
          targetRpm,
        },
        [buffer]
      );
    } catch (err: any) {
      reject(new Error(`Failed to initialize Web Worker: ${err.message}`));
    }
  });
}
