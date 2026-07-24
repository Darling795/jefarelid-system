"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  LoaderCircle,
  LockKeyhole,
  Receipt,
  ShieldCheck,
} from "lucide-react";

import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/types";
import { AUTH_QUERY_KEY, useAuth } from "@/lib/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function messageForCode(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "INVALID_CREDENTIALS":
        return "Invalid email or password.";
      case "ACCOUNT_LOCKED":
        return "Account temporarily locked after too many failed attempts. Try again later.";
      case "ACCOUNT_INACTIVE":
        return "This account is inactive. Contact the Super Admin.";
      default:
        return err.message;
    }
  }
  return "Something went wrong. Please try again.";
}

const FEATURES = [
  { icon: Building2, label: "Portfolio & occupancy at a glance" },
  { icon: Receipt, label: "Automated rent invoicing & payments" },
  { icon: ShieldCheck, label: "Full, tamper-proof audit trail" },
];

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const landingFor = (role: string) => (role === "super_admin" ? "/dashboard" : "/");

  useEffect(() => {
    if (!isLoading && user) router.replace(landingFor(user.role));
  }, [isLoading, user, router]);

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: async (authUser) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, authUser);
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      router.replace(landingFor(authUser.role));
    },
  });

  const Brand = (
    <div className="flex items-center gap-3">
      <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-violet-600/30 ring-1 ring-white/20">
        <Building2 className="size-6" />
      </div>
      <div className="leading-tight">
        <p className="text-lg font-extrabold tracking-tight">JEFARELID</p>
        <p className="text-xs text-muted-foreground">Rental Management</p>
      </div>
    </div>
  );

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden flex-col overflow-hidden bg-gradient-to-br from-[#3b0f6f] via-[#5b21b6] to-[#7c3aed] p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-10 size-96 rounded-full bg-fuchsia-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Building2 className="size-6" />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight">JEFARELID</p>
            <p className="text-xs text-white/70">Rental Management</p>
          </div>
        </div>

        <div className="relative my-auto max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Buildings, tenants &amp; rent — all in one place.
          </h2>
          <p className="mt-4 text-white/80">
            Track leases, generate invoices, record payments, and see the whole
            portfolio at a glance.
          </p>

          <ul className="mt-10 space-y-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.label} className="flex items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
                    <Icon className="size-4.5" />
                  </div>
                  <span className="text-sm text-white/90">{f.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">
          © JEFARELID Corp. · Internal staff system
        </p>
      </div>

      {/* Right form panel */}
      <div className="relative flex items-center justify-center overflow-hidden bg-background px-4 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,var(--color-primary)_0%,transparent_60%)] opacity-[0.06]"
        />
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="mb-8 flex justify-center lg:hidden">{Brand}</div>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                <p className="text-sm text-muted-foreground">
                  Sign in to your staff account.
                </p>
              </div>

              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!mutation.isPending) mutation.mutate();
                }}
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@jefarelid.test"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {mutation.isError && (
                  <p className="text-sm text-destructive" role="alert">
                    {messageForCode(mutation.error)}
                  </p>
                )}

                <Button
                  type="submit"
                  className="mt-1 h-11 w-full text-sm shadow-lg shadow-primary/25"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <LockKeyhole className="size-4" />
                  )}
                  Sign in
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Staff access only. Contact your Super Admin for an account.
          </p>
        </div>
      </div>
    </main>
  );
}
