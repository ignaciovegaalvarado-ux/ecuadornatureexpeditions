import { CloseButton } from "./ui";
import { buildItinerarioDetalle, type ItinOverride } from "@/lib/itinerary-wizard";
import { cn } from "@/lib/utils";

export function ItinerarioDetailModal({
  nombre,
  duracion,
  override,
  editMode,
  onClose,
  onToggleEdit,
  onHotelTierChange,
  onPrecioChange,
  onDiaTituloChange,
  onDiaItemsChange,
  onDiaComidasChange,
}: {
  nombre: string;
  duracion: string;
  override: ItinOverride;
  editMode: boolean;
  onClose: () => void;
  onToggleEdit: () => void;
  onHotelTierChange: (hotelIdx: number, value: string) => void;
  onPrecioChange: (tabla: "25" | "30", hotelIdx: number, paxIdx: number, value: number) => void;
  onDiaTituloChange: (diaIdx: number, value: string) => void;
  onDiaItemsChange: (diaIdx: number, items: string[]) => void;
  onDiaComidasChange: (diaIdx: number, value: string) => void;
}) {
  const detalle = buildItinerarioDetalle(nombre, override);
  if (!detalle) return null;

  return (
    <div
      className="scrim"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-[980px] overflow-y-auto modal-panel p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex flex-wrap items-center gap-3.5">
          <div>
            <div className="font-display text-[17px] font-bold">{nombre}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">{duracion}</div>
          </div>
          <div className="flex-1" />
          <div className="font-display text-[15px] font-bold text-primary">
            {detalle.precioRango}{" "}
            <span className="text-[11.5px] font-semibold text-muted-foreground">/ pax</span>
          </div>
          <button
            type="button"
            onClick={onToggleEdit}
            className={cn(
              "rounded-lg border border-primary/30 px-3 py-1.5 text-[11.5px] font-semibold",
              editMode ? "bg-primary text-primary-foreground" : "bg-success/40 text-primary",
            )}
          >
            {editMode ? "Guardar cambios" : "Editar información"}
          </button>
          <CloseButton onClick={onClose} />
        </div>

        {editMode ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {detalle.hoteles.map((h, i) => (
              <input
                key={i}
                value={h.tier}
                onChange={(e) => onHotelTierChange(i, e.target.value)}
                className="w-[120px] rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold"
              />
            ))}
          </div>
        ) : null}
        <p className="mb-3.5 text-[11.5px] text-muted-foreground">{detalle.notaPrecio}</p>

        {detalle.priceGrids.map((pg) => (
          <div key={pg.label} className="mb-3.5">
            <div className="mb-1.5 text-[12px] font-bold text-primary">{pg.label}</div>
            <div className="overflow-x-auto rounded-xl border border-border p-2.5">
              <div
                className="grid min-w-[640px] gap-1"
                style={{ gridTemplateColumns: `110px repeat(${pg.paxLabels.length}, 1fr)` }}
              >
                <div />
                {pg.paxLabels.map((pl) => (
                  <div
                    key={pl}
                    className="pb-1 text-center text-[10px] font-semibold text-muted-foreground"
                  >
                    {pl}
                  </div>
                ))}
                {pg.rows.map((row, ti) => (
                  <div key={row.tier} className="contents">
                    <div className="flex items-center text-[11px] font-semibold">{row.tier}</div>
                    {row.cells.map((c, pi) =>
                      editMode ? (
                        <input
                          key={pi}
                          value={c.value}
                          onChange={(e) =>
                            onPrecioChange(
                              pg.label.includes("25") ? "25" : "30",
                              ti,
                              pi,
                              Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
                            )
                          }
                          className="w-full rounded-md border border-border px-0.5 py-1.5 text-center text-[11px]"
                        />
                      ) : (
                        <div
                          key={pi}
                          className="rounded-md px-0.5 py-1.5 text-center text-[11px] text-muted-foreground hover:bg-success/40"
                        >
                          {c.fmt}
                        </div>
                      ),
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {detalle.dias.map((d, i) => (
            <div key={d.n} className="rounded-xl border border-border p-3.5">
              <div className="mb-1.5 flex items-baseline gap-2">
                <span className="font-display text-[12px] font-bold text-primary">Día {d.n}</span>
                {editMode ? (
                  <input
                    value={d.titulo}
                    onChange={(e) => onDiaTituloChange(i, e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-border px-1.5 py-1 text-[12px] font-semibold"
                  />
                ) : (
                  <span className="text-[12.5px] font-semibold">{d.titulo}</span>
                )}
              </div>
              {editMode ? (
                <>
                  <textarea
                    value={d.itemsText}
                    onChange={(e) =>
                      onDiaItemsChange(i, e.target.value.split("\n").filter(Boolean))
                    }
                    rows={4}
                    className="w-full resize-y rounded-md border border-border px-1.5 py-1 text-[11px]"
                  />
                  <input
                    value={d.comidas}
                    onChange={(e) => onDiaComidasChange(i, e.target.value)}
                    placeholder="Comidas (ej. B, L, D)"
                    className="mt-1.5 w-full rounded-md border border-border px-1.5 py-1 text-[10.5px]"
                  />
                </>
              ) : (
                <>
                  {d.items.map((it) => (
                    <div key={it} className="relative pl-3 text-[11.5px] text-muted-foreground">
                      <span className="absolute left-0">·</span>
                      {it}
                    </div>
                  ))}
                  {d.alojamientoOpciones.length ? (
                    <>
                      <div className="mt-2 text-[10.5px] font-semibold text-muted-foreground">
                        Opciones de alojamiento:
                      </div>
                      {d.alojamientoOpciones.map((op) => (
                        <div
                          key={op}
                          className="relative pl-3 text-[11px] text-muted-foreground/90"
                        >
                          <span className="absolute left-0">·</span>
                          {op}
                        </div>
                      ))}
                    </>
                  ) : null}
                  {d.comidas ? (
                    <div className="mt-1 text-[10.5px] text-muted-foreground/80">
                      Comidas: {d.comidas}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
