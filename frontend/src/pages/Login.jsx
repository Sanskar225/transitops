import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import VantaBackground from '../components/VantaBackground';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';
import Spinner from '../components/ui/Spinner';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from || '/app', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <VantaBackground className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm relative z-10">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <span className="w-2 h-2 rounded-full bg-beacon shadow-beacon" />
          <span className="font-display font-semibold text-lg">TransitOps</span>
        </Link>

        <div className="card p-6 bg-panel/90 backdrop-blur">
          <h1 className="font-display text-xl font-semibold mb-1">Sign in</h1>
          <p className="text-sm text-muted mb-5">Welcome back. Enter your details below.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" required className="input" value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@fleet.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" required className="input" value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner size={14} className="text-void" /> : <LogIn size={16} />}
              Sign in
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-5">
          Don&apos;t have an account? <Link to="/register" className="text-beacon hover:underline">Create one</Link>
        </p>
      </div>
    </VantaBackground>
  );
}
