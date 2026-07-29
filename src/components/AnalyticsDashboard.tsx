import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  FileText, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Hash, 
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { MacroUsageLog, ObsidianEntry } from '../types/electron';

export const AnalyticsDashboard: React.FC = () => {
  const [macroLogs, setMacroLogs] = useState<MacroUsageLog[]>([]);
  const [obsidianEntries, setObsidianEntries] = useState<ObsidianEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [macroRes, obsidianRes] = await Promise.all([
        window.electronAPI.getMacroLogs(),
        window.electronAPI.getObsidianEntries(),
      ]);

      if (macroRes.success && macroRes.data) {
        setMacroLogs(macroRes.data);
      }
      if (obsidianRes.success && obsidianRes.data) {
        setObsidianEntries(obsidianRes.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute Statistics
  const totalMacroRuns = macroLogs.length;
  const successfulRuns = macroLogs.filter((l) => l.status === 'SUCCESS').length;
  const successRate = totalMacroRuns > 0 ? Math.round((successfulRuns / totalMacroRuns) * 100) : 100;

  const totalCaptures = obsidianEntries.length;
  const totalWords = obsidianEntries.reduce((acc, curr) => acc + (curr.wordCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex items-center justify-between glass-panel p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent-cyan" />
            Usage Analytics & SQLite Logs
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time statistics stored locally in Electron userData SQLite database.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Macro Runs */}
        <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Macro Executions</span>
            <Zap className="w-4 h-4 text-accent-cyan" />
          </div>
          <div className="text-2xl font-bold text-white">{totalMacroRuns}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-accent-cyan" />
            Total system triggers
          </div>
        </div>

        {/* Success Rate */}
        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Macro Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{successRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {successfulRuns} of {totalMacroRuns} runs clean
          </div>
        </div>

        {/* Total Obsidian Notes */}
        <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Obsidian Notes Captured</span>
            <FileText className="w-4 h-4 text-accent-purple" />
          </div>
          <div className="text-2xl font-bold text-white">{totalCaptures}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Logged to SQLite
          </div>
        </div>

        {/* Total Words Captured */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Words Captured</span>
            <Hash className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalWords.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Words saved in vault notes
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Macro Usage Log Table */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent-cyan" />
            Recent Macro Executions
          </h3>
          <div className="overflow-y-auto max-h-[360px] pr-1">
            {macroLogs.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No macro executions logged yet.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-2 font-medium">Macro Name</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {macroLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-medium text-slate-200">{log.macroName}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {log.status === 'SUCCESS' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(log.executedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Obsidian Captures Table */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent-purple" />
            Obsidian Entry History
          </h3>
          <div className="overflow-y-auto max-h-[360px] pr-1">
            {obsidianEntries.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No Obsidian entries captured yet. Press Ctrl+Shift+O to create one!
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-2 font-medium">Word Count</th>
                    <th className="pb-2 font-medium">Tags</th>
                    <th className="pb-2 font-medium text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {obsidianEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-semibold text-accent-cyan font-mono">
                        {entry.wordCount} words
                      </td>
                      <td className="py-2.5">
                        {entry.tags ? (
                          <div className="flex flex-wrap gap-1">
                            {entry.tags.split(',').map((t, idx) => (
                              <span
                                key={idx}
                                className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded border border-slate-700"
                              >
                                #{t.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[10px]">No tags</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right text-slate-400 font-mono text-[11px]">
                        <span className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
