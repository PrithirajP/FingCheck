import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Users, Database, Layers, Loader2, Activity, Server, ShieldCheck, Zap } from 'lucide-react';
import { adminService, setAuthToken } from '../../services/api';

export default function SystemOverview() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState({ users: 0, targets: 0, overlaps: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await getToken();
        setAuthToken(token);
        const res = await adminService.getSystemStats();
        
        // Safely extract the stats from response structure
        const statsData = res?.data || res;
        setStats({
          users: statsData?.users ?? 0,
          targets: statsData?.targets ?? 0,
          overlaps: statsData?.overlaps ?? 0,
        });
      } catch (error) {
        console.error("Failed to load system stats", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
    
    // Optional: Refresh stats every 30 seconds to make it a "live" dashboard
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [getToken]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] space-y-4 animate-in fade-in">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin relative z-10" />
          <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
        </div>
        <p className="text-slate-400 font-mono text-sm tracking-widest uppercase">Initializing Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-500">
      
      {/* Header Section */}
      <div className="flex items-end justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System Overview</h1>
          <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" /> Real-time command center telemetry
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          System Online
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Users Metric */}
        <div className="group bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.2)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-indigo-500/20 transition-colors"></div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-slate-400 text-sm font-bold tracking-wider uppercase mb-1">Registered Personnel</p>
              <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
                {stats.users.toLocaleString()}
              </p>
            </div>
            <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
              <Users className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* Target Database Metric */}
        <div className="group bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.2)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-emerald-500/20 transition-colors"></div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-slate-400 text-sm font-bold tracking-wider uppercase mb-1">Target Database Size</p>
              <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
                {stats.targets.toLocaleString()}
              </p>
            </div>
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
              <Database className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* Processed Overlaps Metric */}
        <div className="group bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.2)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-amber-500/20 transition-colors"></div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-slate-400 text-sm font-bold tracking-wider uppercase mb-1">Overlaps Processed</p>
              <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
                {stats.overlaps.toLocaleString()}
              </p>
            </div>
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
              <Layers className="w-7 h-7" />
            </div>
          </div>
        </div>

      </div>

      {/* Secondary Status Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        
        {/* Node Health */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-400" /> Infrastructure Nodes
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span className="text-slate-300 font-medium">Go API Gateway</span>
              </div>
              <span className="text-emerald-400 text-xs font-mono font-bold bg-emerald-500/10 px-2 py-1 rounded">OPERATIONAL</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-indigo-400" />
                <span className="text-slate-300 font-medium">SourceAFIS Extraction Engine</span>
              </div>
              <span className="text-indigo-400 text-xs font-mono font-bold bg-indigo-500/10 px-2 py-1 rounded">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Security Overview */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800/20 via-transparent to-transparent">
          <h3 className="text-lg font-bold text-white mb-4">Security Protocol</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            All biometrics are hashed and processed entirely in-memory. 
            Direct database connections are secured via environment isolation, and access is strictly governed by Clerk RBAC policies.
          </p>
          <div className="flex gap-4">
             <div className="flex-1 bg-slate-950/50 p-4 rounded-2xl border border-slate-800 text-center">
               <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Session</p>
               <p className="text-emerald-400 font-mono text-sm">ENCRYPTED</p>
             </div>
             <div className="flex-1 bg-slate-950/50 p-4 rounded-2xl border border-slate-800 text-center">
               <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Audit Log</p>
               <p className="text-indigo-400 font-mono text-sm">RECORDING</p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}