"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, Plus, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import {
  getOP, mudarEtapa, setEtapaAplicavel, addTerceirizacao, receberTerceirizacao, apontar, concluirProducao,
  type OPFull,
} from "@/lib/data/producao-actions";

const ET_VAR: Record<string, "muted" | "warning" | "success"> = { PENDENTE: "muted", ANDAMENTO: "warning", CONCLUIDA: "success" };
const proxStatus = (s: string) => (s === "PENDENTE" ? "ANDAMENTO" : s === "ANDAMENTO" ? "CONCLUIDA" : "PENDENTE");

export default function OPPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<OPFull | null>(null);
  const [erro, setErro] = useState(""); const [msg, setMsg] = useState("");
  const [terc, setTerc] = useState<{ fornecedor: string; servico: string; previsao: string } | null>(null);
  const [apo, setApo] = useState<{ etapa: string; funcionario: string; duracao_min: string; quantidade: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(() => {
    getOP(id).then((r) => { if (!r.ok) { setErro(r.error || "Falha."); return; } setD(r.data || null); setErro(""); });
  }, [id]);
  useEffect(() => { carregar(); }, [carregar]);

  async function etapaClick(sid: string, status: string) { const r = await mudarEtapa(sid, proxStatus(status)); if (r.ok) carregar(); else setErro(r.error || "Falha."); }
  async function toggleNA(sid: string, apl: boolean) { const r = await setEtapaAplicavel(sid, !apl); if (r.ok) carregar(); else setErro(r.error || "Falha."); }
  async function salvarTerc() { if (!terc) return; setBusy(true); const r = await addTerceirizacao(id, terc); setBusy(false); if (r.ok) { setTerc(null); carregar(); } else setErro(r.error || "Falha."); }
  async function marcarTerc(tid: string, campo: "recebido" | "conferido", val: boolean) { const r = await receberTerceirizacao(tid, campo, val); if (r.ok) carregar(); else setErro(r.error || "Falha."); }
  async function salvarApo() { if (!apo) return; setBusy(true); const r = await apontar(id, { etapa: apo.etapa, funcionario: apo.funcionario, duracao_min: Number(apo.duracao_min) || 0, quantidade: Number(apo.quantidade) || 0 }); setBusy(false); if (r.ok) { setApo(null); carregar(); } else setErro(r.error || "Falha."); }
  async function concluir() { setBusy(true); setMsg(""); const r = await concluirProducao(id); setBusy(false); if (r.ok) { setMsg("Produção concluída — pronta para execução."); carregar(); } else setErro(r.error || "Falha."); }

  if (erro && !d) return <div className="space-y-4"><div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</div><Button asChild variant="outline"><Link href="/producao"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link></Button></div>;
  if (!d) return <div className="py-10 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link href="/producao"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <PageHeader title={`OP #${d.ordem.numero ?? ""}`} description={d.ordem.cliente_nome || ""}>
          <Button asChild variant="outline" className="gap-1.5"><Link href={`/producao/${id}/pdf`}><Printer className="h-4 w-4" /> OP (PDF)</Link></Button>
          {d.perms.concluir && d.ordem.status !== "CONCLUIDA" && <Button className="gap-1.5" disabled={busy} onClick={concluir}><CheckCircle2 className="h-4 w-4" /> Concluir</Button>}
        </PageHeader>
      </div>
      {erro && <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</div>}
      {msg && <div className="rounded-lg border border-emerald-400/40 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{msg}</div>}

      <Card><CardContent className="flex flex-wrap items-center gap-4 p-5">
        <Badge variant={d.ordem.status === "CONCLUIDA" ? "success" : "warning"}>{d.ordem.status.replace("_", " ")}</Badge>
        <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Progresso</span>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${d.pct}%` }} /></div>
          <span className="text-sm font-medium">{d.pct}%</span></div>
        {d.ordem.prazo && <span className="text-sm text-muted-foreground">Prazo: {formatDate(d.ordem.prazo)}</span>}
        {d.ordem.sale_id && <Link href={`/orcamentos/${d.ordem.sale_id}`} className="ml-auto text-sm text-primary hover:underline">Ver venda</Link>}
      </CardContent></Card>

      {/* Etapas */}
      <Card><CardContent className="p-5">
        <h3 className="mb-3 text-sm font-semibold">Etapas</h3>
        <div className="flex flex-wrap gap-2">
          {d.etapas.map((e) => (
            <div key={e.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${e.aplicavel ? "" : "opacity-50"}`}>
              <button onClick={() => etapaClick(e.id, e.status)} disabled={!e.aplicavel} className="flex items-center gap-2">
                <Badge variant={ET_VAR[e.status] || "muted"}>{e.status[0]}</Badge>
                <span className="capitalize">{e.nome}</span>
              </button>
              <button onClick={() => toggleNA(e.id, e.aplicavel)} className="text-[11px] text-muted-foreground underline">{e.aplicavel ? "N/A" : "usar"}</button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Clique na etapa para avançar (Pendente → Andamento → Concluída). &quot;N/A&quot; tira do cálculo de progresso.</p>
      </CardContent></Card>

      {/* Itens */}
      <Card><CardContent className="p-5">
        <h3 className="mb-3 text-sm font-semibold">Itens ({d.itens.length})</h3>
        {d.itens.length === 0 ? <p className="text-sm text-muted-foreground">Sem itens.</p> : (
          <ul className="space-y-1 text-sm">
            {d.itens.map((it) => (
              <li key={it.id} className="flex flex-wrap items-center gap-2 border-b py-1">
                <span className="font-medium">{it.descricao || it.regra || "Item"}</span>
                {it.largura != null && <span className="text-muted-foreground">{it.largura}×{it.altura} {it.unidade}</span>}
                <span className="text-muted-foreground">qtd {it.quantidade}</span>
                {it.vidro && <span className="text-xs text-muted-foreground">vidro: {it.vidro}</span>}
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>

      {/* Terceirizações */}
      <Card><CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Terceirizações</h3>
          {d.perms.terceirizar && <Button size="sm" className="gap-1" onClick={() => setTerc({ fornecedor: "", servico: "", previsao: "" })}><Plus className="h-3.5 w-3.5" /> Terceirização</Button>}
        </div>
        {d.terceirizacoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma.</p> : (
          <ul className="space-y-2">
            {d.terceirizacoes.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-md border p-2 text-sm">
                <span className="font-medium">{t.fornecedor || "—"}</span><span className="text-muted-foreground">{t.servico || "—"}</span>
                {t.previsao && <span className="text-xs text-muted-foreground">prev.: {formatDate(t.previsao)}</span>}
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant={t.recebido ? "default" : "outline"} disabled={!d.perms.terceirizar} onClick={() => marcarTerc(t.id, "recebido", !t.recebido)}>{t.recebido ? "Recebido ✓" : "Receber"}</Button>
                  <Button size="sm" variant={t.conferido ? "default" : "outline"} disabled={!d.perms.conferir} onClick={() => marcarTerc(t.id, "conferido", !t.conferido)}>{t.conferido ? "Conferido ✓" : "Conferir"}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>

      {/* Apontamentos */}
      <Card><CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Apontamentos</h3>
          {d.perms.apontar && <Button size="sm" className="gap-1" onClick={() => setApo({ etapa: "", funcionario: "", duracao_min: "0", quantidade: "0" })}><Plus className="h-3.5 w-3.5" /> Apontar</Button>}
        </div>
        {d.apontamentos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum apontamento.</p> : (
          <ul className="space-y-1 text-sm">
            {d.apontamentos.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 border-b py-1">
                <span className="font-medium">{a.funcionario || "—"}</span>
                {a.etapa && <span className="capitalize text-muted-foreground">{a.etapa}</span>}
                <span className="text-muted-foreground">{a.duracao_min} min · {a.quantidade} un</span>
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>

      {/* Modal terceirização */}
      <Dialog open={!!terc} onOpenChange={(o) => { if (!o) setTerc(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova terceirização</DialogTitle></DialogHeader>
          {terc && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Fornecedor</Label><Input value={terc.fornecedor} onChange={(e) => setTerc({ ...terc, fornecedor: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Serviço</Label><Input value={terc.servico} onChange={(e) => setTerc({ ...terc, servico: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Previsão</Label><Input type="date" value={terc.previsao} onChange={(e) => setTerc({ ...terc, previsao: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setTerc(null)} disabled={busy}>Cancelar</Button><Button onClick={salvarTerc} disabled={busy}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal apontamento */}
      <Dialog open={!!apo} onOpenChange={(o) => { if (!o) setApo(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apontar produção</DialogTitle></DialogHeader>
          {apo && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label>Funcionário</Label><Input value={apo.funcionario} onChange={(e) => setApo({ ...apo, funcionario: e.target.value })} /></div>
              <div className="col-span-2 space-y-1.5"><Label>Etapa</Label><Input value={apo.etapa} onChange={(e) => setApo({ ...apo, etapa: e.target.value })} placeholder="corte, montagem..." /></div>
              <div className="space-y-1.5"><Label>Duração (min)</Label><Input type="number" value={apo.duracao_min} onChange={(e) => setApo({ ...apo, duracao_min: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Quantidade</Label><Input type="number" value={apo.quantidade} onChange={(e) => setApo({ ...apo, quantidade: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setApo(null)} disabled={busy}>Cancelar</Button><Button onClick={salvarApo} disabled={busy}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
