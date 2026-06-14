import { Upload } from 'lucide-react';

export default function MatchingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Biometric Cross-Matching</h2>
        <p className="text-slate-400 text-sm">Compare standalone prints against database files.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-950 p-8 rounded-xl border border-slate-800 text-center text-slate-500">
          <Upload className="w-8 h-8 mx-auto mb-2" />
          Upload Probe Image
        </div>
        <div className="bg-slate-950 p-8 rounded-xl border border-slate-800 text-center text-slate-500">
          <Upload className="w-8 h-8 mx-auto mb-2" />
          Upload Candidate Image
        </div>
      </div>
      
      <div className="text-center mt-8">
        <button className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold transition text-white">
          Run Analysis Matrix
        </button>
      </div>
    </div>
  );
}