// Business logic ported from the original Claude Design prototype
// (Bloqueos y Reservas screen: bloqueo lifecycle, estado computation, and
// real Word/PDF document generation).

import { proximasSalidas } from "./backoffice-data";

export type Habitacion = { tipo: string; cantidad: number };
export type Tarifa = { concepto: string; tarifa: string };
export type DocumentoGenerado = { tipo: "docx" | "pdf"; filename: string; fecha: string };

export type Bloqueo = {
  id: string;
  exp: string;
  cliente: string;
  hotel: string;
  hotelEmail: string;
  contacto: string;
  pasajerosTxt: string;
  fechaIn: string;
  fechaOut: string;
  noches: number;
  habitaciones: Habitacion[];
  tarifas: Tarifa[];
  notaTarifa: string;
  creado: string;
  fechaLimite: string | null;
  estadoManual: string | null;
  documentos: DocumentoGenerado[];
};

export type PendienteBloqueo = {
  exp: string;
  hotel: string;
  hotelEmail: string;
  contacto: string;
  fechaIn: string;
  fechaOut: string;
  habitaciones: Habitacion[];
  pasajerosTxt: string;
};

export function bloqueosSeed(): Bloqueo[] {
  return [
    {
      id: "blq-1",
      exp: "EXP-2712",
      cliente: "Grupo Cris (12 pax + TL + guía)",
      hotel: "Cormorant Beach House",
      hotelEmail: "reservas@cormorantbeachhouse.com",
      contacto: "Nathaly",
      pasajerosTxt: "Cris x 12 + TL + guía",
      fechaIn: "2027-05-13",
      fechaOut: "2027-05-16",
      noches: 3,
      habitaciones: [
        { tipo: "Doble ocean superior", cantidad: 5 },
        { tipo: "Sencilla estándar", cantidad: 2 },
        { tipo: "Sencilla de guía (TL + guía)", cantidad: 2 },
      ],
      tarifas: [
        { concepto: "Habitación SGL/DBL ocean superior", tarifa: "US$205,28" },
        { concepto: "Habitación SGL/DBL ocean estándar", tarifa: "US$172,28" },
        { concepto: "Habitación sencilla guía", tarifa: "US$60" },
      ],
      notaTarifa: "Tarifas netas, IVA 0% extranjeros, incluye desayuno",
      creado: "03 ago 2026",
      fechaLimite: null,
      estadoManual: null,
      documentos: [],
    },
    {
      id: "blq-2",
      exp: "EXP-2701",
      cliente: "Laura Fernández (grupo 2 pax)",
      hotel: "Hotel Cultura Manor",
      hotelEmail: "adm@culturamanor.com",
      contacto: "Reservaciones",
      pasajerosTxt: "Laura Fernández x 2 + guía",
      fechaIn: "2026-08-15",
      fechaOut: "2026-08-16",
      noches: 1,
      habitaciones: [
        { tipo: "Suite histórica", cantidad: 1 },
        { tipo: "Sencilla guía", cantidad: 1 },
      ],
      tarifas: [
        { concepto: "Suite histórica / Renaissance St", tarifa: "US$150" },
        { concepto: "Habitación sencilla guía", tarifa: "US$55" },
      ],
      notaTarifa: "Tarifas netas + IVA, incluye desayuno",
      creado: "10 ago 2026",
      fechaLimite: "2026-08-20",
      estadoManual: null,
      documentos: [],
    },
  ];
}

export function expedientesBloqueoPendienteSeed(): PendienteBloqueo[] {
  return [
    {
      exp: "EXP-2718",
      hotel: "Hotel Cultura Manor",
      hotelEmail: "reservas@culturamanor.com",
      contacto: "Reservaciones",
      fechaIn: "2026-09-05",
      fechaOut: "2026-09-07",
      habitaciones: [{ tipo: "Suite doble", cantidad: 2 }],
      pasajerosTxt: "Familia Torres x4",
    },
  ];
}

export function bloqueoEstado(b: Bloqueo): string {
  if (b.estadoManual) return b.estadoManual;
  if (!b.fechaLimite) return "Pendiente de fecha límite";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const lim = new Date(b.fechaLimite + "T00:00:00");
  const dias = Math.ceil((lim.getTime() - hoy.getTime()) / 86400000);
  if (dias < 0) return "Vencido";
  if (dias <= 5) return "Próximo a vencer";
  return "Activo";
}

export function fmtFechaCorta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00")
    .toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })
    .replace(/\.\s*/, " ");
}

export function nochesEntre(fechaIn: string, fechaOut: string): number {
  return Math.round((new Date(fechaOut).getTime() - new Date(fechaIn).getTime()) / 86400000);
}

export function habitacionesResumen(habitaciones: Habitacion[]): string {
  return habitaciones.map((h) => `${h.cantidad}× ${h.tipo}`).join(", ");
}

export function cantidadTotal(habitaciones: Habitacion[]): number {
  return habitaciones.reduce((s, h) => s + h.cantidad, 0);
}

export type ExpedienteOption = { value: string; label: string };

export function expedienteOptions(): ExpedienteOption[] {
  return proximasSalidas.map((r) => ({ value: r.exp, label: `${r.exp} — ${r.cliente}` }));
}

export function freshBloqueoDraft(prefill?: Partial<PendienteBloqueo>) {
  const opts = expedienteOptions();
  return {
    exp: prefill?.exp || opts[0]?.value || "",
    hotel: prefill?.hotel || "",
    hotelEmail: prefill?.hotelEmail || "",
    contacto: prefill?.contacto || "Reservaciones",
    pasajerosTxt: prefill?.pasajerosTxt || "",
    fechaIn: prefill?.fechaIn || "",
    fechaOut: prefill?.fechaOut || "",
    habitaciones: prefill?.habitaciones
      ? prefill.habitaciones.map((h) => ({ ...h }))
      : [{ tipo: "", cantidad: 1 }],
    tarifas: [{ concepto: "", tarifa: "" }] as Tarifa[],
    noches: "",
    notaTarifa: "Tarifas netas, IVA 0% extranjeros, incluye desayuno",
  };
}

export type BloqueoDraft = ReturnType<typeof freshBloqueoDraft>;

export function buildBloqueoFromDraft(d: BloqueoDraft): Bloqueo {
  const cliente = expedienteOptions().find((o) => o.value === d.exp)?.label ?? d.exp;
  return {
    id: "blq-" + Date.now(),
    exp: d.exp,
    cliente,
    hotel: d.hotel,
    hotelEmail: d.hotelEmail,
    contacto: d.contacto,
    pasajerosTxt: d.pasajerosTxt,
    fechaIn: d.fechaIn,
    fechaOut: d.fechaOut,
    habitaciones: d.habitaciones.filter((h) => h.tipo),
    tarifas: d.tarifas.filter((t) => t.concepto),
    noches: d.noches ? Number(d.noches) : nochesEntre(d.fechaIn, d.fechaOut),
    notaTarifa: d.notaTarifa,
    creado: new Date().toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    fechaLimite: null,
    estadoManual: null,
    documentos: [],
  };
}
