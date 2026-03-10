interface TabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface Props<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export const Tabs = <T extends string>({
  options,
  value,
  onChange,
}: Props<T>) => {
  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            value === option.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {option.label}
          {option.count !== undefined && (
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                value === option.value
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
