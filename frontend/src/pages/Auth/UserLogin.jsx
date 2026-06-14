import { SignInButton } from '@clerk/clerk-react';
import { Fingerprint } from 'lucide-react';

export default function UserLogin() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl text-center space-y-6">
        <div className="mx-auto w-12 h-12 bg-indigo-500/10 flex items-center justify-center rounded-xl text-indigo-400">
          <Fingerprint className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">FingCheck Client Portal</h2>
          <p className="text-slate-400 text-sm mt-1">Access your fingerprint separation and analysis environment.</p>
        </div>
        {/* Forces redirect to the user dashboard after success */}
        <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition cursor-pointer">
            Sign In to Workspace
          </button>
        </SignInButton>
      </div>
    </div>
  );
}