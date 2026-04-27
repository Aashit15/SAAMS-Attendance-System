import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', rollNumber: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true);
    try {
      const data = { name: form.name, email: form.email, password: form.password, role: 'student', rollNumber: form.rollNumber };
      const result = await register(data);
      if (result.requiresFaceRegistration) {
        navigate('/face-registration', { state: { userId: result.user.id } });
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-surface-800/50 border border-surface-700/50 rounded-xl text-surface-100 placeholder-surface-200/30 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="w-full max-w-lg relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-float shadow-lg shadow-primary-500/20">
            <span className="text-2xl font-bold text-white">SA</span>
          </div>
          <h1 className="text-3xl font-bold gradient-text">Student Registration</h1>
          <p className="mt-2 text-surface-200/60">
            Face registration will be required after signup
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5 shadow-2xl">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-surface-200/80 mb-2">Full Name</label>
            <input name="name" required value={form.name} onChange={handleChange} className={inputClass} placeholder="John Doe" />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-200/80 mb-2">Email</label>
            <input name="email" type="email" required value={form.email} onChange={handleChange} className={inputClass} placeholder="you@college.edu" />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-200/80 mb-2">Roll Number</label>
            <input name="rollNumber" required value={form.rollNumber} onChange={handleChange} className={inputClass} placeholder="CS2024001" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-200/80 mb-2">Password</label>
              <input name="password" type="password" required value={form.password} onChange={handleChange} className={inputClass} placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-200/80 mb-2">Confirm</label>
              <input name="confirmPassword" type="password" required value={form.confirmPassword} onChange={handleChange} className={inputClass} placeholder="••••••••" />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm flex items-center gap-2">
            <span>📸</span> Face registration will be required after signup
          </div>

          <button id="register-submit" type="submit" disabled={loading}
            className="w-full py-3 gradient-primary rounded-xl text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary-500/20">
            {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</span> : 'Create Account'}
          </button>

          <p className="text-center text-sm text-surface-200/50">
            Already have an account? <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
