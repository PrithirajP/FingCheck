import { useState } from 'react';
import { Upload, Layers, CheckCircle2, Fingerprint, Search, User } from 'lucide-react';

export default function SeparationPage() {
  // --- STATE MANAGEMENT ---
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  
  // Controls the pipeline stages: 'upload' -> 'separated' -> 'matched'
  const [stage, setStage] = useState('upload'); 
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Holds the data returned from the backend
  const [separatedPrints, setSeparatedPrints] = useState({ printA: null, printB: null });
  const [matchResult, setMatchResult] = useState(null);

  // --- HANDLERS ---
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setStage('upload'); // Reset if they upload a new image
    }
  };

  // STEP 2: Run Separation
  const handleSeparate = async () => {
    setIsProcessing(true);
    // TODO: Wire this to your Go backend overlap_handler later
    setTimeout(() => {
      setSeparatedPrints({
        printA: preview, // Placeholder: Will be actual backend URL
        printB: preview, // Placeholder: Will be actual backend URL
      });
      setIsProcessing(false);
      setStage('separated');
    }, 1500); // Simulating network request
  };

  // STEP 4: Run Match Functionality
  const handleMatch = async (selectedImage) => {
    setIsProcessing(true);
    // TODO: Wire this to your Go backend match_handler later
    setTimeout(() => {
      setMatchResult({
        matched: true,
        personName: "John Doe", // Placeholder: Will come from database
        confidence: "98.4%"
      });
      setIsProcessing(false);
      setStage('matched');
    }, 1500); // Simulating network request
  };

  // Reset the whole pipeline
  const handleReset = () => {
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
            {isProcessing ? 'Processing Separation...' : 'Execute Separation'}
          </button>
        )}
      </div>

      {/* STEP 3: Show separated images with option to match */}
      {stage === 'separated' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Separated Outputs</h3>
          <p className="text-sm text-slate-400">Select which isolated print you wish to run against the database.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Print A Option */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-center flex flex-col justify-between">
              <img src={separatedPrints.printA} alt="Print A" className="max-h-40 mx-auto rounded-lg mb-4 opacity-80" />
              <button 
                onClick={() => handleMatch(separatedPrints.printA)} disabled={isProcessing}
                className="w-full bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-400 hover:border-emerald-500/50 border border-slate-700 text-white py-2 rounded-lg transition flex justify-center gap-2 items-center cursor-pointer"
              >
                {isProcessing ? <Search className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                Match Print A
              </button>
            </div>

            {/* Print B Option */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-center flex flex-col justify-between">
              <img src={separatedPrints.printB} alt="Print B" className="max-h-40 mx-auto rounded-lg mb-4 opacity-80" />
              <button 
                onClick={() => handleMatch(separatedPrints.printB)} disabled={isProcessing}
                className="w-full bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-400 hover:border-emerald-500/50 border border-slate-700 text-white py-2 rounded-lg transition flex justify-center gap-2 items-center cursor-pointer"
              >
                {isProcessing ? <Search className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                Match Print B
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Show Fingerprint Matched and Name */}
      {stage === 'matched' && matchResult && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 p-8 rounded-2xl text-center animate-in zoom-in duration-500">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-3xl font-bold text-white mb-2">Fingerprint Matched</h3>
          
          <div className="inline-flex items-center gap-3 bg-slate-900 px-6 py-3 rounded-full border border-slate-800 mt-4">
            <User className="w-5 h-5 text-indigo-400" />
            <span className="text-slate-300 text-sm uppercase tracking-wider">Identified Subject:</span>
            <span className="text-white font-bold text-lg">{matchResult.personName}</span>
          </div>
          
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