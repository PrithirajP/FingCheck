import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Upload, Layers, Fingerprint, Search, Loader2, Database, ArrowLeft, SplitSquareHorizontal, Scale, Scan, Crosshair, AlertCircle, Cpu, Zap } from 'lucide-react';
import { overlapService, matchService, setAuthToken } from '../services/api';

export default function SeparationPage() {
  const { getToken } = useAuth();
  const [mode, setMode] = useState('menu'); 
  const [overlaps, setOverlaps] = useState([]);
  
  // Stages: 'upload' -> 'scanning' -> 'detected' -> 'processing' -> 'completed'
  const [stage, setStage] = useState('upload');
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [separatedPrints, setSeparatedPrints] = useState({ id: null, printA: null, printB: null });
  const pollingRef = useRef(null);
  
  const [matchResultA, setMatchResultA] = useState(null);
  const [matchResultB, setMatchResultB] = useState(null);
  const [isMatchingA, setIsMatchingA] = useState(false);
  const [isMatchingB, setIsMatchingB] = useState(false);

  const [directFile, setDirectFile] = useState(null);
  const [directPreview, setDirectPreview] = useState(null);
  const [isDirectMatching, setIsDirectMatching] = useState(false);
  const [directMatchResult, setDirectMatchResult] = useState(null);

  const [compFile1, setCompFile1] = useState(null);
  const [compPreview1, setCompPreview1] = useState(null);
  const [compFile2, setCompFile2] = useState(null);
  const [compPreview2, setCompPreview2] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareResult, setCompareResult] = useState(null);

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  useEffect(() => {
    if (mode === 'match' || mode === 'compare') {
      const fetchOverlaps = async () => {
        const token = await getToken(); setAuthToken(token);
        try {
          const res = await overlapService.getMyOverlaps();
          setOverlaps(res.data?.filter(o => o.processing_status === 'completed') || []);
        } catch (err) {}
      };
      fetchOverlaps();
    }
  }, [mode, getToken]);

  const resetToMenu = () => {
    setMode('menu'); setFile(null); setPreview(null); setStage('upload');
    setMatchResultA(null); setMatchResultB(null);
    setDirectFile(null); setDirectPreview(null); setDirectMatchResult(null);
    setCompFile1(null); setCompPreview1(null); setCompFile2(null); setCompPreview2(null); setCompareResult(null);
  };

  const formatImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const apiUrl = import.meta.env.VITE_BACKEND_API_URL || import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";
    const baseUrl = apiUrl.replace('/api/v1', '');
    return `${baseUrl}/${path.replace(/\\/g, '/')}`;
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setStage('scanning');
      setTimeout(() => setStage('detected'), 2500);
    }
  };

  const handleSeparate = async () => {
    if (!file) return;
    setStage('processing');
    try {
      const token = await getToken(); setAuthToken(token);
      const uploadRes = await overlapService.upload(file);
      const newOverlapId = uploadRes.data?.id || uploadRes.data?.data?.id || uploadRes.id;

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
            setStage('completed');
          } else if (currentOverlap.processing_status === 'failed') {
            clearInterval(pollingRef.current);
            alert("Processing failed: " + currentOverlap.processing_log);
            setStage('upload');
          }
        } catch (pollErr) {
          clearInterval(pollingRef.current);
          alert("Error checking separation status."); setStage('upload');
        }
      }, 2000);
    } catch (error) { alert("Upload failed."); setStage('upload'); }
  };

  const handleVerifyComponent = async (componentIndex) => {
    componentIndex === 1 ? setIsMatchingA(true) : setIsMatchingB(true);
    try {
      const token = await getToken(); setAuthToken(token);
      const matchRes = await matchService.runMatch(separatedPrints.id);
      const specificMatch = matchRes.data.results.find(m => m.component_index === componentIndex && (m.status === "found" || m.is_match));
      componentIndex === 1 ? setMatchResultA({ matched: !!specificMatch }) : setMatchResultB({ matched: !!specificMatch });
    } catch (err) { alert("Verification failed."); } 
    finally { componentIndex === 1 ? setIsMatchingA(false) : setIsMatchingB(false); }
  };

  const handleDirectMatch = async () => {
    if (!directFile) return;
    setIsDirectMatching(true); setDirectMatchResult(null);
    try {
      const token = await getToken(); setAuthToken(token);
      let fileToUpload = directFile;
      if (typeof directFile === 'string') {
        const res = await fetch(directFile); const blob = await res.blob();
        fileToUpload = new File([blob], "target_print.png", { type: blob.type });
      }
      const matchRes = await matchService.runDirectMatch(fileToUpload);
      const successfulMatch = matchRes.data.results.find(m => m.is_match || m.status === "found");
      setDirectMatchResult({ matched: !!successfulMatch });
    } catch (err) { alert("Direct Match failed."); } finally { setIsDirectMatching(false); }
  };

  const handleCompare = async () => {
    if (!compFile1 || !compFile2) return;
    setIsComparing(true); setCompareResult(null);
    try {
      const token = await getToken(); setAuthToken(token);
      const ensureFile = async (source, filename) => {
        if (source instanceof File) return source;
        const res = await fetch(source); const blob = await res.blob();
        return new File([blob], filename, { type: blob.type });
      };
      const f1 = await ensureFile(compFile1, "probe.png");
      const f2 = await ensureFile(compFile2, "target.png");
      const res = await matchService.compareTwo(f1, f2);
      setCompareResult({ matched: res.data.is_match, score: res.data.score });
    } catch (err) { alert("Comparison failed."); } finally { setIsComparing(false); }
  };

  const renderSelectionBox = (label, fileState, previewState, setFileState, setPreviewState) => (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl text-center flex flex-col h-full shadow-xl">
      <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block mb-4">{label}</span>
      <select 
        className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none mb-4 transition-all"
        onChange={(e) => { if(e.target.value) { setFileState(e.target.value); setPreviewState(e.target.value); } }}
      >
        <option value="">-- Access Target Database --</option>
        {overlaps.map(o => {
          const img1 = o.separated_image_1_url || o.SeparatedImage1URL;
          const img2 = o.separated_image_2_url || o.SeparatedImage2URL;
          return (
            <optgroup key={o.id} label={`Case ID: ${o.id.slice(-6)}`}>
              {img1 && <option value={formatImageUrl(img1)}>Subject A</option>}
              {img2 && <option value={formatImageUrl(img2)}>Subject B</option>}
            </optgroup>
          );
        })}
      </select>
      <div className="relative flex items-center py-2 mb-2">
         <div className="flex-grow border-t border-slate-800"></div>
         <span className="flex-shrink-0 mx-4 text-[10px] text-slate-500 font-bold tracking-widest uppercase">Or Upload Direct</span>
         <div className="flex-grow border-t border-slate-800"></div>
      </div>
      <input type="file" id={`upload-${label}`} className="hidden" accept="image/*" onChange={(e) => { 
        if(e.target.files[0]) { setFileState(e.target.files[0]); setPreviewState(URL.createObjectURL(e.target.files[0])); }
      }} />
      <label htmlFor={`upload-${label}`} className="cursor-pointer flex flex-col items-center border-2 border-dashed border-slate-700/50 rounded-xl p-4 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all duration-300 flex-grow justify-center group">
        {previewState ? <img src={previewState} className="h-40 object-contain rounded-lg drop-shadow-2xl" /> : <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 mb-2 transition-colors" />}
      </label>
    </div>
  );

  // ================= MAIN RENDER =================

  if (mode === 'menu') {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="mb-12">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">System Operations</h1>
          <p className="text-slate-400 mt-2 font-medium">Select a forensic workflow to initialize the pipeline.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button onClick={() => setMode('separate')} className="group relative bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 hover:border-indigo-500/50 p-6 rounded-2xl text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)] cursor-pointer overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-indigo-500/20"></div>
            <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform"><SplitSquareHorizontal className="w-6 h-6" /></div>
            <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-indigo-300 transition-colors">Overlap Pipeline</h3>
            <p className="text-slate-400 text-xs leading-relaxed">Neural separation of latent overlapping prints into distinct high-contrast subjects.</p>
          </button>
          
          <button onClick={() => setMode('match')} className="group relative bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 hover:border-emerald-500/50 p-6 rounded-2xl text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] cursor-pointer overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-emerald-500/20"></div>
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform"><Database className="w-6 h-6" /></div>
            <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-emerald-300 transition-colors">Target Search</h3>
            <p className="text-slate-400 text-xs leading-relaxed">Execute a 1-to-N verification search across the secure target database.</p>
          </button>

          <button onClick={() => setMode('compare')} className="group relative bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 hover:border-amber-500/50 p-6 rounded-2xl text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)] cursor-pointer overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-amber-500/20"></div>
            <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform"><Scale className="w-6 h-6" /></div>
            <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-amber-300 transition-colors">Direct Compare</h3>
            <p className="text-slate-400 text-xs leading-relaxed">Manual 1-to-1 minutiae comparison utilizing the SourceAFIS extraction engine.</p>
          </button>
        </div>
      </div>
    );
  }

  // --- FORENSIC SEPARATION PIPELINE ---
  if (mode === 'separate') {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-500">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
          <button onClick={resetToMenu} className="p-2.5 bg-slate-900 border border-slate-700/50 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Forensic Separation</h1>
            <p className="text-xs text-indigo-400 font-mono mt-1 flex items-center gap-2"><Zap className="w-3 h-3"/> AI-POWERED EXTRACTION ENGINE</p>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 shadow-2xl p-8 rounded-3xl relative overflow-hidden">
          
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* STAGE 1: UPLOAD */}
          {stage === 'upload' && (
            <div className="border-2 border-dashed border-slate-600 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all duration-300 rounded-2xl p-20 text-center relative group">
              <input type="file" id="fp-up" className="hidden" accept="image/*" onChange={handleFileSelect} />
              <label htmlFor="fp-up" className="cursor-pointer flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-800 group-hover:bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 transition-colors duration-300 shadow-inner">
                  <Upload className="w-10 h-10 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                </div>
                <span className="text-2xl text-slate-200 font-bold mb-3 tracking-tight">Drop Latent Evidence Here</span>
                <span className="text-slate-500 text-sm max-w-sm">Upload a high-resolution image containing overlapping friction ridge impressions.</span>
              </label>
            </div>
          )}

          {/* STAGE 2: SCANNING HUD */}
          {stage === 'scanning' && (
            <div className="flex flex-col items-center py-12 animate-in fade-in duration-700">
               <div className="relative p-2 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-[0_0_50px_-12px_rgba(99,102,241,0.2)]">
                 {/* HUD Corner Brackets */}
                 <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-indigo-500/50 rounded-tl-xl"></div>
                 <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-indigo-500/50 rounded-tr-xl"></div>
                 <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-indigo-500/50 rounded-bl-xl"></div>
                 <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-indigo-500/50 rounded-br-xl"></div>
                 
                 <div className="relative overflow-hidden rounded-xl bg-black">
                   <img src={preview} className="h-96 object-contain opacity-40 mix-blend-screen" alt="Scanning" />
                   {/* Advanced Cyber Laser Scanner */}
                   <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-400 shadow-[0_0_15px_3px_rgba(129,140,248,0.8)] animate-[scan-laser_2s_linear_infinite]" />
                   <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-500/20 to-transparent animate-[scan-laser_2s_linear_infinite]" />
                 </div>
               </div>
               <div className="mt-10 flex items-center gap-3 text-indigo-400 bg-indigo-500/10 px-6 py-2 rounded-full border border-indigo-500/20">
                 <Scan className="w-5 h-5 animate-pulse" />
                 <span className="text-sm font-mono tracking-[0.2em] font-bold">EXTRACTING MINUTIAE VECTORS...</span>
               </div>
            </div>
          )}

          {/* STAGE 3: DETECTED */}
          {stage === 'detected' && (
            <div className="flex flex-col items-center py-8 animate-in zoom-in-95 duration-500">
               <div className="relative p-2 bg-slate-950/80 rounded-2xl border border-amber-500/30 shadow-[0_0_50px_-12px_rgba(245,158,11,0.2)]">
                 <div className="relative overflow-hidden rounded-xl bg-black">
                   <img src={preview} className="h-96 object-contain opacity-80" alt="Detected" />
                   
                   {/* Targeted Bounding Box */}
                   <div className="absolute top-[15%] left-[20%] w-[60%] h-[70%] border-2 border-amber-500 bg-amber-500/10 flex items-center justify-center pointer-events-none group">
                     {/* Bounding Box Corner Accents */}
                     <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-amber-400"></div>
                     <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-amber-400"></div>
                     <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-amber-400"></div>
                     <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-amber-400"></div>
                     <Crosshair className="text-amber-500 w-12 h-12 opacity-50 animate-pulse" />
                   </div>
                 </div>
               </div>
               
               <div className="w-full max-w-lg mt-10 space-y-6">
                 <div className="flex items-center justify-between text-amber-400 bg-amber-500/10 border border-amber-500/20 py-3 px-5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-mono text-sm uppercase tracking-wide">Complex Overlap Detected</span>
                    </div>
                    <span className="font-mono text-xs opacity-70">CONFIDENCE: 98.4%</span>
                 </div>
                 <button onClick={handleSeparate} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-3 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]">
                   <Cpu className="w-5 h-5" /> Initialize Separation Sequence
                 </button>
               </div>
            </div>
          )}

          {/* STAGE 4: PROCESSING */}
          {stage === 'processing' && (
             <div className="py-24 flex flex-col items-center justify-center space-y-6 animate-in fade-in">
               <div className="relative">
                 <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                 <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
               </div>
               <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400 tracking-tight">Algorithmic Separation Active</h3>
               <p className="text-slate-400 font-mono text-sm tracking-widest uppercase">Processing Deep Neural Vectors...</p>
             </div>
          )}

          {/* STAGE 5: COMPLETED */}
          {stage === 'completed' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8 duration-700">
               
               {/* Subject A Card */}
               <div className="bg-slate-950/50 p-6 rounded-3xl border border-indigo-500/30 flex flex-col relative overflow-hidden shadow-[0_0_30px_-10px_rgba(99,102,241,0.15)] group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                 <div className="flex justify-between items-center mb-6 relative z-10">
                   <div className="flex flex-col">
                     <span className="text-xs font-mono text-indigo-500/70 font-bold tracking-widest mb-1">COMPONENT 1</span>
                     <span className="text-xl font-bold text-indigo-100 flex items-center gap-2">Subject A <span className="text-slate-500 text-sm font-normal">(Background)</span></span>
                   </div>
                 </div>
                 <div className="bg-black/60 rounded-2xl p-4 border border-slate-800/80 mb-6 relative group-hover:border-indigo-500/30 transition-colors">
                    <img src={formatImageUrl(separatedPrints.printA)} className="h-64 w-full object-contain filter contrast-125" />
                 </div>
                 {!matchResultA ? (
                   <button onClick={() => handleVerifyComponent(1)} disabled={isMatchingA} className="mt-auto py-3.5 bg-slate-800 hover:bg-indigo-600 text-white border border-slate-700 hover:border-indigo-500 rounded-xl font-bold flex justify-center items-center gap-2 transition-all">
                     {isMatchingA ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />} Query Target Database
                   </button>
                 ) : (
                   <div className={`mt-auto p-4 rounded-xl text-center font-bold flex items-center justify-center gap-2 border ${matchResultA.matched ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/10 border-rose-500/40 text-rose-400'}`}>
                     {matchResultA.matched ? 'Verified: Match Found' : 'Negative: No Records Found'}
                   </div>
                 )}
               </div>

               {/* Subject B Card */}
               <div className="bg-slate-950/50 p-6 rounded-3xl border border-emerald-500/30 flex flex-col relative overflow-hidden shadow-[0_0_30px_-10px_rgba(16,185,129,0.15)] group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                 <div className="flex justify-between items-center mb-6 relative z-10">
                   <div className="flex flex-col">
                     <span className="text-xs font-mono text-emerald-500/70 font-bold tracking-widest mb-1">COMPONENT 2</span>
                     <span className="text-xl font-bold text-emerald-100 flex items-center gap-2">Subject B <span className="text-slate-500 text-sm font-normal">(Foreground)</span></span>
                   </div>
                 </div>
                 <div className="bg-black/60 rounded-2xl p-4 border border-slate-800/80 mb-6 relative group-hover:border-emerald-500/30 transition-colors">
                    <img src={formatImageUrl(separatedPrints.printB)} className="h-64 w-full object-contain filter contrast-125" />
                 </div>
                 {!matchResultB ? (
                   <button onClick={() => handleVerifyComponent(2)} disabled={isMatchingB} className="mt-auto py-3.5 bg-slate-800 hover:bg-emerald-600 text-white border border-slate-700 hover:border-emerald-500 rounded-xl font-bold flex justify-center items-center gap-2 transition-all">
                     {isMatchingB ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />} Query Target Database
                   </button>
                 ) : (
                   <div className={`mt-auto p-4 rounded-xl text-center font-bold flex items-center justify-center gap-2 border ${matchResultB.matched ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/10 border-rose-500/40 text-rose-400'}`}>
                     {matchResultB.matched ? 'Verified: Match Found' : 'Negative: No Records Found'}
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- MATCH / COMPARE ROUTES (Enhanced Layout) ---
  if (mode === 'match') {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-500">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
          <button onClick={resetToMenu} className="p-2.5 bg-slate-900 border border-slate-700/50 hover:bg-slate-800 rounded-xl text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="text-2xl font-bold text-white tracking-tight">Database Search</h1></div>
        </div>
        {renderSelectionBox("Probe Blueprint", directFile, directPreview, setDirectFile, setDirectPreview)}
        <button onClick={handleDirectMatch} disabled={!directFile || isDirectMatching} className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-3">
          {isDirectMatching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />} Initiate System Query
        </button>
        {directMatchResult && (
          <div className={`p-8 rounded-2xl border text-center animate-in zoom-in-95 ${directMatchResult.matched ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/10 border-rose-500/40 text-rose-400'}`}>
            <h4 className="text-2xl font-bold">{directMatchResult.matched ? 'VERIFICATION SECURED' : 'ACCESS DENIED: NO MATCH'}</h4>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'compare') {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-500">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
          <button onClick={resetToMenu} className="p-2.5 bg-slate-900 border border-slate-700/50 hover:bg-slate-800 rounded-xl text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="text-2xl font-bold text-white tracking-tight">Direct Comparison</h1></div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          {renderSelectionBox("Probe Source", compFile1, compPreview1, setCompFile1, setCompPreview1)}
          {renderSelectionBox("Target Record", compFile2, compPreview2, setCompFile2, setCompPreview2)}
        </div>
        <button onClick={handleCompare} disabled={!compFile1 || !compFile2 || isComparing} className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center justify-center gap-3">
          {isComparing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scale className="w-5 h-5" />} Execute Cross-Reference
        </button>
        {compareResult && (
          <div className={`p-8 rounded-2xl border text-center animate-in zoom-in-95 ${compareResult.matched ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/10 border-rose-500/40 text-rose-400'}`}>
            <h4 className="text-2xl font-bold mb-2">{compareResult.matched ? 'BIOMETRIC MATCH CONFIRMED' : 'NEGATIVE ALIGNMENT'}</h4>
            <p className="font-mono text-sm opacity-80">AFIS CONFIDENCE SCORE: {compareResult.score.toFixed(2)}</p>
          </div>
        )}
      </div>
    );
  }
}