import React from 'react';
import { MaterialPreset } from '../types';
import { MATERIAL_PRESETS, DENSITY_CONVERSIONS } from '../lib/materials';
import { Shield, Sparkles } from 'lucide-react';

interface MaterialSelectorProps {
  material: MaterialPreset;
  onMaterialChange: (material: MaterialPreset) => void;
}

export const MaterialSelector: React.FC<MaterialSelectorProps> = ({
  material,
  onMaterialChange,
}) => {
  const currentDensityLbIn3 = DENSITY_CONVERSIONS.toLbPerIn3(material.densityGPerCm3);

  const handleSelectPreset = (preset: MaterialPreset) => {
    onMaterialChange({ ...preset });
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-xs uppercase tracking-wider">
          <Shield className="text-cyan-600 dark:text-cyan-400" size={16} />
          <span>Weapon Material</span>
        </div>
        <div className="text-right">
          <span className="font-mono text-cyan-700 dark:text-cyan-400 font-bold text-xs">
            {material.densityGPerCm3.toFixed(2)} g/cm³
          </span>
          <span className="text-slate-500 text-[10px] block font-mono">
            ({currentDensityLbIn3.toFixed(4)} lb/in³)
          </span>
        </div>
      </div>

      {/* 3 Presets: Steel, Aluminum 6000 series alloy, GR5 Titanium */}
      <div className="grid grid-cols-1 gap-2">
        {MATERIAL_PRESETS.map((preset) => {
          const isSelected = material.id === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                isSelected
                  ? 'bg-cyan-50/90 dark:bg-cyan-950/40 border-cyan-500 dark:border-cyan-500/80 shadow-xs ring-1 ring-cyan-500/30'
                  : 'bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
                      style={{ backgroundColor: preset.appearance.color }}
                    />
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {preset.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                    {preset.description}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    {preset.densityGPerCm3.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">g/cm³</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
