import React from 'react';
import { Cloud, HelpCircle, X, Zap } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 text-slate-800 dark:text-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-slate-100">
            <Zap className="text-cyan-600 dark:text-cyan-400" size={20} />
            <span>LNCR Weapon MOI & Dynamics Guide</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Section 1 */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-cyan-700 dark:text-cyan-400">
            1. Exact Polyhedral Mass & MOI Integration
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Unlike rough bounding-box approximations, LNCR-WEP_ANALYSIS computes the exact volume, center of mass,
            and full 3×3 inertia tensor using the <strong>Divergence Theorem</strong> (Mirtich/Eberly algorithm)
            integrated over the triangular boundary faces extracted from your STEP file.
          </p>
          <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-cyan-800 dark:text-cyan-300">
            I<sub>axis</sub> = uᵀ · I<sub>com</sub> · u + M · r<sub>⊥</sub>²
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            where <strong>u</strong> is the normalized rotation axis vector, <strong>I<sub>com</sub></strong> is the
            mass moment of inertia tensor at the Center of Mass, and <strong>r<sub>⊥</sub></strong> is the
            eccentricity (offset from axle to Center of Mass).
          </p>
        </div>

        {/* Section 2 */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-cyan-700 dark:text-cyan-400">
            2. Static Imbalance & Bearing Loads
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            In high-RPM spinning weapons, any offset between the weapon’s Center of
            Mass and the axle creates dynamic centrifugal vibration force:
          </p>
          <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-amber-800 dark:text-amber-300">
            F<sub>radial</sub> = M · e · ω²
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Single-tooth blades or asymmetric beaters require counterweights so that eccentricity <em>e</em> is
            under 0.05 mm, preventing weapon bearing destruction or self-inflicted gyro hop.
          </p>
        </div>

        {/* Section 3 */}
        <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
          <h3 className="text-sm font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
            <Cloud size={16} />
            <span>3. How to Host 100% Free on Cloudflare Pages</span>
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            This app is built as a pure client-side static Single Page Application (SPA). The STEP conversion and
            calculations run directly in your browser using OpenCASCADE WebAssembly (WASM). No server is required!
          </p>
          <ol className="text-xs text-slate-600 dark:text-slate-300 list-decimal list-inside space-y-1 bg-slate-100 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <li>Push this repository to GitHub.</li>
            <li>In Cloudflare Dashboard, go to <strong>Workers & Pages</strong> → <strong>Create Application</strong> → <strong>Pages</strong>.</li>
            <li>Connect your repository and choose <strong>Vite</strong> preset (Build command: <span className="font-mono text-cyan-600 dark:text-cyan-300">npm run build</span>, Output directory: <span className="font-mono text-cyan-600 dark:text-cyan-300">dist</span>).</li>
            <li>Click <strong>Save and Deploy</strong>. You get a free permanent URL with unlimited visitors.</li>
          </ol>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Got it, Let's Analyze!
          </button>
        </div>
      </div>
    </div>
  );
};
