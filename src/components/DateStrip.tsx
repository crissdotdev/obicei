import { useRef, useEffect, useMemo } from 'react';
import { startOfDay, addDays, getWeekdayLetter, isSameDay, toDateString, fromDateString } from '../lib/date-utils';
import type { Habit } from '../models/habit';
import { useCompletionStatus } from '../hooks/useHabits';

interface DateButtonProps {
  date: Date;
  isSelected: boolean;
  allCompleted: boolean;
  onSelect: (date: Date) => void;
}

function DateButton({ date, isSelected, allCompleted, onSelect }: DateButtonProps) {
  const dayLetter = getWeekdayLetter(date);
  const dayNumber = date.getDate();

  let bgClass: string;
  let textColor: string;

  if (isSelected) {
    bgClass = 'bg-[var(--accent)]';
    textColor = 'text-white';
  } else {
    bgClass = 'bg-[var(--primary-06)]';
    textColor = allCompleted ? 'text-[var(--accent)]' : 'text-[var(--primary)]';
  }

  return (
    <button
      onClick={() => onSelect(date)}
      className={`flex-shrink-0 flex flex-col items-center justify-center gap-[2px] w-[36px] h-[44px] rounded-[8px] transition-opacity duration-100 active:opacity-80 ${bgClass} ${textColor}`}
      aria-label={`${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${allCompleted ? ', all habits completed' : ''}`}
      aria-pressed={isSelected}
    >
      <span className="text-[10px] font-medium font-mono leading-none">{dayLetter}</span>
      <span className="text-[14px] font-semibold font-mono leading-none">{dayNumber}</span>
    </button>
  );
}

interface DateStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  habits: Habit[];
}

function DateButtonWrapper({ date, isSelected, onSelect, habits }: { date: Date; isSelected: boolean; onSelect: (date: Date) => void; habits: Habit[] }) {
  const allCompleted = useCompletionStatus(date, habits);
  return (
    <DateButton
      date={date}
      isSelected={isSelected}
      allCompleted={allCompleted}
      onSelect={onSelect}
    />
  );
}

export default function DateStrip({ selectedDate, onSelectDate, habits }: DateStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const dates = useMemo(() => {
    const today = startOfDay(new Date());

    // Find earliest habit creation date
    let startDate = today;
    if (habits.length > 0) {
      const earliest = habits.reduce((min, h) =>
        h.createdAt < min ? h.createdAt : min
      , habits[0].createdAt);
      startDate = fromDateString(earliest);
    }

    const result: Date[] = [];
    let current = startOfDay(startDate);
    while (current <= today) {
      result.push(new Date(current));
      current = addDays(current, 1);
    }
    return result;
  }, [habits]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [dates]);

  return (
    <div className="py-[20px]">
      <div
        ref={scrollRef}
        className="flex gap-[6px] overflow-x-auto px-[16px] py-[8px] hide-scrollbar"
      >
        {dates.map((date) => (
          <DateButtonWrapper
            key={toDateString(date)}
            date={date}
            isSelected={isSameDay(date, selectedDate)}
            onSelect={onSelectDate}
            habits={habits}
          />
        ))}
      </div>
    </div>
  );
}
