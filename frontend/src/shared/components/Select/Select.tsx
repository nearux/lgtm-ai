import { ChevronDown } from 'lucide-react';
import { useId, type SelectHTMLAttributes } from 'react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = ({
  label,
  options,
  className = '',
  id,
  ...props
}: Props) => {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className="flex items-center gap-2">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-gray-600">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`appearance-none rounded-lg border border-gray-200 bg-white py-2 pr-8 pl-3 text-sm text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400"
          size={14}
        />
      </div>
    </div>
  );
};
