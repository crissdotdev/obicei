import { useRef, useEffect, useMemo } from 'react';
import { getSundayOfWeek, getSaturdayOfWeek, addDays, toDateString, isFuture, isToday, getMonthAbbr, daysBetween, fromDateString, startOfDay } from '../lib/date-utils';

interface ContributionGridProps {
  createdAt: string;
  completedDates: Set<string>;
}

export default function ContributionGrid({ createdAt, completedDates }: ContributionGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { weeks, monthLabels, totalDays } = useMemo(() => {
    const createdDate = fromDateString(createdAt);
    const today = startOfDay(new Date());
    const gridStart = getSundayOfWeek(createdDate);
    const gridEnd = getSaturdayOfWeek(today);

    const weeks: { date: Date; key: string }[][] = [];
    let currentWeek: { date: Date; key: string }[] = [];
    let current = new Date(gridStart);

    while (current <= gridEnd) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push({ date: new Date(current), key: toDateString(current) });
      current = addDays(current, 1);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    // Month labels
    const monthLabels: { label: string; colStart: number; colSpan: number }[] = [];
    let currentMonth = -1;
    let labelStart = 0;

    weeks.forEach((week, colIdx) => {
      // Use the first day of the week to determine month
      const firstDay = week[0].date;
      const month = firstDay.getMonth();
      if (month !== currentMonth) {
        if (currentMonth !== -1) {
          monthLabels.push({
            label: getMonthAbbr(weeks[labelStart][0].date),
            colStart: labelStart,
            colSpan: colIdx - labelStart,
          });
        }
        currentMonth = month;
        labelStart = colIdx;
      }
    });
    // Push last month
    if (weeks.length > 0) {
      monthLabels.push({
        label: getMonthAbbr(weeks[labelStart][0].date),
        colStart: labelStart,
        colSpan: weeks.length - labelStart,
      });
    }

    const total = Math.max(1, daysBetween(createdDate, today) + 1);

    return { weeks, monthLabels, totalDays: total };
  }, [createdAt]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [weeks]);

  const createdDate = fromDateString(createdAt);
  const dotSize = 12;
  const gap = 3;
  const cellTotal = dotSize + gap;

  return (
    <div>
      <div
        ref={scrollRef}
        className="overflow-x-auto hide-scrollbar px-[4px]"
      >
        {/* Month labels */}
        <div className="flex" style={{ marginBottom: gap }}>
          {monthLabels.map((ml, i) => (
            <div
              key={i}
              className="font-mono text-[9px] text-[var(--secondary)]"
              style={{ width: ml.colSpan * cellTotal, flexShrink: 0 }}
            >
              {ml.label}
            </div>
          ))}
        </div>

        {/* Grid - columns are weeks, rows are days of week */}
        <div className="flex" style={{ gap }}>
          {weeks.map((week, colIdx) => (
            <div key={colIdx} className="flex flex-col" style={{ gap }}>
              {Array.from({ length: 7 }, (_, rowIdx) => {
                const cell = week.find((c) => c.date.getDay() === rowIdx);
                if (!cell) {
                  return (
                    <div
                      key={rowIdx}
                      style={{ width: dotSize, height: dotSize, borderRadius: 2 }}
                    />
                  );
                }

                const dateStr = cell.key;
                const cellDate = cell.date;
                const isBefore = cellDate < createdDate;
                const isFutureDate = isFuture(cellDate);
                const isCompleted = completedDates.has(dateStr);
                const isTodayDate = isToday(cellDate);

                let bgColor = 'var(--primary-08)';
                if (isBefore || isFutureDate) {
                  bgColor = 'transparent';
                } else if (isCompleted) {
                  bgColor = 'var(--accent-75)';
                }

                return (
                  <div
                    key={rowIdx}
                    style={{
                      width: dotSize,
                      height: dotSize,
                      borderRadius: 2,
                      backgroundColor: bgColor,
                      boxShadow: isTodayDate
                        ? 'inset 0 0 0 1.5px var(--accent)'
                        : undefined,
                    }}
                    aria-label={`${cellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}: ${isCompleted ? 'completed' : isBefore || isFutureDate ? 'not applicable' : 'not completed'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="font-mono text-[12px] text-[var(--secondary)] pt-[4px]">
        LAST {totalDays} DAYS
      </p>
    </div>
  );
}
