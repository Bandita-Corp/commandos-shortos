import React, { useState } from 'react';
import { 
  Shield, 
  Wifi, 
  Activity, 
  Globe, 
  Music, 
  Monitor, 
  Wrench, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Search,
  Zap
} from 'lucide-react';

interface MacroHubProps {
  onMacroExecuted: () => void;
}

interface MacroDef {
  key: string;
  name: string;
  category: 'Network' | 'Workspace' | 'Virtualization' | 'System';
  description: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
}

const MACRO_LIST: MacroDef[] = [
  {
    key: 'proxifier',
    name: 'Run Proxifier',
    category: 'Network',
    description: 'Launch system proxy redirector utility',
    icon: <Shield className="w-6 h-6 text-accent-cyan" />,
    color: 'from-cyan-500/20 to-blue-600/10',
    borderColor: 'border-cyan-500/30'
  },
  {
    key: 'flushdns',
    name: 'Flush DNS Cache',
    category: 'Network',
    description: 'Clear local DNS resolver cache (ipconfig /flushdns)',
    icon: <Wifi className="w-6 h-6 text-emerald-400" />,
    color: 'from-emerald-500/20 to-teal-600/10',
    borderColor: 'border-emerald-500/30'
  },
  {
    key: 'netlimiter',
    name: 'Run NetLimiter',
    category: 'Network',
    description: 'Start traffic control and network monitoring',
    icon: <Activity className="w-6 h-6 text-indigo-400" />,
    color: 'from-indigo-500/20 to-purple-600/10',
    borderColor: 'border-indigo-500/30'
  },
  {
    key: 'chrome_tabs',
    name: 'AI & Dev Workspace',
    category: 'Workspace',
    description: 'Launch Chrome with Gemini, GitHub, & YouTube tabs',
    icon: <Globe className="w-6 h-6 text-amber-400" />,
    color: 'from-amber-500/20 to-orange-600/10',
    borderColor: 'border-amber-500/30'
  },
  {
    key: 'spotify',
    name: 'Open Spotify',
    category: 'System',
    description: 'Start Spotify desktop player',
    icon: <Music className="w-6 h-6 text-emerald-500" />,
    color: 'from-emerald-600/20 to-green-700/10',
    borderColor: 'border-emerald-600/30'
  },
  {
    key: 'start_vm',
    name: 'Start Windows VM',
    category: 'Virtualization',
    description: 'Boot default Windows Virtual Machine (VBoxManage)',
    icon: <Monitor className="w-6 h-6 text-purple-400" />,
    color: 'from-purple-500/20 to-pink-600/10',
    borderColor: 'border-purple-500/30'
  },
  {
    key: 'cockpit_tools',
    name: 'Open Cockpit Tools',
    category: 'System',
    description: 'Launch web management interface (https://localhost:9090)',
    icon: <Wrench className="w-6 h-6 text-rose-400" />,
    color: 'from-rose-500/20 to-red-600/10',
    borderColor: 'border-rose-500/30'
  }
];

export const MacroHub: React.FC<MacroHubProps> = ({ onMacroExecuted }) => {
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [macroStatus, setMacroStatus] = useState<Record<string, { success: boolean; message: string; timestamp: Date }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Network', 'Workspace', 'Virtualization', 'System'];

  const handleRunMacro = async (macro: MacroDef) => {
    setRunningKey(macro.key);
    try {
      const res = await window.electronAPI.runMacro(macro.key);
      if (res.success) {
        setMacroStatus((prev) => ({
          ...prev,
          [macro.key]: {
            success: true,
            message: 'Executed successfully',
            timestamp: new Date()
          }
        }));
      } else {
        setMacroStatus((prev) => ({
          ...prev,
          [macro.key]: {
            success: false,
            message: res.error || 'Execution failed',
            timestamp: new Date()
          }
        }));
      }
    } catch (err: any) {
      setMacroStatus((prev) => ({
        ...prev,
        [macro.key]: {
          success: false,
          message: err.message || 'Execution error',
          timestamp: new Date()
        }
      }));
    } finally {
      setRunningKey(null);
      onMacroExecuted();
    }
  };

  const filteredMacros = MACRO_LIST.filter((macro) => {
    const matchesSearch = macro.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          macro.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || macro.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <Zap className="w-5 h-5 text-accent-cyan" />
            System Macro Launcher
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Trigger system commands, developer applications, network configurations, and virtual environments.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search macros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900/80 border border-slate-700/60 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-cyan/60 transition-colors w-48 lg:w-60"
            />
          </div>

          <div className="flex bg-slate-900/60 border border-slate-800 p-1 rounded-xl">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Macros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMacros.map((macro) => {
          const isRunning = runningKey === macro.key;
          const status = macroStatus[macro.key];

          return (
            <div
              key={macro.key}
              className={`glass-panel glass-panel-hover rounded-2xl p-5 border ${macro.borderColor} bg-gradient-to-br ${macro.color} flex flex-col justify-between relative overflow-hidden group`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 shadow-inner">
                    {macro.icon}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900/80 text-slate-300 border border-slate-700/50">
                    {macro.category}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-white group-hover:text-accent-cyan transition-colors">
                  {macro.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {macro.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                {/* Execution Status Badge */}
                <div className="text-xs">
                  {isRunning ? (
                    <span className="flex items-center gap-1.5 text-amber-400 font-mono">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Executing...
                    </span>
                  ) : status ? (
                    <span
                      className={`flex items-center gap-1.5 text-[11px] font-medium ${
                        status.success ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                      title={status.message}
                    >
                      {status.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span className="truncate max-w-[130px]">
                        {status.success ? 'Success' : 'Failed'}
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[11px]">Ready</span>
                  )}
                </div>

                {/* Run Button */}
                <button
                  onClick={() => handleRunMacro(macro)}
                  disabled={isRunning}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-accent-cyan hover:text-slate-950 text-accent-cyan text-xs font-semibold border border-accent-cyan/30 hover:border-accent-cyan transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isRunning ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  Run
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
