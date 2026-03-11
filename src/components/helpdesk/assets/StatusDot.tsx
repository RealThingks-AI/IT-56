type StatusType = "active" | "inactive" | "pending" | "in_progress" | "completed" | "cancelled" | "expired" | "expiring";

const DOT_COLORS: Record<string, string> = {
  active: "bg-emerald-500",
  inactive: "bg-slate-400",
  pending: "bg-amber-400",
  in_progress: "bg-sky-500",
  completed: "bg-emerald-500",
  cancelled: "bg-slate-400",
  expired: "bg-rose-500",
  expiring: "bg-amber-400",
};

export const StatusDot = ({ status, label }: { status: StatusType; label: string }) => {
  const dotColor = DOT_COLORS[status] || "bg-muted-foreground";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
};
