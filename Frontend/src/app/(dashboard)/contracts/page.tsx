"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";

import { listContracts } from "@/lib/api/contracts";
import { formatDate, formatPHP } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUSES = ["all", "draft", "active", "expiring", "renewed", "terminated", "expired"];
const STATUS_ITEMS = STATUSES.map((s) => ({
  value: s,
  label: s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1),
}));

export default function ContractsPage() {
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useQuery({
    queryKey: ["contracts", status],
    queryFn: () => listContracts(status === "all" ? {} : { status }),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Contracts"
        description="Lease agreements and their lifecycle."
        action={
          <Button nativeButton={false} render={<Link href="/contracts/new" />}>
            <Plus /> New contract
          </Button>
        }
      />

      <div className="mb-4 w-48">
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")} items={STATUS_ITEMS}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Building · Room</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Basic rent</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {data?.data.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <EmptyState
                    icon={FileText}
                    title={status === "all" ? "No contracts yet" : `No ${status} contracts`}
                    description="Create a lease linking a tenant to a room."
                    action={
                      <Button nativeButton={false} render={<Link href="/contracts/new" />}>
                        <Plus /> New contract
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/contracts/${c.id}`} className="font-medium hover:underline">
                    {c.tenant.businessName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.buildingName} · {c.roomNumber}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(c.startDate)} – {formatDate(c.endDate)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatPHP(c.basicRent)}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
