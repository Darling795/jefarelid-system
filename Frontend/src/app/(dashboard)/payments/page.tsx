"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";

import { getOutstanding, listPayments } from "@/lib/api/payments";
import { formatDate, formatPHP, formatPeriod } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const outstanding = useQuery({ queryKey: ["outstanding"], queryFn: () => getOutstanding({}) });
  const payments = useQuery({ queryKey: ["payments"], queryFn: () => listPayments({}) });

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
                    title="No payments yet"
                    description="Open an invoice and use “Record payment” to log a collection."
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
