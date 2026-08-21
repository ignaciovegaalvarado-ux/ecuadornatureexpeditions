// Business logic ported from the original Claude Design prototype
// (Calendario screen: month navigation and events computed from real
// operaciones, bloqueos, and pending pagos-a-proveedor data).

import { parseFechaRango } from "./operaciones";
import type { Bloqueo } from "./bloqueos";
import type { OperacionRaw } from "./operaciones";
import type { PagoRaw } from "./pagos";

export type CalendarEventTipo = "inicio" | "pago" | "bloqueo";

export type CalendarEvent = {
  tipo: CalendarEventTipo;
  exp: string;
  label: string;
  fecha: Date;
  cliente?: string;
  concepto?: string;
  monto?: string;
  hotel?: string;
};

export type CalendarCell = {
  blank: boolean;
  day: number | "";
  isToday: boolean;
  events: CalendarEvent[];
};

export function buildCalendarMonth(
  monthOffset: number,
  operaciones: OperacionRaw[],
  bloqueos: Bloqueo[],
  pagos: Record<string, PagoRaw[]>,
  hoy: Date = new Date(),
): { monthLabel: string; cells: CalendarCell[] } {
  const viewDate = new Date(hoy.getFullYear(), hoy.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  let monthLabel = viewDate.toLocaleDateString("es-EC", { month: "long", year: "numeric" });
  monthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const events: Record<string, CalendarEvent[]> = {};
  const addEvent = (d: Date | null, ev: CalendarEvent) => {
    if (!d || Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    (events[key] ??= []).push(ev);
  };

  operaciones.forEach((o) => {
    try {
      const { start } = parseFechaRango(o.fechas);
      addEvent(start, {
        tipo: "inicio",
        exp: o.exp,
        label: o.exp,
        cliente: o.cliente,
        fecha: start,
      });
    } catch {
      // fecha range not parseable, skip
    }
  });

  Object.entries(pagos).forEach(([exp, items]) => {
    items.forEach((p) => {
      if (p.estado === "Pendiente" && p.fechaLimite) {
        const d = new Date(p.fechaLimite + "T00:00:00");
        addEvent(d, {
          tipo: "pago",
          exp,
          label: exp,
          concepto: p.concepto,
          monto: "$" + p.monto.toLocaleString(),
          fecha: d,
        });
      }
    });
  });

  bloqueos.forEach((b) => {
    if (b.fechaLimite) {
      const d = new Date(b.fechaLimite + "T00:00:00");
      addEvent(d, { tipo: "bloqueo", exp: b.exp, label: b.hotel, hotel: b.hotel, fecha: d });
    }
  });

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = hoy.toDateString();
  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstWeekday; i++)
    cells.push({ blank: true, day: "", isToday: false, events: [] });
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${month}-${day}`;
    const isToday = new Date(year, month, day).toDateString() === todayStr;
    cells.push({ blank: false, day, isToday, events: events[key] ?? [] });
  }
  while (cells.length % 7 !== 0) cells.push({ blank: true, day: "", isToday: false, events: [] });

  return { monthLabel, cells };
}
