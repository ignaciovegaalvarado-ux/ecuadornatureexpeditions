// Business logic ported from the original Claude Design prototype
// (wizard "+ Nuevo itinerario" in the Itinerarios screen).

export type PaxDraft = {
  nombre: string;
  pasaporte: string;
  nacionalidad: string;
  dieta: string;
};

export type ActivityDraft = {
  texto: string;
  price: number;
  paxOverride: number | null;
};

export type DayDraft = {
  num: number;
  titulo: string;
  hotel: string;
  hotelPrice: number;
  hotelPaxOverride: number | null;
  actividades: ActivityDraft[];
};

export type GeneralItem = {
  id: string;
  label: string;
  price: number;
  included: boolean;
};

export type ChatMessage = { from: "bot" | "user"; text: string };

export type HotelMode = "todos" | "algunos" | "ninguno";

export type WizardState = {
  step: 1 | 2 | 3;
  sent: boolean;
  pax: PaxDraft[];
  files: { nombre: string; estado: string }[];
  programName: string | null;
  programHotelIdx: number;
  priceOverride: number | null;
  fechaInicio: string;
  baseService: number;
  generalItems: GeneralItem[];
  hotelMode: HotelMode;
  hotelDaysSelected: number[];
  days: DayDraft[];
  chat: ChatMessage[];
  chatInput: string;
};

export function freshWizard(): WizardState {
  return {
    step: 1,
    sent: false,
    pax: [{ nombre: "", pasaporte: "", nacionalidad: "", dieta: "" }],
    files: [
      { nombre: "Pasaporte_cliente_1.pdf", estado: "Leído por IA" },
      { nombre: "Reserva_hotel_anterior.docx", estado: "Leído por IA" },
    ],
    programName: null,
    programHotelIdx: 0,
    priceOverride: null,
    fechaInicio: "",
    baseService: 340,
    generalItems: [
      { id: "vuelos", label: "Vuelos internos Quito–Coca", price: 140, included: true },
      { id: "seguro", label: "Seguro de viaje", price: 30, included: true },
    ],
    hotelMode: "todos",
    hotelDaysSelected: [1, 2, 3, 4, 5],
    days: [
      {
        num: 1,
        titulo: "Llegada a Quito",
        hotel: "Hotel Cultura Manor · 4****",
        hotelPrice: 65,
        hotelPaxOverride: null,
        actividades: [
          { texto: "Recepción en el aeropuerto y traslado al hotel", price: 0, paxOverride: null },
          { texto: "Cena de bienvenida", price: 25, paxOverride: null },
        ],
      },
      {
        num: 2,
        titulo: "Quito colonial + experiencia de chocolate",
        hotel: "Hotel Cultura Manor · 4****",
        hotelPrice: 65,
        hotelPaxOverride: null,
        actividades: [
          { texto: "City tour por el centro histórico de Quito", price: 20, paxOverride: null },
          { texto: "Almuerzo en restaurante local", price: 15, paxOverride: null },
          { texto: "Taller de chocolate en Chez Tiff", price: 35, paxOverride: null },
        ],
      },
      {
        num: 3,
        titulo: "Mercado local y clase de cocina",
        hotel: "Hotel Cultura Manor · 4****",
        hotelPrice: 65,
        hotelPaxOverride: null,
        actividades: [
          { texto: "Tour de mercado con chef", price: 18, paxOverride: null },
          { texto: "Clase de cocina ecuatoriana con chocolate", price: 40, paxOverride: null },
          { texto: "Chocolate experience en Pacari", price: 30, paxOverride: null },
        ],
      },
      {
        num: 4,
        titulo: "Santa Rita: finca de cacao",
        hotel: "San Isidro Lodge · Standard 3***",
        hotelPrice: 80,
        hotelPaxOverride: null,
        actividades: [
          {
            texto: "Ruta del cacao y taller en Santa Rita, Archidona",
            price: 50,
            paxOverride: null,
          },
          { texto: "Traslado a San Isidro Lodge", price: 0, paxOverride: null },
        ],
      },
      {
        num: 5,
        titulo: "Termas de Papallacta",
        hotel: "Termas de Papallacta · 4****",
        hotelPrice: 95,
        hotelPaxOverride: null,
        actividades: [
          { texto: "Caminata por senderos de San Isidro", price: 0, paxOverride: null },
          { texto: "Spa termal con tratamiento de chocolate", price: 60, paxOverride: null },
        ],
      },
    ],
    chat: [
      {
        from: "bot",
        text: 'Hola, soy tu asistente de itinerarios. Puedes pedirme cosas como "quita el hotel" o "el cliente ya tiene vuelos".',
      },
    ],
    chatInput: "",
  };
}

