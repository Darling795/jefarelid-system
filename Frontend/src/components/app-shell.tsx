"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, KeyRound, LogOut, Menu, X } from "lucide-react";

import { logout } from "@/lib/api/auth";
import { AUTH_QUERY_KEY } from "@/lib/auth/use-auth";
import { navGroupsForRole } from "@/lib/nav";
import type { AuthUser } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { AlertsBell } from "@/components/alerts-bell";
import { GlobalSearch } from "@/components/global-search";

const ROLE_LABEL: Record<AuthUser["role"], string> = {
  super_admin: "Super Admin",
  admin: "Admin",
};

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const now = useClock();

  const groups = navGroupsForRole(user.role);
  const firstName = user.name.split(" ")[0];

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      router.replace("/login");
    },
  });

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const Sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground ring-1 ring-white/10">
          <span className="font-heading text-lg font-semibold leading-none">JF</span>
        </div>
        <div className="leading-tight">
          <p className="font-heading text-lg font-semibold tracking-tight">JEFARELID</p>
          <p className="text-[11px] uppercase tracking-wider text-sidebar-foreground/50">
            Rental Management
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-2">
            <p className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "group/nav relative flex items-center gap-3 rounded-md py-2 pl-3.5 pr-3 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                        : "font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-sidebar-primary" />
                    )}
                    <Icon className="size-4.5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={() => logoutMutation.mutate()}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-sidebar-border py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 md:block print:!hidden">{Sidebar}</aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64">
            <button
              className="absolute right-2 top-4 z-10 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-4" />
            </button>
            {Sidebar}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-5 print:!hidden">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="size-4" />
              </Button>
              <div>
                <h1 className="font-heading text-xl font-semibold sm:text-2xl">
                  {now ? greeting(now.getHours()) : "Welcome"},{" "}
                  <span className="text-primary">{firstName}</span>
                </h1>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {ROLE_LABEL[user.role]} · JEFARELID System
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <GlobalSearch />
              <AlertsBell />
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">
                  {now
                    ? now.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {now
                    ? now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                    : ""}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-2 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50">
                  <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex flex-col px-2 py-1.5">
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setPwOpen(true)}>
                    <KeyRound className="size-4" /> Change password
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => logoutMutation.mutate()}>
                    <LogOut className="size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  );
}
