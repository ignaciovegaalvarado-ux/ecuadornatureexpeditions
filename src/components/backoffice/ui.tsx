import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Dismisses a modal or panel. */
export function CloseButton({
  onClick,
  label = "Cerrar",
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "press flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-md text-subtle transition-[background-color,color,transform] duration-150 hover:bg-secondary hover:text-foreground active:scale-[0.94]",
        className,
      )}
    >
      <X aria-hidden strokeWidth={2} className="h-4 w-4" />
    </button>
  );
}

/** Removes the row or item it sits on. Destructive, so it stays quiet until hovered. */
export function RemoveButton({
  onClick,
  label = "Eliminar",
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "press flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded text-subtle transition-[background-color,color,transform] duration-150 hover:bg-destructive/10 hover:text-destructive active:scale-[0.94]",
        className,
      )}
    >
      <X aria-hidden strokeWidth={2} className="h-3.5 w-3.5" />
    </button>
  );
}

/** A panel at rest. Hairline only — elevation is reserved for things that float. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("panel", className)}>{children}</section>;
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4 pb-3.5">
      <div className="min-w-0">
        <h2 className="text-[14px] leading-tight font-semibold tracking-[-0.015em] text-balance text-foreground">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-[12px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Names a group of controls or a band of content. Used sparingly. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="eyebrow mb-2.5">{children}</div>;
}

/* Status reads as a tinted chip with a matching hairline — one construction across
   every tone, so scanning a column compares meaning rather than weight. */
const toneMap = {
  success: "bg-success/14 text-success-ink ring-success/28",
  warning: "bg-warning/16 text-warning-ink ring-warning/32",
  info: "bg-info/14 text-info-ink ring-info/28",
  danger: "bg-destructive/11 text-destructive ring-destructive/24",
  muted: "bg-secondary text-muted-foreground ring-border",
} as const;

export type Tone = keyof typeof toneMap;

export function Badge({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] leading-[1.45] font-semibold whitespace-nowrap ring-1 ring-inset",
        toneMap[tone],
      )}
    >
      {children}
    </span>
  );
}

export function estadoTone(estado: string): Tone {
  switch (estado) {
    case "Confirmado":
    case "Pagada":
    case "Procesado":
    case "Completo":
    case "Cubierto":
    case "Activo":
      return "success";
    case "Operando":
    case "Convertido en reserva":
      return "info";
    case "Cancelado":
    case "Vencido":
    case "Vencida":
      return "danger";
    case "Pendiente":
    case "Pendiente de pago":
    case "Incompleto":
    case "Requiere revisión":
    case "Próximo a vencer":
      return "warning";
    default:
      return "muted";
  }
}

/** A segmented control: one track, one moving selection. Reads as a single control
    rather than a row of competing buttons. */
export function FilterTabs({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex flex-wrap items-center gap-0.5 rounded-lg bg-secondary p-0.5"
    >
      {options.map((o) => {
        const selected = value === o;
        return (
          <button
            key={o}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(o)}
            className={cn(
              "press cursor-pointer rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98]",
              selected
                ? "bg-card font-semibold text-foreground shadow-[var(--shadow-flat)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function PrimaryButton({
  children,
  className,
  onClick,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "press inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-foreground transition-[background-color,transform] duration-150",
        "hover:bg-primary/90 active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className,
  onClick,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "press inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-[13px] font-semibold text-foreground transition-[background-color,border-color,transform] duration-150",
        "hover:border-border-strong hover:bg-secondary active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TableHead({ cols }: { cols: { label: string; className?: string }[] }) {
  return (
    <thead>
      <tr className="border-b border-border">
        {cols.map((c) => (
          <th
            key={c.label}
            className={cn(
              "table-head-cell bg-card px-4 py-2.5 text-left whitespace-nowrap",
              c.className,
            )}
          >
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/** The width below which a given table stops fitting all its columns. */
const stackClass = {
  lg: "stack-at-lg",
  xl: "stack-at-xl",
  wide: "stack-at-wide",
} as const;

/**
 * Wraps a data table. Above `stackAt` it is an ordinary table; below it, every
 * row becomes a labelled stack so no column is left off the right edge.
 *
 * The stacked view needs each cell to know its column header. Rather than
 * repeat the header on every `td` at every call site, the header row is read
 * back from the DOM and mirrored onto the cells by position.
 */
export function DataTable({
  children,
  stackAt = "lg",
  className,
}: {
  children: ReactNode;
  stackAt?: "lg" | "xl" | "wide";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    function label() {
      const table = root!.querySelector(":scope > table");
      if (!table) return;
      const heads = Array.from(table.querySelectorAll(":scope > thead > tr > th")).map(
        (th) => th.textContent?.trim() ?? "",
      );
      for (const row of table.querySelectorAll(":scope > tbody > tr")) {
        Array.from(row.children).forEach((cell, i) => {
          if (cell.hasAttribute("colspan")) return;
          const head = heads[i] ?? "";
          if (head) cell.setAttribute("data-label", head);
          else cell.removeAttribute("data-label");
        });
      }
    }

    label();
    // Rows come and go as filters change and detail panels expand.
    const observer = new MutationObserver(label);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  });

  return (
    <div ref={ref} className={cn("w-full overflow-x-auto", stackClass[stackAt], className)}>
      {children}
    </div>
  );
}

export function Progress({
  value,
  tone = "primary",
}: {
  value: number;
  tone?: "primary" | "accent";
}) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out)]",
          tone === "accent" ? "bg-accent" : "bg-primary",
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/** Shown where a filtered list comes back empty. States what is missing and what to do. */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon ? <div className="mb-1 text-subtle">{icon}</div> : null}
      <p className="text-[13.5px] font-semibold text-foreground">{title}</p>
      {hint ? <p className="max-w-[42ch] text-[12.5px] text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ChartTooltipCard({
  title,
  rows,
}: {
  title?: ReactNode;
  rows: { label: string; value: ReactNode; color?: string }[];
}) {
  return (
    <div className="min-w-[136px] rounded-md border border-border bg-popover px-2.5 py-2 text-[12px] shadow-[var(--shadow-lift)]">
      {title ? (
        <div className="mb-1.5 text-[11.5px] font-semibold text-popover-foreground">{title}</div>
      ) : null}
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            {r.color ? (
              <span className="h-2 w-2 flex-none rounded-[2px]" style={{ background: r.color }} />
            ) : null}
            <span className="text-muted-foreground">{r.label}</span>
            <span className="numeric ml-auto font-semibold text-popover-foreground">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Charts are client-only: recharts measures the DOM, so render after hydration. */
export function ChartFrame({ height, children }: { height: number; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div style={{ height }} aria-hidden />;
  return <div style={{ height }}>{children}</div>;
}
