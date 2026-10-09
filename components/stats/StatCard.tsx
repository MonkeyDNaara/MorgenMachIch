type StatCardProps = {
  label: string;
  value: number;
  unit?: string;
};

/** Slim card next to the streak hero: label on the left, number on the right. */
export default function StatCard({ label, value, unit }: StatCardProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-box bg-base-200 px-4 py-3 shadow-raised">
      <span className="text-xs text-base-content/60">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-base-content/50">{unit}</span>}
      </span>
    </div>
  );
}
