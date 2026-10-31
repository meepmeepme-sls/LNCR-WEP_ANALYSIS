import React from 'react';
import { AxisConfig, Vector3D, WeaponAnalysisResult } from '../types';
import {
  Compass,
  Crosshair,
  Move,
  RotateCw,
} from 'lucide-react';

interface AxisControlsProps {
  axis: AxisConfig;
  onAxisChange: (newAxis: AxisConfig) => void;
  analysis: WeaponAnalysisResult | null;
  defaultAxes: AxisConfig[];
}

export const AxisControls: React.FC<AxisControlsProps> = ({
  axis,
  onAxisChange,
  analysis,
  defaultAxes,
}) => {
  const updateOriginCoord = (coord: 'x' | 'y' | 'z', value: number) => {
    onAxisChange({
      ...axis,
      origin: {
        ...axis.origin,
        [coord]: value,
      },
    });
  };

  const updateDirectionCoord = (coord: 'x' | 'y' | 'z', value: number) => {
    onAxisChange({
      ...axis,
      direction: {
        ...axis.direction,
        [coord]: value,
      },
    });
  };

  const setPureDirection = (dir: 'x' | 'y' | 'z') => {
    const vectors = {
      x: { x: 1, y: 0, z: 0 },
      y: { x: 0, y: 1, z: 0 },
      z: { x: 0, y: 0, z: 1 },
    };
    onAxisChange({
      ...axis,
      direction: vectors[dir],
      name: `Aligned to ${dir.toUpperCase()} Axis`,
    });
  };

  const centerOnCom = () => {
    if (!analysis) return;
    onAxisChange({
      ...axis,
      origin: {
        x: Math.round(analysis.centroid.x * 100) / 100,
        y: Math.round(analysis.centroid.y * 100) / 100,
        z: Math.round(analysis.centroid.z * 100) / 100,
      },
      name: 'Centered on Center of Mass (COM)',
    });
  };

  const centerOnBoundingBox = () => {
    if (!analysis) return;
    const bb = analysis.boundingBox;
    onAxisChange({
      ...axis,
      origin: {
        x: Math.round(((bb.min.x + bb.max.x) / 2) * 100) / 100,
        y: Math.round(((bb.min.y + bb.max.y) / 2) * 100) / 100,
        z: Math.round(((bb.min.z + bb.max.z) / 2) * 100) / 100,
      },
      name: 'Centered on Bounding Box',
    });
  };

  const resetToOrigin = () => {
    onAxisChange({
      ...axis,
      origin: { x: 0, y: 0, z: 0 },
      name: 'Origin (0,0,0)',
    });
  };

  const toggleReverseSpin = () => {
    onAxisChange({
      ...axis,
      spinReversed: !axis.spinReversed,
    });
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-xs uppercase tracking-wider">
          <Compass className="text-cyan-600 dark:text-cyan-400" size={16} />
          <span>Rotation Axis & Alignment</span>
        </div>
        <button
          onClick={toggleReverseSpin}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
            axis.spinReversed
              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
          }`}
          title="Toggle Clockwise / Counter-Clockwise Rotation"
        >
          <RotateCw size={12} className={axis.spinReversed ? 'rotate-180' : ''} />
          <span>{axis.spinReversed ? 'CW (Reversed)' : 'CCW (Normal)'}</span>
        </button>
      </div>

      {/* Axis Preset Chips */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
          Axis Presets
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {defaultAxes.slice(0, 4).map((preset, idx) => (
            <button
              key={idx}
              onClick={() => onAxisChange(preset)}
              className="px-2.5 py-1.5 text-xs text-left truncate rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:border-cyan-500 transition-colors font-medium"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Alignment Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={centerOnCom}
          className="flex-1 py-1.5 px-2 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
          title="Center axis on Center of Mass (zero static imbalance)"
        >
          <Crosshair size={12} />
          <span>Center on COM</span>
        </button>
        <button
          onClick={centerOnBoundingBox}
          className="flex-1 py-1.5 px-2 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
          title="Center axis on CAD bounding box center"
        >
          <Move size={12} />
          <span>Center on Box</span>
        </button>
        <button
          onClick={resetToOrigin}
          className="py-1.5 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium transition-colors"
          title="Move axle origin to (0,0,0)"
        >
          (0,0,0)
        </button>
      </div>

      {/* Axle Origin Coordinates */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span>Axle Origin (Point on Axis, mm)</span>
          <span className="font-mono text-cyan-700 dark:text-cyan-400 text-[11px] font-bold">
            [{axis.origin.x.toFixed(1)}, {axis.origin.y.toFixed(1)}, {axis.origin.z.toFixed(1)}]
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['x', 'y', 'z'] as const).map((coord) => (
            <div key={coord} className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold uppercase text-slate-400 dark:text-slate-500">
                {coord}
              </span>
              <input
                type="number"
                step="0.5"
                value={axis.origin[coord]}
                onChange={(e) => updateOriginCoord(coord, parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-lg pl-7 pr-2 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Axis Vector Direction */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span>Axle Direction Vector</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPureDirection('x')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                axis.direction.x === 1 && axis.direction.y === 0 && axis.direction.z === 0
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              +X
            </button>
            <button
              onClick={() => setPureDirection('y')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                axis.direction.x === 0 && axis.direction.y === 1 && axis.direction.z === 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              +Y
            </button>
            <button
              onClick={() => setPureDirection('z')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                axis.direction.x === 0 && axis.direction.y === 0 && axis.direction.z === 1
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              +Z
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['x', 'y', 'z'] as const).map((coord) => (
            <div key={coord} className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold uppercase text-slate-400 dark:text-slate-500">
                {coord}
              </span>
              <input
                type="number"
                step="0.1"
                value={axis.direction[coord]}
                onChange={(e) => updateDirectionCoord(coord, parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-lg pl-7 pr-2 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
