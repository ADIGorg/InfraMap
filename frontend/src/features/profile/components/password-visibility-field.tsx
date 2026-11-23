import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordVisibilityFieldProps {
  id: string;
  label: string;
  visibilityLabel: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
}

export function PasswordVisibilityField({
  id, label, visibilityLabel, value, onChange, autoComplete, disabled,
  minLength, maxLength,
}: PasswordVisibilityFieldProps) {
  const [visible, setVisible] = useState(false);
  const actionLabel = (visible ? 'Ocultar ' : 'Mostrar ') + visibilityLabel;

  return (
    <div className="min-w-0">
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="field-input pr-12"
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          required
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          aria-label={actionLabel}
          aria-pressed={visible}
          title={actionLabel}
          disabled={disabled}
          onClick={() => setVisible((previous) => !previous)}
          className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-lg text-ink-secondary transition hover:bg-surface-info hover:text-brand-primary disabled:opacity-60"
        >
          {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      </div>
    </div>
  );
}
