import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { adminService, setAuthToken } from '../../services/api';
import { Database, Upload, FileSignature, MonitorSmartphone, Loader2, CheckCircle } from 'lucide-react';

export default function TargetDatabase() {
  const { getToken } = useAuth();
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [label, setLabel] = useState('');
  const [deviceMeta, setDeviceMeta] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !label) return;

    setIsUploading(true);
    setSuccessMsg('');

    try {
      // Secure the request
      const token = await getToken();
      setAuthToken(token);

      await adminService.uploadTargetPrint(file, label, deviceMeta);
      setSuccessMsg(`Successfully registered: ${label}`);
      setFile(null); setPreview(null); setLabel(''); setDeviceMeta('');
    } catch (error) {
      alert("Failed to upload target print to database.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Target Database Registration</h2>
        <p className="text-slate-400 text-sm">Inject verified prints into the central matching matrix.</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[300px] relative transition hover:border-amber-500/50">
          <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" required />
          {preview ? (
            <img src={preview} alt="Target Print" className="max-h-48 rounded-lg object-contain" />
          ) : (
            <div className="text-center text-slate-500 pointer-events-none">
              <Upload className="w-10 h-10 mx-auto mb-3 text-amber-500/30" />
              <p className="font-medium text-slate-300">Upload Clean Print</p>
              <p className="text-xs mt-1">PNG, JPG (Required)</p>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-amber-500" /> Identity Label
            </label>
            <input 
              type="text" value={label} onChange={(e) => setLabel(e.target.value)} 
              placeholder="e.g., Suspect A - Right Index"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white placeholder-slate-600 focus:border-amber-500/50 focus:outline-none transition"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <MonitorSmartphone className="w-4 h-4 text-slate-500" /> Device Metadata (Optional)
            </label>
            <input 
              type="text" value={deviceMeta} onChange={(e) => setDeviceMeta(e.target.value)} 
              placeholder="e.g., Crossmatch L Scan 500P"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white placeholder-slate-600 focus:border-slate-600 focus:outline-none transition"
            />
          </div>

          <button 
            type="submit" disabled={!file || !label || isUploading}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-800 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
            {isUploading ? 'Registering Template...' : 'Commit to Database'}
          </button>
        </div>
      </form>
    </div>
  );
}