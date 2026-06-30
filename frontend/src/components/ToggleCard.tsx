type ToggleCardProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function ToggleCard({label, description, checked, onChange}: ToggleCardProps) {
  return (
    <label className="toggle-card">
      <span>
        <span className="block text-sm font-semibold text-neutral-800">{label}</span>
        <span className="mt-1 block text-sm leading-5 text-neutral-500">{description}</span>
      </span>
      <input
        className="h-5 w-5 shrink-0 accent-neutral-950"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
