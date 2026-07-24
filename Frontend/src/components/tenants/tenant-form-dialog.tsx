"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";

import {
  createTenant,
  updateTenant,
  type TenantDetail,
  type TenantInput,
} from "@/lib/api/tenants";
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

export function TenantFormDialog({
  open,
  onOpenChange,
  tenant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: TenantDetail;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TenantInput>({ businessName: "" });

  useEffect(() => {
    if (open) {
      setForm({
        businessName: tenant?.businessName ?? "",
        contactPerson: tenant?.contactPerson ?? "",
        contactNumber: tenant?.contactNumber ?? "",
        email: tenant?.email ?? "",
        tin: tenant?.tin ?? "",
        address: tenant?.address ?? "",
      });
    }
  }, [open, tenant]);

  const set = (k: keyof TenantInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const clean: TenantInput = {
        businessName: form.businessName.trim(),
        contactPerson: form.contactPerson?.trim() || undefined,
        contactNumber: form.contactNumber?.trim() || undefined,
        email: form.email?.trim() || undefined,
        tin: form.tin?.trim() || undefined,
        address: form.address?.trim() || undefined,
      };
      return tenant ? updateTenant(tenant.id, clean) : createTenant(clean);
    },
    onSuccess: async (saved) => {
      toast.success(tenant ? "Tenant updated." : "Tenant created.");
      await queryClient.invalidateQueries({ queryKey: ["tenants"] });
      if (tenant) await queryClient.invalidateQueries({ queryKey: ["tenant", saved.id] });
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Could not save tenant."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!mutation.isPending) mutation.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>{tenant ? "Edit tenant" : "New tenant"}</DialogTitle>
            <DialogDescription>Business lessee details.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="t-name">Business name</Label>
              <Input id="t-name" required value={form.businessName} onChange={set("businessName")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="t-person">Contact person</Label>
              <Input id="t-person" value={form.contactPerson ?? ""} onChange={set("contactPerson")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="t-number">Contact number</Label>
              <Input id="t-number" value={form.contactNumber ?? ""} onChange={set("contactNumber")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="t-email">Email</Label>
              <Input id="t-email" type="email" value={form.email ?? ""} onChange={set("email")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="t-tin">TIN</Label>
              <Input id="t-tin" value={form.tin ?? ""} onChange={set("tin")} />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="t-address">Address</Label>
              <Input id="t-address" value={form.address ?? ""} onChange={set("address")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <LoaderCircle className="animate-spin" />}
              {tenant ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
