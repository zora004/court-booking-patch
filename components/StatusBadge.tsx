const STYLES: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-slate-100 text-slate-700",
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-slate-100 text-slate-500",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        STYLES[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}
