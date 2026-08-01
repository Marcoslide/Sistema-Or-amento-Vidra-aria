"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Copy, Package, Home } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import {
  listLojasSel, listClientesSel, listVendedoresSel, listProdutosSel, meuContexto,
  type Opt, type ProdutoOpt, type VendaFull,
} from "@/lib/data/vendas-core";
import { salvarOrcamento, type OrcamentoIn } from "@/lib/data/vendas-actions";
import {
  calcOrc, margemOrc, totalItem, memoMedida,
  type OrcamentoCalc, type Regra,
} from "@/lib/commercial/calc";

// ---- estado local (UI) ----
type MedidaUI = { l: string; a: string; q: string; unit: string };
type ItemUI = { product_id: string; regra: string; desc_pct: string; preco_override: string; medidas: MedidaUI[] };
type AmbUI = { nome: string; itens: ItemUI[] };

const REGRAS_UN = new Set(["UN", "BARRA", "CHAPA", "KIT"]);
const novaMedida = (): MedidaUI => ({ l: "", a: "", q: "1", unit: "cm" });
const novoItem = (): ItemUI => ({ product_id: "", regra: "UN", desc_pct: "0", preco_override: "", medidas: [novaMedida()] });
const novoAmb = (): AmbUI => ({ nome: "Ambiente", itens: [novoItem()] });

