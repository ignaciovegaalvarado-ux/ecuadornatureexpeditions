import { Fragment, useEffect, useState, type CSSProperties } from "react";
import {
  Badge,
  Card,
  CardHeader,
  FilterTabs,
  GhostButton,
  PrimaryButton,
  Progress,
  TableHead,
  estadoTone,
} from "../ui";
import { NewItineraryWizard } from "../NewItineraryWizard";
import { ItinerarioDetailModal } from "../ItinerarioDetailModal";
import { OperacionCard } from "../OperacionCard";
import { BloqueosScreen } from "../BloqueosScreen";
import { NotasScreen } from "../NotasScreen";
import { ProveedoresScreen } from "../ProveedoresScreen";
import { CalendarioScreen } from "../CalendarioScreen";
import { IncomeModal } from "../IncomeModal";
import {
  grupos,
  itinerarios as itinerariosSeed,
  pasajeros,
  reportes,
  reservas,
} from "@/lib/backoffice-data";
import {
  buildItinerarioDetalle,
  type CreatedItinerario,
  type DiaOverride,
  type ItinOverride,
} from "@/lib/itinerary-wizard";
import { operacionesSeed } from "@/lib/operaciones";
import { useNavigationFocus } from "@/lib/navigation";
import { buildRentabilidadDetalle, downloadRentabilidadXlsx } from "@/lib/reservas-financiero";
import { cn } from "@/lib/utils";

const regionTagColors: Record<string, string> = {
  Galápagos: "0.42 0.09 165",
  Amazonía: "0.58 0.1 145",
  Andes: "0.74 0.14 68",
  Costa: "0.79 0.06 100",
  Personalizado: "0.55 0.02 150",
};

function regionTagStyle(region: string): CSSProperties {
  const [l, c, h] = (regionTagColors[region] ?? regionTagColors["Personalizado"]!).split(" ");
  return {
    background: `oklch(0.95 0.02 ${h} / 0.5)`,
    color: `oklch(${l} ${c} ${h})`,
  };
}

function ReservaFinancialPanel({
  exp,
  cliente,
  programa,
  saldoCliente,
}: {
  exp: string;
  cliente: string;
  programa: string;
  saldoCliente: string;
}) {
  const detalle = buildRentabilidadDetalle(exp, saldoCliente);
  const fmtUsd = (n: number) => "$" + Math.round(n).toLocaleString();

  return (
    <div className="grid gap-4 p-5 md:grid-cols-2">
      <div>
        <div className="eyebrow mb-2 text-muted-foreground">Ventas</div>
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="pb-1.5 font-semibold">Concepto</th>
              <th className="pb-1.5 text-right font-semibold">Monto</th>
              <th className="pb-1.5 pl-3 text-right font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {detalle.ventas.map((v, i) => (
              <tr key={i} className="border-t border-border/60">
                <td className="py-1.5">{v.concepto}</td>
                <td className="py-1.5 text-right font-semibold">{fmtUsd(v.monto)}</td>
                <td className="py-1.5 pl-3 text-right">
                  <Badge tone={estadoTone(v.estado === "Pagado" ? "Pagada" : "Pendiente")}>
                    {v.estado}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="eyebrow mt-4 mb-2 text-muted-foreground">Costos (pagos a proveedor)</div>
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="pb-1.5 font-semibold">Concepto</th>
              <th className="pb-1.5 text-right font-semibold">Monto</th>
              <th className="pb-1.5 pl-3 text-right font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {detalle.costos.map((c, i) => (
              <tr key={i} className="border-t border-border/60">
                <td className="py-1.5">{c.concepto}</td>
                <td className="py-1.5 text-right font-semibold">{fmtUsd(c.monto)}</td>
                <td className="py-1.5 pl-3 text-right">
                  <Badge tone={estadoTone(c.estado === "Pagado" ? "Pagada" : "Pendiente")}>
                    {c.estado}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <div className="rounded-xl bg-secondary/50 p-4">
          <div className="mb-2 font-display text-[13.5px] font-semibold">Rentabilidad</div>
          <div className="flex justify-between text-[12.5px] text-muted-foreground">
            <span>Ingreso</span>
            <span className="font-semibold text-foreground">{fmtUsd(detalle.ingreso)}</span>
          </div>
          <div className="flex justify-between text-[12.5px] text-muted-foreground">
            <span>Costo</span>
            <span className="font-semibold text-foreground">{fmtUsd(detalle.costo)}</span>
          </div>
          <div className="mt-1.5 flex justify-between border-t border-border pt-1.5 text-[13px] font-semibold">
            <span>Margen ({detalle.margenPct.toFixed(1)} %)</span>
            <span className="text-primary">{fmtUsd(detalle.margen)}</span>
          </div>
          {detalle.porPagarTotal > 0 ? (
            <div className="mt-2 text-[11.5px] text-warning-foreground">
              {fmtUsd(detalle.porPagarTotal)} pendientes de pago a proveedores
            </div>
          ) : null}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <GhostButton
            onClick={() =>
              downloadRentabilidadXlsx(
                `${exp} ${cliente} ${programa}`.replace(/[^\w\- ]/g, "").trim() + ".xlsx",
                exp,
                cliente,
                programa,
                detalle,
              )
            }
          >
            Descargar Excel
          </GhostButton>
        </div>
      </div>
    </div>
  );
}

