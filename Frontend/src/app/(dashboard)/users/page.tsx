"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, LoaderCircle, LockOpen, Plus } from "lucide-react";

import {
  createUser,
  listUsers,
  resetUserPassword,
  unlockUser,
  updateUser,
  type UserItem,
} from "@/lib/api/users";
import { ApiError, type Role } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UsersPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetFor, setResetFor] = useState<UserItem | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" as Role });
  const [newPassword, setNewPassword] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

  const create = useMutation({
    mutationFn: () => createUser(form),
    onSuccess: async () => {
      toast.success("User created.");
      setCreateOpen(false);
      setForm({ name: "", email: "", password: "", role: "admin" });
      await invalidate();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not create user."),
  });

  const toggleActive = useMutation({
    mutationFn: (u: UserItem) => updateUser(u.id, { isActive: !u.isActive }),
    onSuccess: async () => { toast.success("Updated."); await invalidate(); },
  });

  const unlock = useMutation({
    mutationFn: (u: UserItem) => unlockUser(u.id),
    onSuccess: async () => { toast.success("Account unlocked."); await invalidate(); },
  });

  const reset = useMutation({
    mutationFn: () => resetUserPassword(resetFor!.id, newPassword),
    onSuccess: () => { toast.success("Password reset."); setResetFor(null); setNewPassword(""); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not reset."),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Users"
        description="Staff accounts. 1 Super Admin, up to 2 Admins."
        action={<Button onClick={() => setCreateOpen(true)}><Plus /> New user</Button>}
      />

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))}
            {data?.map((u) => {
              const locked = u.lockedUntil && new Date(u.lockedUntil) > new Date();
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.role === "super_admin" ? "Super Admin" : "Admin"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(u.lastLoginAt)}</TableCell>
                  <TableCell>
                    {locked ? <Badge className="bg-destructive/10 text-destructive">Locked</Badge> : <StatusBadge status={u.isActive ? "active" : "inactive"} />}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setResetFor(u)}>
                        <KeyRound className="size-4" />
                      </Button>
                      {locked && (
                        <Button size="sm" variant="ghost" onClick={() => unlock.mutate(u)}>
                          <LockOpen className="size-4" />
                        </Button>
                      )}
                      {u.role !== "super_admin" && (
                        <Button size="sm" variant="ghost" onClick={() => toggleActive.mutate(u)}>
                          {u.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <DialogHeader><DialogTitle>New user</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Email</Label>
                <Input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Password</Label>
                  <Input type="password" minLength={8} required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <LoaderCircle className="animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password */}
      <Dialog open={resetFor !== null} onOpenChange={(o) => !o && setResetFor(null)}>
        <DialogContent>
          <form onSubmit={(e) => { e.preventDefault(); reset.mutate(); }}>
            <DialogHeader><DialogTitle>Reset password — {resetFor?.name}</DialogTitle></DialogHeader>
            <div className="grid gap-2 py-4">
              <Label>New password</Label>
              <Input type="password" minLength={8} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetFor(null)}>Cancel</Button>
              <Button type="submit" disabled={reset.isPending}>
                {reset.isPending && <LoaderCircle className="animate-spin" />}
                Reset
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
