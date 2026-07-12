import { useEffect, useState } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Spinner from '../../components/ui/Spinner';
import { analyticsApi } from '../../api/resources';
import { fmtCurrency, fmtNumber } from '../../utils/formatters';

const CHART_COLORS = { fuel: '#F2C879', maintenance: '#9C8CF2', expenses: '#49D6C4', line: '#F2C879' };

export default function Analytics() {
  const [trends, setTrends] = useState([]);
  const [efficiency, setEfficiency] = useState([]);
  const [roi, setRoi] = useState([]);
  const [predictive, setPredictive] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [t, e, r, p] = await Promise.all([
        analyticsApi.costTrends(6),
        analyticsApi.fuelEfficiency(),
        analyticsApi.roi(),
        analyticsApi.predictiveMaintenance().catch(() => ({ data: [] })),
      ]);
      setTrends(t.data);
      setEfficiency(e.data);
      setRoi(r.data);
      setPredictive(p.data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={28} /></div>;

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Analytics</h1>
          <p className="text-sm text-muted mt-1">Fuel efficiency, operational cost, ROI, and predictive maintenance.</p>
        </div>
        <a href={analyticsApi.exportTripsCsvUrl()} className="btn-secondary" target="_blank" rel="noreferrer">
          <Download size={16} /> Export trips CSV
        </a>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink mb-4">Cost trends (6 months)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trends}>
              <CartesianGrid stroke="#232838" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#8A93A6" fontSize={12} />
              <YAxis stroke="#8A93A6" fontSize={12} />
              <Tooltip contentStyle={{ background: '#10141C', border: '1px solid #232838', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="fuel" stroke={CHART_COLORS.fuel} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="maintenance" stroke={CHART_COLORS.maintenance} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expenses" stroke={CHART_COLORS.expenses} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink mb-4">Fuel efficiency by vehicle</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={efficiency}>
              <CartesianGrid stroke="#232838" strokeDasharray="3 3" />
              <XAxis dataKey="registrationNumber" stroke="#8A93A6" fontSize={11} />
              <YAxis stroke="#8A93A6" fontSize={12} />
              <Tooltip contentStyle={{ background: '#10141C', border: '1px solid #232838', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="kmPerLiter" fill={CHART_COLORS.line} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink mb-4">Vehicle ROI</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase border-b border-border">
                <th className="py-2 font-medium">Vehicle</th>
                <th className="py-2 font-medium">Acquisition</th>
                <th className="py-2 font-medium">ROI %</th>
              </tr>
            </thead>
            <tbody>
              {roi.map((r) => (
                <tr key={r.vehicleId} className="border-b border-border/60 last:border-0">
                  <td className="py-2 font-mono">{r.registrationNumber}</td>
                  <td className="py-2">{fmtCurrency(r.acquisitionCost)}</td>
                  <td className={`py-2 font-mono ${r.roiPct > 0 ? 'text-teal' : 'text-danger'}`}>{r.roiPct ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted mt-3">Revenue defaults to 0 — pass per-vehicle revenue to the API for a live figure.</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-danger" />
            <h2 className="font-display font-semibold text-ink">Predictive maintenance</h2>
          </div>
          {predictive.length === 0 ? (
            <p className="text-sm text-muted">No vehicles are currently due for service.</p>
          ) : (
            <div className="space-y-2">
              {predictive.map((v) => (
                <div key={v.id} className="flex justify-between text-sm border-b border-border/60 last:border-0 pb-2 last:pb-0">
                  <span className="font-mono text-ink">{v.registrationNumber}</span>
                  <span className="text-danger">{fmtNumber(v.distanceSinceService, ' km since service')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
