import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { sessionService } from '../../services/services';
import { useSocket } from '../../context/SocketContext';

export default function SessionDetail() {
  const { id } = useParams();
  const socket = useSocket();
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(5);
  const qrIntervalRef = useRef(null);
  const countdownRef = useRef(null);

  const fetchSession = async () => {
    try {
      const res = await sessionService.getOne(id);
      setSession(res.data.data.session);
      setRecords(res.data.data.attendanceRecords);
      setEnrolledCount(res.data.data.enrolledCount);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchSession(); }, [id]);

  // Socket.io for real-time updates
  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('session:join', id);
    socket.on('attendance:marked', () => fetchSession());
    socket.on('attendance:face_marked', () => fetchSession());
    return () => {
      socket.emit('session:leave', id);
      socket.off('attendance:marked');
      socket.off('attendance:face_marked');
    };
  }, [socket, id]);

  // Regenerate QR (single call)
  const regenerateQR = useCallback(async () => {
    try {
      const res = await sessionService.regenerateQR(id, 10); // 10-second expiry
      setQrDataUrl(res.data.data.qrCodeDataUrl);
      setQrCountdown(5);
    } catch {}
  }, [id]);

  // Auto-refresh QR every 5 seconds when QR is shown
  useEffect(() => {
    if (!showQR) {
      clearInterval(qrIntervalRef.current);
      clearInterval(countdownRef.current);
      return;
    }

    // Initial QR generation
    regenerateQR();

    // Refresh QR every 5 seconds
    qrIntervalRef.current = setInterval(() => {
      regenerateQR();
    }, 5000);

    // Countdown timer (updates every second)
    countdownRef.current = setInterval(() => {
      setQrCountdown(prev => (prev <= 1 ? 5 : prev - 1));
    }, 1000);

    return () => {
      clearInterval(qrIntervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, [showQR, regenerateQR]);

  const handleCloseSession = async () => {
    try {
      await sessionService.update(id, { status: 'closed' });
      if (socket) socket.emit('session:close', { sessionId: id });
      setShowQR(false);
      fetchSession();
    } catch {}
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!session) return <div className="p-6 text-center text-red-400">Session not found</div>;

  const presentPct = enrolledCount ? Math.round((records.length / enrolledCount) * 100) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">{session.course?.name}</h1>
          <p className="text-surface-200/60 mt-1">{new Date(session.date).toLocaleDateString()} • {session.attendanceMode} mode</p>
        </div>
        <div className="flex gap-2">
          {session.status === 'active' && session.attendanceMode !== 'facial' && (
            <button onClick={() => setShowQR(!showQR)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${showQR ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-primary-500/10 text-primary-500 hover:bg-primary-500/20'}`}>
              {showQR ? '✕ Hide QR' : '📱 Show QR'}
            </button>
          )}
          {session.status === 'active' && (
            <button onClick={handleCloseSession} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors">Close Session</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-surface-100">{records.length}</p>
          <p className="text-xs text-surface-200/50">Present</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-surface-100">{enrolledCount - records.length}</p>
          <p className="text-xs text-surface-200/50">Absent</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-surface-100">{presentPct}%</p>
          <p className="text-xs text-surface-200/50">Attendance</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${session.status === 'active' ? 'bg-green-500/15 text-green-600' : 'bg-surface-700/50 text-surface-200/50'}`}>{session.status}</span>
        </div>
      </div>

      {/* QR Code Full Screen with auto-refresh */}
      {showQR && qrDataUrl && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
          <div className="text-center">
            <img src={qrDataUrl} alt="QR Code" className="w-96 h-96 mx-auto" />
            <p className="mt-4 text-gray-800 text-xl font-semibold">{session.course?.name}</p>
            <p className="text-gray-500 text-sm mt-1">Scan to mark attendance</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 flex items-center justify-center">
                <span className="text-indigo-600 font-bold text-sm">{qrCountdown}</span>
              </div>
              <p className="text-gray-400 text-xs">Auto-refreshing every 5 seconds to prevent sharing</p>
            </div>
            <button onClick={() => setShowQR(false)} className="mt-6 px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
              ✕ Close QR Display
            </button>
          </div>
        </div>
      )}

      {/* Attendance Records */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-surface-100 mb-4">Attendance Records</h2>
        {records.length === 0 ? (
          <p className="text-center text-surface-200/40 py-8">No attendance recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-surface-200/50 border-b border-surface-700/30">
                  <th className="pb-3 font-medium">Student</th>
                  <th className="pb-3 font-medium">Roll No</th>
                  <th className="pb-3 font-medium">Method</th>
                  <th className="pb-3 font-medium">Time</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/20">
                {records.map(r => (
                  <tr key={r._id} className="hover:bg-surface-800/30">
                    <td className="py-3 text-surface-100">{r.student?.name}</td>
                    <td className="py-3 text-surface-200/60">{r.student?.rollNumber}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.method === 'facial' ? 'bg-purple-500/15 text-purple-600' : r.method === 'qr' ? 'bg-blue-500/15 text-blue-600' : 'bg-amber-500/15 text-amber-600'}`}>{r.method}</span>
                    </td>
                    <td className="py-3 text-surface-200/60">{new Date(r.markedAt).toLocaleTimeString()}</td>
                    <td className="py-3"><span className="text-green-600 text-xs">✓ {r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
