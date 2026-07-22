import { useUser, useAuth, RedirectToSignIn } from '@clerk/clerk-react';
import { useState, useEffect } from 'react';
import api, { setAuthToken, setTokenGetter } from '../services/api';

export default function ProtectedRoute({ children, allowedRole }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [dbRole, setDbRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [backendError, setBackendError] = useState(null);

  useEffect(() => {
    if (getToken) {
      setTokenGetter(getToken);
    }
  }, [getToken]);

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
          if (isMounted) {
            setBackendError("Could not connect to Go backend API (http://localhost:8080). Make sure the backend service is running.");
          }
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

  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || '';
  // Priority: 1) MongoDB backend role, 2) Known admin email fallback, 3) Clerk publicMetadata role, 4) 'user'
  const userRole = dbRole || (userEmail === 'kiransumit2232@gmail.com' ? 'admin' : null) || user?.publicMetadata?.role || 'user';

  // Admins are permitted to access both 'admin' and 'user' operational views!
  const isAuthorized = !allowedRole || userRole === allowedRole || (allowedRole === 'user' && userRole === 'admin');

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center space-y-4">
        <h1 className="text-2xl font-bold text-rose-500 mb-2">Access Denied</h1>
        <p className="text-slate-400 max-w-md text-sm">
          Your account ({userEmail || 'User'}) lacks administrative clearances required for this operational view.
        </p>

        {backendError && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-3 rounded-xl text-xs max-w-lg">
            ⚠️ <strong>Backend Server Warning:</strong> {backendError}
          </div>
        )}

        <a href="/login" className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-lg text-sm transition">
          Return to Portal
        </a>
      </div>
    );
  }

  return children;
}