"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet } from "lucide-react";

import { downloadReport, fetchReport } from "@/lib/api/reports";
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

const REPORTS = [
  { key: "collection", label: "Collection report", filters: ["dateFrom", "dateTo"] },
  { key: "payment-history", label: "Payment history", filters: ["dateFrom", "dateTo"] },
  { key: "billing-statement", label: "Billing statement", filters: ["periodMonth"] },
  { key: "occupancy", label: "Occupancy report", filters: [] },
  { key: "utility-expense", label: "Utility expense", filters: ["dateFrom", "dateTo"] },
  { key: "contract-expiry", label: "Contract expiry", filters: ["days"] },
  { key: "tax-summary", label: "VAT & WHT summary", filters: ["periodFrom", "periodTo"] },
];

export default function ReportsPage() {
  const [type, setType] = useState("collection");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [active, setActive] = useState<{ type: string; params: Record<string, string> } | null>(null);

  const def = REPORTS.find((r) => r.key === type)!;
  const report = useQuery({
    queryKey: ["report", active],
    queryFn: () => fetchReport(active!.type, active!.params),
    enabled: !!active,
  });

  const run = () => setActive({ type, params: { ...filters } });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Reports" description="Generate and export operational and BIR reports." />

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-52 flex-col gap-2">
            <Label>Report</Label>
            <Select value={type} onValueChange={(v) => { setType(v ?? "collection"); setFilters({}); setActive(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPORTS.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {def.filters.map((f) => (
            <div key={f} className="flex flex-col gap-2">
              <Label className="capitalize">{f.replace(/([A-Z])/g, " $1")}</Label>
              <Input
                type={f.includes("date") || f.includes("From") || f.includes("To") ? (f === "periodFrom" || f === "periodTo" ? "text" : "date") : f === "days" ? "number" : "text"}
                placeholder={f === "periodMonth" || f === "periodFrom" || f === "periodTo" ? "YYYY-MM" : ""}
                value={filters[f] ?? ""}
                onChange={(e) => setFilters((s) => ({ ...s, [f]: e.target.value }))}
              />
            </div>
          ))}

          <div className="flex gap-2">
            <Button onClick={run}>View</Button>
            <Button variant="outline" onClick={() => downloadReport(type, filters, "xlsx")}>
              <FileSpreadsheet /> Excel
            </Button>
            <Button variant="outline" onClick={() => downloadReport(type, filters, "pdf")}>
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
