"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FilePlus2, LoaderCircle } from "lucide-react";

import { generateInvoices, listInvoices } from "@/lib/api/invoices";
import { ApiError } from "@/lib/api/types";
import { formatDate, formatPHP, formatPeriod } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const STATUSES = ["all", "unpaid", "partial", "paid", "overdue", "voided"];

export default function InvoicesPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [genOpen, setGenOpen] = useState(false);
  const [period, setPeriod] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", status],
    queryFn: () => listInvoices(status === "all" ? {} : { status }),
  });

  const generate = useMutation({
    mutationFn: () => generateInvoices(period),
    onSuccess: async (created) => {
      toast.success(`Generated ${created.length} invoice(s).`);
      setGenOpen(false);
      await qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not generate."),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Invoices"
        description="Monthly rental invoices. Amounts are frozen at generation."
        action={
          <Button onClick={() => setGenOpen(true)}>
            <FilePlus2 /> Generate month
          </Button>
        }
      />

      <div className="mb-4 w-48">
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s === "all" ? "All statuses" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Room</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))}
            {data?.data.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={FilePlus2}
                    title={status === "all" ? "No invoices yet" : `No ${status} invoices`}
                    description="Generate a month's invoices for all active contracts."
                    action={
                      <Button onClick={() => setGenOpen(true)}>
                        <FilePlus2 /> Generate month
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline">
                    {formatPeriod(inv.periodMonth)}
                  </Link>
                </TableCell>
                <TableCell>{inv.tenantName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {inv.buildingName} · {inv.roomNumber}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatPHP(inv.netReceivable)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPHP(inv.balance)}</TableCell>
                <TableCell>{formatDate(inv.dueDate)}</TableCell>
                <TableCell><StatusBadge status={inv.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <form onSubmit={(e) => { e.preventDefault(); generate.mutate(); }}>
            <DialogHeader>
              <DialogTitle>Generate invoices</DialogTitle>
              <DialogDescription>
                Runs for every active contract for the given month. Existing invoices are skipped.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <Label>Period (YYYY-MM)</Label>
              <Input required placeholder="2026-03" pattern="\d{4}-\d{2}" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={generate.isPending}>
                {generate.isPending && <LoaderCircle className="animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
