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
import { FruityDecor, FruityMySpaceBar } from './fruity/FruityDecor';
import { audioPlayer } from './fruity/audioEngine';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Compass,
  Crosshair,
  Disc,
  Drum,
  Gauge,
  Loader2,
  Maximize2,
  Minimize2,
  Moon,
  Settings2,
  Shield,
  Sparkles,
  Sun,
  UploadCloud,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const App: React.FC = () => {
  // Theme state: defaults to LIGHT mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Serious Mode state: toggles between clean engineering UI and 2000s Frutiger Aero aesthetic (defaults to serious mode)
  const [seriousMode, setSeriousMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('lncr_serious_mode');
    return saved === null ? true : saved === 'true';
  });

  const toggleSeriousMode = () => {
    setSeriousMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lncr_serious_mode', String(next));
      } catch {}
      if (next) {
        document.documentElement.classList.remove('fruity');
      } else {
        document.documentElement.classList.add('fruity');
      }
      return next;
    });
  };

  // Sync document class with seriousMode
  useEffect(() => {
    if (seriousMode) {
      document.documentElement.classList.remove('fruity');
    } else {
      document.documentElement.classList.add('fruity');
    }
  }, [seriousMode]);

  // Background audio: play Cipher in 2000s mode, pause in serious mode
  useEffect(() => {
    if (!seriousMode) {
      audioPlayer.play().catch(() => {});
    } else {
      audioPlayer.pause();
    }
  }, [seriousMode]);

  // App model & calculation state
  const [bodies, setBodies] = useState<MeshBodyData[]>([]);
  const [material, setMaterial] = useState<MaterialPreset>(MATERIAL_PRESETS[0]); // Steel (7.85 g/cm³)
  const [axis, setAxis] = useState<AxisConfig>({
    name: 'Center of Mass (COM)',
    origin: { x: 0, y: 0, z: 0 },
    direction: { x: 1, y: 0, z: 0 },
    spinReversed: false,
  });
  const [defaultAxes, setDefaultAxes] = useState<AxisConfig[]>([]);
  const [bestAxis, setBestAxis] = useState<AxisConfig | null>(null);
  const [classification, setClassification] = useState<WeaponClassification | null>(null);
  const [detectedBores, setDetectedBores] = useState<DetectedBore[]>([]);
  const [targetRpm, setTargetRpm] = useState<number>(9000);
  const [analysis, setAnalysis] = useState<WeaponAnalysisResult | null>(null);

  // UI tabs & windows
  const [activeTab, setActiveTab] = useState<'results' | 'setup'>('results');
  const [isSetupMinimized, setIsSetupMinimized] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStage, setLoadingStage] = useState<string>('Initializing WebAssembly CAD Engine...');
  const [loadingPercent, setLoadingPercent] = useState<number>(10);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentFilename, setCurrentFilename] = useState<string>('Blade_2.5-1.step');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Sync document class with isDarkMode
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    }
  }, [isDarkMode]);

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

  const resetToCenterOfMass = () => {
    if (!analysis) return;
    setAxis((prev) => ({
      ...prev,
      origin: {
        x: Math.round(analysis.centroid.x * 100) / 100,
        y: Math.round(analysis.centroid.y * 100) / 100,
        z: Math.round(analysis.centroid.z * 100) / 100,
      },
      name: '⚡ Center of Mass (COM)',
    }));
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-cyan-500 selection:text-white transition-colors duration-200"
    >
      {/* Frutiger Aero 2000s Atmosphere & Interactive Draggable Stickers */}
      <FruityDecor
        seriousMode={seriousMode}
        onToggleSeriousMode={toggleSeriousMode}
      />

      {/* App Header */}
      <Header
        onFileUpload={handleFileUpload}
        onSampleSelect={loadSample}
        isLoading={isLoading}
        currentFilename={currentFilename}
        onOpenHelp={() => setIsHelpOpen(true)}
        onExportReport={() => setIsExportOpen(true)}
      />

      {/* 2000s MySpace Profile Banner, Cipher Audio Player & Hit Counter */}
      <FruityMySpaceBar seriousMode={seriousMode} />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3D Viewport */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-[520px] lg:h-[640px] relative">
          <Viewer3D
            bodies={bodies}
            material={material}
            axis={axis}
            analysis={analysis}
            onAxisOriginChange={handleAxisOriginChange}
            onToggleSpinDirection={() => {
              setAxis((prev) => ({
                ...prev,
                spinReversed: !prev.spinReversed,
              }));
            }}
            targetRpm={targetRpm}
            isDarkMode={isDarkMode}
            is2000sMode={!seriousMode}
          />

          {/* Floating Weapon Classification & Center of Mass Badge */}
          {classification && !isLoading && (
            <div className="absolute top-14 left-3 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-cyan-500/40 shadow-md text-xs">
              {classification.type === 'planar_blade_disc' ? (
                <Disc size={14} className="text-cyan-600 dark:text-cyan-400" />
              ) : (
                <Drum size={14} className="text-amber-600 dark:text-amber-400" />
              )}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {classification.type === 'planar_blade_disc' ? 'Planar Blade / Disc' : 'Drum / Beater Bar'}
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-cyan-700 dark:text-cyan-300 font-semibold truncate max-w-[200px]" title={axis.name}>
                {axis.name}
              </span>
              <button
                onClick={resetToCenterOfMass}
                className="ml-1 text-[10px] px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 border border-emerald-300 dark:border-emerald-500/40 flex items-center gap-1 font-bold transition-colors"
                title="Snap rotation axis directly to Center of Mass"
              >
                <Crosshair size={10} />
                <span>Snap to COM</span>
              </button>
            </div>
          )}

          {/* Drag & Drop Visual Overlay */}
          {isDragOver && (
            <div className="absolute inset-0 z-30 bg-cyan-900/80 backdrop-blur-md rounded-2xl border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-none text-white">
              <UploadCloud size={48} className="text-cyan-300 mb-2 animate-bounce" />
              <p className="text-lg font-bold">Drop .STEP File Here</p>
              <p className="text-xs text-cyan-200">Automatic Center of Mass axis finding & MOI calculation</p>
            </div>
          )}

          {/* Loading Indicator with Progress Bar */}
          {isLoading && (
            <div className="absolute inset-0 z-30 bg-white/90 dark:bg-slate-950/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center">
              <Loader2 size={38} className="text-cyan-600 dark:text-cyan-400 animate-spin mb-3" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{loadingStage}</p>
              <div className="w-56 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-cyan-600 dark:bg-cyan-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${loadingPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">{loadingPercent}% complete</p>
            </div>
          )}
        </div>

        {/* Right Column: Unified Setup & Results Dashboard */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-3.5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/50 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 shadow-xs">
              <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block mb-0.5">Calculation Error</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Tab Navigation: "Results" and "Setup" */}
          <div className="flex items-center p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-semibold shadow-xs">
            <button
              onClick={() => setActiveTab('results')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'results'
                  ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold shadow-md shadow-cyan-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Gauge size={14} />
              <span>Results & Dynamics</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('setup');
                setIsSetupMinimized(false);
              }}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'setup'
                  ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold shadow-md shadow-cyan-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Settings2 size={14} />
              <span>Setup (Axis & Material)</span>
            </button>
          </div>

          {/* Tab 1: RESULTS TAB */}
          {activeTab === 'results' && (
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm transition-colors duration-200">
              <MetricsPanel
                analysis={analysis}
                targetRpm={targetRpm}
                onTargetRpmChange={setTargetRpm}
              />
            </div>
          )}

          {/* Tab 2: SETUP TAB (Minimizable Window) */}
          {activeTab === 'setup' && (
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200 overflow-hidden">
              {/* Setup Window Header with Minimize/Expand Toggle */}
              <div className="flex items-center justify-between p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Weapon Setup Window
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {isSetupMinimized ? 'Minimized' : 'Expanded'}
                  </span>
                  <button
                    onClick={() => setIsSetupMinimized(!isSetupMinimized)}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    title={isSetupMinimized ? 'Expand Setup Window' : 'Minimize Setup Window'}
                  >
                    {isSetupMinimized ? <ChevronDown size={16} /> : <Minimize2 size={15} />}
                  </button>
                </div>
              </div>

              {/* Minimized View Banner */}
              {isSetupMinimized ? (
                <div
                  onClick={() => setIsSetupMinimized(false)}
                  className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-semibold">
                      <Shield size={13} className="text-cyan-600 dark:text-cyan-400" />
                      <span>{material.name} ({material.densityGPerCm3.toFixed(2)} g/cm³)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      <Compass size={13} className="text-emerald-600 dark:text-emerald-400" />
                      <span>{axis.name}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSetupMinimized(false);
                    }}
                    className="px-2.5 py-1 bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 rounded-lg text-xs font-bold"
                  >
                    Expand +
                  </button>
                </div>
              ) : (
                /* Expanded Full Setup Content */
                <div className="p-4 space-y-6">
                  {/* Subsection 1: Rotation Axis & Shaft Alignment */}
                  <AxisControls
                    axis={axis}
                    onAxisChange={setAxis}
                    analysis={analysis}
                    defaultAxes={defaultAxes}
                  />

                  <div className="w-full h-[1px] bg-slate-200 dark:bg-slate-800" />

                  {/* Subsection 2: Material & Density */}
                  <MaterialSelector
                    material={material}
                    onMaterialChange={setMaterial}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer with Light/Dark Mode Toggle */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950/80 py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-slate-200">Late Night Combat Robotics</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>BattleBots, NHRL & Combat Robotics Tools</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline-block text-slate-400 dark:text-slate-500">Free Cloudflare Pages Ready</span>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="hover:text-cyan-600 dark:hover:text-cyan-400 underline font-medium transition-colors"
            >
              Docs & Math
            </button>

            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800" />

            {/* 2000s Mode (Cipher Anthem) Toggle */}
            <button
              onClick={toggleSeriousMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all shadow-xs cursor-pointer ${
                !seriousMode
                  ? 'bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 text-white font-extrabold border-cyan-400 shadow-md shadow-cyan-500/30'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold'
              }`}
              title={seriousMode ? 'Switch to 2000s Mode (Kevin MacLeod Cipher anthem & Frutiger Aero theme)' : 'Return to Serious Mode'}
            >
              <Sparkles size={14} className={!seriousMode ? 'text-yellow-300 animate-spin' : 'text-cyan-600 dark:text-cyan-400'} />
              <span>{!seriousMode ? '✨ 2000s Mode: ON 🎵' : '✨ 2000s Mode'}</span>
            </button>

            {/* Light / Dark Mode Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition-all shadow-xs cursor-pointer"
              title="Toggle Light / Dark Mode"
            >
              {isDarkMode ? (
                <>
                  <Sun size={14} className="text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon size={14} className="text-cyan-700" />
                  <span>Dark Mode</span>
                </>
              )}
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
