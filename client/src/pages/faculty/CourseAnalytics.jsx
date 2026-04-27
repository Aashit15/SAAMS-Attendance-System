import { useState, useEffect } from 'react';
import { courseService, analyticsService } from '../../services/services';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function CourseAnalytics() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    courseService.getAll().then(res => setCourses(res.data.data.courses)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    setLoading(true);
    analyticsService.getCourseAnalytics(selectedCourse)
      .then(res => setAnalytics(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedCourse]);

  const inputClass = "w-full px-4 py-3 bg-surface-800/50 border border-surface-700/50 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold gradient-text mb-2">Course Analytics</h1>
      <p className="text-surface-200/60 mb-6">Attendance trends and insights</p>

      <div className="mb-6">
        <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className={inputClass}>
          <option value="">Select a course...</option>
          {courses.map(c => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
        </select>
      </div>

      {loading && <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>}

      {analytics && !loading && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="glass rounded-xl p-5 text-center">
              <p className="text-2xl font-bold text-surface-100">{analytics.totalSessions}</p>
              <p className="text-xs text-surface-200/50">Total Sessions</p>
            </div>
            <div className="glass rounded-xl p-5 text-center">
              <p className="text-2xl font-bold text-surface-100">{analytics.enrolledCount}</p>
              <p className="text-xs text-surface-200/50">Enrolled Students</p>
            </div>
            <div className="glass rounded-xl p-5 text-center">
              <p className="text-2xl font-bold text-surface-100">{analytics.threshold}%</p>
              <p className="text-xs text-surface-200/50">Min Threshold</p>
            </div>
          </div>

          {/* Attendance Trend Chart */}
          {analytics.sessionStats.length > 0 && (
            <div className="glass rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-surface-100 mb-4">Attendance Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.sessionStats.map(s => ({ date: new Date(s.date).toLocaleDateString(), pct: s.percentage, present: s.presentCount }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
                  <Line type="monotone" dataKey="pct" stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8', r: 4 }} name="Attendance %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Method Breakdown */}
          {analytics.sessionStats.length > 0 && (
            <div className="glass rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-surface-100 mb-4">Method Breakdown</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.sessionStats.map(s => ({ date: new Date(s.date).toLocaleDateString(), QR: s.byMethod.qr, Facial: s.byMethod.facial, Manual: s.byMethod.manual }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
                  <Bar dataKey="QR" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Facial" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Manual" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Below Threshold */}
          {analytics.belowThreshold.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-red-400 mb-4">⚠ Below {analytics.threshold}% Threshold</h2>
              <div className="space-y-2">
                {analytics.belowThreshold.map(item => (
                  <div key={item.student._id} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                    <div>
                      <p className="font-medium text-surface-100">{item.student.name}</p>
                      <p className="text-xs text-surface-200/40">{item.student.rollNumber} • {item.student.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-400">{item.percentage}%</p>
                      <p className="text-xs text-surface-200/40">{item.attended}/{item.total} classes</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
