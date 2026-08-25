import { ChevronDown } from "lucide-react";
import { Fragment, useState } from "react";
import { Card, PrimaryButton, RemoveButton } from "./ui";
import {
  col2For,
  freshProviderDraft,
  proveedoresSeed,
  provColLabels,
  proveedorTipos,
  type PrecioItem,
  type Proveedor,
  type RoomRate,
} from "@/lib/proveedores";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border px-2.5 py-2 text-[13px] outline-none box-border";

function RoomsEditor({
  rooms,
  onChange,
}: {
  rooms: RoomRate[];
  onChange: (rooms: RoomRate[]) => void;
}) {
  function updateRoom(ri: number, patch: Partial<RoomRate>) {
    onChange(rooms.map((r, i) => (i === ri ? { ...r, ...patch } : r)));
  }
  function updatePrecio(
    ri: number,
    list: "precios" | "extras",
    pi: number,
    patch: Partial<PrecioItem>,
  ) {
    onChange(
      rooms.map((r, i) =>
        i === ri ? { ...r, [list]: r[list].map((p, j) => (j === pi ? { ...p, ...patch } : p)) } : r,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rooms.map((room, ri) => (
        <div key={ri} className="rounded-xl border border-border bg-card p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <input
              value={room.tipo}
              onChange={(e) => updateRoom(ri, { tipo: e.target.value })}
              placeholder="Tipo de tarifa (ej. Estándar, 4D/3N)"
              className="flex-1 rounded-lg border border-border px-2.5 py-2 text-[13px] font-semibold outline-none"
            />
            <RemoveButton onClick={() => onChange(rooms.filter((_, i) => i !== ri))} className="flex-none" />
          </div>

          <div className="mb-1 text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
            Precios
          </div>
          {room.precios.map((pr, pi) => (
            <div key={pi} className="mb-1.5 flex gap-2">
              <input
                value={pr.k}
                onChange={(e) => updatePrecio(ri, "precios", pi, { k: e.target.value })}
                className="w-2/5 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] outline-none"
              />
              <input
                value={pr.v}
                onChange={(e) => updatePrecio(ri, "precios", pi, { v: e.target.value })}
                className="flex-1 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] outline-none"
              />
              <RemoveButton onClick={() => updateRoom(ri, { precios: room.precios.filter((_, j) => j !== pi) })} className="flex-none" />
            </div>
          ))}
          <button
            type="button"
            onClick={() => updateRoom(ri, { precios: [...room.precios, { k: "", v: "" }] })}
            className="mb-2.5 text-[11.5px] font-semibold text-primary"
          >
            + Agregar precio
          </button>

          <div className="mb-1 text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
            Adicionales / condiciones
          </div>
          {room.extras.map((ex, ei) => (
            <div key={ei} className="mb-1.5 flex gap-2">
              <input
                value={ex.k}
                onChange={(e) => updatePrecio(ri, "extras", ei, { k: e.target.value })}
                className="w-2/5 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] outline-none"
              />
              <input
                value={ex.v}
                onChange={(e) => updatePrecio(ri, "extras", ei, { v: e.target.value })}
                className="flex-1 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] outline-none"
              />
              <RemoveButton onClick={() => updateRoom(ri, { extras: room.extras.filter((_, j) => j !== ei) })} className="flex-none" />
            </div>
          ))}
          <button
            type="button"
            onClick={() => updateRoom(ri, { extras: [...room.extras, { k: "", v: "" }] })}
            className="text-[11.5px] font-semibold text-primary"
          >
            + Agregar adicional
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...rooms,
            { tipo: "Nueva tarifa", precios: [{ k: "Sencilla", v: "" }], extras: [] },
          ])
        }
        className="text-[13px] font-semibold text-primary"
      >
        + Agregar tarifa
      </button>
    </div>
  );
}

function NewProviderForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (p: Omit<Proveedor, "id">) => void;
}) {
  const [mode, setMode] = useState<"manual" | "file">("manual");
  const [draft, setDraft] = useState<Omit<Proveedor, "id">>(freshProviderDraft());

  function extractMock() {
    setMode("manual");
    setDraft((d) => ({
      ...d,
      nombre: d.nombre || "Hotel extraído por IA",
      contacto: d.contacto || "reservas@proveedor.com",
      region: d.region || "Por confirmar",
      rooms: [
        {
          tipo: "Estándar",
          precios: [
            { k: "Sencilla", v: "$0" },
            { k: "Doble", v: "$0" },
          ],
          extras: [{ k: "Desayuno", v: "Incluido" }],
        },
      ],
    }));
  }

  return (
    <Card className="p-5.5">
      <div className="mb-4.5 flex gap-2.5">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={cn(
            "rounded-lg border px-4 py-2 text-[12.5px] font-semibold",
            mode === "manual"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          Captura manual
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          className={cn(
            "rounded-lg border px-4 py-2 text-[12.5px] font-semibold",
            mode === "file"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          Subir documento
        </button>
      </div>

      {mode === "manual" ? (
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="mb-3.5 flex flex-wrap gap-2">
              {(["Hotel", "Restaurante", "Barco", "Lodge"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, tipo: t }))}
                  className={cn(
                    "rounded-lg border px-3.5 py-1.5 text-[12.5px] font-semibold",
                    draft.tipo === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="mb-3.5 grid grid-cols-2 gap-2.5">
              <div>
                <div className="mb-1 text-[11px] font-semibold text-muted-foreground">Nombre</div>
                <input
                  value={draft.nombre}
                  onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))}
                  placeholder="Nombre del proveedor"
                  className={inputClass}
                />
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold text-muted-foreground">Contacto</div>
                <input
                  value={draft.contacto}
                  onChange={(e) => setDraft((d) => ({ ...d, contacto: e.target.value }))}
                  placeholder="correo@proveedor.com"
                  className={inputClass}
                />
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold text-muted-foreground">Región</div>
                <input
                  value={draft.region}
                  onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value }))}
                  placeholder="Ej. Galápagos · San Cristóbal"
                  className={inputClass}
                />
              </div>
              {draft.tipo === "Barco" ? (
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-muted-foreground">
                    Empresa
                  </div>
                  <input
                    value={draft.empresa}
                    onChange={(e) => setDraft((d) => ({ ...d, empresa: e.target.value }))}
                    placeholder="Empresa operadora"
                    className={inputClass}
                  />
                </div>
              ) : null}
            </div>
            <div className="mb-3.5">
              <RoomsEditor
                rooms={draft.rooms}
                onChange={(rooms) => setDraft((d) => ({ ...d, rooms }))}
              />
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold text-muted-foreground">
                Observaciones
              </div>
              <textarea
                value={draft.observaciones}
                onChange={(e) => setDraft((d) => ({ ...d, observaciones: e.target.value }))}
                rows={3}
                placeholder="Condiciones, impuestos, descuentos…"
                className={cn(inputClass, "resize-y")}
              />
            </div>
          </div>
          <div>
            <div className="mb-1 font-display text-[15px] font-semibold">Vista previa</div>
            <p className="mb-3.5 text-[12.5px] text-muted-foreground">
              Así se verá en la lista de proveedores
            </p>
            <div className="rounded-xl border border-border p-3.5">
              <div className="font-display text-[14px] font-semibold">{draft.nombre || "—"}</div>
              <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                {draft.region || "—"} · {draft.contacto || "—"}
              </div>
            </div>
            <div className="mt-4.5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-2 text-[12.5px] font-semibold text-muted-foreground"
              >
                Cancelar
              </button>
              <PrimaryButton onClick={() => draft.nombre && onSave(draft)}>
                Guardar proveedor
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-1.5 border-dashed border-primary/40 px-5 py-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-success">
            <span className="h-[15px] w-[15px] rounded-[3px] border-2 border-primary" />
          </div>
          <div className="mb-1 text-[14px] font-semibold">Arrastra la lista de tarifas aquí</div>
          <p className="mb-3.5 text-[12.5px] text-muted-foreground">
            PDF, Excel o Word — la IA leerá nombre, contacto, tipos de habitación, precios y
            condiciones
          </p>
          <PrimaryButton onClick={extractMock}>Subir archivo</PrimaryButton>
        </div>
      )}
    </Card>
  );
}

