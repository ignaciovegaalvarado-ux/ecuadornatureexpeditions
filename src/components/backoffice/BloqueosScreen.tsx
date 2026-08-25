import { Plus } from "lucide-react";
import { useState } from "react";
import { Badge, Card, DataTable, FilterTabs, PrimaryButton, TableHead, estadoTone } from "./ui";
import { BloqueoDetailModal } from "./BloqueoDetailModal";
import { NewBloqueoModal } from "./NewBloqueoModal";
import {
  bloqueoEstado,
  bloqueosSeed,
  buildBloqueoFromDraft,
  cantidadTotal,
  expedientesBloqueoPendienteSeed,
  fmtFechaCorta,
  freshBloqueoDraft,
  habitacionesResumen,
  type Bloqueo,
  type BloqueoDraft,
  type PendienteBloqueo,
} from "@/lib/bloqueos";
import { proximasSalidas } from "@/lib/backoffice-data";
import { cn } from "@/lib/utils";

type Tab = "bloqueos" | "reservas";

export function BloqueosScreen() {
  const [tab, setTab] = useState<Tab>("bloqueos");
  const [overrides, setOverrides] = useState<Record<string, Bloqueo>>({});
  const [created, setCreated] = useState<Bloqueo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [newOpen, setNewOpen] = useState(false);
  const [draft, setDraft] = useState<BloqueoDraft | null>(null);

  const seed = bloqueosSeed();
  const all: Bloqueo[] = [...seed.map((b) => overrides[b.id] ?? b), ...created];

  function updateBloqueo(id: string, fn: (b: Bloqueo) => Bloqueo) {
    const seedItem = seed.find((b) => b.id === id);
    if (seedItem) {
      setOverrides((prev) => ({ ...prev, [id]: fn(prev[id] ?? seedItem) }));
    } else {
      setCreated((prev) => prev.map((b) => (b.id === id ? fn(b) : b)));
    }
  }

  const rows = all.map((b) => ({ raw: b, estado: bloqueoEstado(b) }));
  const rowsActivos = rows.filter((r) => r.estado !== "Convertido en reserva");
  const reservasConvertidas = rows.filter((r) => r.estado === "Convertido en reserva");

  const pendientesSeed: (PendienteBloqueo & {
    cliente: string;
    programa: string;
    fechasViaje: string;
  })[] = expedientesBloqueoPendienteSeed()
    .filter((p) => !all.some((b) => b.exp === p.exp))
    .map((p) => {
      const salida = proximasSalidas.find((r) => r.exp === p.exp);
      return {
        ...p,
        cliente: salida?.cliente ?? p.exp,
        programa: salida?.programa ?? "",
        fechasViaje: salida?.fechas ?? "",
      };
    });

  function startNewBloqueo(prefill?: PendienteBloqueo) {
    setDraft(freshBloqueoDraft(prefill));
    setNewOpen(true);
  }

  function submitNewBloqueo() {
    if (!draft || !draft.hotel || !draft.fechaIn || !draft.fechaOut) return;
    const nuevo = buildBloqueoFromDraft(draft);
    setCreated((prev) => [...prev, nuevo]);
    setNewOpen(false);
    setDraft(null);
    setSelectedId(nuevo.id);
  }

  const selected = selectedId ? all.find((b) => b.id === selectedId) : null;

  return (
    <div className="flex flex-col gap-4">
      <FilterTabs
        options={["Bloqueos", "Reservas"]}
        value={tab === "bloqueos" ? "Bloqueos" : "Reservas"}
        onChange={(v) => setTab(v === "Bloqueos" ? "bloqueos" : "reservas")}
      />

      {tab === "bloqueos" ? (
        <div className="flex flex-col gap-4">
          {pendientesSeed.length ? (
            <Card className="overflow-hidden border-primary/20">
              <div className="px-5.5 pt-4.5 font-display text-[15px] font-semibold">
                Requieren gestión de bloqueo
              </div>
              <p className="px-5.5 pb-1 text-[12.5px] text-muted-foreground">
                Expedientes con itinerario confirmado que aún no tienen bloqueo de hotel generado.
              </p>
              {pendientesSeed.map((p) => (
                <div
                  key={p.exp}
                  className="flex flex-wrap items-center gap-4 border-t border-border px-5.5 py-3.5"
                >
                  <div className="min-w-[160px]">
                    <div className="font-display text-[12.5px] font-semibold text-primary">
                      {p.exp}
                    </div>
                    <div className="mt-0.5 text-[12.5px]">{p.cliente}</div>
                  </div>
                  <div className="min-w-[190px] text-[12.5px] text-muted-foreground">
                    {p.programa}
                    <br />
                    <span>Viaje: {p.fechasViaje}</span>
                  </div>
                  <div className="min-w-[190px] text-[12.5px] text-muted-foreground">
                    {p.hotel}
                    <br />
                    <span>
                      {fmtFechaCorta(p.fechaIn)} – {fmtFechaCorta(p.fechaOut)} ·{" "}
                      {habitacionesResumen(p.habitaciones)}
                    </span>
                  </div>
                  <div className="flex-1" />
                  <PrimaryButton className="whitespace-nowrap" onClick={() => startNewBloqueo(p)}>
                    Generar bloqueo
                  </PrimaryButton>
                </div>
              ))}
            </Card>
          ) : null}

          <Card className="overflow-hidden">
            <div className="flex items-center gap-3 px-5.5 pt-4.5 pb-3.5">
              <div className="font-display text-[15px] font-semibold">Bloqueos activos</div>
              <div className="flex-1" />
              <PrimaryButton className="whitespace-nowrap" onClick={() => startNewBloqueo()}>
                <Plus aria-hidden strokeWidth={2.25} className="h-4 w-4" />
                Nuevo bloqueo
              </PrimaryButton>
            </div>
            <DataTable stackAt="wide">
              <table className="w-full border-collapse text-[13px]">
                <TableHead
                  cols={[
                    { label: "Expediente" },
                    { label: "Hotel" },
                    { label: "Fechas del viaje" },
                    { label: "Habitaciones" },
                    { label: "Creado" },
                    { label: "Fecha límite" },
                    { label: "Estado" },
                  ]}
                />
                <tbody>
                  {rowsActivos.map(({ raw: b, estado }) => (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedId(b.id)}
                      className="cursor-pointer border-t border-border align-top hover:bg-secondary/40"
                    >
                      <td className="px-4 py-3 numeric font-semibold text-primary whitespace-nowrap">
                        {b.exp}
                      </td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{b.hotel}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {fmtFechaCorta(b.fechaIn)} – {fmtFechaCorta(b.fechaOut)}
                      </td>
                      <td className="max-w-[240px] px-4 py-3 text-muted-foreground">
                        {habitacionesResumen(b.habitaciones)}{" "}
                        <span className="font-semibold text-foreground">
                          ({cantidadTotal(b.habitaciones)})
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{b.creado}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {fmtFechaCorta(b.fechaLimite)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={estadoTone(estado)}>{estado}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reservasConvertidas.length ? (
            <Card className="overflow-hidden">
              <div className="px-5.5 pt-4.5 pb-3.5 font-display text-[15px] font-semibold">
                Reservas confirmadas
              </div>
              <DataTable stackAt="wide">
                <table className="w-full border-collapse text-[13px]">
                  <TableHead
                    cols={[
                      { label: "Expediente" },
                      { label: "Hotel" },
                      { label: "Fechas del viaje" },
                      { label: "Habitaciones" },
                      { label: "Pasajeros" },
                      { label: "Origen" },
                    ]}
                  />
                  <tbody>
                    {reservasConvertidas.map(({ raw: b }) => (
                      <tr
                        key={b.id}
                        onClick={() => setSelectedId(b.id)}
                        className="cursor-pointer border-t border-border hover:bg-secondary/40"
                      >
                        <td className="px-4 py-3 numeric font-semibold text-primary whitespace-nowrap">
                          {b.exp}
                        </td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">{b.hotel}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {fmtFechaCorta(b.fechaIn)} – {fmtFechaCorta(b.fechaOut)}
                        </td>
                        <td className="max-w-[240px] px-4 py-3 text-muted-foreground">
                          {habitacionesResumen(b.habitaciones)}{" "}
                          <span className="font-semibold text-foreground">
                            ({cantidadTotal(b.habitaciones)})
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{b.pasajerosTxt}</td>
                        <td className="px-4 py-3">
                          <Badge tone="info">Desde bloqueo</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTable>
            </Card>
          ) : null}
          <Card className="p-8 text-center">
            <div className="mx-auto max-w-[520px] rounded-xl border border-dashed border-border p-6">
              <div className="mb-1.5 font-display text-[15px] font-semibold">
                Flujo completo de reservas — disponible próximamente
              </div>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Datos definitivos, documento de reserva y confirmación con el hotel se incorporarán
                aquí. Por ahora, un bloqueo marcado como "Convertido en reserva" aparece
                automáticamente en esta lista.
              </p>
            </div>
          </Card>
        </div>
      )}

      {selected ? (
        <BloqueoDetailModal
          bloqueo={selected}
          editMode={!!editMode[selected.id]}
          onClose={() => setSelectedId(null)}
          onToggleEdit={() =>
            setEditMode((prev) => ({ ...prev, [selected.id]: !prev[selected.id] }))
          }
          onUpdate={(fn) => updateBloqueo(selected.id, fn)}
        />
      ) : null}

      {newOpen && draft ? (
        <NewBloqueoModal
          draft={draft}
          onChange={(fn) => setDraft((d) => (d ? fn(d) : d))}
          onCancel={() => {
            setNewOpen(false);
            setDraft(null);
          }}
          onSubmit={submitNewBloqueo}
        />
      ) : null}
    </div>
  );
}
