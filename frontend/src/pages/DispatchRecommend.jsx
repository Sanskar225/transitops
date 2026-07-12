import { useState } from 'react';
import { Radar, Award } from 'lucide-react';
import Spinner from '../components/ui/Spinner';
import CreateTripModal from './Trips/CreateTripModal';
import { dispatchApi } from '../api/resources';
import { apiErrorMessage } from '../api/client';

export default function DispatchRecommend() {
  const [form, setForm] = useState({ source: '', destination: '', cargoWeightKg: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createFrom, setCreateFrom] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await dispatchApi.recommend({ ...form, cargoWeightKg: Number(form.cargoWeightKg) });
      setResult(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Radar size={18} className="text-beacon" />
        <h1 className="font-display text-xl font-semibold text-ink">AI Dispatch Recommendation</h1>
      </div>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        A transparent, weighted-scoring engine — not a black box. It only ranks vehicles and
        drivers that already pass every hard business rule (status, license, capacity), then
        optimizes for capacity fit, maintenance risk, safety, and fair fleet rotation.
      </p>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <form onSubmit={submit} className="card p-5 space-y-4 h-fit">
          <div>
            <label className="label">Source</label>
            <input required className="input" value={form.source} onChange={set('source')} placeholder="Warehouse A" />
          </div>
          <div>
            <label className="label">Destination</label>
            <input required className="input" value={form.destination} onChange={set('destination')} placeholder="Depot B" />
          </div>
          <div>
            <label className="label">Cargo weight (kg)</label>
            <input required type="number" step="0.1" className="input" value={form.cargoWeightKg} onChange={set('cargoWeightKg')} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner size={14} className="text-void" /> : <Radar size={16} />}
            Get recommendation
          </button>
        </form>

        <div>
          {!result && !loading && (
            <div className="card p-10 text-center text-muted text-sm">Fill in trip details to see the top-ranked vehicle and driver.</div>
          )}
          {result && (
            <div className="grid sm:grid-cols-2 gap-4">
              <RecommendationCard label="Best vehicle" primary={result.recommendedVehicle} alternatives={result.alternativeVehicles} nameKey="registrationNumber" />
              <RecommendationCard label="Best driver" primary={result.recommendedDriver} alternatives={result.alternativeDrivers} nameKey="name" />
              <div className="sm:col-span-2">
                <button
                  className="btn-primary"
                  onClick={() => setCreateFrom({
                    source: form.source, destination: form.destination, cargoWeightKg: form.cargoWeightKg,
                    vehicleId: result.recommendedVehicle.vehicleId, driverId: result.recommendedDriver.driverId,
                  })}
                >
                  Create trip with this recommendation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {createFrom && (
        <CreateTripModal open={!!createFrom} onClose={() => setCreateFrom(null)} onCreated={() => setCreateFrom(null)} prefill={createFrom} />
      )}
    </div>
  );
}

function RecommendationCard({ label, primary, alternatives, nameKey }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Award size={16} className="text-beacon" />
        <span className="label mb-0">{label}</span>
      </div>
      <div className="font-mono text-lg text-ink mb-1">{primary[nameKey]}</div>
      <div className="text-xs text-muted mb-3">Score: <span className="text-teal font-mono">{primary.score}</span> / 100</div>
      <div className="space-y-1.5 text-xs">
        {Object.entries(primary.breakdown).map(([k, v]) => (
          <div key={k} className="flex justify-between text-muted">
            <span>{k.replace(/([A-Z])/g, ' $1').trim()}</span>
            <span className="font-mono text-ink">{v}</span>
          </div>
        ))}
      </div>
      {alternatives?.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="text-xs text-muted mb-2">Alternatives</div>
          {alternatives.map((a) => (
            <div key={a[`${nameKey === 'name' ? 'driverId' : 'vehicleId'}`]} className="flex justify-between text-xs py-1">
              <span className="text-ink">{a[nameKey]}</span>
              <span className="font-mono text-muted">{a.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
