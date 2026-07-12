import { useCallback, useEffect, useState } from 'react';
import { Plus, Inbox } from 'lucide-react';
import ResourceFormModal from './ResourceFormModal';
import Pagination from '../ui/Pagination';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { apiErrorMessage } from '../../api/client';

/**
 * A config-driven CRUD screen shared by Vehicles, Drivers, Maintenance, Fuel
 * and Expenses so each module page only needs to declare its columns/fields,
 * not re-implement fetching, pagination, or modal plumbing.
 */
export default function ResourceListPage({
  title,
  subtitle,
  api,
  columns,
  createFields,
  editFields,
  filters = [],
  socketEvents = [],
  canCreate = true,
  rowActions,
  emptyIcon = Inbox,
  createLabel = 'Add',
}) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filterValues, setFilterValues] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const toast = useToast();
  const { subscribe } = useSocket();

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.list({ ...filterValues, page, limit: 10 });
      setItems(res.data);
      setMeta(res.meta || { page: 1, totalPages: 1 });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterValues, api]);

  useEffect(() => { load(1); }, [load]);

  useEffect(() => {
    const unsubs = socketEvents.map((ev) => subscribe(ev, () => load(meta.page)));
    return () => unsubs.forEach((u) => u && u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketEvents, subscribe]);

  const handleCreate = async (values) => {
    try {
      await api.create(values);
      toast.success(`${title.replace(/s$/, '')} created`);
      load(1);
    } catch (err) {
      const e = new Error(); e.displayMessage = apiErrorMessage(err); throw e;
    }
  };

  const handleUpdate = async (values) => {
    try {
      await api.update(editRow.id, { ...values, version: editRow.version });
      toast.success('Saved');
      load(meta.page);
    } catch (err) {
      const e = new Error(); e.displayMessage = apiErrorMessage(err); throw e;
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
        </div>
        <div className="flex gap-2 items-center">
          {filters.map((f) => (
            <select
              key={f.name}
              className="input !w-auto text-xs py-1.5"
              value={filterValues[f.name] || ''}
              onChange={(e) => setFilterValues((v) => ({ ...v, [f.name]: e.target.value || undefined }))}
            >
              <option value="">{f.label}: All</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
          {canCreate && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> {createLabel}
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={emptyIcon} title={`No ${title.toLowerCase()} yet`} description="Once records exist, they'll show up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
                  {columns.map((c) => <th key={c.key} className="px-4 py-3 font-medium">{c.label}</th>)}
                  {(editFields || rowActions) && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-panel2/60 transition-colors">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-ink align-middle">
                        {c.render ? c.render(row) : (row[c.key] ?? '—')}
                      </td>
                    ))}
                    {(editFields || rowActions) && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          {editFields && (
                            <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setEditRow(row)}>Edit</button>
                          )}
                          {rowActions && rowActions(row, { refresh: () => load(meta.page) })}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4">
          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={load} />
        </div>
      </div>

      {canCreate && createFields && (
        <ResourceFormModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title={createLabel}
          fields={createFields}
          initialValues={{}}
          onSubmit={handleCreate}
          submitLabel="Create"
        />
      )}

      {editFields && (
        <ResourceFormModal
          open={!!editRow}
          onClose={() => setEditRow(null)}
          title={`Edit ${title.replace(/s$/, '')}`}
          fields={editFields}
          initialValues={editRow || {}}
          onSubmit={handleUpdate}
          submitLabel="Save changes"
        />
      )}
    </div>
  );
}
