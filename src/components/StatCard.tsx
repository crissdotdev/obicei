interface StatCardProps {
  title: string;
  value: string;
}

export default function StatCard({ title, value }: StatCardProps) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-[4px] py-[12px] rounded-[8px]"
      style={{
        border: '0.5px dashed var(--primary-15)',
      }}
    >
      <span
        className="leading-none text-[var(--primary)] whitespace-nowrap overflow-hidden text-ellipsis max-w-full"
        style={{
          fontFamily: "'Ndot57Regular', monospace",
          fontSize: 'clamp(14px, 5vw, 28px)',
        }}
      >
        {value}
      </span>
      <span className="font-mono text-[12px] text-[var(--secondary)] uppercase">
        {title}
      </span>
    </div>
  );
}
