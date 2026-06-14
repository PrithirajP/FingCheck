import { useState } from 'react';
import { Upload, CheckCircle2, XCircle, Search, X } from 'lucide-react';

export default function MatchingPage() {
  const [probe, setProbe] = useState({ file: null, preview: null });
  const [candidate, setCandidate] = useState({ file: null, preview: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = (e, target) => {
    const file = e.target.files[0];
    if (file) {
      const data = { file, preview: URL.createObjectURL(file) };
      if (target === 'probe') setProbe(data);
      else setCandidate(data);
    }
  };

  const clearImage = (target) => {
    if (target === 'probe') setProbe({ file: null, preview: null });
    else setCandidate({ file: null, preview: null });
    setResult(null); // Clear result if they change an image
  };

  const handleVerify = () => {
    if (!probe.file || !candidate.file) return;
    setIsProcessing(true);
    setResult(null);

    // Simulate backend verification delay
    setTimeout(() => {
      // Mocking a successful match for demonstration
      setResult({
        matched: true,
        score: 96.8,
      });
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">1-to-1 Verification</h2>
        <p className="text-slate-400 text-sm">Compare two discrete prints directly to extract a confidence score.</p>
      </div>

      {/* Upload Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Probe Input */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center relative flex flex-col items-center justify-center min-h-[250px]">
          {probe.preview ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">Probe Image</span>
              <img src={probe.preview} alt="Probe" className="max-h-40 rounded-lg object-contain" />
              <button onClick={() => clearImage('probe')} className="mt-4 text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 z-20 cursor-pointer">
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          ) : (
            <>
              <input type="file" onChange={(e) => handleUpload(e, 'probe')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              <div className="p-6 text-slate-500 pointer-events-none">
                <Upload className="w-8 h-8 mx-auto mb-2 text-indigo-500/50" />
                <p className="font-medium text-slate-300">Upload Probe</p>
                <p className="text-xs mt-1">(Crime Scene Print)</p>
              </div>
            </>
          )}
        </div>

        {/* Candidate Input */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center relative flex flex-col items-center justify-center min-h-[250px]">
          {candidate.preview ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Candidate Image</span>
              <img src={candidate.preview} alt="Candidate" className="max-h-40 rounded-lg object-contain" />
              <button onClick={() => clearImage('candidate')} className="mt-4 text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 z-20 cursor-pointer">
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          ) : (
            <>
              <input type="file" onChange={(e) => handleUpload(e, 'candidate')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              <div className="p-6 text-slate-500 pointer-events-none">
                <Upload className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                <p className="font-medium text-slate-300">Upload Candidate</p>
                <p className="text-xs mt-1">(Database Suspect Print)</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="text-center">
        <button 
          onClick={handleVerify} 
          disabled={!probe.file || !candidate.file || isProcessing} 
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
        >
          {isProcessing ? <Search className="w-5 h-5 animate-spin" /> : null}
          {isProcessing ? 'Analyzing Minutiae Points...' : 'Run Cross-Match Verification'}
        </button>
      </div>

      {/* Results Output */}
      {result && (
        <div className={`mt-8 p-8 rounded-2xl border text-center max-w-lg mx-auto animate-in zoom-in duration-300 ${
          result.matched ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500/30'
        }`}>
          {result.matched ? (
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          )}
          
          <h4 className="text-2xl font-bold text-white mb-2">
            {result.matched ? 'Positive Verification' : 'Verification Rejected'}
          </h4>
          
          <div className="bg-slate-900/50 py-3 px-6 rounded-lg inline-block mt-2 border border-slate-800">
            <p className="text-slate-400 text-sm">Similarity Score</p>
            <p className="font-mono text-2xl text-white font-bold">{result.score}%</p>
          </div>
        </div>
      )}
    </div>
  );
}