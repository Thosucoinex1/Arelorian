import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Terminal, 
  Zap, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Cpu,
  Database,
  Code
} from 'lucide-react';
import { useStore } from '../../store';
import { motion, AnimatePresence } from 'motion/react';

export const AxiomDebugger = () => {
  const showDebugger = useStore(state => state.showDebugger);
  const toggleDebugger = useStore(state => state.toggleDebugger);
  const runDiagnostics = useStore(state => state.runDiagnostics);
  const diagnosticReport = useStore(state => state.diagnosticReport);
  const isScanning = useStore(state => state.isScanning);
  const [errorInput, setErrorInput] = useState("");

  if (!showDebugger) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none"
      >
        <div className="w-full max-w-4xl h-[80vh] bg-[#050505]/95 border-2 border-emerald-500/30 rounded-[2.5rem] shadow-2xl shadow-emerald-500/10 flex flex-col overflow-hidden pointer-events-auto backdrop-blur-3xl">
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-emerald-500/5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <ShieldAlert className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-serif font-black text-white uppercase tracking-tighter">Axiom Neural Debugger</h2>
                <p className="text-[10px] text-emerald-500/60 font-mono uppercase tracking-widest">Deep Solving Intelligence v4.0</p>
              </div>
            </div>
            <button 
              onClick={() => toggleDebugger(false)}
              className="p-3 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel: Controls */}
            <div className="w-1/3 border-r border-white/5 p-6 space-y-6 bg-black/40">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-3 h-3" /> Error Log Input
                </label>
                <textarea 
                  value={errorInput}
                  onChange={(e) => setErrorInput(e.target.value)}
                  placeholder="Paste migration errors or console logs here..."
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500/40 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => runDiagnostics(errorInput)}
                  disabled={isScanning}
                  className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.1em] flex items-center justify-center gap-2 transition-all ${
                    isScanning 
                    ? 'bg-emerald-500/20 text-emerald-500 cursor-wait' 
                    : 'bg-emerald-500 text-black hover:bg-white shadow-lg shadow-emerald-900/20'
                  }`}
                >
                  {isScanning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Deep Scan
                </button>
                <button 
                  onClick={() => runDiagnostics("MIGRATION_SCAN: Check for Google Cloud/Firebase migration artifacts and crushed build states.")}
                  disabled={isScanning}
                  className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.1em] flex items-center justify-center gap-2 transition-all border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10`}
                >
                  <RefreshCw className="w-3 h-3" />
                  Migration Fix
                </button>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest">System Status</h3>
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-gray-500">Neural Link:</span>
                  <span className="text-emerald-500">CONNECTED</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-gray-500">Device:</span>
                  <span className="text-white">{useStore.getState().device.isAndroid ? 'ANDROID' : 'GENERIC'}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-gray-500">Screen:</span>
                  <span className="text-white">{useStore.getState().device.width}x{useStore.getState().device.height}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-gray-500">Orientation:</span>
                  <span className="text-white uppercase">{useStore.getState().device.orientation}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-gray-500">Axiom Integrity:</span>
                  <span className="text-emerald-500">99.9%</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-gray-500">Memory Buffer:</span>
                  <span className="text-emerald-500">STABLE</span>
                </div>
              </div>
            </div>

            {/* Right Panel: Results */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.05)_0%,_transparent_50%)]">
              {!diagnosticReport && !isScanning && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <Search className="w-16 h-16 text-emerald-500/20" />
                  <div>
                    <p className="text-sm font-serif italic text-white">Awaiting neural input...</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Run a scan to analyze project health</p>
                  </div>
                </div>
              )}

              {isScanning && (
                <div className="h-full flex flex-col items-center justify-center space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 animate-pulse" />
                    <Cpu className="w-16 h-16 text-emerald-500 animate-bounce" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-serif text-white animate-pulse">Gemini is solving the matrix...</p>
                    <div className="flex gap-1 justify-center">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {diagnosticReport && !isScanning && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  {/* Status Banner */}
                  <div className={`p-6 rounded-[2rem] border flex items-center gap-6 ${
                    diagnosticReport.status === 'HEALTHY' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    diagnosticReport.status === 'WARNING' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                    'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {diagnosticReport.status === 'HEALTHY' ? <CheckCircle className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
                    <div>
                      <h3 className="text-xl font-serif font-black uppercase tracking-tighter">System Status: {diagnosticReport.status}</h3>
                      <p className="text-xs opacity-80">{diagnosticReport.summary}</p>
                    </div>
                  </div>

                  {/* Issues Section */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                      <Activity className="w-3 h-3 text-emerald-500" /> Detected Anomalies
                    </h3>
                    <div className="grid gap-4">
                      {diagnosticReport.issues.map((issue: any, i: number) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3 hover:border-emerald-500/20 transition-all">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                issue.severity === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                                issue.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {issue.severity} SEVERITY
                              </span>
                              {issue.file && <span className="text-[9px] font-mono text-gray-500">{issue.file}</span>}
                            </div>
                          </div>
                          <p className="text-xs text-white font-medium">{issue.description}</p>
                          <div className="bg-black/40 border border-emerald-500/10 rounded-2xl p-4 flex gap-3">
                            <Code className="w-4 h-4 text-emerald-500 shrink-0" />
                            <p className="text-[10px] text-emerald-400/80 font-mono leading-relaxed">
                              <span className="text-emerald-500 font-bold">FIX:</span> {issue.suggestedFix}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recovery Steps */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                      <Database className="w-3 h-3 text-emerald-500" /> Recovery Protocol
                    </h3>
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6">
                      <ul className="space-y-3">
                        {diagnosticReport.recoverySteps.map((step: string, i: number) => (
                          <li key={i} className="flex items-start gap-3 text-[11px] text-emerald-300/80">
                            <span className="text-emerald-500 font-bold font-mono">0{i+1}.</span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
