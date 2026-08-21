// Business logic ported from the original Claude Design prototype
// (financial data shared by Reservas' rentabilidad breakdown and by
// Calendario's "pago a proveedor" events).

export type PagoRaw = {
  concepto: string;
  monto: number;
  estado: "Pagado" | "Pendiente";
  fechaPago: string;
  movimiento: string;
  invoice: string;
  fechaLimite?: string;
};

export function pagosPorExp(): Record<string, PagoRaw[]> {
  const raw: Record<string, [string, number, string, string, string, string, string?][]> = {
    "EXP-2607": [
      ["Crucero Metropolitan Touring", 9500, "Pagado", "02/08/2026", "ND-7502", "INV-1848"],
      ["Transporte aeropuerto", 700, "Pagado", "03/08/2026", "ND-7503", "INV-1852"],
      ["Seguro de viaje", 1000, "Pendiente", "—", "ND-7504", "—"],
    ],
    "EXP-2612": [
      ["Lodge Napo Wildlife Center", 9800, "Pendiente", "—", "ND-7512", "INV-2214", "2026-08-18"],
      ["Vuelo interno a Coca", 1680, "Pagado", "14/08/2026", "ND-7513", "INV-2215"],
      ["Guía local", 1000, "Pagado", "15/08/2026", "ND-7514", "—"],
    ],
    "EXP-2598": [
      ["Transporte privado", 640, "Pagado", "27/07/2026", "ND-7481", "INV-0933"],
      ["Guía de montaña", 250, "Pagado", "27/07/2026", "ND-7482", "—"],
    ],
    "EXP-2584": [
      ["Charter Crucero Elite", 38000, "Pagado", "10/08/2026", "ND-7520", "INV-3390"],
      ["Vuelos Baltra", 7200, "Pendiente", "—", "ND-7521", "INV-3391", "2026-08-21"],
      ["Seguros de viaje", 2000, "Pagado", "10/08/2026", "ND-7522", "—"],
    ],
    "EXP-2571": [
      ["Transporte terrestre", 1200, "Pagado", "18/08/2026", "ND-7530", "INV-1077"],
      ["Termas de Papallacta", 840, "Pendiente", "—", "ND-7531", "—", "2026-08-24"],
      ["Guía", 600, "Pagado", "18/08/2026", "ND-7532", "—"],
    ],
    "EXP-2619": [
      ["Transporte Puerto López", 900, "Pendiente", "—", "ND-7540", "INV-0654", "2026-08-27"],
      ["Guía local", 480, "Pendiente", "—", "ND-7541", "—", "2026-08-27"],
      ["Entrada Isla de la Plata", 600, "Pagado", "20/08/2026", "ND-7542", "—"],
    ],
    "EXP-2631": [
      ["Charter Ocean Spray", 4200, "Pagado", "01/09/2026", "ND-7550", "INV-2871"],
      ["Combustible y logística", 1110, "Pagado", "01/09/2026", "ND-7551", "—"],
    ],
    "EXP-2640": [
      ["Lodge Sacha", 6200, "Pendiente", "—", "ND-7560", "INV-1965", "2026-08-30"],
      ["Vuelo interno a Coca", 1200, "Pagado", "03/09/2026", "ND-7561", "—"],
    ],
  };
  const out: Record<string, PagoRaw[]> = {};
  for (const [exp, items] of Object.entries(raw)) {
    out[exp] = items.map(
      ([concepto, monto, estado, fechaPago, movimiento, invoice, fechaLimite]) => ({
        concepto,
        monto,
        estado: estado as "Pagado" | "Pendiente",
        fechaPago,
        movimiento,
        invoice,
        ...(fechaLimite !== undefined ? { fechaLimite } : {}),
      }),
    );
  }
  return out;
}

export type RentaRaw = {
  exp: string;
  programa: string;
  ingreso: number;
  costo: number;
  pct: number;
};

export function rentabilidadRaw(): RentaRaw[] {
  const raw: [string, string, number, number, number][] = [
    ["EXP-2607", "Galápagos Islander II", 17340, 11200, 35.4],
    ["EXP-2612", "Amazonía Napo Wildlife", 16560, 12480, 24.6],
    ["EXP-2598", "Andes & Quilotoa privado", 1480, 890, 39.9],
    ["EXP-2584", "Galápagos Crucero Elite", 74400, 47200, 36.6],
    ["EXP-2571", "Cotopaxi + Papallacta", 3780, 2640, 30.2],
    ["EXP-2619", "Costa & Isla de la Plata", 2440, 1980, 18.9],
    ["EXP-2631", "Galápagos Ocean Spray", 8670, 5310, 38.7],
    ["EXP-2640", "Amazonía Sacha Lodge", 10480, 7800, 25.6],
  ];
  return raw.map(([exp, programa, ingreso, costo, pct]) => ({
    exp,
    programa,
    ingreso,
    costo,
    pct,
  }));
}

export function rentaByExp(): Record<string, RentaRaw> {
  const out: Record<string, RentaRaw> = {};
  rentabilidadRaw().forEach((r) => {
    out[r.exp] = r;
  });
  return out;
}
