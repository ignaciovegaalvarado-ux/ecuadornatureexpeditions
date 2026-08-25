import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Card, CloseButton } from "./ui";
import { bloqueosSeed } from "@/lib/bloqueos";
import { buildCalendarMonth, type CalendarEvent } from "@/lib/calendario";
import { useNavigate } from "@/lib/navigation";
import { operacionesSeed } from "@/lib/operaciones";
import { pagosPorExp } from "@/lib/pagos";
import { cn } from "@/lib/utils";

const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const eventChipClass: Record<CalendarEvent["tipo"], string> = {
  inicio: "bg-info/14 text-info-ink ring-info/30",
  pago: "bg-warning/16 text-warning-ink ring-warning/34",
  bloqueo: "bg-destructive/11 text-destructive ring-destructive/26",
};

const eventTitulo: Record<CalendarEvent["tipo"], string> = {
  inicio: "Inicio de viaje",
  pago: "Pago a proveedor",
  bloqueo: "Expiración de bloqueo",
};

export function CalendarioScreen() {
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const navigate = useNavigate();

  const { monthLabel, cells } = buildCalendarMonth(
    offset,
    operacionesSeed(),
    bloqueosSeed(),
    pagosPorExp(),
  );

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOffset((o) => o - 1)}
              aria-label="Mes anterior"
              className="flex h-9 w-9 cursor-pointer items-center justify-center press rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-secondary hover:text-foreground active:scale-[0.94]"
            >
              <ChevronLeft aria-hidden strokeWidth={2} className="h-[18px] w-[18px]" />
            </button>
            <div className="min-w-[172px] text-center text-[15px] font-semibold tracking-[-0.015em]">
              {monthLabel}
            </div>
            <button
              type="button"
              onClick={() => setOffset((o) => o + 1)}
              aria-label="Mes siguiente"
              className="flex h-9 w-9 cursor-pointer items-center justify-center press rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-secondary hover:text-foreground active:scale-[0.94]"
            >
              <ChevronRight aria-hidden strokeWidth={2} className="h-[18px] w-[18px]" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setOffset(0)}
            disabled={offset === 0}
            className="press cursor-pointer rounded-md border border-border px-3 py-1.5 text-[12px] font-semibold text-foreground transition-[background-color,border-color,transform] duration-150 hover:border-border-strong hover:bg-secondary active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          >
            Hoy
          </button>
          <div className="flex-1" />
          <div className="flex flex-wrap gap-3.5 text-[11.5px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-info" /> Inicio de viaje
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-warning" /> Pago a proveedor
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-destructive/60" /> Expira bloqueo
            </span>
          </div>
        </div>

        <div className="mb-1.5 grid grid-cols-7">
          {weekDays.map((wd) => (
            <div key={wd} className="table-head-cell px-2 py-1 text-center">
              {wd}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md bg-border">
          {cells.map((cell, i) =>
            cell.blank ? (
              <div key={i} className="min-h-[108px] bg-card" />
            ) : (
              <div
                key={i}
                className={cn(
                  "flex min-h-[108px] flex-col gap-1 p-1.5 transition-colors duration-150",
                  cell.isToday ? "bg-primary/[0.045]" : "bg-card",
                )}
              >
                <div
                  className={cn(
                    "numeric flex h-5 w-5 items-center justify-center rounded-full text-[11.5px]",
                    cell.isToday
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "font-medium text-muted-foreground",
                  )}
                >
                  {cell.day}
                </div>
                {cell.events.map((ev, ei) => (
                  <button
                    key={ei}
                    type="button"
                    onClick={() => setSelected(ev)}
                    className={cn(
                      "press cursor-pointer rounded px-1.5 py-1 text-left text-[10.5px] leading-[1.35] font-semibold break-words hyphens-auto ring-1 ring-inset transition-transform duration-150 active:scale-[0.97]",
                      eventChipClass[ev.tipo],
                    )}
                  >
                    {ev.label}
                  </button>
                ))}
              </div>
            ),
          )}
        </div>
      </Card>

      {selected ? (
        <div className="scrim" onClick={() => setSelected(null)}>
          <div
            className="modal-panel relative w-full max-w-[420px] p-6.5"
            onClick={(e) => e.stopPropagation()}
          >
            <CloseButton onClick={() => setSelected(null)} className="absolute top-3.5 right-3.5" />
            <span
              className={cn(
                "mb-2.5 inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                eventChipClass[selected.tipo],
              )}
            >
              {eventTitulo[selected.tipo]}
            </span>
            <div className="mb-3.5 font-display text-[13px] font-semibold text-muted-foreground">
              {selected.fecha.toLocaleDateString("es-EC", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>

            {selected.tipo === "inicio" ? (
              <>
                <div className="mb-1 font-display text-[16px] font-bold">{selected.exp}</div>
                <div className="mb-4 text-[13px] text-muted-foreground">{selected.cliente}</div>
                <button
                  type="button"
                  onClick={() => {
                    navigate("operaciones");
                    setSelected(null);
                  }}
                  className="inline-block rounded-lg border border-primary/25 bg-success/40 px-3.5 py-2 text-[12.5px] font-semibold text-primary"
                >
                  Ver en Operaciones
                </button>
              </>
            ) : null}

            {selected.tipo === "pago" ? (
              <>
                <div className="mb-1 font-display text-[16px] font-bold">{selected.exp}</div>
                <div className="mb-0.5 text-[13px] text-muted-foreground">{selected.concepto}</div>
                <div className="mb-4 font-display text-[14px] font-semibold text-primary">
                  {selected.monto}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigate("bloqueos");
                    setSelected(null);
                  }}
                  className="inline-block rounded-lg border border-primary/25 bg-success/40 px-3.5 py-2 text-[12.5px] font-semibold text-primary"
                >
                  Ver en Reservas
                </button>
              </>
            ) : null}

            {selected.tipo === "bloqueo" ? (
              <>
                <div className="mb-1 font-display text-[16px] font-bold">{selected.hotel}</div>
                <div className="mb-4 text-[13px] text-muted-foreground">{selected.exp}</div>
                <button
                  type="button"
                  onClick={() => {
                    navigate("bloqueos");
                    setSelected(null);
                  }}
                  className="inline-block rounded-lg border border-primary/25 bg-success/40 px-3.5 py-2 text-[12.5px] font-semibold text-primary"
                >
                  Ver en Bloqueos y Reservas
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