// ---- Catalog (packaged programs, e.g. Andes Highlights) ----

export type CatalogHotelRow = { tier: string } & Record<string, string>;
export type CatalogDay = {
  n: number;
  titulo: string;
  alojamiento: string | null;
  items: string[];
  comidas?: string;
};
export type CatalogDetalle = {
  priceTables: Record<string, Record<string, number[]>>;
  hoteles: CatalogHotelRow[];
  dias: CatalogDay[];
};
export type CatalogListItem = [
  nombre: string,
  region: string,
  duracion: string,
  embarcacion: string,
  desde: string,
];

export function tourCatalog(): {
  paxLabels: string[];
  detalles: Record<string, CatalogDetalle>;
  list: CatalogListItem[];
} {
  const paxLabels = ["1 pax", "2-3 pax", "4-5 pax", "6-9 pax", "10-11 pax", "12-15 pax", "16+ pax"];
  const detalles: Record<string, CatalogDetalle> = {
    "Andes Highlights": {
      priceTables: {
        "25": {
          "3★ Estándar": [4135, 2383, 1919, 1610, 1376, 1325, 1240],
          "3.5★ Superior": [4369, 2597, 2117, 1814, 1567, 1514, 1427],
          "4★ Deluxe": [5390, 3040, 2487, 2176, 1934, 1879, 1790],
        },
        "30": {
          "3★ Estándar": [4300, 2478, 1995, 1675, 1430, 1378, 1289],
          "3.5★ Superior": [4544, 2700, 2200, 1886, 1630, 1575, 1484],
          "4★ Deluxe": [5606, 3161, 2586, 2263, 2012, 1955, 1862],
        },
      },
      hoteles: [
        {
          tier: "3★ Estándar",
          quito: "Hotel Vieja Cuba",
          mindo: "La Roulotte",
          cotopaxi: "Volcano Land / Hotel Cuello de Luna",
        },
        {
          tier: "3.5★ Superior",
          quito: "Ikala Quito Hotel Boutique",
          mindo: "Séptimo Paraíso",
          cotopaxi: "Hacienda El Porvenir (Jr. Suite) / La Cienega",
        },
        {
          tier: "4★ Deluxe",
          quito: "Hotel Cultura Manor",
          mindo: "Sachatamia Lodge & Reserve",
          cotopaxi: "Hacienda El Porvenir (Master Suite) / Hacienda San Agustín de Callo",
        },
      ],
      dias: [
        {
          n: 1,
          titulo: "Llegada a Quito",
          alojamiento: "quito",
          items: ["Recepción en el aeropuerto y traslado al hotel"],
        },
        {
          n: 2,
          titulo: "Quito y sus tesoros ocultos",
          alojamiento: "quito",
          items: [
            'Barrio San Roque: dulces "colaciones" y garrapiñada',
            "Casco colonial: Plaza Grande, Palacio de Gobierno, Catedral, La Compañía de Jesús",
            "Palacio Arzobispal: dulces tradicionales",
            "Fábrica de chocolate Chez Tiff",
            "Galería de arte",
          ],
          comidas: "B, L",
        },
        {
          n: 3,
          titulo: "Productos auténticos de la Mitad del Mundo",
          alojamiento: "mindo",
          items: [
            "Museo del Agave en Pomasquí y degustación de productos orgánicos",
            "Mitad del Mundo (línea ecuatorial)",
            "Jardín de hongos cerca de Calacalí",
            "Salida hacia Mindo, bosque nublado",
          ],
          comidas: "B, L, D",
        },
        {
          n: 4,
          titulo: "El asombroso gallo de la peña",
          alojamiento: "quito",
          items: [
            "Refugio Paz de las Aves: lek del gallo de la peña y antpittas",
            "Estación de alimentación de tangaras y tucanes",
            "Granja de mariposas",
            "Fábrica de chocolate El Quetzal de Mindo",
            "Regreso a Quito",
          ],
          comidas: "B, L",
        },
        {
          n: 5,
          titulo: "Quito – Reserva Antisana – Cotopaxi",
          alojamiento: "cotopaxi",
          items: [
            "Reserva Ecológica Antisana: Laguna La Mica y volcán Antisana",
            "Avistamiento de cóndor andino (y posible oso de anteojos)",
            "Traslado a hacienda en Cotopaxi",
          ],
          comidas: "B, L, D",
        },
        {
          n: 6,
          titulo: "Cotopaxi: siguiendo el páramo",
          alojamiento: "cotopaxi",
          items: [
            'Cabalgata en la hacienda con tradición "chagra"',
            "Parque Nacional Cotopaxi, posible caminata al refugio (4.800 m)",
            "Cena y noche en la hacienda",
          ],
          comidas: "B, L, D",
        },
        {
          n: 7,
          titulo: "Cotopaxi: mercado indígena – Laguna Quilotoa – Quito",
          alojamiento: "quito",
          items: [
            "Mercado indígena (Pujilí, Saquisilí o Zumbahua según el día)",
            "Tigua: artesanías locales",
            "Laguna Quilotoa",
            "Regreso a Quito",
          ],
          comidas: "B, L",
        },
        {
          n: 8,
          titulo: "Otavalo: el mercado indígena más importante de Sudamérica",
          alojamiento: "quito",
          items: [
            "Ruta norte: Guayllabamba y Cayambe",
            "Carabuela: taller de tejedores",
            "Mercado de Otavalo (Ponchos)",
            "Cotacachi: artesanías en cuero",
            "Regreso a Quito",
          ],
          comidas: "B, L",
        },
        {
          n: 9,
          titulo: "Quito – extensión a Galápagos o vuelo internacional",
          alojamiento: null,
          items: ["Traslado al aeropuerto"],
          comidas: "B",
        },
      ],
    },
    "Ecuador y sus Sabores Auténticos": {
      priceTables: {
        "25": {
          "3★ Estándar": [3850, 2278, 1752, 1453, 1213, 1162, 1084],
          "3.5★ Superior": [4010, 2358, 1832, 1533, 1294, 1248, 1172],
          "4★ Deluxe": [4190, 2460, 1932, 1632, 1392, 1358, 1269],
        },
        "30": {
          "3★ Estándar": [4004, 2369, 1822, 1512, 1262, 1208, 1128],
          "3.5★ Superior": [4172, 2452, 1906, 1595, 1345, 1298, 1218],
          "4★ Deluxe": [4359, 2559, 2009, 1698, 1448, 1400, 1320],
        },
      },
      hoteles: [
        {
          tier: "3★ Estándar",
          d1: "Hotel Cultura Manor (hab. Standard)",
          d3: "Volcano Land (hab. Traditional)",
          d4: "San Isidro Lodge",
          d5: "San José de Puembo (hab. Colonial)",
          d6: "Familia anfitriona, comunidad Kilago",
        },
        {
          tier: "3.5★ Superior",
          d1: "Hotel Cultura Manor (Suite)",
          d3: "Volcano Land (Jr. Suite)",
          d4: "San Isidro Lodge",
          d5: "San José de Puembo (hab. Superior)",
          d6: "Familia anfitriona, comunidad Kilago",
        },
        {
          tier: "4★ Deluxe",
          d1: "Hotel Cultura Manor (Suite)",
          d3: "Volcano Land (Master Suite)",
          d4: "San Isidro Lodge",
          d5: "La Palma Polo Club",
          d6: "Familia anfitriona, comunidad Kilago",
        },
      ],
      dias: [
        {
          n: 1,
          titulo: "Llegada a Quito",
          alojamiento: "d1",
          items: ["Recepción en el aeropuerto y traslado al hotel"],
        },
        {
          n: 2,
          titulo: "Los sabores dulces de la capital",
          alojamiento: "d1",
          items: [
            'Barrio San Roque: "colaciones" y garrapiñada',
            "Casco colonial: Plaza Grande, Palacio de Gobierno, Catedral, La Compañía de Jesús",
            "Tienda Minka: experiencia de chocolate ecuatoriano",
            'Almuerzo local con helado de paila servido por un "Cucurucho"',
            "Museo del Agave en Pomasquí y degustación de productos orgánicos",
          ],
          comidas: "B, L",
        },
        {
          n: 3,
          titulo: "Mercado local y clase de cocina",
          alojamiento: "d3",
          items: [
            "Recorrido interactivo por un mercado local con guía y chef",
            "Clase de cocina de mariscos costeños y platos de la sierra",
            "Viaje por la Avenida de los Volcanes hasta Hacienda El Porvenir",
          ],
          comidas: "B, L, D",
        },
        {
          n: 4,
          titulo: "Cotopaxi: páramo, Selva Alegre y San Isidro Lodge",
          alojamiento: "d4",
          items: [
            'Cabalgata en la hacienda con los "chagras"',
            "Parada en Selva Alegre para degustar cuy",
            "Llegada a San Isidro Lodge y caminata de observación de aves",
          ],
          comidas: "B, L, D",
        },
        {
          n: 5,
          titulo: "San Isidro Lodge: clase de cocina amazónica",
          alojamiento: "d5",
          items: [
            "Clase de cocina con sabores andinos y amazónicos (guayusa, palmito de chonta, naranjilla, chontacuro, maito de pescado)",
            "Regreso a Quito, alojamiento cerca del aeropuerto",
          ],
          comidas: "B, L",
        },
        {
          n: 6,
          titulo: "Otavalo y la Pachamanca",
          alojamiento: "d6",
          items: [
            "Ruta norte: Guayllabamba (chirimoyas) y Cayambe (bizcochos con queso de hoja)",
            "Comunidad cercana a Cotacachi: convivencia con familia anfitriona",
            "Pachamanca: cocción ancestral con piedras volcánicas",
            "Mercado de Ponchos en Otavalo",
          ],
          comidas: "B, L",
        },
        {
          n: 7,
          titulo: "Quito – extensión a Galápagos o vuelo internacional",
          alojamiento: null,
          items: ["Traslado al aeropuerto"],
          comidas: "B",
        },
      ],
    },
  };
  const list: CatalogListItem[] = [
    ["Andes Highlights", "Andes", "9 días / 8 noches", "Ruta terrestre privada", "$2 383"],
    [
      "Ecuador y sus Sabores Auténticos",
      "Andes",
      "7 días / 6 noches",
      "Ruta terrestre privada",
      "$2 278",
    ],
  ];
  return { paxLabels, detalles, list };
}

