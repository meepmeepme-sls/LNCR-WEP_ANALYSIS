import React, { useEffect, useState } from 'react';
import {
  MOIUnit,
  WeaponAnalysisResult,
} from '../types';
import { convertMOI, formatMOI } from '../lib/inertiaCalculator';
import {
  AlertTriangle,
  Battery,
  BatteryCharging,
  CheckCircle2,
  Cog,
  Copy,
  Cpu,
  Gauge,
  Maximize,
  Scale,
  Sliders,
  Table,
  Zap,
} from 'lucide-react';

interface MetricsPanelProps {
  analysis: WeaponAnalysisResult | null;
  targetRpm: number;
  onTargetRpmChange: (rpm: number) => void;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  analysis,
  targetRpm,
  onTargetRpmChange,
}) => {
  const [moiUnit, setMoiUnit] = useState<MOIUnit>('lb_in2');
  const [copiedMoi, setCopiedMoi] = useState<boolean>(false);
  const [showTensor, setShowTensor] = useState<boolean>(false);

  // Speed Input Mode: 'direct' vs 'powertrain'
  const [speedInputMode, setSpeedInputMode] = useState<'direct' | 'powertrain'>('direct');

  // Powertrain Parameters
  const [cellCount, setCellCount] = useState<number>(4); // Range: 2S to 16S
  const [cellVoltageMode, setCellVoltageMode] = useState<'nominal' | 'charged'>('nominal');
  const [motorKv, setMotorKv] = useState<number>(2200);
  const [driverTeeth, setDriverTeeth] = useState<number>(15);
  const [drivenTeeth, setDrivenTeeth] = useState<number>(45);

  const cellVoltage = cellVoltageMode === 'nominal' ? 3.7 : 4.2;
  const totalBatteryVoltage = cellCount * cellVoltage;
  const driverVal = Math.max(0.001, driverTeeth || 1);
  const drivenVal = Math.max(0.001, drivenTeeth || 1);
  const reductionRatio = drivenVal / driverVal;
  const motorNoLoadRpm = Math.round(totalBatteryVoltage * motorKv);
  const calculatedWeaponRpm = Math.max(100, Math.round(motorNoLoadRpm / reductionRatio));

  // Sync calculated RPM when powertrain parameters change while in powertrain mode
  useEffect(() => {
    if (speedInputMode === 'powertrain') {
      onTargetRpmChange(calculatedWeaponRpm);
    }
  }, [cellCount, cellVoltageMode, motorKv, driverTeeth, drivenTeeth, speedInputMode]);

  if (!analysis) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        <Gauge className="mx-auto text-slate-400 dark:text-slate-600 mb-3" size={32} />
        <p className="text-sm font-medium">Upload a .STEP file to calculate weapon MOI & dynamics.</p>
      </div>
    );
  }

  const moiValue = analysis.moiAxis;
  const formattedMoi = formatMOI(moiValue, moiUnit);

  const copyMoiToClipboard = () => {
    const rawVal = convertMOI(moiValue, moiUnit);
    navigator.clipboard.writeText(`${rawVal.toFixed(6)} ${moiUnit.replace('_', '·')}`);
    setCopiedMoi(true);
    setTimeout(() => setCopiedMoi(false), 2000);
  };

  const massGrams = analysis.totalMassGrams;
  const massOz = massGrams * 0.035274;
  const massLb = massGrams * 0.00220462;

  const energyJoules = analysis.kineticEnergyJoules;
  const energyFtLbs = energyJoules * 0.737562;

  const tipSpeedMph = analysis.tipSpeedMph;
  const tipSpeedMPerS = analysis.tipSpeedMPerS;
  const isOver250Mph = tipSpeedMph > 250;

  const tipRadiusIn = analysis.tipRadiusMm / 25.4;
  const cuttingDiameterIn = analysis.cuttingDiameterMm / 25.4;

  const radialForceN = analysis.radialImbalanceForceN;
  const radialForceLbf = radialForceN * 0.224809;

  const getEnergyBenchmark = (joules: number) => {
    if (joules < 15) return { label: 'Fairyweight (150g)', color: 'text-slate-500 dark:text-slate-400' };
    if (joules < 100) return { label: 'Antweight (1 lb)', color: 'text-cyan-700 dark:text-cyan-400' };
    if (joules < 600) return { label: 'Beetleweight (3 lb)', color: 'text-emerald-700 dark:text-emerald-400' };
    if (joules < 3000) return { label: 'Hobbyweight (12 lb)', color: 'text-amber-700 dark:text-amber-400' };
    if (joules < 12000) return { label: 'Featherweight (30 lb)', color: 'text-orange-700 dark:text-orange-400' };
    return { label: 'Heavyweight (250 lb)', color: 'text-rose-700 dark:text-rose-400' };
  };

  const benchmark = getEnergyBenchmark(energyJoules);

  // Available LiPo Cell counts: 2S to 16S
  const cellOptions = Array.from({ length: 15 }, (_, i) => i + 2); // 2 through 16

  return (
    <div className="space-y-3.5">
      {/* HERO STAT: MOMENT OF INERTIA */}
      <div className="bg-gradient-to-br from-cyan-50 via-white to-sky-50 dark:from-cyan-950/40 dark:via-slate-900 dark:to-slate-950 rounded-2xl p-4 border border-cyan-200 dark:border-cyan-500/30 shadow-sm relative overflow-hidden transition-colors duration-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-800 dark:text-cyan-400 uppercase tracking-wider">
            <Zap size={14} className="fill-current text-cyan-600 dark:text-cyan-400" />
            <span>Moment of Inertia (MOI, I<sub>axis</sub>)</span>
          </div>

          <button
            onClick={copyMoiToClipboard}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-xs font-medium transition-colors"
            title="Copy MOI value to clipboard"
          >
            {copiedMoi ? (
              <>
                <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Primary Value Display */}
        <div className="flex items-baseline gap-2 my-1">
          <span className="font-mono text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            {formattedMoi}
          </span>
          <span className="font-mono text-cyan-700 dark:text-cyan-400 font-bold text-sm">
            {moiUnit === 'lb_in2' && 'lb·in²'}
            {moiUnit === 'oz_in2' && 'oz·in²'}
            {moiUnit === 'kg_m2' && 'kg·m²'}
            {moiUnit === 'g_cm2' && 'g·cm²'}
            {moiUnit === 'lb_ft2' && 'lb·ft²'}
          </span>
        </div>

        {/* Quick Unit Selector */}
        <div className="flex items-center gap-1.5 mt-3">
          {(
            [
              { id: 'lb_in2', label: 'lb·in²' },
              { id: 'oz_in2', label: 'oz·in²' },
              { id: 'kg_m2', label: 'kg·m² (SI)' },
              { id: 'g_cm2', label: 'g·cm²' },
            ] as const
          ).map((u) => (
            <button
              key={u.id}
              onClick={() => setMoiUnit(u.id)}
              className={`flex-1 py-1 px-1 text-center rounded-lg text-[11px] font-mono transition-colors font-medium ${
                moiUnit === u.id
                  ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {/* COMBAT DYNAMICS: SPEED, KINETIC ENERGY & TIP SPEED */}
      <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Gauge size={14} className="text-amber-600 dark:text-amber-400" />
            <span>Target Weapon Speed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-amber-700 dark:text-amber-400 font-extrabold text-sm">
              {targetRpm.toLocaleString()} RPM
            </span>
          </div>
        </div>

        {/* Mode Selector: Direct RPM vs Powertrain (Voltage / KV / Reduction) */}
        <div className="flex p-0.5 bg-slate-200/80 dark:bg-slate-900 rounded-xl text-[11px] font-semibold">
          <button
            onClick={() => setSpeedInputMode('direct')}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
              speedInputMode === 'direct'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sliders size={12} />
            <span>Direct RPM</span>
          </button>
          <button
            onClick={() => {
              setSpeedInputMode('powertrain');
              onTargetRpmChange(calculatedWeaponRpm);
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
              speedInputMode === 'powertrain'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BatteryCharging size={12} />
            <span>Powertrain (Voltage · KV · Ratio)</span>
          </button>
        </div>

        {/* DIRECT RPM ENTRY */}
        {speedInputMode === 'direct' && (
          <div className="space-y-2 pt-1 animate-fade-in">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1000"
                max="25000"
                step="250"
                value={targetRpm}
                onChange={(e) => onTargetRpmChange(parseInt(e.target.value) || 1000)}
                className="flex-1 accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="relative w-24">
                <input
                  type="number"
                  step="100"
                  min="100"
                  max="40000"
                  value={targetRpm}
                  onChange={(e) => onTargetRpmChange(Math.max(100, parseInt(e.target.value) || 0))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              {[5000, 8000, 10000, 12000, 16000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => onTargetRpmChange(preset)}
                  className={`flex-1 py-0.5 rounded-md text-[10px] font-mono transition-colors font-semibold ${
                    targetRpm === preset
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                      : 'bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {preset / 1000}k
                </button>
              ))}
            </div>
          </div>
        )}

        {/* POWERTRAIN ENTRY (Voltage: 2S-16S, KV, Driver / Driven reduction) */}
        {speedInputMode === 'powertrain' && (
          <div className="space-y-3 pt-1 animate-fade-in text-xs">
            {/* Voltage (2S to 16S) */}
            <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Battery size={13} className="text-cyan-600 dark:text-cyan-400" />
                  <span>Battery Voltage (2S – 16S)</span>
                </label>
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <button
                    onClick={() => setCellVoltageMode('nominal')}
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      cellVoltageMode === 'nominal'
                        ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Nominal voltage (3.7V/cell)"
                  >
                    3.7V Nom
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <button
                    onClick={() => setCellVoltageMode('charged')}
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      cellVoltageMode === 'charged'
                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Full charge voltage (4.2V/cell)"
                  >
                    4.2V Full
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={cellCount}
                  onChange={(e) => setCellCount(parseInt(e.target.value))}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {cellOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}S Battery — {(s * cellVoltage).toFixed(1)} Volts ({s === 3 ? '1lb Ant' : s === 4 ? '3lb Beetle' : s === 6 ? 'Feather' : s === 12 ? 'Heavyweight' : `${s} Cells`})
                    </option>
                  ))}
                </select>

                <div className="w-20 text-right font-mono font-extrabold text-cyan-700 dark:text-cyan-400 text-xs shrink-0">
                  {totalBatteryVoltage.toFixed(1)} V
                </div>
              </div>
            </div>

            {/* Motor KV Entry */}
            <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Cpu size={13} className="text-amber-600 dark:text-amber-400" />
                  <span>Motor KV (RPM per Volt)</span>
                </label>
                <span className="font-mono text-[10px] text-slate-500">
                  Motor Speed: {motorNoLoadRpm.toLocaleString()} RPM
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="10"
                  min="100"
                  max="10000"
                  value={motorKv}
                  onChange={(e) => setMotorKv(Math.max(1, parseInt(e.target.value) || 0))}
                  placeholder="2200"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Quick KV Presets */}
              <div className="flex items-center gap-1">
                {[1400, 1800, 2200, 2700, 3500].map((kv) => (
                  <button
                    key={kv}
                    type="button"
                    onClick={() => setMotorKv(kv)}
                    className={`flex-1 py-0.5 rounded text-[10px] font-mono transition-colors font-semibold ${
                      motorKv === kv
                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {kv}kv
                  </button>
                ))}
              </div>
            </div>

            {/* External Reduction Ratio (Driver & Driven fields with decimal input) */}
            <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Cog size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>External Reduction (Driver & Driven)</span>
                </label>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                  {reductionRatio.toFixed(2)}:1 Ratio
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">
                    Driver (Motor / Pinion)
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    value={driverTeeth}
                    onChange={(e) => setDriverTeeth(parseFloat(e.target.value) || 0)}
                    placeholder="15"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">
                    Driven (Weapon / Pulley)
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    value={drivenTeeth}
                    onChange={(e) => setDrivenTeeth(parseFloat(e.target.value) || 0)}
                    placeholder="45"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-0.5 flex justify-between font-mono">
                <span>Calculated Weapon Speed:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {calculatedWeaponRpm.toLocaleString()} RPM
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/60">
          <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
              <span>Kinetic Energy</span>
              <span className={`text-[10px] font-bold ${benchmark.color}`}>
                {benchmark.label}
              </span>
            </div>
            <div className="font-mono text-lg font-extrabold text-slate-950 dark:text-slate-100 mt-0.5">
              {energyJoules.toFixed(1)} <span className="text-xs font-normal text-slate-500">J</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {energyFtLbs.toFixed(1)} ft·lbf
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
              <span>Tip Speed</span>
              {isOver250Mph ? (
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                  <AlertTriangle size={10} /> &gt;250 MPH
                </span>
              ) : (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Within Limit</span>
              )}
            </div>
            <div className="font-mono text-lg font-extrabold text-slate-950 dark:text-slate-100 mt-0.5">
              {tipSpeedMph.toFixed(1)} <span className="text-xs font-normal text-slate-500">mph</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {tipSpeedMPerS.toFixed(1)} m/s ({((tipSpeedMph / 250) * 100).toFixed(0)}% limit)
            </div>
          </div>
        </div>
      </div>

      {/* WEAPON MASS & REACH */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80">
          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1 font-medium">
            <Scale size={13} className="text-cyan-600 dark:text-cyan-400" />
            <span>Total Weapon Mass</span>
          </div>
          <div className="font-mono text-base font-extrabold text-slate-950 dark:text-slate-100">
            {massLb.toFixed(3)} <span className="text-xs font-normal text-slate-500">lb</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex gap-2">
            <span>{massOz.toFixed(2)} oz</span>
            <span>·</span>
            <span>{massGrams.toFixed(1)} g</span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80">
          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1 font-medium">
            <Maximize size={13} className="text-pink-600 dark:text-pink-400" />
            <span>Cutting Diameter</span>
          </div>
          <div className="font-mono text-base font-extrabold text-slate-950 dark:text-slate-100">
            {cuttingDiameterIn.toFixed(2)} <span className="text-xs font-normal text-slate-500">in</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            R = {analysis.tipRadiusMm.toFixed(1)} mm ({tipRadiusIn.toFixed(2)}")
          </div>
        </div>
      </div>

      {/* STATIC BALANCE & BEARING VIBRATION */}
      <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">Dynamic & Static Balance</span>
          {analysis.isStaticallyBalanced ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 size={11} /> Balanced (e &lt; 0.05mm)
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30 flex items-center gap-1">
              <AlertTriangle size={11} /> Off-Center Imbalance
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
          <div className="text-slate-600 dark:text-slate-400">
            Eccentricity (e):{' '}
            <span className={`font-bold ${analysis.eccentricityMm > 0.05 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {analysis.eccentricityMm.toFixed(3)} mm
            </span>
          </div>
          <div className="text-slate-600 dark:text-slate-400">
            Bearing Force @ RPM:{' '}
            <span className={`font-bold ${radialForceLbf > 2 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
              {radialForceLbf.toFixed(1)} lbf
            </span>
          </div>
        </div>
      </div>

      {/* FULL INERTIA TENSOR DRAWER */}
      <div>
        <button
          onClick={() => setShowTensor(!showTensor)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/80 dark:hover:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-800 text-xs transition-colors font-medium"
        >
          <div className="flex items-center gap-1.5">
            <Table size={13} />
            <span>Full 3×3 Inertia Tensor (CAD / FEA Export)</span>
          </div>
          <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono font-bold">{showTensor ? 'Hide' : 'Show'}</span>
        </button>

        {showTensor && (
          <div className="mt-2 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-300 space-y-2 shadow-xs">
            <div className="text-[10px] text-slate-500">
              Inertia Tensor about Center of Mass (I<sub>com</sub>, g·mm²):
            </div>
            <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-center text-xs">
              <span className="text-cyan-700 dark:text-cyan-400 font-bold">{analysis.inertiaCom.Ixx.toFixed(0)}</span>
              <span className="text-slate-600 dark:text-slate-400">{analysis.inertiaCom.Ixy.toFixed(0)}</span>
              <span className="text-slate-600 dark:text-slate-400">{analysis.inertiaCom.Izx.toFixed(0)}</span>

              <span className="text-slate-600 dark:text-slate-400">{analysis.inertiaCom.Ixy.toFixed(0)}</span>
              <span className="text-cyan-700 dark:text-cyan-400 font-bold">{analysis.inertiaCom.Iyy.toFixed(0)}</span>
              <span className="text-slate-600 dark:text-slate-400">{analysis.inertiaCom.Iyz.toFixed(0)}</span>

              <span className="text-slate-600 dark:text-slate-400">{analysis.inertiaCom.Izx.toFixed(0)}</span>
              <span className="text-slate-600 dark:text-slate-400">{analysis.inertiaCom.Iyz.toFixed(0)}</span>
              <span className="text-cyan-700 dark:text-cyan-400 font-bold">{analysis.inertiaCom.Izz.toFixed(0)}</span>
            </div>
            <div className="text-[10px] text-slate-500 text-right">
              COM: [{analysis.centroid.x.toFixed(2)}, {analysis.centroid.y.toFixed(2)}, {analysis.centroid.z.toFixed(2)}] mm
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
