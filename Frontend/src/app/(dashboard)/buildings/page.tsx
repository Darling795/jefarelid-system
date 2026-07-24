"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";

import { listBuildings } from "@/lib/api/buildings";
import { PageHeader } from "@/components/page-header";
import { BuildingFormDialog } from "@/components/buildings/building-form-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function BuildingsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["buildings"],
    queryFn: listBuildings,
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Buildings"
        description="Ten buildings across the portfolio and their room occupancy."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> New building
          </Button>
        }
      />

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Rooms</TableHead>
              <TableHead className="text-right">Occupied</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {isError && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-destructive">
                  Failed to load buildings.
                </TableCell>
              </TableRow>
            )}

            {data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No buildings yet.
                </TableCell>
              </TableRow>
            )}

            {data?.map((b) => (
              <TableRow key={b.id} className="cursor-pointer">
                <TableCell>
                  <Link
                    href={`/buildings/${b.id}`}
                    className="flex items-center gap-2 font-medium hover:underline"
                  >
                    <Building2 className="size-4 text-muted-foreground" />
                    {b.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {b.address ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{b.roomCount}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.occupiedCount} / {b.roomCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <BuildingFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
