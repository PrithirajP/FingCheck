import { useUser, useAuth, RedirectToSignIn } from '@clerk/clerk-react';
import { useState, useEffect } from 'react';
import api, { setAuthToken } from '../services/api';

export default function ProtectedRoute({ children, allowedRole }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [dbRole, setDbRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function checkRole() {
      if (isSignedIn) {
        try {
          const token = await getToken();
          setAuthToken(token);
          const res = await api.get('/me');
          if (isMounted && res.data?.data?.role) {
            setDbRole(res.data.data.role);
          }
        } catch (err) {
          console.error("Failed to fetch user profile from backend:", err);
        } finally {
          if (isMounted) setLoadingRole(false);
        }
      } else {
        if (isMounted) setLoadingRole(false);
      }
    }

    if (isLoaded) {
      checkRole();
    }
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || (isSignedIn && loadingRole)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Verifying authorization tokens...
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  // Priority: 1) MongoDB backend role, 2) Clerk publicMetadata role, 3) fallback 'user'
  const userRole = dbRole || user.publicMetadata?.role || 'user';

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