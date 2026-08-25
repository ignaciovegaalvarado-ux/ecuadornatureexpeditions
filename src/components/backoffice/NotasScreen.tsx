import { useState } from "react";
import {
  Badge,
  Card,
  CardHeader,
  CloseButton,
  DataTable,
  GhostButton,
  PrimaryButton,
  RemoveButton,
  TableHead,
  estadoTone,
} from "./ui";
import {
  bankTransactionsList,
  buildNota,
  nextNotaNumber,
  notaTotal,
  notasDebitoSeed,
  type NotaItem,
  type NotaRaw,
} from "@/lib/notas-debito";
import { cn } from "@/lib/utils";

const fmtUsd = (n: number) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2 });

export function NotasScreen() {
  const seed = notasDebitoSeed();
  const [created, setCreated] = useState<NotaRaw[]>([]);
  const all = [...seed, ...created];
  const [selectedNum, setSelectedNum] = useState(all[3]!.num); // ND-8226, matches design's default
  const [newOpen, setNewOpen] = useState(false);
  const [favor, setFavor] = useState("");
  const [items, setItems] = useState<(NotaItem & { txId: string })[]>([]);

  const selected = all.find((n) => n.num === selectedNum) ?? all[all.length - 1]!;
  const nextNum = nextNotaNumber(all);
  const bankTx = bankTransactionsList();
  const usedIds = new Set(items.map((it) => it.txId));

  function openNew() {
    setFavor("");
    setItems([]);
    setNewOpen(true);
  }

  function addTransaction(id: string) {
    const tx = bankTx.find((t) => t.id === id);
    if (tx) setItems((prev) => [...prev, { txId: tx.id, concepto: tx.concepto, monto: tx.monto }]);
  }

  function saveNota() {
    if (!items.length || !favor.trim()) return;
    const nueva = buildNota(
      nextNum,
      favor,
      items.map((it) => ({ concepto: it.concepto, monto: it.monto })),
    );
    setCreated((prev) => [...prev, nueva]);
    setNewOpen(false);
    setSelectedNum(nueva.num);
  }

  const total = notaTotal(items);
  const canSave = items.length > 0 && favor.trim().length > 0;
  const selTotal = notaTotal(selected.items);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Card className="overflow-hidden">
        <CardHeader
          title="Notas emitidas"
          subtitle="Emitidas a favor de proveedores y terceros"
          action={<PrimaryButton onClick={openNew}>+ Nueva nota de débito</PrimaryButton>}
        />
        <DataTable stackAt="lg">
          <table className="w-full border-collapse text-[13px]">
            <TableHead
              cols={[
                { label: "N.º" },
                { label: "A favor de" },
                { label: "Monto" },
                { label: "Estado" },
              ]}
            />
            <tbody>
              {all.map((n) => (
                <tr
                  key={n.num}
                  onClick={() => setSelectedNum(n.num)}
                  className={cn(
                    "cursor-pointer border-t border-border transition-colors",
                    selectedNum === n.num ? "bg-secondary" : "hover:bg-secondary/40",
                  )}
                >
                  <td className="px-4 py-3 numeric font-semibold text-primary">ND-{n.num}</td>
                  <td className="px-4 py-3">{n.favor}</td>
                  <td className="px-4 py-3 font-semibold">{fmtUsd(notaTotal(n.items))}</td>
                  <td className="px-4 py-3">
                    <Badge tone={estadoTone(n.estado)}>{n.estado}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      </Card>

      <Card className="h-fit">
        <CardHeader title={`ND-${selected.num}`} subtitle="Vista previa del documento" />
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between border-b border-border pb-3 text-[12.5px] text-muted-foreground">
            <span>Fecha</span>
            <span className="font-semibold text-foreground">{selected.fecha}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border py-3 text-[12.5px] text-muted-foreground">
            <span>A favor de</span>
            <span className="font-semibold text-foreground">{selected.favor}</span>
          </div>
          <ul className="mt-3 space-y-2.5 text-[13px]">
            {selected.items.map((it, i) => (
              <li key={i} className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{it.concepto}</span>
                <span className="font-semibold">{fmtUsd(it.monto)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-4 text-muted-foreground">
              <span>Retención IVA</span>
              <span>$0.00</span>
            </li>
            <li className="flex items-center justify-between gap-4 text-muted-foreground">
              <span>Retención 2%</span>
              <span>$0.00</span>
            </li>
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[13.5px] font-semibold">
            <span>Total débitos y créditos</span>
            <span className="font-display text-[16px] text-primary">{fmtUsd(selTotal)}</span>
          </div>
          <div className="mt-4 flex gap-2">
            <GhostButton className="flex-1">Descargar PDF</GhostButton>
            <GhostButton className="flex-1">Enviar por correo</GhostButton>
          </div>
        </div>
      </Card>

      {newOpen ? (
        <div className="scrim" onClick={() => setNewOpen(false)}>
          <div
            className="max-h-[80vh] w-full max-w-[460px] overflow-y-auto modal-panel p-6.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4.5 flex items-center gap-3">
              <div>
                <div className="font-display text-[16px] font-semibold">Nueva nota de débito</div>
                <div className="text-[12.5px] text-muted-foreground">
                  ND-{nextNum} · se asigna automáticamente
                </div>
              </div>
              <div className="flex-1" />
              <CloseButton onClick={() => setNewOpen(false)} />
            </div>

            <div className="mb-3.5">
              <div className="mb-1.5 text-[12px] font-semibold text-muted-foreground">
                A favor de
              </div>
              <input
                value={favor}
                onChange={(e) => setFavor(e.target.value)}
                placeholder="Nombre del beneficiario"
                className="w-full rounded-lg border border-border px-2.5 py-2 text-[13px] outline-none"
              />
            </div>

            <div className="mb-2.5">
              <div className="mb-1.5 text-[12px] font-semibold text-muted-foreground">
                Agregar transacción del banco
              </div>
              <select
                value=""
                onChange={(e) => e.target.value && addTransaction(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-[13px] font-semibold"
              >
                <option value="" disabled>
                  Seleccionar transacción…
                </option>
                {bankTx
                  .filter((t) => !usedIds.has(t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.concepto} · {fmtUsd(t.monto)}
                    </option>
                  ))}
              </select>
            </div>

            <div className="mb-3.5 flex flex-col gap-1.5">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-lg bg-secondary/60 px-2.5 py-2"
                >
                  <div className="flex-1 text-[12.5px] font-semibold">{it.concepto}</div>
                  <div className="text-[12.5px] text-muted-foreground">{fmtUsd(it.monto)}</div>
                  <RemoveButton
                    onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                  />
                </div>
              ))}
              {items.length === 0 ? (
                <p className="px-0.5 py-1.5 text-[12px] text-muted-foreground">
                  Aún no agregas transacciones.
                </p>
              ) : null}
            </div>

            <div className="mb-4.5 flex items-baseline justify-between rounded-lg bg-success/50 px-3.5 py-2.5">
              <span className="text-[12.5px] font-semibold text-primary">Total</span>
              <span className="font-display text-[17px] font-bold text-primary">
                {fmtUsd(total)}
              </span>
            </div>

            <button
              type="button"
              onClick={saveNota}
              disabled={!canSave}
              className={cn(
                "w-full rounded-lg py-2.5 text-[13px] font-semibold text-primary-foreground",
                canSave ? "bg-primary" : "cursor-not-allowed bg-muted-foreground/40",
              )}
            >
              Guardar nota de débito
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
