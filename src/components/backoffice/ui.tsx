import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

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
      <div>
        <h2 className="text-[16px] font-semibold text-foreground">{title}</h2>
        {subtitle ? <p className="mt-1 text-[12.5px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

const toneMap = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  info: "bg-info text-info-foreground",
  danger: "bg-destructive/12 text-destructive",
  muted: "bg-muted text-muted-foreground",
} as const;

export type Tone = keyof typeof toneMap;

export function Badge({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap",
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
          className={cn(
            "cursor-pointer rounded-lg border px-4 py-2 text-[13px] font-semibold transition-colors",
            value === o
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-secondary",
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
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90",
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
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-lg border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-secondary",
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
      <tr className="bg-secondary/70">
        {cols.map((c) => (
          <th
            key={c.label}
            className={cn(
              "eyebrow px-6 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap",
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
    <div className="min-w-[132px] rounded-lg border border-border bg-popover px-3 py-2 text-[12px] shadow-lg">
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
