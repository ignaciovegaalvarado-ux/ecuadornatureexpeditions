import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
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
        "flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground",
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
        "flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
    >
      <X aria-hidden strokeWidth={2} className="h-3.5 w-3.5" />
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("card-surface", className)}>{children}</section>;
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
    <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
      <div className="min-w-0">
        <h2 className="font-display text-[17px] leading-tight font-semibold tracking-tight text-balance text-foreground">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-[12.5px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* Status reads as a tinted chip with a matching hairline — one consistent
   construction across every tone, so scanning a column compares meaning, not weight. */
const toneMap = {
  success: "bg-success/15 text-success-ink ring-success/30",
  warning: "bg-warning/18 text-warning-ink ring-warning/35",
  info: "bg-info/15 text-info-ink ring-info/30",
  danger: "bg-destructive/12 text-destructive ring-destructive/25",
  muted: "bg-muted text-muted-foreground ring-border",
} as const;

export type Tone = keyof typeof toneMap;

export function Badge({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap ring-1 ring-inset",
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
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={cn(
            "cursor-pointer rounded-lg border px-4 py-2 text-[13px] font-semibold transition-[background-color,border-color,color,box-shadow] duration-150",
            value === o
              ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-raise)]"
              : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-secondary hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
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
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-raise)] transition-[background-color,box-shadow,transform] duration-150",
        "hover:bg-primary/90 active:translate-y-px active:shadow-none",
        "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
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
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-foreground transition-[background-color,border-color,transform] duration-150",
        "hover:border-primary/30 hover:bg-secondary active:translate-y-px",
        "disabled:pointer-events-none disabled:opacity-50",
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
      <tr className="border-b border-border bg-secondary/60">
        {cols.map((c) => (
          <th
            key={c.label}
            className={cn(
              "table-head-cell px-6 py-3 text-left whitespace-nowrap",
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

export function Progress({
  value,
  tone = "primary",
}: {
  value: number;
  tone?: "primary" | "accent";
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn("h-full rounded-full", tone === "accent" ? "bg-accent" : "bg-primary")}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
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
    <div className="numeric min-w-[132px] rounded-lg bg-popover px-3 py-2 text-[12px] shadow-[var(--shadow-lift)]">
      {title ? (
        <div className="mb-1.5 text-[11.5px] font-semibold text-popover-foreground">{title}</div>
      ) : null}
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            {r.color ? (
              <span className="h-2 w-2 flex-none rounded-full" style={{ background: r.color }} />
            ) : null}
            <span className="text-muted-foreground">{r.label}</span>
            <span className="ml-auto font-semibold text-popover-foreground">{r.value}</span>
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
