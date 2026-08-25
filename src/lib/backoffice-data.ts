export type ScreenId =
  | "panel"
  | "reservas"
  | "pasajeros"
  | "grupos"
  | "itinerarios"
  | "operaciones"
  | "bloqueos"
  | "calendario"
  | "notas"
  | "proveedores"
  | "reportes";

export const navItems: {
  id: ScreenId;
  label: string;
  badge?: string;
  title: string;
  subtitle: string;
}[] = [
  { id: "panel", label: "Panel", title: "Panel", subtitle: "Temporada alta · junio – agosto 2026" },
  {
    id: "reservas",
    label: "Reservas",
    badge: "24",
    title: "Reservas",
    subtitle: "Todas las reservas, rentabilidad y cuentas por cobrar/pagar",
  },
  {
    id: "pasajeros",
    label: "Pasajeros",
    title: "Pasajeros",
    subtitle: "1 486 pasajeros en cartera",
  },
  {
    id: "grupos",
    label: "Grupos",
    badge: "6",
    title: "Grupos",
    subtitle: "6 grupos con salida próxima",
  },
  {
    id: "itinerarios",
    label: "Itinerarios",
    title: "Itinerarios",
    subtitle: "Catálogo de programas y embarcaciones",
  },
  {
    id: "operaciones",
    label: "Operaciones",
    title: "Operaciones",
    subtitle: "Checklist logístico por salida",
  },
  {
    id: "bloqueos",
    label: "Bloqueos y Reservas",
    title: "Bloqueos y Reservas",
    subtitle: "Control de bloqueos de hotel y su conversión a reserva",
  },
  {
    id: "calendario",
    label: "Calendario",
    title: "Calendario",
    subtitle: "Fechas clave de inicio de viaje, pagos y bloqueos",
  },
  {
    id: "notas",
    label: "Notas de débito",
    badge: "3",
    title: "Notas de débito",
    subtitle: "3 pendientes de pago",
  },
  {
    id: "proveedores",
    label: "Proveedores",
    title: "Proveedores",
    subtitle: "Hoteles, transporte, guías y aerolíneas",
  },
  {
    id: "reportes",
    label: "Reportes",
    title: "Reportes",
    subtitle: "Genera y descarga reportes de negocio",
  },
];

export const kpis = [
  {
    label: "Ventas confirmadas",
    value: "$1 248 300",
    delta: "12,4 %",
    deltaTone: "up" as const,
    note: "vs. periodo anterior",
    icon: "dollar" as const,
  },
  {
    label: "Pasajeros reservados",
    value: "1 486",
    delta: "214 pax",
    deltaTone: "up" as const,
    note: "nuevos este mes",
    icon: "users" as const,
  },
  {
    label: "Margen bruto",
    value: "31,8 %",
    delta: "0,6 pts",
    deltaTone: "down" as const,
    note: "por alza de tarifas aéreas",
    icon: "pie" as const,
  },
  {
    label: "Saldos por cobrar",
    value: "$286 940",
    delta: "$62 100 vencidos",
    deltaTone: "down" as const,
    note: "en 9 expedientes",
    icon: "card" as const,
  },
];

export const ventasVsCosto = [
  { mes: "Sep", ventas: 132, costo: 82 },
  { mes: "Oct", ventas: 150, costo: 88 },
  { mes: "Nov", ventas: 156, costo: 95 },
  { mes: "Dic", ventas: 172, costo: 110 },
  { mes: "Ene", ventas: 196, costo: 120 },
  { mes: "Feb", ventas: 206, costo: 132 },
  { mes: "Mar", ventas: 180, costo: 118 },
  { mes: "Abr", ventas: 168, costo: 110 },
  { mes: "May", ventas: 192, costo: 126 },
  { mes: "Jun", ventas: 205, costo: 134 },
  { mes: "Jul", ventas: 222, costo: 142 },
  { mes: "Ago", ventas: 245, costo: 150 },
];

