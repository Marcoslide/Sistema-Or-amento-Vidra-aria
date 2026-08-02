"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getPagarData, salvarPagar, pagarConta, excluirPagar, getPagamentosConta, estornarPagamento,
  type PagarRow, type PagamentoRow,
} from "@/lib/data/financeiro-actions";
import { listLojasSel, type Opt } from "@/lib/data/vendas-core";

type FormPagar = { descricao: string; fornecedor: string; categoria: string; valor: string; vencimento: string; store_id: string };
const vazio: FormPagar = { descricao: "", fornecedor: "", categoria: "", valor: "0", vencimento: "", store_id: "" };

export default function PagarPage() {
  const [contas, setContas] = useState<PagarRow[]>([]);
  const [perm, setPerm] = useState({ pagar: false, estornar: false, excluir: false });
  const [lojas, setLojas] = useState<Opt[]>([]);
  const [erro, setErro] = useState(""); const [msg, setMsg] = useState(""); const [q, setQ] = useState("");
  const [form, setForm] = useState<FormPagar | null>(null); const [editId, setEditId] = useState<string | null>(null);
  const [pay, setPay] = useState<PagarRow | null>(null); const [valorPay, setValorPay] = useState(""); const [formaPay, setFormaPay] = useState("Pix");
  const [busy, setBusy] = useState(false);
  const [verConta, setVerConta] = useState<PagarRow | null>(null); const [pgtos, setPgtos] = useState<PagamentoRow[]>([]);
  const idemRef = useRef("");

  const carregar = useCallback(() => {
    getPagarData().then((r) => {
      if (!r.ok) { setErro(r.error || "Falha."); return; }
      setContas(r.contas || []); setPerm({ pagar: !!r.canPagar, estornar: !!r.canEstornar, excluir: !!r.canExcluir }); setErro("");
    });
  }, []);
  useEffect(() => { carregar(); listLojasSel().then(setLojas).catch(() => {}); }, [carregar]);

  const lista = useMemo(() => {
    const s = q.trim().toLowerCase();
    return contas.filter((c) => !s || c.descricao.toLowerCase().includes(s) || (c.fornecedor || "").toLowerCase().includes(s) || (c.categoria || "").toLowerCase().includes(s));
  }, [contas, q]);
  const totalAberto = useMemo(() => lista.reduce((s, c) => s + (c.cancelada ? 0 : c.saldo), 0), [lista]);

  async function salvar() {
    if (!form) return; setBusy(true); setErro("");
    const res = await salvarPagar(editId, { ...form, valor: parseFloat(form.valor.replace(",", ".")) || 0, vencimento: form.vencimento || null });
    setBusy(false);
    if (!res.ok) { setErro(res.error || "Falha."); return; }
    setForm(null); setEditId(null); setMsg("Conta salva."); carregar();
  }
  function abrirPagar(c: PagarRow) { setPay(c); setValorPay(String(c.saldo)); setFormaPay("Pix"); idemRef.current = ""; }
  async function confirmarPagar() {
    if (!pay || busy) return; setBusy(true); setErro("");
    if (!idemRef.current) idemRef.current = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${pay.id}-${valorPay}`;
    const res = await pagarConta(pay.id, { valor: parseFloat(valorPay.replace(",", ".")) || 0, forma: formaPay, idem: idemRef.current });
    setBusy(false);
    if (!res.ok) { setErro(res.error || "Falha."); return; }
    setPay(null); setMsg("Pagamento registrado."); carregar();
  }
  async function excluir(c: PagarRow) {
    if (!confirm(`Excluir "${c.descricao}"?`)) return;
    const res = await excluirPagar(c.id);
    if (res.ok) { setMsg("Conta excluída."); carregar(); } else setErro(res.error || "Falha.");
  }
  async function abrirVer(c: PagarRow) { setVerConta(c); const r = await getPagamentosConta(c.id); setPgtos(r.itens || []); }
  async function estornar(id: string) {
    const res = await estornarPagamento(id);
    if (res.ok) { setMsg("Pagamento estornado."); if (verConta) abrirVer(verConta); carregar(); } else setErro(res.error || "Falha.");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Contas a Pagar" description="Despesas — pagamento, estorno e exclusão segura.">
        <Button className="gap-1.5" onClick={() => { setForm({ ...vazio }); setEditId(null); }}><Plus className="h-4 w-4" /> Nova conta</Button>
      </PageHeader>
      {erro && <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</div>}
      {msg && <div className="rounded-lg border border-emerald-400/40 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{msg}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Contas</p><p className="text-2xl font-bold">{lista.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Saldo a pagar</p><p className="text-2xl font-bold text-destructive">{formatCurrency(totalAberto)}</p></CardContent></Card>
      </div>

      <Card><CardContent className="p-0">
        <div className="border-b p-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar descrição, fornecedor ou categoria..." className="pl-9" /></div></div>
        <div className="overflow-x-auto"><Table className="min-w-[760px]">
          <TableHeader><TableRow>
            <TableHead className="pl-6">Descrição</TableHead><TableHead>Fornecedor</TableHead><TableHead>Vencimento</TableHead>
            <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Saldo</TableHead><TableHead>Status</TableHead><TableHead className="pr-6 text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nenhuma conta.</TableCell></TableRow>
            ) : lista.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="pl-6 font-medium">{c.descricao}</TableCell>
                <TableCell className="text-muted-foreground">{c.fornecedor || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.vencimento ? formatDate(c.vencimento) : "—"}</TableCell>
                <TableCell className="text-right">{formatCurrency(c.valor)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(c.saldo)}</TableCell>
                <TableCell><Badge variant={c.cancelada ? "destructive" : c.saldo <= 0 ? "success" : c.pago > 0 ? "warning" : "muted"}>{c.cancelada ? "Cancelada" : c.saldo <= 0 ? "Paga" : c.pago > 0 ? "Parcial" : "Aberta"}</Badge></TableCell>
                <TableCell className="pr-6 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {perm.pagar && c.saldo > 0 && !c.cancelada && <DropdownMenuItem onClick={() => abrirPagar(c)}>Pagar</DropdownMenuItem>}
                      <DropdownMenuItem onClick={() => { setForm({ descricao: c.descricao, fornecedor: c.fornecedor || "", categoria: c.categoria || "", valor: String(c.valor), vencimento: c.vencimento || "", store_id: c.store_id }); setEditId(c.id); }}>Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => abrirVer(c)}>Pagamentos</DropdownMenuItem>
                      {perm.excluir && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => excluir(c)}>Excluir</DropdownMenuItem></>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></div>
      </CardContent></Card>

      {/* Modal criar/editar */}
      <Dialog open={!!form} onOpenChange={(o) => { if (!o) { setForm(null); setEditId(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar" : "Nova"} conta a pagar</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label>Descrição da despesa *</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Categoria</Label><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Valor (R$)</Label><Input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Vencimento</Label><Input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} /></div>
              <div className="col-span-2 space-y-1.5"><Label>Loja *</Label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.store_id} onChange={(e) => setForm({ ...form, store_id: e.target.value })}>
                  <option value="">— selecione —</option>
                  {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setForm(null); setEditId(null); }} disabled={busy}>Cancelar</Button>
            <Button onClick={salvar} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal pagar */}
      <Dialog open={!!pay} onOpenChange={(o) => { if (!o && !busy) setPay(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle></DialogHeader>
          {pay && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Saldo: <b>{formatCurrency(pay.saldo)}</b></p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Valor (R$)</Label><Input type="number" value={valorPay} onChange={(e) => setValorPay(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Forma</Label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={formaPay} onChange={(e) => setFormaPay(e.target.value)}>
                    <option>Pix</option><option>Dinheiro</option><option>Boleto</option><option>Transferência</option><option>Cartão</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Gera um único movimento de caixa (saída). Idempotente.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPay(null)} disabled={busy}>Cancelar</Button>
            <Button onClick={confirmarPagar} disabled={busy}>{busy ? "Processando..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal ver pagamentos / estorno */}
      <Dialog open={!!verConta} onOpenChange={(o) => { if (!o) setVerConta(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pagamentos da conta</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {pgtos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pagamento.</p> : pgtos.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                <span className="font-medium">{formatCurrency(p.valor)}</span>
                <span className="text-muted-foreground">{p.forma || "—"}</span>
                <span className="text-xs text-muted-foreground">{formatDate(p.created_at)}</span>
                {p.estornado ? <Badge variant="destructive" className="ml-auto">Estornado</Badge>
                  : perm.estornar ? <Button size="sm" variant="outline" className="ml-auto text-destructive" onClick={() => estornar(p.id)}>Estornar</Button> : null}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
