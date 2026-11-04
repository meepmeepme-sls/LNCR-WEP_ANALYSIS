import React, { useRef } from 'react';
import { SampleModel } from '../types';
import { SAMPLE_MODELS } from '../lib/samples';
import {
  Download,
  HelpCircle,
  Upload,
  Zap,
} from 'lucide-react';

interface HeaderProps {
  onFileUpload: (file: File) => void;
  onSampleSelect: (sample: SampleModel) => void;
  isLoading: boolean;
  currentFilename: string;
  onOpenHelp: () => void;
  onExportReport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onFileUpload,
  onSampleSelect,
  isLoading,
  currentFilename,
  onOpenHelp,
  onExportReport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  const currentSample = SAMPLE_MODELS.find(
    (s) => s.filename.toLowerCase() === currentFilename.toLowerCase()
  );

  return (
    <header className="bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-40 backdrop-blur-md shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-md shadow-cyan-600/20 text-white font-black">
            <Zap size={20} className="fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-900 dark:text-slate-100 tracking-tight text-base sm:text-lg">
                LNCR <span className="text-cyan-600 dark:text-cyan-400 font-bold">WEP_ANALYSIS</span>
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/20">
                v1.1 Free Cloudflare Edition
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Late Night Combat Robotics · Blade & Beater Bar MOI Analyzer
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".step,.stp"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Sample Models Dropdown */}
          <select
            onChange={(e) => {
              const sample = SAMPLE_MODELS.find((s) => s.id === e.target.value);
              if (sample) onSampleSelect(sample);
            }}
            value={currentSample?.id || ''}
            className="bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium max-w-[260px] truncate"
          >
            <option value="" disabled>
              ⚡ Load Default Blade ({SAMPLE_MODELS.length} Available)...
            </option>
            <optgroup label="Antweight Compact (2.50″ – 3.75″)">
              {SAMPLE_MODELS.filter((s) => s.weightClass === '1 lb Antweight' && !s.title.includes('4.') && !s.title.includes('5.') && !s.title.includes('6.')).map((sample) => (
                <option key={sample.id} value={sample.id}>
                  {sample.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Antweight Long-Reach (4.00″ – 6.00″)">
              {SAMPLE_MODELS.filter((s) => s.weightClass === '1 lb Antweight' && (s.title.includes('4.') || s.title.includes('5.') || s.title.includes('6.'))).map((sample) => (
                <option key={sample.id} value={sample.id}>
                  {sample.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Beetleweight Blades (4.00″ – 8.00″)">
              {SAMPLE_MODELS.filter((s) => s.weightClass === '3 lb Beetleweight').map((sample) => (
                <option key={sample.id} value={sample.id}>
                  {sample.title}
                </option>
              ))}
            </optgroup>
          </select>

          {/* Upload STEP Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-600/20 transition-all disabled:opacity-50"
          >
            <Upload size={14} />
            <span>{isLoading ? 'Processing CAD...' : 'Upload .STEP File'}</span>
          </button>

          {/* Export Report */}
          <button
            onClick={onExportReport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 transition-colors"
            title="Export Engineering Report"
          >
            <Download size={14} />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Help / Guide */}
          <button
            onClick={onOpenHelp}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Help & Combat Robotics Reference"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
