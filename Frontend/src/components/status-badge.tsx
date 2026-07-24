import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "green" | "amber" | "red" | "blue" | "gray";

const TONE: Record<Tone, string> = {
  green:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber:
    "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  red: "border-destructive/20 bg-destructive/10 text-destructive",
  blue: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  gray: "border-foreground/10 bg-muted text-muted-foreground",
};

const STATUS: Record<string, { label: string; tone: Tone }> = {
  // rooms
  vacant: { label: "Vacant", tone: "gray" },
  occupied: { label: "Occupied", tone: "green" },
  reserved: { label: "Reserved", tone: "amber" },
  // tenants / users / generic
  active: { label: "Active", tone: "green" },
  inactive: { label: "Inactive", tone: "gray" },
  // contracts
  draft: { label: "Draft", tone: "gray" },
  expiring: { label: "Expiring", tone: "amber" },
  renewed: { label: "Renewed", tone: "blue" },
  terminated: { label: "Terminated", tone: "red" },
  expired: { label: "Expired", tone: "red" },
  // invoices / utility bills
  unpaid: { label: "Unpaid", tone: "amber" },
  partial: { label: "Partial", tone: "blue" },
  paid: { label: "Paid", tone: "green" },
  overdue: { label: "Overdue", tone: "red" },
  voided: { label: "Voided", tone: "gray" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: "gray" as Tone };
  return (
    <Badge className={cn("capitalize", TONE[s.tone])}>{s.label}</Badge>
  );
}
