"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Building2, FileText, Receipt, Search, Users } from "lucide-react";

import { searchAll, type SearchResult } from "@/lib/api/search";

const ICON: Record<SearchResult["type"], typeof Users> = {
  tenant: Users,
  building: Building2,
  contract: FileText,
  invoice: Receipt,
};

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Press "/" anywhere to focus search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchAll(debounced),
    enabled: debounced.length >= 1,
    staleTime: 10_000,
  });
  const results = data ?? [];

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <div className="relative hidden md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => e.key === "Escape" && inputRef.current?.blur()}
        placeholder="Search tenants, contracts, invoices…"
        className="h-9 w-72 rounded-full border border-border bg-background pl-9 pr-8 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/40"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
        /
      </kbd>

      {open && debounced.length >= 1 && (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border bg-popover shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              {isFetching ? "Searching…" : `No matches for “${debounced}”.`}
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto p-1">
              {results.map((r, i) => {
                const Icon = ICON[r.type];
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(r.href)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{r.sublabel}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
