import { SignInButton } from '@clerk/clerk-react';
import { Terminal } from 'lucide-react';

export default function AdminLogin() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-amber-900/50 p-8 rounded-2xl shadow-2xl shadow-amber-900/20 text-center space-y-6">
        <div className="mx-auto w-12 h-12 bg-amber-500/10 flex items-center justify-center rounded-xl text-amber-400">
          <Terminal className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Admin Command Center</h2>
          <p className="text-slate-400 text-sm mt-1">Authorized personnel only. Secure infrastructure access.</p>
        </div>
        {/* Forces redirect to the admin dashboard after success */}
        <SignInButton mode="modal" fallbackRedirectUrl="/admin/dashboard">
          <button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 rounded-xl transition cursor-pointer">
            Authenticate Admin Credentials
          </button>
        </SignInButton>
      </div>
    </div>
  );
}