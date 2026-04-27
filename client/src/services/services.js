import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh-token'),
  getMe: () => api.get('/auth/me'),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  getUsers: (params) => api.get('/auth/users', { params }),
};

export const faceService = {
  registerFace: (data) => api.post('/register/face', data),
  getFaceStatus: (id) => api.get(`/users/${id}/face-status`),
  deleteFaceData: (id) => api.delete(`/users/${id}/face`),
  reEnrollFace: (id) => api.post(`/users/${id}/re-enroll-face`),
  faceReenroll: (token, data) => api.post(`/face-reenroll/${token}`, data),
  getAllFaceStatus: (params) => api.get('/students/face-status', { params }),
};

export const departmentService = {
  create: (data) => api.post('/departments', data),
  getAll: () => api.get('/departments'),
  getOne: (id) => api.get(`/departments/${id}`),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

export const courseService = {
  create: (data) => api.post('/courses', data),
  getAll: (params) => api.get('/courses', { params }),
  getOne: (id) => api.get(`/courses/${id}`),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  enroll: (id, studentIds) => api.post(`/courses/${id}/enroll`, { studentIds }),
  unenroll: (id, studentId) => api.delete(`/courses/${id}/enroll/${studentId}`),
  getStudents: (id) => api.get(`/courses/${id}/students`),
};

export const sessionService = {
  create: (data) => api.post('/sessions', data),
  getAll: (params) => api.get('/sessions', { params }),
  getOne: (id) => api.get(`/sessions/${id}`),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  delete: (id) => api.delete(`/sessions/${id}`),
  regenerateQR: (id, expirySeconds = 10) => api.get(`/sessions/${id}/qr`, { params: { expirySeconds } }),
  manualMark: (id, data) => api.post(`/sessions/${id}/manual-mark`, data),
  facialRecognize: (id, data) => api.post(`/sessions/${id}/facial-recognize`, data),
};

export const attendanceService = {
  markQR: (data) => api.post('/attendance/mark-qr', data),
  markFace: (data) => api.post('/attendance/mark-face', data),
  getSessionAttendance: (id) => api.get(`/attendance/session/${id}`),
  getStudentAttendance: (id, params) => api.get(`/attendance/student/${id}`, { params }),
  getCourseAttendance: (id) => api.get(`/attendance/course/${id}`),
};

export const analyticsService = {
  getCourseAnalytics: (id, params) => api.get(`/analytics/course/${id}`, { params }),
  getStudentAnalytics: (id) => api.get(`/analytics/student/${id}`),
  getDepartmentAnalytics: (id) => api.get(`/analytics/department/${id}`),
  getFaceRegistrationStats: () => api.get('/analytics/face-registration-stats'),
};
