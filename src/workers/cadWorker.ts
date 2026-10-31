import occtimportjs from 'occt-import-js';
import {
  analyzeWeaponAssembly,
  computeBodyMassProperties,
} from '../lib/inertiaCalculator';
import {
  classifyWeaponType,
  eigenSymmetric3x3,
} from '../lib/eigensolver';
import {
  buildSmartAxisCandidates,
  detectCylindricalBores,
} from '../lib/boreDetector';
import { MeshBodyData } from '../types';

let occtInstance: any = null;

async function getOcct() {
  if (!occtInstance) {
    occtInstance = await occtimportjs({
      locateFile: (name: string) => {
        if (name.endsWith('.wasm')) {
          if (typeof self !== 'undefined' && self.location) {
            return new URL('occt-import-js.wasm', self.location.origin + '/').href;
          }
          return '/occt-import-js.wasm';
        }
        return name;
      },
    });
  }
  return occtInstance;
}

self.onmessage = async (e: MessageEvent) => {
  const { buffer, filename, densityGPerMm3 = 0.00785, targetRpm = 10000, motorTorqueNm = 1.2 } = e.data;

  try {
    self.postMessage({ type: 'PROGRESS', stage: 'Initializing CAD Engine (WASM)...', percent: 20 });

    const occt = await getOcct();

    self.postMessage({ type: 'PROGRESS', stage: `Reading 3D solid geometry (${filename})...`, percent: 40 });

    const uint8Buf = new Uint8Array(buffer);
    const result = occt.ReadStepFile(uint8Buf, {
      linearUnit: 'millimeter',
      linearDeflectionType: 'bounding_box_ratio',
      linearDeflection: 0.001,
      angularDeflection: 0.1,
    });

    if (!result || !result.success || !result.meshes || result.meshes.length === 0) {
      throw new Error(
        'Unable to parse STEP file. The file may be corrupt, empty, or contain non-solid wireframe geometry.'
      );
    }

    self.postMessage({
      type: 'PROGRESS',
      stage: `Processing ${result.meshes.length} body meshes & computing exact inertia tensors...`,
      percent: 65,
    });

    const bodies: MeshBodyData[] = [];
    const transferBuffers: ArrayBuffer[] = [];

    for (let idx = 0; idx < result.meshes.length; idx++) {
      const raw = result.meshes[idx];
      const pos = new Float32Array(raw.attributes.position.array);
      const ind = new Uint32Array(raw.index.array);
      const norm = raw.attributes.normal?.array
        ? new Float32Array(raw.attributes.normal.array)
        : undefined;

      const bodyData = computeBodyMassProperties(
        `body-${idx}`,
        raw.name || `Solid Body ${idx + 1}`,
        pos,
        ind,
        densityGPerMm3,
        norm
      );

      bodies.push(bodyData);
      transferBuffers.push(pos.buffer, ind.buffer);
      if (norm) transferBuffers.push(norm.buffer);
    }

    // Check for degenerate / zero volume model
    const totalVolume = bodies.reduce((acc, b) => acc + b.volumeMm3, 0);
    if (totalVolume < 1e-4) {
      throw new Error(
        'The uploaded model has zero solid volume. Please verify that your CAD model is an exported solid body (not open surfaces or zero-thickness sketches).'
      );
    }

    self.postMessage({ type: 'PROGRESS', stage: 'Solving principal inertia axes & scanning bores...', percent: 85 });

    // Step 1: Compute initial COM and combined inertia to run eigensolver
    const tempAxis = {
      name: 'Temp',
      origin: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 1 },
      spinReversed: false,
    };
    const preliminaryAnalysis = analyzeWeaponAssembly(bodies, tempAxis, targetRpm, motorTorqueNm);

    // Step 2: Eigendecomposition of inertia tensor at Center of Mass
    const eigenResults = eigenSymmetric3x3(preliminaryAnalysis.inertiaCom);
    const classification = classifyWeaponType(
      eigenResults,
      preliminaryAnalysis.boundingBox.size
    );

    // Step 3: Cylindrical bore detection
    const bores = detectCylindricalBores(
      bodies,
      preliminaryAnalysis.centroid,
      classification.primaryRotationAxis
    );

    // Step 4: Build prioritized smart candidate axes
    const bb = preliminaryAnalysis.boundingBox;
    const bbCenter = {
      x: (bb.min.x + bb.max.x) / 2,
      y: (bb.min.y + bb.max.y) / 2,
      z: (bb.min.z + bb.max.z) / 2,
    };

    const { candidates, bestAxis } = buildSmartAxisCandidates(
      preliminaryAnalysis.centroid,
      bbCenter,
      classification.primaryRotationAxis,
      classification.reason,
      bores
    );

    // Step 5: Final analysis using the best detected rotation axis
    const finalAnalysis = analyzeWeaponAssembly(bodies, bestAxis, targetRpm, motorTorqueNm);

    self.postMessage(
      {
        type: 'SUCCESS',
        filename,
        bodies,
        analysis: finalAnalysis,
        detectedAxes: candidates,
        bestAxis,
        classification,
        bores,
      },
      transferBuffers
    );
  } catch (err: any) {
    self.postMessage({
      type: 'ERROR',
      message: err.message || 'An unexpected error occurred while parsing the CAD model.',
    });
  }
};
