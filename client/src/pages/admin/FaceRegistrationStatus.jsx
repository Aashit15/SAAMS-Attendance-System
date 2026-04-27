import { useState, useEffect } from 'react';
import { faceService } from '../../services/services';

export default function FaceRegistrationStatus() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await faceService.getAllFaceStatus({ page, limit: 20 });
      setStudents(res.data.data.students);
      setTotal(res.data.pagination?.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchStatus(); }, [page]);

  const handleReEnroll = async (id) => {
    if (confirm('Trigger face re-enrollment for this student?')) {
      try { await faceService.reEnrollFace(id); fetchStatus(); } catch {}
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete face data? Student will need to re-register.')) {
      try { await faceService.deleteFaceData(id); fetchStatus(); } catch {}
    }
  };

  const registered = students.filter(s => s.isFaceRegistered).length;
  const pending = students.filter(s => !s.isFaceRegistered).length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">Face Registration Status</h1>
        <p className="text-surface-200/60 mt-1">{total} students total</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center text-lg">✅</div>
            <div><p className="text-2xl font-bold text-surface-100">{registered}</p><p className="text-xs text-surface-200/50">Registered</p></div>
          </div>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-lg">⏳</div>
            <div><p className="text-2xl font-bold text-surface-100">{pending}</p><p className="text-xs text-surface-200/50">Pending</p></div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-surface-200/50 border-b border-surface-700/30 bg-surface-800/30">
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Roll No</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Registered At</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/20">
              {students.map(s => (
                <tr key={s._id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {s.faceImageUrl ? (
                        <img src={s.faceImageUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-xs text-surface-200/40">?</div>
                      )}
                      <span className="text-surface-100 font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-surface-200/60 font-mono text-xs">{s.rollNumber}</td>
                  <td className="px-6 py-4 text-surface-200/60">{s.department?.name || '—'}</td>
                  <td className="px-6 py-4">
                    {s.isFaceRegistered ? (
                      <span className="px-2.5 py-1 rounded-lg bg-green-500/15 text-green-400 text-xs font-medium">✓ Registered</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium">⏳ Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-surface-200/40 text-xs">{s.faceRegisteredAt ? new Date(s.faceRegisteredAt).toLocaleDateString() : '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleReEnroll(s._id)} className="px-3 py-1 rounded-lg bg-primary-500/10 text-primary-300 text-xs hover:bg-primary-500/20 transition-colors">Re-enroll</button>
                      {s.isFaceRegistered && (
                        <button onClick={() => handleDelete(s._id)} className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
