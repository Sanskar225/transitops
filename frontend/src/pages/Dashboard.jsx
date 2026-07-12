import { useCallback, useEffect, useState } from 'react';
import { Truck, Gauge, Wallet, AlertTriangle } from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import StatusPill from '../components/ui/StatusPill';
import Spinner from '../components/ui/Spinner';
import BeaconTicker from '../components/BeaconTicker';
import { analyticsApi, tripsApi } from '../api/resources';
import { useSocketEvent } from '../context/SocketContext';
import { fmtCurrency, fmtDateTime } from '../utils/formatters';
import { TRIP_STATUS_COLORS } from '../utils/constants';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [dash, trips] = await Promise.all([
        analyticsApi.dashboard(),
        tripsApi.list({ page: 1, limit: 6 }),
      ]);
      setData(dash.data);
      setRecentTrips(trips.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useSocketEvent('trip.updated', load);
  useSocketEvent('vehicle.updated', load);

  if (loading || !data) {
    return <div className="flex justify-center py-24"><Spinner size={28} /></div>;
  }

  const totalCost = data.operationalCost.reduce((s, v) => s + v.totalOperationalCost, 0);
  const avgEfficiency = (() => {
    const withData = data.fuelEfficiency.filter((v) => v.kmPerLiter != null);
    if (!withData.length) return null;
    return withData.reduce((s, v) => s + v.kmPerLiter, 0) / withData.length;
  })();

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink mb-1">Dashboard</h1>
      <p className="text-sm text-muted mb-5">Live fleet overview — updates automatically as trips dispatch and complete.</p>

      <div className="rounded-card overflow-hidden mb-6">
        <BeaconTicker authenticated />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Fleet Utilization" value={`${data.utilization.utilizationPct}%`} sub={`${data.utilization.onTrip} of ${data.utilization.totalActive} vehicles on trip`} icon={Truck} accent="beacon" />
        <StatCard label="Avg Fuel Efficiency" value={avgEfficiency ? `${avgEfficiency.toFixed(1)} km/L` : '—'} sub="Across active fleet" icon={Gauge} accent="teal" />
        <StatCard label="Total Operational Cost" value={fmtCurrency(totalCost)} sub="Fuel + maintenance + expenses" icon={Wallet} accent="violet" />
        <StatCard label="Idle Vehicles" value={data.idleVehicles.length} sub="Available, unused 7+ days" icon={AlertTriangle} accent="danger" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink mb-4">Recent trips</h2>
          <div className="space-y-3">
            {recentTrips.length === 0 && <p className="text-sm text-muted">No trips yet.</p>}
            {recentTrips.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm border-b border-border/60 last:border-0 pb-3 last:pb-0">
                <div>
                  <div className="text-ink">{t.source} → {t.destination}</div>
                  <div className="text-xs text-muted font-mono mt-0.5">{t.vehicle?.registrationNumber} · {t.driver?.name} · {fmtDateTime(t.createdAt)}</div>
                </div>
                <StatusPill status={t.status} colorKey={TRIP_STATUS_COLORS[t.status]} />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink mb-4">Idle vehicles</h2>
          <div className="space-y-3">
            {data.idleVehicles.length === 0 && <p className="text-sm text-muted">No idle vehicles — great utilization.</p>}
            {data.idleVehicles.map((v) => (
              <div key={v.vehicleId} className="flex items-center justify-between text-sm border-b border-border/60 last:border-0 pb-3 last:pb-0">
                <span className="font-mono text-ink">{v.registrationNumber}</span>
                <span className="text-xs text-muted">{v.lastUsedAt ? `Last used ${fmtDateTime(v.lastUsedAt)}` : 'Never used'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
