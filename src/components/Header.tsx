import React, { useRef } from 'react';
import { SampleModel } from '../types';
import { SAMPLE_MODELS } from '../lib/samples';
import {
  Download,
  FolderOpen,
  HelpCircle,
  Play,
  Share2,
  Sparkles,
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

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-black">
            <Zap size={20} className="fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-100 tracking-tight text-base sm:text-lg">
                LNCR <span className="text-cyan-400 font-normal">WEP_ANALYSIS</span>
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                v1.0 Free Cloudflare Edition
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Late Night Combat Robotics · Blade & Beater Bar MOI Analyzer
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Hidden File Input */}
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
            defaultValue=""
            className="bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="" disabled>
              ⚡ Load Sample Weapon...
            </option>
            {SAMPLE_MODELS.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.title}
              </option>
            ))}
          </select>

          {/* Upload STEP Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <Upload size={14} />
            <span>{isLoading ? 'Processing CAD...' : 'Upload .STEP File'}</span>
          </button>

          {/* Export Report */}
          <button
            onClick={onExportReport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            title="Export Engineering Report"
          >
            <Download size={14} />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Help / Guide */}
          <button
            onClick={onOpenHelp}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            title="Help & Combat Robotics Reference"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
