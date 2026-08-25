import { CloseButton } from "./ui";
import { pagosPorExp, rentaByExp } from "@/lib/pagos";

const fmtUsd = (n: number) => "$" + Math.round(n).toLocaleString();

export function IncomeModal({ exp, onClose }: { exp: string; onClose: () => void }) {
  const fin = rentaByExp()[exp] ?? { ingreso: 0, costo: 0, exp, programa: "", pct: 0 };
  const ingresoItems = [
    { concepto: "Paquete turístico (tarifa base)", monto: Math.round(fin.ingreso * 0.75) },
    { concepto: "Excursiones y upgrades opcionales", monto: Math.round(fin.ingreso * 0.25) },
  ];
  const costoItems = pagosPorExp()[exp] ?? [];

  return (
    <div
      className="scrim"
      onClick={onClose}
    >
      <div
        className="max-h-[76vh] w-full max-w-[440px] overflow-y-auto modal-panel p-6.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4.5 flex items-center gap-3">
          <div>
            <div className="font-display text-[16px] font-semibold">Resumen financiero</div>
            <div className="text-[12.5px] text-muted-foreground">{exp}</div>
          </div>
          <div className="flex-1" />
          <CloseButton onClick={onClose} />
        </div>

        <div className="mb-2.5 text-[12px] font-semibold text-muted-foreground">Ingresos</div>
        <div className="mb-3.5 flex flex-col gap-1.5">
          {ingresoItems.map((it) => (
            <div key={it.concepto} className="flex items-center justify-between text-[12.5px]">
              <span className="text-muted-foreground">{it.concepto}</span>
              <span className="font-semibold">{fmtUsd(it.monto)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-1.5 text-[13px] font-semibold">
            <span>Total ingreso</span>
            <span className="text-primary">{fmtUsd(fin.ingreso)}</span>
          </div>
        </div>

        <div className="mb-2.5 text-[12px] font-semibold text-muted-foreground">Costos</div>
        <div className="mb-3.5 flex flex-col gap-1.5">
          {costoItems.map((it, i) => (
            <div key={i} className="flex items-center justify-between text-[12.5px]">
              <span className="text-muted-foreground">{it.concepto}</span>
              <span className="font-semibold">{fmtUsd(it.monto)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-1.5 text-[13px] font-semibold">
            <span>Total costo</span>
            <span>{fmtUsd(fin.costo)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-success/40 px-3.5 py-2.5">
          <span className="text-[12.5px] font-semibold text-primary">Margen</span>
          <span className="font-display text-[16px] font-bold text-primary">
            {fmtUsd(fin.ingreso - fin.costo)}
          </span>
        </div>
      </div>
    </div>
  );
}
