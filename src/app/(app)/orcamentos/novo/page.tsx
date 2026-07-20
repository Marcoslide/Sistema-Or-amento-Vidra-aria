"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Layers,
  Package,
  Save,
  FileText,
  Ruler,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  clienteService,
  produtoService,
  vendedorService,
} from "@/data/services";
import { quantidadeMedida } from "@/lib/calculations";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn, uid } from "@/lib/utils";
import {
  FORMA_PAGAMENTO_LABEL,
  type Cliente,
  type FormaPagamento,
  type Produto,
  type UnidadeCalculo,
  type Vendedor,
} from "@/lib/types";

interface MedidaDraft {
  id: string;
  largura: number;
  altura: number;
  quantidade: number;
}
interface ItemDraft {
  id: string;
  produtoId: string;
  medidas: MedidaDraft[];
}
interface AmbienteDraft {
  id: string;
  nome: string;
  itens: ItemDraft[];
}
interface PagamentoDraft {
  id: string;
  forma: FormaPagamento;
  valor: number;
  parcelas: number;
}

const unidadeSufixo = (u: UnidadeCalculo) =>
  u === "M2" ? "m²" : u === "UNIDADE" ? "un" : "m";

export default function NovoOrcamentoPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [obraId, setObraId] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [descontoPercentual, setDescontoPercentual] = useState(0);
  const [validadeDias, setValidadeDias] = useState(15);
  const [observacoes, setObservacoes] = useState("");

  const [ambientes, setAmbientes] = useState<AmbienteDraft[]>([
    { id: uid("amb"), nome: "Ambiente 1", itens: [] },
  ]);
  const [pagamentos, setPagamentos] = useState<PagamentoDraft[]>([]);

  useEffect(() => {
    clienteService.listar().then(setClientes);
    produtoService.listar().then((p) => setProdutos(p.filter((x) => x.ativo)));
    vendedorService.listar().then((v) => setVendedores(v.filter((x) => x.ativo)));
  }, []);

  const cliente = clientes.find((c) => c.id === clienteId);
  const produtoById = (id: string) => produtos.find((p) => p.id === id);

  // ---- Cálculo do item ----
  function itemTotals(item: ItemDraft) {
    const prod = produtoById(item.produtoId);
    if (!prod)
      return { quantidade: 0, total: 0, unidade: "UNIDADE" as UnidadeCalculo, preco: 0 };
    const quantidade = item.medidas.reduce(
      (acc, m) => acc + quantidadeMedida(prod.unidade, m),
      0,
    );
    return {
      quantidade,
      total: quantidade * prod.precoBase,
      unidade: prod.unidade,
      preco: prod.precoBase,
    };
  }

  const subtotal = useMemo(
    () =>
      ambientes.reduce(
        (acc, a) => acc + a.itens.reduce((s, i) => s + itemTotals(i).total, 0),
        0,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ambientes, produtos],
  );
  const descontoValor = (subtotal * descontoPercentual) / 100;
  const total = subtotal - descontoValor;
  const totalPago = pagamentos.reduce((acc, p) => acc + (p.valor || 0), 0);
  const saldo = total - totalPago;
  const totalItens = ambientes.reduce((acc, a) => acc + a.itens.length, 0);

  // ---- Mutations de ambiente / item / medida ----
  const addAmbiente = () =>
    setAmbientes((prev) => [
      ...prev,
      { id: uid("amb"), nome: `Ambiente ${prev.length + 1}`, itens: [] },
    ]);

  const removeAmbiente = (id: string) =>
    setAmbientes((prev) => prev.filter((a) => a.id !== id));

  const renameAmbiente = (id: string, nome: string) =>
    setAmbientes((prev) => prev.map((a) => (a.id === id ? { ...a, nome } : a)));

  const addItem = (ambId: string) => {
    const first = produtos[0];
    if (!first) return;
    setAmbientes((prev) =>
      prev.map((a) =>
        a.id === ambId
          ? {
              ...a,
              itens: [
                ...a.itens,
                {
                  id: uid("itm"),
                  produtoId: first.id,
                  medidas: [
                    { id: uid("med"), largura: 1, altura: 1, quantidade: 1 },
                  ],
                },
              ],
            }
          : a,
      ),
    );
  };

  const removeItem = (ambId: string, itemId: string) =>
    setAmbientes((prev) =>
      prev.map((a) =>
        a.id === ambId
          ? { ...a, itens: a.itens.filter((i) => i.id !== itemId) }
          : a,
      ),
    );

  const setItemProduto = (ambId: string, itemId: string, produtoId: string) =>
    setAmbientes((prev) =>
      prev.map((a) =>
        a.id === ambId
          ? {
              ...a,
              itens: a.itens.map((i) =>
                i.id === itemId ? { ...i, produtoId } : i,
              ),
            }
          : a,
      ),
    );

  const addMedida = (ambId: string, itemId: string) =>
    setAmbientes((prev) =>
      prev.map((a) =>
        a.id === ambId
          ? {
              ...a,
              itens: a.itens.map((i) =>
                i.id === itemId
                  ? {
                      ...i,
                      medidas: [
                        ...i.medidas,
                        { id: uid("med"), largura: 1, altura: 1, quantidade: 1 },
                      ],
                    }
                  : i,
              ),
            }
          : a,
      ),
    );

  const removeMedida = (ambId: string, itemId: string, medId: string) =>
    setAmbientes((prev) =>
      prev.map((a) =>
        a.id === ambId
          ? {
              ...a,
              itens: a.itens.map((i) =>
                i.id === itemId
                  ? { ...i, medidas: i.medidas.filter((m) => m.id !== medId) }
                  : i,
              ),
            }
          : a,
      ),
    );

  const setMedida = (
    ambId: string,
    itemId: string,
    medId: string,
    field: keyof Omit<MedidaDraft, "id">,
    value: number,
  ) =>
    setAmbientes((prev) =>
      prev.map((a) =>
        a.id === ambId
          ? {
              ...a,
              itens: a.itens.map((i) =>
                i.id === itemId
                  ? {
                      ...i,
                      medidas: i.medidas.map((m) =>
                        m.id === medId ? { ...m, [field]: value } : m,
                      ),
                    }
                  : i,
              ),
            }
          : a,
      ),
    );

  // ---- Pagamentos ----
  const addPagamento = () =>
    setPagamentos((prev) => [
      ...prev,
      { id: uid("pag"), forma: "PIX", valor: Math.max(0, saldo), parcelas: 1 },
    ]);
  const removePagamento = (id: string) =>
    setPagamentos((prev) => prev.filter((p) => p.id !== id));
  const setPagamento = (id: string, patch: Partial<PagamentoDraft>) =>
    setPagamentos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );

  // ---- Salvar ----
  function salvar(status: "rascunho" | "enviar") {
    if (!clienteId) {
      toast({
        variant: "warning",
        title: "Selecione um cliente",
        description: "É necessário escolher o cliente do orçamento.",
      });
      return;
    }
    if (totalItens === 0) {
      toast({
        variant: "warning",
        title: "Adicione ao menos um item",
        description: "Inclua produtos em pelo menos um ambiente.",
      });
      return;
    }
    toast({
      variant: "success",
      title: status === "enviar" ? "Orçamento gerado" : "Rascunho salvo",
      description:
        status === "enviar"
          ? "Pronto para envio do PDF ao cliente (simulado)."
          : "Você pode continuar depois (simulado).",
    });
    router.push("/orcamentos");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/orcamentos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title="Novo orçamento"
          description="Monte o orçamento em poucos minutos: cliente, ambientes, medidas e pagamento."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Cliente / obra / vendedor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cliente & obra</CardTitle>
              <CardDescription>Quem e onde será a instalação.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select
                  value={clienteId}
                  onValueChange={(v) => {
                    setClienteId(v);
                    setObraId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Obra</Label>
                <Select
                  value={obraId}
                  onValueChange={setObraId}
                  disabled={!cliente}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        cliente ? "Selecionar obra" : "Escolha o cliente primeiro"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {cliente?.obras.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select value={vendedorId} onValueChange={setVendedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Validade (dias)</Label>
                <Input
                  type="number"
                  min={1}
                  value={validadeDias}
                  onChange={(e) => setValidadeDias(Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Ambientes */}
          {ambientes.map((amb) => (
            <Card key={amb.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="flex flex-1 items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <Input
                    value={amb.nome}
                    onChange={(e) => renameAmbiente(amb.id, e.target.value)}
                    className="h-8 max-w-xs border-transparent bg-transparent px-1 text-base font-semibold shadow-none focus-visible:border-input focus-visible:bg-background"
                  />
                </div>
                {ambientes.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeAmbiente(amb.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {amb.itens.length === 0 && (
                  <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                    Nenhum produto neste ambiente.
                  </p>
                )}

                {amb.itens.map((item) => {
                  const t = itemTotals(item);
                  return (
                    <div
                      key={item.id}
                      className="space-y-3 rounded-xl border bg-muted/20 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Package className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <Select
                            value={item.produtoId}
                            onValueChange={(v) =>
                              setItemProduto(amb.id, item.id, v)
                            }
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {produtos.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatCurrency(t.preco)} / {unidadeSufixo(t.unidade)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(amb.id, item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Medidas */}
                      <div className="space-y-2 pl-11">
                        <div className="hidden grid-cols-[1fr_1fr_1fr_auto] gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid">
                          <span>Largura (m)</span>
                          <span>Altura (m)</span>
                          <span>Qtd.</span>
                          <span className="w-8" />
                        </div>
                        {item.medidas.map((m) => (
                          <div
                            key={m.id}
                            className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
                          >
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={m.largura}
                              onChange={(e) =>
                                setMedida(
                                  amb.id,
                                  item.id,
                                  m.id,
                                  "largura",
                                  Number(e.target.value),
                                )
                              }
                              className="bg-background"
                            />
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={m.altura}
                              onChange={(e) =>
                                setMedida(
                                  amb.id,
                                  item.id,
                                  m.id,
                                  "altura",
                                  Number(e.target.value),
                                )
                              }
                              className="bg-background"
                            />
                            <Input
                              type="number"
                              min={1}
                              value={m.quantidade}
                              onChange={(e) =>
                                setMedida(
                                  amb.id,
                                  item.id,
                                  m.id,
                                  "quantidade",
                                  Number(e.target.value),
                                )
                              }
                              className="bg-background"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={item.medidas.length === 1}
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => removeMedida(amb.id, item.id, m.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-muted-foreground"
                            onClick={() => addMedida(amb.id, item.id)}
                          >
                            <Ruler className="h-3.5 w-3.5" />
                            Adicionar medida
                          </Button>
                          <p className="text-sm">
                            <span className="text-muted-foreground">
                              {formatNumber(t.quantidade)} {unidadeSufixo(t.unidade)} ={" "}
                            </span>
                            <span className="font-semibold">
                              {formatCurrency(t.total)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 border-dashed"
                  onClick={() => addItem(amb.id)}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar produto
                </Button>
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            className="w-full gap-1.5 border-dashed"
            onClick={addAmbiente}
          >
            <Plus className="h-4 w-4" />
            Adicionar ambiente
          </Button>

          {/* Pagamentos */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="text-base">Pagamento</CardTitle>
                <CardDescription>Formas e parcelamentos.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={addPagamento}
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {pagamentos.length === 0 && (
                <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                  Nenhuma forma de pagamento adicionada.
                </p>
              )}
              {pagamentos.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-2 items-end gap-2 rounded-lg border p-3 sm:grid-cols-[1.4fr_1fr_0.8fr_auto]"
                >
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Forma</Label>
                    <Select
                      value={p.forma}
                      onValueChange={(v) =>
                        setPagamento(p.id, { forma: v as FormaPagamento })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.keys(FORMA_PAGAMENTO_LABEL) as FormaPagamento[]
                        ).map((f) => (
                          <SelectItem key={f} value={f}>
                            {FORMA_PAGAMENTO_LABEL[f]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={p.valor}
                      onChange={(e) =>
                        setPagamento(p.id, { valor: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Parcelas</Label>
                    <Input
                      type="number"
                      min={1}
                      value={p.parcelas}
                      onChange={(e) =>
                        setPagamento(p.id, { parcelas: Number(e.target.value) })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removePagamento(p.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Prazo de produção, condições de instalação, garantia..."
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Resumo lateral (sticky) */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo</CardTitle>
              <CardDescription>
                {totalItens} {totalItens === 1 ? "item" : "itens"} em{" "}
                {ambientes.length}{" "}
                {ambientes.length === 1 ? "ambiente" : "ambientes"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Desconto (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={descontoPercentual}
                  onChange={(e) =>
                    setDescontoPercentual(Number(e.target.value))
                  }
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto</span>
                <span className="text-destructive">
                  − {formatCurrency(descontoValor)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pago</span>
                <span className="text-success">{formatCurrency(totalPago)}</span>
              </div>
              <div
                className={cn(
                  "flex justify-between text-sm font-medium",
                  Math.abs(saldo) < 0.01 && "text-success",
                )}
              >
                <span className={cn(!(Math.abs(saldo) < 0.01) && "text-muted-foreground")}>
                  Saldo
                </span>
                <span>{formatCurrency(saldo)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button className="w-full gap-1.5" onClick={() => salvar("enviar")}>
              <FileText className="h-4 w-4" />
              Gerar orçamento
            </Button>
            <Button
              variant="outline"
              className="w-full gap-1.5"
              onClick={() => salvar("rascunho")}
            >
              <Save className="h-4 w-4" />
              Salvar rascunho
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
