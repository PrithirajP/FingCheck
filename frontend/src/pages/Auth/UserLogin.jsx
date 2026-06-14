import { SignIn } from '@clerk/clerk-react';
import { Fingerprint } from 'lucide-react';

export default function UserLogin() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Branding Header */}
      <div className="mb-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-indigo-500/10 flex items-center justify-center rounded-2xl text-indigo-400">
          <Fingerprint className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">FingCheck Client Portal</h2>
          <p className="text-slate-400 text-sm mt-2">Access your fingerprint separation and analysis environment.</p>
        </div>
      </div>

      {/* This renders the actual input fields directly on your page.
        Users can click "Sign up" at the bottom of this form to create a new account.
      */}
      <SignIn 
        routing="hash" 
        fallbackRedirectUrl="/dashboard" 
        signUpFallbackRedirectUrl="/dashboard" 
      />
    </div>
  );
}