export function ProveedoresScreen() {
  const seed = proveedoresSeed();
  const [custom, setCustom] = useState<Proveedor[]>([]);
  const [filtro, setFiltro] = useState<string>("Todos");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editOpen, setEditOpen] = useState<Record<string, boolean>>({});
  const [overrides, setOverrides] = useState<Record<string, Proveedor>>({});
  const [newOpen, setNewOpen] = useState(false);

  const base = [...seed, ...custom];
  const providers = base
    .map((p) => overrides[p.id] ?? p)
    .filter((p) => filtro === "Todos" || p.tipo === filtro);
  const labels = provColLabels(filtro);

  function update(id: string, fn: (p: Proveedor) => Proveedor) {
    const source = base.find((p) => p.id === id)!;
    setOverrides((prev) => ({ ...prev, [id]: fn(prev[id] ?? source) }));
  }

  function saveNewProvider(draft: Omit<Proveedor, "id">) {
    setCustom((prev) => [...prev, { ...draft, id: "custom-" + Date.now() }]);
    setNewOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        {proveedorTipos.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFiltro(t)}
            className={cn(
              "rounded-lg border px-3.5 py-2 text-[12.5px] font-semibold",
              filtro === t
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
        <div className="flex-1" />
        <PrimaryButton onClick={() => setNewOpen((v) => !v)}>+ Añadir proveedor</PrimaryButton>
      </div>

      {newOpen ? (
        <NewProviderForm onCancel={() => setNewOpen(false)} onSave={saveNewProvider} />
      ) : null}

      <Card className="overflow-hidden">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-secondary/70">
              {labels.map((l, i) => (
                <th
                  key={i}
                  className="px-6 py-3 text-left text-[12px] font-semibold text-muted-foreground"
                >
                  {l}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => {
              const isOpen = !!expanded[p.id];
              const isEditing = !!editOpen[p.id];
              return (
                <Fragment key={p.id}>
                  <tr
                    onClick={() => setExpanded((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                    className="cursor-pointer border-t border-border hover:bg-secondary/40"
                  >
                    <td className="px-6 py-3.5 font-semibold">{p.nombre}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{col2For(p, filtro)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{p.contacto}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{p.region}</td>
                    <td className="px-6 py-3.5 text-right">
                      <ChevronDown
                        aria-hidden
                        strokeWidth={2}
                        className={cn(
                          "ml-auto h-4 w-4 text-muted-foreground transition-transform duration-200",
                          isOpen && "rotate-180",
                        )}
                      />
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr>
                      <td colSpan={5} className="bg-secondary/30 px-6 pb-5">
                        <Card className="p-5">
                          <div className="mb-3.5 flex items-center gap-4">
                            <span className="text-[12px] font-semibold text-muted-foreground">
                              Tarifas y condiciones
                            </span>
                            <div className="flex-1" />
                            <button
                              type="button"
                              onClick={() =>
                                setEditOpen((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                              }
                              className="text-[12.5px] font-semibold text-primary"
                            >
                              {isEditing ? "Cerrar edición" : "Actualizar información"}
                            </button>
                          </div>

                          {isEditing ? (
                            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-secondary/40 p-4">
                              <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                  <div className="mb-1 text-[11px] font-semibold text-muted-foreground">
                                    Nombre
                                  </div>
                                  <input
                                    value={p.nombre}
                                    onChange={(e) =>
                                      update(p.id, (b) => ({ ...b, nombre: e.target.value }))
                                    }
                                    className={inputClass}
                                  />
                                </div>
                                <div>
                                  <div className="mb-1 text-[11px] font-semibold text-muted-foreground">
                                    Contacto
                                  </div>
                                  <input
                                    value={p.contacto}
                                    onChange={(e) =>
                                      update(p.id, (b) => ({ ...b, contacto: e.target.value }))
                                    }
                                    className={inputClass}
                                  />
                                </div>
                                <div>
                                  <div className="mb-1 text-[11px] font-semibold text-muted-foreground">
                                    Región
                                  </div>
                                  <input
                                    value={p.region}
                                    onChange={(e) =>
                                      update(p.id, (b) => ({ ...b, region: e.target.value }))
                                    }
                                    className={inputClass}
                                  />
                                </div>
                                {p.tipo === "Barco" ? (
                                  <div>
                                    <div className="mb-1 text-[11px] font-semibold text-muted-foreground">
                                      Empresa
                                    </div>
                                    <input
                                      value={p.empresa ?? ""}
                                      onChange={(e) =>
                                        update(p.id, (b) => ({ ...b, empresa: e.target.value }))
                                      }
                                      className={inputClass}
                                    />
                                  </div>
                                ) : null}
                              </div>
                              <RoomsEditor
                                rooms={p.rooms}
                                onChange={(rooms) => update(p.id, (b) => ({ ...b, rooms }))}
                              />
                              <div>
                                <div className="mb-1 text-[11px] font-semibold text-muted-foreground">
                                  Observaciones
                                </div>
                                <textarea
                                  value={p.observaciones}
                                  onChange={(e) =>
                                    update(p.id, (b) => ({ ...b, observaciones: e.target.value }))
                                  }
                                  rows={3}
                                  className={cn(inputClass, "resize-y")}
                                />
                              </div>
                              <div className="flex justify-end">
                                <PrimaryButton
                                  onClick={() =>
                                    setEditOpen((prev) => ({ ...prev, [p.id]: false }))
                                  }
                                >
                                  Listo
                                </PrimaryButton>
                              </div>
                            </div>
                          ) : null}

                          <div className="mb-3.5 flex flex-col gap-3.5">
                            {p.rooms.map((room, ri) => (
                              <div key={ri} className="rounded-xl border border-border p-3.5">
                                <div className="mb-2.5 font-display text-[13.5px] font-semibold">
                                  {room.tipo}
                                </div>
                                {room.precios.length ? (
                                  <div className="mb-2.5 flex flex-wrap gap-5 border-b border-border/60 pb-2.5">
                                    {room.precios.map((pr, pi) => (
                                      <div key={pi}>
                                        <div className="mb-0.5 text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                                          {pr.k}
                                        </div>
                                        <div className="font-display text-[15px] font-semibold text-primary">
                                          {pr.v}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                <div className="flex flex-wrap gap-2">
                                  {room.extras.map((ex, ei) => (
                                    <span
                                      key={ei}
                                      className="rounded-full bg-secondary px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground"
                                    >
                                      {ex.k}: {ex.v}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-[12px] leading-relaxed text-muted-foreground">
                            <span className="font-semibold text-foreground">Observaciones:</span>{" "}
                            {p.observaciones}
                          </p>
                        </Card>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
