import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  AxisConfig,
  MaterialPreset,
  MeshBodyData,
  Vector3D,
  WeaponAnalysisResult,
} from '../types';
import {
  Camera,
  Compass,
  Crosshair,
  Maximize2,
  MousePointer,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';

interface Viewer3DProps {
  bodies: MeshBodyData[];
  material: MaterialPreset;
  axis: AxisConfig;
  analysis: WeaponAnalysisResult | null;
  onAxisOriginChange?: (origin: Vector3D) => void;
  targetRpm: number;
  isDarkMode: boolean;
}

export const Viewer3D: React.FC<Viewer3DProps> = ({
  bodies,
  material,
  axis,
  analysis,
  onAxisOriginChange,
  targetRpm,
  isDarkMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animation and view states
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [showTipCircle, setShowTipCircle] = useState<boolean>(true);
  const [showComMarker, setShowComMarker] = useState<boolean>(true);
  const [showAxisLine, setShowAxisLine] = useState<boolean>(true);
  const [isPickMode, setIsPickMode] = useState<boolean>(false);
  const [spinSpeedFactor, setSpinSpeedFactor] = useState<number>(1.0);

  // Live mutable refs to eliminate stale closure bugs in requestAnimationFrame
  const axisRef = useRef<AxisConfig>(axis);
  useEffect(() => {
    axisRef.current = axis;
  }, [axis]);

  const targetRpmRef = useRef<number>(targetRpm);
  useEffect(() => {
    targetRpmRef.current = targetRpm;
  }, [targetRpm]);

  const isPlayingRef = useRef<boolean>(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const spinSpeedFactorRef = useRef<number>(spinSpeedFactor);
  useEffect(() => {
    spinSpeedFactorRef.current = spinSpeedFactor;
  }, [spinSpeedFactor]);

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const weaponPivotRef = useRef<THREE.Group | null>(null);
  const weaponMeshGroupRef = useRef<THREE.Group | null>(null);
  const axisVisualsGroupRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // Orbit control state
  const isDraggingRef = useRef(false);
  const dragButtonRef = useRef(0);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const cameraSphericalRef = useRef({ radius: 250, theta: Math.PI / 4, phi: Math.PI / 3 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));

  // Initialize Scene, Camera, Renderer
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDarkMode ? '#090d16' : '#f1f5f9');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(200, 300, 250);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.9); // Cyan rim light
    dirLight2.position.set(-200, -100, -200);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xf59e0b, 0.4);
    dirLight3.position.set(100, -200, 100);
    scene.add(dirLight3);

    // Ground Grid
    const grid = new THREE.GridHelper(
      400,
      40,
      isDarkMode ? 0x1e293b : 0x94a3b8,
      isDarkMode ? 0x0f172a : 0xcbd5e1
    );
    grid.position.y = -60;
    scene.add(grid);
    gridHelperRef.current = grid;

    // SCENE GRAPH ARCHITECTURE:
    // scene
    //  └── weaponPivot (positioned at axis.origin)
    //        └── weaponMeshGroup (positioned at -axis.origin)
    //              └── meshes (in absolute CAD coordinates)
    //  └── axisVisualsGroup (fixed in world space, aligned with axle)
    const weaponPivot = new THREE.Group();
    scene.add(weaponPivot);
    weaponPivotRef.current = weaponPivot;

    const weaponMeshGroup = new THREE.Group();
    weaponPivot.add(weaponMeshGroup);
    weaponMeshGroupRef.current = weaponMeshGroup;

    const axisVisualsGroup = new THREE.Group();
    scene.add(axisVisualsGroup);
    axisVisualsGroupRef.current = axisVisualsGroup;

    const updateCamera = () => {
      const { radius, theta, phi } = cameraSphericalRef.current;
      const x = radius * Math.sin(phi) * Math.sin(theta) + cameraTargetRef.current.x;
      const y = radius * Math.cos(phi) + cameraTargetRef.current.y;
      const z = radius * Math.sin(phi) * Math.cos(theta) + cameraTargetRef.current.z;
      camera.position.set(x, y, z);
      camera.lookAt(cameraTargetRef.current);
    };
    updateCamera();

    // Render loop
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Spin the weapon around the specified axis if playing
      if (weaponPivotRef.current && isPlayingRef.current && targetRpmRef.current > 0) {
        const currAxis = axisRef.current;
        const visualSpeed = Math.min(30, (targetRpmRef.current / 2000) * 4) * spinSpeedFactorRef.current;
        const spinDirection = currAxis.spinReversed ? -1 : 1;
        const angleDelta = delta * visualSpeed * spinDirection;

        // Weapon axis vector
        const axisVec = new THREE.Vector3(
          currAxis.direction.x,
          currAxis.direction.y,
          currAxis.direction.z
        ).normalize();

        // Rotate weaponPivot on world axis: Since weaponPivot is placed at axis.origin,
        // it spins PRECISELY around the line passing through axis.origin in direction axisVec!
        weaponPivotRef.current.rotateOnWorldAxis(axisVec, angleDelta);
      }

      renderer.render(scene, camera);
    };
    animate(performance.now());

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update theme colors when isDarkMode changes
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.background = new THREE.Color(isDarkMode ? '#090d16' : '#f1f5f9');
    if (gridHelperRef.current && sceneRef.current) {
      sceneRef.current.remove(gridHelperRef.current);
      const grid = new THREE.GridHelper(
        400,
        40,
        isDarkMode ? 0x1e293b : 0x94a3b8,
        isDarkMode ? 0x0f172a : 0xcbd5e1
      );
      grid.position.y = -60;
      sceneRef.current.add(grid);
      gridHelperRef.current = grid;
    }
  }, [isDarkMode]);

  // Synchronize Pivot with Axis Origin
  useEffect(() => {
    if (!weaponPivotRef.current || !weaponMeshGroupRef.current) return;

    // Reset rotation when axis configuration changes to avoid angle drift
    weaponPivotRef.current.quaternion.set(0, 0, 0, 1);

    // Place weaponPivot directly at axis.origin
    weaponPivotRef.current.position.set(axis.origin.x, axis.origin.y, axis.origin.z);

    // Counter-shift weaponMeshGroup so vertices remain in original global CAD space
    weaponMeshGroupRef.current.position.set(-axis.origin.x, -axis.origin.y, -axis.origin.z);
  }, [axis.origin.x, axis.origin.y, axis.origin.z, axis.direction.x, axis.direction.y, axis.direction.z]);

  // Update Geometry and Material when bodies or material changes
  useEffect(() => {
    if (!weaponMeshGroupRef.current || !sceneRef.current) return;

    // Clear previous meshes
    while (weaponMeshGroupRef.current.children.length > 0) {
      const child = weaponMeshGroupRef.current.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      weaponMeshGroupRef.current.remove(child);
    }

    if (bodies.length === 0) return;

    const pbrMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(material.appearance.color),
      metalness: material.appearance.metalness ?? 0.8,
      roughness: material.appearance.roughness ?? 0.3,
      wireframe: showWireframe,
      transparent: material.appearance.transparent ?? false,
      opacity: material.appearance.opacity ?? 1.0,
      side: THREE.DoubleSide,
    });

    const box = new THREE.Box3();

    bodies.forEach((body) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(body.positions, 3));
      geometry.setIndex(new THREE.BufferAttribute(body.indices, 1));

      if (body.normals && body.normals.length > 0) {
        geometry.setAttribute('normal', new THREE.BufferAttribute(body.normals, 3));
      } else {
        geometry.computeVertexNormals();
      }

      const mesh = new THREE.Mesh(geometry, pbrMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { bodyId: body.id };
      weaponMeshGroupRef.current?.add(mesh);

      geometry.computeBoundingBox();
      if (geometry.boundingBox) {
        box.union(geometry.boundingBox);
      }
    });

    // Auto-fit camera on model load
    if (box.isEmpty() === false) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      cameraTargetRef.current.copy(center);
      cameraSphericalRef.current.radius = Math.max(120, maxDim * 2.2);

      if (cameraRef.current) {
        const { radius, theta, phi } = cameraSphericalRef.current;
        const x = radius * Math.sin(phi) * Math.sin(theta) + center.x;
        const y = radius * Math.cos(phi) + center.y;
        const z = radius * Math.sin(phi) * Math.cos(theta) + center.z;
        cameraRef.current.position.set(x, y, z);
        cameraRef.current.lookAt(center);
      }
    }
  }, [bodies, material, showWireframe]);

  // Update Visuals for Axis, Tip Radius Circle, and Center of Mass Marker
  useEffect(() => {
    if (!axisVisualsGroupRef.current || !sceneRef.current) return;

    while (axisVisualsGroupRef.current.children.length > 0) {
      const obj = axisVisualsGroupRef.current.children[0];
      axisVisualsGroupRef.current.remove(obj);
    }

    if (bodies.length === 0 || !analysis) return;

    const originVec = new THREE.Vector3(axis.origin.x, axis.origin.y, axis.origin.z);
    const dirVec = new THREE.Vector3(axis.direction.x, axis.direction.y, axis.direction.z).normalize();

    // 1. AXLE SHAFT
    if (showAxisLine) {
      const axleLength = Math.max(120, analysis.boundingBox.size.x, analysis.boundingBox.size.y, analysis.boundingBox.size.z) * 1.6;
      const axleRadius = 3.5;

      const axleGeom = new THREE.CylinderGeometry(axleRadius, axleRadius, axleLength, 32);
      const axleMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7, // Vibrant cyan axle
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x0369a1,
        emissiveIntensity: 0.35,
      });

      const axleMesh = new THREE.Mesh(axleGeom, axleMat);
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dirVec);
      axleMesh.quaternion.copy(quat);
      axleMesh.position.copy(originVec);
      axisVisualsGroupRef.current.add(axleMesh);

      // Bearing collars
      const collarGeom = new THREE.TorusGeometry(axleRadius + 1.2, 0.8, 16, 32);
      const collarMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const collar1 = new THREE.Mesh(collarGeom, collarMat);
      collar1.quaternion.copy(quat);
      collar1.position.copy(originVec).addScaledVector(dirVec, 25);
      axisVisualsGroupRef.current.add(collar1);

      const collar2 = new THREE.Mesh(collarGeom, collarMat);
      collar2.quaternion.copy(quat);
      collar2.position.copy(originVec).addScaledVector(dirVec, -25);
      axisVisualsGroupRef.current.add(collar2);

      // Infinite dashed reference line along axis
      const lineLen = axleLength * 2.5;
      const linePoints = [
        originVec.clone().addScaledVector(dirVec, -lineLen),
        originVec.clone().addScaledVector(dirVec, lineLen),
      ];
      const lineGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0x0284c7,
        dashSize: 4,
        gapSize: 3,
        opacity: 0.6,
        transparent: true,
      });
      const axisLine = new THREE.Line(lineGeom, lineMat);
      axisLine.computeLineDistances();
      axisVisualsGroupRef.current.add(axisLine);

      // Curved Rotational Direction Arrow
      const arrowRadius = 18;
      const curve = new THREE.EllipseCurve(
        0, 0,
        arrowRadius, arrowRadius,
        0, Math.PI * 1.5,
        axis.spinReversed,
        0
      );
      const arrowPoints = curve.getPoints(50);
      const arrowGeom = new THREE.BufferGeometry().setFromPoints(
        arrowPoints.map((p) => new THREE.Vector3(p.x, 0, p.y))
      );
      const arrowMat = new THREE.LineBasicMaterial({
        color: 0xeab308,
        linewidth: 2,
      });
      const spinArrow = new THREE.Line(arrowGeom, arrowMat);
      spinArrow.quaternion.copy(quat);
      spinArrow.position.copy(originVec).addScaledVector(dirVec, axleLength * 0.45);
      axisVisualsGroupRef.current.add(spinArrow);
    }

    // 2. TIP CUTTING PERIMETER CIRCLE
    if (showTipCircle && analysis.tipRadiusMm > 1) {
      const tipCurve = new THREE.EllipseCurve(
        0, 0,
        analysis.tipRadiusMm, analysis.tipRadiusMm,
        0, 2 * Math.PI,
        false, 0
      );
      const tipPoints = tipCurve.getPoints(96);
      const tipGeom = new THREE.BufferGeometry().setFromPoints(
        tipPoints.map((p) => new THREE.Vector3(p.x, 0, p.y))
      );
      const tipMat = new THREE.LineDashedMaterial({
        color: 0xdb2777,
        dashSize: 6,
        gapSize: 4,
        opacity: 0.8,
        transparent: true,
      });
      const tipCircle = new THREE.Line(tipGeom, tipMat);
      tipCircle.computeLineDistances();
      const up = new THREE.Vector3(0, 1, 0);
      tipCircle.quaternion.setFromUnitVectors(up, dirVec);
      tipCircle.position.copy(originVec);
      axisVisualsGroupRef.current.add(tipCircle);
    }

    // 3. CENTER OF MASS (COM) MARKER
    if (showComMarker && analysis.centroid) {
      const comPos = new THREE.Vector3(
        analysis.centroid.x,
        analysis.centroid.y,
        analysis.centroid.z
      );

      const comGeom = new THREE.SphereGeometry(3.5, 32, 32);
      const comMat = new THREE.MeshStandardMaterial({
        color: 0x16a34a,
        emissive: 0x15803d,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      });
      const comSphere = new THREE.Mesh(comGeom, comMat);
      comSphere.position.copy(comPos);
      axisVisualsGroupRef.current.add(comSphere);

      const ringGeom = new THREE.RingGeometry(5, 6, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x16a34a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.copy(comPos);
      axisVisualsGroupRef.current.add(ringMesh);

      // Imbalance Line if COM does not lie on axis
      if (analysis.eccentricityMm > 0.05) {
        const d = comPos.clone().sub(originVec);
        const projLength = d.dot(dirVec);
        const nearestAxisPoint = originVec.clone().addScaledVector(dirVec, projLength);

        const imbalanceLineGeom = new THREE.BufferGeometry().setFromPoints([
          comPos,
          nearestAxisPoint,
        ]);
        const imbalanceLineMat = new THREE.LineBasicMaterial({
          color: 0xdc2626,
          linewidth: 3,
        });
        const imbalanceLine = new THREE.Line(imbalanceLineGeom, imbalanceLineMat);
        axisVisualsGroupRef.current.add(imbalanceLine);
      }
    }
  }, [bodies, axis, analysis, showAxisLine, showTipCircle, showComMarker]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPickMode && onAxisOriginChange && cameraRef.current && sceneRef.current) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
      if (weaponMeshGroupRef.current) {
        const intersects = raycaster.intersectObjects(weaponMeshGroupRef.current.children, true);
        if (intersects.length > 0) {
          const point = intersects[0].point;
          onAxisOriginChange({
            x: Math.round(point.x * 100) / 100,
            y: Math.round(point.y * 100) / 100,
            z: Math.round(point.z * 100) / 100,
          });
          setIsPickMode(false);
          return;
        }
      }
    }

    isDraggingRef.current = true;
    dragButtonRef.current = e.button;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !cameraRef.current) return;

    const deltaX = e.clientX - prevMouseRef.current.x;
    const deltaY = e.clientY - prevMouseRef.current.y;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };

    if (dragButtonRef.current === 0) {
      cameraSphericalRef.current.theta -= deltaX * 0.008;
      cameraSphericalRef.current.phi = Math.max(
        0.05,
        Math.min(Math.PI - 0.05, cameraSphericalRef.current.phi - deltaY * 0.008)
      );
    } else if (dragButtonRef.current === 2) {
      const panSpeed = cameraSphericalRef.current.radius * 0.0015;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      cameraRef.current.matrix.extractBasis(right, up, new THREE.Vector3());

      cameraTargetRef.current.addScaledVector(right, -deltaX * panSpeed);
      cameraTargetRef.current.addScaledVector(up, deltaY * panSpeed);
    }

    const { radius, theta, phi } = cameraSphericalRef.current;
    const x = radius * Math.sin(phi) * Math.sin(theta) + cameraTargetRef.current.x;
    const y = radius * Math.cos(phi) + cameraTargetRef.current.y;
    const z = radius * Math.sin(phi) * Math.cos(theta) + cameraTargetRef.current.z;
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(cameraTargetRef.current);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!cameraRef.current) return;
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    cameraSphericalRef.current.radius = Math.max(
      10,
      Math.min(3000, cameraSphericalRef.current.radius * zoomFactor)
    );

    const { radius, theta, phi } = cameraSphericalRef.current;
    const x = radius * Math.sin(phi) * Math.sin(theta) + cameraTargetRef.current.x;
    const y = radius * Math.cos(phi) + cameraTargetRef.current.y;
    const z = radius * Math.sin(phi) * Math.cos(theta) + cameraTargetRef.current.z;
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(cameraTargetRef.current);
  };

  const setCameraView = (type: 'iso' | 'top' | 'front' | 'right') => {
    if (!cameraRef.current) return;
    if (type === 'iso') {
      cameraSphericalRef.current.theta = Math.PI / 4;
      cameraSphericalRef.current.phi = Math.PI / 3;
    } else if (type === 'top') {
      cameraSphericalRef.current.theta = 0;
      cameraSphericalRef.current.phi = 0.05;
    } else if (type === 'front') {
      cameraSphericalRef.current.theta = 0;
      cameraSphericalRef.current.phi = Math.PI / 2;
    } else if (type === 'right') {
      cameraSphericalRef.current.theta = Math.PI / 2;
      cameraSphericalRef.current.phi = Math.PI / 2;
    }

    const { radius, theta, phi } = cameraSphericalRef.current;
    const x = radius * Math.sin(phi) * Math.sin(theta) + cameraTargetRef.current.x;
    const y = radius * Math.cos(phi) + cameraTargetRef.current.y;
    const z = radius * Math.sin(phi) * Math.cos(theta) + cameraTargetRef.current.z;
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(cameraTargetRef.current);
  };

  const captureSnapshot = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `LNCR_Weapon_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[460px] bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg select-none transition-colors duration-200"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        onWheel={handleWheel}
        className={`w-full h-full block ${isPickMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      />

      {/* Top Floating View Controls */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-md text-xs text-slate-700 dark:text-slate-300">
        <button
          onClick={() => setCameraView('iso')}
          className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded font-medium transition-colors"
          title="Isometric View"
        >
          ISO
        </button>
        <button
          onClick={() => setCameraView('top')}
          className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded font-medium transition-colors"
          title="Top View"
        >
          Top
        </button>
        <button
          onClick={() => setCameraView('front')}
          className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded font-medium transition-colors"
          title="Front View"
        >
          Front
        </button>
        <button
          onClick={() => setCameraView('right')}
          className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded font-medium transition-colors"
          title="Right View"
        >
          Right
        </button>
        <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
        <button
          onClick={captureSnapshot}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
          title="Capture PNG Screenshot"
        >
          <Camera size={15} />
        </button>
      </div>

      {/* Top Right Visibility Toggles */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-md text-xs text-slate-700 dark:text-slate-300">
        <button
          onClick={() => setShowAxisLine(!showAxisLine)}
          className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
            showAxisLine
              ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/40 font-semibold'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
          }`}
          title="Toggle Rotation Axle"
        >
          <Zap size={13} />
          <span>Axle</span>
        </button>

        <button
          onClick={() => setShowComMarker(!showComMarker)}
          className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
            showComMarker
              ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40 font-semibold'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
          }`}
          title="Toggle Center of Mass Marker"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          <span>COM</span>
        </button>

        <button
          onClick={() => setShowTipCircle(!showTipCircle)}
          className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
            showTipCircle
              ? 'bg-pink-50 dark:bg-pink-500/20 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-500/40 font-semibold'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
          }`}
          title="Toggle Tip Sweep Perimeter"
        >
          <div className="w-2 h-2 rounded-full border border-pink-500 dark:border-pink-400" />
          <span>Tip Sweep</span>
        </button>

        <button
          onClick={() => setShowWireframe(!showWireframe)}
          className={`px-2 py-1 rounded transition-colors ${
            showWireframe
              ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/40 font-semibold'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
          }`}
          title="Toggle Wireframe"
        >
          Wireframe
        </button>
      </div>

      {/* Bottom Center Spin Animation Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-2xl">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2 rounded-xl font-medium transition-all flex items-center justify-center ${
            isPlaying
              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30'
              : 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 hover:bg-cyan-500'
          }`}
          title={isPlaying ? 'Pause Spin Animation' : 'Start Spin Animation'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="fill-current" />}
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
          <span className="font-mono text-cyan-700 dark:text-cyan-400 font-bold">{targetRpm.toLocaleString()} RPM</span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="text-slate-500 dark:text-slate-400">Preview:</span>
          <input
            type="range"
            min="0.2"
            max="3"
            step="0.1"
            value={spinSpeedFactor}
            onChange={(e) => setSpinSpeedFactor(parseFloat(e.target.value))}
            className="w-20 accent-cyan-600 dark:accent-cyan-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
            title="Adjust Visual Spin Animation Speed"
          />
        </div>

        {onAxisOriginChange && (
          <>
            <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700" />
            <button
              onClick={() => setIsPickMode(!isPickMode)}
              className={`px-3 py-1 text-xs rounded-xl transition-colors flex items-center gap-1.5 font-medium ${
                isPickMode
                  ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              title="Click anywhere on the 3D model to move the axle origin"
            >
              <MousePointer size={13} />
              <span>{isPickMode ? 'Click 3D Surface...' : 'Pick Axle Point'}</span>
            </button>
          </>
        )}
      </div>

      {/* Bottom Left Legend */}
      <div className="absolute bottom-3 left-3 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 pointer-events-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-600 dark:bg-cyan-400" />
          <span>Rotation Axle: [{axis.direction.x}, {axis.direction.y}, {axis.direction.z}]</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          <span>Center of Mass (COM)</span>
        </div>
        {analysis && analysis.eccentricityMm > 0.05 && (
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>Static Imbalance: {analysis.eccentricityMm.toFixed(2)} mm</span>
          </div>
        )}
      </div>
    </div>
  );
};
