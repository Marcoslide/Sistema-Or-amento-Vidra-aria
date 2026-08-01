"use client";

import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { transformarEmVenda } from "@/lib/data/vendas-actions";

// Modal de transformação em venda: entrada + parcelas. Idempotente (chave única por operação),
// à prova de clique duplo (botão desabilita e chave estável durante a operação).
export function TransformarModal(props: {
  open: boolean; onClose: () => void; saleId: string; total: number; onDone: () => void;
}) {
  const [entrada, setEntrada] = useState("0");
  const [forma, setForma] = useState("Dinheiro");
  const [parcelas, setParcelas] = useState("1");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const idemRef = useRef<string>("");

  const entradaN = useMemo(() => {
    const n = parseFloat(entrada.replace(",", ".")); return Number.isFinite(n) ? n : 0;
  }, [entrada]);
  const saldo = Math.max(0, props.total - Math.min(Math.max(0, entradaN), props.total));

  async function confirmar() {
    if (busy) return;                       // anti clique-duplo
    setErro(""); setBusy(true);
    if (!idemRef.current) idemRef.current = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID() : `${props.saleId}-${entradaN}-${parcelas}`;
    const res = await transformarEmVenda(props.saleId, {
      entrada: entradaN, forma, parcelas: Math.max(1, Math.trunc(Number(parcelas) || 1)), idem: idemRef.current,
    });
    setBusy(false);
    if (!res.ok) { setErro(res.error || "Falha ao transformar em venda."); return; }
    props.onDone();
  }

  return (
    <Dialog open={props.open} onOpenChange={(o) => { if (!o && !busy) props.onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Transformar em venda</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            Total da venda: <span className="font-semibold">{formatCurrency(props.total)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Entrada (R$)</Label>
              <Input type="number" value={entrada} onChange={(e) => setEntrada(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Forma</Label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={forma} onChange={(e) => setForma(e.target.value)}>
                <option>Dinheiro</option><option>Pix</option><option>Cartão</option><option>Boleto</option><option>Transferência</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Parcelas do saldo</Label>
              <Input type="number" min={1} value={parcelas} onChange={(e) => setParcelas(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Saldo a parcelar</Label>
              <Input value={formatCurrency(saldo)} readOnly />
            </div>
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <p className="text-xs text-muted-foreground">
            Gera um único movimento de caixa para a entrada e as parcelas do saldo. A operação é
            idempotente: cliques repetidos não duplicam o lançamento.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={confirmar} disabled={busy}>{busy ? "Processando..." : "Confirmar venda"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
