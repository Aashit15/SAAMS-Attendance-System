import { useState, useEffect } from 'react';
import { courseService, departmentService, authService } from '../../services/services';

export default function ManageCourses() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEnroll, setShowEnroll] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', department: '', semester: '', academicYear: '', faculty: [] });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);

  const fetchData = async () => {
    try {
      const [c, d, f, s] = await Promise.all([
        courseService.getAll(), departmentService.getAll(),
        authService.getUsers({ role: 'faculty', limit: 100 }),
        authService.getUsers({ role: 'student', limit: 100 }),
      ]);
      setCourses(c.data.data.courses);
      setDepartments(d.data.data.departments);
      setFaculty(f.data.data.users);
      setStudents(s.data.data.users);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editId) await courseService.update(editId, form);
      else await courseService.create(form);
      setShowModal(false); setForm({ name: '', code: '', department: '', semester: '', academicYear: '', faculty: [] }); setEditId(null);
      fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  const handleEnroll = async () => {
    if (!showEnroll || !selectedStudents.length) return;
    try {
      await courseService.enroll(showEnroll, selectedStudents);
      setShowEnroll(null); setSelectedStudents([]); fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Enrollment failed'); }
  };

  const handleDelete = async (id) => { if (confirm('Delete course?')) { await courseService.delete(id); fetchData(); } };

  const inputClass = "w-full px-4 py-3 bg-surface-800/50 border border-surface-700/50 rounded-xl text-surface-100 placeholder-surface-200/30 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-3xl font-bold gradient-text">Courses</h1><p className="text-surface-200/60 mt-1">{courses.length} courses</p></div>
        <button onClick={() => { setForm({ name: '', code: '', department: '', semester: '', academicYear: '', faculty: [] }); setEditId(null); setShowModal(true); }}
          className="px-5 py-2.5 gradient-primary rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all shadow-lg shadow-primary-500/20">+ Add Course</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {courses.map(course => (
            <div key={course._id} className="glass rounded-2xl p-5 hover:border-primary-500/30 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-surface-100">{course.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="px-2 py-0.5 bg-primary-500/10 text-primary-300 text-xs rounded-md font-mono">{course.code}</span>
                    <span className="text-xs text-surface-200/40">{course.department?.name}</span>
                    <span className="text-xs text-surface-200/40">{course.studentCount || 0} students</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowEnroll(course._id)} className="px-3 py-1.5 rounded-lg bg-accent-500/10 text-accent-400 text-xs font-medium hover:bg-accent-500/20 transition-colors">+ Enroll</button>
                  <button onClick={() => handleDelete(course._id)} className="px-3 py-1.5 rounded-lg hover:bg-red-500/10 text-surface-200/40 hover:text-red-400 text-xs transition-colors">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-xl font-bold text-surface-100 mb-4">{editId ? 'Edit' : 'Create'} Course</h2>
            {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-surface-200/80 mb-1">Name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className={inputClass} /></div>
              <div><label className="block text-sm font-medium text-surface-200/80 mb-1">Code</label><input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} required className={inputClass} /></div>
              <div><label className="block text-sm font-medium text-surface-200/80 mb-1">Department</label>
                <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} required className={inputClass}>
                  <option value="">Select...</option>
                  {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-surface-200/80 mb-1">Semester</label><input value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))} className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-surface-200/80 mb-1">Year</label><input value={form.academicYear} onChange={e => setForm(p => ({ ...p, academicYear: e.target.value }))} className={inputClass} /></div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-surface-700/50 text-surface-200/70 hover:bg-surface-800/50 transition-all text-sm">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 gradient-primary rounded-xl text-white font-medium text-sm">{editId ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Enroll Modal */}
      {showEnroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-xl font-bold text-surface-100 mb-4">Enroll Students</h2>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {students.map(s => (
                <label key={s._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-800/30 cursor-pointer">
                  <input type="checkbox" checked={selectedStudents.includes(s._id)} onChange={e => {
                    setSelectedStudents(prev => e.target.checked ? [...prev, s._id] : prev.filter(id => id !== s._id));
                  }} className="w-4 h-4 rounded accent-primary-500" />
                  <span className="text-sm text-surface-200">{s.name}</span>
                  <span className="text-xs text-surface-200/40">{s.rollNumber}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowEnroll(null); setSelectedStudents([]); }} className="flex-1 py-2.5 rounded-xl border border-surface-700/50 text-surface-200/70 text-sm">Cancel</button>
              <button onClick={handleEnroll} className="flex-1 py-2.5 gradient-accent rounded-xl text-white font-medium text-sm">Enroll ({selectedStudents.length})</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
