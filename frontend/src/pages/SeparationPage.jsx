import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Upload, Layers, CheckCircle2, Fingerprint, Search, User, XCircle, Loader2 } from 'lucide-react';
import { overlapService, setAuthToken } from '../services/api';

export default function SeparationPage() {
  const { getToken } = useAuth();
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [stage, setStage] = useState('upload'); 
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [separatedPrints, setSeparatedPrints] = useState({ id: null, printA: null, printB: null });
  const pollingRef = useRef(null);

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setStage('upload');
    }
  };

  const handleSeparate = async () => {
    if (!file) return;
    setIsProcessing(true);
    setStage('processing');

    try {
      const token = await getToken();
      setAuthToken(token);

      const uploadRes = await overlapService.upload(file);
      const newOverlapId = uploadRes.data.id;

      pollingRef.current = setInterval(async () => {
        const checkRes = await overlapService.getMyOverlaps();
        const currentOverlap = checkRes.data.find(o => o.id === newOverlapId);

        if (currentOverlap) {
          // DEBUG LOG: Prints the exact JSON object from Go to your browser console
          console.log("RAW BACKEND DATA:", currentOverlap);

          if (currentOverlap.processing_status === 'completed') {
            clearInterval(pollingRef.current);
            setSeparatedPrints({
              id: currentOverlap.id,
              // Adding fallbacks just in case the JSON casing is strictly capitalized
              printA: currentOverlap.separated_image_1_url || currentOverlap.SeparatedImage1URL,
              printB: currentOverlap.separated_image_2_url || currentOverlap.SeparatedImage2URL
            });
            setIsProcessing(false);
            setStage('completed');
          } else if (currentOverlap.processing_status === 'failed') {
            clearInterval(pollingRef.current);
            alert("Backend processing failed: " + currentOverlap.processing_log);
            setIsProcessing(false);
            setStage('upload');
          }
        }
      }, 3000);

    } catch (error) {
      console.error("Separation Error:", error);
      alert("Failed to upload fingerprint.");
      setIsProcessing(false);
      setStage('upload');
    }
  };

  // Safe URL formatter that prevents crashes if the path is missing
  const formatImageUrl = (path) => {
    if (!path) return null;
    return `http://localhost:8080/${path.replace(/\\/g, '/')}`;
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Fingerprint Pipeline</h1>
        <p className="text-slate-400 mt-2">Upload an overlapping latent print to isolate individual ridge structures.</p>
      </div>

      {stage === 'upload' && (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
          <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center hover:bg-slate-800/50 transition">
            <input type="file" id="fp-upload" className="hidden" accept="image/png, image/jpeg" onChange={handleFileChange} />
            <label htmlFor="fp-upload" className="cursor-pointer flex flex-col items-center">
              {preview ? (
                <img src={preview} alt="Preview" className="h-64 object-contain rounded-lg shadow-lg mb-4" />
              ) : (
                <Upload className="w-12 h-12 text-indigo-500 mb-4" />
              )}
              <span className="text-slate-300 font-medium">Select Latent Print Image</span>
            </label>
          </div>
          <button 
            onClick={handleSeparate} disabled={!file || isProcessing}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-semibold py-3 rounded-xl flex justify-center gap-2"
          >
            <Layers className="w-5 h-5" /> Execute Separation Algorithm
          </button>
        </div>
      )}

      {stage === 'processing' && (
        <div className="bg-slate-900 border border-slate-800 p-16 rounded-2xl text-center space-y-6">
          <Loader2 className="w-16 h-16 text-indigo-500 mx-auto animate-spin" />
          <h3 className="text-2xl font-bold text-white">Algorithm Processing</h3>
          <p className="text-slate-400">Communicating with Python Microservice. Extracting minutiae and separating ridge flows...</p>
        </div>
      )}

      {stage === 'completed' && (
        <div className="bg-slate-900 border border-emerald-500/30 p-8 rounded-2xl text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white">Separation Successful</h3>
          <p className="text-slate-400 mb-8">Isolated prints have been saved to the database. Overlap ID: {separatedPrints.id}</p>
          
          <div className="grid grid-cols-2 gap-8">
             <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
               <span className="text-sm font-bold text-slate-500 block mb-2">Subject A (Background)</span>
               {separatedPrints.printA ? (
                 <img 
                   src={formatImageUrl(separatedPrints.printA)} 
                   alt="Subject A" 
                   className="h-48 w-full object-contain rounded-lg shadow-md" 
                 />
               ) : (
                 <div className="h-48 bg-slate-800 rounded flex items-center justify-center text-slate-500 font-mono text-sm">IMAGE DATA MISSING</div>
               )}
             </div>
             <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
               <span className="text-sm font-bold text-slate-500 block mb-2">Subject B (Foreground)</span>
               {separatedPrints.printB ? (
                 <img 
                   src={formatImageUrl(separatedPrints.printB)} 
                   alt="Subject B" 
                   className="h-48 w-full object-contain rounded-lg shadow-md" 
                 />
               ) : (
                 <div className="h-48 bg-slate-800 rounded flex items-center justify-center text-slate-500 font-mono text-sm">IMAGE DATA MISSING</div>
               )}
             </div>
          </div>
          <button onClick={() => { setFile(null); setPreview(null); setStage('upload'); }} className="mt-8 px-6 py-2 bg-slate-800 hover:bg-slate-700 transition text-white rounded-lg">Process Another Print</button>
        </div>
      )}
    </div>
  );
}