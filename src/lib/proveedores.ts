// Business logic ported from the original Claude Design prototype
// (Proveedores screen: editable rate cards per provider, and adding a
// new provider either manually or via a mocked "upload & extract" flow).

export type PrecioItem = { k: string; v: string };
export type RoomRate = { tipo: string; precios: PrecioItem[]; extras: PrecioItem[] };

export type Proveedor = {
  id: string;
  nombre: string;
  tipo: "Hotel" | "Restaurante" | "Barco" | "Lodge";
  region: string;
  contacto: string;
  empresa?: string;
  rooms: RoomRate[];
  observaciones: string;
};

export function proveedoresSeed(): Proveedor[] {
  return [
    {
      id: "cultura-manor",
      nombre: "Cultura Manor",
      tipo: "Hotel",
      region: "Quito · Norte",
      contacto: "adm@culturamanor.com",
      rooms: [
        {
          tipo: "Suite histórica / Renaissance St",
          precios: [],
          extras: [
            { k: "Guía/chofer", v: "TL: $55" },
            { k: "Desayuno", v: "Incluido" },
          ],
        },
        { tipo: "Explorador 32m", precios: [], extras: [] },
      ],
      observaciones:
        "Tarifas netas + IVA, alimentación incluye impuestos. Day use: $80 suite / $50 explorador incluye imp. (hasta 9 horas). $60 explorador BB hablado con Cris 2026.",
    },
    {
      id: "swissotel",
      nombre: "Swissotel Quito",
      tipo: "Hotel",
      region: "Quito · Norte",
      contacto: "jalvarez@swissuio.com",
      rooms: [
        {
          tipo: "Swiss Business Advantage",
          precios: [
            { k: "Sencilla", v: "$120" },
            { k: "Doble", v: "$130" },
          ],
          extras: [
            { k: "Pax adicional", v: "$30 + desayuno" },
            { k: "Desayuno", v: "Incluido" },
          ],
        },
        {
          tipo: "Grand Room",
          precios: [
            { k: "Sencilla", v: "$175" },
            { k: "Doble", v: "$195" },
          ],
          extras: [{ k: "Desayuno", v: "Incluido" }],
        },
        {
          tipo: "Executive Room",
          precios: [
            { k: "Sencilla", v: "$205" },
            { k: "Doble", v: "$230" },
          ],
          extras: [{ k: "Desayuno", v: "Incluido" }],
        },
        {
          tipo: "Swiss Business Suite",
          precios: [
            { k: "Sencilla", v: "$235" },
            { k: "Doble", v: "$260" },
          ],
          extras: [{ k: "Desayuno", v: "Incluido" }],
        },
        {
          tipo: "Swiss Executive Suite",
          precios: [
            { k: "Sencilla", v: "$265" },
            { k: "Doble", v: "$290" },
          ],
          extras: [{ k: "Desayuno", v: "Incluido" }],
        },
      ],
      observaciones:
        "Tarifas netas +25% + $2,75 tasa municipal por hab. x noche. Early check in / late check out 50%. Desayuno buffet adulto $21,31+imp, niño $10,65+imp. Pax adicional no incluye desayuno.",
    },
    {
      id: "chimborazo-lodge",
      nombre: "Chimborazo Lodge",
      tipo: "Hotel",
      region: "Centro-Sur",
      contacto: "info@chimborazolodge.com",
      rooms: [
        {
          tipo: "Estándar (8 hab)",
          precios: [
            { k: "Sencilla", v: "$90" },
            { k: "Doble", v: "$136" },
          ],
          extras: [
            { k: "Guía/chofer", v: "50% dscto desde 5 pax" },
            { k: "Almuerzo", v: "$23" },
            { k: "Box lunch", v: "$14" },
          ],
        },
        {
          tipo: "Plus (4 hab)",
          precios: [
            { k: "Sencilla", v: "$100" },
            { k: "Doble", v: "$156" },
          ],
          extras: [],
        },
      ],
      observaciones: "MAP + IVA. Niños de 2 a 5 años pagan el 50 %.",
    },
    {
      id: "sachatamia",
      nombre: "Sachatamia",
      tipo: "Hotel",
      region: "Cloudforest",
      contacto: "info@sachatamia.com",
      rooms: [
        {
          tipo: "Cabañas del Bosque",
          precios: [
            { k: "Sencilla", v: "$129,59" },
            { k: "Doble", v: "$109,80" },
            { k: "Triple", v: "$101,82" },
          ],
          extras: [
            { k: "Guía/chofer", v: "Precio x persona $48" },
            { k: "Desayuno", v: "$8,80" },
            { k: "Almuerzo", v: "$21,20" },
            { k: "Cena", v: "$21,20" },
          ],
        },
        {
          tipo: "Suites del Bosque",
          precios: [
            { k: "Sencilla", v: "$183,20" },
            { k: "Doble", v: "$148,00" },
            { k: "Triple", v: "$136,27" },
          ],
          extras: [],
        },
        {
          tipo: "Standard",
          precios: [
            { k: "Sencilla", v: "$125,93" },
            { k: "Doble", v: "$107,64" },
            { k: "Triple", v: "$97,94" },
          ],
          extras: [],
        },
      ],
      observaciones:
        "Tarifas FAP netas x pax + 25% imp. G/CH 50 % de la rack. Alimentación: 1-4 sin descuento, 5-9 25 %, +10 50 % ($23,10). Paquete MAP restar $21,20.",
    },
    {
      id: "wyndham-sta-ana",
      nombre: "Hotel Wyndham Sta Ana",
      tipo: "Hotel",
      region: "Costa · Guayaquil",
      contacto: "reservas@wyndhamguayaquil.com",
      rooms: [
        {
          tipo: "Deluxe (vista a la ciudad)",
          precios: [
            { k: "Sencilla", v: "$105" },
            { k: "Doble", v: "$115" },
            { k: "Jr. Suite", v: "$190" },
            { k: "Presidencial", v: "$430" },
          ],
          extras: [
            { k: "Pax adicional", v: "$40" },
            { k: "Desayuno", v: "Incluido" },
          ],
        },
        {
          tipo: "Premium (vista al río)",
          precios: [
            { k: "Sencilla", v: "$115" },
            { k: "Doble", v: "$125" },
          ],
          extras: [],
        },
        {
          tipo: "Executive access",
          precios: [
            { k: "Sencilla", v: "$150" },
            { k: "Doble", v: "$160" },
          ],
          extras: [],
        },
      ],
      observaciones:
        "Tarifas netas +25% + $1,73 x pax x noche seguro + $2,50 tasa municipal x noche x habitación.",
    },
    {
      id: "hostal-macaw",
      nombre: "Hostal Macaw",
      tipo: "Hotel",
      region: "Costa · Guayaquil",
      contacto: "reservas@hostalmacaw.com",
      rooms: [
        {
          tipo: "Tarifa única",
          precios: [
            { k: "Sencilla", v: "$48,22" },
            { k: "Doble", v: "$60,27" },
            { k: "Triple", v: "$76,34" },
          ],
          extras: [{ k: "Almuerzo", v: "Incluido" }],
        },
      ],
      observaciones: "Tarifas netas + 15% IVA.",
    },
    {
      id: "miconia",
      nombre: "Miconia",
      tipo: "Hotel",
      region: "Galápagos · San Cristóbal",
      contacto: "reservas-miconia@tariqboutique.com",
      rooms: [
        {
          tipo: "Estándar",
          precios: [
            { k: "Sencilla", v: "$93" },
            { k: "Doble", v: "$163" },
            { k: "Triple", v: "$213" },
            { k: "Cuádruple", v: "$248" },
          ],
          extras: [
            { k: "Desayuno", v: "Incluido" },
            { k: "Almuerzo", v: "$25" },
            { k: "Box lunch", v: "$6,50" },
            { k: "Cena", v: "$25" },
          ],
        },
        {
          tipo: "Jr. Suite",
          precios: [
            { k: "Sencilla", v: "$206" },
            { k: "Suite", v: "$239" },
          ],
          extras: [{ k: "Pax adicional", v: "$53" }],
        },
        {
          tipo: "Grupos 9 pax+",
          precios: [
            { k: "Sencilla", v: "$80" },
            { k: "Doble", v: "$137" },
            { k: "Triple", v: "$170" },
            { k: "Cuádruple", v: "$199" },
          ],
          extras: [],
        },
      ],
      observaciones: "Tarifas netas + IVA. Niños menores de 4 años gratis.",
    },
    {
      id: "el-crater",
      nombre: "El Cráter",
      tipo: "Restaurante",
      region: "Quito",
      contacto: "—",
      rooms: [
        {
          tipo: "Menú tipo",
          precios: [],
          extras: [
            { k: "Almuerzo", v: "$30,50" },
            { k: "Guía/chofer", v: "$20 (+25%)" },
          ],
        },
      ],
      observaciones:
        "Tarifa + 25%. Descuento en guía y chofer a partir de 8 pax (confirmar en cada reserva).",
    },
    {
      id: "alya",
      nombre: "Alya",
      empresa: "Galagents",
      tipo: "Barco",
      region: "Galápagos",
      contacto: "ventas2@galagents.com",
      rooms: [
        {
          tipo: "Charter · 6 días",
          precios: [
            { k: "6D", v: "$6.200" },
            { k: "5D", v: "$5.000" },
          ],
          extras: [
            { k: "Niños", v: "10% (6-11 años)" },
            { k: "Single supplement", v: "0.5" },
            { k: "Comisión", v: "0.15" },
          ],
        },
      ],
      observaciones:
        "Tiquete aéreo no incluido, penalidad $60 x no emisión. Recargo 50 % Navidad y fin de año. Descuento 3 % grupos 7+ pax, 5 % por charter.",
    },
    {
      id: "napo-wildlife-center",
      nombre: "Napo Wildlife Center",
      tipo: "Lodge",
      region: "Rainforest · Amazonía",
      contacto: "sales@napowildlifecenter.com",
      rooms: [
        {
          tipo: "4D / 3N",
          precios: [
            { k: "Sencilla", v: "$2.588" },
            { k: "Doble", v: "$1.635" },
            { k: "Suite SGL/DBL", v: "$3.032 / $1.930" },
          ],
          extras: [
            { k: "Niños", v: "30% dscto 5-11 años" },
            { k: "TKT", v: "$256" },
            { k: "Comisión", v: "25%" },
          ],
        },
        {
          tipo: "5D / 4N",
          precios: [
            { k: "Sencilla", v: "$3.140" },
            { k: "Doble", v: "$2.000" },
            { k: "Suite SGL/DBL", v: "$3.720 / $2.390" },
          ],
          extras: [],
        },
      ],
      observaciones: "Para confirmar la reserva, abono de $200 x pax.",
    },
  ];
}

