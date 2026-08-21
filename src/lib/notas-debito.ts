// Business logic ported from the original Claude Design prototype
// (Notas de débito screen: creating a new nota from bank transactions).

export type NotaItem = { concepto: string; monto: number };
export type NotaRaw = {
  num: string;
  fecha: string;
  favor: string;
  items: NotaItem[];
  estado: string;
};

export function notasDebitoSeed(): NotaRaw[] {
  const raw: [string, string, string, [string, number][], string][] = [
    ["8220", "02/01/2026", "Francisco Arguello", [["Traducciones feria UK 2026", 190]], "Pagada"],
    ["8222", "05/01/2026", "Celerity", [["Pago internet", 28.75]], "Pagada"],
    ["8224", "06/01/2026", "Sandry", [["Servicios turísticos · Sueldo Sandry", 374.95]], "Pagada"],
    [
      "8226",
      "06/01/2026",
      "Bco Guayaquil",
      [["Pago tarjeta de crédito Guayaquil", 2340.53]],
      "Emitida",
    ],
    ["8230", "06/01/2026", "José Ignacio", [["Anticipo GP688 - 759 - 745 - 748", 1680]], "Pagada"],
    ["8240", "08/01/2026", "Macaccess", [["Compra MacBook Air", 1149]], "Pagada"],
    ["8246", "12/01/2026", "Seaside", [["Pago GP762", 304.5]], "Emitida"],
    [
      "8254",
      "20/01/2026",
      "Bco Pichincha",
      [["Pago tarjeta de crédito Pichincha", 5042.02]],
      "Pendiente",
    ],
    ["8258", "13/01/2026", "Emetebe", [["Pago GP758", 851.99]], "Pagada"],
  ];
  return raw.map(([num, fecha, favor, items, estado]) => ({
    num,
    fecha,
    favor,
    items: items.map(([concepto, monto]) => ({ concepto, monto })),
    estado,
  }));
}

export type BankTransaction = { id: string; concepto: string; monto: number };

export function bankTransactionsList(): BankTransaction[] {
  return [
    { id: "bt1", concepto: "Pago hotel Termas de Papallacta", monto: 840 },
    { id: "bt2", concepto: "Combustible y logística Ocean Spray", monto: 1110 },
    { id: "bt3", concepto: "Comisión agencia Voyages du Monde", monto: 520 },
    { id: "bt4", concepto: "Pago guía Amazonía", monto: 300 },
    { id: "bt5", concepto: "Reembolso gastos de oficina", monto: 95.4 },
    { id: "bt6", concepto: "Pago seguro de viaje grupo Andersen", monto: 210 },
  ];
}

export function nextNotaNumber(all: NotaRaw[]): number {
  return Math.max(...all.map((n) => parseInt(n.num, 10))) + 1;
}

export function notaTotal(items: NotaItem[]): number {
  return items.reduce((s, it) => s + it.monto, 0);
}

export function buildNota(num: number, favor: string, items: NotaItem[]): NotaRaw {
  const today = new Date();
  const fecha =
    String(today.getDate()).padStart(2, "0") +
    "/" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "/" +
    today.getFullYear();
  return { num: String(num), fecha, favor: favor.trim(), items, estado: "Borrador" };
}
