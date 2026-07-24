"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bell, CircleAlert, Clock, TriangleAlert } from "lucide-react";

import { getAlerts, type AlertSeverity } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ICON: Record<AlertSeverity, typeof CircleAlert> = {
  danger: CircleAlert,
  warning: TriangleAlert,
  info: Clock,
};
const TONE: Record<AlertSeverity, string> = {
  danger: "text-destructive",
  warning: "text-amber-500",
  info: "text-sky-500",
};

export function AlertsBell() {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["alerts"],
    queryFn: getAlerts,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const alerts = data ?? [];
  const count = alerts.length;
  const hasDanger = alerts.some((a) => a.severity === "danger");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative grid size-9 place-items-center rounded-full border border-border bg-background text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
        <Bell className="size-4.5" />
        {count > 0 && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-card",
              hasDanger ? "bg-destructive" : "bg-amber-500",
            )}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold">Alerts</span>
          <span className="text-xs text-muted-foreground">{count} active</span>
        </div>
        <div className="max-h-96 overflow-y-auto p-1">
          {count === 0 && (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              You&rsquo;re all caught up.
            </div>
          )}
          {alerts.map((a) => {
            const Icon = ICON[a.severity];
            return (
              <DropdownMenuItem
                key={a.id}
                onClick={() => router.push(a.href)}
                className="flex items-start gap-2.5 py-2"
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", TONE[a.severity])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{a.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {a.message}
                  </p>
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
