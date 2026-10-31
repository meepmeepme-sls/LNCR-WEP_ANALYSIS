import occtimportjs from 'occt-import-js';
import { AxisConfig, MeshBodyData } from '../types';
import { computeBodyMassProperties } from './inertiaCalculator';

// Cache the initialized occt instance
let occtPromise: Promise<any> | null = null;

export async function getOcctInstance() {
  if (!occtPromise) {
    occtPromise = occtimportjs({
      locateFile: (name: string) => {
        // Use relative URL so it works on Cloudflare Pages root or subfolder
        const baseUrl = import.meta.env.BASE_URL || '/';
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
        if (name.endsWith('.wasm')) {
          return `${cleanBase}occt-import-js.wasm`;
        }
        return `${cleanBase}${name}`;
      },
    });
  }
  return occtPromise;
}

export interface StepLoadResult {
  filename: string;
  bodies: MeshBodyData[];
  defaultAxes: AxisConfig[];
}

/**
 * Loads and parses a STEP (.step or .stp) file from an ArrayBuffer, File, or URL.
 */
export async function loadStepFile(
  source: File | ArrayBuffer | string,
  densityGPerMm3: number = 0.00785 // Default AR500 / Steel
): Promise<StepLoadResult> {
  let buffer: Uint8Array;
  let filename = 'model.step';

  if (typeof source === 'string') {
    filename = source.split('/').pop() || 'model.step';
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to download model from ${source} (Status: ${response.status})`);
    }
    const arrayBuf = await response.arrayBuffer();
    buffer = new Uint8Array(arrayBuf);
  } else if (source instanceof File) {
    filename = source.name;
    const arrayBuf = await source.arrayBuffer();
    buffer = new Uint8Array(arrayBuf);
  } else {
    buffer = new Uint8Array(source);
  }

  const occt = await getOcctInstance();

  // Read STEP file with millimeter units
  const result = occt.ReadStepFile(buffer, {
    linearUnit: 'millimeter',
    linearDeflectionType: 'bounding_box_ratio',
    linearDeflection: 0.001,
    angularDeflection: 0.1,
  });

  if (!result || !result.success || !result.meshes || result.meshes.length === 0) {
    throw new Error('Failed to parse STEP file. The file may be corrupt or contain non-solid geometry.');
  }

  const bodies: MeshBodyData[] = [];

  for (let idx = 0; idx < result.meshes.length; idx++) {
    const rawMesh = result.meshes[idx];
    const posArr = new Float32Array(rawMesh.attributes.position.array);
    const indArr = new Uint32Array(rawMesh.index.array);
    const normArr = rawMesh.attributes.normal?.array
      ? new Float32Array(rawMesh.attributes.normal.array)
      : undefined;

    const bodyName = rawMesh.name || `Solid Body ${idx + 1}`;
    const bodyData = computeBodyMassProperties(
      `body-${idx}`,
      bodyName,
      posArr,
      indArr,
      densityGPerMm3,
      normArr
    );

    bodies.push(bodyData);
  }

  // Calculate overall center of mass and bounding box to generate smart candidate rotation axes
  let totalMass = 0;
  let cx = 0, cy = 0, cz = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const b of bodies) {
    totalMass += b.massGrams;
    cx += b.massGrams * b.centroid.x;
    cy += b.massGrams * b.centroid.y;
    cz += b.massGrams * b.centroid.z;

    minX = Math.min(minX, b.boundingBox.min.x);
    minY = Math.min(minY, b.boundingBox.min.y);
    minZ = Math.min(minZ, b.boundingBox.min.z);
    maxX = Math.max(maxX, b.boundingBox.max.x);
    maxY = Math.max(maxY, b.boundingBox.max.y);
    maxZ = Math.max(maxZ, b.boundingBox.max.z);
  }

  const com = {
    x: totalMass > 0 ? cx / totalMass : 0,
    y: totalMass > 0 ? cy / totalMass : 0,
    z: totalMass > 0 ? cz / totalMass : 0,
  };

  const bbCenter = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2,
  };

  const size = {
    x: maxX - minX,
    y: maxY - minY,
    z: maxZ - minZ,
  };

  // Combat robotics weapons typically rotate around the thinnest dimension (for disc/blade)
  // or along the longest dimension (for beater bar/drum).
  // Let's identify the likely shaft axis:
  let primaryAxisDir = { x: 0, y: 0, z: 1 };
  if (size.z <= size.x && size.z <= size.y) {
    primaryAxisDir = { x: 0, y: 0, z: 1 }; // Flat disc/blade in XY plane spinning around Z
  } else if (size.y <= size.x && size.y <= size.z) {
    primaryAxisDir = { x: 0, y: 1, z: 0 }; // Flat disc/blade in XZ plane spinning around Y
  } else if (size.x <= size.y && size.x <= size.z) {
    primaryAxisDir = { x: 1, y: 0, z: 0 }; // Flat disc/blade in YZ plane spinning around X
  }

  const defaultAxes: AxisConfig[] = [
    {
      name: 'Origin (0,0,0) - Z Axis',
      origin: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 1 },
      spinReversed: false,
    },
    {
      name: 'Center of Mass - Z Axis',
      origin: { x: com.x, y: com.y, z: com.z },
      direction: { x: 0, y: 0, z: 1 },
      spinReversed: false,
    },
    {
      name: 'Bounding Box Center - Z Axis',
      origin: { x: bbCenter.x, y: bbCenter.y, z: bbCenter.z },
      direction: { x: 0, y: 0, z: 1 },
      spinReversed: false,
    },
    {
      name: 'Center of Mass - Y Axis',
      origin: { x: com.x, y: com.y, z: com.z },
      direction: { x: 0, y: 1, z: 0 },
      spinReversed: false,
    },
    {
      name: 'Center of Mass - X Axis',
      origin: { x: com.x, y: com.y, z: com.z },
      direction: { x: 1, y: 0, z: 0 },
      spinReversed: false,
    },
  ];

  return {
    filename,
    bodies,
    defaultAxes,
  };
}
