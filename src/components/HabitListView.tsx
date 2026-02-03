import { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Reorder } from 'framer-motion';
import { Plus, Settings, GripVertical } from 'lucide-react';
import { startOfDay, isToday, getFullWeekday, formatMediumDate } from '../lib/date-utils';
import { useHabits, useEntriesForDate, setNumericValue, clearNumericValue, reorderHabits } from '../hooks/useHabits';
import { hapticSuccess } from '../lib/haptics';
import type { Habit } from '../models/habit';
import DateStrip from './DateStrip';
import HabitRow from './HabitRow';
import EmptyState from './EmptyState';
import HabitFormModal from './HabitFormModal';
import NumericInputDialog from './NumericInputDialog';

interface CategoryGroup {
  key: string; // category name or '__uncategorized__'
  label: string | null; // null for uncategorized
  habits: Habit[];
}

function groupHabits(habits: Habit[]): CategoryGroup[] {
  const uncategorized: Habit[] = [];
  const categoryMap = new Map<string, Habit[]>();
  const categoryOrderMap = new Map<string, number>();

  for (const h of habits) {
    if (!h.category) {
      uncategorized.push(h);
    } else {
      const list = categoryMap.get(h.category) || [];
      list.push(h);
      categoryMap.set(h.category, list);
      if (!categoryOrderMap.has(h.category)) {
        categoryOrderMap.set(h.category, h.categoryOrder);
      }
    }
  }

  const groups: CategoryGroup[] = [];

  if (uncategorized.length > 0) {
    groups.push({ key: '__uncategorized__', label: null, habits: uncategorized });
  }

  const sortedCategories = [...categoryMap.entries()].sort(
    (a, b) => (categoryOrderMap.get(a[0]) ?? 0) - (categoryOrderMap.get(b[0]) ?? 0),
  );

  for (const [cat, catHabits] of sortedCategories) {
    groups.push({ key: cat, label: cat, habits: catHabits });
  }

  return groups;
}

