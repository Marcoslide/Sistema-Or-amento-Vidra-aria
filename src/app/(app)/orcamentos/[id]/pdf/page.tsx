"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, Download, GalleryVerticalEnd } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { orcamentoService } from "@/data/services";
import { totalPagamentos } from "@/lib/calculations";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import {
  FORMA_PAGAMENTO_LABEL,
  UNIDADE_CALCULO_LABEL,
  type Orcamento,
} from "@/lib/types";

const EMPRESA = {
  nome: "VidroGestor Vidraçaria & Esquadrias",
  cnpj: "12.345.678/0001-90",
  telefone: "(11) 3000-1000",
  email: "contato@vidrogestor.com.br",
  endereco: "Rua das Indústrias, 450 — São Paulo/SP",
};

export default function OrcamentoPdfPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [orc, setOrc] = useState<Orcamento | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orcamentoService.obter(params.id).then((data) => {
      setOrc(data);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) return <p className="text-muted-foreground">Gerando PDF...</p>;
  if (!orc) return <p className="text-muted-foreground">Orçamento não encontrado.</p>;

  const pago = totalPagamentos(orc);
  const saldo = orc.total - pago;
  const validade = new Date(orc.criadoEm);
  validade.setDate(validade.getDate() + orc.validadeDias);

  return (
    <div className="-mx-4 -my-6 min-h-screen bg-muted/60 sm:-mx-6 lg:-mx-8 print:m-0 print:bg-white">
      {/* Toolbar */}
      <div className="sticky top-16 z-10 flex items-center justify-between border-b bg-background px-4 py-3 print:hidden sm:px-6">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={`/orcamentos/${orc.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              toast({
                variant: "info",
                title: "Download simulado",
                description: "No sistema final, o PDF será gerado no servidor.",
              })
            }
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Documento A4 */}
      <div className="flex justify-center px-4 py-8 print:p-0">
        <div className="w-full max-w-[210mm] bg-white p-10 text-[13px] leading-relaxed text-slate-800 shadow-lg print:max-w-none print:shadow-none">
          {/* Cabeçalho */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary">
                <GalleryVerticalEnd className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">
                  {EMPRESA.nome}
                </p>
                <p className="text-xs text-slate-500">CNPJ {EMPRESA.cnpj}</p>
                <p className="text-xs text-slate-500">
                  {EMPRESA.telefone} • {EMPRESA.email}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-900">ORÇAMENTO</p>
              <p className="text-sm font-medium text-primary">Nº {orc.numero}</p>
              <p className="mt-1 text-xs text-slate-500">
                Emissão: {formatDate(orc.criadoEm)}
              </p>
              <p className="text-xs text-slate-500">
                Validade: {formatDate(validade)}
              </p>
            </div>
          </div>

          {/* Cliente / Obra */}
          <div className="grid grid-cols-2 gap-6 py-5">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Cliente
              </p>
              <p className="font-medium text-slate-900">{orc.clienteNome}</p>
              <p className="text-xs text-slate-500">Vendedor: {orc.vendedorNome}</p>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Obra
              </p>
              <p className="font-medium text-slate-900">
                {orc.obraNome ?? "—"}
              </p>
            </div>
          </div>

          {/* Itens por ambiente */}
          {orc.ambientes.map((amb) => (
            <div key={amb.id} className="mb-4">
              <p className="mb-2 rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {amb.nome}
              </p>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="py-1.5 pr-2 font-medium">Descrição</th>
                    <th className="py-1.5 px-2 font-medium">Medidas</th>
                    <th className="py-1.5 px-2 text-right font-medium">Qtd.</th>
                    <th className="py-1.5 px-2 text-right font-medium">Unit.</th>
                    <th className="py-1.5 pl-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {amb.itens.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2">
                        <p className="font-medium text-slate-800">
                          {item.produtoNome}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {UNIDADE_CALCULO_LABEL[item.unidade]}
                        </p>
                      </td>
                      <td className="py-2 px-2 text-xs text-slate-500">
                        {item.medidas
                          .map(
                            (m) =>
                              `${m.quantidade}× ${formatNumber(m.largura)}×${formatNumber(m.altura)}`,
                          )
                          .join(", ")}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {formatNumber(item.quantidadeTotal)}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {formatCurrency(item.precoUnitario)}
                      </td>
                      <td className="py-2 pl-2 text-right font-medium">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Totais */}
          <div className="mt-6 flex justify-end">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(orc.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Desconto ({formatNumber(orc.descontoPercentual, 0)}%)</span>
                <span>− {formatCurrency(orc.descontoValor)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-1.5 text-base font-bold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(orc.total)}</span>
              </div>
            </div>
          </div>

          {/* Pagamento */}
          <div className="mt-8">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Condições de pagamento
            </p>
            {orc.pagamentos.length === 0 ? (
              <p className="text-xs text-slate-500">A combinar.</p>
            ) : (
              <ul className="space-y-1 text-xs text-slate-600">
                {orc.pagamentos.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>
                      {FORMA_PAGAMENTO_LABEL[p.forma]}
                      {p.parcelas > 1 && ` em ${p.parcelas}x`}
                      {p.observacao && ` — ${p.observacao}`}
                    </span>
                    <span className="font-medium">{formatCurrency(p.valor)}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-slate-200 pt-1 font-medium text-slate-800">
                  <span>Saldo restante</span>
                  <span>{formatCurrency(saldo)}</span>
                </li>
              </ul>
            )}
          </div>

          {orc.observacoes && (
            <div className="mt-6 rounded-lg bg-slate-50 p-4">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Observações
              </p>
              <p className="text-xs text-slate-600">{orc.observacoes}</p>
            </div>
          )}

          {/* Rodapé */}
          <div className="mt-10 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400">
            {EMPRESA.endereco} — Orçamento válido por {orc.validadeDias} dias.
            Documento gerado pelo VidroGestor.
          </div>
        </div>
      </div>
    </div>
  );
}
