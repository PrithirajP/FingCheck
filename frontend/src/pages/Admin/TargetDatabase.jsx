import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { adminService, setAuthToken } from '../../services/api';
import { Database, Upload, FileSignature, MonitorSmartphone, Loader2, CheckCircle, AlertCircle, Trash2, Fingerprint, RefreshCw, Tag, Calendar } from 'lucide-react';

export default function TargetDatabase() {
  const { getToken } = useAuth();
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [label, setLabel] = useState('');
  const [deviceMeta, setDeviceMeta] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Target Database List State
  const [fingerprints, setFingerprints] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchFingerprints = async () => {
    setIsLoadingList(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      const res = await adminService.getAllFingerprints(1, 50);
      setFingerprints(res.data?.fingerprints || []);
    } catch (err) {
      console.error("Failed to load target database fingerprints:", err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchFingerprints();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setErrorMsg('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !label) return;

    setIsUploading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const token = await getToken();
      setAuthToken(token);

      await adminService.uploadTargetPrint(file, label, deviceMeta);
      setSuccessMsg(`Successfully registered: ${label}`);
      setFile(null); setPreview(null); setLabel(''); setDeviceMeta('');
      fetchFingerprints(); // Refresh target list
    } catch (error) {
      console.error("Target upload error:", error);
      let serverMsg = "";
      if (typeof error.response?.data === 'string') {
        serverMsg = error.response.data;
      } else if (error.response?.data) {
        serverMsg = error.response.data.message || error.response.data.errors || error.response.data.error;
      }
      if (!serverMsg) serverMsg = error.message || "Failed to upload target print to database.";
      if (serverMsg.includes("Invalid or expired token")) {
        serverMsg = "Session token expired. Please refresh the page to refresh your authentication token.";
      }
      setErrorMsg(serverMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id, targetLabel) => {
    if (!window.confirm(`Are you sure you want to delete "${targetLabel}" from the target matrix?`)) return;
    setDeletingId(id);
    try {
      const token = await getToken();
      setAuthToken(token);
      await adminService.deleteFingerprint(id);
      fetchFingerprints();
    } catch (err) {
      alert("Failed to delete fingerprint record.");
    } finally {
      setDeletingId(null);
    }
  };

  const [imgErrors, setImgErrors] = useState({});

  const formatImgUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('res.cloudinary.com')) return `https://${url}`;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    const backendUrl = import.meta.env.VITE_BACKEND_API_URL 
      ? import.meta.env.VITE_BACKEND_API_URL.replace(/\/api\/v1\/?$/, '') 
      : 'http://localhost:8080';
    return `${backendUrl}${cleanPath}`;
  };

  return (
    <div className="space-y-10 max-w-6xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Database className="w-6 h-6 text-amber-500" /> Target Database Management
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Register new biometric templates into the central matching matrix and inspect existing target records.
        </p>
      </div>

      {/* Registration Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-amber-500" /> New Template Registration
        </h3>

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[260px] relative transition hover:border-amber-500/50">
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

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5">
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

      {/* Target Database Matrix / Registered Fingerprints List */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-emerald-400" /> Registered Target Fingerprints ({fingerprints.length})
          </h3>
          <button
            onClick={fetchFingerprints}
            disabled={isLoadingList}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} /> Refresh Matrix
          </button>
        </div>

        {isLoadingList ? (
          <div className="flex items-center justify-center p-12 text-slate-400 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-3" /> Loading target records...
          </div>
        ) : fingerprints.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/30 border border-slate-800/80 rounded-2xl text-slate-500">
            <Database className="w-10 h-10 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-medium text-slate-400">No Target Fingerprints Registered</p>
            <p className="text-xs text-slate-500 mt-1">Upload a clean fingerprint above to populate the target matrix.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fingerprints.map((fp) => (
              <div 
                key={fp.id || fp._id} 
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition group"
              >
                <div className="space-y-3">
                  <div className="h-40 bg-slate-950 border border-slate-800/80 rounded-xl overflow-hidden flex items-center justify-center p-2 relative">
                    {fp.image_url && !imgErrors[fp.id || fp._id] ? (
                      <img 
                        src={formatImgUrl(fp.image_url)} 
                        alt={fp.label} 
                        className="max-h-full object-contain filter contrast-125 transition-transform group-hover:scale-105" 
                        onError={() => setImgErrors(prev => ({ ...prev, [fp.id || fp._id]: true }))}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500 space-y-1">
                        <Fingerprint className="w-10 h-10 text-amber-500/60" />
                        <span className="text-[10px] font-mono text-slate-400">TEMPLATE REGISTERED</span>
                      </div>
                    )}
                    <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full uppercase">
                      Active
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      {fp.label || "Unnamed Print"}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-500 truncate mt-1">ID: {fp.id || fp._id}</p>
                    {fp.created_at && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-slate-600" />
                        {new Date(fp.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/60 mt-4 flex items-center justify-end">
                  <button
                    onClick={() => handleDelete(fp.id || fp._id, fp.label)}
                    disabled={deletingId === (fp.id || fp._id)}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                  >
                    {deletingId === (fp.id || fp._id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}