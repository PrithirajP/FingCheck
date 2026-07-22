import axios from "axios";

// Ensure this matches your Go server's address
// Ensure this matches your Go server's address
const API_BASE_URL =
  import.meta.env.VITE_BACKEND_API_URL || import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let globalGetToken = null;

export const setTokenGetter = (fn) => {
  globalGetToken = fn;
};

// We will call this from our React components when a user logs in via Clerk
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// Request Interceptor: Automatically attach Bearer token before every outgoing API request
api.interceptors.request.use(
  async (config) => {
    if (globalGetToken && !config.headers.Authorization) {
      try {
        const token = await globalGetToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.error("Request interceptor token error:", err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: If 401 happens, try refreshing token once using skipCache: true and retry request!
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && globalGetToken) {
      originalRequest._retry = true;
      try {
        const freshToken = await globalGetToken({ skipCache: true });
        if (freshToken) {
          setAuthToken(freshToken);
          originalRequest.headers["Authorization"] = `Bearer ${freshToken}`;
          return api(originalRequest);
        }
      } catch (retryErr) {
        console.error("Failed to auto-refresh token on 401:", retryErr);
      }
    }
    return Promise.reject(error);
  }
);

// --- USER & SEPARATION SERVICES ---
export const overlapService = {
  // Uploads the image and triggers async processing on the Go backend
  upload: async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    const response = await api.post("/overlaps", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // Fetches overlaps to check if "ProcessingStatus" is complete
  getMyOverlaps: async () => {
    const response = await api.get("/overlaps/my");
    return response.data;
  },

  // FIX: Moved getOverlapStatus here so SeparationPage.jsx can find it
  getOverlapStatus: async (id) => {
    const response = await api.get(`/overlaps/${id}`);
    return response.data;
  },
};

// --- MATCHING SERVICES ---
export const matchService = {
  runMatch: async (overlapId) => {
    const response = await api.post("/match", {
      overlap_fingerprint_id: overlapId,
    });
    return response.data;
  },

  runDirectMatch: async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await api.post("/match/direct", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  compareTwo: async (file1, file2) => {
    const formData = new FormData();
    formData.append("image1", file1);
    formData.append("image2", file2);
    const response = await api.post("/match/compare", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  getMyMatches: async () => {
    const response = await api.get("/me/matches");
    return response.data;
  },
};

// --- ADMIN SERVICES ---
export const adminService = {

  getSystemStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },
  getAllUsers: async (page = 1, pageSize = 10) => {
    const response = await api.get(
      `/admin/users?page=${page}&page_size=${pageSize}`,
    );
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

  uploadTargetPrint: async (formDataOrFile, label, deviceMeta = "") => {
    let formData = formDataOrFile;
    if (!(formDataOrFile instanceof FormData)) {
      formData = new FormData();
      formData.append("image", formDataOrFile);
      formData.append("label", label);
      if (deviceMeta) formData.append("metadata", deviceMeta);
    }

    const response = await api.post("/admin/fingerprints", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  getAllFingerprints: async (page = 1, pageSize = 20) => {
    const response = await api.get(`/admin/fingerprints?page=${page}&page_size=${pageSize}`);
    return response.data;
  },

  deleteFingerprint: async (id) => {
    const response = await api.delete(`/admin/fingerprints/${id}`);
    return response.data;
  },

  getAllOverlaps: async (page = 1, pageSize = 10) => {
    const response = await api.get(
      `/admin/overlaps?page=${page}&page_size=${pageSize}`,
    );
    return response.data;
  },
  getOverlapById: async (id) => {
    const response = await api.get(`/admin/overlaps/${id}`);
    return response.data;
  },
  getAllMatches: async (page = 1, pageSize = 10) => {
    const response = await api.get(
      `/admin/matches?page=${page}&page_size=${pageSize}`,
    );
    return response.data;
  },

  getAuditLogs: async (page = 1, pageSize = 50) => {
    const response = await api.get(
      `/admin/audit-logs?page=${page}&page_size=${pageSize}`,
    );
    return response.data;
  },
  // Removed getOverlapStatus from here as it is now in overlapService
};

export default api;