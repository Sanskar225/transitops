import { useEffect, useState } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { documentsApi } from '../../api/resources';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/client';
import { fmtDateTime } from '../../utils/formatters';

export default function VehicleDocumentsModal({ vehicle, onClose }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await documentsApi.list(vehicle.id);
      setDocs(res.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await documentsApi.upload(vehicle.id, file);
      toast.success('Document uploaded');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId) => {
    try {
      await documentsApi.remove(vehicle.id, docId);
      toast.success('Document removed');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <Modal open={!!vehicle} onClose={onClose} title={`Documents — ${vehicle.registrationNumber}`}>
      <label className="btn-secondary cursor-pointer w-full mb-4">
        {uploading ? <Spinner size={14} /> : <Upload size={16} />}
        Upload document (PDF, PNG, JPEG)
        <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted text-center py-6">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} className="text-beacon shrink-0" />
                <div className="min-w-0">
                  <div className="text-ink truncate">{d.fileName}</div>
                  <div className="text-xs text-muted">{fmtDateTime(d.createdAt)}</div>
                </div>
              </div>
              <button onClick={() => handleDelete(d.id)} className="text-muted hover:text-danger shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
