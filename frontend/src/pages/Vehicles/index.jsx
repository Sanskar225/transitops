import { useState } from 'react';
import { Truck, FolderOpen } from 'lucide-react';
import ResourceListPage from '../../components/crud/ResourceListPage';
import StatusPill from '../../components/ui/StatusPill';
import VehicleDocumentsModal from './VehicleDocumentsModal';
import { vehiclesApi } from '../../api/resources';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/client';
import { VEHICLE_STATUS_COLORS, CAN_WRITE_ROLES } from '../../utils/constants';
import { fmtNumber, fmtCurrency } from '../../utils/formatters';

const CREATE_FIELDS = [
  { name: 'registrationNumber', label: 'Registration number', required: true, placeholder: 'VAN-05' },
  { name: 'make', label: 'Make', placeholder: 'Tata' },
  { name: 'model', label: 'Model', placeholder: 'Ace' },
  { name: 'year', label: 'Year', type: 'number' },
  { name: 'maxLoadCapacityKg', label: 'Max load capacity (kg)', type: 'number', required: true, step: '0.1' },
  { name: 'acquisitionCost', label: 'Acquisition cost', type: 'number', step: '0.01' },
  { name: 'currentOdometerKm', label: 'Current odometer (km)', type: 'number', step: '0.1' },
  { name: 'serviceIntervalKm', label: 'Service interval (km)', type: 'number', step: '0.1', placeholder: '5000' },
];

const EDIT_FIELDS = [
  { name: 'maxLoadCapacityKg', label: 'Max load capacity (kg)', type: 'number', required: true, step: '0.1' },
  { name: 'acquisitionCost', label: 'Acquisition cost', type: 'number', step: '0.01' },
  { name: 'serviceIntervalKm', label: 'Service interval (km)', type: 'number', step: '0.1' },
];

export default function Vehicles() {
  const { user } = useAuth();
  const toast = useToast();
  const [docsFor, setDocsFor] = useState(null);
  const canWrite = CAN_WRITE_ROLES.includes(user.role);

  const columns = [
    { key: 'registrationNumber', label: 'Vehicle', render: (r) => <span className="font-mono">{r.registrationNumber}</span> },
    { key: 'makeModel', label: 'Make / Model', render: (r) => `${r.make || '—'} ${r.model || ''}`.trim() },
    { key: 'capacity', label: 'Capacity', render: (r) => fmtNumber(r.maxLoadCapacityKg, ' kg') },
    { key: 'odometer', label: 'Odometer', render: (r) => fmtNumber(r.currentOdometerKm, ' km') },
    { key: 'acquisitionCost', label: 'Acquisition cost', render: (r) => fmtCurrency(r.acquisitionCost) },
    { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} colorKey={VEHICLE_STATUS_COLORS[r.status]} /> },
  ];

  const handleRetire = async (row, { refresh }) => {
    if (!confirm(`Retire vehicle ${row.registrationNumber}? This is permanent.`)) return;
    try {
      await vehiclesApi.action(row.id, 'retire');
      toast.success('Vehicle retired');
      refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <>
      <ResourceListPage
        title="Vehicles"
        subtitle="Fleet inventory. Retired and In Shop vehicles never appear in the dispatch pool."
        api={vehiclesApi}
        columns={columns}
        createFields={canWrite ? CREATE_FIELDS : null}
        editFields={canWrite ? EDIT_FIELDS : null}
        canCreate={canWrite}
        createLabel="Add vehicle"
        emptyIcon={Truck}
        socketEvents={['vehicle.updated']}
        filters={[{ name: 'status', label: 'Status', options: Object.keys(VEHICLE_STATUS_COLORS).map((s) => ({ value: s, label: s.replace('_', ' ') })) }]}
        rowActions={(row, ctx) => (
          <>
            <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setDocsFor(row)}>
              <FolderOpen size={14} />
            </button>
            {canWrite && row.status !== 'RETIRED' && (
              <button className="btn-ghost !px-2 !py-1 text-xs text-danger" onClick={() => handleRetire(row, ctx)}>
                Retire
              </button>
            )}
          </>
        )}
      />
      {docsFor && <VehicleDocumentsModal vehicle={docsFor} onClose={() => setDocsFor(null)} />}
    </>
  );
}