export function paxToBracket(n: number): number {
  return n === 1 ? 0 : n <= 3 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : n <= 11 ? 4 : n <= 15 ? 5 : 6;
}

export function dayHotelIncluded(w: WizardState, dayNum: number): boolean {
  if (w.hotelMode === "todos") return true;
  if (w.hotelMode === "ninguno") return false;
  return w.hotelDaysSelected.includes(dayNum);
}

export function computeTotals(w: WizardState) {
  const n = Math.max(1, w.pax.length);
  const hotelCost = w.days
    .filter((d) => dayHotelIncluded(w, d.num))
    .reduce((s, d) => s + d.hotelPrice * (d.hotelPaxOverride ?? n), 0);
  const actCost = w.days.reduce(
    (s, d) => s + d.actividades.reduce((s2, a) => s2 + a.price * (a.paxOverride ?? n), 0),
    0,
  );
  const generalCost = w.generalItems.filter((g) => g.included).reduce((s, g) => s + g.price, 0) * n;
  const baseCost = w.baseService * n;
  const total = baseCost + hotelCost + actCost + generalCost;
  return { hotelCost, actCost, generalCost, baseCost, total, perPax: n ? total / n : 0 };
}

function parseDayNumbers(t: string): number[] {
  const nums = [...t.matchAll(/d[ií]a\s*(\d+)/g)].map((m) => parseInt(m[1]!, 10));
  return [...new Set(nums)];
}

