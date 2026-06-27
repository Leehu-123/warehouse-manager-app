import { X } from 'lucide-react';

export interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface FilterBarProps {
  filters: FilterOption[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClearAll: () => void;
}

export default function FilterBar({ filters, values, onChange, onClearAll }: FilterBarProps) {
  const activeFilters = Object.entries(values).filter(([, v]) => v !== '');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <select
            key={filter.key}
            value={values[filter.key] || ''}
            onChange={(e) => onChange(filter.key, e.target.value)}
            className="select-field w-auto min-w-[140px] text-sm"
          >
            <option value="">{filter.label}</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ))}
      </div>
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map(([key, value]) => {
            const filter = filters.find(f => f.key === key);
            const option = filter?.options.find(o => o.value === value);
            return (
              <span key={key} className="inline-flex items-center gap-1 px-2 py-1 bg-brand-50 text-brand-700 rounded-md text-xs font-medium">
                {filter?.label}: {option?.label || value}
                <button onClick={() => onChange(key, '')} className="hover:text-brand-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          <button onClick={onClearAll} className="text-xs text-surface-500 hover:text-surface-700 underline">
            Xóa tất cả
          </button>
        </div>
      )}
    </div>
  );
}
