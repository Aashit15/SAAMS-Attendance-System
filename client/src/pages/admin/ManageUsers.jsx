import { useState, useEffect } from 'react';
import { authService } from '../../services/services';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (roleFilter) params.role = roleFilter;
      const res = await authService.getUsers(params);
      setUsers(res.data.data.users);
      setTotal(res.data.pagination?.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [page, roleFilter]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Users</h1>
          <p className="text-surface-200/60 mt-1">{total} total users</p>
        </div>
        <div className="flex gap-2">
          {['', 'student', 'faculty', 'admin'].map(role => (
            <button key={role} onClick={() => { setRoleFilter(role); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${roleFilter === role ? 'gradient-primary text-white' : 'bg-surface-800/50 text-surface-200/60 hover:text-surface-100'}`}>
              {role || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-surface-200/50 border-b border-surface-700/30 bg-surface-800/30">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">ID</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Face</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/20">
              {users.map(u => (
                <tr key={u._id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {u.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="text-surface-100 font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-surface-200/60">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      u.role === 'admin' ? 'bg-amber-500/15 text-amber-400' :
                      u.role === 'faculty' ? 'bg-blue-500/15 text-blue-400' :
                      u.role === 'superadmin' ? 'bg-red-500/15 text-red-400' :
                      'bg-emerald-500/15 text-emerald-400'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-6 py-4 text-surface-200/40 font-mono text-xs">{u.rollNumber || u.employeeId || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${u.accountStatus === 'active' ? 'text-green-400' : 'text-amber-400'}`}>
                      {u.accountStatus || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.role === 'student' && (
                      <span className={`text-xs ${u.isFaceRegistered ? 'text-green-400' : 'text-red-400'}`}>
                        {u.isFaceRegistered ? '✓ Registered' : '✕ Pending'}
                      </span>
                    )}
                    {u.role !== 'student' && <span className="text-surface-200/30 text-xs">N/A</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > 20 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-surface-700/30">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-surface-800/50 text-surface-200/60 text-sm disabled:opacity-30">← Prev</button>
              <span className="text-sm text-surface-200/50">Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={users.length < 20}
                className="px-4 py-2 rounded-lg bg-surface-800/50 text-surface-200/60 text-sm disabled:opacity-30">Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
