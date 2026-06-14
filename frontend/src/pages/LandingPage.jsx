import { useNavigate } from 'react-router-dom';
import { Fingerprint, Terminal } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12 space-y-4">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Welcome to FingCheck</h1>
        <p className="text-slate-400">Select your authorization environment to proceed.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* User Portal Card */}
        <button 
          onClick={() => navigate('/login')}
          className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-8 rounded-3xl text-left transition-all duration-300 cursor-pointer"
        >
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
            <Fingerprint className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Client Portal</h2>
          <p className="text-slate-400 text-sm">Access the primary dashboard for fingerprint separation and matching analysis.</p>
        </button>

        {/* Admin Portal Card */}
        <button 
          onClick={() => navigate('/admin/login')}
          className="group bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-8 rounded-3xl text-left transition-all duration-300 cursor-pointer"
        >
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition-transform">
            <Terminal className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Command Center</h2>
          <p className="text-slate-400 text-sm">Secure access for authorized administrators to monitor system audit logs.</p>
        </button>
      </div>
    </div>
  );
}