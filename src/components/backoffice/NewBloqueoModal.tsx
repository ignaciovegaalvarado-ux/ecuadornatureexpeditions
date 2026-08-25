import type { ReactNode } from "react";
import { CloseButton, PrimaryButton } from "./ui";
import { expedienteOptions, type BloqueoDraft } from "@/lib/bloqueos";

export function NewBloqueoModal({
  draft,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: BloqueoDraft;
  onChange: (updater: (d: BloqueoDraft) => BloqueoDraft) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const opts = expedienteOptions();

  return (
    <div
      className="scrim"
      onClick={onCancel}
    >
      <div
        className="max-h-[88vh] w-full max-w-[640px] overflow-y-auto modal-panel p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="font-display text-[17px] font-bold">Nuevo bloqueo</div>
          <CloseButton onClick={onCancel} className="flex-none" />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <Field label="Expediente / grupo">
            <select
              value={draft.exp}
              onChange={(e) => onChange((d) => ({ ...d, exp: e.target.value }))}
              className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-[12.5px]"
            >
              {opts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pasajeros">
            <input
              value={draft.pasajerosTxt}
              onChange={(e) => onChange((d) => ({ ...d, pasajerosTxt: e.target.value }))}
              placeholder="Ej: Cris x 12 + TL + guía"
              className="w-full rounded-lg border border-border px-2.5 py-2 text-[12.5px]"
            />
          </Field>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <Field label="Hotel">
            <input
              value={draft.hotel}
              onChange={(e) => onChange((d) => ({ ...d, hotel: e.target.value }))}
              placeholder="Nombre del hotel"
              className="w-full rounded-lg border border-border px-2.5 py-2 text-[12.5px]"
            />
          </Field>
          <Field label="E-mail del hotel">
            <input
              value={draft.hotelEmail}
              onChange={(e) => onChange((d) => ({ ...d, hotelEmail: e.target.value }))}
              placeholder="reservas@hotel.com"
              className="w-full rounded-lg border border-border px-2.5 py-2 text-[12.5px]"
            />
          </Field>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-3">
          <Field label="Contacto (ATT)">
            <input
              value={draft.contacto}
              onChange={(e) => onChange((d) => ({ ...d, contacto: e.target.value }))}
              className="w-full rounded-lg border border-border px-2.5 py-2 text-[12.5px]"
            />
          </Field>
          <Field label="Fecha IN">
            <input
              type="date"
              value={draft.fechaIn}
              onChange={(e) => onChange((d) => ({ ...d, fechaIn: e.target.value }))}
              className="w-full rounded-lg border border-border px-2.5 py-2 text-[12.5px]"
            />
          </Field>
          <Field label="Fecha OUT">
            <input
              type="date"
              value={draft.fechaOut}
              onChange={(e) => onChange((d) => ({ ...d, fechaOut: e.target.value }))}
              className="w-full rounded-lg border border-border px-2.5 py-2 text-[12.5px]"
            />
          </Field>
          <Field label="No. de noches">
            <input
              inputMode="numeric"
              value={draft.noches}
              onChange={(e) =>
                onChange((d) => ({ ...d, noches: e.target.value.replace(/[^0-9]/g, "") }))
              }
              placeholder="Ej: 3"
              className="w-full rounded-lg border border-border px-2.5 py-2 text-[12.5px]"
            />
          </Field>
        </div>

        <div className="mb-1.5 text-[11.5px] font-semibold text-muted-foreground">
          Habitaciones solicitadas
        </div>
        {draft.habitaciones.map((h, i) => (
          <div key={i} className="mb-1.5 flex gap-2">
            <input
              value={h.tipo}
              onChange={(e) =>
                onChange((d) => ({
                  ...d,
                  habitaciones: d.habitaciones.map((hh, j) =>
                    j === i ? { ...hh, tipo: e.target.value } : hh,
                  ),
                }))
              }
              placeholder="Ej: Doble ocean superior"
              className="flex-1 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px]"
            />
            <input
              type="number"
              min={1}
              value={h.cantidad}
              onChange={(e) =>
                onChange((d) => ({
                  ...d,
                  habitaciones: d.habitaciones.map((hh, j) =>
                    j === i ? { ...hh, cantidad: Number(e.target.value) || 1 } : hh,
                  ),
                }))
              }
              className="w-16 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px]"
            />
            <CloseButton onClick={() =>
                onChange((d) => ({ ...d, habitaciones: d.habitaciones.filter((_, j) => j !== i) }))} className="flex-none" />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange((d) => ({
              ...d,
              habitaciones: [...d.habitaciones, { tipo: "", cantidad: 1 }],
            }))
          }
          className="mb-4 text-[12px] font-semibold text-primary"
        >
          + Agregar habitación
        </button>

        <div className="mb-1.5 text-[11.5px] font-semibold text-muted-foreground">Tarifas</div>
        {draft.tarifas.map((t, i) => (
          <div key={i} className="mb-1.5 flex gap-2">
            <input
              value={t.concepto}
              onChange={(e) =>
                onChange((d) => ({
                  ...d,
                  tarifas: d.tarifas.map((tt, j) =>
                    j === i ? { ...tt, concepto: e.target.value } : tt,
                  ),
                }))
              }
              placeholder="Ej: Habitación SGL/DBL ocean superior"
              className="flex-1 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px]"
            />
            <input
              value={t.tarifa}
              onChange={(e) =>
                onChange((d) => ({
                  ...d,
                  tarifas: d.tarifas.map((tt, j) =>
                    j === i ? { ...tt, tarifa: e.target.value } : tt,
                  ),
                }))
              }
              placeholder="US$205,28"
              className="w-[120px] rounded-lg border border-border px-2.5 py-1.5 text-[12.5px]"
            />
            <CloseButton onClick={() =>
                onChange((d) => ({ ...d, tarifas: d.tarifas.filter((_, j) => j !== i) }))} className="flex-none" />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange((d) => ({ ...d, tarifas: [...d.tarifas, { concepto: "", tarifa: "" }] }))
          }
          className="mb-4 text-[12px] font-semibold text-primary"
        >
          + Agregar tarifa
        </button>

        <div className="mb-4.5">
          <Field label="Nota de tarifa">
            <input
              value={draft.notaTarifa}
              onChange={(e) => onChange((d) => ({ ...d, notaTarifa: e.target.value }))}
              className="w-full rounded-lg border border-border px-2.5 py-2 text-[12.5px]"
            />
          </Field>
        </div>

        <PrimaryButton className="w-full py-3 text-[14px]" onClick={onSubmit}>
          Generar bloqueo
        </PrimaryButton>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11.5px] font-semibold text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
