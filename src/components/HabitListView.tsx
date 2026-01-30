import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { startOfDay, isToday, getFullWeekday, formatMediumDate } from '../lib/date-utils';
import { useHabits, useEntriesForDate, setNumericValue, clearNumericValue } from '../hooks/useHabits';
import { hapticSuccess } from '../lib/haptics';
import type { Habit } from '../models/habit';
import type { HabitEntry } from '../models/habit-entry';
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
    entry: HabitEntry | undefined;
  } | null>(null);

  const { habits } = useHabits();
  const entries = useEntriesForDate(selectedDate);

  const titleText = isToday(selectedDate)
    ? getFullWeekday(selectedDate)
    : formatMediumDate(selectedDate);

  const handleNumericTap = useCallback(
    (habit: Habit, entry: HabitEntry | undefined) => {
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
    <div className="min-h-screen flex flex-col">
      {/* Title + Add button */}
      <div className="flex items-start justify-between px-[16px] pt-[4px]">
        <button
          onClick={() => setShowForm(true)}
          className="p-[8px] text-[var(--primary)] bg-transparent border-none cursor-pointer"
          aria-label="Add new habit"
        >
          <Plus size={24} strokeWidth={2} />
        </button>
        <h1
          className="text-[50px] leading-none text-[var(--primary)] text-right"
          style={{ fontFamily: "'Ndot57Regular', monospace" }}
        >
          {titleText}
        </h1>
      </div>

      {/* Date Strip */}
      <DateStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        habits={habits}
      />

      {/* Habit List */}
      <div className="flex-1 px-[16px]">
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
