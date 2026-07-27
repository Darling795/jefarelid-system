"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, LoaderCircle } from "lucide-react";

import { createContract, type CreateContractInput } from "@/lib/api/contracts";
import { listTenants } from "@/lib/api/tenants";
import { listBuildings } from "@/lib/api/buildings";
import { listRooms } from "@/lib/api/rooms";
import { ApiError } from "@/lib/api/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  CONTRACT_OVERLAP: "That room already has an active contract overlapping these dates.",
  ROOM_INACTIVE: "That room is inactive.",
  TENANT_INACTIVE: "That tenant is inactive.",
  INVALID_DATE_RANGE: "End date must be after start date.",
};

export default function NewContractPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    basicRent: "",
    securityDeposit: "",
    advancePayment: "",
    escalationRate: "",
    paymentDueDay: "5",
  });

  const tenants = useQuery({ queryKey: ["tenants", ""], queryFn: () => listTenants() });
  const buildings = useQuery({ queryKey: ["buildings"], queryFn: listBuildings });
  const rooms = useQuery({
    queryKey: ["rooms", buildingId],
    queryFn: () => listRooms(buildingId),
    enabled: !!buildingId,
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const input: CreateContractInput = {
        tenantId,
        roomId,
        startDate: form.startDate,
        endDate: form.endDate,
        basicRent: form.basicRent,
        securityDeposit: form.securityDeposit,
        advancePayment: form.advancePayment,
        escalationRate: form.escalationRate || undefined,
        paymentDueDay: Number(form.paymentDueDay),
      };
      return createContract(input);
    },
    onSuccess: (c) => {
      toast.success("Contract created as draft.");
      router.replace(`/contracts/${c.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? ERR[err.code] ?? err.message : "Could not create contract.");
    },
  });

  const canSubmit = tenantId && roomId && form.startDate && form.endDate && form.basicRent;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/contracts"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Contracts
      </Link>
      <PageHeader title="New contract" description="Created as a draft; activate it once reviewed." />

      <Card>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit && !mutation.isPending) mutation.mutate();
            }}
          >
            <div className="flex flex-col gap-2">
              <Label>Tenant</Label>
              <Select
                value={tenantId}
                onValueChange={(v) => setTenantId(v ?? "")}
                items={tenants.data?.data.map((t) => ({ value: t.id, label: t.businessName }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.data?.data.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Building</Label>
                <Select
                  value={buildingId}
                  onValueChange={(v) => {
                    setBuildingId(v ?? "");
                    setRoomId("");
                  }}
                  items={buildings.data?.map((b) => ({ value: b.id, label: b.name }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.data?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Room</Label>
                <Select
                  value={roomId}
                  onValueChange={(v) => setRoomId(v ?? "")}
                  disabled={!buildingId}
                  items={rooms.data
                    ?.filter((r) => r.isActive)
                    .map((r) => ({ value: r.id, label: `${r.roomNumber} (${r.status})` }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.data
                      ?.filter((r) => r.isActive)
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.roomNumber} ({r.status})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="start">Start date</Label>
                <Input id="start" type="date" required value={form.startDate} onChange={set("startDate")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="end">End date</Label>
                <Input id="end" type="date" required value={form.endDate} onChange={set("endDate")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="rent">Basic rent (PHP)</Label>
                <Input id="rent" inputMode="decimal" required value={form.basicRent} onChange={set("basicRent")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="esc">Escalation rate (e.g. 0.05)</Label>
                <Input id="esc" inputMode="decimal" placeholder="default" value={form.escalationRate} onChange={set("escalationRate")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dep">Security deposit</Label>
                <Input id="dep" inputMode="decimal" required value={form.securityDeposit} onChange={set("securityDeposit")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="adv">Advance payment</Label>
                <Input id="adv" inputMode="decimal" required value={form.advancePayment} onChange={set("advancePayment")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="due">Payment due day</Label>
                <Input id="due" type="number" min={1} max={31} value={form.paymentDueDay} onChange={set("paymentDueDay")} />
              </div>
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <Button variant="outline" nativeButton={false} render={<Link href="/contracts" />}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || mutation.isPending}>
                {mutation.isPending && <LoaderCircle className="animate-spin" />}
                Create draft
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
