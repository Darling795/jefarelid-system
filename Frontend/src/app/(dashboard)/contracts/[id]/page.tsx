"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FilePlus2, LoaderCircle, RefreshCw, Ban, Play } from "lucide-react";

import {
  activateContract,
  getContract,
  renewContract,
  terminateContract,
} from "@/lib/api/contracts";
import { generateInvoices } from "@/lib/api/invoices";
import { ApiError } from "@/lib/api/types";
import { formatDate, formatPHP } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [activateOpen, setActivateOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [renewForm, setRenewForm] = useState({ startDate: "", endDate: "", basicRent: "" });
  const [termForm, setTermForm] = useState({ effectiveDate: "", reason: "" });
  const [period, setPeriod] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["contract", id], queryFn: () => getContract(id) });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["contract", id] });
    await qc.invalidateQueries({ queryKey: ["contracts"] });
  };

  const activate = useMutation({
    mutationFn: () => activateContract(id),
    onSuccess: async () => {
      toast.success("Contract activated.");
      setActivateOpen(false);
      await invalidate();
    },
    onError: () => toast.error("Could not activate."),
  });

  const renew = useMutation({
    mutationFn: () =>
      renewContract(id, {
        startDate: renewForm.startDate,
        endDate: renewForm.endDate,
        basicRent: renewForm.basicRent || undefined,
      }),
    onSuccess: async (c) => {
      toast.success("Contract renewed.");
      setRenewOpen(false);
      await invalidate();
      router.push(`/contracts/${c.id}`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not renew."),
  });

  const terminate = useMutation({
    mutationFn: () => terminateContract(id, termForm),
    onSuccess: async () => {
      toast.success("Contract terminated.");
      setTerminateOpen(false);
      await invalidate();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not terminate."),
  });

  const generate = useMutation({
    mutationFn: () => generateInvoices(period, id),
    onSuccess: async () => {
      toast.success("Invoice generated.");
      setGenOpen(false);
      await invalidate();
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError && e.code === "INVOICE_ALREADY_EXISTS"
          ? "An invoice already exists for that period."
          : "Could not generate invoice.";
      toast.error(msg);
    },
  });

  const raw = data?.rawStatus;
  const canActivate = raw === "draft";
  const canManage = raw === "active" || raw === "expiring";

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/contracts"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Contracts
      </Link>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {data && (
        <>
          <PageHeader
            title={data.tenant.businessName}
            description={`${data.room.building.name} · Room ${data.room.roomNumber}`}
            action={
              <div className="flex flex-wrap gap-2">
                {canActivate && (
                  <Button onClick={() => setActivateOpen(true)}>
                    <Play /> Activate
                  </Button>
                )}
                {canManage && (
                  <>
                    <Button variant="outline" onClick={() => setGenOpen(true)}>
                      <FilePlus2 /> Generate invoice
                    </Button>
                    <Button variant="outline" onClick={() => setRenewOpen(true)}>
                      <RefreshCw /> Renew
                    </Button>
                    <Button variant="outline" onClick={() => setTerminateOpen(true)}>
                      <Ban /> Terminate
                    </Button>
                  </>
                )}
              </div>
            }
          />

          <Card className="mb-6">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                Contract <StatusBadge status={data.status} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="Start" value={formatDate(data.startDate)} />
                <Field label="End" value={formatDate(data.endDate)} />
                <Field label="Basic rent" value={formatPHP(data.basicRent)} />
                <Field label="Escalation" value={`${(Number(data.escalationRate) * 100).toFixed(2)}%`} />
                <Field label="Anchor date" value={formatDate(data.escalationAnchorDate)} />
                <Field label="Security deposit" value={formatPHP(data.securityDeposit)} />
                <Field label="Advance" value={formatPHP(data.advancePayment)} />
                <Field label="Due day" value={data.paymentDueDay} />
                {data.terminationDate && (
                  <Field label="Terminated" value={formatDate(data.terminationDate)} />
                )}
                {data.terminationReason && (
                  <Field label="Reason" value={data.terminationReason} />
                )}
              </dl>
            </CardContent>
          </Card>

          <h2 className="mb-3 text-lg font-medium">Invoices ({data.invoices.length})</h2>
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Net receivable</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No invoices generated yet.
                    </TableCell>
                  </TableRow>
                )}
                {data.invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.periodMonth}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPHP(inv.netReceivable)}
                    </TableCell>
                    <TableCell>{formatDate(inv.dueDate)}</TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <ConfirmDialog
            open={activateOpen}
            onOpenChange={setActivateOpen}
            title="Activate contract?"
            description="This makes the contract active and marks the room occupied."
            confirmLabel="Activate"
            loading={activate.isPending}
            onConfirm={() => activate.mutate()}
          />

          {/* Renew */}
          <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
            <DialogContent>
              <form onSubmit={(e) => { e.preventDefault(); renew.mutate(); }}>
                <DialogHeader>
                  <DialogTitle>Renew contract</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Start date</Label>
                      <Input type="date" required value={renewForm.startDate} onChange={(e) => setRenewForm((f) => ({ ...f, startDate: e.target.value }))} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>End date</Label>
                      <Input type="date" required value={renewForm.endDate} onChange={(e) => setRenewForm((f) => ({ ...f, endDate: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>New basic rent (blank = carry escalated rent)</Label>
                    <Input inputMode="decimal" placeholder="auto" value={renewForm.basicRent} onChange={(e) => setRenewForm((f) => ({ ...f, basicRent: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setRenewOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={renew.isPending}>
                    {renew.isPending && <LoaderCircle className="animate-spin" />}
                    Renew
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Terminate */}
          <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}>
            <DialogContent>
              <form onSubmit={(e) => { e.preventDefault(); terminate.mutate(); }}>
                <DialogHeader>
                  <DialogTitle>Terminate contract</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex flex-col gap-2">
                    <Label>Effective date</Label>
                    <Input type="date" required value={termForm.effectiveDate} onChange={(e) => setTermForm((f) => ({ ...f, effectiveDate: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Reason</Label>
                    <Input required value={termForm.reason} onChange={(e) => setTermForm((f) => ({ ...f, reason: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setTerminateOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="destructive" disabled={terminate.isPending}>
                    {terminate.isPending && <LoaderCircle className="animate-spin" />}
                    Terminate
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Generate invoice */}
          <Dialog open={genOpen} onOpenChange={setGenOpen}>
            <DialogContent>
              <form onSubmit={(e) => { e.preventDefault(); generate.mutate(); }}>
                <DialogHeader>
                  <DialogTitle>Generate invoice</DialogTitle>
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
        </>
      )}
    </div>
  );
}
