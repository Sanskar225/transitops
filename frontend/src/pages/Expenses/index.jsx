import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import ResourceListPage from '../../components/crud/ResourceListPage';
import { expensesApi, vehiclesApi } from '../../api/resources';
import { useAuth } from '../../context/AuthContext';
import { CAN_WRITE_ROLES } from '../../utils/constants';
import { fmtCurrency, fmtDate } from '../../utils/formatters';

export default function Expenses() {
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
    { key: 'type', label: 'Type' },
    { key: 'amount', label: 'Amount', render: (r) => fmtCurrency(r.amount) },
    { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
    { key: 'notes', label: 'Notes', render: (r) => r.notes || '—' },
  ];

  const CREATE_FIELDS = [
    { name: 'vehicleId', label: 'Vehicle', type: 'select', required: true, options: vehicleOptions },
    { name: 'type', label: 'Type', required: true, placeholder: 'toll / fine / misc' },
    { name: 'amount', label: 'Amount', type: 'number', required: true, step: '0.01' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  return (
    <ResourceListPage
      title="Expenses"
      subtitle="Tolls, fines, and other vehicle-related costs feed directly into operational cost and ROI."
      api={expensesApi}
      columns={columns}
      createFields={canWrite ? CREATE_FIELDS : null}
      canCreate={canWrite}
      createLabel="Add expense"
      emptyIcon={Receipt}
      socketEvents={['expense.updated']}
    />
  );
}
