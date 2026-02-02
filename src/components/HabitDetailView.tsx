import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useHabit, useAllEntries, deleteHabit } from '../hooks/useHabits';
import {
  useCurrentStreak,
  useLongestStreak,
  useCompletionRate,
  useCompletedDatesSet,
  useNumericEntries,
  useNumericStats,
} from '../hooks/useHabitDetail';
import { formatValue } from '../lib/format-utils';
import StatCard from './StatCard';
import ContributionGrid from './ContributionGrid';
import PeriodPicker from './PeriodPicker';
import NumericChart from './NumericChart';
import HabitFormModal from './HabitFormModal';

export default function HabitDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [periodDays, setPeriodDays] = useState(30);

  const habit = useHabit(id);
  const entries = useAllEntries(id ?? '');

  // Binary stats
  const currentStreak = useCurrentStreak(entries);
  const longestStreak = useLongestStreak(entries);
  const completionRate = useCompletionRate(entries, habit?.createdAt ?? '');
  const completedDates = useCompletedDatesSet(entries);

  // Numeric stats
  const numericEntries = useNumericEntries(entries, periodDays);
  const { average, min, max } = useNumericStats(numericEntries);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    await deleteHabit(id);
    navigate('/');
  }, [id, navigate]);

  if (!habit) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-[var(--secondary)]">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between px-[16px] py-[12px] border-b border-[var(--primary-06)]">
        <button
          onClick={() => navigate('/')}
          className="p-[4px] text-[var(--accent)] bg-transparent border-none cursor-pointer flex items-center gap-[4px]"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
          <span className="font-mono text-[16px]">Back</span>
        </button>
        <h2
          className="text-[17px] text-[var(--primary)] truncate max-w-[50%]"
          style={{ fontFamily: "'Ndot57Regular', monospace" }}
        >
          {habit.name}
        </h2>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-[4px] text-[var(--primary)] bg-transparent border-none cursor-pointer"
            aria-label="More options"
          >
            <MoreHorizontal size={20} />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-[32px] z-50 bg-[var(--background)] border border-[var(--primary-15)] rounded-[8px] shadow-lg overflow-hidden min-w-[140px]">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setShowEditForm(true);
                  }}
                  className="w-full flex items-center gap-[8px] px-[12px] py-[10px] font-mono text-[14px] text-[var(--primary)] bg-transparent border-none cursor-pointer hover:bg-[var(--primary-06)]"
                >
                  <Pencil size={14} />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full flex items-center gap-[8px] px-[12px] py-[10px] font-mono text-[14px] text-red-500 bg-transparent border-none cursor-pointer hover:bg-[var(--primary-06)]"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-[16px] space-y-[20px]">
        {/* Unit header for numeric habits */}
        {habit.type === 'numeric' && habit.unit && (
          <p className="font-mono text-[12px] text-[var(--secondary)] uppercase">
            {habit.unit}
          </p>
        )}

        {habit.type === 'binary' ? (
          <>
            {/* Binary Stat Cards */}
            <div className="flex gap-[8px]">
              <StatCard title="Current" value={String(currentStreak)} />
              <StatCard title="Longest" value={String(longestStreak)} />
              <StatCard title="Rate" value={`${completionRate}%`} />
            </div>

            {/* Contribution Grid */}
            <ContributionGrid
              createdAt={habit.createdAt}
              completedDates={completedDates}
            />
          </>
        ) : (
          <>
            {/* Numeric Stat Cards */}
            <div className="flex gap-[8px]">
              <StatCard title="Average" value={formatValue(average)} />
              <StatCard title="Min" value={formatValue(min)} />
              <StatCard title="Max" value={formatValue(max)} />
            </div>

            {/* Period Picker */}
            <PeriodPicker
              selectedDays={periodDays}
              onSelect={setPeriodDays}
            />

            {/* Chart */}
            <NumericChart entries={numericEntries} average={average} />
          </>
        )}
      </div>

      {/* Edit Modal */}
      <HabitFormModal
        isOpen={showEditForm}
        habit={habit}
        onClose={() => setShowEditForm(false)}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-[var(--background)] rounded-[14px] w-[270px] overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-[20px] px-[16px] pb-[16px] text-center">
              <h3 className="font-mono text-[16px] font-semibold text-[var(--primary)] mb-[4px]">
                Delete Habit
              </h3>
              <p className="font-mono text-[13px] text-[var(--secondary)]">
                This will delete all entries for &ldquo;{habit.name}&rdquo;. This cannot be undone.
              </p>
            </div>
            <div className="flex border-t border-[var(--primary-15)]">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-[11px] font-mono text-[16px] text-[var(--accent)] bg-transparent border-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-[11px] font-mono text-[16px] font-semibold text-red-500 bg-transparent border-none cursor-pointer border-l border-[var(--primary-15)]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
