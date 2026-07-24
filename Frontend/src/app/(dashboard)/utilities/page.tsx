"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle, Plus, Wallet, Zap } from "lucide-react";

import { listBuildings } from "@/lib/api/buildings";
import {
  createUtilityBill,
  listUtilityBills,
  recordUtilityPayment,
  UTILITY_TYPES,
  type UtilityBillListItem,
  type UtilityType,
} from "@/lib/api/utilities";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UtilitiesPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [payFor, setPayFor] = useState<UtilityBillListItem | null>(null);
  const [bill, setBill] = useState({ buildingId: "", utilityType: "electric" as UtilityType, billingPeriod: "", amount: "", dueDate: "" });
  const [payment, setPayment] = useState({ amountPaid: "", paymentDate: "", voucherNumber: "", orNumber: "" });

  const buildings = useQuery({ queryKey: ["buildings"], queryFn: listBuildings });
  const bills = useQuery({ queryKey: ["utility-bills"], queryFn: () => listUtilityBills({}) });

  const create = useMutation({
    mutationFn: () => createUtilityBill(bill),
    onSuccess: async () => {
      toast.success("Utility bill recorded.");
      setCreateOpen(false);
      setBill({ buildingId: "", utilityType: "electric", billingPeriod: "", amount: "", dueDate: "" });
      await qc.invalidateQueries({ queryKey: ["utility-bills"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not record bill."),
  });

  const recordPay = useMutation({
    mutationFn: () => recordUtilityPayment(payFor!.id, payment),
    onSuccess: async () => {
      toast.success("Payment recorded.");
      setPayFor(null);
      setPayment({ amountPaid: "", paymentDate: "", voucherNumber: "", orNumber: "" });
      await qc.invalidateQueries({ queryKey: ["utility-bills"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not record payment."),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Utilities"
        description="Telephone and internet bills per building (company expense)."
        action={<Button onClick={() => setCreateOpen(true)}><Plus /> New bill</Button>}
      />

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Building</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))}
            {bills.data?.data.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    icon={Zap}
                    title="No utility bills yet"
                    description="Record telephone and internet bills per building."
                    action={
                      <Button onClick={() => setCreateOpen(true)}>
                        <Plus /> New bill
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            )}
            {bills.data?.data.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{formatPeriod(b.billingPeriod)}</TableCell>
                <TableCell>{b.buildingName}</TableCell>
                <TableCell className="capitalize">{b.utilityType}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPHP(b.amount)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPHP(b.balance)}</TableCell>
                <TableCell>{formatDate(b.dueDate)}</TableCell>
                <TableCell><StatusBadge status={b.status} /></TableCell>
                <TableCell className="text-right">
                  {b.status !== "paid" && (
                    <Button size="sm" variant="ghost" onClick={() => setPayFor(b)}>
                      <Wallet className="size-4" /> Pay
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* New bill */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <DialogHeader><DialogTitle>New utility bill</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 flex flex-col gap-2">
                <Label>Building</Label>
                <Select value={bill.buildingId} onValueChange={(v) => setBill((f) => ({ ...f, buildingId: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select building" /></SelectTrigger>
                  <SelectContent>
                    {buildings.data?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Type</Label>
                <Select value={bill.utilityType} onValueChange={(v) => setBill((f) => ({ ...f, utilityType: (v ?? "electric") as UtilityType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UTILITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Period (YYYY-MM)</Label>
                <Input required pattern="\d{4}-\d{2}" placeholder="2026-07" value={bill.billingPeriod} onChange={(e) => setBill((f) => ({ ...f, billingPeriod: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Amount (PHP)</Label>
                <Input inputMode="decimal" required value={bill.amount} onChange={(e) => setBill((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Due date</Label>
                <Input type="date" required value={bill.dueDate} onChange={(e) => setBill((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <LoaderCircle className="animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record payment */}
      <Dialog open={payFor !== null} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent>
          <form onSubmit={(e) => { e.preventDefault(); recordPay.mutate(); }}>
            <DialogHeader><DialogTitle>Record utility payment</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label>Amount (PHP)</Label>
                <Input inputMode="decimal" required value={payment.amountPaid} onChange={(e) => setPayment((f) => ({ ...f, amountPaid: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Date</Label>
                <Input type="date" required value={payment.paymentDate} onChange={(e) => setPayment((f) => ({ ...f, paymentDate: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Voucher #</Label>
                <Input value={payment.voucherNumber} onChange={(e) => setPayment((f) => ({ ...f, voucherNumber: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>OR #</Label>
                <Input value={payment.orNumber} onChange={(e) => setPayment((f) => ({ ...f, orNumber: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayFor(null)}>Cancel</Button>
              <Button type="submit" disabled={recordPay.isPending}>
                {recordPay.isPending && <LoaderCircle className="animate-spin" />}
                Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
