import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  BarChart3, 
  Settings as SettingsIcon, 
  FileEdit, 
  Command, 
  ShieldCheck, 
  Database,
  Sparkles
} from 'lucide-react';
import { MacroHub } from './components/MacroHub';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SettingsModal } from './components/SettingsModal';

type ActiveTab = 'macros' | 'analytics' | 'settings';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('macros');
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Listen for global shortcut trigger Ctrl+Shift+O from Electron Main process
    if (window.electronAPI && window.electronAPI.onTriggerQuickCapture) {
      const unsubscribe = window.electronAPI.onTriggerQuickCapture(() => {
        setIsQuickCaptureOpen(true);
      });
      return () => unsubscribe();
    }
  }, []);

  const triggerStatsRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d0f17] text-slate-100 selection:bg-accent-cyan/30">
      {/* Top Application Header */}
      <header className="glass-panel border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between z-30 select-none">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-accent-cyan to-indigo-600 shadow-md glow-cyan text-slate-950 font-bold">
            <Command className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-wide text-white flex items-center gap-2">
              CommandOS Hub
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30 font-semibold">
                v1.0 Local
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Obsidian Note Capture & Macro Orchestration
            </p>
          </div>
        </div>

        {/* Center Tabs */}
        <div className="flex bg-slate-900/80 border border-slate-800 p-1 rounded-2xl shadow-inner">
          <button
            onClick={() => setActiveTab('macros')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'macros'
                ? 'bg-accent-cyan text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Macro Hub
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'analytics'
                ? 'bg-accent-purple text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics & Logs
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-white shadow-md font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>

        {/* Right Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsQuickCaptureOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-accent-purple to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg glow-purple transition-all active:scale-95 border border-purple-400/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Quick Capture
            <span className="font-mono text-[10px] bg-slate-900/60 px-1.5 py-0.5 rounded text-purple-200 ml-1 border border-purple-400/20">
              Ctrl+Shift+O
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'macros' && (
          <MacroHub onMacroExecuted={triggerStatsRefresh} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard key={refreshKey} />
        )}
        {activeTab === 'settings' && (
          <SettingsModal />
        )}
      </main>

      {/* Quick Capture Modal Overlay */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        onCaptured={triggerStatsRefresh}
      />
    </div>
  );
};
