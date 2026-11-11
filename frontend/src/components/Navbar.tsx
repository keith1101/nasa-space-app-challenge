import React from 'react';
import { Telescope, ExternalLink, Eye } from 'lucide-react';

interface NavbarProps {
  backendHealthy: boolean;
  astropyVersion: string;
  redMode: boolean;
  onToggleRedMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ backendHealthy, astropyVersion, redMode, onToggleRedMode }) => {
  return (
    <header className="shrink-0 border-b border-space-800/80 bg-space-950/80 backdrop-blur-md z-50 px-4 lg:px-6 py-2">
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nasa-blue to-nasa-cyan flex items-center justify-center shadow-md shadow-nasa-cyan/10">
            <Telescope className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-white text-base tracking-tight">SPHEREx</span>
              <span className="text-[10px] font-mono text-nasa-cyan px-1.5 py-0.2 rounded bg-nasa-cyan/10 border border-nasa-cyan/20">
                PLANET X TIME-LAPSE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              NASA International Space Apps Challenge 2026
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 font-mono text-slate-400">
            <span className={`w-2 h-2 rounded-full ${backendHealthy ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span>AstroPy {astropyVersion}</span>
          </div>

          <button
            type="button"
            aria-pressed={redMode}
            onClick={onToggleRedMode}
            className={`focus-ring flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-medium transition-colors ${redMode ? 'border-rose-500 bg-rose-950 text-rose-100' : 'border-space-700 text-slate-300 hover:border-rose-500/70 hover:text-white'}`}
          >
            <Eye className="h-3.5 w-3.5" />
            {redMode ? 'Red mode on' : 'Night vision'}
          </button>

          <a
            href="https://www.spaceappschallenge.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white flex items-center space-x-1 text-xs transition-colors"
          >
            <span>NASA Portal</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </header>
  );
};
