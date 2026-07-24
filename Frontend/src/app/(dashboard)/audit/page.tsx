"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.action} · {selected?.entityType}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Before</p>
              <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">
                {JSON.stringify(detail.data?.beforeJson ?? null, null, 2)}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">After</p>
              <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">
                {JSON.stringify(detail.data?.afterJson ?? null, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
