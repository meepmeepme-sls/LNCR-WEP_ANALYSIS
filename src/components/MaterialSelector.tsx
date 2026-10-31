import React, { useState } from 'react';
import { MaterialPreset } from '../types';
import { MATERIAL_PRESETS, DENSITY_CONVERSIONS } from '../lib/materials';
import { Layers, Shield, Sparkles } from 'lucide-react';

interface MaterialSelectorProps {
  material: MaterialPreset;
  onMaterialChange: (material: MaterialPreset) => void;
}

export const MaterialSelector: React.FC<MaterialSelectorProps> = ({
  material,
  onMaterialChange,
}) => {
  const [infillPercent, setInfillPercent] = useState<number>(material.defaultInfill ?? 100);
  const [customUnit, setCustomUnit] = useState<'g_cm3' | 'lb_in3'>('g_cm3');

  const handleSelectPreset = (preset: MaterialPreset) => {
    let effectivePreset = { ...preset };
    if (preset.isInfillAdjustable) {
      const infillFactor = (preset.defaultInfill ?? 100) / 100.0;
      effectivePreset.densityGPerCm3 = preset.densityGPerCm3 * infillFactor;
    }
    setInfillPercent(preset.defaultInfill ?? 100);
    onMaterialChange(effectivePreset);
  };

  const handleInfillChange = (infill: number) => {
    setInfillPercent(infill);
    const basePreset = MATERIAL_PRESETS.find((m) => m.id === material.id) || material;
    const effectiveDensity = basePreset.densityGPerCm3 * (infill / 100.0);
    onMaterialChange({
      ...material,
      densityGPerCm3: effectiveDensity,
    });
  };

  const handleCustomDensityChange = (value: number) => {
    const densityGPerCm3 = customUnit === 'g_cm3'
      ? value
      : DENSITY_CONVERSIONS.fromLbPerIn3(value);

    onMaterialChange({
      ...material,
      id: 'custom',
      name: 'Custom Material',
      densityGPerCm3: Math.max(0.01, densityGPerCm3),
    });
  };

  const currentDensityLbIn3 = DENSITY_CONVERSIONS.toLbPerIn3(material.densityGPerCm3);

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
          <Shield className="text-cyan-400" size={17} />
          <span>Weapon Material & Density</span>
        </div>
        <div className="text-right">
          <span className="font-mono text-cyan-400 font-semibold text-xs">
            {material.densityGPerCm3.toFixed(3)} g/cm³
          </span>
          <span className="text-slate-500 text-[11px] block">
            ({currentDensityLbIn3.toFixed(4)} lb/in³)
          </span>
        </div>
      </div>

      {/* Preset Material Dropdown / Selector */}
      <div className="grid grid-cols-1 gap-2">
        <label className="block text-xs font-medium text-slate-400">
          Combat Robotics Materials
        </label>
        <select
          value={material.id}
          onChange={(e) => {
            const found = MATERIAL_PRESETS.find((m) => m.id === e.target.value);
            if (found) handleSelectPreset(found);
          }}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <optgroup label="Impact & Armor Steels">
            <option value="ar500">AR500 Armor Steel (7.85 g/cm³)</option>
            <option value="s7">S7 Shock Tool Steel (7.83 g/cm³)</option>
            <option value="4140">4140 Chromoly Steel (7.85 g/cm³)</option>
            <option value="mild_steel">Mild Steel / A36 (7.85 g/cm³)</option>
          </optgroup>
          <optgroup label="Titanium Alloys">
            <option value="ti_gr5">Titanium Grade 5 Ti-6Al-4V (4.43 g/cm³)</option>
            <option value="ti_gr2">Titanium Grade 2 CP (4.51 g/cm³)</option>
          </optgroup>
          <optgroup label="Aluminum Alloys">
            <option value="al_7075">Aluminum 7075-T6 (2.81 g/cm³)</option>
            <option value="al_6061">Aluminum 6061-T6 (2.70 g/cm³)</option>
          </optgroup>
          <optgroup label="Plastics & 3D Prints">
            <option value="polycarbonate">Polycarbonate / Lexan (1.20 g/cm³)</option>
            <option value="uhmw">UHMW-PE (0.94 g/cm³)</option>
            <option value="tpu_95a">TPU 95A Elastic Print (1.21 g/cm³)</option>
            <option value="cf_nylon">CF-Nylon / Onyx (1.15 g/cm³)</option>
          </optgroup>
          <optgroup label="Custom">
            <option value="custom">Custom Density Specification</option>
          </optgroup>
        </select>
      </div>

      {/* Description */}
      <p className="text-[11px] text-slate-400 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60 leading-relaxed">
        {material.description}
      </p>

      {/* 3D Print Infill Slider if applicable */}
      {material.isInfillAdjustable && (
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Layers size={13} className="text-amber-400" />
              <span>Infill Density</span>
            </div>
            <span className="font-mono text-amber-400 font-bold">{infillPercent}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="100"
            step="5"
            value={infillPercent}
            onChange={(e) => handleInfillChange(parseInt(e.target.value))}
            className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>20% (Light)</span>
            <span>60% (Medium)</span>
            <span>100% (Solid)</span>
          </div>
        </div>
      )}

      {/* Custom Material Density Inputs */}
      {material.id === 'custom' && (
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Custom Density Value</span>
            <div className="flex gap-1 text-[11px]">
              <button
                onClick={() => setCustomUnit('g_cm3')}
                className={`px-2 py-0.5 rounded ${
                  customUnit === 'g_cm3'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                g/cm³
              </button>
              <button
                onClick={() => setCustomUnit('lb_in3')}
                className={`px-2 py-0.5 rounded ${
                  customUnit === 'lb_in3'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                lb/in³
              </button>
            </div>
          </div>
          <input
            type="number"
            step="0.001"
            value={
              customUnit === 'g_cm3'
                ? material.densityGPerCm3
                : currentDensityLbIn3
            }
            onChange={(e) => handleCustomDensityChange(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
      )}
    </div>
  );
};
