"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";

import { listSettings, updateSetting } from "@/lib/api/settings";
import { ApiError } from "@/lib/api/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: listSettings });
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) setValues(Object.fromEntries(data.map((s) => [s.key, s.value])));
  }, [data]);

  const save = useMutation({
    mutationFn: (key: string) => updateSetting(key, values[key]),
    onSuccess: async () => {
      toast.success("Setting updated.");
      await qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not update."),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        description="Tax rates and system parameters. Changes affect future invoices only."
      />

      {isLoading && <Skeleton className="h-40 w-full" />}

      <div className="flex flex-col gap-3">
        {data?.map((s) => (
          <Card key={s.key}>
            <CardContent className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex-1">
                <Label className="font-mono text-sm">{s.key}</Label>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
              <div className="flex items-end gap-2">
                <Input
                  className="w-40"
                  value={values[s.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                />
                <Button
                  onClick={() => save.mutate(s.key)}
                  disabled={save.isPending || values[s.key] === s.value}
                >
                  {save.isPending && save.variables === s.key && (
                    <LoaderCircle className="animate-spin" />
                  )}
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
