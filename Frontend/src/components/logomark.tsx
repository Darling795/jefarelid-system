import { cn } from "@/lib/utils";

/**
 * The JEFARELID "JF" monogram. `tone="light"` (default) is a deep-navy tile for
 * light surfaces; `tone="dark"` is a brighter tile that reads on the dark rail /
 * ink brand panel. One place to refine the mark for the whole app.
 */
export function Logomark({
  className,
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-md ring-1",
        tone === "dark"
          ? "bg-sidebar-primary text-sidebar-primary-foreground ring-white/15"
          : "bg-primary text-primary-foreground ring-black/10",
        className,
      )}
    >
      <span className="font-heading text-[0.95em] font-semibold leading-none tracking-[-0.04em]">
        JF
      </span>
    </div>
  );
}
