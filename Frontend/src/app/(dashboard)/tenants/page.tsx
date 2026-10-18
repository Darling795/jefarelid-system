"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Plus,
  Search,
  Users,
} from "lucide-react";

import { listTenants, type TenantStatus } from "@/lib/api/tenants";
import type { SortDir } from "@/lib/api/rooms";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { TenantFormDialog } from "@/components/tenants/tenant-form-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

type TenantSortKey = "businessName" | "activeContracts";

const STATUS_ITEMS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-foreground ${
        align === "right" ? "flex-row-reverse" : ""
      } ${active ? "text-foreground" : ""}`}
    >
      {label}
      <Icon className="size-3.5 text-muted-foreground" />
    </button>
  );
}

export default function TenantsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TenantStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [sortKey, setSortKey] = useState<TenantSortKey>("businessName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tenants", search, status],
    queryFn: () => listTenants(search, status),
  });

  const toggle = (key: TenantSortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "businessName" ? "asc" : "desc");
    }
  };

  const rows = useMemo(() => {
    if (!data) return data;
    const list = [...data.data];
    list.sort((a, b) => {
      const cmp =
        sortKey === "businessName"
          ? a.businessName.localeCompare(b.businessName)
          : a.activeContracts - b.activeContracts;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [data, sortKey, sortDir]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Tenants"
        description="Businesses leasing space across the portfolio."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> New tenant
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, contact, TIN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus((v as TenantStatus | "all") ?? "all")}
          items={STATUS_ITEMS}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((it) => (
              <SelectItem key={it.value} value={it.value}>
                {it.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortHeader
                  label="Business"
                  active={sortKey === "businessName"}
                  dir={sortDir}
                  onClick={() => toggle("businessName")}
                />
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Units (building · room)</TableHead>
              <TableHead>TIN</TableHead>
              <TableHead className="text-right">
                <SortHeader
                  label="Active"
                  align="right"
                  active={sortKey === "activeContracts"}
                  dir={sortDir}
                  onClick={() => toggle("activeContracts")}
                />
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {isError && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-destructive">
                  Failed to load tenants.
                </TableCell>
              </TableRow>
            )}
            {rows?.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={Users}
                    title={search ? "No matches" : "No tenants yet"}
                    description={
                      search
                        ? "Try a different name, contact, or TIN."
                        : "Add the businesses that lease your rooms."
                    }
                    action={
                      !search ? (
                        <Button onClick={() => setCreateOpen(true)}>
                          <Plus /> New tenant
                        </Button>
                      ) : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            )}
            {rows?.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Link href={`/tenants/${t.id}`} className="font-medium hover:underline">
                    {t.businessName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {t.contactPerson ?? "—"}
                  {t.contactNumber ? ` · ${t.contactNumber}` : ""}
                </TableCell>
                <TableCell className="text-sm">
                  {t.activeLeases.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {t.activeLeases.map((l) => (
                        <Link
                          key={l.contractId}
                          href={`/contracts/${l.contractId}`}
                          className="hover:underline"
                        >
                          {l.buildingName} · {l.roomNumbers.join(", ")}
                        </Link>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="tabular-nums">{t.tin ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{t.activeContracts}</TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <TenantFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
