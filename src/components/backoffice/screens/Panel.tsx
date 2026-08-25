import {
  ChartPie,
  CircleDollarSign,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Badge,
  Card,
  CardHeader,
  ChartFrame,
  ChartTooltipCard,
  Progress,
  TableHead,
  estadoTone,
} from "../ui";
import {
  cobertura,
  destinos,
  edades,
  estacionalidad,
  genero,
  kpis,
  pedidosPorAnio,
  proximasSalidas,
  ventasVsCosto,
} from "@/lib/backoffice-data";
import { useNavigate } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { TooltipProps } from "recharts";

const axis = {
  fontSize: 11,
  fill: "var(--color-muted-foreground)",
};

const barCursor = { fill: "var(--color-secondary)", fillOpacity: 0.5 };
const lineCursor = { stroke: "var(--color-border)", strokeWidth: 1 };

function VentasTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltipCard
      title={label}
      rows={payload.map((p) => ({
        label: p.dataKey === "ventas" ? "Ventas" : "Costo operativo",
        value: `$${p.value} mil`,
        color: p.dataKey === "ventas" ? "var(--color-chart-1)" : "var(--color-chart-3)",
      }))}
    />
  );
}

function DestinosTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as (typeof destinos)[number] | undefined;
  if (!d) return null;
  return (
    <ChartTooltipCard
      title={d.nombre}
      rows={[
        { label: "Ingreso", value: d.monto },
        { label: "Participación", value: d.pct },
      ]}
    />
  );
}

function PedidosTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as (typeof pedidosPorAnio)[number] | undefined;
  if (!p) return null;
  const rows: { label: string; value: string | number }[] = [
    { label: "Cotizaciones", value: p.valor },
  ];
  if (p.delta) rows.push({ label: "vs. año anterior", value: p.delta });
  return <ChartTooltipCard title={label} rows={rows} />;
}

function GeneroTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const g = payload[0]?.payload as (typeof genero)[number] | undefined;
  if (!g) return null;
  return (
    <ChartTooltipCard
      title={g.nombre}
      rows={[
        { label: "Pasajeros", value: g.detalle },
        { label: "Participación", value: g.pct },
      ]}
    />
  );
}

function EdadTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltipCard
      title={label}
      rows={[{ label: "Pasajeros", value: payload[0]?.value ?? "" }]}
    />
  );
}

function EstacionalidadTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltipCard title={label} rows={[{ label: "Viajes", value: payload[0]?.value ?? "" }]} />
  );
}

function PedidosBarLabel(props: {
  x?: string | number | undefined;
  y?: string | number | undefined;
  width?: string | number | undefined;
  index?: number | undefined;
}) {
  const { x, y, width, index } = props;
  if (x === undefined || y === undefined || width === undefined || index === undefined) {
    return null;
  }
  const nx = Number(x);
  const ny = Number(y);
  const nw = Number(width);
  const item = pedidosPorAnio[index];
  if (!item) return null;
  const isDown = item.dir === "down";
  const cx = nx + nw / 2;
  return (
    <g>
      <text
        x={cx}
        y={ny - 9}
        textAnchor="middle"
        fontSize={13}
        fontWeight={600}
        fill="var(--color-foreground)"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {item.valor}
      </text>
      {item.delta && (
        <g
          transform={`translate(${cx}, ${ny - 24})`}
          fill={isDown ? "var(--color-destructive)" : "var(--color-success-ink)"}
        >
          {/* A drawn triangle, sized to the label, rather than a text glyph. */}
          <path
            d={isDown ? "M -20 -4 L -14 -4 L -17 2 Z" : "M -20 2 L -14 2 L -17 -4 Z"}
            stroke="none"
          />
          <text
            x={-10}
            textAnchor="start"
            fontSize={11.5}
            fontWeight={700}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {item.delta}
          </text>
        </g>
      )}
    </g>
  );
}

const kpiIcons = {
  dollar: CircleDollarSign,
  users: Users,
  pie: ChartPie,
  card: Wallet,
} as const;

function KpiIcon({ kind }: { kind: keyof typeof kpiIcons }) {
  const Icon = kpiIcons[kind];
  return (
    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary/8 text-primary">
      <Icon aria-hidden strokeWidth={1.75} className="h-[17px] w-[17px]" />
    </span>
  );
}

