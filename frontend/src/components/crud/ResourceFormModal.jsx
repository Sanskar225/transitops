import { useEffect, useState } from 'react';
import Field from '../ui/Field';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';

export default function ResourceFormModal({ open, onClose, title, fields, initialValues, onSubmit, submitLabel = 'Save' }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setValues(initialValues || {});
      setErrors({});
    }
  }, [open, initialValues]);

  const handleChange = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    fields.forEach((f) => {
      if (f.required && (values[f.name] === undefined || values[f.name] === '')) {
        nextErrors[f.name] = 'Required';
      }
    });
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);

    setSaving(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      setErrors({ _form: err.displayMessage || 'Failed to save. Please check the values and try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((f) => (
          <Field key={f.name} field={f} value={values[f.name]} onChange={handleChange} error={errors[f.name]} />
        ))}
        {errors._form && <p className="text-sm text-danger">{errors._form}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Spinner size={14} className="text-void" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
