import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import Spinner from '../../components/ui/Spinner';
import { vehiclesApi, driversApi, tripsApi } from '../../api/resources';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/client';

export default function CreateTripModal({ open, onClose, onCreated, prefill }) {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setValues(prefill || {});
    setError('');
    (async () => {
      const [v, d] = await Promise.all([
        vehiclesApi.list({ dispatchable: 'true', limit: 100 }),
        driversApi.list({ assignable: 'true', limit: 100 }),
      ]);
      setVehicles(v.data);
      setDrivers(d.data);
    })();
  }, [open, prefill]);

  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const fields = [
    { name: 'source', label: 'Source', required: true, placeholder: 'Warehouse A' },
    { name: 'destination', label: 'Destination', required: true, placeholder: 'Depot B' },
    { name: 'vehicleId', label: 'Vehicle', type: 'select', required: true, options: vehicles.map((v) => ({ value: v.id, label: `${v.registrationNumber} (max ${v.maxLoadCapacityKg}kg)` })) },
    { name: 'driverId', label: 'Driver', type: 'select', required: true, options: drivers.map((d) => ({ value: d.id, label: `${d.name} (safety ${d.safetyScore})` })) },
    { name: 'cargoWeightKg', label: 'Cargo weight (kg)', type: 'number', required: true, step: '0.1' },
    { name: 'plannedDistanceKm', label: 'Planned distance (km)', type: 'number', required: true, step: '0.1' },
  ];

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await tripsApi.create({
        ...values,
        cargoWeightKg: Number(values.cargoWeightKg),
        plannedDistanceKm: Number(values.plannedDistanceKm),
      });
      toast.success('Trip drafted');
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New trip">
      <form onSubmit={submit} className="space-y-4">
        {fields.map((f) => <Field key={f.name} field={f} value={values[f.name]} onChange={set} />)}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Spinner size={14} className="text-void" />} Create draft
          </button>
        </div>
      </form>
    </Modal>
  );
}
