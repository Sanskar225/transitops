import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import VantaBackground from '../components/VantaBackground';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';
import Spinner from '../components/ui/Spinner';

const ROLE_OPTIONS = [
  { value: 'VIEWER', label: 'Viewer — read-only access' },
  { value: 'FLEET_MANAGER', label: 'Fleet Manager — dispatch & manage' },
  { value: 'DRIVER', label: 'Driver' },
];

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'FLEET_MANAGER' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      await login(form.email, form.password);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <VantaBackground className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm relative z-10">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <span className="w-2 h-2 rounded-full bg-beacon shadow-beacon" />
          <span className="font-display font-semibold text-lg">TransitOps</span>
        </Link>

        <div className="card p-6 bg-panel/90 backdrop-blur">
          <h1 className="font-display text-xl font-semibold mb-1">Create your account</h1>
          <p className="text-sm text-muted mb-5">Admin roles are assigned separately by an existing admin.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input required className="input" value={form.name} onChange={set('name')} placeholder="Alex Fleet" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" required className="input" value={form.email} onChange={set('email')} placeholder="you@fleet.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" required minLength={8} className="input" value={form.password} onChange={set('password')} placeholder="At least 8 characters" />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={set('role')}>
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner size={14} className="text-void" /> : <UserPlus size={16} />}
              Create account
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-5">
          Already have an account? <Link to="/login" className="text-beacon hover:underline">Sign in</Link>
        </p>
      </div>
    </VantaBackground>
  );
}
