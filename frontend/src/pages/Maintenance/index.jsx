import { Wrench } from 'lucide-react';
import ResourceListPage from '../../components/crud/ResourceListPage';
import StatusPill from '../../components/ui/StatusPill';
import { maintenanceApi, vehiclesApi } from '../../api/resources';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/client';
import { MAINTENANCE_STATUS_COLORS, CAN_WRITE_ROLES } from '../../utils/constants';
import { fmtCurrency, fmtDateTime } from '../../utils/formatters';
import { useEffect, useState } from 'react';

export default function Maintenance() {
  const { user } = useAuth();
  const toast = useToast();
  const canWrite = CAN_WRITE_ROLES.includes(user.role);
  const [vehicleOptions, setVehicleOptions] = useState([]);

  useEffect(() => {
    vehiclesApi.list({ limit: 100 }).then((res) => {
      setVehicleOptions(res.data.map((v) => ({ value: v.id, label: v.registrationNumber })));
    });
  }, []);

  const columns = [
    { key: 'vehicle', label: 'Vehicle', render: (r) => <span className="font-mono">{r.vehicleId?.slice(0, 8)}…</span> },
    { key: 'description', label: 'Description' },
    { key: 'cost', label: 'Cost', render: (r) => fmtCurrency(r.cost) },
    { key: 'openedAt', label: 'Opened', render: (r) => fmtDateTime(r.openedAt) },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} colorKey={MAINTENANCE_STATUS_COLORS[r.status]} /> },
  ];

  const CREATE_FIELDS = [
    { name: 'vehicleId', label: 'Vehicle', type: 'select', required: true, options: vehicleOptions },
    { name: 'description', label: 'Description', required: true, placeholder: 'Oil change' },
    { name: 'cost', label: 'Cost', type: 'number', step: '0.01' },
  ];

  const handleClose = async (row, { refresh }) => {
    try {
      await maintenanceApi.action(row.id, 'close');
      toast.success('Maintenance closed — vehicle restored to Available');
      refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <ResourceListPage
      title="Maintenance"
      subtitle="Opening a record locks the vehicle to In Shop; closing restores it (unless retired)."
      api={maintenanceApi}
      columns={columns}
      createFields={canWrite ? CREATE_FIELDS : null}
      canCreate={canWrite}
      createLabel="Open record"
      emptyIcon={Wrench}
      socketEvents={['maintenance.updated']}
      filters={[{ name: 'status', label: 'Status', options: Object.keys(MAINTENANCE_STATUS_COLORS).map((s) => ({ value: s, label: s })) }]}
      rowActions={canWrite ? (row, ctx) => row.status === 'OPEN' && (
        <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => handleClose(row, ctx)}>Close</button>
      ) : undefined}
    />
  );
}
