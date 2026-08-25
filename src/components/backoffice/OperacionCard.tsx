import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Card, CloseButton, estadoTone } from "./ui";
import { buildOperacionDias, type OperacionRaw } from "@/lib/operaciones";
import { cn } from "@/lib/utils";

const diaEstadoDotClass = {
  completado: "bg-success",
  "en curso": "bg-primary ring-4 ring-primary/20",
  pendiente: "border-2 border-border bg-card",
} as const;

const diaEstadoLineClass = {
  completado: "bg-success",
  "en curso": "bg-border",
  pendiente: "bg-border",
} as const;

const diaEstadoTitleClass = {
  completado: "text-muted-foreground",
  "en curso": "text-foreground",
  pendiente: "text-muted-foreground",
} as const;

const diaEstadoBadgeTone = {
  completado: "success",
  "en curso": "info",
  pendiente: "muted",
} as const;

export function OperacionCard({ o }: { o: OperacionRaw }) {
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [openDiaNum, setOpenDiaNum] = useState<number | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const dias = useMemo(() => buildOperacionDias(o.fechas, o.dias), [o.fechas, o.dias]);

  const tareaDetalle = openTask ? o.tareas.find((t) => t.id === openTask) : null;
  const diaDetalle = openDiaNum ? dias.find((d) => d.num === openDiaNum) : null;

  return (
    <Card className="p-6">
      <div className="mb-3.5 flex flex-wrap items-center gap-3.5">
        <h3 className="font-display text-[14.5px] font-semibold text-primary">{o.exp}</h3>
        <p className="text-[13px] text-muted-foreground">
          {o.programa} · {o.cliente} · {o.fechas}
        </p>
        <div className="flex-1" />
        <Badge tone={estadoTone(o.estado)}>{o.estado}</Badge>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {o.tareas.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setOpenTask(t.id)}
            className="flex items-center rounded-lg border border-primary/25 bg-success/40 px-3.5 py-2 text-[12.5px] font-semibold text-primary"
          >
            <span
              className={cn(
                "mr-1.5 h-[7px] w-[7px] rounded-full",
                t.done ? "bg-success" : "bg-warning-foreground",
              )}
            />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4.5 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setTimelineOpen((v) => !v)}
          aria-expanded={timelineOpen}
          className="flex cursor-pointer items-center gap-1.5 text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <span className="text-[12px] font-semibold">Línea de tiempo del viaje</span>
          <ChevronDown
            aria-hidden
            strokeWidth={2}
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              timelineOpen && "rotate-180",
            )}
          />
        </button>

        {timelineOpen ? (
          <div className="mt-3.5 flex flex-col">
            {dias.map((d) => (
              <div key={d.num} className="flex gap-3">
                <div className="flex w-3.5 flex-none flex-col items-center">
                  <span
                    className={cn("h-3 w-3 flex-none rounded-full", diaEstadoDotClass[d.estado])}
                  />
                  {d.num < dias.length ? (
                    <span className={cn("min-h-4 w-0.5 flex-1", diaEstadoLineClass[d.estado])} />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 pb-4">
                  <div className="mb-0.5 flex flex-wrap items-baseline gap-2">
                    <span className="font-display text-[12px] font-semibold text-muted-foreground">
                      Día {d.num} · {d.fechaLabel}
                    </span>
                    <Badge tone={diaEstadoBadgeTone[d.estado]}>{d.estadoLabel}</Badge>
                  </div>
                  <div className={cn("text-[12.5px] font-bold", diaEstadoTitleClass[d.estado])}>
                    {d.titulo}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenDiaNum(d.num)}
                    className="mt-1.5 inline-block rounded-lg border border-primary/25 bg-success/40 px-2.5 py-1.5 text-[11.5px] font-semibold text-primary"
                  >
                    Ver detalle
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {tareaDetalle ? (
        <div className="scrim" onClick={() => setOpenTask(null)}>
          <div
            className="w-full max-w-[560px] modal-panel p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3.5 flex items-start justify-between gap-4">
              <div className="font-display text-[17px] font-bold">{tareaDetalle.label}</div>
              <CloseButton onClick={() => setOpenTask(null)} className="flex-none" />
            </div>
            <p className="text-[13.5px] leading-relaxed text-foreground">
              {tareaDetalle.detalle ?? "Sin información adicional registrada."}
            </p>
          </div>
        </div>
      ) : null}

      {diaDetalle ? (
        <div className="scrim" onClick={() => setOpenDiaNum(null)}>
          <div
            className="w-full max-w-[560px] modal-panel p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="font-display text-[13px] font-semibold text-muted-foreground">
                  Día {diaDetalle.num} · {diaDetalle.fechaLabel}
                </span>
                <Badge tone={diaEstadoBadgeTone[diaDetalle.estado]}>{diaDetalle.estadoLabel}</Badge>
              </div>
              <CloseButton onClick={() => setOpenDiaNum(null)} className="flex-none" />
            </div>
            <div className="mb-3.5 font-display text-[17px] font-bold text-primary">
              {diaDetalle.titulo}
            </div>
            <div className="mb-2.5 text-[12px] font-semibold text-muted-foreground">
              Actividades y servicios
            </div>
            <div className="flex flex-col gap-1.5">
              {diaDetalle.items.map((it) => (
                <div key={it} className="text-[13.5px] leading-relaxed">
                  • {it}
                </div>
              ))}
            </div>
            <div className="mt-3.5 flex flex-wrap gap-6 border-t border-border pt-3.5">
              <div>
                <div className="mb-0.5 text-[11px] text-muted-foreground">Comidas</div>
                <div className="text-[13px] font-semibold">{diaDetalle.comidas}</div>
              </div>
              <div>
                <div className="mb-0.5 text-[11px] text-muted-foreground">Alojamiento</div>
                <div className="text-[13px] font-semibold">{diaDetalle.alojamiento}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
