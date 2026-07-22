import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { adminService, setAuthToken } from '../../services/api';
import { Database, Upload, FileSignature, MonitorSmartphone, Loader2, CheckCircle, AlertCircle, Trash2, Fingerprint, RefreshCw, Tag, Calendar, User, IdCard, Phone, MapPin, Hash } from 'lucide-react';

export default function TargetDatabase() {
  const { getToken } = useAuth();
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [label, setLabel] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [proofType, setProofType] = useState('Aadhar Card');
  const [proofID, setProofID] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
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
    if (!file || !label || !fullName || !age || !proofType || !proofID) {
      setErrorMsg("Please fill in all required fields (Image, Full Name, Finger Position, Age, ID Proof Type, and ID Number).");
      return;
    }

    setIsUploading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const token = await getToken();
      setAuthToken(token);

      const formData = new FormData();
      formData.append("image", file);
      formData.append("label", label);
      formData.append("full_name", fullName);
      formData.append("age", age);
      formData.append("gender", gender);
      formData.append("proof_type", proofType);
      formData.append("proof_id", proofID);
      if (contact) formData.append("contact", contact);
      if (address) formData.append("address", address);
      if (deviceMeta) formData.append("metadata", deviceMeta);

      await adminService.uploadTargetPrint(formData);
      setSuccessMsg(`Successfully registered target record for: ${fullName} (${label})`);
      setFile(null); setPreview(null); setLabel(''); setFullName(''); setAge(''); setProofID(''); setContact(''); setAddress(''); setDeviceMeta('');
      fetchFingerprints();
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
      alert("Failed to delete target record.");
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
          Register new target biometric profiles with full verification credentials into the central matching matrix.
        </p>
      </div>

      {/* Registration Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-amber-500" /> New Target Profile Registration
        </h3>

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
          {/* Column 1: Image Upload */}
          <div className="flex flex-col space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Target Print Image *</label>
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center min-h-[280px] relative transition hover:border-amber-500/50 flex-1">
              <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" required />
              {preview ? (
                <img src={preview} alt="Target Print" className="max-h-56 rounded-lg object-contain" />
              ) : (
                <div className="text-center text-slate-500 pointer-events-none p-4">
                  <Upload className="w-10 h-10 mx-auto mb-3 text-amber-500/40 animate-pulse" />
                  <p className="font-bold text-slate-200 text-sm">Upload Friction Ridge Print</p>
                  <p className="text-xs text-slate-500 mt-1">Click or drag clean PNG, JPG image file here</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Personal Identity Details */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Target Identity Details *</label>
            
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                <User className="w-3.5 h-3.5 text-amber-500" /> Full Name *
              </label>
              <input 
                type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} 
                placeholder="e.g., Rajesh Kumar / Jane Doe"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-amber-500/50 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                  <Hash className="w-3.5 h-3.5 text-amber-500" /> Age *
                </label>
                <input 
                  type="number" min="1" max="120" value={age} onChange={(e) => setAge(e.target.value)} 
                  placeholder="e.g., 34"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-amber-500/50 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">Gender *</label>
                <select 
                  value={gender} onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                <Tag className="w-3.5 h-3.5 text-indigo-400" /> Finger Position / Label *
              </label>
              <input 
                type="text" value={label} onChange={(e) => setLabel(e.target.value)} 
                placeholder="e.g., Right Index Finger / Left Thumb"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-indigo-500/50 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact Number (Optional)
              </label>
              <input 
                type="text" value={contact} onChange={(e) => setContact(e.target.value)} 
                placeholder="e.g., +91 9876543210"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-slate-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Column 3: Verification Proof & Address */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Proof & Address Details</label>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                  <IdCard className="w-3.5 h-3.5 text-amber-500" /> ID Proof Type *
                </label>
                <select 
                  value={proofType} onChange={(e) => setProofType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                >
                  <option value="Aadhar Card">Aadhar Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driver's License">Driver's License</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="National ID">National ID Card</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                  <FileSignature className="w-3.5 h-3.5 text-amber-500" /> Proof ID / Serial Number *
                </label>
                <input 
                  type="text" value={proofID} onChange={(e) => setProofID(e.target.value)} 
                  placeholder="e.g., 5489-2039-4821"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-amber-500/50 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Residential Address (Optional)
                </label>
                <textarea 
                  rows="2" value={address} onChange={(e) => setAddress(e.target.value)} 
                  placeholder="e.g., House No. 42, Sector 15, New Delhi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-slate-600 focus:outline-none resize-none"
                />
              </div>
            </div>

            <button 
              type="submit" disabled={!file || !fullName || !label || !proofID || isUploading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:bg-slate-800 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 mt-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Registering Target Record...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" /> Commit Target Record To Database
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Target Database Matrix / Registered Fingerprints List */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-emerald-400" /> Registered Target Records ({fingerprints.length})
          </h3>
          <button
            onClick={fetchFingerprints}
            disabled={isLoadingList}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition cursor-pointer"
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
            <p className="text-xs text-slate-500 mt-1">Upload a clean target profile above to populate the matching matrix.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
            {fingerprints.map((fp) => (
              <div 
                key={fp.id || fp._id} 
                className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between transition group shadow-lg"
              >
                <div className="space-y-4">
                  {/* Fingerprint Thumbnail */}
                  <div className="h-44 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center p-2 relative">
                    {fp.image_url && !imgErrors[fp.id || fp._id] ? (
                      <img 
                        src={formatImgUrl(fp.image_url)} 
                        alt={fp.full_name || fp.label} 
                        className="max-h-full object-contain filter contrast-125 transition-transform group-hover:scale-105" 
                        onError={() => setImgErrors(prev => ({ ...prev, [fp.id || fp._id]: true }))}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500 space-y-1">
                        <Fingerprint className="w-10 h-10 text-amber-500/60" />
                        <span className="text-[10px] font-mono text-slate-400">TEMPLATE REGISTERED</span>
                      </div>
                    )}
                    <span className="absolute top-2 right-2 px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full uppercase tracking-wider">
                      Active Target
                    </span>
                  </div>

                  {/* Target Person Identity Card */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="font-bold text-white text-base truncate flex items-center gap-2">
                        <User className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        {fp.full_name || "Unnamed Target"}
                      </h4>
                      {fp.age && (
                        <span className="bg-slate-800 text-slate-300 text-[11px] font-semibold px-2 py-0.5 rounded">
                          {fp.age} yrs • {fp.gender || 'M'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-400 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">FINGER LABEL</span>
                        <span className="text-indigo-300 font-sans font-semibold">{fp.label || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">PROOF TYPE</span>
                        <span className="text-slate-200 font-sans">{fp.proof_type || "N/A"}</span>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-mono">PROOF ID:</span>
                        <span className="text-amber-400 font-mono font-bold">{fp.proof_id || "N/A"}</span>
                      </div>
                      {fp.contact && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-mono">CONTACT:</span>
                          <span className="text-slate-300">{fp.contact}</span>
                        </div>
                      )}
                      {fp.address && (
                        <div className="text-[11px] pt-1 border-t border-slate-800/60 text-slate-400 truncate">
                          <span className="text-slate-500 font-mono">ADDR: </span>{fp.address}
                        </div>
                      )}
                    </div>

                    {fp.created_at && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                        <Calendar className="w-3 h-3 text-slate-600" />
                        <span>Registered: {new Date(fp.created_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 mt-3 flex justify-end">
                  <button 
                    onClick={() => handleDelete(fp.id || fp._id, fp.full_name || fp.label)}
                    disabled={deletingId === (fp.id || fp._id)}
                    className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 transition cursor-pointer"
                  >
                    {deletingId === (fp.id || fp._id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )} Delete Profile
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