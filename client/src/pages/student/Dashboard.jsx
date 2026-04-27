import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '../../services/services';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      analyticsService.getStudentAnalytics(user.id)
        .then(res => setAnalytics(res.data.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user]);

  const threshold = 75;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">Student Dashboard</h1>
        <p className="text-surface-200/60 mt-1">Welcome, {user?.name}</p>
      </div>

      {/* Quick action */}
      <Link to="/student/mark-attendance"
        className="block mb-8 glass rounded-2xl p-6 hover:border-primary-500/30 transition-all group animate-glow">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center text-2xl group-hover:animate-float shadow-lg shadow-primary-500/20">✅</div>
          <div>
            <h2 className="text-xl font-bold text-surface-100">Mark Attendance</h2>
            <p className="text-sm text-surface-200/50">Scan QR code or use facial recognition</p>
          </div>
          <svg className="ml-auto w-6 h-6 text-surface-200/30 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
      </Link>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : analytics ? (
        <>
          {/* Course Attendance Cards */}
          <h2 className="text-lg font-semibold text-surface-100 mb-4">Course Attendance</h2>
          {analytics.courseStats.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-surface-200/40">No courses enrolled yet</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {analytics.courseStats.map(cs => (
                <div key={cs.courseId} className={`glass rounded-2xl p-5 ${cs.percentage < threshold ? 'border-red-500/30' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-surface-100">{cs.courseName}</h3>
                      <span className="text-xs text-surface-200/40 font-mono">{cs.courseCode}</span>
                    </div>
                    <div className="relative w-14 h-14">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="none" className="text-surface-800" />
                        <circle cx="20" cy="20" r="16" stroke={cs.percentage >= threshold ? '#10b981' : '#ef4444'} strokeWidth="3" fill="none" strokeLinecap="round"
                          strokeDasharray={`${(cs.percentage / 100) * 100.5} 100.5`} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-surface-100">{cs.percentage}%</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-surface-200/50">
                    <span>{cs.attended}/{cs.totalSessions} classes</span>
                    {cs.percentage < threshold && <span className="text-red-400">⚠ Below {threshold}%</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Records */}
          {analytics.recentRecords?.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-surface-100 mb-4">Recent Attendance</h2>
              <div className="space-y-2">
                {analytics.recentRecords.slice(0, 10).map(r => (
                  <div key={r._id} className="flex items-center justify-between p-3 rounded-xl bg-surface-800/30">
                    <div>
                      <p className="text-sm font-medium text-surface-100">{r.course?.name}</p>
                      <p className="text-xs text-surface-200/40">{new Date(r.markedAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.method === 'facial' ? 'bg-purple-500/15 text-purple-400' : r.method === 'qr' ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'}`}>{r.method}</span>
                      <span className="text-green-400 text-xs">✓</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="glass rounded-2xl p-8 text-center text-surface-200/40">Unable to load analytics</div>
      )}
    </div>
  );
}
