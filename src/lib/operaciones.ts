// Business logic ported from the original Claude Design prototype
// (Operaciones screen: per-task detail panels, and a day-by-day trip
// timeline whose status is computed against today's real date).

import { tourCatalog } from "./itinerary-wizard";
import type { Estado } from "./backoffice-data";

export type TareaOperacion = { id: string; label: string; done: boolean; detalle: string | null };

export type DiaOperacionRaw = {
  titulo: string;
  items: string[];
  comidas: string;
  alojamiento: string;
};

export type OperacionRaw = {
  exp: string;
  programa: string;
  cliente: string;
  fechas: string;
  estado: Estado;
  tareas: TareaOperacion[];
  dias: DiaOperacionRaw[];
};

export function parseFechaRango(str: string, year = 2026): { start: Date; end: Date } {
  const meses: Record<string, number> = {
    ene: 0,
    feb: 1,
    mar: 2,
    abr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    ago: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dic: 11,
  };
  const parts = str.split("–").map((s) => s.trim());
  const side = (s: string) => {
    const m = s.match(/(\d+)\s*([a-zA-Zé]+)?/)!;
    return { day: parseInt(m[1]!, 10), mes: m[2] };
  };
  const a = side(parts[0]!);
  const b = side(parts[1]!);
  const mesB = meses[b.mes!.toLowerCase().slice(0, 3)]!;
  const mesA = a.mes ? meses[a.mes.toLowerCase().slice(0, 3)]! : mesB;
  return { start: new Date(year, mesA, a.day), end: new Date(year, mesB, b.day) };
}

export type DiaEstadoKind = "completado" | "en curso" | "pendiente";

function diaEstadoDe(fecha: Date, hoy: Date): DiaEstadoKind {
  const f = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  return f < h ? "completado" : f === h ? "en curso" : "pendiente";
}

const estadoLabels: Record<DiaEstadoKind, string> = {
  completado: "Completado",
  "en curso": "En curso",
  pendiente: "Pendiente",
};

export type ResolvedDiaOperacion = {
  num: number;
  titulo: string;
  resumen: string;
  fechaLabel: string;
  estado: DiaEstadoKind;
  estadoLabel: string;
  items: string[];
  comidas: string;
  alojamiento: string;
};

const fmtDiaFecha = (d: Date) => d.toLocaleDateString("es-EC", { day: "numeric", month: "short" });
const resumenDe = (items: string[]) => items.slice(0, 2).join(" · ");

export function buildOperacionDias(
  fechas: string,
  dias: DiaOperacionRaw[],
  hoy: Date = new Date(),
): ResolvedDiaOperacion[] {
  const { start } = parseFechaRango(fechas);
  return dias.map((d, i) => {
    const fecha = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const estado = diaEstadoDe(fecha, hoy);
    return {
      num: i + 1,
      titulo: d.titulo,
      resumen: resumenDe(d.items),
      fechaLabel: fmtDiaFecha(fecha),
      estado,
      estadoLabel: estadoLabels[estado],
      items: d.items,
      comidas: d.comidas,
      alojamiento: d.alojamiento,
    };
  });
}

function diasFromCatalog(nombre: string, tierIdx: number): DiaOperacionRaw[] {
  const detalle = tourCatalog().detalles[nombre]!;
  const hoteles = detalle.hoteles[tierIdx]!;
  return detalle.dias.map((d) => ({
    titulo: d.titulo,
    items: d.items,
    comidas: d.comidas ?? "—",
    alojamiento: d.alojamiento ? hoteles[d.alojamiento]! : "Sin alojamiento (traslado / vuelo)",
  }));
}

export function operacionesSeed(): OperacionRaw[] {
  return [
    {
      exp: "EXP-2701",
      programa: "Andes Highlights · 9D/8N",
      cliente: "Laura Fernández (grupo 2 pax)",
      fechas: "15 – 23 ago",
      estado: "Operando",
      tareas: [
        {
          id: "vuelos",
          label: "Vuelos internacionales",
          done: true,
          detalle:
            "Avianca AV072 UIO llegada 15 ago 14:20 · AV073 salida 23 ago 23:55. Reserva confirmada, código LMXQ2P.",
        },
        {
          id: "guia",
          label: "Guía bilingüe",
          done: true,
          detalle:
            "Andrés Salazar, español / inglés, guía naturalista y cultural certificado MINTUR. Contacto: +593 99 812 4471.",
        },
        {
          id: "hoteles",
          label: "Hoteles",
          done: true,
          detalle: "Bloqueo de hotel generado y confirmado con el proveedor.",
        },
        {
          id: "transporte",
          label: "Transporte privado",
          done: false,
          detalle:
            "Van privada 6 pax con chofer, Ecuavan Transportes. Pendiente confirmar chofer asignado para el tramo Cotopaxi – Quito.",
        },
      ],
      dias: diasFromCatalog("Andes Highlights", 2),
    },
    {
      exp: "EXP-2718",
      programa: "Ecuador y sus Sabores Auténticos · 7D/6N",
      cliente: "Familia Torres (4 pax)",
      fechas: "5 – 11 sep",
      estado: "Confirmado",
      tareas: [
        {
          id: "vuelos",
          label: "Vuelos internacionales",
          done: false,
          detalle: "Pendiente de confirmar boletos con la aerolínea.",
        },
        {
          id: "guia",
          label: "Guía asignado",
          done: false,
          detalle: "Pendiente de asignar guía para el grupo.",
        },
        {
          id: "hoteles",
          label: "Hoteles",
          done: false,
          detalle:
            "Pendiente de generar bloqueo con Hotel Cultura Manor para las noches en Quito (ver Bloqueos y Reservas).",
        },
        {
          id: "transporte",
          label: "Transporte privado",
          done: false,
          detalle: "Pendiente de confirmar transporte terrestre.",
        },
      ],
      dias: diasFromCatalog("Ecuador y sus Sabores Auténticos", 2),
    },
  ];
}
