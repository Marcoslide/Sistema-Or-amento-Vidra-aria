"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { getAnaliseVenda, addCustoExtra, removeCustoExtra, type AnaliseVendaData } from "@/lib/data/analise-actions";

export default function AnaliseVendaPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AnaliseVendaData | null>(null);
  const [erro, setErro] = useState(""); const [busy, setBusy] = useState(false);
  const [novo, setNovo] = useState<{ descricao: string; categoria: string; valor: string; participa: boolean } | null>(null);

  const carregar = useCallback(() => {
    getAnaliseVenda(id).then((r) => { if (!r.ok) { setErro(r.error || "Falha."); return; } setData(r.data || null); setErro(""); });
  }, [id]);
  useEffect(() => { carregar(); }, [carregar]);

  async function adicionar() {
    if (!novo) return; setBusy(true); setErro("");
    const res = await addCustoExtra(id, { descricao: novo.descricao, categoria: novo.categoria, valor: parseFloat(novo.valor.replace(",", ".")) || 0, participa_margem: novo.participa });
    setBusy(false);
    if (!res.ok) { setErro(res.error || "Falha."); return; }
    setNovo(null); carregar();
  }
  async function remover(cid: string) { const res = await removeCustoExtra(cid); if (res.ok) carregar(); else setErro(res.error || "Falha."); }

  if (erro && !data) return (
    <div className="space-y-4">
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</div>
      <Button asChild variant="outline"><Link href={`/orcamentos/${id}`}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link></Button>
    </div>
  );
  if (!data) return <div className="py-10 text-center text-muted-foreground">Carregando...</div>;
  const a = data.analise;

  const linha = (label: string, v: number, cls = "") => (
    <div className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">{label}</span><span className={`font-medium ${cls}`}>{formatCurrency(v)}</span></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link href={`/orcamentos/${id}`}><ArrowLeft className="h-4 w-4" /></Link></Button>
        <PageHeader title={`Análise financeira — Venda #${data.sale.numero ?? ""}`} description={data.sale.cliente_nome || ""} />
      </div>
      {erro && <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardContent className="p-5">
          <h3 className="mb-2 text-sm font-semibold">Receita e custos</h3>
          {linha("Receita bruta", a.receitaBruta)}
          {linha("Descontos", -a.descontos)}
          {linha("Acréscimos", a.acrescimos)}
          {linha("Frete", a.frete)}
          {linha("Instalação", a.instalacao)}
          <div className="my-1 border-t" />
          {linha("Receita líquida", a.receitaLiquida, "text-foreground")}
          {linha("Custo dos produtos", -a.custoProdutos)}
          {linha("Custos extras (margem)", -a.custosExtras)}
        </CardContent></Card>

        <Card><CardContent className="p-5">
          <h3 className="mb-2 text-sm font-semibold">Margem e lucro</h3>
          {linha("Margem bruta", a.margemBruta)}
          {linha("Margem de contribuição", a.margemContribuicao)}
          <div className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">Margem %</span><span className="font-medium">{a.margemPct.toFixed(1)}%</span></div>
          <div className="my-1 border-t" />
          {linha("Lucro estimado", a.lucroEstimado, a.lucroEstimado >= 0 ? "text-emerald-600" : "text-destructive")}
          {linha("Recebido", data.recebido)}
          {linha("Lucro realizado", a.lucroRealizado, a.lucroRealizado >= 0 ? "text-emerald-600" : "text-destructive")}
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Custos extras da venda</h3>
          {data.canEdit && <Button size="sm" className="gap-1" onClick={() => setNovo({ descricao: "", categoria: "reclamacao", valor: "0", participa: true })}><Plus className="h-3.5 w-3.5" /> Custo</Button>}
        </div>
        {data.extras.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum custo extra lançado.</p> : (
          <ul className="space-y-2">
            {data.extras.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                <span className="font-medium">{e.descricao}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{e.categoria}</span>
                {!e.participa_margem && <span className="text-xs text-muted-foreground">(fora da margem)</span>}
                <span className="ml-auto font-semibold">{formatCurrency(e.valor)}</span>
                {data.canEdit && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remover(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>

      <Dialog open={!!novo} onOpenChange={(o) => { if (!o) setNovo(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar custo à venda</DialogTitle></DialogHeader>
          {novo && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label>Descrição *</Label><Input value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Categoria</Label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={novo.categoria} onChange={(e) => setNovo({ ...novo, categoria: e.target.value })}>
                  <option value="reclamacao">reclamação</option><option value="assistencia">assistência</option><option value="rateio">rateio</option><option value="outro">outro</option>
                </select>
              </div>
              <div className="space-y-1.5"><Label>Valor (R$)</Label><Input type="number" value={novo.valor} onChange={(e) => setNovo({ ...novo, valor: e.target.value })} /></div>
              <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={novo.participa} onChange={(e) => setNovo({ ...novo, participa: e.target.checked })} className="h-4 w-4 accent-primary" /> Participa da margem</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovo(null)} disabled={busy}>Cancelar</Button>
            <Button onClick={adicionar} disabled={busy}>{busy ? "Salvando..." : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
