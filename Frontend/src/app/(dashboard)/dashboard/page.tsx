"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Building2, FileText, TrendingUp, Wallet } from "lucide-react";

import {
  getExpiring,
  getIncomeTrend,
  getOccupancy,
  getReceivables,
  getSummary,
  getTopTenants,
} from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/use-auth";
import { formatPHP, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tint = "bg-primary/10 text-primary",
  glow = "bg-primary/20",
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  sub?: string;
  tint?: string;
  glow?: string;
}) {
  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-8 size-24 rounded-full opacity-60 blur-2xl",
          glow,
        )}
      />
      <CardContent className="relative flex items-center gap-4">
        <div className={cn("grid size-12 place-items-center rounded-2xl ring-1 ring-black/5", tint)}>
          <Icon className="size-5.5" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "super_admin") router.replace("/");
  }, [user, router]);

  const summary = useQuery({ queryKey: ["dash", "summary"], queryFn: getSummary });
  const income = useQuery({ queryKey: ["dash", "income"], queryFn: () => getIncomeTrend(12) });
  const receivables = useQuery({ queryKey: ["dash", "recv"], queryFn: getReceivables });
  const occupancy = useQuery({ queryKey: ["dash", "occ"], queryFn: getOccupancy });
  const expiring = useQuery({ queryKey: ["dash", "exp"], queryFn: () => getExpiring(90) });
  const top = useQuery({ queryKey: ["dash", "top"], queryFn: () => getTopTenants(5) });

  if (user && user.role !== "super_admin") return null;

  const incomeData = (income.data ?? []).map((p) => ({
    month: formatPeriod(p.month),
    Billed: Number(p.billed),
    Collected: Number(p.collected),
  }));
  const agingData = receivables.data
    ? [
        { bucket: "Current", amount: Number(receivables.data.current) },
        { bucket: "1–30", amount: Number(receivables.data.days30) },
        { bucket: "31–60", amount: Number(receivables.data.days60) },
        { bucket: "60+", amount: Number(receivables.data.days90Plus) },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Dashboard" description="Portfolio performance at a glance." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.isLoading || !summary.data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : (
          <>
            <Kpi
              icon={Building2}
              label="Occupancy"
              value={`${summary.data.occupancyRate}%`}
              sub={`${summary.data.occupiedRooms} / ${summary.data.rooms} rooms`}
              tint="bg-primary/10 text-primary"
              glow="bg-violet-500/25"
            />
            <Kpi
              icon={FileText}
              label="Active contracts"
              value={String(summary.data.activeContracts)}
              tint="bg-sky-500/10 text-sky-600 dark:text-sky-400"
              glow="bg-sky-500/25"
            />
            <Kpi
              icon={Wallet}
              label="Outstanding"
              value={formatPHP(summary.data.outstandingTotal)}
              tint="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              glow="bg-amber-500/25"
            />
            <Kpi
              icon={TrendingUp}
              label="Active tenants"
              value={String(summary.data.activeTenants)}
              tint="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              glow="bg-emerald-500/25"
            />
          </>
        )}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base">Income trend — billed vs collected</CardTitle>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={incomeData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} width={48} />
                <Tooltip formatter={(value) => formatPHP(Number(value))} />
                <Line type="monotone" dataKey="Billed" stroke="#7c3aed" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Collected" stroke="#10b981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base">Receivables aging</CardTitle>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="bucket" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} width={48} />
                <Tooltip formatter={(value) => formatPHP(Number(value))} />
                <Bar dataKey="amount" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base">Expiring in 90 days</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {expiring.data?.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">Nothing expiring soon.</p>
            )}
            <ul className="divide-y">
              {expiring.data?.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/contracts/${c.id}`} className="hover:underline">
                    {c.tenantName} · {c.buildingName} {c.roomNumber}
                  </Link>
                  <span className="text-muted-foreground">{c.daysLeft} days</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base">Occupancy by building</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ul className="divide-y">
              {occupancy.data?.perBuilding.map((b) => (
                <li key={b.buildingName} className="flex items-center justify-between py-2 text-sm">
                  <span>{b.buildingName}</span>
                  <span className="text-muted-foreground">
                    {b.occupied}/{b.total} · {b.rate}%
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {top.data && top.data.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base">Top tenants by revenue</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ul className="divide-y">
              {top.data.map((t) => (
                <li key={t.tenantId} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/tenants/${t.tenantId}`} className="hover:underline">
                    {t.tenantName}
                  </Link>
                  <span className="tabular-nums">{formatPHP(t.revenue)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
