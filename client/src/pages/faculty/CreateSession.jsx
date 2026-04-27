import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionService, courseService } from '../../services/services';

export default function CreateSession() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ courseId: '', attendanceMode: 'dual', date: new Date().toISOString().split('T')[0], startTime: '', endTime: '', location: '', type: 'in-person', qrExpiryMinutes: 5 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => { courseService.getAll().then(res => setCourses(res.data.data.courses)).catch(() => {}); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const payload = { ...form, startTime: new Date(`${form.date}T${form.startTime}`).toISOString(), endTime: new Date(`${form.date}T${form.endTime}`).toISOString() };
      const res = await sessionService.create(payload);
      navigate(`/faculty/session/${res.data.data.session._id}`);
    } catch (err) { setError(err.response?.data?.message || 'Failed to create session'); }
    setLoading(false);
  };

  const inputClass = "w-full px-4 py-3 bg-surface-800/50 border border-surface-700/50 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold gradient-text mb-2">Create Session</h1>
      <p className="text-surface-200/60 mb-8">Start a new attendance session</p>

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 shadow-2xl space-y-6">
        {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

        <div><label className="block text-sm font-medium text-surface-200/80 mb-2">Course</label>
          <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))} required className={inputClass}>
            <option value="">Select course...</option>
            {courses.map(c => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
          </select>
        </div>

        {/* Attendance Mode */}
        <div>
          <label className="block text-sm font-medium text-surface-200/80 mb-2">Attendance Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {[{ value: 'qr', label: '📱 QR Code', desc: 'Students scan QR' }, { value: 'facial', label: '🤖 Facial', desc: 'Face recognition' }, { value: 'dual', label: '🔄 Dual', desc: 'Both methods' }].map(mode => (
              <button key={mode.value} type="button" onClick={() => setForm(p => ({ ...p, attendanceMode: mode.value }))}
                className={`p-4 rounded-xl border text-center transition-all ${form.attendanceMode === mode.value ? 'border-primary-500/50 bg-primary-500/10' : 'border-surface-700/50 hover:border-surface-700'}`}>
                <p className="text-lg">{mode.label.split(' ')[0]}</p>
                <p className="text-xs text-surface-200/60 mt-1">{mode.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div><label className="block text-sm font-medium text-surface-200/80 mb-2">Date</label>
          <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-surface-200/80 mb-2">Start Time</label>
            <input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} required className={inputClass} />
          </div>
          <div><label className="block text-sm font-medium text-surface-200/80 mb-2">End Time</label>
            <input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} required className={inputClass} />
          </div>
        </div>

        {form.attendanceMode !== 'facial' && (
          <div><label className="block text-sm font-medium text-surface-200/80 mb-2">QR Expiry (minutes)</label>
            <input type="number" min={1} max={60} value={form.qrExpiryMinutes} onChange={e => setForm(p => ({ ...p, qrExpiryMinutes: parseInt(e.target.value) }))} className={inputClass} />
          </div>
        )}

        <div><label className="block text-sm font-medium text-surface-200/80 mb-2">Location</label>
          <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className={inputClass} placeholder="Room 101" />
        </div>

        <button type="submit" disabled={loading} className="w-full py-3 gradient-primary rounded-xl text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary-500/20">
          {loading ? 'Creating...' : '🚀 Create Session'}
        </button>
      </form>
    </div>
  );
}
