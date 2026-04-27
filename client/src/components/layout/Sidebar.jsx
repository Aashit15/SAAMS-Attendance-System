import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const menuItems = {
  superadmin: [
    { path: '/superadmin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/departments', label: 'Departments', icon: '🏛️' },
    { path: '/admin/courses', label: 'Courses', icon: '📚' },
    { path: '/admin/users', label: 'Users', icon: '👥' },
    { path: '/admin/face-status', label: 'Face Status', icon: '🤖' },
  ],
  admin: [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/departments', label: 'Departments', icon: '🏛️' },
    { path: '/admin/courses', label: 'Courses', icon: '📚' },
    { path: '/admin/users', label: 'Users', icon: '👥' },
    { path: '/admin/face-status', label: 'Face Status', icon: '🤖' },
  ],
  faculty: [
    { path: '/faculty', label: 'Dashboard', icon: '📊' },
    { path: '/faculty/sessions', label: 'Sessions', icon: '📋' },
    { path: '/faculty/create-session', label: 'New Session', icon: '➕' },
    { path: '/faculty/analytics', label: 'Analytics', icon: '📈' },
  ],
  student: [
    { path: '/student', label: 'Dashboard', icon: '📊' },
    { path: '/student/mark-attendance', label: 'Mark Attendance', icon: '✅' },
    { path: '/student/my-attendance', label: 'My Attendance', icon: '📋' },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;

  const items = menuItems[user.role] || [];

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-[calc(100vh-4rem)] bg-white/50 backdrop-blur-sm border-r border-gray-200/60 p-4">
      <div className="mb-6 px-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Navigation</p>
      </div>
      <nav className="flex-1 space-y-1">
        {items.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === `/${user.role}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-200/50 px-3">
        <p className="text-xs text-gray-300">SAAMS v1.0</p>
      </div>
    </aside>
  );
}
