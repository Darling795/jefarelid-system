"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { useAuth } from "@/lib/auth/use-auth";
import { AppShell } from "@/components/app-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background text-muted-foreground">
        <LoaderCircle className="size-6 animate-spin" />
      </div>
    );
  }

  if (!user) return null; // redirecting to /login

  return <AppShell user={user}>{children}</AppShell>;
}