export function Reservas() {
  const [filtro, setFiltro] = useState("Todas");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [incomeExp, setIncomeExp] = useState<string | null>(null);
  const opciones = ["Todas", "Confirmado", "Operando", "Cerrado", "Cancelado"];
  const rows = filtro === "Todas" ? reservas : reservas.filter((r) => r.estado === filtro);

  const { focusExp, clearFocus } = useNavigationFocus();
  useEffect(() => {
    if (focusExp) {
      setExpanded(focusExp);
      setFiltro("Todas");
      clearFocus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusExp]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs options={opciones} value={filtro} onChange={setFiltro} />
        <div className="flex gap-2">
          <GhostButton>Exportar</GhostButton>
          <PrimaryButton>+ Nueva reserva</PrimaryButton>
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <TableHead
              cols={[
                { label: "Expediente" },
                { label: "Cliente" },
                { label: "Programa" },
                { label: "Pax" },
                { label: "Margen" },
                { label: "Saldo cliente" },
                { label: "Saldo proveedor" },
                { label: "Estado" },
                { label: "" },
              ]}
            />
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.exp}>
                  <tr
                    onClick={() => setExpanded((cur) => (cur === r.exp ? null : r.exp))}
                    className="cursor-pointer border-t border-border hover:bg-secondary/40"
                  >
                    <td className="px-6 py-3.5 font-semibold text-primary whitespace-nowrap">
                      {r.exp}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">{r.cliente}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{r.programa}</td>
                    <td className="px-6 py-3.5">{r.pax}</td>
                    <td className="px-6 py-3.5 font-semibold">{r.margen}</td>
                    <td className="px-6 py-3.5">
                      <span
                        className={
                          r.saldoCliente === "Pagado" ? "text-muted-foreground" : "font-semibold"
                        }
                      >
                        {r.saldoCliente}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={
                          r.saldoProveedor === "Pagado" ? "text-muted-foreground" : "font-semibold"
                        }
                      >
                        {r.saldoProveedor}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge tone={estadoTone(r.estado)}>{r.estado}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground">
                      <span
                        className={cn(
                          "inline-block transition-transform",
                          expanded === r.exp && "rotate-180",
                        )}
                      >
                        ▾
                      </span>
                    </td>
                  </tr>
                  {expanded === r.exp ? (
                    <tr>
                      <td colSpan={9} className="bg-secondary/30 p-0">
                        <div className="flex items-center justify-end gap-2 px-5 pt-3">
                          <PrimaryButton onClick={() => setIncomeExp(r.exp)}>
                            Registrar pago
                          </PrimaryButton>
                        </div>
                        <ReservaFinancialPanel
                          exp={r.exp}
                          cliente={r.cliente}
                          programa={r.programa}
                          saldoCliente={r.saldoCliente}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {incomeExp ? <IncomeModal exp={incomeExp} onClose={() => setIncomeExp(null)} /> : null}
    </div>
  );
}

export function Pasajeros() {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Pasajeros"
        subtitle="Datos personales, documentos y requerimientos especiales"
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <TableHead
            cols={[
              { label: "Pasajero" },
              { label: "Pasaporte" },
              { label: "Nacionalidad" },
              { label: "Expediente" },
              { label: "Dieta / notas" },
              { label: "Docs" },
            ]}
          />
          <tbody>
            {pasajeros.map((p) => (
              <tr key={p.pasaporte} className="border-t border-border hover:bg-secondary/40">
                <td className="px-6 py-3.5 font-medium whitespace-nowrap">{p.nombre}</td>
                <td className="px-6 py-3.5 text-muted-foreground">{p.pasaporte}</td>
                <td className="px-6 py-3.5">{p.nacionalidad}</td>
                <td className="px-6 py-3.5 font-semibold text-primary">{p.exp}</td>
                <td className="px-6 py-3.5 text-muted-foreground">{p.dieta}</td>
                <td className="px-6 py-3.5">
                  <Badge tone={estadoTone(p.docs)}>{p.docs}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function Grupos() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {grupos.map((g) => (
        <Card key={g.nombre} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[15px] font-semibold">{g.nombre}</h3>
            <Badge tone="info">{g.pax} pax</Badge>
          </div>
          <p className="mt-2 text-[13px]">{g.programa}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">{g.detalle}</p>
          <div className="mt-4 flex items-center justify-between text-[12px] text-muted-foreground">
            <span>Documentación</span>
            <span className="font-semibold text-foreground">{g.docs} %</span>
          </div>
          <div className="mt-2">
            <Progress value={g.docs} tone={g.docs === 100 ? "primary" : "accent"} />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function Itinerarios() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [creados, setCreados] = useState<CreatedItinerario[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [itinOverrides, setItinOverrides] = useState<Record<string, ItinOverride>>({});
  const [itinEditMode, setItinEditMode] = useState<Record<string, boolean>>({});
  const itinerarios = [...itinerariosSeed, ...creados];

  function handleCreated(it: CreatedItinerario) {
    setCreados((prev) => [...prev, it]);
  }

  function updateHotelField(nombre: string, hotelIdx: number, value: string) {
    setItinOverrides((prev) => {
      const cur = prev[nombre] ?? {};
      const hoteles = { ...(cur.hoteles ?? {}) };
      hoteles[hotelIdx] = { ...(hoteles[hotelIdx] ?? {}), tier: value };
      return { ...prev, [nombre]: { ...cur, hoteles } };
    });
  }

  function updatePrecio(
    nombre: string,
    tabla: "25" | "30",
    hotelIdx: number,
    paxIdx: number,
    value: number,
  ) {
    setItinOverrides((prev) => {
      const cur = prev[nombre] ?? {};
      const tablaObj = { ...(cur.precios?.[tabla] ?? {}) };
      tablaObj[hotelIdx] = { ...(tablaObj[hotelIdx] ?? {}), [paxIdx]: value };
      return { ...prev, [nombre]: { ...cur, precios: { ...cur.precios, [tabla]: tablaObj } } };
    });
  }

  function updateDia(nombre: string, diaIdx: number, patch: DiaOverride) {
    setItinOverrides((prev) => {
      const cur = prev[nombre] ?? {};
      const dias = { ...(cur.dias ?? {}) };
      dias[diaIdx] = { ...(dias[diaIdx] ?? {}), ...patch };
      return { ...prev, [nombre]: { ...cur, dias } };
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-end">
        {wizardOpen ? (
          <GhostButton onClick={() => setWizardOpen(false)}>Cancelar</GhostButton>
        ) : (
          <PrimaryButton onClick={() => setWizardOpen(true)}>+ Nuevo itinerario</PrimaryButton>
        )}
      </div>

      {wizardOpen ? (
        <NewItineraryWizard
          onClose={() => setWizardOpen(false)}
          onCreated={(it) => {
            handleCreated(it);
          }}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {itinerarios.map((i, idx) => {
            const key = `${i.nombre}-${idx}`;
            const detalle = buildItinerarioDetalle(i.nombre, itinOverrides[i.nombre] ?? {});
            const precioMostrado = detalle ? `${detalle.precioRango} / pax` : i.precio;
            return (
              <Card key={key} className="p-5">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-xl text-center font-display text-[10.5px] leading-tight font-semibold"
                    style={regionTagStyle(i.region)}
                  >
                    {i.region}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[14.5px] font-semibold">{i.nombre}</h3>
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">{i.detalle}</p>
                    <button
                      type="button"
                      onClick={() => setExpandido(i.nombre)}
                      className="mt-2 rounded-lg border border-success bg-success/40 px-3 py-1.5 text-[12px] font-semibold text-primary"
                    >
                      Ver itinerario
                    </button>
                  </div>
                  <div className="text-right font-display text-[13.5px] font-semibold whitespace-nowrap">
                    {precioMostrado}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {expandido ? (
        buildItinerarioDetalle(expandido, itinOverrides[expandido] ?? {}) ? (
          <ItinerarioDetailModal
            nombre={expandido}
            duracion={itinerariosSeed.find((s) => s.nombre === expandido)?.detalle ?? ""}
            override={itinOverrides[expandido] ?? {}}
            editMode={!!itinEditMode[expandido]}
            onClose={() => setExpandido(null)}
            onToggleEdit={() =>
              setItinEditMode((prev) => ({ ...prev, [expandido]: !prev[expandido] }))
            }
            onHotelTierChange={(hotelIdx, value) => updateHotelField(expandido, hotelIdx, value)}
            onPrecioChange={(tabla, hotelIdx, paxIdx, value) =>
              updatePrecio(expandido, tabla, hotelIdx, paxIdx, value)
            }
            onDiaTituloChange={(diaIdx, value) => updateDia(expandido, diaIdx, { titulo: value })}
            onDiaItemsChange={(diaIdx, items) => updateDia(expandido, diaIdx, { items })}
            onDiaComidasChange={(diaIdx, value) => updateDia(expandido, diaIdx, { comidas: value })}
          />
        ) : (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-7"
            onClick={() => setExpandido(null)}
          >
            <div
              className="rounded-2xl bg-card p-7 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[13px] text-muted-foreground">
                Este itinerario personalizado aún no tiene un desglose día a día guardado.
              </p>
              <GhostButton className="mt-4" onClick={() => setExpandido(null)}>
                Cerrar
              </GhostButton>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}

export function Operaciones() {
  const operaciones = operacionesSeed();
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {operaciones.map((o) => (
        <OperacionCard key={o.exp} o={o} />
      ))}
    </div>
  );
}

export function Bloqueos() {
  return <BloqueosScreen />;
}

export function Calendario() {
  return <CalendarioScreen />;
}

export function Notas() {
  return <NotasScreen />;
}

export function Proveedores() {
  return <ProveedoresScreen />;
}

export function Reportes() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {reportes.map((r) => (
        <Card key={r.nombre} className="flex flex-col p-5">
          <h3 className="text-[15px] font-semibold">{r.nombre}</h3>
          <p className="mt-2 flex-1 text-[13px] text-muted-foreground">{r.detalle}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">Última generación: {r.ultima}</span>
            <GhostButton className="px-3 py-2">Generar</GhostButton>
          </div>
        </Card>
      ))}
    </div>
  );
}
