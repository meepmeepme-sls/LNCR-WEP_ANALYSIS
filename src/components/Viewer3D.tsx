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
  Eye,
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
}

export const Viewer3D: React.FC<Viewer3DProps> = ({
  bodies,
  material,
  axis,
  analysis,
  onAxisOriginChange,
  targetRpm,
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

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const weaponPivotRef = useRef<THREE.Group | null>(null);
  const weaponMeshGroupRef = useRef<THREE.Group | null>(null);
  const axisVisualsGroupRef = useRef<THREE.Group | null>(null);
  const tipCircleMeshRef = useRef<THREE.LineSegments | null>(null);
  const comMarkerGroupRef = useRef<THREE.Group | null>(null);

  // Orbit control state (manual lightweight implementation to avoid extra dependencies)
  const isDraggingRef = useRef(false);
  const dragButtonRef = useRef(0); // 0 = left (rotate), 2 = right (pan)
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const cameraSphericalRef = useRef({ radius: 250, theta: Math.PI / 4, phi: Math.PI / 3 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));

  // Initialize Scene, Camera, Renderer
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090d16');
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

    // Ambient and Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(200, 300, 250);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.8); // Cyan rim light
    dirLight2.position.set(-200, -100, -200);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xf59e0b, 0.4); // Warm fill
    dirLight3.position.set(100, -200, 100);
    scene.add(dirLight3);

    // Subtle Ground Grid
    const grid = new THREE.GridHelper(400, 40, 0x1e293b, 0x0f172a);
    grid.position.y = -60;
    scene.add(grid);

    // Root groups
    const weaponPivot = new THREE.Group();
    scene.add(weaponPivot);
    weaponPivotRef.current = weaponPivot;

    const weaponMeshGroup = new THREE.Group();
    weaponPivot.add(weaponMeshGroup);
    weaponMeshGroupRef.current = weaponMeshGroup;

    const axisVisualsGroup = new THREE.Group();
    scene.add(axisVisualsGroup);
    axisVisualsGroupRef.current = axisVisualsGroup;

    const comMarkerGroup = new THREE.Group();
    scene.add(comMarkerGroup);
    comMarkerGroupRef.current = comMarkerGroup;

    // Update camera position from spherical coordinates
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
      if (weaponMeshGroupRef.current && isPlaying && targetRpm > 0) {
        // Map target RPM (e.g. 10,000 RPM) to a visually readable rotation speed in browser
        // Base visual spin speed: 1 full rotation per 2 seconds * spinSpeedFactor
        const visualSpeed = Math.min(30, (targetRpm / 2000) * 4) * spinSpeedFactor;
        const spinDirection = axis.spinReversed ? -1 : 1;
        const angleDelta = delta * visualSpeed * spinDirection;

        // Apply rotation around the local axis vector
        const axisVec = new THREE.Vector3(axis.direction.x, axis.direction.y, axis.direction.z).normalize();
        weaponMeshGroupRef.current.rotateOnWorldAxis(axisVec, angleDelta);
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

    // Build PBR material
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

      // Expand bounding box
      geometry.computeBoundingBox();
      if (geometry.boundingBox) {
        box.union(geometry.boundingBox);
      }
    });

    // Auto-fit camera if first load
    if (box.isEmpty() === false) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      cameraTargetRef.current.copy(center);
      cameraSphericalRef.current.radius = Math.max(120, maxDim * 2.2);

      // Update camera position
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
    if (!axisVisualsGroupRef.current || !comMarkerGroupRef.current || !sceneRef.current) return;

    // Clear previous axis visuals
    while (axisVisualsGroupRef.current.children.length > 0) {
      const obj = axisVisualsGroupRef.current.children[0];
      axisVisualsGroupRef.current.remove(obj);
    }
    while (comMarkerGroupRef.current.children.length > 0) {
      const obj = comMarkerGroupRef.current.children[0];
      comMarkerGroupRef.current.remove(obj);
    }

    if (bodies.length === 0 || !analysis) return;

    const originVec = new THREE.Vector3(axis.origin.x, axis.origin.y, axis.origin.z);
    const dirVec = new THREE.Vector3(axis.direction.x, axis.direction.y, axis.direction.z).normalize();

    // 1. AXLE SHAFT (Physical cylinder representing the weapon axle)
    if (showAxisLine) {
      const axleLength = Math.max(100, analysis.boundingBox.size.x, analysis.boundingBox.size.y, analysis.boundingBox.size.z) * 1.5;
      const axleRadius = 3.5; // 7mm shaft preview

      const axleGeom = new THREE.CylinderGeometry(axleRadius, axleRadius, axleLength, 32);
      const axleMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8, // Neon cyan axle
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x0284c7,
        emissiveIntensity: 0.3,
      });

      const axleMesh = new THREE.Mesh(axleGeom, axleMat);
      // Align cylinder (Three.js cylinder defaults along Y axis) with dirVec
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dirVec);
      axleMesh.quaternion.copy(quat);
      axleMesh.position.copy(originVec);
      axisVisualsGroupRef.current.add(axleMesh);

      // Shaft bore bearing circles / collars
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
        color: 0x38bdf8,
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
        color: 0xfacc15, // Golden yellow spin direction
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
        color: 0xec4899, // Pink cutting disc perimeter
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

    // 3. CENTER OF MASS (COM) MARKER & ECCENTRICITY CONNECTOR
    if (showComMarker && analysis.centroid) {
      const comPos = new THREE.Vector3(
        analysis.centroid.x,
        analysis.centroid.y,
        analysis.centroid.z
      );

      // Glowing Neon Sphere at COM
      const comGeom = new THREE.SphereGeometry(3.5, 32, 32);
      const comMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e, // Bright green COM
        emissive: 0x16a34a,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const comSphere = new THREE.Mesh(comGeom, comMat);
      comSphere.position.copy(comPos);
      comMarkerGroupRef.current.add(comSphere);

      // Concentric target crosshairs around COM
      const ringGeom = new THREE.RingGeometry(5, 6, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.copy(comPos);
      comMarkerGroupRef.current.add(ringMesh);

      // If there is static eccentricity / imbalance, draw a prominent warning line from COM to rotation axis
      if (analysis.eccentricityMm > 0.05) {
        // Project COM onto axis line
        const d = comPos.clone().sub(originVec);
        const projLength = d.dot(dirVec);
        const nearestAxisPoint = originVec.clone().addScaledVector(dirVec, projLength);

        const imbalanceLineGeom = new THREE.BufferGeometry().setFromPoints([
          comPos,
          nearestAxisPoint,
        ]);
        const imbalanceLineMat = new THREE.LineBasicMaterial({
          color: 0xef4444, // Red warning line for dynamic imbalance
          linewidth: 3,
        });
        const imbalanceLine = new THREE.Line(imbalanceLineGeom, imbalanceLineMat);
        comMarkerGroupRef.current.add(imbalanceLine);
      }
    }
  }, [bodies, axis, analysis, showAxisLine, showTipCircle, showComMarker]);

  // Mouse Orbit, Pan, and Raycasting Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // If in pick mode, handle surface pick
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
      // Left click: Orbit rotate
      cameraSphericalRef.current.theta -= deltaX * 0.008;
      cameraSphericalRef.current.phi = Math.max(
        0.05,
        Math.min(Math.PI - 0.05, cameraSphericalRef.current.phi - deltaY * 0.008)
      );
    } else if (dragButtonRef.current === 2) {
      // Right click: Pan
      const panSpeed = cameraSphericalRef.current.radius * 0.0015;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      cameraRef.current.matrix.extractBasis(right, up, new THREE.Vector3());

      cameraTargetRef.current.addScaledVector(right, -deltaX * panSpeed);
      cameraTargetRef.current.addScaledVector(up, deltaY * panSpeed);
    }

    // Update camera position
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

  // Preset Views (Top, Front, Isometric)
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
      className="relative w-full h-full min-h-[460px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl select-none"
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
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2 py-1.5 rounded-lg border border-slate-700/60 shadow-lg text-xs text-slate-300">
        <button
          onClick={() => setCameraView('iso')}
          className="px-2 py-1 hover:bg-slate-800 rounded font-medium transition-colors"
          title="Isometric View"
        >
          ISO
        </button>
        <button
          onClick={() => setCameraView('top')}
          className="px-2 py-1 hover:bg-slate-800 rounded font-medium transition-colors"
          title="Top View"
        >
          Top
        </button>
        <button
          onClick={() => setCameraView('front')}
          className="px-2 py-1 hover:bg-slate-800 rounded font-medium transition-colors"
          title="Front View"
        >
          Front
        </button>
        <button
          onClick={() => setCameraView('right')}
          className="px-2 py-1 hover:bg-slate-800 rounded font-medium transition-colors"
          title="Right View"
        >
          Right
        </button>
        <div className="w-[1px] h-4 bg-slate-700 mx-1" />
        <button
          onClick={captureSnapshot}
          className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-cyan-400 transition-colors"
          title="Capture PNG Screenshot"
        >
          <Camera size={15} />
        </button>
      </div>

      {/* Top Right Visibility Toggles */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-900/80 backdrop-blur-md px-2 py-1.5 rounded-lg border border-slate-700/60 shadow-lg text-xs text-slate-300">
        <button
          onClick={() => setShowAxisLine(!showAxisLine)}
          className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
            showAxisLine ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'hover:bg-slate-800 text-slate-400'
          }`}
          title="Toggle Rotation Axle & Reference Line"
        >
          <Zap size={13} />
          <span>Axle</span>
        </button>

        <button
          onClick={() => setShowComMarker(!showComMarker)}
          className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
            showComMarker ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'hover:bg-slate-800 text-slate-400'
          }`}
          title="Toggle Center of Mass Marker"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>COM</span>
        </button>

        <button
          onClick={() => setShowTipCircle(!showTipCircle)}
          className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
            showTipCircle ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : 'hover:bg-slate-800 text-slate-400'
          }`}
          title="Toggle Tip Sweep Perimeter"
        >
          <div className="w-2 h-2 rounded-full border border-pink-400" />
          <span>Tip Sweep</span>
        </button>

        <button
          onClick={() => setShowWireframe(!showWireframe)}
          className={`px-2 py-1 rounded transition-colors ${
            showWireframe ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'hover:bg-slate-800 text-slate-400'
          }`}
          title="Toggle Wireframe"
        >
          Wireframe
        </button>
      </div>

      {/* Bottom Center Spin Animation Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/60 shadow-2xl">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2 rounded-lg font-medium transition-all flex items-center justify-center ${
            isPlaying
              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
              : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
          }`}
          title={isPlaying ? 'Pause Spin Animation' : 'Start Spin Animation'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="fill-current" />}
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="font-mono text-cyan-400 font-semibold">{targetRpm.toLocaleString()} RPM</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">Preview:</span>
          <input
            type="range"
            min="0.2"
            max="3"
            step="0.1"
            value={spinSpeedFactor}
            onChange={(e) => setSpinSpeedFactor(parseFloat(e.target.value))}
            className="w-20 accent-cyan-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            title="Adjust Visual Spin Animation Speed"
          />
        </div>

        {onAxisOriginChange && (
          <>
            <div className="w-[1px] h-5 bg-slate-700" />
            <button
              onClick={() => setIsPickMode(!isPickMode)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
                isPickMode
                  ? 'bg-cyan-500 text-slate-950 font-semibold animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
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
      <div className="absolute bottom-3 left-3 text-[11px] text-slate-400 space-y-0.5 pointer-events-none bg-slate-900/60 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Rotation Axle: [{axis.direction.x}, {axis.direction.y}, {axis.direction.z}]</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Center of Mass (COM)</span>
        </div>
        {analysis && analysis.eccentricityMm > 0.05 && (
          <div className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>Static Imbalance: {analysis.eccentricityMm.toFixed(2)} mm</span>
          </div>
        )}
      </div>
    </div>
  );
};
