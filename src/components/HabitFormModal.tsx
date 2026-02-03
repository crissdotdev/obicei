import { useState, useEffect } from 'react';
import type { Habit } from '../models/habit';
import { createHabit, updateHabit } from '../hooks/useHabits';
import { requestNotificationPermission } from '../lib/notifications';
import { subscribeToPush } from '../lib/push';
import { utcToLocal } from '../lib/timezone';

interface HabitFormModalProps {
  isOpen: boolean;
  habit?: Habit;
  existingCategories?: string[];
  onClose: () => void;
}

export default function HabitFormModal({ isOpen, habit, existingCategories = [], onClose }: HabitFormModalProps) {
  const isEditing = !!habit;

  const [name, setName] = useState('');
  const [type, setType] = useState<'binary' | 'numeric'>('binary');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(9);
  const [reminderMinute, setReminderMinute] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (habit) {
        setName(habit.name);
        setType(habit.type);
        setUnit(habit.unit ?? '');
        setCategory(habit.category ?? '');
        setReminderEnabled(habit.reminderEnabled);
        const localTime = utcToLocal(habit.reminderHour, habit.reminderMinute);
        setReminderHour(localTime.hour);
        setReminderMinute(localTime.minute);
      } else {
        setName('');
        setType('binary');
        setUnit('');
        setCategory('');
        setReminderEnabled(false);
        setReminderHour(9);
        setReminderMinute(0);
      }
    }
  }, [isOpen, habit]);

  if (!isOpen) return null;

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;

    if (isEditing && habit) {
      await updateHabit(habit.id, {
        name,
        unit: habit.type === 'numeric' ? unit : undefined,
        reminderEnabled,
        reminderHour,
        reminderMinute,
        category: category.trim() || null,
      });
    } else {
      await createHabit({
        name,
        type,
        unit: type === 'numeric' ? unit : undefined,
        reminderEnabled,
        reminderHour,
        reminderMinute,
        category: category.trim() || null,
      });
    }
    onClose();
  };

  const handleReminderToggle = async () => {
    if (!reminderEnabled) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      subscribeToPush().catch(() => {});
    }
    setReminderEnabled(!reminderEnabled);
  };

  const timeValue = `${String(reminderHour).padStart(2, '0')}:${String(reminderMinute).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--background)] flex flex-col max-w-[600px] mx-auto" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-[16px] py-[12px] border-b border-[var(--primary-15)]">
        <button
          onClick={onClose}
          className="font-mono text-[16px] text-[var(--accent)] bg-transparent border-none cursor-pointer active:opacity-70 transition-opacity duration-100"
        >
          Cancel
        </button>
        <h2
          className="text-[17px] text-[var(--primary)]"
          style={{ fontFamily: "'Ndot57Regular', monospace" }}
        >
          {isEditing ? 'Edit Habit' : 'New Habit'}
        </h2>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`font-mono text-[16px] font-semibold bg-transparent border-none cursor-pointer active:opacity-70 transition-opacity duration-100 ${
            canSave ? 'text-[var(--accent)]' : 'text-[var(--secondary)]'
          }`}
        >
          Save
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-[16px] space-y-[24px]">
        {/* Name */}
        <div>
          <label className="block font-mono text-[12px] text-[var(--secondary)] uppercase mb-[8px]">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Habit name"
            className="w-full px-[12px] py-[10px] font-mono text-[16px] text-[var(--primary)] bg-[var(--primary-06)] rounded-[8px] border-none outline-none"
            autoFocus
          />
        </div>

        {/* Category */}
        <div>
          <label className="block font-mono text-[12px] text-[var(--secondary)] uppercase mb-[8px]">
            Category
          </label>
          <input
            type="text"
            list="category-suggestions"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Optional (e.g. Health, Work)"
            className="w-full px-[12px] py-[10px] font-mono text-[16px] text-[var(--primary)] bg-[var(--primary-06)] rounded-[8px] border-none outline-none"
          />
          {existingCategories.length > 0 && (
            <datalist id="category-suggestions">
              {existingCategories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          )}
        </div>

        {/* Type (create only) */}
        {!isEditing && (
          <div>
            <label className="block font-mono text-[12px] text-[var(--secondary)] uppercase mb-[8px]">
              Type
            </label>
            <div className="flex rounded-[8px] overflow-hidden border border-[var(--primary-15)]">
              <button
                onClick={() => setType('binary')}
                className={`flex-1 py-[8px] font-mono text-[14px] border-none cursor-pointer transition-all duration-100 active:opacity-80 ${
                  type === 'binary'
                    ? 'bg-[var(--primary)] text-[var(--background)]'
                    : 'bg-transparent text-[var(--primary)]'
                }`}
              >
                Yes / No
              </button>
              <button
                onClick={() => setType('numeric')}
                className={`flex-1 py-[8px] font-mono text-[14px] border-none cursor-pointer transition-all duration-100 active:opacity-80 ${
                  type === 'numeric'
                    ? 'bg-[var(--primary)] text-[var(--background)]'
                    : 'bg-transparent text-[var(--primary)]'
                }`}
              >
                Number
              </button>
            </div>
          </div>
        )}

        {/* Unit (numeric only) */}
        {((isEditing && habit?.type === 'numeric') || (!isEditing && type === 'numeric')) && (
          <div>
            <label className="block font-mono text-[12px] text-[var(--secondary)] uppercase mb-[8px]">
              Unit
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unit (e.g. grams, minutes)"
              className="w-full px-[12px] py-[10px] font-mono text-[16px] text-[var(--primary)] bg-[var(--primary-06)] rounded-[8px] border-none outline-none"
            />
          </div>
        )}

        {/* Reminder */}
        <div>
          <div className="flex items-center justify-between">
            <label className="font-mono text-[16px] text-[var(--primary)]">
              Daily Reminder
            </label>
            <button
              onClick={handleReminderToggle}
              className={`relative w-[51px] h-[31px] rounded-full border-none cursor-pointer transition-colors ${
                reminderEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--primary-30)]'
              }`}
            >
              <div
                className="absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-sm transition-transform"
                style={{
                  transform: reminderEnabled ? 'translateX(22px)' : 'translateX(2px)',
                }}
              />
            </button>
          </div>
          {reminderEnabled && (
            <input
              type="time"
              value={timeValue}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':').map(Number);
                setReminderHour(h);
                setReminderMinute(m);
              }}
              className="mt-[12px] w-full px-[12px] py-[10px] font-mono text-[16px] text-[var(--primary)] bg-[var(--primary-06)] rounded-[8px] border-none outline-none"
            />
          )}
        </div>
      </div>
    </div>
  );
}
