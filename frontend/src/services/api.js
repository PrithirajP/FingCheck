import axios from 'axios';

// Ensure this matches your Go server's address
const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// We will call this from our React components when a user logs in via Clerk
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// --- USER & SEPARATION SERVICES ---
export const overlapService = {
  // Uploads the image and triggers async processing on the Go backend
  upload: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    
    // Using the current endpoint from your router.go. 
    // If you move this out of the admin group in Go, remove the '/admin' prefix here.
    const response = await api.post('/admin/overlaps', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Fetches overlaps to check if "ProcessingStatus" is complete
  getMyOverlaps: async () => {
    const response = await api.get('/overlaps/my');
    return response.data;
  }
};

// --- MATCHING SERVICES ---
export const matchService = {
  // Triggers the match against the database
  runMatch: async (overlapId) => {
    const response = await api.post('/match', {
      overlap_fingerprint_id: overlapId
    });
    return response.data;
  },
  
  // Gets history of user matches
  getMyMatches: async () => {
    const response = await api.get('/me/matches');
    return response.data;
  }
};

// --- ADMIN SERVICES ---
export const adminService = {
  // Flow A: User Management
  getAllUsers: async (page = 1, pageSize = 10) => {
    const response = await api.get(`/admin/users?page=${page}&page_size=${pageSize}`);
    return response.data;
  },
  updateRole: async (id, role) => {
    const response = await api.put(`/admin/users/${id}/role`, { role });
    return response.data;
  },
  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  // Flow B: Target Database
  uploadTargetPrint: async (file, label, deviceMeta = "") => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('label', label);
    if (deviceMeta) formData.append('metadata', deviceMeta);
    
    const response = await api.post('/admin/fingerprints', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Flow C & D: Admin Overlap & Matching
  getAllOverlaps: async (page = 1, pageSize = 10) => {
    const response = await api.get(`/admin/overlaps?page=${page}&page_size=${pageSize}`);
    return response.data;
  },
  getOverlapById: async (id) => {
    const response = await api.get(`/admin/overlaps/${id}`);
    return response.data;
  },
  getAllMatches: async (page = 1, pageSize = 10) => {
    const response = await api.get(`/admin/matches?page=${page}&page_size=${pageSize}`);
    return response.data;
  }
};

export default api;