"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getReceberData, receberParcela, getRecebimentosParcela, estornarRecebimento,
  type ParcelaRow, type RecebimentoRow,
} from "@/lib/data/financeiro-actions";

const STATUS_VAR: Record<string, "muted" | "warning" | "success" | "destructive"> = {
  ABERTO: "muted", PARCIAL: "warning", RECEBIDO: "success", VENCIDO: "destructive", CANCELADO: "destructive",
};

export default function ReceberPage() {
  const [parcelas, setParcelas] = useState<ParcelaRow[]>([]);
  const [perm, setPerm] = useState({ receber: false, estornar: false });
  const [erro, setErro] = useState(""); const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [receb, setReceb] = useState<ParcelaRow | null>(null);
  const [valor, setValor] = useState(""); const [forma, setForma] = useState("Pix"); const [busy, setBusy] = useState(false);
  const [verParc, setVerParc] = useState<ParcelaRow | null>(null); const [recs, setRecs] = useState<RecebimentoRow[]>([]);
  const idemRef = useRef("");

  const carregar = useCallback(() => {
    getReceberData().then((r) => {
      if (!r.ok) { setErro(r.error || "Falha."); return; }
      setParcelas(r.parcelas || []); setPerm({ receber: !!r.canReceber, estornar: !!r.canEstornar }); setErro("");
    });
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const lista = useMemo(() => {
    const s = q.trim().toLowerCase();
    return parcelas.filter((p) => !s || (p.cliente_nome || "").toLowerCase().includes(s) || String(p.numero ?? "").includes(s) || p.descricao.toLowerCase().includes(s));
  }, [parcelas, q]);
  const totalAberto = useMemo(() => lista.reduce((s, p) => s + p.saldo, 0), [lista]);

  function abrirReceber(p: ParcelaRow) { setReceb(p); setValor(String(p.saldo)); setForma("Pix"); idemRef.current = ""; }
  async function confirmarReceber() {
    if (!receb || busy) return; setBusy(true); setMsg(""); setErro("");
    if (!idemRef.current) idemRef.current = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${receb.id}-${valor}`;
    const v = parseFloat(valor.replace(",", ".")) || 0;
    const res = await receberParcela(receb.id, { valor: v, forma, idem: idemRef.current });
    setBusy(false);
    if (!res.ok) { setErro(res.error || "Falha."); return; }
    setReceb(null); setMsg("Recebimento registrado."); carregar();
  }
  async function abrirVer(p: ParcelaRow) { setVerParc(p); const r = await getRecebimentosParcela(p.id); setRecs(r.itens || []); }
  async function estornar(id: string) {
    const res = await estornarRecebimento(id);
    if (!res.ok) { setErro(res.error || "Falha."); return; }
    setMsg("Recebimento estornado."); if (verParc) abrirVer(verParc); carregar();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Contas a Receber" description="Parcelas das vendas — recebimento, baixa e estorno." />
      {erro && <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</div>}
      {msg && <div className="rounded-lg border border-emerald-400/40 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{msg}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Parcelas</p><p className="text-2xl font-bold">{lista.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Saldo em aberto</p><p className="text-2xl font-bold text-primary">{formatCurrency(totalAberto)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Recebido</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(lista.reduce((s, p) => s + p.recebido, 0))}</p></CardContent></Card>
      </div>

      <Card><CardContent className="p-0">
        <div className="border-b p-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, venda ou descrição..." className="pl-9" /></div></div>
        <div className="overflow-x-auto"><Table className="min-w-[760px]">
          <TableHeader><TableRow>
            <TableHead className="pl-6">Venda</TableHead><TableHead>Cliente</TableHead><TableHead>Parcela</TableHead>
            <TableHead>Vencimento</TableHead><TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Saldo</TableHead><TableHead>Status</TableHead><TableHead className="pr-6 text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Nenhuma parcela.</TableCell></TableRow>
            ) : lista.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="pl-6">{p.sale_id ? <Link href={`/orcamentos/${p.sale_id}`} className="font-medium text-primary hover:underline">#{p.numero ?? "—"}</Link> : "—"}</TableCell>
                <TableCell>{p.cliente_nome || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.descricao}</TableCell>
                <TableCell className="text-muted-foreground">{p.vencimento ? formatDate(p.vencimento) : "—"}</TableCell>
                <TableCell className="text-right">{formatCurrency(p.valor)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(p.saldo)}</TableCell>
                <TableCell><Badge variant={STATUS_VAR[p.status] || "muted"}>{p.status}</Badge></TableCell>
                <TableCell className="pr-6 text-right">
                  <div className="flex justify-end gap-2">
                    {perm.receber && p.saldo > 0 && <Button size="sm" onClick={() => abrirReceber(p)}>Receber</Button>}
                    <Button size="sm" variant="outline" onClick={() => abrirVer(p)}>Recebimentos</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></div>
      </CardContent></Card>

      {/* Modal receber */}
      <Dialog open={!!receb} onOpenChange={(o) => { if (!o && !busy) setReceb(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar recebimento</DialogTitle></DialogHeader>
          {receb && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Saldo da parcela: <b>{formatCurrency(receb.saldo)}</b></p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Valor (R$)</Label><Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Forma</Label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={forma} onChange={(e) => setForma(e.target.value)}>
                    <option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Boleto</option><option>Transferência</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Gera um único movimento de caixa. Idempotente: cliques repetidos não duplicam.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceb(null)} disabled={busy}>Cancelar</Button>
            <Button onClick={confirmarReceber} disabled={busy}>{busy ? "Processando..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal ver recebimentos / estorno */}
      <Dialog open={!!verParc} onOpenChange={(o) => { if (!o) setVerParc(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recebimentos da parcela</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {recs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum recebimento.</p> : recs.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                <span className="font-medium">{formatCurrency(r.valor)}</span>
                <span className="text-muted-foreground">{r.forma || "—"}</span>
                <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                {r.estornado ? <Badge variant="destructive" className="ml-auto">Estornado</Badge>
                  : perm.estornar ? <Button size="sm" variant="outline" className="ml-auto text-destructive" onClick={() => estornar(r.id)}>Estornar</Button> : null}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
