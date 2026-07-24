"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Users } from "lucide-react";

import { listTenants } from "@/lib/api/tenants";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { TenantFormDialog } from "@/components/tenants/tenant-form-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TenantsPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tenants", search],
    queryFn: () => listTenants(search),
  });

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

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name, contact, TIN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>TIN</TableHead>
              <TableHead className="text-right">Active contracts</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {isError && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-destructive">
                  Failed to load tenants.
                </TableCell>
              </TableRow>
            )}
            {data?.data.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
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
            {data?.data.map((t) => (
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
