export default function Field({ field, value, onChange, error }) {
  const { name, label, type = 'text', options, required, placeholder, step } = field;

  const handle = (e) => {
    const raw = type === 'checkbox' ? e.target.checked : e.target.value;
    onChange(name, raw);
  };

  return (
    <div>
      <label className="label" htmlFor={name}>{label}{required && <span className="text-danger"> *</span>}</label>
      {type === 'select' ? (
        <select id={name} className="input" value={value ?? ''} onChange={handle}>
          <option value="" disabled>Select {label.toLowerCase()}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea id={name} className="input min-h-[80px]" value={value ?? ''} onChange={handle} placeholder={placeholder} />
      ) : type === 'checkbox' ? (
        <label className="flex items-center gap-2 text-sm text-ink">
          <input id={name} type="checkbox" checked={!!value} onChange={handle} className="accent-beacon w-4 h-4" />
          {placeholder}
        </label>
      ) : (
        <input
          id={name}
          type={type}
          step={step}
          className="input"
          value={value ?? ''}
          onChange={handle}
          placeholder={placeholder}
        />
      )}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
