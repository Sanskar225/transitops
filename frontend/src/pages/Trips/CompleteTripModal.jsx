import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { tripsApi } from '../../api/resources';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/client';

export default function CompleteTripModal({ trip, onClose, onDone }) {
  const [endOdometerKm, setEndOdometerKm] = useState('');
  const [fuelConsumedL, setFuelConsumedL] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await tripsApi.complete(trip.id, {
        endOdometerKm: Number(endOdometerKm),
        fuelConsumedL: fuelConsumedL ? Number(fuelConsumedL) : undefined,
      });
      toast.success('Trip completed');
      onDone();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!trip} onClose={onClose} title={`Complete trip — ${trip.source} → ${trip.destination}`}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Final odometer (km)</label>
          <input type="number" step="0.1" required className="input" value={endOdometerKm} onChange={(e) => setEndOdometerKm(e.target.value)} placeholder={`Must be ≥ start odometer`} />
        </div>
        <div>
          <label className="label">Fuel consumed (liters, optional)</label>
          <input type="number" step="0.1" className="input" value={fuelConsumedL} onChange={(e) => setFuelConsumedL(e.target.value)} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Spinner size={14} className="text-void" />} Complete trip
          </button>
        </div>
      </form>
    </Modal>
  );
}
