import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Card, GhostButton, PrimaryButton, RemoveButton } from "./ui";
import { pasajeros } from "@/lib/backoffice-data";
import {
  applyChatCommand,
  buildItinerarioFromWizard,
  computeTotals,
  dayHotelIncluded,
  freshWizard,
  paxToBracket,
  tourCatalog,
  type CreatedItinerario,
  type HotelMode,
  type WizardState,
} from "@/lib/itinerary-wizard";
import { cn } from "@/lib/utils";

const steps = ["Pasajeros", "Itinerario", "Confirmación"] as const;
const fmt = (n: number) => "$" + Math.round(n).toLocaleString();

export function NewItineraryWizard({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (it: CreatedItinerario) => void;
}) {
  const [w, setW] = useState<WizardState>(() => freshWizard());
  const [sent, setSent] = useState(false);
  const catalog = useMemo(() => tourCatalog(), []);

  const numPax = Math.max(1, w.pax.length);
  const selProgram = w.programName ? catalog.list.find((p) => p[0] === w.programName) : null;
  const selDetalle = w.programName ? catalog.detalles[w.programName] : null;
  const isPackageMode = !!selProgram;
  const totals = computeTotals(w);

  let packageBase = 0;
  if (selProgram && selDetalle) {
    const bracket = paxToBracket(numPax);
    const tier = selDetalle.hoteles[w.programHotelIdx]!.tier;
    packageBase = w.priceOverride ?? selDetalle.priceTables["25"]![tier]![bracket]!;
  } else if (selProgram) {
    packageBase = w.priceOverride ?? Number(String(selProgram[4]).replace(/[^0-9]/g, ""));
  }

  const pricePerPax = isPackageMode ? packageBase : totals.perPax;
  const priceTotal = isPackageMode ? packageBase * numPax : totals.total;

  const canNext =
    w.step !== 1 ||
    w.pax.some((p) => p.nombre.trim().length > 0 || w.pax.length > 1) ||
    numPax >= 1;

  function updatePax(i: number, field: keyof WizardState["pax"][number], value: string) {
    setW((s) => ({ ...s, pax: s.pax.map((p, j) => (j === i ? { ...p, [field]: value } : p)) }));
  }

  function handleSend() {
    const itinerario = buildItinerarioFromWizard(w);
    onCreated(itinerario);
    setSent(true);
  }

  function sendChat() {
    const text = w.chatInput.trim();
    if (!text) return;
    setW((s) => applyChatCommand(s, text));
  }

  return (
    <Card className="p-6 md:p-7">
      <div className="mb-6 flex items-center gap-7 border-b border-border pb-5">
        {steps.map((label, i) => {
          const n = i + 1;
          const state = n < w.step ? "done" : n === w.step ? "active" : "pending";
          return (
            <div key={label} className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-6.5 w-6.5 items-center justify-center rounded-full font-display text-[12.5px] font-semibold",
                  state === "pending"
                    ? "bg-secondary text-muted-foreground"
                    : "bg-primary text-primary-foreground",
                )}
              >
                {n}
              </div>
              <div
                className={cn(
                  "text-[13px]",
                  state === "active" ? "font-bold text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {w.step === 1 ? (
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h3 className="text-[15px] font-semibold">Pasajeros del grupo</h3>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Captura manual, o carga documentos para que la IA extraiga los datos
            </p>
            <div className="mt-3.5 flex flex-col gap-2.5">
              {w.pax.map((p, i) => (
                <div key={i} className="grid grid-cols-[1.3fr_1fr_1fr_1fr_auto] items-center gap-2">
                  <input
                    value={p.nombre}
                    onChange={(e) => updatePax(i, "nombre", e.target.value)}
                    placeholder="Nombre completo"
                    className="rounded-lg border border-border px-2.5 py-2 text-[13px] outline-none"
                  />
                  <input
                    value={p.pasaporte}
                    onChange={(e) => updatePax(i, "pasaporte", e.target.value)}
                    placeholder="Pasaporte"
                    className="rounded-lg border border-border px-2.5 py-2 text-[13px] outline-none"
                  />
                  <input
                    value={p.nacionalidad}
                    onChange={(e) => updatePax(i, "nacionalidad", e.target.value)}
                    placeholder="Nacionalidad"
                    className="rounded-lg border border-border px-2.5 py-2 text-[13px] outline-none"
                  />
                  <input
                    value={p.dieta}
                    onChange={(e) => updatePax(i, "dieta", e.target.value)}
                    placeholder="Dieta / alergias"
                    className="rounded-lg border border-border px-2.5 py-2 text-[13px] outline-none"
                  />
                  <RemoveButton
                    onClick={() => setW((s) => ({ ...s, pax: s.pax.filter((_, j) => j !== i) }))}
                  />
                </div>
              ))}
              <div className="mt-1 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setW((s) => ({
                      ...s,
                      pax: [...s.pax, { nombre: "", pasaporte: "", nacionalidad: "", dieta: "" }],
                    }))
                  }
                  className="text-[13px] font-semibold text-primary"
                >
                  + Agregar pasajero nuevo
                </button>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const rp = pasajeros.find((r) => r.nombre === e.target.value);
                    if (!rp) return;
                    setW((s) => ({
                      ...s,
                      pax: [
                        ...s.pax,
                        {
                          nombre: rp.nombre,
                          pasaporte: rp.pasaporte,
                          nacionalidad: rp.nacionalidad,
                          dieta: rp.dieta,
                        },
                      ],
                    }));
                    e.target.value = "";
                  }}
                  className="rounded-lg border border-border bg-card px-2.5 py-2 text-[12.5px] font-semibold text-primary"
                >
                  <option value="" disabled>
                    + Usar pasajero registrado…
                  </option>
                  {pasajeros.map((rp) => (
                    <option key={rp.pasaporte} value={rp.nombre}>
                      {rp.nombre} · {rp.pasaporte}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[15px] font-semibold">Documentos de pasajeros</h3>
            <p className="mt-1 text-[12.5px] text-muted-foreground">PDF, Word, imagen o Excel</p>
            <div className="mt-3.5 rounded-lg border-2 border-dashed border-primary/40 px-5 py-6 text-center">
              <div className="mx-auto mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-success">
                <span className="h-3.5 w-3.5 rounded-[3px] border-2 border-primary" />
              </div>
              <div className="text-[13px] font-semibold">Arrastra archivos aquí</div>
              <p className="mt-0.5 mb-3 text-[11.5px] text-muted-foreground">
                La IA leerá nombres, pasaportes y fechas automáticamente
              </p>
              <div className="inline-block rounded-lg bg-primary px-4 py-2 text-[12.5px] font-semibold text-primary-foreground">
                Subir archivos
              </div>
            </div>
            {w.files.map((f) => (
              <div
                key={f.nombre}
                className="flex items-center gap-2.5 border-t border-border/60 py-2.5"
              >
                <div className="flex-1 truncate text-[12.5px] font-semibold">{f.nombre}</div>
                <Badge tone="success">{f.estado}</Badge>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {w.step === 2 ? (
        <div>
          <div className="mb-3.5 flex flex-wrap items-center gap-4">
            <div>
              <h3 className="text-[15px] font-semibold">Itinerario propuesto</h3>
              <p className="text-[12.5px] text-muted-foreground">Edita según el caso</p>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2.5 rounded-lg bg-secondary px-3.5 py-2">
              <span className="text-[12.5px] font-semibold text-muted-foreground">Pasajeros</span>
              <span className="font-display text-[14px] font-bold">{numPax}</span>
              <span className="text-[11px] text-muted-foreground">(paso 1)</span>
            </div>
          </div>

          <div className="mb-4.5 flex flex-wrap items-center gap-2.5 rounded-xl bg-success/40 p-3">
            <span className="min-w-[190px] text-[12.5px] font-semibold">
              Cargar programa ya registrado
            </span>
            <select
              value={w.programName ?? ""}
              onChange={(e) =>
                setW((s) => ({
                  ...s,
                  programName: e.target.value || null,
                  priceOverride: null,
                  programHotelIdx: 0,
                }))
              }
              className="rounded-lg border border-border bg-card px-2.5 py-2 text-[12.5px] font-semibold"
            >
              <option value="">Personalizado (Ruta del Chocolate)</option>
              {catalog.list.map((p) => (
                <option key={p[0]} value={p[0]}>
                  {p[0]}
                </option>
              ))}
            </select>
            {selDetalle ? (
              <div className="flex flex-wrap gap-1.5">
                {selDetalle.hoteles.map((h, i) => (
                  <button
                    key={h.tier}
                    type="button"
                    onClick={() => setW((s) => ({ ...s, programHotelIdx: i, priceOverride: null }))}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[12px] font-semibold",
                      i === w.programHotelIdx
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground",
                    )}
                  >
                    {h.tier}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-5 md:grid-cols-[1.5fr_1fr]">
            <div className="flex flex-col gap-3">
              {isPackageMode
                ? selDetalle
                  ? selDetalle.dias.map((d) => (
                      <div key={d.n} className="rounded-xl border border-border p-4">
                        <div className="mb-2 flex items-baseline gap-2.5">
                          <span className="font-display text-[13px] font-bold text-primary">
                            Día {d.n}
                          </span>
                          <span className="text-[13.5px] font-semibold">{d.titulo}</span>
                        </div>
                        {d.items.map((it) => (
                          <div key={it} className="relative pl-3 text-[12px] text-muted-foreground">
                            <span className="absolute left-0">·</span>
                            {it}
                          </div>
                        ))}
                        {d.alojamiento ? (
                          <div className="mt-2 text-[11.5px] font-semibold text-muted-foreground">
                            Alojamiento: {selDetalle.hoteles[w.programHotelIdx]![d.alojamiento]}
                          </div>
                        ) : null}
                        {d.comidas ? (
                          <div className="mt-0.5 text-[11px] text-muted-foreground/80">
                            Comidas: {d.comidas}
                          </div>
                        ) : null}
                      </div>
                    ))
                  : Array.from(
                      { length: parseInt(String(selProgram![2])) || 3 },
                      (_, i) => i + 1,
                    ).map((n) => (
                      <div key={n} className="rounded-xl border border-border p-4">
                        <span className="font-display text-[13px] font-bold text-primary">
                          Día {n}
                        </span>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                          Actividades según itinerario base de {selProgram![1]} (detalle a confirmar
                          con el operador)
                        </p>
                      </div>
                    ))
                : w.days.map((d, di) => {
                    const included = dayHotelIncluded(w, d.num);
                    const hotelPax = d.hotelPaxOverride ?? numPax;
                    return (
                      <div key={d.num} className="rounded-xl border border-border p-4">
                        <div className="mb-2 flex items-baseline gap-2.5">
                          <span className="font-display text-[13px] font-bold text-primary">
                            Día {d.num}
                          </span>
                          <span className="text-[13.5px] font-semibold">{d.titulo}</span>
                        </div>
                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2 py-1.5",
                            included ? "bg-success/60" : "bg-secondary",
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 flex-none rounded-full",
                              included ? "bg-primary" : "bg-muted-foreground/40",
                            )}
                          />
                          <span
                            className={cn(
                              "text-[12px]",
                              included ? "" : "text-muted-foreground line-through",
                            )}
                          >
                            Alojamiento: {d.hotel}
                          </span>
                          <span className="flex-1" />
                          {included ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setW((s) => ({
                                    ...s,
                                    days: s.days.map((dd, k) =>
                                      k === di
                                        ? {
                                            ...dd,
                                            hotelPaxOverride: Math.max(
                                              0,
                                              (dd.hotelPaxOverride ?? numPax) - 1,
                                            ),
                                          }
                                        : dd,
                                    ),
                                  }))
                                }
                                className="flex h-4.5 w-4.5 items-center justify-center rounded bg-card text-[11px] font-bold"
                              >
                                −
                              </button>
                              <span className="w-3.5 text-center text-[11px] font-bold">
                                {hotelPax}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setW((s) => ({
                                    ...s,
                                    days: s.days.map((dd, k) =>
                                      k === di
                                        ? {
                                            ...dd,
                                            hotelPaxOverride: Math.min(
                                              30,
                                              (dd.hotelPaxOverride ?? numPax) + 1,
                                            ),
                                          }
                                        : dd,
                                    ),
                                  }))
                                }
                                className="flex h-4.5 w-4.5 items-center justify-center rounded bg-card text-[11px] font-bold"
                              >
                                +
                              </button>
                            </div>
                          ) : null}
                          <span className="text-[11.5px] font-semibold text-muted-foreground">
                            {included ? "+" + fmt(d.hotelPrice) + " c/u" : "no incluido"}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-col gap-1.5">
                          {d.actividades.map((a, ai) => {
                            const aPax = a.paxOverride ?? numPax;
                            return (
                              <div
                                key={ai}
                                className="flex items-center gap-2 rounded-lg bg-secondary/60 px-2.5 py-1.5"
                              >
                                <div className="flex-1 text-[12.5px]">{a.texto}</div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setW((s) => ({
                                        ...s,
                                        days: s.days.map((dd, k) =>
                                          k === di
                                            ? {
                                                ...dd,
                                                actividades: dd.actividades.map((aa, m) =>
                                                  m === ai
                                                    ? {
                                                        ...aa,
                                                        paxOverride: Math.max(
                                                          0,
                                                          (aa.paxOverride ?? numPax) - 1,
                                                        ),
                                                      }
                                                    : aa,
                                                ),
                                              }
                                            : dd,
                                        ),
                                      }))
                                    }
                                    className="flex h-4.5 w-4.5 items-center justify-center rounded bg-card text-[11px] font-bold"
                                  >
                                    −
                                  </button>
                                  <span className="w-3.5 text-center text-[11px] font-bold">
                                    {aPax}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setW((s) => ({
                                        ...s,
                                        days: s.days.map((dd, k) =>
                                          k === di
                                            ? {
                                                ...dd,
                                                actividades: dd.actividades.map((aa, m) =>
                                                  m === ai
                                                    ? {
                                                        ...aa,
                                                        paxOverride: Math.min(
                                                          30,
                                                          (aa.paxOverride ?? numPax) + 1,
                                                        ),
                                                      }
                                                    : aa,
                                                ),
                                              }
                                            : dd,
                                        ),
                                      }))
                                    }
                                    className="flex h-4.5 w-4.5 items-center justify-center rounded bg-card text-[11px] font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                                <span className="whitespace-nowrap text-[11.5px] font-semibold text-muted-foreground">
                                  {a.price ? "+" + fmt(a.price) + " c/u" : "incluido"}
                                </span>
                                <RemoveButton
                                  label="Quitar actividad"
                                  onClick={() =>
                                    setW((s) => ({
                                      ...s,
                                      days: s.days.map((dd, k) =>
                                        k === di
                                          ? {
                                              ...dd,
                                              actividades: dd.actividades.filter(
                                                (_, m) => m !== ai,
                                              ),
                                            }
                                          : dd,
                                      ),
                                    }))
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

              {!isPackageMode ? (
                <div className="flex flex-col gap-2.5 rounded-xl bg-secondary/50 p-3.5">
                  <span className="text-[12px] font-semibold text-muted-foreground">
                    Elementos generales del viaje
                  </span>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="min-w-[130px] text-[12.5px]">
                      Alojamiento (todos los hoteles)
                    </span>
                    <select
                      value={w.hotelMode}
                      onChange={(e) => {
                        const mode = e.target.value as HotelMode;
                        setW((s) => ({
                          ...s,
                          hotelMode: mode,
                          hotelDaysSelected:
                            mode === "todos"
                              ? s.days.map((d) => d.num)
                              : mode === "ninguno"
                                ? []
                                : s.hotelDaysSelected,
                        }));
                      }}
                      className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12.5px] font-semibold"
                    >
                      <option value="todos">Incluido todos los días</option>
                      <option value="algunos">Incluido solo algunos días</option>
                      <option value="ninguno">No incluido — cliente lo gestiona</option>
                    </select>
                    {w.hotelMode === "algunos" ? (
                      <div className="flex flex-wrap gap-1.5">
                        {w.days.map((d) => {
                          const checked = w.hotelDaysSelected.includes(d.num);
                          return (
                            <button
                              key={d.num}
                              type="button"
                              onClick={() =>
                                setW((s) => ({
                                  ...s,
                                  hotelDaysSelected: checked
                                    ? s.hotelDaysSelected.filter((n) => n !== d.num)
                                    : [...s.hotelDaysSelected, d.num],
                                }))
                              }
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-[11.5px] font-semibold",
                                checked
                                  ? "border-primary/30 bg-success text-primary"
                                  : "border-border bg-card text-muted-foreground",
                              )}
                            >
                              Día {d.num}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  {w.generalItems.map((g) => (
                    <div key={g.id} className="flex flex-wrap items-center gap-2.5">
                      <span className="min-w-[130px] text-[12.5px]">
                        {g.label} · {fmt(g.price)}
                      </span>
                      <select
                        value={g.included ? "si" : "no"}
                        onChange={(e) =>
                          setW((s) => ({
                            ...s,
                            generalItems: s.generalItems.map((gg) =>
                              gg.id === g.id ? { ...gg, included: e.target.value === "si" } : gg,
                            ),
                          }))
                        }
                        className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12.5px] font-semibold"
                      >
                        <option value="si">Incluido</option>
                        <option value="no">No incluido</option>
                      </select>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-secondary/60 p-4.5">
                <div className="mb-3 font-display text-[14px] font-bold">Cotización</div>
                <div className="mb-3 flex flex-col gap-1.5">
                  {isPackageMode ? (
                    <>
                      <div className="flex justify-between text-[12.5px] text-muted-foreground">
                        <span>Programa</span>
                        <span className="font-semibold text-foreground">{w.programName}</span>
                      </div>
                      <div className="flex justify-between text-[12.5px] text-muted-foreground">
                        <span>Categoría / tarifa aplicada</span>
                        <span className="font-semibold text-foreground">
                          {catalog.paxLabels[paxToBracket(numPax)]}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-[12.5px] text-muted-foreground">
                        <span>Servicios base (guía, transporte)</span>
                        <span className="font-semibold text-foreground">
                          {fmt(totals.baseCost)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[12.5px] text-muted-foreground">
                        <span>Alojamiento</span>
                        <span className="font-semibold text-foreground">
                          {fmt(totals.hotelCost)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[12.5px] text-muted-foreground">
                        <span>Actividades</span>
                        <span className="font-semibold text-foreground">{fmt(totals.actCost)}</span>
                      </div>
                      <div className="flex justify-between text-[12.5px] text-muted-foreground">
                        <span>Generales (vuelos, seguro...)</span>
                        <span className="font-semibold text-foreground">
                          {fmt(totals.generalCost)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-1 border-t border-border pt-3">
                  <div className="flex justify-between text-[12.5px] text-muted-foreground">
                    <span>Tarifa por pax</span>
                    <span className="font-semibold text-foreground">{fmt(pricePerPax)}</span>
                  </div>
                  <div className="mt-1 flex justify-between font-display text-[17px] font-bold">
                    <span>Total ({numPax} pax)</span>
                    <span>{fmt(priceTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="flex max-h-[340px] flex-col rounded-xl border border-border p-4">
                <div className="font-display text-[13.5px] font-semibold">
                  Asistente de itinerario
                </div>
                <p className="mb-2.5 text-[11.5px] text-muted-foreground">
                  Pídele cambios en lenguaje natural
                </p>
                <div className="mb-2.5 flex flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
                  {w.chat.map((m, i) => (
                    <div
                      key={i}
                      className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[88%] rounded-lg px-2.5 py-2 text-[12px] leading-snug",
                          m.from === "user" ? "bg-primary text-primary-foreground" : "bg-secondary",
                        )}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={w.chatInput}
                    onChange={(e) => setW((s) => ({ ...s, chatInput: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    placeholder="Ej: quita el hotel, el cliente se hospeda por su cuenta"
                    className="flex-1 rounded-lg border border-border px-2.5 py-2 text-[12.5px] outline-none"
                  />
                  <PrimaryButton className="px-3.5 py-2" onClick={sendChat}>
                    Enviar
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {w.step === 3 ? (
        !sent ? (
          <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
            <div>
              <h3 className="mb-3.5 text-[15px] font-semibold">Resumen del itinerario</h3>
              <div className="flex flex-col gap-2.5 rounded-xl border border-border p-4.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Programa</span>
                  <span className="font-semibold">
                    {w.programName ?? "Ruta del Chocolate · personalizado"}
                  </span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Pasajeros</span>
                  <span className="font-semibold">{numPax}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Días</span>
                  <span className="font-semibold">
                    {isPackageMode ? (selDetalle ? selDetalle.dias.length : "—") : w.days.length}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2.5 text-[13px]">
                  <span className="text-muted-foreground">Total cotizado</span>
                  <span className="font-display text-[15px] font-bold text-primary">
                    {fmt(priceTotal)}
                  </span>
                </div>
              </div>
              <h4 className="mt-4.5 mb-2 text-[13.5px] font-semibold">Pasajeros registrados</h4>
              <div className="flex flex-col gap-1.5">
                {(w.pax.filter((p) => p.nombre).length
                  ? w.pax
                      .filter((p) => p.nombre)
                      .map((p) => `${p.nombre}${p.nacionalidad ? " · " + p.nacionalidad : ""}`)
                  : [`${numPax} pasajeros (detalle pendiente)`]
                ).map((label) => (
                  <div
                    key={label}
                    className="rounded-lg bg-secondary/60 px-2.5 py-1.5 text-[12.5px] text-muted-foreground"
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-secondary/50 p-5.5 text-center">
              <div className="mb-1.5 font-display text-[14.5px] font-semibold">
                Enviar al cliente
              </div>
              <p className="mb-3.5 text-[12.5px] text-muted-foreground">
                Se enviará la cotización e itinerario por WhatsApp
              </p>
              <div className="mb-4 text-left">
                <label className="mb-1.5 block text-[11.5px] font-semibold text-muted-foreground">
                  Fecha de inicio del viaje
                </label>
                <input
                  type="date"
                  value={w.fechaInicio}
                  onChange={(e) => setW((s) => ({ ...s, fechaInicio: e.target.value }))}
                  className="w-full rounded-lg border border-border px-2.5 py-2 text-[12.5px] outline-none"
                />
              </div>
              <PrimaryButton className="w-full py-3 text-[14px]" onClick={handleSend}>
                Enviar por WhatsApp
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/20 text-success-ink">
              <Check aria-hidden strokeWidth={2.5} className="h-6 w-6" />
            </div>
            <div className="mb-1.5 font-display text-[16px] font-semibold">
              Itinerario enviado por WhatsApp
            </div>
            <p className="mb-4.5 text-[13px] text-muted-foreground">
              El cliente recibirá la cotización y el itinerario en su celular
            </p>
            <PrimaryButton onClick={onClose}>Volver a Itinerarios</PrimaryButton>
          </div>
        )
      ) : null}

      {!sent ? (
        <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
          {w.step > 1 ? (
            <GhostButton
              onClick={() =>
                setW((s) => ({ ...s, step: Math.max(1, s.step - 1) as WizardState["step"] }))
              }
            >
              Atrás
            </GhostButton>
          ) : null}
          <div className="flex-1" />
          <GhostButton onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton
            onClick={() => {
              if (w.step >= 3) {
                handleSend();
                return;
              }
              setW((s) => ({ ...s, step: (s.step + 1) as WizardState["step"] }));
            }}
            className={cn(!canNext && "pointer-events-none opacity-50")}
          >
            {w.step < 3 ? "Siguiente" : "Enviar"}
          </PrimaryButton>
        </div>
      ) : null}
    </Card>
  );
}