export const proveedorTipos: ("Todos" | Proveedor["tipo"])[] = [
  "Todos",
  "Hotel",
  "Restaurante",
  "Barco",
  "Lodge",
];

export function provColLabels(filtro: string): [string, string, string, string] {
  if (filtro === "Barco") return ["Barco", "Empresa", "Contacto", "Región"];
  if (filtro === "Lodge") return ["Lodge", "Programas", "Contacto", "Región"];
  if (filtro === "Hotel") return ["Hotel", "Tarifas", "Contacto", "Región"];
  if (filtro === "Restaurante") return ["Restaurante", "Servicio", "Contacto", "Ciudad"];
  return ["Proveedor", "Tipo", "Contacto", "Región"];
}

export function col2For(p: Proveedor, filtro: string): string {
  if (filtro === "Barco") return p.empresa || "—";
  if (filtro === "Todos") return p.tipo;
  const n = p.rooms.length;
  if (filtro === "Lodge") return `${n} programas`;
  if (filtro === "Restaurante") return `${n} ${n === 1 ? "servicio" : "servicios"}`;
  return `${n} ${n === 1 ? "tarifa" : "tarifas"}`;
}

export function freshProviderDraft(): Omit<Proveedor, "id"> {
  return {
    nombre: "",
    tipo: "Hotel",
    region: "",
    contacto: "",
    empresa: "",
    observaciones: "",
    rooms: [{ tipo: "", precios: [{ k: "Sencilla", v: "" }], extras: [] }],
  };
}
