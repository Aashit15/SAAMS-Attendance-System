import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { sessionService, courseService } from '../../services/services';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionService.getAll({ limit: 10 }).then(res => setSessions(res.data.data.sessions)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const activeSessions = sessions.filter(s => s.status === 'active');
  const totalSessions = sessions.length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">Faculty Dashboard</h1>
        <p className="text-surface-200/60 mt-1">Welcome, {user?.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass rounded-2xl p-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl mb-3">📋</div>
          <p className="text-3xl font-bold text-surface-100">{totalSessions}</p>
          <p className="text-sm text-surface-200/50">Total Sessions</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-xl mb-3 animate-pulse-slow">🟢</div>
          <p className="text-3xl font-bold text-surface-100">{activeSessions.length}</p>
          <p className="text-sm text-surface-200/50">Active Sessions</p>
        </div>
        <Link to="/faculty/create-session" className="glass rounded-2xl p-5 hover:border-primary-500/30 transition-all group">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-xl mb-3 group-hover:animate-float">➕</div>
          <p className="text-lg font-bold text-surface-100">Create Session</p>
          <p className="text-sm text-surface-200/50">Start new attendance</p>
        </Link>
      </div>

      {/* Recent Sessions */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-surface-100 mb-4">Recent Sessions</h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : sessions.length === 0 ? (
          <p className="text-center text-surface-200/40 py-8">No sessions yet. Create one to get started.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <Link key={session._id} to={`/faculty/session/${session._id}`}
                className="flex items-center justify-between p-4 rounded-xl bg-surface-800/30 hover:bg-primary-500/5 transition-all">
                <div>
                  <p className="font-medium text-surface-100">{session.course?.name || 'Course'}</p>
                  <p className="text-xs text-surface-200/40">{new Date(session.date).toLocaleDateString()} • {session.attendanceMode}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  session.status === 'active' ? 'bg-green-500/15 text-green-400' : session.status === 'closed' ? 'bg-surface-700/50 text-surface-200/50' : 'bg-red-500/15 text-red-400'
                }`}>{session.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