export const destinos = [
  { nombre: "Galápagos", monto: "$574 200", valor: 574200, pct: "46 %", viajes: 96, barra: 100 },
  { nombre: "Amazonía", monto: "$274 600", valor: 274600, pct: "22 %", viajes: 74, barra: 48 },
  { nombre: "Andes", monto: "$249 700", valor: 249700, pct: "20 %", viajes: 108, barra: 43 },
  { nombre: "Costa", monto: "$149 800", valor: 149800, pct: "12 %", viajes: 66, barra: 26 },
];

export const pedidosPorAnio = [
  { anio: "2021", valor: 186, delta: "", dir: "up" as const },
  { anio: "2022", valor: 254, delta: "36,6 %", dir: "up" as const },
  { anio: "2023", valor: 331, delta: "30,3 %", dir: "up" as const },
  { anio: "2024", valor: 298, delta: "10,0 %", dir: "down" as const },
  { anio: "2025", valor: 402, delta: "34,9 %", dir: "up" as const },
  { anio: "2026", valor: 512, delta: "27,4 %", dir: "up" as const },
];

export const genero = [
  { nombre: "Masculino", valor: 684, detalle: "684 pasajeros", pct: "46 %" },
  { nombre: "Femenino", valor: 802, detalle: "802 pasajeras", pct: "54 %" },
];

export const edades = [
  { rango: "18-25", valor: 134 },
  { rango: "26-35", valor: 401 },
  { rango: "36-45", valor: 468 },
  { rango: "46-55", valor: 312 },
  { rango: "56-65", valor: 134 },
  { rango: "65+", valor: 37 },
];

export const estacionalidad = [
  { mes: "Ene", viajes: 131 },
  { mes: "Feb", viajes: 110 },
  { mes: "Mar", viajes: 100 },
  { mes: "Abr", viajes: 92 },
  { mes: "May", viajes: 106 },
  { mes: "Jun", viajes: 166 },
  { mes: "Jul", viajes: 212 },
  { mes: "Ago", viajes: 202 },
  { mes: "Sep", viajes: 145 },
  { mes: "Oct", viajes: 118 },
  { mes: "Nov", viajes: 126 },
  { mes: "Dic", viajes: 156 },
];

export const cobertura = [
  { exp: "EXP-2607", pct: 91, estado: "Pendiente de pago" },
  { exp: "EXP-2612", pct: 21, estado: "Pendiente de pago" },
  { exp: "EXP-2598", pct: 100, estado: "Cubierto" },
  { exp: "EXP-2584", pct: 85, estado: "Pendiente de pago" },
  { exp: "EXP-2571", pct: 68, estado: "Pendiente de pago" },
  { exp: "EXP-2619", pct: 30, estado: "Pendiente de pago" },
  { exp: "EXP-2631", pct: 100, estado: "Cubierto" },
  { exp: "EXP-2640", pct: 16, estado: "Pendiente de pago" },
];

export type Estado = "Confirmado" | "Operando" | "Cerrado" | "Cancelado";

export const proximasSalidas: {
  exp: string;
  cliente: string;
  programa: string;
  fechas: string;
  pax: number;
  estado: Estado;
}[] = [
  {
    exp: "EXP-2607",
    cliente: "Andersen Family",
    programa: "Galápagos Islander II · 5 días",
    fechas: "18 – 23 ago",
    pax: 6,
    estado: "Confirmado",
  },
  {
    exp: "EXP-2612",
    cliente: "Voyages du Monde",
    programa: "Amazonía Napo Wildlife · 4 días",
    fechas: "20 – 24 ago",
    pax: 12,
    estado: "Operando",
  },
  {
    exp: "EXP-2598",
    cliente: "R. Nakamura",
    programa: "Andes & Quilotoa privado",
    fechas: "22 – 27 ago",
    pax: 2,
    estado: "Confirmado",
  },
  {
    exp: "EXP-2584",
    cliente: "Wildlife Trails UK",
    programa: "Galápagos Crucero Elite · 8 días",
    fechas: "24 ago – 1 sep",
    pax: 16,
    estado: "Operando",
  },
  {
    exp: "EXP-2571",
    cliente: "Sierra Club Chapter",
    programa: "Cotopaxi + Termas de Papallacta",
    fechas: "26 – 30 ago",
    pax: 9,
    estado: "Cerrado",
  },
  {
    exp: "EXP-2619",
    cliente: "M. Rossi",
    programa: "Costa & Isla de la Plata",
    fechas: "29 ago – 2 sep",
    pax: 4,
    estado: "Cancelado",
  },
  {
    exp: "EXP-2718",
    cliente: "Familia Torres",
    programa: "Ecuador y sus Sabores Auténticos · 7D/6N",
    fechas: "5 – 11 sep",
    pax: 4,
    estado: "Confirmado",
  },
];