export function Panel() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const up = k.deltaTone === "up";
          const Trend = up ? TrendingUp : TrendingDown;
          return (
            <Card key={k.label} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[13px] font-medium text-muted-foreground">{k.label}</span>
                <KpiIcon kind={k.icon} />
              </div>
              <div className="numeric mt-3 text-[30px] leading-none font-semibold tracking-[-0.02em] text-foreground">
                {k.value}
              </div>
              <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-muted-foreground">
                <span
                  className={cn(
                    "numeric inline-flex items-center gap-1 font-semibold",
                    up ? "text-success-ink" : "text-destructive",
                  )}
                >
                  <Trend aria-hidden strokeWidth={2.25} className="h-3.5 w-3.5" />
                  {k.delta}
                </span>
                {k.note}
              </p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.9fr_1fr]">
        <Card>
          <CardHeader
            title="Ventas vs. costo operativo"
            subtitle="Miles de USD por mes de salida"
            action={
              <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-chart-1" /> Ventas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-chart-3" /> Costo operativo
                </span>
              </div>
            }
          />
          <div className="px-4 pb-5">
            <ChartFrame height={260}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ventasVsCosto} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gCosto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-4)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-chart-4)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="mes" tick={axis} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={axis}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    domain={[0, 280]}
                  />
                  <Tooltip content={VentasTooltip} cursor={lineCursor} />
                  <Area
                    isAnimationActive={false}
                    type="linear"
                    dataKey="costo"
                    stroke="var(--color-chart-3)"
                    strokeWidth={2}
                    fill="url(#gCosto)"
                  />
                  <Area
                    isAnimationActive={false}
                    type="linear"
                    dataKey="ventas"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#gVentas)"
                    dot={{
                      r: 3,
                      fill: "var(--color-card)",
                      stroke: "var(--color-chart-1)",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Ingresos por destino"
            subtitle="Participación sobre ventas confirmadas"
          />
          <div className="flex flex-col items-center gap-6 px-6 pb-6 lg:flex-row">
            <div className="relative">
              <ChartFrame height={170}>
                <PieChart width={170} height={170}>
                  <Pie
                    isAnimationActive={false}
                    data={destinos}
                    dataKey="valor"
                    nameKey="nombre"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={1}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    {destinos.map((_, i) => (
                      <Cell key={i} fill={`var(--color-chart-${i + 1})`} />
                    ))}
                  </Pie>
                  <Tooltip content={DestinosTooltip} />
                </PieChart>
              </ChartFrame>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[19px] font-semibold">$1,25 M</span>
                <span className="text-[11px] text-muted-foreground">12 meses</span>
              </div>
            </div>
            <ul className="w-full space-y-3">
              {destinos.map((d, i) => (
                <li key={d.nombre} className="flex items-center gap-3">
                  <span
                    className="h-2 w-2 flex-none rounded-full"
                    style={{ background: `var(--color-chart-${i + 1})` }}
                  />
                  <span className="flex-1">
                    <span className="block text-[13px] font-medium">{d.nombre}</span>
                    <span className="block text-[11.5px] text-muted-foreground">{d.monto}</span>
                  </span>
                  <span className="text-[13px] font-semibold">{d.pct}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.9fr_1fr]">
        <Card>
          <CardHeader
            title="Pedidos recibidos por año"
            subtitle="Cotizaciones convertidas en expediente"
            action={
              <span className="flex items-center gap-1.5 text-[12px] whitespace-nowrap text-muted-foreground">
                <span className="numeric inline-flex items-center gap-1 font-semibold text-success-ink">
                  <TrendingUp aria-hidden strokeWidth={2.25} className="h-3.5 w-3.5" />
                  27,4 %
                </span>
                vs. 2025
              </span>
            }
          />
          <div className="px-4 pb-5">
            <ChartFrame height={250}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pedidosPorAnio} margin={{ top: 36, right: 12, left: 0, bottom: 0 }}>
                  <XAxis dataKey="anio" tick={axis} tickLine={false} axisLine={false} />
                  <YAxis hide domain={[0, 600]} />
                  <Tooltip content={PedidosTooltip} cursor={barCursor} />
                  <Bar
                    isAnimationActive={false}
                    dataKey="valor"
                    fill="var(--color-chart-1)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={64}
                  >
                    <LabelList dataKey="valor" content={PedidosBarLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Card>

        <Card>
          <CardHeader title="Distribución por género" subtitle="Sobre 1 486 pasajeros en cartera" />
          <div className="flex flex-col items-center gap-6 px-6 pb-6 lg:flex-row">
            <div className="relative">
              <ChartFrame height={180}>
                <PieChart width={180} height={180}>
                  <Pie
                    isAnimationActive={false}
                    data={genero}
                    dataKey="valor"
                    nameKey="nombre"
                    innerRadius={58}
                    outerRadius={88}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    <Cell fill="var(--color-chart-1)" />
                    <Cell fill="var(--color-chart-3)" />
                  </Pie>
                  <Tooltip content={GeneroTooltip} />
                </PieChart>
              </ChartFrame>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[20px] font-semibold">1 486</span>
                <span className="text-[11px] text-muted-foreground">pasajeros</span>
              </div>
            </div>
            <ul className="w-full space-y-4">
              {genero.map((g, i) => (
                <li key={g.nombre} className="flex items-center gap-3">
                  <span
                    className="h-2 w-2 flex-none rounded-full"
                    style={{ background: `var(--color-chart-${i === 0 ? 1 : 3})` }}
                  />
                  <span className="flex-1">
                    <span className="block text-[13px] font-medium">{g.nombre}</span>
                    <span className="block text-[11.5px] text-muted-foreground">{g.detalle}</span>
                  </span>
                  <span className="text-[13px] font-semibold">{g.pct}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.9fr_1fr]">
        <Card>
          <CardHeader
            title="Edad de los pasajeros"
            subtitle="Distribución por rango etario · concentración en 36–45"
          />
          <div className="px-4 pb-5">
            <ChartFrame height={250}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={edades} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
                  <XAxis dataKey="rango" tick={axis} tickLine={false} axisLine={false} />
                  <YAxis hide domain={[0, 520]} />
                  <Tooltip content={EdadTooltip} cursor={barCursor} />
                  <Bar
                    isAnimationActive={false}
                    dataKey="valor"
                    fill="var(--color-chart-2)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={60}
                  >
                    <LabelList
                      dataKey="valor"
                      position="top"
                      offset={9}
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        fill: "var(--color-foreground)",
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Ingresos y viajes por destino"
            subtitle="Barra = ingreso · viajes realizados a la derecha"
          />
          <ul className="space-y-5 px-6 pb-6">
            {destinos.map((d, i) => (
              <li key={d.nombre}>
                <div className="flex items-end justify-between gap-4">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: `var(--color-chart-${i + 1})` }}
                    />
                    <span>
                      <span className="block text-[13px] font-medium">{d.nombre}</span>
                      <span className="block text-[11.5px] text-muted-foreground">{d.monto}</span>
                    </span>
                  </span>
                  <span className="text-[13px] font-semibold">{d.viajes} viajes</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${d.barra}%`, background: `var(--color-chart-${i + 1})` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Estacionalidad de viajes"
          subtitle="Actividad mensual · temporadas altas y bajas"
        />
        <div className="px-4 pb-5">
          <ChartFrame height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={estacionalidad} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSeason" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ ...axis, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={axis} tickLine={false} axisLine={false} width={42} domain={[0, 241]} />
                <Tooltip content={EstacionalidadTooltip} cursor={lineCursor} />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="viajes"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2.5}
                  fill="url(#gSeason)"
                  dot={{
                    r: 3.5,
                    fill: "var(--color-card)",
                    stroke: "var(--color-chart-1)",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Cobertura de costos por expediente"
          subtitle="Pagos a proveedores realizados vs. costo total"
          action={
            <button
              type="button"
              onClick={() => navigate("reservas")}
              className="cursor-pointer text-[13px] font-semibold text-primary hover:underline"
            >
              Ver detalle en Reservas
            </button>
          }
        />
        <div className="grid grid-cols-2 gap-3 px-6 pb-6 lg:grid-cols-4">
          {cobertura.map((c) => (
            <button
              type="button"
              key={c.exp}
              onClick={() => navigate("reservas", c.exp)}
              className="cursor-pointer rounded-xl bg-secondary/60 px-4 py-3.5 text-left"
            >
              <div className="mb-2 flex items-center justify-between text-[12.5px]">
                <span className="font-semibold text-primary">{c.exp}</span>
                <span className="font-semibold">{c.pct} %</span>
              </div>
              <div className="mb-2">
                <Progress value={c.pct} tone="primary" />
              </div>
              <Badge tone={estadoTone(c.estado)}>{c.estado}</Badge>
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title="Próximas salidas"
          subtitle="Siguientes 30 días · 14 expedientes activos"
          action={
            <button
              type="button"
              onClick={() => navigate("reservas")}
              className="cursor-pointer text-[13px] font-semibold text-primary hover:underline"
            >
              Ver todas las reservas
            </button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <TableHead
              cols={[
                { label: "Expediente" },
                { label: "Cliente" },
                { label: "Programa" },
                { label: "Fechas" },
                { label: "Pax" },
                { label: "Estado" },
              ]}
            />
            <tbody>
              {proximasSalidas.map((r) => (
                <tr key={r.exp} className="border-t border-border">
                  <td className="px-6 py-3.5 font-semibold text-primary whitespace-nowrap">
                    {r.exp}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">{r.cliente}</td>
                  <td className="px-6 py-3.5 text-muted-foreground">{r.programa}</td>
                  <td className="px-6 py-3.5 whitespace-nowrap">{r.fechas}</td>
                  <td className="px-6 py-3.5">{r.pax}</td>
                  <td className="px-6 py-3.5">
                    <Badge tone={estadoTone(r.estado)}>{r.estado}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
