"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";

import {
  createRoom,
  updateRoom,
  type RoomListItem,
  type RoomStatus,
} from "@/lib/api/rooms";
import { ApiError } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export function RoomFormDialog({
  open,
  onOpenChange,
  buildingId,
  room,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string;
  room?: RoomListItem;
}) {
  const queryClient = useQueryClient();
  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [areaSqm, setAreaSqm] = useState("");
  const [baseRate, setBaseRate] = useState("");
  const [status, setStatus] = useState<RoomStatus>("vacant");

  useEffect(() => {
    if (open) {
      setRoomNumber(room?.roomNumber ?? "");
      setFloor(room?.floor ?? "");
      setAreaSqm(room?.areaSqm ?? "");
      setBaseRate(room?.baseRate ?? "");
      setStatus(room?.status ?? "vacant");
    }
  }, [open, room]);

  const mutation = useMutation({
    mutationFn: () => {
      const base = {
        roomNumber: roomNumber.trim(),
        floor: floor.trim() || undefined,
        areaSqm: areaSqm.trim() || undefined,
        baseRate: baseRate.trim(),
      };
      return room
        ? updateRoom(room.id, { ...base, status })
        : createRoom(buildingId, base);
    },
    onSuccess: async () => {
      toast.success(room ? "Room updated." : "Room added.");
      await queryClient.invalidateQueries({ queryKey: ["building", buildingId] });
      await queryClient.invalidateQueries({ queryKey: ["buildings"] });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Could not save room.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!mutation.isPending) mutation.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>{room ? "Edit room" : "Add room"}</DialogTitle>
            <DialogDescription>
              Base rate is the monthly rent before VAT, escalation, and WHT.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-number">Room number</Label>
              <Input
                id="r-number"
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-floor">Floor</Label>
              <Input id="r-floor" value={floor} onChange={(e) => setFloor(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-area">Area (sqm)</Label>
              <Input
                id="r-area"
                inputMode="decimal"
                value={areaSqm}
                onChange={(e) => setAreaSqm(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="r-rate">Base rate (PHP)</Label>
              <Input
                id="r-rate"
                inputMode="decimal"
                required
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
              />
            </div>
            {room && (
              <div className="col-span-2 flex flex-col gap-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as RoomStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Occupancy is normally derived from active contracts; set this only
                  to reflect reservations.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <LoaderCircle className="animate-spin" />}
              {room ? "Save changes" : "Add room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