export const reservas: {
  exp: string;
  cliente: string;
  programa: string;
  pax: number;
  margen: string;
  saldoCliente: string;
  saldoProveedor: string;
  estado: Estado;
}[] = [
  {
    exp: "EXP-2607",
    cliente: "Andersen Family",
    programa: "Galápagos Islander II · 5 días · 18 – 23 ago",
    pax: 6,
    margen: "35.4 %",
    saldoCliente: "Pagado",
    saldoProveedor: "$1,000",
    estado: "Confirmado",
  },
  {
    exp: "EXP-2612",
    cliente: "Voyages du Monde",
    programa: "Amazonía Napo Wildlife · 4 días · 20 – 24 ago",
    pax: 12,
    margen: "24.6 %",
    saldoCliente: "Pagado",
    saldoProveedor: "$9,800",
    estado: "Operando",
  },
  {
    exp: "EXP-2598",
    cliente: "R. Nakamura",
    programa: "Andes & Quilotoa privado · 22 – 27 ago",
    pax: 2,
    margen: "39.9 %",
    saldoCliente: "$4,200",
    saldoProveedor: "Pagado",
    estado: "Confirmado",
  },
  {
    exp: "EXP-2584",
    cliente: "Wildlife Trails UK",
    programa: "Galápagos Crucero Elite · 8 días · 24 ago – 1 sep",
    pax: 16,
    margen: "36.6 %",
    saldoCliente: "Pagado",
    saldoProveedor: "$7,200",
    estado: "Operando",
  },
  {
    exp: "EXP-2571",
    cliente: "Sierra Club Chapter",
    programa: "Cotopaxi + Termas de Papallacta · 26 – 30 ago",
    pax: 9,
    margen: "30.2 %",
    saldoCliente: "Pagado",
    saldoProveedor: "$840",
    estado: "Cerrado",
  },
  {
    exp: "EXP-2619",
    cliente: "M. Rossi",
    programa: "Costa & Isla de la Plata · 29 ago – 2 sep",
    pax: 4,
    margen: "18.9 %",
    saldoCliente: "$1,800",
    saldoProveedor: "$1,380",
    estado: "Cancelado",
  },
  {
    exp: "EXP-2718",
    cliente: "Familia Torres",
    programa: "Ecuador y sus Sabores Auténticos · 7D/6N · 5 – 11 sep",
    pax: 4,
    margen: "0.0 %",
    saldoCliente: "$3,100",
    saldoProveedor: "Pagado",
    estado: "Confirmado",
  },
  {
    exp: "EXP-2631",
    cliente: "K. Ostrowski",
    programa: "Galápagos Ocean Spray · 6 días · 3 – 9 sep",
    pax: 3,
    margen: "38.7 %",
    saldoCliente: "Pagado",
    saldoProveedor: "Pagado",
    estado: "Confirmado",
  },
  {
    exp: "EXP-2640",
    cliente: "Descubre Ecuador Tours",
    programa: "Amazonía Sacha Lodge · 3 días · 5 – 8 sep",
    pax: 8,
    margen: "25.6 %",
    saldoCliente: "Pagado",
    saldoProveedor: "$6,200",
    estado: "Operando",
  },
];

