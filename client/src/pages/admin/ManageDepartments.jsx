import { useState, useEffect } from 'react';
import { departmentService } from '../../services/services';

export default function ManageDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const fetchDepts = async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data.data.departments);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchDepts(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editId) await departmentService.update(editId, form);
      else await departmentService.create(form);
      setShowModal(false); setForm({ name: '', code: '', description: '' }); setEditId(null);
      fetchDepts();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  const handleEdit = (dept) => { setForm({ name: dept.name, code: dept.code, description: dept.description || '' }); setEditId(dept._id); setShowModal(true); };
  const handleDelete = async (id) => { if (confirm('Delete department?')) { await departmentService.delete(id); fetchDepts(); } };

  const inputClass = "w-full px-4 py-3 bg-surface-800/50 border border-surface-700/50 rounded-xl text-surface-100 placeholder-surface-200/30 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Departments</h1>
          <p className="text-surface-200/60 mt-1">{departments.length} departments</p>
        </div>
        <button onClick={() => { setForm({ name: '', code: '', description: '' }); setEditId(null); setShowModal(true); }}
          className="px-5 py-2.5 gradient-primary rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all shadow-lg shadow-primary-500/20">
          + Add Department
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : departments.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center"><p className="text-surface-200/50">No departments yet. Create one to get started.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => (
            <div key={dept._id} className="glass rounded-2xl p-5 hover:border-primary-500/30 transition-all group">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-surface-100">{dept.name}</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-primary-500/10 text-primary-300 text-xs rounded-md font-mono">{dept.code}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(dept)} className="p-1.5 rounded-lg hover:bg-surface-700/50 text-surface-200/50 hover:text-primary-300">✏️</button>
                  <button onClick={() => handleDelete(dept._id)} className="p-1.5 rounded-lg hover:bg-surface-700/50 text-surface-200/50 hover:text-red-400">🗑️</button>
                </div>
              </div>
              {dept.description && <p className="mt-2 text-sm text-surface-200/40">{dept.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-xl font-bold text-surface-100 mb-4">{editId ? 'Edit' : 'Create'} Department</h2>
            {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-surface-200/80 mb-1">Name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className={inputClass} placeholder="Computer Science" /></div>
              <div><label className="block text-sm font-medium text-surface-200/80 mb-1">Code</label><input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} required className={inputClass} placeholder="CS" /></div>
              <div><label className="block text-sm font-medium text-surface-200/80 mb-1">Description</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputClass} rows={2} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-surface-700/50 text-surface-200/70 hover:bg-surface-800/50 transition-all text-sm">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 gradient-primary rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all">{editId ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
