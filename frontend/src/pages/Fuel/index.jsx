import { useEffect, useState } from 'react';
import { Fuel } from 'lucide-react';
import ResourceListPage from '../../components/crud/ResourceListPage';
import { fuelApi, vehiclesApi } from '../../api/resources';
import { useAuth } from '../../context/AuthContext';
import { CAN_WRITE_ROLES } from '../../utils/constants';
import { fmtCurrency, fmtDate, fmtNumber } from '../../utils/formatters';

export default function FuelLogs() {
  const { user } = useAuth();
  const canWrite = CAN_WRITE_ROLES.includes(user.role);
  const [vehicleOptions, setVehicleOptions] = useState([]);

  useEffect(() => {
    vehiclesApi.list({ limit: 100 }).then((res) => {
      setVehicleOptions(res.data.map((v) => ({ value: v.id, label: v.registrationNumber })));
    });
  }, []);

  const columns = [
    { key: 'vehicle', label: 'Vehicle', render: (r) => <span className="font-mono">{r.vehicleId?.slice(0, 8)}…</span> },
    { key: 'liters', label: 'Liters', render: (r) => fmtNumber(r.liters, ' L') },
    { key: 'cost', label: 'Cost', render: (r) => fmtCurrency(r.cost) },
    { key: 'odometerKm', label: 'Odometer', render: (r) => fmtNumber(r.odometerKm, ' km') },
    { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
  ];

  const CREATE_FIELDS = [
    { name: 'vehicleId', label: 'Vehicle', type: 'select', required: true, options: vehicleOptions },
    { name: 'liters', label: 'Liters', type: 'number', required: true, step: '0.1' },
    { name: 'cost', label: 'Cost', type: 'number', required: true, step: '0.01' },
    { name: 'odometerKm', label: 'Odometer reading (km, optional)', type: 'number', step: '0.1' },
  ];

  const EDIT_FIELDS = [
    { name: 'liters', label: 'Liters', type: 'number', required: true, step: '0.1' },
    { name: 'cost', label: 'Cost', type: 'number', required: true, step: '0.01' },
  ];

  return (
    <ResourceListPage
      title="Fuel Logs"
      subtitle="Edits are optimistically locked — concurrent cost edits are rejected, never silently overwritten."
      api={fuelApi}
      columns={columns}
      createFields={canWrite ? CREATE_FIELDS : null}
      editFields={canWrite ? EDIT_FIELDS : null}
      canCreate={canWrite}
      createLabel="Add fuel log"
      emptyIcon={Fuel}
      socketEvents={['fuel.updated']}
    />
  );
}
