import axios from "axios";
import { useAuthStore } from "../store/authStore";

const getBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;

  const host = window.location.hostname;
  // If we are accessing via IP (like on mobile), use the same IP for the backend
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return `http://${host}:5000/api/v1`;
  }

  // Fallback to localhost
  return "http://localhost:5000/api/v1";
};

const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isAuthRequest = error.config?.url?.includes("/auth/");
    const token = useAuthStore.getState().token;
    const isDemoToken = token && (token.startsWith("demo_") || token.includes("demo"));

    // Do NOT force logout or redirect if using demo sessions or during auth requests
    if (error.response?.status === 401 && !isAuthRequest && !isDemoToken) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  register:       (data) => api.post("/auth/register", data),
  login:          (data) => api.post("/auth/login", data),
  logout:         ()     => api.post("/auth/logout"),
  verifyOTP:      (data) => api.post("/auth/verify-otp", data),
  resendOTP:      (data) => api.post("/auth/resend-otp", data),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword:  (data) => api.post("/auth/reset-password", data),
  getMe:          ()     => api.get("/auth/me"),
};

// ── Patients ──────────────────────────────────────────────────
export const patientAPI = {
  getProfile:     ()     => api.get("/patients/me"),
  updateProfile:  (data) => api.put("/patients/me", data),
  getDashboard:   ()     => api.get("/patients/dashboard"),
};

// ── Doctors ───────────────────────────────────────────────────
export const doctorAPI = {
  getAll:         (params) => api.get("/doctors", { params }),
  getById:        (id)     => api.get(`/doctors/${id}`),
  getMyProfile:   ()       => api.get("/doctors/me"),
  getDashboard:   ()       => api.get("/doctors/dashboard"),
  getAppointments:(params) => api.get("/doctors/appointments", { params }),
  updateProfile:  (data)   => api.put("/doctors/me", data),
};

// ── Appointments ──────────────────────────────────────────────
export const appointmentAPI = {
  book:           (data)   => api.post("/appointments", data),
  getAll:         (params) => api.get("/appointments", { params }),
  getById:        (id)     => api.get(`/appointments/${id}`),
  update:         (id, data) => api.patch(`/appointments/${id}`, data),
  cancel:         (id)     => api.patch(`/appointments/${id}/cancel`),
  getSlots:       (doctorId, date) => api.get(`/appointments/slots/${doctorId}`, { params: { date } }),
};

// ── Medical Records ───────────────────────────────────────────
export const recordAPI = {
  getAll:         (params) => api.get("/records", { params }),
  getById:        (id)     => api.get(`/records/${id}`),
  upload:         (data)   => api.post("/records", data, { headers: { "Content-Type": undefined } }),
  delete:         (id)     => api.delete(`/records/${id}`),
};

// ── Prescriptions ─────────────────────────────────────────────
export const prescriptionAPI = {
  getAll:         (params) => api.get("/prescriptions", { params }),
  getById:        (id)     => api.get(`/prescriptions/${id}`),
  create:         (data)   => api.post("/prescriptions", data),
};

// ── Notifications ─────────────────────────────────────────────
export const notificationAPI = {
  getAll:         ()       => api.get("/notifications"),
  markRead:       (id)     => api.patch(`/notifications/${id}/read`),
  markAllRead:    ()       => api.patch("/notifications/read-all"),
};

// ── Payments ──────────────────────────────────────────────────
export const paymentAPI = {
  initiate:       (data)   => api.post("/payments/initiate", data),
  getHistory:     (params) => api.get("/payments", { params }),
  getById:        (id)     => api.get(`/payments/${id}`),
};

// ── Admin ─────────────────────────────────────────────────────
export const adminAPI = {
  getUsers:       (params) => api.get("/admin/users", { params }),
  updateUser:     (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser:     (id)     => api.delete(`/admin/users/${id}`),
  getPendingDoctors: ()    => api.get("/admin/doctors/pending"),
  verifyDoctor:   (id, data) => api.patch(`/admin/doctors/${id}/verify`, data),
  getAnalytics:   ()       => api.get("/admin/analytics"),
  getLogs:        (params) => api.get("/admin/logs", { params }),
};

// ── Chat ──────────────────────────────────────────────────────
export const chatAPI = {
  getConversations: ()     => api.get("/chat/conversations"),
  getMessages:    (id, params) => api.get(`/chat/conversations/${id}/messages`, { params }),
  sendMessage:    (id, data)   => api.post(`/chat/conversations/${id}/messages`, data),
  createOrGet:    (data)       => api.post("/chat/conversations", data),
};

// ── Lab Tests ─────────────────────────────────────────────────
export const labAPI = {
  getTests:       ()       => api.get("/lab-tests"),
  book:           (data)   => api.post("/lab-tests/book", data),
  getBookings:    ()       => api.get("/lab-tests/bookings"),
};

// ── Articles ──────────────────────────────────────────────────
export const articleAPI = {
  getAll:         (params) => api.get("/articles", { params }),
  getById:        (id)     => api.get(`/articles/${id}`),
};

// ── Feedback ──────────────────────────────────────────────────
export const feedbackAPI = {
  submit:         (data)   => api.post("/feedback", data),
  getAll:         (params) => api.get("/feedback", { params }),
};

export default api;
