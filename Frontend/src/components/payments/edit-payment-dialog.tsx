"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";

import {
  updatePayment,
  type PaymentListItem,
  type PaymentMethod,
} from "@/lib/api/payments";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ERR: Record<string, string> = {
  OVERPAYMENT: "That amount exceeds the invoice's outstanding balance.",
};

export function EditPaymentDialog({
  payment,
  onOpenChange,
}: {
  payment: PaymentListItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<{
    amountPaid: string;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    checkNumber: string;
  }>({
    amountPaid: "",
    paymentDate: "",
    paymentMethod: "cash",
    checkNumber: "",
  });

  useEffect(() => {
    if (payment) {
      setForm({
        amountPaid: payment.amountPaid,
        paymentDate: payment.paymentDate.slice(0, 10),
        paymentMethod:
          payment.paymentMethod === "postdated_check" ? "postdated_check" : "cash",
        checkNumber: payment.checkNumber ?? "",
      });
    }
  }, [payment]);

  const set = (k: "amountPaid" | "paymentDate" | "checkNumber") => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () =>
      updatePayment(payment!.id, {
        amountPaid: form.amountPaid,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        checkNumber:
          form.paymentMethod === "postdated_check" ? form.checkNumber : undefined,
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
              <Input value={payment?.orNumber ?? "—"} disabled readOnly />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Method</Label>
              <Select
                value={form.paymentMethod}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, paymentMethod: (v as PaymentMethod) ?? "cash" }))
                }
                items={[
                  { value: "cash", label: "Cash" },
                  { value: "postdated_check", label: "Postdated check" },
                ]}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="postdated_check">Postdated check</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.paymentMethod === "postdated_check" && (
              <div className="col-span-2 flex flex-col gap-2">
                <Label>Check number</Label>
                <Input required value={form.checkNumber} onChange={set("checkNumber")} />
              </div>
            )}
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