export const pasajeros = [
  {
    nombre: "Erik Andersen",
    pasaporte: "USA48213",
    nacionalidad: "Estados Unidos",
    exp: "EXP-2607",
    dieta: "Sin restricciones",
    docs: "Completo",
  },
  {
    nombre: "Lena Andersen",
    pasaporte: "USA48214",
    nacionalidad: "Estados Unidos",
    exp: "EXP-2607",
    dieta: "Vegetariana",
    docs: "Completo",
  },
  {
    nombre: "Marc Dubois",
    pasaporte: "FRA77190",
    nacionalidad: "Francia",
    exp: "EXP-2612",
    dieta: "Alergia a mariscos",
    docs: "Incompleto",
  },
  {
    nombre: "Ryo Nakamura",
    pasaporte: "JPN22841",
    nacionalidad: "Japón",
    exp: "EXP-2598",
    dieta: "Sin restricciones",
    docs: "Completo",
  },
  {
    nombre: "Helen Wright",
    pasaporte: "GBR90312",
    nacionalidad: "Reino Unido",
    exp: "EXP-2584",
    dieta: "Sin gluten",
    docs: "Completo",
  },
  {
    nombre: "James Wright",
    pasaporte: "GBR90313",
    nacionalidad: "Reino Unido",
    exp: "EXP-2584",
    dieta: "Sin restricciones",
    docs: "Incompleto",
  },
  {
    nombre: "Karolina Ostrowski",
    pasaporte: "POL11029",
    nacionalidad: "Polonia",
    exp: "EXP-2631",
    dieta: "Vegana",
    docs: "Completo",
  },
  {
    nombre: "Matteo Rossi",
    pasaporte: "ITA65210",
    nacionalidad: "Italia",
    exp: "EXP-2619",
    dieta: "Sin restricciones",
    docs: "Completo",
  },
];

export const grupos = [
  {
    nombre: "Andersen Family",
    pax: 6,
    programa: "Galápagos Islander II · 5 días",
    detalle: "18 – 23 ago · agente L. Torres",
    docs: 100,
  },
  {
    nombre: "Wildlife Trails UK",
    pax: 16,
    programa: "Galápagos Crucero Elite · 8 días",
    detalle: "24 ago – 1 sep · agente P. Vera",
    docs: 88,
  },
  {
    nombre: "Sierra Club Chapter",
    pax: 9,
    programa: "Cotopaxi + Papallacta",
    detalle: "26 – 30 ago · agente L. Torres",
    docs: 100,
  },
  {
    nombre: "Voyages du Monde",
    pax: 12,
    programa: "Amazonía Napo Wildlife · 4 días",
    detalle: "20 – 24 ago · agente M. Salazar",
    docs: 75,
  },
  {
    nombre: "Descubre Ecuador Tours",
    pax: 8,
    programa: "Amazonía Sacha Lodge · 3 días",
    detalle: "5 – 8 sep · agente P. Vera",
    docs: 62,
  },
  {
    nombre: "Ocean Spray Charters",
    pax: 3,
    programa: "Galápagos Ocean Spray · 6 días",
    detalle: "3 – 9 sep · agente M. Salazar",
    docs: 100,
  },
];

export const itinerarios = [
  {
    nombre: "Andes Highlights",
    region: "Andes",
    detalle: "9 días / 8 noches · Ruta terrestre privada",
    precio: "$1,240 – $5,606 / pax",
  },
  {
    nombre: "Ecuador y sus Sabores Auténticos",
    region: "Andes",
    detalle: "7 días / 6 noches · Ruta terrestre privada",
    precio: "$1,084 – $4,359 / pax",
  },
];

export const reportes = [
  {
    nombre: "Ventas por mes",
    detalle: "Ingresos confirmados y proyectados, desglosados por mes de salida",
    ultima: "3 ago",
  },
  {
    nombre: "Rentabilidad por destino",
    detalle: "Margen bruto comparado entre Galápagos, Amazonía, Andes y Costa",
    ultima: "1 ago",
  },
  {
    nombre: "Ocupación por embarcación / lodge",
    detalle: "Porcentaje de cupos vendidos por fecha de salida",
    ultima: "5 ago",
  },
  {
    nombre: "Cuentas por cobrar",
    detalle: "Saldos pendientes por cliente y antigüedad de vencimiento",
    ultima: "hoy",
  },
  {
    nombre: "Comisiones de agentes",
    detalle: "Comisiones devengadas y pagadas por agente de viajes",
    ultima: "28 jul",
  },
  {
    nombre: "Pasajeros por nacionalidad",
    detalle: "Distribución de pasajeros reservados por país de origen",
    ultima: "2 ago",
  },
];
