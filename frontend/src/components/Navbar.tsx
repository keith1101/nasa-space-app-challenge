import React from 'react';
import { Telescope, Satellite, Radio, ExternalLink } from 'lucide-react';

interface NavbarProps {
  backendHealthy: boolean;
  astropyVersion: string;
}

export const Navbar: React.FC<NavbarProps> = ({ backendHealthy, astropyVersion }) => {
  return (
    <header className="border-b border-space-800 bg-space-900/90 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Mission Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nasa-blue via-indigo-600 to-nasa-cyan flex items-center justify-center shadow-lg shadow-nasa-cyan/20 ring-1 ring-nasa-cyan/30">
            <Telescope className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-tight text-white text-lg">SPHEREx</span>
              <span className="text-nasa-cyan font-mono text-xs px-2 py-0.5 rounded bg-nasa-cyan/10 border border-nasa-cyan/30 font-semibold">
                ALL-SKY TIME-LAPSE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              NASA Space Apps Challenge 2026 • Planet X & Moving Object Finder
            </p>
          </div>
        </div>

        {/* Telemetry & Badges */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-space-850 border border-space-700 text-xs">
            <Satellite className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Mission Cadence:</span>
            <span className="text-slate-200 font-mono font-medium">6 Months / All-Sky</span>
          </div>

          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-space-850 border border-space-700 text-xs">
            <Radio className="w-3.5 h-3.5 text-nasa-cyan" />
            <span className="text-slate-400">Spectroscopy:</span>
            <span className="text-nasa-cyan font-mono font-medium">102 NIR Bands (0.75-5.0 µm)</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-space-850 border border-space-700 text-xs">
            <div className={`w-2 h-2 rounded-full ${backendHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-400">AstroPy:</span>
            <span className="text-slate-200 font-mono">{astropyVersion || 'Connecting...'}</span>
          </div>

          <a
            href="https://www.spaceappschallenge.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-nasa-cyan transition-colors"
          >
            <span>Portal</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </header>
  );
};
