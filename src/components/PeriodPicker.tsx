const periods = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
] as const;

interface PeriodPickerProps {
  selectedDays: number;
  onSelect: (days: number) => void;
}

export default function PeriodPicker({ selectedDays, onSelect }: PeriodPickerProps) {
  return (
    <div className="flex rounded-[8px] overflow-hidden border border-[var(--primary-15)]">
      {periods.map((period) => (
        <button
          key={period.days}
          onClick={() => onSelect(period.days)}
          className={`flex-1 py-[6px] px-[12px] font-mono text-[12px] font-medium border-none cursor-pointer transition-colors ${
            selectedDays === period.days
              ? 'bg-[var(--primary)] text-[var(--background)]'
              : 'bg-transparent text-[var(--primary)]'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
