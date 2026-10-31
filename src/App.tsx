import React, { useEffect, useState } from 'react';
import {
  AxisConfig,
  MaterialPreset,
  MeshBodyData,
  SampleModel,
  Vector3D,
  WeaponAnalysisResult,
} from './types';
import { MATERIAL_PRESETS } from './lib/materials';
import { SAMPLE_MODELS } from './lib/samples';
import { loadStepFileAsync } from './lib/stepLoader';
import { analyzeWeaponAssembly } from './lib/inertiaCalculator';
import { WeaponClassification } from './lib/eigensolver';
import { DetectedBore } from './lib/boreDetector';
import { Viewer3D } from './components/Viewer3D';
import { AxisControls } from './components/AxisControls';
import { MaterialSelector } from './components/MaterialSelector';
import { MetricsPanel } from './components/MetricsPanel';
import { Header } from './components/Header';
import { HelpModal } from './components/HelpModal';
import { ExportReportModal } from './components/ExportReportModal';
import {
  AlertCircle,
  CheckCircle,
  Compass,
  Crosshair,
  Disc,
  Drum,
  Gauge,
  Layers,
  Loader2,
  RotateCw,
  Shield,
  Sparkles,
  UploadCloud,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const App: React.FC = () => {
  // App state
  const [bodies, setBodies] = useState<MeshBodyData[]>([]);
  const [material, setMaterial] = useState<MaterialPreset>(MATERIAL_PRESETS[0]); // AR500
  const [axis, setAxis] = useState<AxisConfig>({
    name: 'Z-Axis (Origin)',
    origin: { x: 0, y: 0, z: 0 },
    direction: { x: 0, y: 0, z: 1 },
    spinReversed: false,
  });
  const [defaultAxes, setDefaultAxes] = useState<AxisConfig[]>([]);
  const [bestAxis, setBestAxis] = useState<AxisConfig | null>(null);
  const [classification, setClassification] = useState<WeaponClassification | null>(null);
  const [detectedBores, setDetectedBores] = useState<DetectedBore[]>([]);
  const [targetRpm, setTargetRpm] = useState<number>(10000);
  const [analysis, setAnalysis] = useState<WeaponAnalysisResult | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'metrics' | 'axis' | 'material'>('metrics');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStage, setLoadingStage] = useState<string>('Initializing WebAssembly CAD Engine...');
  const [loadingPercent, setLoadingPercent] = useState<number>(10);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentFilename, setCurrentFilename] = useState<string>('6_inch_bar_v4hub.step');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Load initial sample model on startup
  useEffect(() => {
    loadSample(SAMPLE_MODELS[0]);
  }, []);

  // Recalculate analysis whenever bodies, material, axis, or target RPM changes
  useEffect(() => {
    if (bodies.length === 0) {
      setAnalysis(null);
      return;
    }

    const densityGPerMm3 = material.densityGPerCm3 / 1000.0;

    // Scale bodies to the currently selected material density
    const updatedBodies = bodies.map((b) => {
      const vol = b.volumeMm3;
      const mass = vol * densityGPerMm3;
      const currentDensity = b.massGrams / b.volumeMm3 || 0.00785;
      const scale = densityGPerMm3 / currentDensity;

      return {
        ...b,
        massGrams: mass,
        inertiaCom: {
          Ixx: b.inertiaCom.Ixx * scale,
          Iyy: b.inertiaCom.Iyy * scale,
          Izz: b.inertiaCom.Izz * scale,
          Ixy: b.inertiaCom.Ixy * scale,
          Iyz: b.inertiaCom.Iyz * scale,
          Izx: b.inertiaCom.Izx * scale,
        },
      };
    });

    const result = analyzeWeaponAssembly(updatedBodies, axis, targetRpm);
    setAnalysis(result);
  }, [bodies, material, axis, targetRpm]);

  // Load a STEP file from File object
  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setLoadingStage(`Parsing STEP file: ${file.name}...`);
      setLoadingPercent(15);

      const densityGPerMm3 = material.densityGPerCm3 / 1000.0;
      const result = await loadStepFileAsync(
        file,
        densityGPerMm3,
        targetRpm,
        (stage, percent) => {
          setLoadingStage(stage);
          setLoadingPercent(percent);
        }
      );

      setCurrentFilename(result.filename);
      setBodies(result.bodies);
      setDefaultAxes(result.detectedAxes);
      setBestAxis(result.bestAxis);
      setAxis(result.bestAxis);
      setClassification(result.classification);
      setDetectedBores(result.bores);
      setAnalysis(result.analysis);

      setIsLoading(false);

      // Micro-confetti on successful CAD load
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (err: any) {
      console.error(err);
      setIsLoading(false);
      setErrorMessage(err.message || 'Failed to parse STEP file. Please ensure it is a valid 3D solid model.');
    }
  };

  // Load a pre-packaged sample model
  const loadSample = async (sample: SampleModel) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setLoadingStage(`Loading ${sample.title}...`);
      setLoadingPercent(20);

      const mat = MATERIAL_PRESETS.find((m) => m.id === sample.defaultMaterialId) || MATERIAL_PRESETS[0];
      setMaterial(mat);
      setTargetRpm(sample.defaultRpm);

      const densityGPerMm3 = mat.densityGPerCm3 / 1000.0;
      const result = await loadStepFileAsync(
        sample.url,
        densityGPerMm3,
        sample.defaultRpm,
        (stage, percent) => {
          setLoadingStage(stage);
          setLoadingPercent(percent);
        }
      );

      setCurrentFilename(result.filename);
      setBodies(result.bodies);
      setDefaultAxes(result.detectedAxes);
      setBestAxis(result.bestAxis);
      setAxis(sample.defaultAxis || result.bestAxis);
      setClassification(result.classification);
      setDetectedBores(result.bores);
      setAnalysis(result.analysis);

      setIsLoading(false);
    } catch (err: any) {
      console.error(err);
      setIsLoading(false);
      setErrorMessage(err.message || 'Failed to load sample model.');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.step') || file.name.toLowerCase().endsWith('.stp')) {
        handleFileUpload(file);
      } else {
        setErrorMessage('Please upload a .step or .stp CAD file.');
      }
    }
  };

  const handleAxisOriginChange = (newOrigin: Vector3D) => {
    setAxis((prev) => ({
      ...prev,
      origin: newOrigin,
      name: 'Custom Picked Point',
    }));
  };

  const resetToBestAxis = () => {
    if (bestAxis) {
      setAxis(bestAxis);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950"
    >
      {/* App Header */}
      <Header
        onFileUpload={handleFileUpload}
        onSampleSelect={loadSample}
        isLoading={isLoading}
        currentFilename={currentFilename}
        onOpenHelp={() => setIsHelpOpen(true)}
        onExportReport={() => setIsExportOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3D Viewport (7 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-[520px] lg:h-auto min-h-[460px] relative">
          <Viewer3D
            bodies={bodies}
            material={material}
            axis={axis}
            analysis={analysis}
            onAxisOriginChange={handleAxisOriginChange}
            targetRpm={targetRpm}
          />

          {/* Auto-Detection Status Floating Badge */}
          {classification && !isLoading && (
            <div className="absolute top-14 left-3 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/40 shadow-xl text-xs">
              {classification.type === 'planar_blade_disc' ? (
                <Disc size={14} className="text-cyan-400" />
              ) : (
                <Drum size={14} className="text-amber-400" />
              )}
              <span className="font-semibold text-slate-200">
                {classification.type === 'planar_blade_disc' ? 'Planar Blade / Disc' : 'Drum / Beater Bar'}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-cyan-300 truncate max-w-[200px]" title={axis.name}>
                {axis.name}
              </span>
              {bestAxis && axis !== bestAxis && (
                <button
                  onClick={resetToBestAxis}
                  className="ml-1 text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/40 flex items-center gap-1 font-medium"
                  title="Snap back to automatically detected weapon axle"
                >
                  <Crosshair size={10} />
                  <span>Auto Snap</span>
                </button>
              )}
            </div>
          )}

          {/* Drag and Drop Visual Overlay */}
          {isDragOver && (
            <div className="absolute inset-0 z-30 bg-cyan-950/80 backdrop-blur-md rounded-xl border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-none">
              <UploadCloud size={48} className="text-cyan-400 mb-2 animate-bounce" />
              <p className="text-lg font-bold text-white">Drop .STEP File Here</p>
              <p className="text-xs text-cyan-300">Automatic axis finding & browser-side MOI calculation</p>
            </div>
          )}

          {/* Loading Indicator with Progress Bar */}
          {isLoading && (
            <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-6 text-center">
              <Loader2 size={38} className="text-cyan-400 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-100">{loadingStage}</p>
              <div className="w-56 bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-cyan-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${loadingPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-mono">{loadingPercent}% complete</p>
            </div>
          )}
        </div>

        {/* Right Column: Controls & Metrics Tabs (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-950/50 border border-rose-500/50 p-3 rounded-xl flex items-start gap-2.5 text-xs text-rose-200">
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Calculation Error</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'metrics'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gauge size={14} />
              <span>MOI & Dynamics</span>
            </button>

            <button
              onClick={() => setActiveTab('axis')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'axis'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass size={14} />
              <span>Rotation Axis</span>
            </button>

            <button
              onClick={() => setActiveTab('material')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'material'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield size={14} />
              <span>Material</span>
            </button>
          </div>

          {/* Active Tab Content */}
          <div className="flex-1">
            {activeTab === 'metrics' && (
              <MetricsPanel
                analysis={analysis}
                targetRpm={targetRpm}
                onTargetRpmChange={setTargetRpm}
              />
            )}

            {activeTab === 'axis' && (
              <AxisControls
                axis={axis}
                onAxisChange={setAxis}
                analysis={analysis}
                defaultAxes={defaultAxes}
              />
            )}

            {activeTab === 'material' && (
              <MaterialSelector
                material={material}
                onMaterialChange={setMaterial}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-3 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Late Night Combat Robotics · Engineered for BattleBots, NHRL & Robot Combat Builders
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-500">Free Cloudflare Pages Ready</span>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="hover:text-cyan-400 underline transition-colors"
            >
              Documentation & Physics
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        analysis={analysis}
        material={material}
        axis={axis}
        filename={currentFilename}
      />
    </div>
  );
};
