import { Upload, Layers } from 'lucide-react';

export default function SeparationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Fingerprint Separation</h2>
        <p className="text-slate-400 text-sm">Isolate latent overlapping configurations.</p>
      </div>

      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
        <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-900/50">
          <Upload className="w-10 h-10 mx-auto text-slate-500 mb-2" />
          <p className="text-slate-300 font-medium">Upload latent fingerprint image</p>
        </div>
        <button className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2">
          <Layers className="w-5 h-5" />
          Execute Separation
        </button>
      </div>
    </div>
  );
}