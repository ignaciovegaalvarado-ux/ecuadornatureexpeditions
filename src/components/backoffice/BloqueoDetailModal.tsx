import { Badge, CloseButton, estadoTone } from "./ui";
import { buildBloqueoDocxBlob, buildBloqueoPdfBlob } from "@/lib/bloqueo-doc";
import {
  bloqueoEstado,
  fmtFechaCorta,
  nochesEntre,
  type Bloqueo,
  type Habitacion,
  type Tarifa,
} from "@/lib/bloqueos";
import { cn } from "@/lib/utils";

const inputClass = "w-full rounded-lg border border-border px-2.5 py-2 text-[12.5px] box-border";

export function BloqueoDetailModal({
  bloqueo,
  editMode,
  onClose,
  onToggleEdit,
  onUpdate,
}: {
  bloqueo: Bloqueo;
  editMode: boolean;
  onClose: () => void;
  onToggleEdit: () => void;
  onUpdate: (fn: (b: Bloqueo) => Bloqueo) => void;
}) {
  const estado = bloqueoEstado(bloqueo);
  const noches = bloqueo.noches || nochesEntre(bloqueo.fechaIn, bloqueo.fechaOut);

  async function generar(tipo: "docx" | "pdf") {
    const data = {
      hotel: bloqueo.hotel,
      hotelEmail: bloqueo.hotelEmail,
      contacto: bloqueo.contacto,
      creado: bloqueo.creado,
      pasajerosTxt: bloqueo.pasajerosTxt,
      fechaInLabel: fmtFechaCorta(bloqueo.fechaIn),
      fechaOutLabel: fmtFechaCorta(bloqueo.fechaOut),
      noches,
      habitaciones: bloqueo.habitaciones,
      tarifas: bloqueo.tarifas,
      notaTarifa: bloqueo.notaTarifa,
    };
    const base = `Bloqueo_${bloqueo.hotel}_${bloqueo.exp}`.replace(/[^\w-]+/g, "_");
    const blob = tipo === "docx" ? await buildBloqueoDocxBlob(data) : buildBloqueoPdfBlob(data);
    const filename = base + (tipo === "docx" ? ".docx" : ".pdf");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    const fecha = new Date().toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    onUpdate((b) => ({ ...b, documentos: [...b.documentos, { tipo, filename, fecha }] }));
  }

  function updateHabitacion(i: number, patch: Partial<Habitacion>) {
    onUpdate((b) => ({
      ...b,
      habitaciones: b.habitaciones.map((h, j) => (j === i ? { ...h, ...patch } : h)),
    }));
  }
  function updateTarifa(i: number, patch: Partial<Tarifa>) {
    onUpdate((b) => ({
      ...b,
      tarifas: b.tarifas.map((t, j) => (j === i ? { ...t, ...patch } : t)),
    }));
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-[620px] overflow-y-auto modal-panel p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-2.5">
          <div className="text-[13px] font-semibold text-muted-foreground">
            {bloqueo.exp} · {bloqueo.cliente}
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onToggleEdit}
            className={cn(
              "rounded-lg border border-primary/25 px-3 py-1.5 text-[12px] font-semibold",
              editMode ? "bg-primary text-primary-foreground" : "bg-success/40 text-primary",
            )}
          >
            {editMode ? "Guardar cambios" : "Editar información"}
          </button>
          <CloseButton onClick={onClose} className="flex-none" />
        </div>
        <div className="mb-4 font-display text-[17px] font-bold">
          B L O Q U E O — {bloqueo.hotel}
        </div>

        {!editMode ? (
          <div className="rounded-xl border border-border p-4.5 text-[12.5px] leading-relaxed text-foreground">
            <div>
              <b>PARA:</b> {bloqueo.hotel} &nbsp; <b>E-MAIL:</b> {bloqueo.hotelEmail}
            </div>
            <div>
              <b>ATT:</b> {bloqueo.contacto} &nbsp; <b>FECHA:</b> {bloqueo.creado}
            </div>
            <div className="mt-2.5">
              Por medio de la presente solicitamos realizar el siguiente bloqueo de espacios, bajo
              las siguientes especificaciones:
            </div>
            <div className="mt-2.5">
              <b>PASAJEROS:</b> {bloqueo.pasajerosTxt}
            </div>
            <div>
              <b>FECHA:</b> IN: {fmtFechaCorta(bloqueo.fechaIn)} &nbsp; OUT:{" "}
              {fmtFechaCorta(bloqueo.fechaOut)}
            </div>
            <div>
              <b>NOCHES:</b> {noches}
            </div>
            <div className="mt-1.5">
              <b>SERVICIOS:</b>
            </div>
            {bloqueo.habitaciones.map((h, i) => (
              <div key={i} className="pl-3">
                — {h.cantidad} {h.tipo}
              </div>
            ))}
            <div className="mt-1.5">
              <b>TARIFA:</b>
            </div>
            {bloqueo.tarifas.map((t, i) => (
              <div key={i} className="pl-3">
                — {t.concepto}: {t.tarifa}
              </div>
            ))}
            <div className="mt-1.5 text-muted-foreground">{bloqueo.notaTarifa}</div>
          </div>
        ) : (
          <div className="rounded-xl border border-primary/25 p-4.5">
            <div className="mb-3 grid grid-cols-2 gap-3">
              <LabeledInput
                label="Hotel"
                value={bloqueo.hotel}
                onChange={(v) => onUpdate((b) => ({ ...b, hotel: v }))}
              />
              <LabeledInput
                label="E-mail del hotel"
                value={bloqueo.hotelEmail}
                onChange={(v) => onUpdate((b) => ({ ...b, hotelEmail: v }))}
              />
              <LabeledInput
                label="Contacto (ATT)"
                value={bloqueo.contacto}
                onChange={(v) => onUpdate((b) => ({ ...b, contacto: v }))}
              />
              <LabeledInput
                label="Pasajeros"
                value={bloqueo.pasajerosTxt}
                onChange={(v) => onUpdate((b) => ({ ...b, pasajerosTxt: v }))}
              />
              <LabeledInput
                label="Fecha IN"
                type="date"
                value={bloqueo.fechaIn}
                onChange={(v) => onUpdate((b) => ({ ...b, fechaIn: v }))}
              />
              <LabeledInput
                label="Fecha OUT"
                type="date"
                value={bloqueo.fechaOut}
                onChange={(v) => onUpdate((b) => ({ ...b, fechaOut: v }))}
              />
              <LabeledInput
                label="No. de noches"
                value={String(bloqueo.noches || "")}
                onChange={(v) =>
                  onUpdate((b) => ({ ...b, noches: Number(v.replace(/[^0-9]/g, "")) || 0 }))
                }
              />
            </div>

            <div className="mb-1.5 text-[11.5px] font-semibold text-muted-foreground">
              Habitaciones solicitadas
            </div>
            {bloqueo.habitaciones.map((h, i) => (
              <div key={i} className="mb-1.5 flex gap-2">
                <input
                  value={h.tipo}
                  onChange={(e) => updateHabitacion(i, { tipo: e.target.value })}
                  className="flex-1 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px]"
                />
                <input
                  type="number"
                  min={1}
                  value={h.cantidad}
                  onChange={(e) => updateHabitacion(i, { cantidad: Number(e.target.value) || 1 })}
                  className="w-16 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px]"
                />
                <CloseButton
                  onClick={() =>
                    onUpdate((b) => ({
                      ...b,
                      habitaciones: b.habitaciones.filter((_, j) => j !== i),
                    }))
                  }
                  className="flex-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onUpdate((b) => ({
                  ...b,
                  habitaciones: [...b.habitaciones, { tipo: "", cantidad: 1 }],
                }))
              }
              className="mb-3.5 text-[12px] font-semibold text-primary"
            >
              + Agregar habitación
            </button>

            <div className="mb-1.5 text-[11.5px] font-semibold text-muted-foreground">Tarifas</div>
            {bloqueo.tarifas.map((t, i) => (
              <div key={i} className="mb-1.5 flex gap-2">
                <input
                  value={t.concepto}
                  onChange={(e) => updateTarifa(i, { concepto: e.target.value })}
                  className="flex-1 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px]"
                />
                <input
                  value={t.tarifa}
                  onChange={(e) => updateTarifa(i, { tarifa: e.target.value })}
                  className="w-[120px] rounded-lg border border-border px-2.5 py-1.5 text-[12.5px]"
                />
                <CloseButton
                  onClick={() =>
                    onUpdate((b) => ({ ...b, tarifas: b.tarifas.filter((_, j) => j !== i) }))
                  }
                  className="flex-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onUpdate((b) => ({ ...b, tarifas: [...b.tarifas, { concepto: "", tarifa: "" }] }))
              }
              className="mb-3.5 text-[12px] font-semibold text-primary"
            >
              + Agregar tarifa
            </button>

            <LabeledInput
              label="Nota de tarifa"
              value={bloqueo.notaTarifa}
              onChange={(v) => onUpdate((b) => ({ ...b, notaTarifa: v }))}
            />
          </div>
        )}

        <div className="mt-4.5 border-t border-border pt-4">
          <div className="mb-3 text-[12px] font-semibold text-muted-foreground">
            Documento del bloqueo
          </div>
          <div className="mb-2.5 flex gap-2.5">
            <button
              type="button"
              onClick={() => void generar("docx")}
              className="rounded-lg border border-primary/25 bg-success/40 px-3.5 py-2 text-[12.5px] font-semibold text-primary"
            >
              Generar Word
            </button>
            <button
              type="button"
              onClick={() => void generar("pdf")}
              className="rounded-lg border border-primary/25 bg-success/40 px-3.5 py-2 text-[12.5px] font-semibold text-primary"
            >
              Generar PDF
            </button>
          </div>
          {bloqueo.documentos.length ? (
            <div className="flex flex-col gap-1">
              {bloqueo.documentos.map((doc, i) => (
                <div key={i} className="text-[11.5px] text-muted-foreground">
                  {doc.tipo.toUpperCase()} · {doc.filename} · {doc.fecha}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-3 text-[12px] font-semibold text-muted-foreground">
            Gestión interna
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <LabeledInput
              label="Fecha límite (indicada por el hotel)"
              type="date"
              value={bloqueo.fechaLimite ?? ""}
              onChange={(v) => onUpdate((b) => ({ ...b, fechaLimite: v || null }))}
            />
            <div>
              <div className="mb-1.5 text-[11.5px] font-semibold text-muted-foreground">Estado</div>
              <select
                value={bloqueo.estadoManual ?? ""}
                onChange={(e) => onUpdate((b) => ({ ...b, estadoManual: e.target.value || null }))}
                className={inputClass}
              >
                <option value="">Automático ({estado})</option>
                <option value="Convertido en reserva">Convertido en reserva</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <Badge tone={estadoTone(estado)}>{estado}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[11.5px] font-semibold text-muted-foreground">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}
