import { UserRound } from 'lucide-react';
import ResourceListPage from '../../components/crud/ResourceListPage';
import StatusPill from '../../components/ui/StatusPill';
import { driversApi } from '../../api/resources';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/client';
import { DRIVER_STATUS_COLORS, CAN_WRITE_ROLES } from '../../utils/constants';
import { fmtDate, daysUntil } from '../../utils/formatters';

const CREATE_FIELDS = [
  { name: 'name', label: 'Full name', required: true, placeholder: 'Alex' },
  { name: 'licenseNumber', label: 'License number', required: true, placeholder: 'DL-000123' },
  { name: 'licenseCategory', label: 'License category', placeholder: 'LMV' },
  { name: 'licenseExpiryDate', label: 'License expiry date', type: 'date', required: true },
  { name: 'contactNumber', label: 'Contact number', placeholder: '+91-9000000000' },
  { name: 'safetyScore', label: 'Safety score (0–100)', type: 'number', step: '0.1', placeholder: '80' },
];

const EDIT_FIELDS = [
  { name: 'licenseCategory', label: 'License category' },
  { name: 'licenseExpiryDate', label: 'License expiry date', type: 'date', required: true },
  { name: 'contactNumber', label: 'Contact number' },
  { name: 'safetyScore', label: 'Safety score (0–100)', type: 'number', step: '0.1' },
];

export default function Drivers() {
  const { user } = useAuth();
  const toast = useToast();
  const canWrite = CAN_WRITE_ROLES.includes(user.role);

  const columns = [
    { key: 'name', label: 'Driver' },
    { key: 'licenseNumber', label: 'License #', render: (r) => <span className="font-mono">{r.licenseNumber}</span> },
    {
      key: 'licenseExpiryDate',
      label: 'License expiry',
      render: (r) => {
        const d = daysUntil(r.licenseExpiryDate);
        const soon = d != null && d <= 14;
        return <span className={soon ? 'text-danger' : ''}>{fmtDate(r.licenseExpiryDate)} {soon && `(${d}d)`}</span>;
      },
    },
    { key: 'safetyScore', label: 'Safety score', render: (r) => r.safetyScore?.toFixed(0) },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} colorKey={DRIVER_STATUS_COLORS[r.status]} /> },
  ];

  const toggleSuspend = async (row, { refresh }) => {
    try {
      await driversApi.action(row.id, row.status === 'SUSPENDED' ? 'reinstate' : 'suspend');
      toast.success(row.status === 'SUSPENDED' ? 'Driver reinstated' : 'Driver suspended');
      refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <ResourceListPage
      title="Drivers"
      subtitle="Suspended or license-expired drivers are automatically excluded from dispatch."
      api={driversApi}
      columns={columns}
      createFields={canWrite ? CREATE_FIELDS : null}
      editFields={canWrite ? EDIT_FIELDS : null}
      canCreate={canWrite}
      createLabel="Add driver"
      emptyIcon={UserRound}
      socketEvents={['driver.updated']}
      filters={[{ name: 'status', label: 'Status', options: Object.keys(DRIVER_STATUS_COLORS).map((s) => ({ value: s, label: s.replace('_', ' ') })) }]}
      rowActions={canWrite ? (row, ctx) => (
        <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => toggleSuspend(row, ctx)}>
          {row.status === 'SUSPENDED' ? 'Reinstate' : 'Suspend'}
        </button>
      ) : undefined}
    />
  );
}
