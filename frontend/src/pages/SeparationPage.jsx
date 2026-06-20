import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Upload, Layers, CheckCircle2, Fingerprint, Search, Loader2, Database, ArrowLeft, SplitSquareHorizontal, Scale } from 'lucide-react';
import { overlapService, matchService, setAuthToken } from '../services/api';

export default function SeparationPage() {
  const { getToken } = useAuth();
  const [mode, setMode] = useState('menu'); 

  // --- GLOBAL STATE ---
  const [overlaps, setOverlaps] = useState([]); // Holds DB overlap records

  // --- OVERLAP STATE ---
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

  // --- TRUE 1-TO-1 COMPARE STATE ---
  const [compFile1, setCompFile1] = useState(null); // Can be a File object OR a string URL
  const [compPreview1, setCompPreview1] = useState(null);
  const [compFile2, setCompFile2] = useState(null); // Can be a File object OR a string URL
  const [compPreview2, setCompPreview2] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareResult, setCompareResult] = useState(null);

  // --- EFFECTS ---
  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  // Fetch past overlaps when entering Match or Compare modes
  useEffect(() => {
    if (mode === 'match' || mode === 'compare') {
      const fetchOverlaps = async () => {
        const token = await getToken(); setAuthToken(token);
        try {
          const res = await overlapService.getMyOverlaps();
          setOverlaps(res.data?.filter(o => o.processing_status === 'completed') || []);
        } catch (err) {
          console.error("Failed to load overlaps", err);
        }
      };
      fetchOverlaps();
    }
  }, [mode, getToken]);


  // --- UTILS ---
  const resetToMenu = () => {
    setMode('menu');
    setFile(null); setPreview(null); setStage('upload');
    setMatchResultA(null); setMatchResultB(null);
    setDirectFile(null); setDirectPreview(null); setDirectMatchResult(null);
    setCompFile1(null); setCompPreview1(null); setCompFile2(null); setCompPreview2(null); setCompareResult(null);
  };

  const formatImageUrl = (path) => path ? `http://localhost:8080/${path.replace(/\\/g, '/')}` : null;


  // --- HANDLERS ---
  const handleSeparate = async () => {
    if (!file) return;
    setIsProcessing(true); setStage('processing');
    
    try {
      const token = await getToken(); 
      setAuthToken(token);
      
      // 1. Upload the file
      const uploadRes = await overlapService.upload(file);
      
      // Safely extract the ID depending on the exact API response wrapper
      const newOverlapId = uploadRes.data?.id || uploadRes.data?.data?.id || uploadRes.id;

      // 2. Poll for specific status updates every 2 seconds
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await overlapService.getOverlapStatus(newOverlapId);
          const currentOverlap = statusRes.data || statusRes;

          if (currentOverlap.processing_status === 'completed') {
            clearInterval(pollingRef.current);
            setSeparatedPrints({
              id: currentOverlap.id,
              printA: currentOverlap.separated_image_1_url || currentOverlap.SeparatedImage1URL,
              printB: currentOverlap.separated_image_2_url || currentOverlap.SeparatedImage2URL
            });
            setIsProcessing(false); 
            setStage('completed');
            
          } else if (currentOverlap.processing_status === 'failed') {
            clearInterval(pollingRef.current);
            alert("Processing failed: " + currentOverlap.processing_log);
            setIsProcessing(false); 
            setStage('upload');
          }
          // If status is 'pending' or 'processing', it will just loop again
          
        } catch (pollErr) {
          console.error("Polling error:", pollErr);
          clearInterval(pollingRef.current);
          alert("Error checking separation status.");
          setIsProcessing(false); 
          setStage('upload');
        }
      }, 2000);

    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed."); 
      setIsProcessing(false); 
      setStage('upload');
    }
  };

  const handleVerifyComponent = async (componentIndex) => {
    componentIndex === 1 ? setIsMatchingA(true) : setIsMatchingB(true);
    try {
      const token = await getToken(); setAuthToken(token);
      const matchRes = await matchService.runMatch(separatedPrints.id);
      const specificMatch = matchRes.data.results.find(m => m.component_index === componentIndex && (m.status === "found" || m.is_match));
      componentIndex === 1 ? setMatchResultA({ matched: !!specificMatch }) : setMatchResultB({ matched: !!specificMatch });
    } catch (err) {
      alert("Verification failed.");
    } finally {
      componentIndex === 1 ? setIsMatchingA(false) : setIsMatchingB(false);
    }
  };

  const handleDirectMatch = async () => {
    if (!directFile) return;
    setIsDirectMatching(true); setDirectMatchResult(null);
    try {
      const token = await getToken(); setAuthToken(token);
      // If user selected from dropdown, it's a URL. We must convert it to a File.
      let fileToUpload = directFile;
      if (typeof directFile === 'string') {
        const res = await fetch(directFile);
        const blob = await res.blob();
        fileToUpload = new File([blob], "target_print.png", { type: blob.type });
      }

      const matchRes = await matchService.runDirectMatch(fileToUpload);
      const successfulMatch = matchRes.data.results.find(m => m.is_match || m.status === "found");
      setDirectMatchResult({ matched: !!successfulMatch });
    } catch (err) {
      alert("Direct Match failed.");
    } finally {
      setIsDirectMatching(false);
    }
  };

  const handleCompare = async () => {
    if (!compFile1 || !compFile2) return;
    setIsComparing(true); setCompareResult(null);
    try {
      const token = await getToken(); setAuthToken(token);
      
      // Helper to dynamically convert URLs back to File objects for the Go backend
      const ensureFile = async (source, filename) => {
        if (source instanceof File) return source;
        const res = await fetch(source);
        const blob = await res.blob();
        return new File([blob], filename, { type: blob.type });
      };

      const f1 = await ensureFile(compFile1, "probe.png");
      const f2 = await ensureFile(compFile2, "target.png");

      const res = await matchService.compareTwo(f1, f2);
      setCompareResult({ matched: res.data.is_match, score: res.data.score });
    } catch (err) {
      console.error(err);
      alert("Comparison failed.");
    } finally {
      setIsComparing(false);
    }
  };


  // ================= RENDER COMPONENTS =================

  // Reusable UI for selecting/uploading a print in the Compare and Direct Match views
  const renderSelectionBox = (label, fileState, previewState, setFile, setPreview) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center flex flex-col h-full">
      <span className="text-sm font-bold text-slate-400 block mb-4">{label}</span>
      
      <select 
        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-amber-500 focus:outline-none mb-4"
        onChange={(e) => {
          if(e.target.value) {
            setFile(e.target.value);
            setPreview(e.target.value);
          }
        }}
      >
        <option value="">-- Select from Database --</option>
        {overlaps.map(o => {
          const img1 = o.separated_image_1_url || o.SeparatedImage1URL;
          const img2 = o.separated_image_2_url || o.SeparatedImage2URL;
          return (
            <optgroup key={o.id} label={`Overlap ID: ${o.id.slice(-6)}`}>
              {img1 && <option value={formatImageUrl(img1)}>Subject A (Background)</option>}
              {img2 && <option value={formatImageUrl(img2)}>Subject B (Foreground)</option>}
            </optgroup>
          );
        })}
      </select>

      <div className="relative flex items-center py-2 mb-2">
         <div className="flex-grow border-t border-slate-800"></div>
         <span className="flex-shrink-0 mx-4 text-xs text-slate-500 font-bold">OR UPLOAD</span>
         <div className="flex-grow border-t border-slate-800"></div>
      </div>

      <input type="file" id={`upload-${label}`} className="hidden" accept="image/*" onChange={(e) => { 
        if(e.target.files[0]) {
          setFile(e.target.files[0]); 
          setPreview(URL.createObjectURL(e.target.files[0])); 
        }
      }} />
      <label htmlFor={`upload-${label}`} className="cursor-pointer flex flex-col items-center border-2 border-dashed border-slate-700 rounded-xl p-4 hover:border-amber-500/50 transition flex-grow justify-center">
        {previewState ? <img src={previewState} className="h-40 object-contain rounded-lg" /> : <Upload className="w-8 h-8 text-amber-500 mb-2" />}
      </label>
    </div>
  );


  // ================= MAIN RENDER =================

  if (mode === 'menu') {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Fingerprint Hub</h1>
          <p className="text-slate-400 mt-2">Select an operational workflow to begin.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button onClick={() => setMode('separate')} className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-2xl text-left transition-all cursor-pointer">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 mb-4"><SplitSquareHorizontal className="w-6 h-6" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Overlap Pipeline</h3>
            <p className="text-slate-400 text-xs">Separate an overlapping latent print into two distinct images.</p>
          </button>
          
          <button onClick={() => setMode('match')} className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-2xl text-left transition-all cursor-pointer">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 mb-4"><Database className="w-6 h-6" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Database Search</h3>
            <p className="text-slate-400 text-xs">Search the entire Target Database using a single known print.</p>
          </button>

          <button onClick={() => setMode('compare')} className="group bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-6 rounded-2xl text-left transition-all cursor-pointer">
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 mb-4"><Scale className="w-6 h-6" /></div>
            <h3 className="text-lg font-bold text-white mb-2">True 1-to-1 Match</h3>
            <p className="text-slate-400 text-xs">Upload or select two prints side-by-side to directly compare them.</p>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'compare') {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right">
        <div className="flex items-center gap-4">
          <button onClick={resetToMenu} className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="text-3xl font-bold text-white">Side-by-Side Comparison</h1></div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {renderSelectionBox("Print A (Probe)", compFile1, compPreview1, setCompFile1, setCompPreview1)}
          {renderSelectionBox("Print B (Target)", compFile2, compPreview2, setCompFile2, setCompPreview2)}
        </div>

        <button onClick={handleCompare} disabled={!compFile1 || !compFile2 || isComparing} className="w-full py-4 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-800 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer">
          {isComparing ? <Search className="w-5 h-5 animate-spin" /> : <Scale className="w-5 h-5" />}
          Run Minutiae Comparison
        </button>

        {compareResult && (
          <div className={`p-8 rounded-2xl border text-center ${compareResult.matched ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500/30'}`}>
            <h4 className="text-2xl font-bold text-white mb-2">{compareResult.matched ? 'Match Confirmed' : 'Mismatch'}</h4>
            <p className={compareResult.matched ? "text-emerald-400" : "text-rose-400"}>
              Engine Confidence Score: {compareResult.score.toFixed(2)}
            </p>
          </div>
        )}
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
          <div><h1 className="text-3xl font-bold text-white">Database Verification</h1></div>
        </div>

        {renderSelectionBox("Select Fingerprint Image to Match", directFile, directPreview, setDirectFile, setDirectPreview)}

        <button onClick={handleDirectMatch} disabled={!directFile || isDirectMatching} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer">
          {isDirectMatching ? <Search className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
          Run Database Verification
        </button>

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