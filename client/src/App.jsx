import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import FaceRegistration from './pages/auth/FaceRegistration';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageDepartments from './pages/admin/ManageDepartments';
import ManageCourses from './pages/admin/ManageCourses';
import ManageUsers from './pages/admin/ManageUsers';
import FaceRegistrationStatus from './pages/admin/FaceRegistrationStatus';

// Faculty pages
import FacultyDashboard from './pages/faculty/Dashboard';
import CreateSession from './pages/faculty/CreateSession';
import SessionDetail from './pages/faculty/SessionDetail';
import Sessions from './pages/faculty/Sessions';
import CourseAnalytics from './pages/faculty/CourseAnalytics';

// Student pages
import StudentDashboard from './pages/student/Dashboard';
import MarkAttendance from './pages/student/MarkAttendance';
import QRScan from './pages/student/QRScan';
import FaceScan from './pages/student/FaceScan';
import MyAttendance from './pages/student/MyAttendance';

// Shared
import NotFound from './pages/shared/NotFound';
import Unauthorized from './pages/shared/Unauthorized';

const queryClient = new QueryClient();

function AppLayout({ children }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-surface-950">
      <Navbar />
      <div className="flex">
        {user && <Sidebar />}
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  const routes = { superadmin: '/admin', admin: '/admin', faculty: '/faculty', student: '/student' };
  return <Navigate to={routes[user.role] || '/login'} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <AppLayout>
              <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/face-registration" element={<FaceRegistration />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Admin */}
                <Route path="/admin" element={<ProtectedRoute roles={['admin', 'superadmin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/departments" element={<ProtectedRoute roles={['admin', 'superadmin']}><ManageDepartments /></ProtectedRoute>} />
                <Route path="/admin/courses" element={<ProtectedRoute roles={['admin', 'superadmin']}><ManageCourses /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute roles={['admin', 'superadmin']}><ManageUsers /></ProtectedRoute>} />
                <Route path="/admin/face-status" element={<ProtectedRoute roles={['admin', 'superadmin']}><FaceRegistrationStatus /></ProtectedRoute>} />

                {/* Faculty */}
                <Route path="/faculty" element={<ProtectedRoute roles={['faculty']}><FacultyDashboard /></ProtectedRoute>} />
                <Route path="/faculty/sessions" element={<ProtectedRoute roles={['faculty']}><Sessions /></ProtectedRoute>} />
                <Route path="/faculty/create-session" element={<ProtectedRoute roles={['faculty']}><CreateSession /></ProtectedRoute>} />
                <Route path="/faculty/session/:id" element={<ProtectedRoute roles={['faculty', 'admin']}><SessionDetail /></ProtectedRoute>} />
                <Route path="/faculty/analytics" element={<ProtectedRoute roles={['faculty']}><CourseAnalytics /></ProtectedRoute>} />

                {/* Student */}
                <Route path="/student" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
                <Route path="/student/mark-attendance" element={<ProtectedRoute roles={['student']}><MarkAttendance /></ProtectedRoute>} />
                <Route path="/student/qr-scan" element={<ProtectedRoute roles={['student']}><QRScan /></ProtectedRoute>} />
                <Route path="/student/face-scan" element={<ProtectedRoute roles={['student']}><FaceScan /></ProtectedRoute>} />
                <Route path="/student/my-attendance" element={<ProtectedRoute roles={['student']}><MyAttendance /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
