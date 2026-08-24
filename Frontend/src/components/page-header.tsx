"use client";

import type { ComponentType, ReactNode } from "react";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/lib/nav";

function iconForPath(pathname: string): ComponentType<{ className?: string }> | null {
  const match = NAV_ITEMS.filter(
    (i) => i.href !== "/" && pathname.startsWith(i.href),
  ).sort((a, b) => b.href.length - a.href.length)[0];
  return match?.icon ?? null;
}

export function PageHeader({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
}) {
  const pathname = usePathname();
  const Icon = icon ?? iconForPath(pathname);

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-accent text-primary">
            <Icon className="size-5" />
          </div>
        )}
        <div>
          <h1 className="font-heading text-xl font-semibold sm:text-2xl">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