/** Applies a free-text chat command to the wizard's custom-itinerary state. */
export function applyChatCommand(w: WizardState, text: string): WizardState {
  const t = text.toLowerCase();
  const next: WizardState = { ...w };
  let reply =
    "Anotado. Cuando conecte la base de datos del operador podré aplicar cambios como este automáticamente.";
  const quitar = /quita|elimina|sin |no incluir|por su cuenta|por cuenta propia/.test(t);
  const allDays = w.days.map((d) => d.num);

  if (t.includes("hotel") || t.includes("alojamiento")) {
    const days = parseDayNumbers(t);
    if (days.length) {
      const currentIncluded =
        w.hotelMode === "todos" ? allDays : w.hotelMode === "ninguno" ? [] : w.hotelDaysSelected;
      const newIncluded = quitar
        ? currentIncluded.filter((n) => !days.includes(n))
        : [...new Set([...currentIncluded, ...days])];
      next.hotelMode =
        newIncluded.length === allDays.length
          ? "todos"
          : newIncluded.length === 0
            ? "ninguno"
            : "algunos";
      next.hotelDaysSelected = newIncluded;
      reply =
        (quitar ? "Quité el alojamiento del día " : "Incluí alojamiento el día ") +
        days.join(" y ") +
        ".";
    } else if (quitar) {
      next.hotelMode = "ninguno";
      next.hotelDaysSelected = [];
      reply =
        "Listo, quité el alojamiento de todo el itinerario. El cliente lo gestionará por su cuenta.";
    } else {
      next.hotelMode = "todos";
      next.hotelDaysSelected = allDays;
      reply = "Alojamiento incluido nuevamente en todos los días.";
    }
  } else if (t.includes("vuelo")) {
    next.generalItems = w.generalItems.map((g) =>
      g.id === "vuelos" ? { ...g, included: !quitar } : g,
    );
    reply = quitar
      ? "Quité los vuelos internos de la cotización."
      : "Vuelos internos incluidos de nuevo.";
  } else if (t.includes("seguro")) {
    next.generalItems = w.generalItems.map((g) =>
      g.id === "seguro" ? { ...g, included: !quitar } : g,
    );
    reply = quitar
      ? "Quité el seguro de viaje de la cotización."
      : "Seguro de viaje incluido de nuevo.";
  } else if (t.includes("pasajero") || t.includes("persona") || /\d+\s*pax/.test(t)) {
    reply =
      "El número de pasajeros se define en el paso 1 (Pasajeros del grupo); agrega o quita pasajeros ahí y la cotización se actualizará.";
  }

  next.chat = [...w.chat, { from: "user", text }, { from: "bot", text: reply }];
  next.chatInput = "";
  return next;
}

