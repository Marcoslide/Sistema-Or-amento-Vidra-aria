"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { getOP, type OPFull } from "@/lib/data/producao-actions";

// Ordem de Produção (PDF) — SEM valores comerciais (preço/custo/margem). Só o necessário ao chão de fábrica.
export default function OPPdfPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<OPFull | null>(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => { getOP(id).then((r) => { if (!r.ok) { setErro(r.error || "Falha."); return; } setD(r.data || null); }); }, [id]);
  useEffect(() => { carregar(); }, [carregar]);

  if (!d) return <div className="py-10 text-center text-muted-foreground">{erro || "Carregando..."}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 print:hidden">
        <Button asChild variant="outline" className="gap-1.5"><Link href={`/producao/${id}`}><ArrowLeft className="h-4 w-4" /> Voltar</Link></Button>
        <Button className="ml-auto gap-1.5" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir</Button>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg border bg-white p-8 text-black shadow-sm print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b pb-3">
          <div><h1 className="text-xl font-bold">Ordem de Produção #{d.ordem.numero ?? ""}</h1><p className="text-sm">{d.ordem.cliente_nome || ""}</p></div>
          <div className="text-right text-sm text-neutral-600">
            <p>{d.ordem.status.replace("_", " ")}</p>
            {d.ordem.prazo && <p>Prazo: {formatDate(d.ordem.prazo)}</p>}
            {d.ordem.responsavel && <p>Resp.: {d.ordem.responsavel}</p>}
          </div>
        </div>

        <div className="py-3">
          <p className="mb-1 text-sm font-semibold">Itens</p>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-neutral-500"><th className="py-1">Produto</th><th className="py-1">Medidas</th><th className="py-1 text-right">Qtd</th><th className="py-1">Especificações</th></tr></thead>
            <tbody>
              {d.itens.map((it) => (
                <tr key={it.id} className="border-b border-neutral-100 align-top">
                  <td className="py-1">{it.descricao || it.regra || "Item"}</td>
                  <td className="py-1">{it.largura != null ? `${it.largura}×${it.altura} ${it.unidade}` : "—"}{it.regra === "MOLDURA" && it.largura != null ? ` · perím ${(2 * Number(it.largura) + 2 * Number(it.altura)).toFixed(0)} ${it.unidade}` : ""}</td>
                  <td className="py-1 text-right">{it.quantidade}</td>
                  <td className="py-1 text-xs">{[it.vidro && `vidro: ${it.vidro}`, it.espelho && `espelho: ${it.espelho}`, it.acabamento && `acab.: ${it.acabamento}`].filter(Boolean).join(" · ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="py-2">
          <p className="mb-1 text-sm font-semibold">Etapas</p>
          <p className="text-sm">{d.etapas.filter((e) => e.aplicavel).map((e) => `${e.nome} (${e.status})`).join("  ·  ")}</p>
        </div>

        {d.terceirizacoes.length > 0 && (
          <div className="py-2">
            <p className="mb-1 text-sm font-semibold">Terceirizações</p>
            {d.terceirizacoes.map((t) => (
              <p key={t.id} className="text-sm">{t.fornecedor} — {t.servico} {t.recebido ? "· recebido" : ""}{t.conferido ? "· conferido" : ""}</p>
            ))}
          </div>
        )}

        {d.ordem.obs && <div className="border-t pt-2 text-sm"><span className="font-semibold">Obs.:</span> {d.ordem.obs}</div>}
        <p className="mt-6 border-t pt-3 text-center text-xs text-neutral-500">Documento interno de produção — sem valores comerciais.</p>
      </div>
    </div>
  );
}
