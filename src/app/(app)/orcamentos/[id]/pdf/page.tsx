"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getVenda, type VendaFull } from "@/lib/data/vendas-core";
import { formatCurrency, formatDate } from "@/lib/format";
import { calcOrc, totalItem, qtdMedida, type Regra } from "@/lib/commercial/calc";
import { labelSituacao } from "@/lib/commercial/situacao";

type Empresa = { nome: string; cnpj: string; loja: string; cidade: string; uf: string; resp: string };
type ProdInfo = { descricao: string; larguraMolduraCm: number; multiplicadorCorte: number; preco: number };

export default function VendaPdfPage() {
  const params = useParams<{ id: string }>();
  const [venda, setVenda] = useState<VendaFull | null>(null);
  const [prods, setProds] = useState<Record<string, ProdInfo>>({});
  const [emp, setEmp] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const v = await getVenda(params.id);
      if (!v) { setErro("Registro não encontrado."); return; }
      setVenda(v);
      const s = createClient();
      // identidade documental: SEMPRE a loja da venda (nunca misturar lojas)
      const [{ data: org }, { data: store }] = await Promise.all([
        s.from("organizations").select("nome,cnpj").limit(1).maybeSingle(),
        s.from("stores").select("nome,cnpj,cidade,uf,resp").eq("id", v.store_id).maybeSingle(),
      ]);
      setEmp({
        nome: (org?.nome as string) || "Empresa", cnpj: (store?.cnpj as string) || (org?.cnpj as string) || "",
        loja: (store?.nome as string) || "", cidade: (store?.cidade as string) || "", uf: (store?.uf as string) || "",
        resp: (store?.resp as string) || "",
      });
      const ids = Array.from(new Set(v.ambientes.flatMap((a) => a.itens.map((i) => i.product_id).filter(Boolean)))) as string[];
      if (ids.length) {
        const { data } = await s.from("products").select("id,descricao,largura_moldura_cm,multiplicador_corte,preco").in("id", ids);
        const map: Record<string, ProdInfo> = {};
        (data || []).forEach((p) => { map[p.id as string] = { descricao: p.descricao as string, larguraMolduraCm: Number(p.largura_moldura_cm) || 0, multiplicadorCorte: Number(p.multiplicador_corte) || 8, preco: Number(p.preco) || 0 }; });
        setProds(map);
      }
      setErro("");
    } catch (e) { setErro((e as Error).message); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { carregar(); }, [carregar]);

  if (loading) return <div className="py-10 text-center text-muted-foreground">Carregando...</div>;
  if (!venda) return <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</div>;

  const calc = {
    itens: venda.ambientes.flatMap((a) => a.itens.map((i) => {
      const p = i.product_id ? prods[i.product_id] : undefined;
      return {
        regra: i.regra as Regra, descPct: i.desc_pct, precoOverride: i.preco_override,
        medidas: i.medidas.map((m) => ({ l: m.l, a: m.a, q: m.q, unit: m.unit as "cm" | "mm" | "m" })),
        produto: p ? { preco: p.preco, larguraMolduraCm: p.larguraMolduraCm, multiplicadorCorte: p.multiplicadorCorte } : undefined,
      };
    })),
    desc: venda.desc_pct, acrescimo: venda.acrescimo, frete: venda.frete, instalacao: venda.instalacao,
  };
  const t = calcOrc(calc);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 print:hidden">
        <Button asChild variant="outline" className="gap-1.5"><Link href={`/orcamentos/${venda.id}`}><ArrowLeft className="h-4 w-4" /> Voltar</Link></Button>
        <Button className="ml-auto gap-1.5" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir / Salvar PDF</Button>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg border bg-white p-8 text-black shadow-sm print:border-0 print:shadow-none">
        {/* cabeçalho da empresa (identidade da loja da venda) */}
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-bold">{emp?.nome}</h1>
            {emp?.loja && <p className="text-sm">{emp.loja}</p>}
            <p className="text-sm text-neutral-600">
              {emp?.cnpj && <>CNPJ {emp.cnpj} · </>}{emp?.cidade}{emp?.uf ? `/${emp.uf}` : ""}
            </p>
            {emp?.resp && <p className="text-sm text-neutral-600">Resp.: {emp.resp}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{venda.venda_gerada ? "PEDIDO DE VENDA" : "ORÇAMENTO"} #{venda.numero ?? ""}</p>
            <p className="text-xs text-neutral-600">{formatDate(venda.created_at)}</p>
            <p className="text-xs text-neutral-600">{labelSituacao(venda.situacao)}</p>
          </div>
        </div>

        {/* cliente */}
        <div className="border-b py-3 text-sm">
          <p><span className="font-semibold">Cliente:</span> {venda.cliente_nome}</p>
          {venda.obra_nome && <p><span className="font-semibold">Obra:</span> {venda.obra_nome}{venda.obra_endereco ? ` — ${venda.obra_endereco}` : ""}</p>}
          {venda.vend_nome && <p><span className="font-semibold">Vendedor:</span> {venda.vend_nome}</p>}
        </div>

        {/* itens */}
        {venda.ambientes.map((a, ai) => (
          <div key={ai} className="py-3">
            <p className="mb-1 text-sm font-semibold">{a.nome}</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-neutral-500">
                  <th className="py-1">Item</th><th className="py-1 text-right">Qtd</th><th className="py-1 text-right">Preço</th><th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {a.itens.map((it, ii) => {
                  const p = it.product_id ? prods[it.product_id] : undefined;
                  const li = totalItem({
                    regra: it.regra as Regra, descPct: it.desc_pct, precoOverride: it.preco_override,
                    medidas: it.medidas.map((m) => ({ l: m.l, a: m.a, q: m.q, unit: m.unit as "cm" | "mm" | "m" })),
                    produto: p ? { preco: p.preco, larguraMolduraCm: p.larguraMolduraCm, multiplicadorCorte: p.multiplicadorCorte } : undefined,
                  });
                  const qtd = it.medidas.reduce((s, m) => s + qtdMedida(it.regra as Regra, { l: m.l, a: m.a, q: m.q, unit: m.unit as "cm" | "mm" | "m" }, p), 0);
                  return (
                    <tr key={ii} className="border-b border-neutral-100 align-top">
                      <td className="py-1">{p?.descricao || "Item"}</td>
                      <td className="py-1 text-right">{qtd.toFixed(2)}</td>
                      <td className="py-1 text-right">{formatCurrency(li.preco)}</td>
                      <td className="py-1 text-right">{formatCurrency(li.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {/* totais */}
        <div className="ml-auto mt-2 max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(t.sub)}</span></div>
          {t.descV > 0 && <div className="flex justify-between"><span>Desconto</span><span>-{formatCurrency(t.descV)}</span></div>}
          {venda.acrescimo > 0 && <div className="flex justify-between"><span>Acréscimo</span><span>{formatCurrency(venda.acrescimo)}</span></div>}
          {venda.frete > 0 && <div className="flex justify-between"><span>Frete</span><span>{formatCurrency(venda.frete)}</span></div>}
          {venda.instalacao > 0 && <div className="flex justify-between"><span>Instalação</span><span>{formatCurrency(venda.instalacao)}</span></div>}
          <div className="flex justify-between border-t pt-1 text-base font-bold"><span>Total</span><span>{formatCurrency(t.total)}</span></div>
        </div>

        {/* condições / observações */}
        {(venda.prazo_dias != null || typeof venda.condicao === "string") && (
          <div className="mt-4 border-t pt-3 text-sm">
            {venda.prazo_dias != null && <p><span className="font-semibold">Prazo:</span> {venda.prazo_dias} dias</p>}
            {typeof venda.condicao === "string" && venda.condicao && <p><span className="font-semibold">Condição:</span> {venda.condicao}</p>}
          </div>
        )}
        {venda.obs && <div className="mt-2 text-sm"><span className="font-semibold">Observações:</span> {venda.obs}</div>}

        <p className="mt-6 border-t pt-3 text-center text-xs text-neutral-500">
          {emp?.nome}{emp?.cnpj ? ` · CNPJ ${emp.cnpj}` : ""} — documento gerado pelo sistema.
        </p>
      </div>
    </div>
  );
}
