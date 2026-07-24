"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";

import { getTenant, getTenantPayments } from "@/lib/api/tenants";
import { formatDate, formatPHP } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { TenantFormDialog } from "@/components/tenants/tenant-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tenant", id],
    queryFn: () => getTenant(id),
  });
  const paymentsQuery = useQuery({
    queryKey: ["tenant", id, "payments"],
    queryFn: () => getTenantPayments(id),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/tenants"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Tenants
      </Link>

      {isLoading && <Skeleton className="h-40 w-full" />}
      {isError && <p className="text-destructive">Failed to load tenant.</p>}

      {data && (
        <>
          <PageHeader
            title={data.businessName}
            action={
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil /> Edit
              </Button>
            }
          />

          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  Profile <StatusBadge status={data.status} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Field label="Contact person" value={data.contactPerson} />
                  <Field label="Contact number" value={data.contactNumber} />
                  <Field label="Email" value={data.email} />
                  <Field label="TIN" value={data.tin} />
                  <Field label="Address" value={data.address} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-base">Outstanding balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatPHP(data.outstandingBalance)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Unpaid across all invoices.
                </p>
              </CardContent>
            </Card>
          </div>

          <h2 className="mb-3 text-lg font-medium">
            Contracts ({data.contracts.length})
          </h2>
          <Card className="mb-6 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Building · Room</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Basic rent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.contracts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No contracts.
                    </TableCell>
                  </TableRow>
                )}
                {data.contracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/contracts/${c.id}`} className="hover:underline">
                        {c.buildingName} · {c.roomNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(c.startDate)} – {formatDate(c.endDate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPHP(c.basicRent)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <h2 className="mb-3 text-lg font-medium">Payment history</h2>
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>OR #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(paymentsQuery.data?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No payments recorded.
                    </TableCell>
                  </TableRow>
                )}
                {paymentsQuery.data?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paymentDate)}</TableCell>
                    <TableCell>{p.periodMonth}</TableCell>
                    <TableCell className="tabular-nums">{p.orNumber ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPHP(p.amountPaid)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <TenantFormDialog open={editOpen} onOpenChange={setEditOpen} tenant={data} />
        </>
      )}
    </div>
  );
}
