import DashboardCard from "@/features/dashboard/components/DashboardCard";
import EmptyState, { type EmptyCopy } from "@/components/ui/EmptyState";

type WidgetPlaceholderProps = {
  title: string;
  copy: EmptyCopy;
};

/** Stand-in for a phase 1 widget until its own issue lands (#421 → #423–#425). */
export default function WidgetPlaceholder({ title, copy }: WidgetPlaceholderProps) {
  return (
    <DashboardCard title={title}>
      <EmptyState compact {...copy} />
    </DashboardCard>
  );
}