export default function HabitListView() {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [numericDialog, setNumericDialog] = useState<{
    habit: Habit;
    entry: { habitId: string; date: string; completed: boolean; value?: number } | undefined;
  } | null>(null);

  const navigate = useNavigate();
  const { habits } = useHabits();
  const entries = useEntriesForDate(selectedDate, habits);

  const groups = useMemo(() => groupHabits(habits), [habits]);
  const isDraggingRef = useRef(false);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [habitOrders, setHabitOrders] = useState<Record<string, string[]>>({});

  // Sync server state into local reorder state
  const serverGroupKeys = useMemo(() => groups.map((g) => g.key), [groups]);
  const prevServerKeysRef = useRef<string>('');
  const serverKeysStr = serverGroupKeys.join(',');
  if (serverKeysStr !== prevServerKeysRef.current) {
    prevServerKeysRef.current = serverKeysStr;
    setCategoryOrder(serverGroupKeys);
    const orders: Record<string, string[]> = {};
    for (const g of groups) {
      orders[g.key] = g.habits.map((h) => h.id);
    }
    setHabitOrders(orders);
  }

  const existingCategories = useMemo(
    () => [...new Set(habits.map((h) => h.category).filter((c): c is string => !!c))],
    [habits],
  );

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

  const habitById = useMemo(() => {
    const map = new Map<string, Habit>();
    for (const h of habits) map.set(h.id, h);
    return map;
  }, [habits]);

  const persistOrder = useCallback(
    (newCategoryOrder: string[], newHabitOrders: Record<string, string[]>) => {
      const updates: { id: string; sortOrder: number; category?: string | null; categoryOrder?: number }[] = [];

      for (let ci = 0; ci < newCategoryOrder.length; ci++) {
        const catKey = newCategoryOrder[ci];
        const isUncategorized = catKey === '__uncategorized__';
        const habitIds = newHabitOrders[catKey] || [];

        for (let hi = 0; hi < habitIds.length; hi++) {
          const habit = habitById.get(habitIds[hi]);
          if (!habit) continue;
          updates.push({
            id: habit.id,
            sortOrder: hi,
            category: isUncategorized ? null : catKey,
            categoryOrder: isUncategorized ? 0 : ci,
          });
        }
      }

      if (updates.length > 0) {
        reorderHabits(updates);
      }
    },
    [habitById],
  );

  const handleCategoryReorder = useCallback(
    (newOrder: string[]) => {
      setCategoryOrder(newOrder);
      persistOrder(newOrder, habitOrders);
    },
    [habitOrders, persistOrder],
  );

  const handleHabitReorder = useCallback(
    (catKey: string, newIds: string[]) => {
      const newOrders = { ...habitOrders, [catKey]: newIds };
      setHabitOrders(newOrders);
      persistOrder(categoryOrder, newOrders);
    },
    [habitOrders, categoryOrder, persistOrder],
  );

  const groupByKey = useMemo(() => {
    const map = new Map<string, CategoryGroup>();
    for (const g of groups) map.set(g.key, g);
    return map;
  }, [groups]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Title + Add/Settings buttons */}
      <div className="flex items-start justify-between px-[16px] pt-[4px] shrink-0">
        <div className="flex items-center gap-[4px]">
          <button
            onClick={() => setShowForm(true)}
            className="p-[8px] text-[var(--primary)] bg-transparent border-none cursor-pointer rounded-[8px] transition-colors duration-100 active:bg-[var(--primary-06)]"
            aria-label="Add new habit"
          >
            <Plus size={24} strokeWidth={2} />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="p-[8px] text-[var(--secondary)] bg-transparent border-none cursor-pointer rounded-[8px] transition-colors duration-100 active:bg-[var(--primary-06)]"
            aria-label="Settings"
          >
            <Settings size={18} strokeWidth={2} />
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
      <div className="flex-1 overflow-y-auto px-[16px]" style={{ position: 'relative' }}>
        {habits.length === 0 ? (
          <EmptyState onAddHabit={() => setShowForm(true)} />
        ) : (
          <Reorder.Group
            axis="y"
            values={categoryOrder}
            onReorder={handleCategoryReorder}
            as="div"
            className="space-y-[8px]"
          >
            {categoryOrder.map((catKey) => {
              const group = groupByKey.get(catKey);
              if (!group) return null;
              const ids = habitOrders[catKey] || [];

              return (
                <Reorder.Item
                  key={catKey}
                  value={catKey}
                  as="div"
                  dragListener={!!group.label}
                  style={{ position: 'relative' }}
                >
                  {group.label && (
                    <div className="flex items-center gap-[4px] pt-[12px] pb-[4px] cursor-grab active:cursor-grabbing">
                      <GripVertical size={14} strokeWidth={2} className="text-[var(--primary-30)] flex-shrink-0" />
                      <span className="font-mono text-[12px] text-[var(--secondary)] uppercase tracking-wider">
                        {group.label}
                      </span>
                    </div>
                  )}
                  <Reorder.Group
                    axis="y"
                    values={ids}
                    onReorder={(newIds) => handleHabitReorder(catKey, newIds)}
                    as="div"
                    className="divide-y divide-[var(--primary-06)]"
                  >
                    {ids.map((id) => {
                      const habit = habitById.get(id);
                      if (!habit) return null;
                      return (
                        <Reorder.Item
                          key={id}
                          value={id}
                          as="div"
                          style={{ position: 'relative' }}
                          onDragStart={() => { isDraggingRef.current = true; }}
                          onDragEnd={() => { requestAnimationFrame(() => { isDraggingRef.current = false; }); }}
                        >
                          <HabitRow
                            habit={habit}
                            entry={getEntryForHabit(id)}
                            date={selectedDate}
                            onNumericTap={handleNumericTap}
                            isDraggingRef={isDraggingRef}
                          />
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        )}
        <div className="pb-[16px] pt-[32px]" />
      </div>

      {/* Modals */}
      <HabitFormModal
        isOpen={showForm}
        existingCategories={existingCategories}
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
