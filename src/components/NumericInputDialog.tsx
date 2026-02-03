import { useState, useEffect, useRef } from 'react';

interface NumericInputDialogProps {
  isOpen: boolean;
  initialValue?: number;
  onSave: (value: string) => void;
  onCancel: () => void;
}

export default function NumericInputDialog({
  isOpen,
  initialValue,
  onSave,
  onCancel,
}: NumericInputDialogProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue != null ? String(initialValue) : '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(value.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-[var(--background)] rounded-[14px] w-[270px] overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-[20px] px-[16px] pb-[12px] text-center">
          <h3 className="font-mono text-[16px] font-semibold text-[var(--primary)] mb-[12px]">
            Enter value
          </h3>
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-[12px] py-[8px] font-mono text-[16px] text-[var(--primary)] bg-[var(--primary-06)] rounded-[8px] border-none outline-none text-center"
              placeholder="0"
            />
          </form>
        </div>
        <div className="flex border-t border-[var(--primary-15)]">
          <button
            onClick={onCancel}
            className="flex-1 py-[11px] font-mono text-[16px] text-[var(--accent)] bg-transparent border-none cursor-pointer border-r border-[var(--primary-15)] active:bg-[var(--primary-06)] transition-colors duration-100"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(value.trim())}
            className="flex-1 py-[11px] font-mono text-[16px] font-semibold text-[var(--accent)] bg-transparent border-none cursor-pointer active:bg-[var(--primary-06)] transition-colors duration-100"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
