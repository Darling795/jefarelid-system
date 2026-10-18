"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  FilePlus2,
  LoaderCircle,
} from "lucide-react";

import {
  generateInvoices,
  listInvoices,
  type InvoiceListItem,
} from "@/lib/api/invoices";
import { listBuildings } from "@/lib/api/buildings";
import type { SortDir } from "@/lib/api/rooms";
import { ApiError } from "@/lib/api/types";
import { formatDate, formatDateTime, formatPHP, formatPeriod } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

const STATUSES = ["all", "unpaid", "partial", "paid", "overdue", "voided"];
const STATUS_ITEMS = STATUSES.map((s) => ({
  value: s,
  label: s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1),
}));

type SortKey = "tenantName" | "periodMonth" | "netReceivable" | "balance" | "dueDate";

function SortHeader({
  label,
  k,
  sortKey,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = k === sortKey;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onClick(k)}
      className={`inline-flex items-center gap-1 hover:text-foreground ${
        align === "right" ? "flex-row-reverse" : ""
      } ${active ? "text-foreground" : ""}`}
    >
      {label}
      <Icon className="size-3.5 text-muted-foreground" />
    </button>
  );
}

export default function InvoicesPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [buildingId, setBuildingId] = useState("all");
  const [period, setPeriod] = useState("");
  const [grouped, setGrouped] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("tenantName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [genOpen, setGenOpen] = useState(false);
  const [genPeriod, setGenPeriod] = useState("");

  const buildings = useQuery({ queryKey: ["buildings"], queryFn: listBuildings });

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", status, buildingId, period],
    queryFn: () =>
      listInvoices({
        status: status === "all" ? undefined : status,
        buildingId: buildingId === "all" ? undefined : buildingId,
        periodFrom: period || undefined,
        periodTo: period || undefined,
      }),
  });

  const generate = useMutation({
    mutationFn: () => generateInvoices(genPeriod),
    onSuccess: async (created) => {
      toast.success(`Generated ${created.length} invoice(s) across all buildings.`);
      setGenOpen(false);
      setGenPeriod("");
      await qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not generate."),
  });

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "tenantName" ? "asc" : "desc");
    }
  };

  const sortRows = useMemo(() => {
    return (rows: InvoiceListItem[]) => {
      const copy = [...rows];
      copy.sort((a, b) => {
        let cmp: number;
        if (sortKey === "tenantName") cmp = a.tenantName.localeCompare(b.tenantName);
        else if (sortKey === "periodMonth") cmp = a.periodMonth.localeCompare(b.periodMonth);
        else if (sortKey === "dueDate") cmp = a.dueDate.localeCompare(b.dueDate);
        else cmp = Number(a[sortKey]) - Number(b[sortKey]);
        return sortDir === "asc" ? cmp : -cmp;
      });
      return copy;
    };
  }, [sortKey, sortDir]);

  // Group invoices by building (alphabetical), each group sorted by the active sort.
  const groups = useMemo(() => {
    const rows = data?.data ?? [];
    if (!grouped) return null;
    const byBuilding = new Map<string, { name: string; rows: InvoiceListItem[] }>();
    for (const inv of rows) {
      const g = byBuilding.get(inv.buildingId) ?? { name: inv.buildingName, rows: [] };
      g.rows.push(inv);
      byBuilding.set(inv.buildingId, g);
    }
    return [...byBuilding.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((g) => ({ name: g.name, rows: sortRows(g.rows) }));
  }, [data, grouped, sortRows]);

  const flat = useMemo(
    () => (data ? sortRows(data.data) : []),
    [data, sortRows],
  );

  const buildingItems = [
    { value: "all", label: "All buildings" },
    ...(buildings.data ?? []).map((b) => ({ value: b.id, label: b.name })),
  ];

  const Head = (
    <TableHeader>
      <TableRow>
        <TableHead>
          <SortHeader label="Tenant" k="tenantName" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
        </TableHead>
        <TableHead>Room</TableHead>
        <TableHead>
          <SortHeader label="Period" k="periodMonth" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
        </TableHead>
        <TableHead className="text-right">
          <SortHeader label="Net" k="netReceivable" sortKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
        </TableHead>
        <TableHead className="text-right">
          <SortHeader label="Balance" k="balance" sortKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
        </TableHead>
        <TableHead>
          <SortHeader label="Due" k="dueDate" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
        </TableHead>
        <TableHead>Generated</TableHead>
        <TableHead>Status</TableHead>
      </TableRow>
    </TableHeader>
  );

  const Row = (inv: InvoiceListItem) => (
    <TableRow key={inv.id} className="cursor-pointer">
      <TableCell>
        <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline">
          {inv.tenantName}
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {inv.buildingName} · {inv.roomNumber}
      </TableCell>
      <TableCell>
        <Link href={`/invoices/${inv.id}`} className="hover:underline">
          {formatPeriod(inv.periodMonth)}
        </Link>
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatPHP(inv.netReceivable)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatPHP(inv.balance)}</TableCell>
      <TableCell>{formatDate(inv.dueDate)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatDateTime(inv.generatedAt)}
      </TableCell>
      <TableCell><StatusBadge status={inv.status} /></TableCell>
    </TableRow>
  );

  const isEmpty = (data?.data.length ?? 0) === 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Invoices"
        description="Monthly rental invoices across all buildings. Amounts are frozen at generation."
        action={
          <Button onClick={() => setGenOpen(true)}>
            <FilePlus2 /> Generate month
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Building</Label>
          <Select value={buildingId} onValueChange={(v) => setBuildingId(v ?? "all")} items={buildingItems}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              {buildingItems.map((it) => (
                <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v ?? "all")} items={STATUS_ITEMS}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_ITEMS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Period</Label>
          <Input
            type="month"
            className="w-40"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={grouped ? "default" : "outline"}
            size="sm"
            onClick={() => setGrouped(true)}
          >
            <Building2 className="size-4" /> By building
          </Button>
          <Button
            variant={!grouped ? "default" : "outline"}
            size="sm"
            onClick={() => setGrouped(false)}
          >
            All invoices
          </Button>
          {(status !== "all" || buildingId !== "all" || period) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatus("all");
                setBuildingId("all");
                setPeriod("");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && isEmpty && (
        <Card className="p-0">
          <EmptyState
            icon={FilePlus2}
            title="No invoices"
            description="Generate a month's invoices for all active contracts, or adjust the filters."
            action={
              <Button onClick={() => setGenOpen(true)}>
                <FilePlus2 /> Generate month
              </Button>
            }
          />
        </Card>
      )}

      {!isLoading && !isEmpty && grouped && (
        <div className="flex flex-col gap-6">
          {groups!.map((g) => (
            <div key={g.name}>
              <div className="mb-2 flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                <h2 className="font-heading text-base font-semibold">{g.name}</h2>
                <span className="text-sm text-muted-foreground">({g.rows.length})</span>
              </div>
              <Card className="p-0">
                <Table>
                  {Head}
                  <TableBody>{g.rows.map(Row)}</TableBody>
                </Table>
              </Card>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isEmpty && !grouped && (
        <Card className="p-0">
          <Table>
            {Head}
            <TableBody>{flat.map(Row)}</TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <form onSubmit={(e) => { e.preventDefault(); generate.mutate(); }}>
            <DialogHeader>
              <DialogTitle>Generate invoices</DialogTitle>
              <DialogDescription>
                Runs for every active contract across all buildings for the given
                month. Existing invoices for that month are skipped.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <Label>Period (YYYY-MM)</Label>
              <Input required placeholder="2026-03" pattern="\d{4}-\d{2}" value={genPeriod} onChange={(e) => setGenPeriod(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={generate.isPending}>
                {generate.isPending && <LoaderCircle className="animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
