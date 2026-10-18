"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  DoorOpen,
  Plus,
} from "lucide-react";

import { listBuildings } from "@/lib/api/buildings";
import {
  listVacantRooms,
  type SortDir,
  type VacantSortBy,
} from "@/lib/api/rooms";
import { formatArea, formatPHP } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { BuildingFormDialog } from "@/components/buildings/building-form-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BuildingSortKey = "name" | "roomCount" | "occupiedCount";

export default function BuildingsPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Buildings"
        description="The portfolio's buildings, their room occupancy, and current vacancies."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> New building
          </Button>
        }
      />

      <Tabs defaultValue="buildings">
        <TabsList>
          <TabsTrigger value="buildings">
            <Building2 /> Buildings
          </TabsTrigger>
          <TabsTrigger value="vacant">
            <DoorOpen /> Vacant units
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buildings" className="mt-4">
          <BuildingsTable onCreate={() => setCreateOpen(true)} />
        </TabsContent>

        <TabsContent value="vacant" className="mt-4">
          <VacantUnits />
        </TabsContent>
      </Tabs>

      <BuildingFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-foreground ${
        align === "right" ? "flex-row-reverse" : ""
      } ${active ? "text-foreground" : ""}`}
    >
      {label}
      <Icon className="size-3.5 text-muted-foreground" />
    </button>
  );
}

function BuildingsTable({ onCreate }: { onCreate: () => void }) {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["buildings"],
    queryFn: listBuildings,
  });

  const [sortKey, setSortKey] = useState<BuildingSortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggle = (key: BuildingSortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const sorted = useMemo(() => {
    if (!data) return data;
    const rows = [...data];
    rows.sort((a, b) => {
      let cmp: number;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else cmp = a[sortKey] - b[sortKey];
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [data, sortKey, sortDir]);

  return (
    <Card className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortHeader
                label="Name"
                active={sortKey === "name"}
                dir={sortDir}
                onClick={() => toggle("name")}
              />
            </TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="text-right">
              <SortHeader
                label="Rooms"
                align="right"
                active={sortKey === "roomCount"}
                dir={sortDir}
                onClick={() => toggle("roomCount")}
              />
            </TableHead>
            <TableHead className="text-right">
              <SortHeader
                label="Occupied"
                align="right"
                active={sortKey === "occupiedCount"}
                dir={sortDir}
                onClick={() => toggle("occupiedCount")}
              />
            </TableHead>
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
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="p-0">
                <EmptyState
                  icon={Building2}
                  title="No buildings yet"
                  description="Add your first building to start managing rooms and tenants."
                  action={
                    <Button onClick={onCreate}>
                      <Plus /> New building
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          )}

          {sorted?.map((b) => (
            <TableRow
              key={b.id}
              className="cursor-pointer"
              onClick={() => router.push(`/buildings/${b.id}`)}
            >
              <TableCell>
                <Link
                  href={`/buildings/${b.id}`}
                  className="flex items-center gap-2 font-medium hover:underline"
                  onClick={(e) => e.stopPropagation()}
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
  );
}

function VacantUnits() {
  const router = useRouter();
  const [buildingId, setBuildingId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<VacantSortBy>("buildingName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const buildings = useQuery({ queryKey: ["buildings"], queryFn: listBuildings });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vacant-rooms", buildingId, sortBy, sortDir],
    queryFn: () =>
      listVacantRooms({
        buildingId: buildingId === "all" ? undefined : buildingId,
        sortBy,
        sortDir,
      }),
  });

  const toggle = (key: VacantSortBy) => {
    if (key === sortBy) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir(key === "baseRate" ? "asc" : "asc");
    }
  };

  const buildingItems = [
    { value: "all", label: "All buildings" },
    ...(buildings.data ?? []).map((b) => ({ value: b.id, label: b.name })),
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Select
          value={buildingId}
          onValueChange={(v) => setBuildingId(v ?? "all")}
          items={buildingItems}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {buildingItems.map((it) => (
              <SelectItem key={it.value} value={it.value}>
                {it.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.length} vacant unit${data.length === 1 ? "" : "s"}` : ""}
        </p>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead>
                <SortHeader
                  label="Building"
                  active={sortBy === "buildingName"}
                  dir={sortDir}
                  onClick={() => toggle("buildingName")}
                />
              </TableHead>
              <TableHead>Floor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Area</TableHead>
              <TableHead className="text-right">
                <SortHeader
                  label="Rental price"
                  align="right"
                  active={sortBy === "baseRate"}
                  dir={sortDir}
                  onClick={() => toggle("baseRate")}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {isError && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-destructive">
                  Failed to load vacant units.
                </TableCell>
              </TableRow>
            )}

            {data?.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={DoorOpen}
                    title="No vacant units"
                    description="Every active unit in this view is currently leased."
                  />
                </TableCell>
              </TableRow>
            )}

            {data?.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => router.push(`/buildings/${r.buildingId}`)}
              >
                <TableCell className="font-medium">
                  <Link
                    href={`/buildings/${r.buildingId}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {r.roomNumber}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.buildingName}
                </TableCell>
                <TableCell>{r.floor ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatArea(r.areaSqm)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatPHP(r.baseRate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
