import axios from 'axios';

// Use the browser's current hostname so the API works from any device on the network
const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Optionally redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  getCaptcha: () => api.get('/auth/captcha'),
};

// Participant API endpoints
export const participantAPI = {
  // Profile
  getProfile: () => api.get('/participant/profile'),
  updateProfile: (data) => api.put('/participant/profile', data),
  changePassword: (data) => api.put('/participant/change-password', data),
  
  // Preferences
  getPreferences: () => api.get('/participant/preferences'),
  updatePreferences: (data) => api.put('/participant/preferences', data),
  
  // Clubs
  followClub: (organizerId) => api.post(`/participant/clubs/${organizerId}/follow`),
  unfollowClub: (organizerId) => api.delete(`/participant/clubs/${organizerId}/follow`),
  getFollowedClubs: () => api.get('/participant/clubs/following'),
  
  // Events
  registerForEvent: (eventId, data = {}) => api.post(`/participant/events/${eventId}/register`, data),
  cancelRegistration: (eventId) => api.delete(`/participant/events/${eventId}/register`),
  getRegisteredEvents: () => api.get('/participant/events/registered'),
  
  // Dashboard
  getDashboard: () => api.get('/participant/dashboard'),

  // Payment proof upload (Merchandise)
  uploadPaymentProof: (registrationId, formData) => api.post(
    `/advanced/registrations/${registrationId}/payment-proof`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  ),
};

// Organizer API endpoints
export const organizerAPI = {
  // Dashboard
  getDashboard: () => api.get('/organizer/dashboard'),
  getOngoingEvents: () => api.get('/organizer/ongoing-events'),
  
  // Events
  createEvent: (data) => api.post('/organizer/events', data),
  getEventDetails: (eventId) => api.get(`/organizer/events/${eventId}`),
  updateEvent: (eventId, data) => api.put(`/organizer/events/${eventId}`, data),
  deleteEvent: (eventId) => api.delete(`/organizer/events/${eventId}`),
  publishEvent: (eventId) => api.post(`/organizer/events/${eventId}/publish`),
  cancelEvent: (eventId) => api.post(`/organizer/events/${eventId}/cancel`),
  endEventEarly: (eventId) => api.post(`/organizer/events/${eventId}/end-early`),
  
  // Participants / Registrations
  getEventParticipants: (eventId) => api.get(`/organizer/events/${eventId}/participants`),
  getEventRegistrations: (eventId) => api.get(`/organizer/events/${eventId}/registrations`),
  updateRegistrationStatus: (eventId, registrationId, status) => 
    api.put(`/organizer/events/${eventId}/registrations/${registrationId}`, { status }),
  exportParticipantsCSV: (eventId) => api.get(`/organizer/events/${eventId}/participants/export`, {
    responseType: 'blob'
  }),
  
  // Analytics
  getEventAnalytics: (eventId) => api.get(`/organizer/events/${eventId}/analytics`),
  
  // Profile
  getProfile: () => api.get('/organizer/profile'),
  updateProfile: (data) => api.put('/organizer/profile', data),
  changePassword: (data) => api.put('/organizer/change-password', data),
  
  // Webhook
  updateWebhookSettings: (data) => api.put('/organizer/webhook', data),
  testWebhook: (webhookUrl) => api.post('/organizer/webhook/test', { webhookUrl }),
  
  requestPasswordReset: () => api.post('/organizer/request-password-reset'),

  // Merchandise Payment Workflow (Tier A)
  getMerchandiseOrders: (eventId) => api.get(`/advanced/organizer/events/${eventId}/merchandise-orders`),
  approvePayment: (eventId, registrationId) => api.post(`/advanced/organizer/events/${eventId}/orders/${registrationId}/approve`),
  rejectPayment: (eventId, registrationId, reason) => api.post(`/advanced/organizer/events/${eventId}/orders/${registrationId}/reject`, { reason }),

  // QR Scanner & Attendance (Tier A)
  markAttendance: (eventId, qrData) => api.post(`/advanced/organizer/events/${eventId}/attendance/scan`, { qrData }),
  manualAttendance: (eventId, registrationId) => api.post(`/advanced/organizer/events/${eventId}/attendance/${registrationId}/manual`),
  getAttendanceStats: (eventId) => api.get(`/advanced/organizer/events/${eventId}/attendance`),
  exportAttendanceCSV: (eventId) => api.get(`/advanced/organizer/events/${eventId}/attendance/export`, { responseType: 'blob' }),
};

// Admin API endpoints
export const adminAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/admin/dashboard'),
  
  // Organizers
  getOrganizers: () => api.get('/admin/organizers'),
  createOrganizer: (data) => api.post('/admin/organizers', data),
  getAllOrganizers: () => api.get('/admin/organizers'),
  updateOrganizer: (organizerId, data) => api.put(`/admin/organizers/${organizerId}`, data),
  updateOrganizerStatus: (organizerId, status) => 
    api.patch(`/admin/organizers/${organizerId}/status`, { status }),
  toggleOrganizerStatus: (organizerId) => api.patch(`/admin/organizers/${organizerId}/toggle-status`),
  deleteOrganizer: (organizerId) => api.delete(`/admin/organizers/${organizerId}`),
  
  // Password resets
  getPasswordResetRequests: () => api.get('/admin/password-reset-requests'),
  resetOrganizerPassword: (organizerId, newPassword) => 
    api.post(`/admin/organizers/${organizerId}/reset-password`, { newPassword }),
  
  // View all
  getAllParticipants: () => api.get('/admin/participants'),
  getAllEvents: () => api.get('/admin/events'),
  
  // Initialize admin
  initializeAdmin: (data) => api.post('/admin/initialize', data),
};

// Public Event API endpoints
export const eventAPI = {
  // Browse events
  getEvents: (params = {}) => api.get('/events', { params }),
  getTrendingEvents: () => api.get('/events/trending'),
  getCategories: () => api.get('/events/categories'),
  getEventDetails: (eventId) => api.get(`/events/${eventId}`),
  
  // Organizers
  getOrganizers: () => api.get('/events/organizers'),
  getOrganizerDetails: (organizerId) => api.get(`/events/organizers/${organizerId}`),
};

// Discussion Forum API endpoints (Tier B)
export const forumAPI = {
  getMessages: (eventId, page = 1) => api.get(`/advanced/events/${eventId}/forum`, { params: { page } }),
  postMessage: (eventId, data) => api.post(`/advanced/events/${eventId}/forum`, data),
  togglePin: (eventId, messageId) => api.patch(`/advanced/events/${eventId}/forum/${messageId}/pin`),
  deleteMessage: (eventId, messageId) => api.delete(`/advanced/events/${eventId}/forum/${messageId}`),
  toggleReaction: (eventId, messageId, emoji) => api.post(`/advanced/events/${eventId}/forum/${messageId}/react`, { emoji }),
};

// Task API endpoints (from tutorial)
export const taskAPI = {
  getAllTasks: () => api.get('/tasks'),
  getTask: (id) => api.get(`/tasks/${id}`),
  createTask: (taskData) => api.post('/tasks', taskData),
  updateTask: (id, taskData) => api.put(`/tasks/${id}`, taskData),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
};

export default api;
