// Business logic ported from the original Claude Design prototype
// (Reservas screen: per-expediente rentabilidad breakdown, real XLSX
// export, and the "Registrar pago" income summary modal).

import * as XLSX from "xlsx";
import { pagosPorExp, rentaByExp, type PagoRaw } from "./pagos";

export type CobroItem = {
  concepto: string;
  monto: number;
  estado: "Pagado" | "Pendiente";
  fecha: string;
  movimiento: string;
  invoice: string;
};

export type RentabilidadDetalle = {
  ingreso: number;
  costo: number;
  margen: number;
  margenPct: number;
  ventas: CobroItem[];
  costos: PagoRaw[];
  porPagarTotal: number;
};

function parseSaldoCliente(saldoCliente: string): number {
  if (saldoCliente === "Pagado") return 0;
  return Number(saldoCliente.replace(/[^0-9.]/g, "")) || 0;
}

export function buildRentabilidadDetalle(exp: string, saldoCliente: string): RentabilidadDetalle {
  const fin = rentaByExp()[exp] ?? { exp, programa: "", ingreso: 0, costo: 0, pct: 0 };
  const saldoAmt = parseSaldoCliente(saldoCliente);
  const cobroItems: CobroItem[] =
    saldoAmt > 0
      ? [
          {
            concepto: "Anticipo",
            monto: Math.max(fin.ingreso - saldoAmt, 0),
            estado: "Pagado",
            fecha: "15/06/2026",
            movimiento: "TRF-" + exp.slice(4),
            invoice: "INV-" + exp.slice(4),
          },
          {
            concepto: "Saldo final",
            monto: saldoAmt,
            estado: "Pendiente",
            fecha: "—",
            movimiento: "—",
            invoice: "INV-" + exp.slice(4),
          },
        ]
      : [
          {
            concepto: "Pago completo",
            monto: fin.ingreso,
            estado: "Pagado",
            fecha: "15/06/2026",
            movimiento: "TRF-" + exp.slice(4),
            invoice: "INV-" + exp.slice(4),
          },
        ];
  const costos = pagosPorExp()[exp] ?? [];
  const porPagarTotal = costos
    .filter((p) => p.estado === "Pendiente")
    .reduce((s, p) => s + p.monto, 0);

  return {
    ingreso: fin.ingreso,
    costo: fin.costo,
    margen: fin.ingreso - fin.costo,
    margenPct: fin.pct,
    ventas: cobroItems,
    costos,
    porPagarTotal,
  };
}

export function downloadRentabilidadXlsx(
  filename: string,
  exp: string,
  cliente: string,
  fechas: string,
  detalle: RentabilidadDetalle,
) {
  const aoa: (string | number)[][] = [
    ["ACCOUNTING INFO"],
    [exp + " / " + cliente],
    ["DATE: " + fechas],
    [],
    ["INCOME"],
    ["PAX", "SERVICES", "INVOICE", "AMOUNT", "DATE", "DEPOSIT", "AMOUNT", "DATE"],
    ...detalle.ventas.map((c, i) => [
      i === 0 ? (cliente.match(/\d+/)?.[0] ?? "") : "",
      c.concepto,
      c.invoice,
      c.monto,
      c.fecha,
      c.movimiento,
      c.estado === "Pagado" ? c.monto : "",
      c.estado === "Pagado" ? c.fecha : "",
    ]),
    [],
    ["", "TOTAL AMOUNT", "", detalle.ingreso],
    [],
    ["EXPENDITURE"],
    ["SERVICES", "ESTIMATE", "INVOICE", "AMOUNT", "DATE", "PAYMENT", "AMOUNT", "DATE"],
    ...detalle.costos.map((p) => [
      p.concepto,
      "",
      p.invoice,
      p.monto,
      p.fechaPago,
      p.estado === "Pagado" ? "PAID" : "PENDING",
      p.estado === "Pagado" ? p.monto : "",
      p.estado === "Pagado" ? p.fechaPago : "",
    ]),
    [],
    ["TOTAL AMOUNT", "", "", detalle.costo],
    ["BALANCE", "", "", detalle.ingreso - detalle.costo],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 10 },
    { wch: 26 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
  XLSX.writeFile(wb, filename);
}
