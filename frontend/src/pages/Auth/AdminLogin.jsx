import { SignIn } from '@clerk/clerk-react';
import { Terminal } from 'lucide-react';

export default function AdminLogin() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Admin Branding */}
      <div className="mb-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-amber-500/10 flex items-center justify-center rounded-2xl text-amber-500">
          <Terminal className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Admin Command Center</h2>
          <p className="text-slate-400 text-sm mt-2">Authorized personnel only. Secure infrastructure access.</p>
        </div>
      </div>

      {/* Admin login form. 
        Note: Admins usually don't "Sign Up" publicly. You create their account 
        in the Clerk Dashboard and give them the {"role": "admin"} metadata there.
      */}
      <SignIn 
        routing="hash" 
        fallbackRedirectUrl="/admin/dashboard" 
      />
    </div>
  );
}