function num(v: string): number {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function OrcamentoBuilder({ inicial }: { inicial?: VendaFull }) {
  const router = useRouter();
  const editId = inicial?.id || null;
  const bloqueado = Boolean(inicial?.venda_gerada); // venda confirmada não edita como orçamento

  const [lojas, setLojas] = useState<Opt[]>([]);
  const [clientes, setClientes] = useState<Opt[]>([]);
  const [vendedores, setVendedores] = useState<Opt[]>([]);
  const [produtos, setProdutos] = useState<ProdutoOpt[]>([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [storeId, setStoreId] = useState(inicial?.store_id || "");
  const [clienteId, setClienteId] = useState(inicial?.cliente_id || "");
  const [clienteNome, setClienteNome] = useState(inicial?.cliente_nome || "");
  const [sellerId, setSellerId] = useState(inicial?.seller_id || "");
  const [vendNome, setVendNome] = useState(inicial?.vend_nome || "");
  const [descPct, setDescPct] = useState(String(inicial?.desc_pct ?? 0));
  const [acrescimo, setAcrescimo] = useState(String(inicial?.acrescimo ?? 0));
  const [frete, setFrete] = useState(String(inicial?.frete ?? 0));
  const [instalacao, setInstalacao] = useState(String(inicial?.instalacao ?? 0));
  const [obs, setObs] = useState(inicial?.obs || "");
  const [obsInterna, setObsInterna] = useState(inicial?.obs_interna || "");
  const [prazo, setPrazo] = useState(inicial?.prazo_dias != null ? String(inicial.prazo_dias) : "");
  const [condicao, setCondicao] = useState(
    typeof inicial?.condicao === "string" ? inicial.condicao : "",
  );
  const [ambientes, setAmbientes] = useState<AmbUI[]>(
    inicial
      ? inicial.ambientes.map((a) => ({
          nome: a.nome,
          itens: a.itens.map((i) => ({
            product_id: i.product_id || "", regra: i.regra, desc_pct: String(i.desc_pct),
            preco_override: i.preco_override != null ? String(i.preco_override) : "",
            medidas: i.medidas.map((m) => ({ l: String(m.l), a: String(m.a), q: String(m.q), unit: m.unit })),
          })),
        }))
      : [novoAmb()],
  );

  useEffect(() => {
    Promise.all([listLojasSel(), listClientesSel(), listVendedoresSel(), listProdutosSel(), meuContexto()])
      .then(([lo, cl, ve, pr, ctx]) => {
        setLojas(lo); setClientes(cl); setVendedores(ve); setProdutos(pr); setErro("");
        // vendedor automático + loja padrão (só em novo lançamento; nunca sobrescreve edição)
        if (!editId) {
          if (ctx.sellerId && !sellerId) { setSellerId(ctx.sellerId); setVendNome(ctx.vendNome || ""); }
          if (ctx.lojaIds.length === 1 && !storeId) setStoreId(ctx.lojaIds[0]);
        }
      })
      .catch((e) => setErro((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prodMap = useMemo(() => {
    const m: Record<string, ProdutoOpt> = {};
    produtos.forEach((p) => { m[p.id] = p; });
    return m;
  }, [produtos]);

  // ---- monta o objeto de cálculo (mesmo motor do servidor) ----
  const calc: OrcamentoCalc = useMemo(() => ({
    itens: ambientes.flatMap((a) => a.itens.map((it) => {
      const p = it.product_id ? prodMap[it.product_id] : undefined;
      return {
        regra: (it.regra as Regra),
        descPct: num(it.desc_pct),
        precoOverride: it.preco_override.trim() !== "" ? num(it.preco_override) : null,
        medidas: it.medidas.map((m) => ({ l: num(m.l), a: num(m.a), q: num(m.q), unit: m.unit as "cm" | "mm" | "m" })),
        produto: p ? { preco: p.preco, custoBase: p.custoBase, larguraMolduraCm: p.larguraMolduraCm, multiplicadorCorte: p.multiplicadorCorte } : undefined,
      };
    })),
    desc: num(descPct), acrescimo: num(acrescimo), frete: num(frete), instalacao: num(instalacao),
  }), [ambientes, prodMap, descPct, acrescimo, frete, instalacao]);

  const totais = useMemo(() => calcOrc(calc), [calc]);
  const margem = useMemo(() => margemOrc(calc), [calc]);

  // ---- mutações de ambientes/itens/medidas ----
  const setAmb = (ai: number, patch: Partial<AmbUI>) =>
    setAmbientes((prev) => prev.map((a, i) => (i === ai ? { ...a, ...patch } : a)));
  const setItem = (ai: number, ii: number, patch: Partial<ItemUI>) =>
    setAmbientes((prev) => prev.map((a, i) => i !== ai ? a : { ...a, itens: a.itens.map((it, j) => (j === ii ? { ...it, ...patch } : it)) }));
  const setMedida = (ai: number, ii: number, mi: number, patch: Partial<MedidaUI>) =>
    setAmbientes((prev) => prev.map((a, i) => i !== ai ? a : {
      ...a, itens: a.itens.map((it, j) => j !== ii ? it : { ...it, medidas: it.medidas.map((m, k) => (k === mi ? { ...m, ...patch } : m)) }),
    }));

  const escolherProduto = (ai: number, ii: number, pid: string) => {
    const p = prodMap[pid];
    setItem(ai, ii, { product_id: pid, regra: p ? p.regra : "UN" });
  };

  async function salvar(irParaVenda = false) {
    setErro("");
    if (!storeId) { setErro("Selecione a loja da venda (obrigatória)."); return; }
    if (!clienteNome.trim()) { setErro("Informe o cliente."); return; }
    setSalvando(true);
    const payload: OrcamentoIn = {
      store_id: storeId, cliente_id: clienteId || null, cliente_nome: clienteNome.trim(),
      seller_id: sellerId || null, vend_nome: vendNome,
      desc_pct: num(descPct), acrescimo: num(acrescimo), frete: num(frete), instalacao: num(instalacao),
      obs, obs_interna: obsInterna, prazo_dias: prazo.trim() !== "" ? Math.trunc(num(prazo)) : null,
      condicao: condicao.trim() || null,
      ambientes: ambientes.map((a) => ({
        nome: a.nome || "Ambiente",
        itens: a.itens.map((it) => ({
          product_id: it.product_id || null, regra: it.regra, desc_pct: num(it.desc_pct),
          preco_override: it.preco_override.trim() !== "" ? num(it.preco_override) : null,
          medidas: it.medidas.map((m) => ({ l: num(m.l), a: num(m.a), q: Math.trunc(num(m.q)) || 1, unit: m.unit })),
        })),
      })),
    };
    const res = await salvarOrcamento(editId, payload);
    setSalvando(false);
    if (!res.ok) { setErro(res.error || "Falha ao salvar."); return; }
    if (irParaVenda && res.id) router.push(`/orcamentos/${res.id}?venda=1`);
    else router.push(`/orcamentos/${res.id}`);
  }

  const clienteSel = (id: string) => {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    if (c) setClienteNome(c.nome);
  };
  const vendedorSel = (id: string) => {
    setSellerId(id);
    const v = vendedores.find((x) => x.id === id);
    setVendNome(v ? v.nome : "");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={editId ? `Orçamento ${inicial?.numero ? "#" + inicial.numero : ""}` : "Novo orçamento"}
        description={bloqueado ? "Venda confirmada — visualização (não editável como orçamento)." : "Cliente, ambientes, itens e condições comerciais."}
      >
        <Button variant="outline" onClick={() => router.push("/orcamentos")}>Voltar</Button>
        {!bloqueado && (
          <Button disabled={salvando} onClick={() => salvar(false)}>
            {salvando ? "Salvando..." : "Salvar orçamento"}
          </Button>
        )}
      </PageHeader>

      {erro && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</div>
      )}
      {bloqueado && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Esta venda já foi confirmada. Edições de orçamento estão bloqueadas para preservar o histórico financeiro.
        </div>
      )}

      <fieldset disabled={bloqueado} className="space-y-6">
        {/* ---- Cabeçalho comercial ---- */}
        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Loja da venda *</Label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                <option value="">— selecione —</option>
                {lojas.map((l) => (<option key={l.id} value={l.id}>{l.nome}</option>))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={clienteId} onChange={(e) => clienteSel(e.target.value)}>
                <option value="">— selecione / avulso —</option>
                {clientes.map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
              </select>
              {!clienteId && (
                <Input placeholder="Nome do cliente (avulso)" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Vendedor</Label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={sellerId} onChange={(e) => vendedorSel(e.target.value)}>
                <option value="">— sem vendedor —</option>
                {vendedores.map((v) => (<option key={v.id} value={v.id}>{v.nome}</option>))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* ---- Ambientes / itens ---- */}
        <div className="space-y-4">
          {ambientes.map((amb, ai) => (
            <Card key={ai}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <Input className="max-w-xs font-medium" value={amb.nome} onChange={(e) => setAmb(ai, { nome: e.target.value })} placeholder="Nome do ambiente" />
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setAmb(ai, { itens: [...amb.itens, novoItem()] })}>
                      <Plus className="h-3.5 w-3.5" /> Item
                    </Button>
                    {ambientes.length > 1 && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setAmbientes((p) => p.filter((_, i) => i !== ai))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {amb.itens.map((it, ii) => {
                  const p = it.product_id ? prodMap[it.product_id] : undefined;
                  const regra = it.regra as Regra;
                  const precisaLA = regra === "M2" || regra === "MOLDURA" || regra === "PERIMETRO";
                  const precisaL = regra === "ML";
                  const isMoldura = regra === "MOLDURA";
                  const linha = totalItem({
                    regra, descPct: num(it.desc_pct),
                    precoOverride: it.preco_override.trim() !== "" ? num(it.preco_override) : null,
                    medidas: it.medidas.map((m) => ({ l: num(m.l), a: num(m.a), q: num(m.q), unit: m.unit as "cm" | "mm" | "m" })),
                    produto: p ? { preco: p.preco, custoBase: p.custoBase, larguraMolduraCm: p.larguraMolduraCm, multiplicadorCorte: p.multiplicadorCorte } : undefined,
                  });
                  return (
                    <div key={ii} className="rounded-lg border bg-muted/30 p-4">
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[220px] flex-1 space-y-1.5">
                          <Label className="text-xs">Produto</Label>
                          <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={it.product_id} onChange={(e) => escolherProduto(ai, ii, e.target.value)}>
                            <option value="">— selecione —</option>
                            {produtos.map((pr) => (<option key={pr.id} value={pr.id}>{pr.descricao} ({pr.regra})</option>))}
                          </select>
                        </div>
                        <div className="w-24 space-y-1.5">
                          <Label className="text-xs">Regra</Label>
                          <Input className="h-9" value={it.regra} readOnly title="Definida pelo produto" />
                        </div>
                        <div className="w-28 space-y-1.5">
                          <Label className="text-xs">Preço un.</Label>
                          <Input className="h-9" type="number" placeholder={p ? String(p.preco) : "0"} value={it.preco_override} onChange={(e) => setItem(ai, ii, { preco_override: e.target.value })} />
                        </div>
                        <div className="w-20 space-y-1.5">
                          <Label className="text-xs">Desc %</Label>
                          <Input className="h-9" type="number" value={it.desc_pct} onChange={(e) => setItem(ai, ii, { desc_pct: e.target.value })} />
                        </div>
                        <div className="ml-auto text-right">
                          <p className="text-xs text-muted-foreground">Total item</p>
                          <p className="text-lg font-semibold">{formatCurrency(linha.total)}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setAmb(ai, { itens: amb.itens.filter((_, j) => j !== ii) })} disabled={amb.itens.length <= 1}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {isMoldura && p && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Moldura: perfil {p.larguraMolduraCm} cm × mult {p.multiplicadorCorte} — consumo = perímetro + acréscimo de corte.
                        </p>
                      )}

                      {/* medidas */}
                      <div className="mt-3 space-y-2">
                        {it.medidas.map((m, mi) => (
                          <div key={mi} className="flex flex-wrap items-end gap-2">
                            {(precisaLA || precisaL) && (
                              <div className="w-24 space-y-1">
                                <Label className="text-[11px]">Largura</Label>
                                <Input className="h-8" type="number" value={m.l} onChange={(e) => setMedida(ai, ii, mi, { l: e.target.value })} />
                              </div>
                            )}
                            {precisaLA && (
                              <div className="w-24 space-y-1">
                                <Label className="text-[11px]">Altura</Label>
                                <Input className="h-8" type="number" value={m.a} onChange={(e) => setMedida(ai, ii, mi, { a: e.target.value })} />
                              </div>
                            )}
                            {(precisaLA || precisaL) && (
                              <div className="w-20 space-y-1">
                                <Label className="text-[11px]">Unid.</Label>
                                <select className="h-8 w-full rounded-md border bg-background px-1 text-sm" value={m.unit} onChange={(e) => setMedida(ai, ii, mi, { unit: e.target.value })}>
                                  <option value="cm">cm</option><option value="mm">mm</option><option value="m">m</option>
                                </select>
                              </div>
                            )}
                            <div className="w-20 space-y-1">
                              <Label className="text-[11px]">Qtd</Label>
                              <Input className="h-8" type="number" value={m.q} onChange={(e) => setMedida(ai, ii, mi, { q: e.target.value })} />
                            </div>
                            {(precisaLA || precisaL) && (
                              <span className="pb-1.5 text-xs text-muted-foreground">
                                {memoMedida(regra, { l: num(m.l), a: num(m.a), q: num(m.q), unit: m.unit as "cm" | "mm" | "m" }, p ? { larguraMolduraCm: p.larguraMolduraCm, multiplicadorCorte: p.multiplicadorCorte } : undefined)}
                              </span>
                            )}
                            {it.medidas.length > 1 && (
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setItem(ai, ii, { medidas: it.medidas.filter((_, k) => k !== mi) })}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {!REGRAS_UN.has(regra) && (
                          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setItem(ai, ii, { medidas: [...it.medidas, novaMedida()] })}>
                            <Plus className="h-3 w-3" /> medida
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" className="gap-1.5" onClick={() => setAmbientes((p) => [...p, novoAmb()])}>
            <Plus className="h-4 w-4" /> Adicionar ambiente
          </Button>
        </div>

        {/* ---- Condições comerciais + observações ---- */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Desconto geral (%)</Label>
                <Input type="number" value={descPct} onChange={(e) => setDescPct(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Acréscimo (R$)</Label>
                <Input type="number" value={acrescimo} onChange={(e) => setAcrescimo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Frete (R$)</Label>
                <Input type="number" value={frete} onChange={(e) => setFrete(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Instalação (R$)</Label>
                <Input type="number" value={instalacao} onChange={(e) => setInstalacao(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Prazo (dias)</Label>
                <Input type="number" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Condição de pagamento</Label>
                <Input value={condicao} onChange={(e) => setCondicao(e.target.value)} placeholder="Ex.: 30% entrada + 2×" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label>Observações (cliente)</Label>
                <textarea className="min-h-[70px] w-full rounded-md border bg-background p-2 text-sm" value={obs} onChange={(e) => setObs(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Observações internas</Label>
                <textarea className="min-h-[70px] w-full rounded-md border bg-background p-2 text-sm" value={obsInterna} onChange={(e) => setObsInterna(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </fieldset>

      {/* ---- Totais + margem (barra fixa) ---- */}
      <Card className="sticky bottom-4 border-primary/30 shadow-lg">
        <CardContent className="flex flex-wrap items-center gap-6 p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" /> {totais.nItens} item(ns)
          </div>
          <div><p className="text-xs text-muted-foreground">Subtotal</p><p className="font-semibold">{formatCurrency(totais.sub)}</p></div>
          <div><p className="text-xs text-muted-foreground">Desconto</p><p className="font-semibold">-{formatCurrency(totais.descV)}</p></div>
          <div className="hidden md:block"><p className="text-xs text-muted-foreground">Custo prev.</p><p className="font-semibold">{formatCurrency(margem.cp)}</p></div>
          <div className="hidden md:block"><p className="text-xs text-muted-foreground">Margem</p><p className={`font-semibold ${margem.lucro >= 0 ? "text-emerald-600" : "text-destructive"}`}>{formatCurrency(margem.lucro)} ({margem.margem}%)</p></div>
          <div className="ml-auto text-right"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold text-primary">{formatCurrency(totais.total)}</p></div>
          {!bloqueado && (
            <div className="flex gap-2">
              <Button variant="outline" disabled={salvando} className="gap-1.5" onClick={() => salvar(false)}>
                <Copy className="h-4 w-4" /> Salvar
              </Button>
              <Button disabled={salvando} onClick={() => salvar(true)}>Salvar e transformar em venda</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