// ---- "Ver itinerario" detail / edit view ----
// Ported from the design's itinerarios() renderer: each catalog program can be
// expanded into a read-only breakdown, or switched into an edit mode that lets
// staff override hotel tier names, per-pax pricing, and day-by-day content.
// Overrides are kept separately from the base catalog and merged on read.

export type DiaOverride = { titulo?: string; items?: string[]; comidas?: string };

export type ItinOverride = {
  hoteles?: Record<number, Partial<Record<string, string>>>;
  precios?: {
    "25"?: Record<number, Record<number, number>>;
    "30"?: Record<number, Record<number, number>>;
  };
  dias?: Record<number, DiaOverride>;
};

export type ResolvedPriceGrid = {
  label: string;
  paxLabels: string[];
  rows: { tier: string; cells: { pax: string; value: number; fmt: string }[] }[];
};

export type ResolvedDia = {
  n: number;
  titulo: string;
  items: string[];
  itemsText: string;
  comidas: string;
  alojamientoOpciones: string[];
};

export type ResolvedItinerarioDetalle = {
  hoteles: CatalogHotelRow[];
  priceGrids: ResolvedPriceGrid[];
  precioRango: string;
  notaPrecio: string;
  dias: ResolvedDia[];
};

export function buildItinerarioDetalle(
  nombre: string,
  override: ItinOverride,
): ResolvedItinerarioDetalle | null {
  const catalog = tourCatalog();
  const detalleRaw = catalog.detalles[nombre];
  if (!detalleRaw) return null;
  const paxLabels = catalog.paxLabels;

  const hotelesResueltos: CatalogHotelRow[] = detalleRaw.hoteles.map((h, i) => {
    const oh = override.hoteles?.[i] ?? {};
    return { ...h, ...oh, tier: oh["tier"] ?? h.tier } as CatalogHotelRow;
  });

  const getPrecio = (tk: "25" | "30", ti: number, pi: number): number => {
    const op = override.precios?.[tk]?.[ti]?.[pi];
    if (op !== undefined) return op;
    const origTier = detalleRaw.hoteles[ti]!.tier;
    return detalleRaw.priceTables[tk]![origTier]![pi]!;
  };

  const allPrecios: number[] = [];
  const buildGrid = (tk: "25" | "30"): ResolvedPriceGrid => ({
    label: tk === "25" ? "Tarifa −25%" : "Tarifa −30%",
    paxLabels,
    rows: hotelesResueltos.map((h, ti) => ({
      tier: h.tier,
      cells: paxLabels.map((label, pi) => {
        const value = getPrecio(tk, ti, pi);
        allPrecios.push(value);
        return { pax: label, value, fmt: "$" + value.toLocaleString("en-US") };
      }),
    })),
  });
  const priceGrids = [buildGrid("25"), buildGrid("30")];
  const precioRango = allPrecios.length
    ? "$" +
      Math.min(...allPrecios).toLocaleString("en-US") +
      " – $" +
      Math.max(...allPrecios).toLocaleString("en-US")
    : "";

  const dias: ResolvedDia[] = detalleRaw.dias.map((d, i) => {
    const od = override.dias?.[i] ?? {};
    const titulo = od.titulo ?? d.titulo;
    const items = od.items ?? d.items;
    const comidas = od.comidas ?? d.comidas ?? "";
    const alojamientoOpciones = d.alojamiento
      ? [...new Set(hotelesResueltos.map((h) => h[d.alojamiento!]).filter((v): v is string => !!v))]
      : [];
    return { n: d.n, titulo, items, itemsText: items.join("\n"), comidas, alojamientoOpciones };
  });

  return {
    hoteles: hotelesResueltos,
    priceGrids,
    precioRango,
    notaPrecio:
      "Rango entre ambas tarifas (−25% y −30%), según categoría de hotel y número de pasajeros · 2027",
    dias,
  };
}

