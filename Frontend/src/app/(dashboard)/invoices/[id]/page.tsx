"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Ban, LoaderCircle, Plus } from "lucide-react";

import { getInvoice, voidInvoice } from "@/lib/api/invoices";
import { createPayment } from "@/lib/api/payments";
import { ApiError } from "@/lib/api/types";
import { formatDate, formatPHP, formatPeriod } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
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

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${strong ? "text-base font-semibold" : "text-sm"}`}>{value}</span>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [pay, setPay] = useState({ amountPaid: "", paymentDate: "", orNumber: "", paymentMethod: "cash", remarks: "" });

  const { data, isLoading } = useQuery({ queryKey: ["invoice", id], queryFn: () => getInvoice(id) });

  const refresh = () => qc.invalidateQueries({ queryKey: ["invoice", id] });

  const recordPayment = useMutation({
    mutationFn: () =>
      createPayment({
        invoiceId: id,
        amountPaid: pay.amountPaid,
        paymentDate: pay.paymentDate,
        orNumber: pay.orNumber || undefined,
        paymentMethod: pay.paymentMethod || undefined,
        remarks: pay.remarks || undefined,
      }),
    onSuccess: async () => {
      toast.success("Payment recorded.");
      setPayOpen(false);
      setPay({ amountPaid: "", paymentDate: "", orNumber: "", paymentMethod: "cash", remarks: "" });
      await refresh();
      await qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e) => {
      const code = e instanceof ApiError ? e.code : "";
      const msg =
        code === "OVERPAYMENT" ? "Payment exceeds the outstanding balance."
        : code === "DUPLICATE_OR_NUMBER" ? "That OR number is already used."
        : code === "INVOICE_VOIDED" ? "This invoice is voided."
        : "Could not record payment.";
      toast.error(msg);
    },
  });

  const doVoid = useMutation({
    mutationFn: () => voidInvoice(id, voidReason || "Voided"),
    onSuccess: async () => {
      toast.success("Invoice voided.");
      setVoidOpen(false);
      await refresh();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not void."),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/invoices" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Invoices
      </Link>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {data && (
        <>
          <PageHeader
            title={`Invoice · ${formatPeriod(data.periodMonth)}`}
            description={`${data.tenant.businessName} · ${data.buildingName} ${data.roomNumber}`}
            action={
              <div className="flex gap-2">
                {data.status !== "voided" && data.status !== "paid" && (
                  <Button onClick={() => setPayOpen(true)}><Plus /> Record payment</Button>
                )}
                {data.payments.length === 0 && data.status !== "voided" && (
                  <Button variant="outline" onClick={() => setVoidOpen(true)}><Ban /> Void</Button>
                )}
              </div>
            }
          />

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  Breakdown <StatusBadge status={data.status} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Row label="Basic rent (applied)" value={formatPHP(data.basicRentApplied)} />
                <Row label="VAT" value={formatPHP(data.vatAmount)} />
                <Row label="Gross rent" value={formatPHP(data.grossRent)} />
                <Row label="Withholding tax" value={`− ${formatPHP(data.whtAmount)}`} />
                <div className="my-1 border-t" />
                <Row label="Net receivable" value={formatPHP(data.netReceivable)} strong />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-base">Payment status</CardTitle>
              </CardHeader>
              <CardContent>
                <Row label="Due date" value={formatDate(data.dueDate)} />
                <Row label="Amount paid" value={formatPHP(data.amountPaid)} />
                <div className="my-1 border-t" />
                <Row label="Balance" value={formatPHP(data.balance)} strong />
              </CardContent>
            </Card>
          </div>

          <h2 className="mb-3 text-lg font-medium">Payments</h2>
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>OR #</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payments.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No payments.</TableCell></TableRow>
                )}
                {data.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paymentDate)}</TableCell>
                    <TableCell className="tabular-nums">{p.orNumber ?? "—"}</TableCell>
                    <TableCell>{p.paymentMethod ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPHP(p.amountPaid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Record payment */}
          <Dialog open={payOpen} onOpenChange={setPayOpen}>
            <DialogContent>
              <form onSubmit={(e) => { e.preventDefault(); recordPayment.mutate(); }}>
                <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="flex flex-col gap-2">
                    <Label>Amount (PHP)</Label>
                    <Input inputMode="decimal" required value={pay.amountPaid} onChange={(e) => setPay((f) => ({ ...f, amountPaid: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Date</Label>
                    <Input type="date" required value={pay.paymentDate} onChange={(e) => setPay((f) => ({ ...f, paymentDate: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>OR number</Label>
                    <Input value={pay.orNumber} onChange={(e) => setPay((f) => ({ ...f, orNumber: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Method</Label>
                    <Input value={pay.paymentMethod} onChange={(e) => setPay((f) => ({ ...f, paymentMethod: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={recordPayment.isPending}>
                    {recordPayment.isPending && <LoaderCircle className="animate-spin" />}
                    Record
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Void */}
          <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
            <DialogContent>
              <form onSubmit={(e) => { e.preventDefault(); doVoid.mutate(); }}>
                <DialogHeader><DialogTitle>Void invoice</DialogTitle></DialogHeader>
                <div className="grid gap-2 py-4">
                  <Label>Reason</Label>
                  <Input required value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setVoidOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="destructive" disabled={doVoid.isPending}>
                    {doVoid.isPending && <LoaderCircle className="animate-spin" />}
                    Void
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
