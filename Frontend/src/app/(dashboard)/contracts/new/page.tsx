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
import { formatPHP } from "@/lib/format";
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
  const [roomIds, setRoomIds] = useState<string[]>([]);
  // Tracks the rate we auto-filled (sum of selected rooms), so we only overwrite
  // the rent field while it still holds an auto-filled value — never one the
  // user typed themselves.
  const [autoRent, setAutoRent] = useState("");
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

  // Toggling a room recomputes Basic rent as the sum of the selected rooms'
  // base rates. We leave a rent the user has manually typed untouched (only
  // replace an empty field or a previously auto-filled one).
  const toggleRoom = (id: string) => {
    const next = roomIds.includes(id)
      ? roomIds.filter((r) => r !== id)
      : [...roomIds, id];
    setRoomIds(next);
    const sum = next.reduce((acc, rid) => {
      const room = rooms.data?.find((r) => r.id === rid);
      return acc + (room ? Number(room.baseRate) : 0);
    }, 0);
    const sumStr = next.length ? sum.toFixed(2) : "";
    setForm((f) => {
      const untouched = f.basicRent === "" || f.basicRent === autoRent;
      return untouched ? { ...f, basicRent: sumStr } : f;
    });
    setAutoRent(sumStr);
  };

  const mutation = useMutation({
    mutationFn: () => {
      const input: CreateContractInput = {
        tenantId,
        roomIds,
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

  const canSubmit = tenantId && roomIds.length > 0 && form.startDate && form.endDate && form.basicRent;

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

            <div className="flex flex-col gap-2">
              <Label>Building</Label>
              <Select
                value={buildingId}
                onValueChange={(v) => {
                  setBuildingId(v ?? "");
                  setRoomIds([]);
                  setAutoRent("");
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
              <Label>
                Rooms{roomIds.length > 0 ? ` (${roomIds.length} selected)` : ""}
              </Label>
              {!buildingId ? (
                <p className="text-sm text-muted-foreground">Select a building first.</p>
              ) : (
                <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border p-2">
                  {rooms.data?.filter((r) => r.isActive).length === 0 && (
                    <p className="col-span-2 py-2 text-center text-sm text-muted-foreground">
                      No active rooms in this building.
                    </p>
                  )}
                  {rooms.data
                    ?.filter((r) => r.isActive)
                    .map((r) => {
                      const checked = roomIds.includes(r.id);
                      return (
                        <label
                          key={r.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent ${
                            checked ? "bg-accent/60" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={checked}
                            onChange={() => toggleRoom(r.id)}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {r.roomNumber}{" "}
                            <span className="text-muted-foreground">
                              · {formatPHP(r.baseRate)}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Select one or more rooms. Basic rent below is the sum of their base rates.
              </p>
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
                {autoRent && form.basicRent === autoRent && (
                  <p className="text-xs text-muted-foreground">
                    Sum of the selected rooms&rsquo; base rates. You can override it.
                  </p>
                )}
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
