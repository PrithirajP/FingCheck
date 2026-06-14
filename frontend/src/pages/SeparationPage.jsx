import { useState, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Upload, Layers, CheckCircle2, Fingerprint, Search, User, XCircle } from 'lucide-react';
import { overlapService, matchService, setAuthToken } from '../services/api';

export default function SeparationPage() {
  const { getToken } = useAuth(); // Grab Clerk auth function
  
  // --- STATE MANAGEMENT ---
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [stage, setStage] = useState('upload'); 
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Holds data from the backend
  const [separatedPrints, setSeparatedPrints] = useState({ id: null, printA: null, printB: null });
  const [matchResult, setMatchResult] = useState(null);

  // Store the polling interval so we can clear it if needed
  const pollingRef = useRef(null);

  // --- HANDLERS ---
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setStage('upload');
    }
  };

  // STEP 2: Run Separation (Upload to Go -> Poll for Completion)
  const handleSeparate = async () => {
    setIsProcessing(true);
    
    try {
      // 1. Authorize the request
      const token = await getToken();
      setAuthToken(token);

      // 2. Upload the file to Go backend
      const uploadRes = await overlapService.upload(file);
      
      // Go returns data inside a 'data' object usually (e.g., uploadRes.data.id)
      // Adjust this property path if your Go response structure differs slightly!
      const overlapId = uploadRes.data.id; 

      // 3. Start polling the backend to see when the goroutine finishes
      pollingRef.current = setInterval(async () => {
        try {
          const myOverlapsRes = await overlapService.getMyOverlaps();
          const myOverlaps = myOverlapsRes.data; // Array of user's overlaps
          
          // Find the exact one we just uploaded
          const currentOverlap = myOverlaps.find(o => o.id === overlapId);

          if (currentOverlap) {
            // Check the status defined in your Go models (adjust strings if they are different in Go)
            if (currentOverlap.processing_status === 'completed') {
              clearInterval(pollingRef.current);
              
              setSeparatedPrints({
                id: overlapId,
                // Make sure these match the JSON keys your Go model returns for the separated images
                printA: currentOverlap.component_a_url || preview, 
                printB: currentOverlap.component_b_url || preview,
              });
              
              setIsProcessing(false);
              setStage('separated');
            } else if (currentOverlap.processing_status === 'failed') {
              clearInterval(pollingRef.current);
              setIsProcessing(false);
              alert("Server failed to process the fingerprint.");
            }
          }
        } catch (pollError) {
          console.error("Polling error:", pollError);
        }
      }, 2000); // Check every 2 seconds

    } catch (error) {
      console.error("Upload failed:", error);
      setIsProcessing(false);
      alert("Failed to connect to the server.");
    }
  };

  // STEP 4: Run Match Functionality
  const handleMatch = async () => {
    setIsProcessing(true);
    
    try {
      const token = await getToken();
      setAuthToken(token);

      // Send the parent Overlap ID to the match handler
      const matchRes = await matchService.runMatch(separatedPrints.id);
      const results = matchRes.data.results; // Array of match results from Go

      // Check if any component found a match
      const successfulMatch = results.find(r => r.is_match === true);

      if (successfulMatch) {
        setMatchResult({
          matched: true,
          personName: successfulMatch.status === 'found' ? 'Identity Confirmed' : 'Unknown', 
          // Note: Your Go MatchHandler currently hides the matched name/confidence for non-admins. 
          // It only returns 'found' or 'not found'.
        });
      } else {
        setMatchResult({ matched: false });
      }

      setIsProcessing(false);
      setStage('matched');

    } catch (error) {
      console.error("Matching failed:", error);
      setIsProcessing(false);
      alert("Failed to run match verification.");
    }
  };

  const handleReset = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setFile(null);
    setPreview(null);
    setStage('upload');
    setMatchResult(null);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Fingerprint Analysis Pipeline</h2>
        <p className="text-slate-400 text-sm">Upload, separate, and cross-reference latent prints.</p>
      </div>

      {/* STEP 1: Interface to upload image */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
        <div className="relative border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-8 text-center bg-slate-900/50 transition-colors">
          <input 
            type="file" accept="image/*" onChange={handleFileChange} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
          />
          {preview ? (
            <img src={preview} alt="Upload" className="max-h-48 mx-auto rounded-lg object-contain border border-slate-700" />
          ) : (
            <div className="space-y-2 pointer-events-none">
              <Upload className="w-10 h-10 mx-auto text-slate-500 mb-2" />
              <p className="text-slate-300 font-medium">Upload overlapping fingerprint</p>
            </div>
          )}
        </div>

        {stage === 'upload' && (
          <button 
            onClick={handleSeparate} disabled={!file || isProcessing}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? <Search className="w-5 h-5 animate-spin" /> : <Layers className="w-5 h-5" />}
            {isProcessing ? 'Server Processing...' : 'Execute Separation'}
          </button>
        )}
      </div>

      {/* STEP 3: Show separated images */}
      {stage === 'separated' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Separated Outputs</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-center flex flex-col justify-between">
              <img src={separatedPrints.printA} alt="Print A" className="max-h-40 mx-auto rounded-lg mb-4 opacity-80" />
              <button 
                onClick={handleMatch} disabled={isProcessing}
                className="w-full bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-400 border border-slate-700 text-white py-2 rounded-lg transition flex justify-center gap-2 items-center cursor-pointer"
              >
                {isProcessing ? <Search className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                Run Match Verification
              </button>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-center flex flex-col justify-between">
              <img src={separatedPrints.printB} alt="Print B" className="max-h-40 mx-auto rounded-lg mb-4 opacity-80" />
              <button 
                onClick={handleMatch} disabled={isProcessing}
                className="w-full bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-400 border border-slate-700 text-white py-2 rounded-lg transition flex justify-center gap-2 items-center cursor-pointer"
              >
                {isProcessing ? <Search className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                Run Match Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Results */}
      {stage === 'matched' && (
        <div className={`p-8 rounded-2xl text-center animate-in zoom-in duration-500 border ${matchResult.matched ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500/30'}`}>
          {matchResult.matched ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-white mb-2">Fingerprint Matched</h3>
              <div className="inline-flex items-center gap-3 bg-slate-900 px-6 py-3 rounded-full border border-slate-800 mt-4">
                <User className="w-5 h-5 text-indigo-400" />
                <span className="text-white font-bold text-lg">{matchResult.personName}</span>
              </div>
            </>
          ) : (
             <>
              <XCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-white mb-2">No Match Found</h3>
              <p className="text-slate-400">The database does not contain a verified match for these points.</p>
            </>
          )}
          
          <div className="mt-8">
            <button onClick={handleReset} className="text-sm text-slate-400 hover:text-white transition underline cursor-pointer">
              Start New Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}