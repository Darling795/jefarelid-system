"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet } from "lucide-react";

import { downloadReport, fetchReport } from "@/lib/api/reports";
import { listTenants } from "@/lib/api/tenants";
import { listBuildings } from "@/lib/api/buildings";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type FilterKind = "date" | "period" | "number" | "text" | "tenant" | "building" | "select";
interface FilterDef {
  key: string;
  label: string;
  kind: FilterKind;
  options?: { value: string; label: string }[];
}

const D = (key: string, label: string): FilterDef => ({ key, label, kind: "date" });
const P = (key: string, label: string): FilterDef => ({ key, label, kind: "period" });
const TENANT: FilterDef = { key: "tenantId", label: "Tenant", kind: "tenant" };
const BUILDING: FilterDef = { key: "buildingId", label: "Building", kind: "building" };
const TENANT_STATUS: FilterDef = {
  key: "status",
  label: "Status",
  kind: "select",
  options: [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ],
};
const CONTRACT_STATUS: FilterDef = {
  key: "status",
  label: "Status",
  kind: "select",
  options: ["all", "draft", "active", "renewed", "terminated", "expired"].map((s) => ({
    value: s,
    label: s === "all" ? "All" : s[0].toUpperCase() + s.slice(1),
  })),
};

const REPORTS: { key: string; label: string; filters: FilterDef[] }[] = [
  { key: "collection", label: "Collection report", filters: [D("dateFrom", "From"), D("dateTo", "To"), BUILDING] },
  { key: "payment-history", label: "Payment history", filters: [D("dateFrom", "From"), D("dateTo", "To"), TENANT] },
  { key: "billing-statement", label: "Billing statement", filters: [P("periodMonth", "Period"), TENANT] },
  { key: "occupancy", label: "Occupancy report", filters: [] },
  { key: "utility-expense", label: "Utility expense", filters: [D("dateFrom", "From"), D("dateTo", "To"), BUILDING] },
  { key: "contract-expiry", label: "Contract expiry", filters: [{ key: "days", label: "Days ahead", kind: "number" }] },
  { key: "tax-summary", label: "VAT & WHT summary", filters: [P("periodFrom", "Period from"), P("periodTo", "Period to")] },
  { key: "tenant-records", label: "Tenant records", filters: [TENANT_STATUS] },
  { key: "rental-register", label: "Rental register", filters: [CONTRACT_STATUS, BUILDING] },
];

export default function ReportsPage() {
  const [type, setType] = useState("collection");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [active, setActive] = useState<{ type: string; params: Record<string, string> } | null>(null);

  const def = REPORTS.find((r) => r.key === type)!;
  const tenants = useQuery({ queryKey: ["tenants", ""], queryFn: () => listTenants() });
  const buildings = useQuery({ queryKey: ["buildings"], queryFn: listBuildings });
  const report = useQuery({
    queryKey: ["report", active],
    queryFn: () => fetchReport(active!.type, active!.params),
    enabled: !!active,
  });

  // Drop empty/"all" values so they aren't sent as filters.
  const cleanParams = () => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v && v !== "all") out[k] = v;
    }
    return out;
  };
  const run = () => setActive({ type, params: cleanParams() });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Reports" description="Generate and export operational and BIR reports." />

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-52 flex-col gap-2">
            <Label>Report</Label>
            <Select
              value={type}
              onValueChange={(v) => { setType(v ?? "collection"); setFilters({}); setActive(null); }}
              items={REPORTS.map((r) => ({ value: r.key, label: r.label }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPORTS.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {def.filters.map((f) => {
            const items =
              f.kind === "tenant"
                ? [
                    { value: "all", label: "All tenants" },
                    ...(tenants.data?.data.map((t) => ({ value: t.id, label: t.businessName })) ?? []),
                  ]
                : f.kind === "building"
                  ? [
                      { value: "all", label: "All buildings" },
                      ...(buildings.data?.map((b) => ({ value: b.id, label: b.name })) ?? []),
                    ]
                  : f.options ?? [];
            const isSelect = f.kind === "tenant" || f.kind === "building" || f.kind === "select";
            return (
              <div key={f.key} className="flex min-w-40 flex-col gap-2">
                <Label>{f.label}</Label>
                {isSelect ? (
                  <Select
                    value={filters[f.key] ?? "all"}
                    onValueChange={(v) => setFilters((s) => ({ ...s, [f.key]: v ?? "all" }))}
                    items={items}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {items.map((it) => (
                        <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.kind === "date" ? "date" : f.kind === "number" ? "number" : "text"}
                    placeholder={f.kind === "period" ? "YYYY-MM" : ""}
                    value={filters[f.key] ?? ""}
                    onChange={(e) => setFilters((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                )}
              </div>
            );
          })}

          <div className="flex gap-2">
            <Button onClick={run}>View</Button>
            <Button variant="outline" onClick={() => downloadReport(type, cleanParams(), "xlsx")}>
              <FileSpreadsheet /> Excel
            </Button>
            <Button variant="outline" onClick={() => downloadReport(type, cleanParams(), "pdf")}>
              <Download /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {report.isFetching && <Skeleton className="h-40 w-full" />}
      {report.isError && <p className="text-destructive">Failed to load report.</p>}

      {report.data && (
        <Card className="p-0">
          <div className="border-b p-4">
            <h2 className="font-medium">{report.data.title}</h2>
            {report.data.subtitle && <p className="text-sm text-muted-foreground">{report.data.subtitle}</p>}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {report.data.columns.map((c) => (
                    <TableHead key={c.key} className={c.align === "right" ? "text-right" : ""}>
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.data.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={report.data.columns.length} className="py-8 text-center text-muted-foreground">
                      No data for these filters.
                    </TableCell>
                  </TableRow>
                )}
                {report.data.rows.map((row, i) => (
                  <TableRow key={i}>
                    {report.data!.columns.map((c) => (
                      <TableCell key={c.key} className={`${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                        {row[c.key] ?? ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
