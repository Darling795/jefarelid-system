"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { getAuditLog, listAuditLogs, type AuditLogItem } from "@/lib/api/audit";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ACTION_TONE: Record<string, string> = {
  create: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  update: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  delete: "bg-destructive/10 text-destructive",
};

function prettyKey(k: string): string {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\bId\b/g, "ID")
    .trim();
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(v)) return formatDate(v);
    return v;
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

type Json = Record<string, unknown> | null | undefined;

function AuditDiff({
  before,
  after,
  action,
}: {
  before: Json;
  after: Json;
  action: string;
}) {
  const b = before && typeof before === "object" ? before : {};
  const a = after && typeof after === "object" ? after : {};
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  if (keys.length === 0) {
    return <p className="text-sm text-muted-foreground">No details recorded.</p>;
  }
  return (
    <div className="max-h-[26rem] overflow-y-auto rounded-xl border">
      <dl className="divide-y">
        {keys.map((k) => {
          const bv = b[k];
          const av = a[k];
          const changed =
            action === "update" && JSON.stringify(bv) !== JSON.stringify(av);
          return (
            <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 px-3 py-2 text-sm">
              <dt className="truncate text-muted-foreground">{prettyKey(k)}</dt>
              <dd className="min-w-0 break-words">
                {action === "create" ? (
                  <span className="font-medium">{fmtVal(av)}</span>
                ) : action === "delete" ? (
                  <span>{fmtVal(bv)}</span>
                ) : changed ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-muted-foreground line-through">{fmtVal(bv)}</span>
                    <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                    <span className="font-semibold text-primary">{fmtVal(av)}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">{fmtVal(av)}</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export default function AuditPage() {
  const [entityType, setEntityType] = useState("");
  const [selected, setSelected] = useState<AuditLogItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["audit", entityType],
    queryFn: () => listAuditLogs(entityType ? { entityType } : {}),
  });
  const detail = useQuery({
    queryKey: ["audit", selected?.id],
    queryFn: () => getAuditLog(selected!.id),
    enabled: !!selected,
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Audit trail" description="Every create, update, and delete across the system." />

      <div className="mb-4 max-w-xs">
        <Input
          placeholder="Filter by entity (e.g. Contract)"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        />
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))}
            {data?.data.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No audit entries.</TableCell></TableRow>
            )}
            {data?.data.map((log) => (
              <TableRow key={log.id} className="cursor-pointer" onClick={() => setSelected(log)}>
                <TableCell className="whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                <TableCell>{log.user?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge className={ACTION_TONE[log.action] ?? ""}>{log.action}</Badge>
                </TableCell>
                <TableCell>
                  {log.entityType} <span className="text-muted-foreground">#{log.entityId.slice(-6)}</span>
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{log.ipAddress ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 capitalize">
              {selected && (
                <Badge className={ACTION_TONE[selected.action] ?? ""}>
                  {selected.action}
                </Badge>
              )}
              {selected?.entityType}
            </DialogTitle>
            {selected && (
              <p className="text-sm text-muted-foreground">
                {selected.user?.name ?? "System"} · {formatDate(selected.createdAt)}
                {selected.ipAddress ? ` · ${selected.ipAddress}` : ""}
              </p>
            )}
          </DialogHeader>

          <div className="mt-1">
            {detail.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <AuditDiff
                before={detail.data?.beforeJson as Json}
                after={detail.data?.afterJson as Json}
                action={selected?.action ?? ""}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
