import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ShieldAlert, Activity, Fingerprint, Database, Loader2, Server } from 'lucide-react';
import { adminService, setAuthToken } from '../../services/api';

export default function AuditLogs() {
  const { getToken } = useAuth();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = await getToken();
        setAuthToken(token);
        const res = await adminService.getAuditLogs();
        // Assuming your backend returns { data: [...] } or just an array
        setLogs(res.data || res || []);
      } catch (err) {
        console.error("Failed to fetch audit logs:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [getToken]);

  // Helper to color-code different system actions
  const getActionBadge = (action) => {
    if (action.includes('match')) {
      return <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-xs font-bold flex items-center gap-1 w-max"><Fingerprint className="w-3 h-3"/> Verification</span>;
    }
    if (action.includes('overlap')) {
      return <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-xs font-bold flex items-center gap-1 w-max"><Activity className="w-3 h-3"/> Pipeline Engine</span>;
    }
    return <span className="px-2 py-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded text-xs font-bold flex items-center gap-1 w-max"><Server className="w-3 h-3"/> System Event</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-amber-500" /> Security Audit Logs
        </h2>
        <p className="text-slate-400 text-sm mt-1">Immutable record of all administrative and biometric pipeline events.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold">Initiating User (ID)</th>
                <th className="px-6 py-4 font-semibold">Action Type</th>
                <th className="px-6 py-4 font-semibold">Target Entity</th>
                <th className="px-6 py-4 font-semibold">System Result / Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
                    <p className="text-slate-500">Decrypting secure logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    No audit records found in the database.
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-800/20 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {log.user_id.slice(-8)}...
                    </td>
                    <td className="px-6 py-4">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {log.entity_type}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-amber-200/70">
                      {log.new_value}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}