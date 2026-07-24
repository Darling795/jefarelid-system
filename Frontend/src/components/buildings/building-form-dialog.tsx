"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";

import {
  createBuilding,
  updateBuilding,
  type BuildingInput,
} from "@/lib/api/buildings";
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
import { Textarea } from "@/components/ui/textarea";

export interface BuildingFormValue {
  id: string;
  name: string;
  address: string | null;
  notes: string | null;
}

export function BuildingFormDialog({
  open,
  onOpenChange,
  building,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  building?: BuildingFormValue;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setName(building?.name ?? "");
      setAddress(building?.address ?? "");
      setNotes(building?.notes ?? "");
    }
  }, [open, building]);

  const mutation = useMutation({
    mutationFn: () => {
      const input: BuildingInput = {
        name: name.trim(),
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      return building ? updateBuilding(building.id, input) : createBuilding(input);
    },
    onSuccess: async (saved) => {
      toast.success(building ? "Building updated." : "Building created.");
      await queryClient.invalidateQueries({ queryKey: ["buildings"] });
      if (building) {
        await queryClient.invalidateQueries({ queryKey: ["building", saved.id] });
      }
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Could not save building.");
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
            <DialogTitle>{building ? "Edit building" : "New building"}</DialogTitle>
            <DialogDescription>
              Buildings hold the rooms you lease to tenants.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="b-name">Name</Label>
              <Input
                id="b-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="JEFARELID Center — Makati"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="b-address">Address</Label>
              <Input
                id="b-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="b-notes">Notes</Label>
              <Textarea
                id="b-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <LoaderCircle className="animate-spin" />}
              {building ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
