import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { Habit } from '../models/habit';
import type { HabitEntry } from '../models/habit-entry';
import { toggleBinary } from '../hooks/useHabits';
import { formatValue } from '../lib/format-utils';
import { hapticMedium, hapticSuccess } from '../lib/haptics';

interface HabitRowProps {
  habit: Habit;
  entry: HabitEntry | undefined;
  date: Date;
  onNumericTap: (habit: Habit, entry: HabitEntry | undefined) => void;
}

export default function HabitRow({ habit, entry, date, onNumericTap }: HabitRowProps) {
  const navigate = useNavigate();
  const [binaryBounce, setBinaryBounce] = useState(false);
  const [numericBounce, setNumericBounce] = useState(false);
  const prevValueRef = useRef<number | undefined>(entry?.value);
  const isCompleted = entry?.completed ?? false;

  // Trigger numeric bounce when value changes (after save)
  useEffect(() => {
    if (
      habit.type === 'numeric' &&
      entry?.value != null &&
      prevValueRef.current !== entry.value
    ) {
      if (prevValueRef.current !== undefined || entry.value !== undefined) {
        setNumericBounce(true);
        hapticSuccess();
        setTimeout(() => setNumericBounce(false), 150);
      }
    }
    prevValueRef.current = entry?.value;
  }, [entry?.value, habit.type]);

  const handleBinaryToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      hapticMedium();
      setBinaryBounce(true);
      setTimeout(() => setBinaryBounce(false), 150);
      await toggleBinary(habit.id, date, isCompleted);
    },
    [habit.id, date]
  );

  const handleNumericTap = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onNumericTap(habit, entry);
    },
    [habit, entry, onNumericTap]
  );

  const handleRowClick = useCallback(() => {
    navigate(`/habit/${habit.id}`);
  }, [navigate, habit.id]);

  return (
    <div
      onClick={handleRowClick}
      className="flex items-center justify-between py-[4px] cursor-pointer"
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleRowClick(); }}
    >
      <div className="flex flex-col gap-[2px] min-w-0">
        <span className="font-mono text-[16px] text-[var(--primary)] truncate">
          {habit.name}
        </span>
        {habit.type === 'numeric' && habit.unit && (
          <span className="font-mono text-[12px] text-[var(--secondary)]">
            {habit.unit}
          </span>
        )}
      </div>

      {habit.type === 'binary' ? (
        <motion.button
          onClick={handleBinaryToggle}
          animate={{ scale: binaryBounce ? 1.3 : 1.0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15, duration: 0.3 }}
          className="flex-shrink-0 flex items-center justify-center w-[28px] h-[28px] rounded-[6px] border-[0.5px] border-[var(--primary-30)] cursor-pointer"
          style={{
            backgroundColor: isCompleted ? 'var(--primary)' : 'transparent',
            transition: 'background-color 200ms ease-in-out',
          }}
          aria-pressed={isCompleted}
          aria-label={`Mark ${habit.name} as ${isCompleted ? 'incomplete' : 'complete'}`}
        >
          {isCompleted && (
            <Check size={14} strokeWidth={3} color="var(--background)" />
          )}
        </motion.button>
      ) : (
        <motion.button
          onClick={handleNumericTap}
          animate={{ scale: numericBounce ? 1.15 : 1.0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15, duration: 0.3 }}
          className="flex-shrink-0 flex items-center justify-center min-w-[46px] min-h-[28px] px-[8px] rounded-[6px] border-[0.5px] border-[var(--primary-30)] bg-transparent cursor-pointer"
          aria-label={`${habit.name} value: ${entry?.value != null ? formatValue(entry.value) : 'not set'}`}
        >
          <span
            className="font-mono text-[16px]"
            style={{
              color: entry?.value != null ? 'var(--primary)' : 'var(--secondary)',
            }}
          >
            {entry?.value != null ? formatValue(entry.value) : ''}
          </span>
        </motion.button>
      )}
    </div>
  );
}
