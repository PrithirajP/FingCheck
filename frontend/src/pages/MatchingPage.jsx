import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { CheckCircle2, XCircle, Search, Fingerprint, Database } from 'lucide-react';
import { overlapService, matchService, setAuthToken } from '../services/api';

export default function MatchingPage() {
  const { getToken } = useAuth();
  
  const [overlaps, setOverlaps] = useState([]);
  const [selectedOverlapId, setSelectedOverlapId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  // Fetch the user's previously separated prints to choose from
  useEffect(() => {
    const fetchOverlaps = async () => {
      const token = await getToken();
      setAuthToken(token);
      try {
        const res = await overlapService.getMyOverlaps();
        // Only show completed ones that can be matched
        setOverlaps(res.data?.filter(o => o.processing_status === 'completed') || []);
      } catch (err) {
        console.error("Failed to load overlaps", err);
      }
    };
    fetchOverlaps();
  }, [getToken]);

  const handleVerify = async () => {
    if (!selectedOverlapId) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const token = await getToken();
      setAuthToken(token);

      // Trigger the Go SourceAFIS matching engine
      const matchRes = await matchService.runMatch(selectedOverlapId);
      
      // Look at the results (User route returns "found" or "not found")
      const matches = matchRes.data.results || [];
      const successfulMatch = matches.find(m => m.status === "found");

      if (successfulMatch) {
        setResult({ matched: true, component: successfulMatch.component_index });
      } else {
        setResult({ matched: false });
      }
    } catch (err) {
      console.error("Match Error:", err);
      alert("Verification failed to run.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">1-to-1 Verification</h1>
        <p className="text-slate-400 mt-2">Compare separated latent prints against the Target Database.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6">
        <div>
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-indigo-400" /> Select Separated Print to Match
          </label>
          <select 
            value={selectedOverlapId} 
            onChange={(e) => setSelectedOverlapId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="">-- Choose a Processed Print --</option>
            {overlaps.map(o => (
              <option key={o.id} value={o.id}>Overlap ID: {o.id.slice(-6)} (Created: {new Date(o.created_at).toLocaleDateString()})</option>
            ))}
          </select>
        </div>

        <button 
          onClick={handleVerify} disabled={!selectedOverlapId || isProcessing} 
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {isProcessing ? <Search className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
          {isProcessing ? 'Querying Target Database...' : 'Run Cross-Match Verification'}
        </button>
      </div>

      {result && (
        <div className={`mt-8 p-8 rounded-2xl border text-center animate-in zoom-in duration-300 ${
          result.matched ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500/30'
        }`}>
          {result.matched ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h4 className="text-2xl font-bold text-white mb-2">Positive Verification</h4>
              <p className="text-emerald-400">Match found in Target Database for Print Component {result.component}</p>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
              <h4 className="text-2xl font-bold text-white mb-2">Verification Rejected</h4>
              <p className="text-rose-400">No match found in Target Database.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}