import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { attendanceService } from '../../services/services';

export default function MyAttendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      attendanceService.getStudentAttendance(user.id)
        .then(res => setRecords(res.data.data.records))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold gradient-text mb-2">My Attendance</h1>
      <p className="text-surface-200/60 mb-8">Complete attendance history</p>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-surface-200/40">No attendance records yet</div>
      ) : (
        <div className="glass rounded-2xl p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-surface-200/50 border-b border-surface-700/30">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Course</th>
                  <th className="pb-3 font-medium">Method</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/20">
                {records.map(r => (
                  <tr key={r._id} className="hover:bg-surface-800/30">
                    <td className="py-3 text-surface-100">{new Date(r.markedAt).toLocaleDateString()}</td>
                    <td className="py-3 text-surface-200/70">{r.course?.name} <span className="text-xs text-surface-200/40">{r.course?.code}</span></td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.method === 'facial' ? 'bg-purple-500/15 text-purple-400' : r.method === 'qr' ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'}`}>{r.method}</span>
                    </td>
                    <td className="py-3"><span className="text-green-400 text-xs capitalize">✓ {r.status}</span></td>
                    <td className="py-3 text-surface-200/60">{new Date(r.markedAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
