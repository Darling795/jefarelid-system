"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteBuilding, getBuilding } from "@/lib/api/buildings";
import { deleteRoom, type RoomListItem } from "@/lib/api/rooms";
import { ApiError } from "@/lib/api/types";
import { formatPHP } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { BuildingFormDialog } from "@/components/buildings/building-form-dialog";
import { RoomFormDialog } from "@/components/rooms/room-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
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

export default function BuildingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<RoomListItem | undefined>();
  const [deleteBuildingOpen, setDeleteBuildingOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<RoomListItem | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["building", id],
    queryFn: () => getBuilding(id),
  });

  const removeBuilding = useMutation({
    mutationFn: () => deleteBuilding(id),
    onSuccess: async () => {
      toast.success("Building deleted.");
      await queryClient.invalidateQueries({ queryKey: ["buildings"] });
      router.replace("/buildings");
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError && err.code === "BUILDING_HAS_ROOMS"
          ? "Remove all rooms before deleting this building."
          : "Could not delete building.";
      toast.error(msg);
      setDeleteBuildingOpen(false);
    },
  });

  const removeRoom = useMutation({
    mutationFn: (roomId: string) => deleteRoom(roomId),
    onSuccess: async () => {
      toast.success("Room deactivated.");
      await queryClient.invalidateQueries({ queryKey: ["building", id] });
      setRoomToDelete(null);
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError && err.code === "ROOM_HAS_CONTRACTS"
          ? "This room has an active contract and cannot be deactivated."
          : "Could not deactivate room.";
      toast.error(msg);
      setRoomToDelete(null);
    },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/buildings"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Buildings
      </Link>

      {isLoading && <Skeleton className="h-40 w-full" />}
      {isError && <p className="text-destructive">Failed to load building.</p>}

      {data && (
        <>
          <PageHeader
            title={data.name}
            description={data.address ?? undefined}
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil /> Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteBuildingOpen(true)}
                >
                  <Trash2 /> Delete
                </Button>
              </div>
            }
          />

          {data.notes && (
            <Card className="mb-4">
              <CardContent className="text-sm text-muted-foreground">
                {data.notes}
              </CardContent>
            </Card>
          )}

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">Rooms ({data.rooms.length})</h2>
            <Button
              size="sm"
              onClick={() => {
                setEditRoom(undefined);
                setRoomOpen(true);
              }}
            >
              <Plus /> Add room
            </Button>
          </div>

          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead className="text-right">Area</TableHead>
                  <TableHead className="text-right">Base rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current tenant</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rooms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No rooms yet.
                    </TableCell>
                  </TableRow>
                )}
                {data.rooms.map((r) => (
                  <TableRow key={r.id} className={r.isActive ? "" : "opacity-50"}>
                    <TableCell className="font-medium">{r.roomNumber}</TableCell>
                    <TableCell>{r.floor ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.areaSqm ? `${r.areaSqm} m²` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPHP(r.baseRate)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.currentTenantName ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditRoom(r);
                            setRoomOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setRoomToDelete(r)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <BuildingFormDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            building={{
              id: data.id,
              name: data.name,
              address: data.address,
              notes: data.notes,
            }}
          />
          <RoomFormDialog
            open={roomOpen}
            onOpenChange={setRoomOpen}
            buildingId={id}
            room={editRoom}
          />
          <ConfirmDialog
            open={deleteBuildingOpen}
            onOpenChange={setDeleteBuildingOpen}
            title="Delete building?"
            description="This permanently removes the building. Only possible when it has no rooms."
            confirmLabel="Delete"
            destructive
            loading={removeBuilding.isPending}
            onConfirm={() => removeBuilding.mutate()}
          />
          <ConfirmDialog
            open={roomToDelete !== null}
            onOpenChange={(o) => !o && setRoomToDelete(null)}
            title="Deactivate room?"
            description="The room is marked inactive (kept for history). Rooms with an active contract cannot be deactivated."
            confirmLabel="Deactivate"
            destructive
            loading={removeRoom.isPending}
            onConfirm={() => roomToDelete && removeRoom.mutate(roomToDelete.id)}
          />
        </>
      )}
    </div>
  );
}
