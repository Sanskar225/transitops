import { useCallback, useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { auditApi } from '../../api/resources';
import { fmtDateTime } from '../../utils/formatters';

export default function AuditLog() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [entity, setEntity] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    const res = await auditApi.list({ entity: entity || undefined, page, limit: 15 });
    setItems(res.data);
    setMeta(res.meta);
    setLoading(false);
    // eslint-disable-next-line
  }, [entity]);

  useEffect(() => { load(1); }, [load]);

  const entities = ['Vehicle', 'Driver', 'Trip', 'MaintenanceLog', 'FuelLog', 'Expense', 'User'];

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Audit Log</h1>
          <p className="text-sm text-muted mt-1">Every create/update across the platform — who, what, when.</p>
        </div>
        <select className="input !w-auto text-xs py-1.5" value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">Entity: All</option>
          {entities.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={ScrollText} title="No audit entries" description="Actions will appear here as they happen." />
        ) : (
          <div className="divide-y divide-border/60">
            {items.map((a) => (
              <div key={a.id} className="px-4 py-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink">
                    <span className="font-mono text-beacon">{a.action}</span> {a.entity} <span className="text-muted">#{a.entityId.slice(0, 8)}</span>
                  </span>
                  <span className="text-xs text-muted">{fmtDateTime(a.createdAt)}</span>
                </div>
                <div className="text-xs text-muted mt-1">{a.user ? `${a.user.name} (${a.user.email})` : 'System'}</div>
              </div>
            ))}
          </div>
        )}
        <div className="px-4"><Pagination page={meta.page} totalPages={meta.totalPages} onChange={load} /></div>
      </div>
    </div>
  );
}