export type CreatedItinerario = {
  nombre: string;
  region: string;
  detalle: string;
  precio: string;
};

/** Builds the summary record appended to the Itinerarios catalog once the wizard is sent. */
export function buildItinerarioFromWizard(w: WizardState): CreatedItinerario {
  const catalog = tourCatalog();
  const selProgram = w.programName ? catalog.list.find((p) => p[0] === w.programName) : null;
  const numPax = Math.max(1, w.pax.length);

  if (selProgram) {
    const selDetalle = catalog.detalles[selProgram[0]];
    const bracket = paxToBracket(numPax);
    let precio = selProgram[4] + " / pax";
    if (selDetalle) {
      const tier = selDetalle.hoteles[w.programHotelIdx || 0]!.tier;
      const base = w.priceOverride ?? selDetalle.priceTables["25"]![tier]![bracket]!;
      precio = "$" + Math.round(base).toLocaleString() + " / pax";
    }
    return {
      nombre: selProgram[0],
      region: selProgram[1],
      detalle: `${selProgram[2]} · ${selProgram[3]}`,
      precio,
    };
  }

  const totals = computeTotals(w);
  return {
    nombre: "Ruta del Chocolate (personalizado)",
    region: "Personalizado",
    detalle: `${w.days.length} días · Itinerario armado a medida`,
    precio: "$" + Math.round(totals.perPax).toLocaleString() + " / pax",
  };
}
