"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { useAuth } from "@/lib/auth/use-auth";
import { navItemsForRole } from "@/lib/nav";
import { Card, CardContent } from "@/components/ui/card";

export default function OverviewPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Super Admins land on the Dashboard, not the Overview.
  useEffect(() => {
    if (user?.role === "super_admin") router.replace("/dashboard");
  }, [user, router]);

  if (!user || user.role === "super_admin") return null;

  const modules = navItemsForRole(user.role).filter((i) => i.href !== "/");

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight">Quick access</h2>
        <p className="text-sm text-muted-foreground">
          Jump into any area of the system.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((item, i) => {
          const Icon = item.icon;
          const tints = [
            "bg-primary/10 text-primary",
            "bg-sky-500/10 text-sky-600 dark:text-sky-400",
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            "bg-rose-500/10 text-rose-600 dark:text-rose-400",
            "bg-violet-500/10 text-violet-600 dark:text-violet-400",
          ];
          return (
            <Link key={item.href} href={item.href} className="group">
              <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-primary/30">
                <CardContent className="flex items-center gap-4">
                  <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${tints[i % tints.length]}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.label}</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
