import { useCallback, useEffect, useState } from 'react';
import { Plus, Route, Play, CheckCheck, XCircle } from 'lucide-react';
import StatusPill from '../../components/ui/StatusPill';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import CreateTripModal from './CreateTripModal';
import CompleteTripModal from './CompleteTripModal';
import { tripsApi } from '../../api/resources';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSocketEvent } from '../../context/SocketContext';
import { apiErrorMessage } from '../../api/client';
import { TRIP_STATUS_COLORS, CAN_WRITE_ROLES } from '../../utils/constants';
import { fmtNumber, fmtDateTime } from '../../utils/formatters';

export default function Trips() {
  const { user } = useAuth();
  const toast = useToast();
  const canWrite = CAN_WRITE_ROLES.includes(user.role);

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [completing, setCompleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await tripsApi.list({ status: status || undefined, page, limit: 10 });
      setItems(res.data);
      setMeta(res.meta);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => { load(1); }, [load]);
  useSocketEvent('trip.updated', () => load(meta.page));

  const handleDispatch = async (trip) => {
    setBusyId(trip.id);
    try {
      await tripsApi.dispatch(trip.id);
      toast.success('Trip dispatched — vehicle & driver locked atomically');
      load(meta.page);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (trip) => {
    if (!confirm('Cancel this trip?')) return;
    setBusyId(trip.id);
    try {
      await tripsApi.cancel(trip.id, 'Cancelled by user');
      toast.info('Trip cancelled');
      load(meta.page);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Trips</h1>
          <p className="text-sm text-muted mt-1">Draft → Dispatched → Completed / Cancelled. Dispatch is race-safe and idempotent.</p>
        </div>
        <div className="flex gap-2">
          <select className="input !w-auto text-xs py-1.5" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Status: All</option>
            {Object.keys(TRIP_STATUS_COLORS).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {canWrite && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> New trip
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={Route} title="No trips yet" description="Create a draft trip to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Route</th>
                  <th className="px-4 py-3 font-medium">Vehicle / Driver</th>
                  <th className="px-4 py-3 font-medium">Cargo</th>
                  <th className="px-4 py-3 font-medium">Distance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  {canWrite && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-panel2/60 transition-colors">
                    <td className="px-4 py-3 text-ink">{t.source} → {t.destination}</td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">{t.vehicle?.registrationNumber} · {t.driver?.name}</td>
                    <td className="px-4 py-3">{fmtNumber(t.cargoWeightKg, ' kg')}</td>
                    <td className="px-4 py-3">{fmtNumber(t.actualDistanceKm ?? t.plannedDistanceKm, ' km')}{t.actualDistanceKm == null && <span className="text-muted text-xs"> (planned)</span>}</td>
                    <td className="px-4 py-3"><StatusPill status={t.status} colorKey={TRIP_STATUS_COLORS[t.status]} /></td>
                    <td className="px-4 py-3 text-muted text-xs">{fmtDateTime(t.createdAt)}</td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          {t.status === 'DRAFT' && (
                            <button className="btn-ghost !px-2 !py-1 text-xs" disabled={busyId === t.id} onClick={() => handleDispatch(t)}>
                              <Play size={14} /> Dispatch
                            </button>
                          )}
                          {t.status === 'DISPATCHED' && (
                            <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setCompleting(t)}>
                              <CheckCheck size={14} /> Complete
                            </button>
                          )}
                          {(t.status === 'DRAFT' || t.status === 'DISPATCHED') && (
                            <button className="btn-ghost !px-2 !py-1 text-xs text-danger" disabled={busyId === t.id} onClick={() => handleCancel(t)}>
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4"><Pagination page={meta.page} totalPages={meta.totalPages} onChange={load} /></div>
      </div>

      <CreateTripModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => load(1)} />
      {completing && <CompleteTripModal trip={completing} onClose={() => setCompleting(null)} onDone={() => load(meta.page)} />}
    </div>
  );
}
