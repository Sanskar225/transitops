import { useEffect, useState } from 'react';
import { Users as UsersIcon } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import { usersApi } from '../../api/resources';
import client from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/client';
import { ROLES } from '../../utils/constants';

export default function Users() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    const res = await usersApi.list();
    setItems(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (id, role) => {
    try {
      await client.patch(`/users/${id}/role`, { role });
      toast.success('Role updated');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await client.patch(`/users/${id}/active`, { isActive });
      toast.success(isActive ? 'User activated' : 'User deactivated');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <UsersIcon size={18} className="text-beacon" />
        <h1 className="font-display text-xl font-semibold text-ink">Users</h1>
      </div>
      <p className="text-sm text-muted mb-6">Manage roles and access. Admin only.</p>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 text-ink">{u.name}</td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <select className="input !w-auto text-xs py-1" value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className={`text-xs px-2 py-1 rounded-full border ${u.isActive ? 'border-teal/30 text-teal bg-teal/10' : 'border-danger/30 text-danger bg-danger/10'}`}
                      onClick={() => toggleActive(u.id, !u.isActive)}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
