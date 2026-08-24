"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";

import { updatePayment, type PaymentListItem } from "@/lib/api/payments";
import { ApiError } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
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

const ERR: Record<string, string> = {
  OVERPAYMENT: "That amount exceeds the invoice's outstanding balance.",
  DUPLICATE_OR_NUMBER: "That OR number is already used on another payment.",
};

export function EditPaymentDialog({
  payment,
  onOpenChange,
}: {
  payment: PaymentListItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    amountPaid: "",
    paymentDate: "",
    orNumber: "",
    paymentMethod: "",
  });

  useEffect(() => {
    if (payment) {
      setForm({
        amountPaid: payment.amountPaid,
        paymentDate: payment.paymentDate.slice(0, 10),
        orNumber: payment.orNumber ?? "",
        paymentMethod: payment.paymentMethod ?? "",
      });
    }
  }, [payment]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () =>
      updatePayment(payment!.id, {
        amountPaid: form.amountPaid,
        paymentDate: form.paymentDate,
        orNumber: form.orNumber.trim() || undefined,
        paymentMethod: form.paymentMethod.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success("Payment updated.");
      await qc.invalidateQueries({ queryKey: ["payments"] });
      await qc.invalidateQueries({ queryKey: ["outstanding"] });
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? ERR[err.code] ?? err.message : "Could not update payment.",
      ),
  });

  return (
    <Dialog open={payment !== null} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!mutation.isPending) mutation.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit payment</DialogTitle>
            <DialogDescription>
              {payment?.tenantName} · correcting a recorded collection.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>Amount (PHP)</Label>
              <Input inputMode="decimal" required value={form.amountPaid} onChange={set("amountPaid")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Date</Label>
              <Input type="date" required value={form.paymentDate} onChange={set("paymentDate")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>OR #</Label>
              <Input value={form.orNumber} onChange={set("orNumber")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Method</Label>
              <Input value={form.paymentMethod} onChange={set("paymentMethod")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <LoaderCircle className="animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
