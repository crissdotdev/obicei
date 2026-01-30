interface EmptyStateProps {
  onAddHabit: () => void;
}

export default function EmptyState({ onAddHabit }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-[16px] py-20">
      <p className="font-mono text-[16px] text-[var(--secondary)]">
        No habits yet.
      </p>
      <button
        onClick={onAddHabit}
        className="font-mono text-[16px] text-[var(--accent)] bg-transparent border-none cursor-pointer"
      >
        Add your first habit
      </button>
    </div>
  );
}
