import { useState, useCallback } from 'react';
import { Plus, LogOut } from 'lucide-react';
import { startOfDay, isToday, getFullWeekday, formatMediumDate } from '../lib/date-utils';
import { useHabits, useEntriesForDate, setNumericValue, clearNumericValue } from '../hooks/useHabits';
import { useAuth } from '../contexts/AuthContext';
import { hapticSuccess } from '../lib/haptics';
import type { Habit } from '../models/habit';
import DateStrip from './DateStrip';
import HabitRow from './HabitRow';
import EmptyState from './EmptyState';
import HabitFormModal from './HabitFormModal';
import NumericInputDialog from './NumericInputDialog';

export default function HabitListView() {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [numericDialog, setNumericDialog] = useState<{
    habit: Habit;
    entry: { habitId: string; date: string; completed: boolean; value?: number } | undefined;
  } | null>(null);

  const { habits } = useHabits();
  const entries = useEntriesForDate(selectedDate, habits);
  const { logout } = useAuth();

  const titleText = isToday(selectedDate)
    ? getFullWeekday(selectedDate)
    : formatMediumDate(selectedDate);

  const handleNumericTap = useCallback(
    (habit: Habit, entry: { habitId: string; date: string; completed: boolean; value?: number } | undefined) => {
      setNumericDialog({ habit, entry });
    },
    []
  );

  const handleNumericSave = useCallback(
    async (valueStr: string) => {
      if (!numericDialog) return;
      const { habit } = numericDialog;

      if (valueStr === '') {
        await clearNumericValue(habit.id, selectedDate);
      } else {
        const num = parseFloat(valueStr);
        if (!isNaN(num)) {
          await setNumericValue(habit.id, num, selectedDate);
          hapticSuccess();
        }
      }
      setNumericDialog(null);
    },
    [numericDialog, selectedDate]
  );

  const getEntryForHabit = (habitId: string) =>
    entries.find((e) => e.habitId === habitId);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Title + Add/Logout buttons */}
      <div className="flex items-start justify-between px-[16px] pt-[4px] shrink-0">
        <div className="flex items-center gap-[4px]">
          <button
            onClick={() => setShowForm(true)}
            className="p-[8px] text-[var(--primary)] bg-transparent border-none cursor-pointer"
            aria-label="Add new habit"
          >
            <Plus size={24} strokeWidth={2} />
          </button>
          <button
            onClick={logout}
            className="p-[8px] text-[var(--secondary)] bg-transparent border-none cursor-pointer"
            aria-label="Log out"
          >
            <LogOut size={18} strokeWidth={2} />
          </button>
        </div>
        <h1
          className="text-[50px] leading-none text-[var(--primary)] text-right"
          style={{ fontFamily: "'Ndot57Regular', monospace" }}
        >
          {titleText}
        </h1>
      </div>

      {/* Date Strip */}
      <div className="shrink-0">
        <DateStrip
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          habits={habits}
        />
      </div>

      {/* Habit List — scrollable */}
      <div className="flex-1 overflow-y-auto px-[16px]">
        {habits.length === 0 ? (
          <EmptyState onAddHabit={() => setShowForm(true)} />
        ) : (
          <div className="divide-y divide-[var(--primary-06)]">
            {habits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                entry={getEntryForHabit(habit.id)}
                date={selectedDate}
                onNumericTap={handleNumericTap}
              />
            ))}
          </div>
        )}
        <p className="text-center font-mono text-[11px] text-[var(--secondary)] pb-[16px] pt-[32px] opacity-40">
          v{__APP_VERSION__}
        </p>
      </div>

      {/* Modals */}
      <HabitFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
      />

      <NumericInputDialog
        isOpen={numericDialog !== null}
        initialValue={numericDialog?.entry?.value}
        onSave={handleNumericSave}
        onCancel={() => setNumericDialog(null)}
      />
    </div>
  );
}
