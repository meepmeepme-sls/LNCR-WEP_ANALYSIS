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
import { loadStepFile } from './lib/stepLoader';
import { analyzeWeaponAssembly } from './lib/inertiaCalculator';
import { Viewer3D } from './components/Viewer3D';
import { AxisControls } from './components/AxisControls';
import { MaterialSelector } from './components/MaterialSelector';
import { MetricsPanel } from './components/MetricsPanel';
import { Header } from './components/Header';
import { HelpModal } from './components/HelpModal';
import { ExportReportModal } from './components/ExportReportModal';
import {
  AlertCircle,
  Compass,
  Gauge,
  Layers,
  Loader2,
  Shield,
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
  const [targetRpm, setTargetRpm] = useState<number>(10000);
  const [analysis, setAnalysis] = useState<WeaponAnalysisResult | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'metrics' | 'axis' | 'material'>('metrics');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('Initializing WebAssembly CAD Engine...');
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

    // Convert material density from g/cm^3 to g/mm^3
    const densityGPerMm3 = material.densityGPerCm3 / 1000.0;

    // Update bodies with new density
    const updatedBodies = bodies.map((b) => {
      const vol = b.volumeMm3;
      const mass = vol * densityGPerMm3;
      const scale = densityGPerMm3 / (b.massGrams / b.volumeMm3 || 0.00785);

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
      setLoadingMessage(`Parsing STEP file: ${file.name}...`);

      const densityGPerMm3 = material.densityGPerCm3 / 1000.0;
      const result = await loadStepFile(file, densityGPerMm3);

      setCurrentFilename(result.filename);
      setBodies(result.bodies);
      setDefaultAxes(result.defaultAxes);

      // Choose default axis
      if (result.defaultAxes.length > 0) {
        setAxis(result.defaultAxes[0]);
      }

      setIsLoading(false);

      // Celebratory micro-confetti on successful CAD load
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
      setLoadingMessage(`Loading ${sample.title}...`);

      const mat = MATERIAL_PRESETS.find((m) => m.id === sample.defaultMaterialId) || MATERIAL_PRESETS[0];
      setMaterial(mat);
      setTargetRpm(sample.defaultRpm);

      const densityGPerMm3 = mat.densityGPerCm3 / 1000.0;
      const result = await loadStepFile(sample.url, densityGPerMm3);

      setCurrentFilename(result.filename);
      setBodies(result.bodies);
      setDefaultAxes(result.defaultAxes);
      setAxis(sample.defaultAxis || result.defaultAxes[0]);

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

          {/* Drag and Drop Visual Overlay */}
          {isDragOver && (
            <div className="absolute inset-0 z-30 bg-cyan-950/80 backdrop-blur-md rounded-xl border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-none">
              <UploadCloud size={48} className="text-cyan-400 mb-2 animate-bounce" />
              <p className="text-lg font-bold text-white">Drop .STEP File Here</p>
              <p className="text-xs text-cyan-300">Instant browser-side MOI & dynamics calculation</p>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-6 text-center">
              <Loader2 size={36} className="text-cyan-400 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-100">{loadingMessage}</p>
              <p className="text-xs text-slate-400 mt-1">Extracting exact polyhedral boundary geometry...</p>
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
