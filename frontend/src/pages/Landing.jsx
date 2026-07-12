import { Link } from 'react-router-dom';
import { ArrowRight, Radar } from 'lucide-react';
import VantaBackground from '../components/VantaBackground';
import BeaconTicker from '../components/BeaconTicker';

const FEATURES = [
  { label: 'Dispatch', desc: 'Vehicle + driver locked, validated, and moved to On Trip — atomically. No double bookings, ever.' },
  { label: 'Predict', desc: 'Odometer-based service alerts flag vehicles before they break down, not after.' },
  { label: 'Recommend', desc: 'An explainable scoring engine suggests the best available vehicle and driver for every trip.' },
  { label: 'Observe', desc: 'Every status change streams to the dashboard the instant it happens — fuel, cost, ROI, all live.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-void text-ink">
      <VantaBackground className="min-h-screen flex flex-col">
        <nav className="flex items-center justify-between px-6 lg:px-12 py-6 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-beacon shadow-beacon" />
            <span className="font-display font-semibold text-lg tracking-tight">TransitOps</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost">Sign in</Link>
            <Link to="/register" className="btn-primary">Get started</Link>
          </div>
        </nav>

        <div className="flex-1 flex flex-col justify-center px-6 lg:px-12 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-beacon border border-beacon-dim/40 rounded-full px-3 py-1 mb-6">
              <Radar size={12} /> LIVE FLEET OPERATIONS
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.02] tracking-tight">
              Command your fleet
              <br />in real time.
            </h1>
            <p className="mt-6 text-lg text-muted max-w-xl">
              Vehicles, drivers, trips, maintenance, and cost — one platform, one
              source of truth, zero race conditions. Every dispatch is locked,
              validated, and logged before a wheel turns.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link to="/register" className="btn-primary text-base px-5 py-2.5">
                Start dispatching <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn-secondary text-base px-5 py-2.5">
                Sign in
              </Link>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <BeaconTicker />
        </div>
      </VantaBackground>

      <section className="px-6 lg:px-12 py-20 max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-card overflow-hidden">
          {FEATURES.map((f, i) => (
            <div key={f.label} className="bg-panel p-6">
              <div className="font-mono text-xs text-beacon mb-3">{String(i + 1).padStart(2, '0')}</div>
              <h3 className="font-display font-semibold text-ink mb-2">{f.label}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 lg:px-12 py-8 border-t border-border flex items-center justify-between text-xs text-muted">
        <span>TransitOps — Smart Transport Operations Platform</span>
        <span className="font-mono">© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
