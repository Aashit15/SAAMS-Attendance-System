import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { courseService, departmentService, analyticsService, authService } from '../../services/services';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ departments: 0, courses: 0, students: 0, faculty: 0, faceRegistered: 0, facePending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [depts, courses, usersRes, faceStats] = await Promise.all([
          departmentService.getAll(),
          courseService.getAll(),
          authService.getUsers({ limit: 1 }),
          analyticsService.getFaceRegistrationStats(),
        ]);
        setStats({
          departments: depts.data.data.departments.length,
          courses: courses.data.pagination?.total || courses.data.data.courses.length,
          students: faceStats.data.data.totalStudents,
          faculty: 0,
          faceRegistered: faceStats.data.data.registered,
          facePending: faceStats.data.data.pending,
        });
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Departments', value: stats.departments, icon: '🏛️', color: 'from-blue-500 to-indigo-600', link: '/admin/departments' },
    { label: 'Courses', value: stats.courses, icon: '📚', color: 'from-purple-500 to-pink-600', link: '/admin/courses' },
    { label: 'Students', value: stats.students, icon: '🎓', color: 'from-emerald-500 to-teal-600', link: '/admin/users' },
    { label: 'Face Registered', value: stats.faceRegistered, icon: '✅', color: 'from-green-500 to-emerald-600', link: '/admin/face-status' },
    { label: 'Face Pending', value: stats.facePending, icon: '⏳', color: 'from-amber-500 to-orange-600', link: '/admin/face-status' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">Admin Dashboard</h1>
        <p className="text-surface-200/60 mt-1">Welcome back, {user?.name}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {cards.map(card => (
            <Link key={card.label} to={card.link} className="glass rounded-2xl p-5 hover:scale-[1.02] transition-all duration-200 group">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-xl mb-3 shadow-lg group-hover:animate-float`}>
                {card.icon}
              </div>
              <p className="text-3xl font-bold text-surface-100">{card.value}</p>
              <p className="text-sm text-surface-200/50 mt-1">{card.label}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-surface-100 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/admin/departments" className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/30 hover:bg-primary-500/10 transition-colors">
              <span className="text-lg">🏛️</span><span className="text-sm text-surface-200">Manage Departments</span>
            </Link>
            <Link to="/admin/courses" className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/30 hover:bg-primary-500/10 transition-colors">
              <span className="text-lg">📚</span><span className="text-sm text-surface-200">Manage Courses</span>
            </Link>
            <Link to="/admin/users" className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/30 hover:bg-primary-500/10 transition-colors">
              <span className="text-lg">👥</span><span className="text-sm text-surface-200">Manage Users</span>
            </Link>
            <Link to="/admin/face-status" className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/30 hover:bg-primary-500/10 transition-colors">
              <span className="text-lg">🤖</span><span className="text-sm text-surface-200">Face Registration Status</span>
            </Link>
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-surface-100 mb-4">Face Registration Rate</h2>
          <div className="flex items-center justify-center py-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none" className="text-surface-800" />
                <circle cx="50" cy="50" r="42" stroke="url(#grad)" strokeWidth="8" fill="none" strokeLinecap="round"
                  strokeDasharray={`${(stats.students ? (stats.faceRegistered / stats.students) * 264 : 0)} 264`}
                  className="transition-all duration-1000" />
                <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient></defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-surface-100">{stats.students ? Math.round((stats.faceRegistered / stats.students) * 100) : 0}%</span>
                <span className="text-xs text-surface-200/50">Registered</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
