import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Upload, Layers, CheckCircle2, Fingerprint, Search, XCircle, Loader2, Database, ArrowLeft, SplitSquareHorizontal } from 'lucide-react';
import { overlapService, matchService, setAuthToken } from '../services/api';

export default function SeparationPage() {
  const { getToken } = useAuth();
  const [mode, setMode] = useState('menu'); 

  // --- OVERLAP PIPELINE STATE ---
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [stage, setStage] = useState('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [separatedPrints, setSeparatedPrints] = useState({ id: null, printA: null, printB: null });
  const pollingRef = useRef(null);

  const [matchResultA, setMatchResultA] = useState(null);
  const [matchResultB, setMatchResultB] = useState(null);
  const [isMatchingA, setIsMatchingA] = useState(false);
  const [isMatchingB, setIsMatchingB] = useState(false);

  // --- DIRECT MATCH STATE ---
  const [directFile, setDirectFile] = useState(null);
  const [directPreview, setDirectPreview] = useState(null);
  const [isDirectMatching, setIsDirectMatching] = useState(false);
  const [directMatchResult, setDirectMatchResult] = useState(null);

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const resetToMenu = () => {
    setMode('menu');
    setFile(null); setPreview(null); setStage('upload');
    setMatchResultA(null); setMatchResultB(null);
    setDirectFile(null); setDirectPreview(null); setDirectMatchResult(null);
  };

  const formatImageUrl = (path) => path ? `http://localhost:8080/${path.replace(/\\/g, '/')}` : null;

  // --- OVERLAP HANDLERS ---
  const handleSeparate = async () => {
    if (!file) return;
    setIsProcessing(true); setStage('processing');
    try {
      const token = await getToken(); setAuthToken(token);
      const uploadRes = await overlapService.upload(file);
      const newOverlapId = uploadRes.data.id;

      pollingRef.current = setInterval(async () => {
        const checkRes = await overlapService.getMyOverlaps();
        const currentOverlap = checkRes.data.find(o => o.id === newOverlapId);
        if (currentOverlap) {
          if (currentOverlap.processing_status === 'completed') {
            clearInterval(pollingRef.current);
            setSeparatedPrints({
              id: currentOverlap.id,
              printA: currentOverlap.separated_image_1_url || currentOverlap.SeparatedImage1URL,
              printB: currentOverlap.separated_image_2_url || currentOverlap.SeparatedImage2URL
            });
            setIsProcessing(false); setStage('completed');
          } else if (currentOverlap.processing_status === 'failed') {
            clearInterval(pollingRef.current);
            alert("Processing failed: " + currentOverlap.processing_log);
            setIsProcessing(false); setStage('upload');
          }
        }
      }, 3000);
    } catch (error) {
      alert("Upload failed."); setIsProcessing(false); setStage('upload');
    }
  };

  const handleVerifyComponent = async (componentIndex) => {
    componentIndex === 1 ? setIsMatchingA(true) : setIsMatchingB(true);
    try {
      const token = await getToken(); setAuthToken(token);
      const matchRes = await matchService.runMatch(separatedPrints.id);
      const specificMatch = matchRes.data.results.find(m => m.component_index === componentIndex && m.status === "found" || m.is_match);
      
      componentIndex === 1 ? setMatchResultA({ matched: !!specificMatch }) : setMatchResultB({ matched: !!specificMatch });
    } catch (err) {
      alert("Verification failed.");
    } finally {
      componentIndex === 1 ? setIsMatchingA(false) : setIsMatchingB(false);
    }
  };

  // --- DIRECT MATCH HANDLERS ---
  const handleDirectMatch = async () => {
    if (!directFile) return;
    setIsDirectMatching(true); setDirectMatchResult(null);
    try {
      const token = await getToken(); setAuthToken(token);
      const matchRes = await matchService.runDirectMatch(directFile);
      const successfulMatch = matchRes.data.results.find(m => m.is_match || m.status === "found");
      setDirectMatchResult({ matched: !!successfulMatch });
    } catch (err) {
      alert("Direct Match failed.");
    } finally {
      setIsDirectMatching(false);
    }
  };


  // ================= RENDER BLOCKS =================

  if (mode === 'menu') {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Fingerprint Hub</h1>
          <p className="text-slate-400 mt-2">Select an operational workflow to begin.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => setMode('separate')} className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-8 rounded-2xl text-left transition-all cursor-pointer">
            <div className="w-14 h-14 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 mb-6"><SplitSquareHorizontal className="w-7 h-7" /></div>
            <h3 className="text-xl font-bold text-white mb-2">Overlap Fingerprint Processing</h3>
            <p className="text-slate-400 text-sm">Upload a latent overlap, extract individual ridges, and verify against the database.</p>
          </button>
          <button onClick={() => setMode('match')} className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-8 rounded-2xl text-left transition-all cursor-pointer">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 mb-6"><Database className="w-7 h-7" /></div>
            <h3 className="text-xl font-bold text-white mb-2">Direct Fingerprint Matching</h3>
            <p className="text-slate-400 text-sm">Upload a single, clean fingerprint image to search the database directly.</p>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'separate') {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in slide-in-from-right">
        <div className="flex items-center gap-4">
          <button onClick={resetToMenu} className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="text-3xl font-bold text-white">Overlap Processing</h1></div>
        </div>

        {stage === 'upload' && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center">
              <input type="file" id="fp-up" className="hidden" accept="image/*" onChange={(e) => { setFile(e.target.files[0]); setPreview(URL.createObjectURL(e.target.files[0])); }} />
              <label htmlFor="fp-up" className="cursor-pointer flex flex-col items-center">
                {preview ? <img src={preview} className="h-64 object-contain rounded-lg mb-4" /> : <Upload className="w-12 h-12 text-indigo-500 mb-4" />}
                <span className="text-slate-300 font-medium">Select Latent Print Image</span>
              </label>
            </div>
            <button onClick={handleSeparate} disabled={!file || isProcessing} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex justify-center gap-2 cursor-pointer">
              <Layers className="w-5 h-5" /> Execute Separation
            </button>
          </div>
        )}

        {stage === 'processing' && (
           <div className="bg-slate-900 border border-slate-800 p-16 rounded-2xl text-center space-y-6">
             <Loader2 className="w-16 h-16 text-indigo-500 mx-auto animate-spin" />
             <h3 className="text-2xl font-bold text-white">Algorithm Processing...</h3>
           </div>
        )}

        {stage === 'completed' && (
          <div className="grid grid-cols-2 gap-8">
             {/* Subject A Box */}
             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col">
               <span className="text-lg font-bold text-white mb-4">Subject A (Background)</span>
               <img src={formatImageUrl(separatedPrints.printA)} className="h-48 w-full object-contain rounded-lg bg-slate-950 mb-6" />
               {!matchResultA ? (
                 <button onClick={() => handleVerifyComponent(1)} disabled={isMatchingA} className="mt-auto py-3 bg-slate-800 hover:bg-emerald-600 text-white rounded-xl font-bold flex justify-center gap-2 cursor-pointer">
                   {isMatchingA ? <Search className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                   Match Subject A
                 </button>
               ) : (
                 <div className={`mt-auto p-4 rounded-xl text-center border ${matchResultA.matched ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' : 'bg-rose-900/30 border-rose-500/50 text-rose-400'}`}>
                   {matchResultA.matched ? 'Positive Verification Found' : 'No Match Found'}
                 </div>
               )}
             </div>

             {/* Subject B Box */}
             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col">
               <span className="text-lg font-bold text-white mb-4">Subject B (Foreground)</span>
               <img src={formatImageUrl(separatedPrints.printB)} className="h-48 w-full object-contain rounded-lg bg-slate-950 mb-6" />
               {!matchResultB ? (
                 <button onClick={() => handleVerifyComponent(2)} disabled={isMatchingB} className="mt-auto py-3 bg-slate-800 hover:bg-emerald-600 text-white rounded-xl font-bold flex justify-center gap-2 cursor-pointer">
                   {isMatchingB ? <Search className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                   Match Subject B
                 </button>
               ) : (
                 <div className={`mt-auto p-4 rounded-xl text-center border ${matchResultB.matched ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' : 'bg-rose-900/30 border-rose-500/50 text-rose-400'}`}>
                   {matchResultB.matched ? 'Positive Verification Found' : 'No Match Found'}
                 </div>
               )}
             </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'match') {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right">
        <div className="flex items-center gap-4">
          <button onClick={resetToMenu} className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="text-3xl font-bold text-white">Direct Verification</h1></div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
          <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center hover:border-emerald-500/50 transition mb-6">
            <input type="file" id="direct-up" className="hidden" accept="image/*" onChange={(e) => { setDirectFile(e.target.files[0]); setDirectPreview(URL.createObjectURL(e.target.files[0])); setDirectMatchResult(null); }} />
            <label htmlFor="direct-up" className="cursor-pointer flex flex-col items-center">
              {directPreview ? <img src={directPreview} className="h-64 object-contain rounded-lg mb-4" /> : <Upload className="w-12 h-12 text-emerald-500 mb-4" />}
              <span className="text-slate-300 font-medium">Select Fingerprint Image to Match</span>
            </label>
          </div>

          <button onClick={handleDirectMatch} disabled={!directFile || isDirectMatching} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer">
            {isDirectMatching ? <Search className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
            Run Database Verification
          </button>
        </div>

        {directMatchResult && (
          <div className={`p-8 rounded-2xl border text-center ${directMatchResult.matched ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500/30'}`}>
            <h4 className="text-2xl font-bold text-white mb-2">{directMatchResult.matched ? 'Positive Verification' : 'Verification Rejected'}</h4>
            <p className={directMatchResult.matched ? "text-emerald-400" : "text-rose-400"}>
              {directMatchResult.matched ? "A match was found in the Target Database." : "No match found in Target Database."}
            </p>
          </div>
        )}
      </div>
    );
  }
}