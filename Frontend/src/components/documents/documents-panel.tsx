"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, LoaderCircle, Trash2, Upload } from "lucide-react";

import {
  deleteDocument,
  documentFileUrl,
  listContractDocuments,
  listTenantDocuments,
  uploadContractDocument,
  uploadTenantDocument,
  type DocumentItem,
} from "@/lib/api/documents";
import { ApiError } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPanel({
  kind,
  ownerId,
  title = "Requirements & documents",
  description,
}: {
  kind: "tenant" | "contract";
  ownerId: string;
  title?: string;
  description?: string;
}) {
  const qc = useQueryClient();
  const key = ["documents", kind, ownerId];
  const fileRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const list = useQuery({
    queryKey: key,
    queryFn: () =>
      kind === "tenant" ? listTenantDocuments(ownerId) : listContractDocuments(ownerId),
  });

  const upload = useMutation({
    mutationFn: () => {
      const fn = kind === "tenant" ? uploadTenantDocument : uploadContractDocument;
      return fn(ownerId, file!, { label: label.trim() || undefined });
    },
    onSuccess: async () => {
      toast.success("Document uploaded.");
      setLabel("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Could not upload document."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: async () => {
      toast.success("Document removed.");
      await qc.invalidateQueries({ queryKey: key });
    },
    onError: () => toast.error("Could not remove document."),
  });

  return (
    <Card>
      <div className="border-b p-4">
        <h2 className="font-medium">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      <div className="divide-y">
        {list.isLoading && (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        )}
        {list.data?.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No documents uploaded yet.
          </p>
        )}
        {list.data?.map((d: DocumentItem) => (
          <div key={d.id} className="flex items-center gap-3 px-4 py-3">
            <FileText className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{d.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {d.fileName} · {fmtSize(d.sizeBytes)} · {formatDate(d.uploadedAt)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              render={<a href={documentFileUrl(d.id)} target="_blank" rel="noopener" />}
              aria-label="Open document"
            >
              <Download className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => remove.mutate(d.id)}
              disabled={remove.isPending}
              aria-label="Remove document"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <form
        className="flex flex-wrap items-end gap-3 border-t p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (file && !upload.isPending) upload.mutate();
        }}
      >
        <div className="flex min-w-40 flex-1 flex-col gap-1.5">
          <Label className="text-xs">Label (optional)</Label>
          <Input
            placeholder="e.g. Mayor's Permit 2026"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">File</Label>
          <Input
            ref={fileRef}
            type="file"
            className="file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="submit" disabled={!file || upload.isPending}>
          {upload.isPending ? <LoaderCircle className="animate-spin" /> : <Upload />}
          Upload
        </Button>
      </form>
    </Card>
  );
}
