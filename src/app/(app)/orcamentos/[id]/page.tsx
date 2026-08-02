"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowRight, Wallet, Factory } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { OrcamentoBuilder } from "@/components/comercial/orcamento-builder";
import { TransformarModal } from "@/components/comercial/transformar-modal";
import { getVenda, getHistorico, type VendaFull, type HistoricoRow } from "@/lib/data/vendas-core";
import { mudarSituacao } from "@/lib/data/vendas-actions";
import { iniciarProducao } from "@/lib/data/producao-actions";
import { labelSituacao, variantSituacao, SITUACAO_PROXIMAS } from "@/lib/commercial/situacao";
import { formatCurrency, formatDate } from "@/lib/format";

export default function VendaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const [venda, setVenda] = useState<VendaFull | null>(null);
  const [hist, setHist] = useState<HistoricoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [modal, setModal] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const v = await getVenda(params.id);
      if (!v) { setErro("Registro não encontrado."); setVenda(null); return; }
      setVenda(v); setErro("");
      setHist(await getHistorico(params.id));
    } catch (e) { setErro((e as Error).message); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { carregar(); }, [carregar]);
  // atalho vindo do builder: abrir modal de transformação automaticamente
  useEffect(() => {
    if (venda && !venda.venda_gerada && search.get("venda") === "1") setModal(true);
  }, [venda, search]);

  async function avancar(nova: string) {
    setMsg(""); setErro("");
    const res = await mudarSituacao(params.id, nova);
    if (res.ok) { setMsg("Situação atualizada."); carregar(); }
    else setErro(res.error || "Falha ao atualizar situação.");
  }

  async function iniciarProd() {
    setMsg(""); setErro("");
    const res = await iniciarProducao(params.id);
    if (res.ok) router.push(`/producao/${res.id}`);
    else setErro(res.error || "Falha ao iniciar produção.");
  }

  if (loading) return <div className="py-10 text-center text-muted-foreground">Carregando...</div>;
  if (!venda) return (
    <div className="space-y-4">
      {erro && <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</div>}
      <Button variant="outline" onClick={() => router.push("/orcamentos")}>Voltar</Button>
    </div>
  );

  const proximas = SITUACAO_PROXIMAS[venda.situacao] || [];

  return (
    <div className="space-y-6">
      {(erro || msg) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${erro ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-emerald-400/40 bg-emerald-50 text-emerald-700"}`}>
          {erro || msg}
        </div>
      )}

      {/* painel de situação + ações da venda confirmada */}
      {venda.venda_gerada && (
        <>
          <PageHeader title={`Venda #${venda.numero ?? ""}`} description={`${venda.cliente_nome} — ${formatCurrency(venda.total)}`}>
            {venda.situacao === "VENDA_CONFIRMADA" && (
              <Button variant="outline" className="gap-1.5" onClick={iniciarProd}><Factory className="h-4 w-4" /> Iniciar produção</Button>
            )}
            <Button asChild variant="outline" className="gap-1.5"><Link href={`/orcamentos/${venda.id}/financeiro`}><Wallet className="h-4 w-4" /> Financeiro</Link></Button>
            <Button asChild variant="outline" className="gap-1.5"><Link href={`/orcamentos/${venda.id}/pdf`}><Printer className="h-4 w-4" /> PDF</Link></Button>
          </PageHeader>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 p-5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Situação:</span>
                <Badge variant={variantSituacao(venda.situacao)}>{labelSituacao(venda.situacao)}</Badge>
              </div>
              {proximas.length > 0 && (
                <div className="ml-auto flex flex-wrap gap-2">
                  {proximas.map((p) => (
                    <Button key={p} size="sm" variant={p === "CANCELADO" ? "outline" : "default"} className="gap-1"
                      onClick={() => { if (p !== "CANCELADO" || confirm("Cancelar esta venda?")) avancar(p); }}>
                      {p !== "CANCELADO" && <ArrowRight className="h-3.5 w-3.5" />} {labelSituacao(p)}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* orçamento: transformar em venda */}
      {!venda.venda_gerada && venda.situacao !== "CANCELADO" && (
        <Card className="border-primary/30">
          <CardContent className="flex flex-wrap items-center gap-4 p-5">
            <div>
              <p className="text-sm text-muted-foreground">Este registro é um orçamento.</p>
              <p className="text-lg font-semibold">{formatCurrency(venda.total)}</p>
            </div>
            <Button className="ml-auto" onClick={() => setModal(true)}>Transformar em venda</Button>
          </CardContent>
        </Card>
      )}

      {/* corpo: builder (editável se orçamento, somente leitura se venda) */}
      <OrcamentoBuilder inicial={venda} />

      {/* histórico */}
      {hist.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Histórico</h3>
            <ul className="space-y-2 text-sm">
              {hist.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <span className="text-xs">{formatDate(h.created_at)}</span>
                  <span className="font-medium text-foreground">{h.campo}</span>
                  <span>{labelSituacao(h.de)} → {labelSituacao(h.para)}</span>
                  {h.obs && <span className="italic">· {h.obs}</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <TransformarModal open={modal} onClose={() => setModal(false)} saleId={venda.id} total={venda.total}
        onDone={() => { setModal(false); setMsg("Venda gerada com sucesso."); carregar(); router.replace(`/orcamentos/${venda.id}`); }} />
    </div>
  );
}
