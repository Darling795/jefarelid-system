"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, X } from "lucide-react";

import { getOutstanding, listPayments } from "@/lib/api/payments";
import { listTenants } from "@/lib/api/tenants";
import { listBuildings } from "@/lib/api/buildings";
import { formatDate, formatPHP, formatPeriod } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const EMPTY_FILTERS = {
  tenantId: "all",
  buildingId: "all",
  periodMonth: "",
  orNumber: "",
  dateFrom: "",
  dateTo: "",
};
type Filters = typeof EMPTY_FILTERS;

function Bucket({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold tabular-nums ${tone ?? ""}`}>{formatPHP(value)}</p>
      </CardContent>
    </Card>
  );
}

export default function PaymentsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  // Map UI filter state to API params, dropping "all"/empty values.
  const params = {
    tenantId: filters.tenantId === "all" ? undefined : filters.tenantId,
    buildingId: filters.buildingId === "all" ? undefined : filters.buildingId,
    periodMonth: filters.periodMonth.trim() || undefined,
    orNumber: filters.orNumber.trim() || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  };

  const outstanding = useQuery({ queryKey: ["outstanding"], queryFn: () => getOutstanding({}) });
  const payments = useQuery({
    queryKey: ["payments", params],
    queryFn: () => listPayments(params),
  });
  const tenants = useQuery({ queryKey: ["tenants", ""], queryFn: () => listTenants() });
  const buildings = useQuery({ queryKey: ["buildings"], queryFn: listBuildings });

  const tenantItems = [
    { value: "all", label: "All tenants" },
    ...(tenants.data?.data.map((t) => ({ value: t.id, label: t.businessName })) ?? []),
  ];
  const buildingItems = [
    { value: "all", label: "All buildings" },
    ...(buildings.data?.map((b) => ({ value: b.id, label: b.name })) ?? []),
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Payments" description="Collections and outstanding receivables." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {outstanding.isLoading || !outstanding.data ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : (
          <>
            <Bucket label="Current" value={outstanding.data.current} />
            <Bucket label="1–30 days" value={outstanding.data.days30} />
            <Bucket label="31–60 days" value={outstanding.data.days60} tone="text-amber-600 dark:text-amber-400" />
            <Bucket label="60+ days" value={outstanding.data.days90Plus} tone="text-destructive" />
            <Bucket label="Total" value={outstanding.data.total} />
          </>
        )}
      </div>

      <h2 className="mb-3 text-lg font-medium">Payment history</h2>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-44 flex-col gap-1.5">
            <Label className="text-xs">Tenant</Label>
            <Select value={filters.tenantId} onValueChange={(v) => set("tenantId", v ?? "all")} items={tenantItems}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {tenantItems.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-40 flex-col gap-1.5">
            <Label className="text-xs">Building</Label>
            <Select value={filters.buildingId} onValueChange={(v) => set("buildingId", v ?? "all")} items={buildingItems}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {buildingItems.map((b) => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Period</Label>
            <Input
              className="w-28"
              placeholder="YYYY-MM"
              pattern="\d{4}-\d{2}"
              value={filters.periodMonth}
              onChange={(e) => set("periodMonth", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">OR #</Label>
            <Input
              className="w-28"
              value={filters.orNumber}
              onChange={(e) => set("orNumber", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={filters.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={filters.dateTo} onChange={(e) => set("dateTo", e.target.value)} />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
              <X className="size-4" /> Clear
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>OR #</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))}
            {payments.data?.data.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={CreditCard}
                    title={hasFilters ? "No payments match these filters" : "No payments yet"}
                    description={
                      hasFilters
                        ? "Try widening the date range or clearing a filter."
                        : "Open an invoice and use “Record payment” to log a collection."
                    }
                  />
                </TableCell>
              </TableRow>
            )}
            {payments.data?.data.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{formatDate(p.paymentDate)}</TableCell>
                <TableCell>{p.tenantName}</TableCell>
                <TableCell>{formatPeriod(p.periodMonth)}</TableCell>
                <TableCell className="tabular-nums">{p.orNumber ?? "—"}</TableCell>
                <TableCell>{p.paymentMethod ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPHP(p.amountPaid)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
