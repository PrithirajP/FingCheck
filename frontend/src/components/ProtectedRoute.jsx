import { useUser, RedirectToSignIn } from '@clerk/clerk-react';

export default function ProtectedRoute({ children, allowedRole }) {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Verifying authorization tokens...
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  // Reads metadata from Clerk. If no role is present, defaults to 'user'
  const userRole = user.publicMetadata?.role || 'user';

  if (allowedRole && userRole !== allowedRole) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-rose-500 mb-2">Access Denied</h1>
        <p className="text-slate-400 max-w-md">Your account lacks the administrative clearances required to interact with this operational view.</p>
        <a href="/login" className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-lg text-sm transition">
          Return to Portal
        </a>
      </div>
    );
  }

  return children;
}