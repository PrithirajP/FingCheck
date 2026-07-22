import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { adminService, setAuthToken } from '../../services/api';
import { Layers, Search, Loader2, CheckCircle2, Clock, AlertTriangle, Eye, RefreshCw, SplitSquareHorizontal, User, Calendar } from 'lucide-react';

export default function OverlapAnalysis() {
  const { getToken } = useAuth();
  const [overlaps, setOverlaps] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOverlap, setSelectedOverlap] = useState(null);

  const fetchOverlaps = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      setAuthToken(token);
      const data = await adminService.getAllOverlaps(page, 10);
      setOverlaps(data.data?.overlaps || []);
      setTotal(data.data?.total || 0);
    } catch (err) {
      console.error("Failed to fetch overlaps:", err);
      setError("Failed to load overlap analysis records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverlaps();
  }, [page]);

  const filteredOverlaps = overlaps.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.processing_status?.toLowerCase() === filterStatus.toLowerCase();
  });

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-7 h-7 text-amber-500" />
            System Overlap Analysis
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Global administrative matrix for tracking and inspecting all user-submitted fingerprint separation workflows.
          </p>
        </div>
        <button
          onClick={fetchOverlaps}
          disabled={isLoading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-medium rounded-xl transition"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Matrix
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {['all', 'completed', 'processing', 'pending', 'failed'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
              filterStatus === st
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Main Content Table or Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-400 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
          <p className="text-sm">Fetching system overlap records...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredOverlaps.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl text-slate-500">
          <Layers className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-300">No Overlap Records Found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            No fingerprint separation tasks match the selected filter. Standard users can upload overlapping prints in their pipeline workspace.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOverlaps.map((item) => (
            <div
              key={item.id || item._id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              {/* Image Preview & Details */}
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {item.original_image_url ? (
                    <img
                      src={item.original_image_url}
                      alt="Overlap Print"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <SplitSquareHorizontal className="w-8 h-8 text-slate-700" />
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-amber-500/80 font-bold">
                      ID: {item.id || item._id}
                    </span>
                    {getStatusBadge(item.processing_status)}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      Uploader ID: <span className="font-mono text-slate-300 ml-1">{item.uploaded_by || 'System'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions & Status details */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedOverlap(item)}
                  className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-xl text-sm font-medium transition flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" /> Inspect Separation
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for detailed inspection */}
      {selectedOverlap && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <SplitSquareHorizontal className="w-5 h-5 text-amber-500" />
                  Overlap Case Details
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {selectedOverlap.id || selectedOverlap._id}</p>
              </div>
              <button
                onClick={() => setSelectedOverlap(null)}
                className="text-slate-400 hover:text-white p-2 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              {/* Original */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-slate-400">Original Overlap</p>
                <div className="h-44 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                  {selectedOverlap.original_image_url ? (
                    <img src={selectedOverlap.original_image_url} alt="Original" className="max-h-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-600">No Image</span>
                  )}
                </div>
              </div>

              {/* Print A */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-amber-400">Separated Component A</p>
                <div className="h-44 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                  {selectedOverlap.separated_print_a_url ? (
                    <img src={selectedOverlap.separated_print_a_url} alt="Print A" className="max-h-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-600">Processing / N/A</span>
                  )}
                </div>
              </div>

              {/* Print B */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-indigo-400">Separated Component B</p>
                <div className="h-44 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                  {selectedOverlap.separated_print_b_url ? (
                    <img src={selectedOverlap.separated_print_b_url} alt="Print B" className="max-h-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-600">Processing / N/A</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedOverlap(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
