"use client";
/* eslint-disable @next/next/no-img-element -- logomarca é data URI/URL dinâmica, incompatível com next/image */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getVenda, type VendaFull } from "@/lib/data/vendas-core";
import { getEmpresa, type Empresa } from "@/lib/data/empresa-actions";
import { formatCurrency, formatDate } from "@/lib/format";

type Loja = { nome: string; nome_comercial: string; cnpj: string; cidade: string; uf: string; logo_url: string; tel: string; email: string };
type Cliente = { nome: string; doc: string; endereco: string; tel: string; email: string };

const TIPOS = [
  { v: "contrato", l: "Contrato" },
  { v: "termo", l: "Termo de entrega" },
  { v: "recibo", l: "Recibo" },
];

export default function DocumentosPage() {
  const params = useParams<{ id: string }>();
  const [venda, setVenda] = useState<VendaFull | null>(null);
  const [emp, setEmp] = useState<Empresa | null>(null);
  const [loja, setLoja] = useState<Loja | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [tipo, setTipo] = useState("contrato");
  const [erro, setErro] = useState(""); const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const v = await getVenda(params.id);
      if (!v) { setErro("Registro não encontrado."); return; }
      setVenda(v);
      const e = await getEmpresa(); if (e.ok && e.data) setEmp(e.data);
      const s = createClient();
      const { data: st } = await s.from("stores").select("nome,nome_comercial,cnpj,cidade,uf,logo_url,tel,email").eq("id", v.store_id).maybeSingle();
      if (st) setLoja({ nome: (st.nome as string) || "", nome_comercial: (st.nome_comercial as string) || "", cnpj: (st.cnpj as string) || "", cidade: (st.cidade as string) || "", uf: (st.uf as string) || "", logo_url: (st.logo_url as string) || "", tel: (st.tel as string) || "", email: (st.email as string) || "" });
      if (v.cliente_id) {
        const { data: cl } = await s.from("customers").select("nome,doc,tel,email,logradouro,numero,bairro,cidade,uf").eq("id", v.cliente_id).maybeSingle();
        if (cl) setCliente({ nome: (cl.nome as string) || v.cliente_nome, doc: (cl.doc as string) || "", tel: (cl.tel as string) || "", email: (cl.email as string) || "", endereco: [cl.logradouro, cl.numero, cl.bairro, cl.cidade && `${cl.cidade}${cl.uf ? "/" + cl.uf : ""}`].filter(Boolean).join(", ") });
      } else setCliente({ nome: v.cliente_nome, doc: "", tel: "", email: "", endereco: "" });
      setErro("");
    } catch (e) { setErro((e as Error).message); } finally { setLoading(false); }
  }, [params.id]);
  useEffect(() => { carregar(); }, [carregar]);

  if (loading) return <div style={{ padding: 20, color: "var(--v6-muted)" }}>Carregando…</div>;
  if (!venda) return <div className="v6-card" style={{ padding: 16, color: "#b91c1c" }}>{erro}</div>;

  const nomeEmp = emp?.fantasia || emp?.razao_social || emp?.nome || "Empresa";
  const logo = loja?.logo_url || emp?.logo_url || "";
  const enderecoEmp = [emp?.logradouro, emp?.numero, emp?.bairro, emp?.cidade && `${emp.cidade}${emp?.uf ? "/" + emp.uf : ""}`].filter(Boolean).join(", ");
  const foroTxt = emp?.foro_texto || `Fica eleito o foro da comarca de ${emp?.foro_comarca || "—"}${emp?.foro_estado ? `/${emp.foro_estado}` : ""}, com ressalva à legislação mais favorável ao consumidor.`;

  const Cabecalho = () => (
    <div className="flex items-start justify-between border-b pb-4">
      <div className="flex items-start gap-4">
        {logo && <img src={logo} alt={nomeEmp} className="h-16 max-w-[220px] object-contain" />}
        <div>
          <h1 className="text-xl font-bold">{nomeEmp}</h1>
          {emp?.razao_social && emp.razao_social !== nomeEmp && <p className="text-sm">{emp.razao_social}</p>}
          <p className="text-sm text-neutral-600">{emp?.cnpj && <>CNPJ {emp.cnpj} · </>}{enderecoEmp}</p>
          <p className="text-sm text-neutral-600">{[emp?.tel, emp?.whatsapp && `WhatsApp ${emp.whatsapp}`, emp?.email, emp?.site].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold">{TIPOS.find((t) => t.v === tipo)?.l?.toUpperCase()} #{venda.numero ?? ""}</p>
        <p className="text-xs text-neutral-600">{formatDate(venda.created_at)}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link href={`/orcamentos/${venda.id}`} className="v6-btn v6-btn-outline v6-btn-sm"><ArrowLeft size={16} /> Voltar</Link>
        <div style={{ display: "flex", gap: 8 }}>
          {TIPOS.map((t) => <button key={t.v} className={`v6-chip${tipo === t.v ? " active" : ""}`} onClick={() => setTipo(t.v)}>{t.l}</button>)}
          <Link href={`/orcamentos/${venda.id}/pdf`} className="v6-chip"><FileText size={14} /> PDF do cliente</Link>
        </div>
        <button className="v6-btn v6-btn-primary v6-btn-sm" style={{ marginLeft: "auto" }} onClick={() => window.print()}><Printer size={16} /> Imprimir / PDF</button>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg border bg-white p-8 text-black shadow-sm print:border-0 print:shadow-none">
        <Cabecalho />

        {tipo === "contrato" && (
          <div className="space-y-3 pt-4 text-sm leading-relaxed">
            <p className="text-center text-base font-bold">CONTRATO DE PRESTAÇÃO DE SERVIÇOS / FORNECIMENTO</p>
            <p><b>CONTRATADA:</b> {emp?.razao_social || nomeEmp}{emp?.cnpj ? `, CNPJ ${emp.cnpj}` : ""}{emp?.ie ? `, IE ${emp.ie}` : ""}{enderecoEmp ? `, situada em ${enderecoEmp}` : ""}, neste ato representada por {emp?.representante || "seu representante legal"}{emp?.rep_cpf ? `, CPF ${emp.rep_cpf}` : ""}.</p>
            <p><b>CONTRATANTE:</b> {cliente?.nome || venda.cliente_nome}{cliente?.doc ? `, documento ${cliente.doc}` : ""}{cliente?.endereco ? `, residente em ${cliente.endereco}` : ""}{cliente?.tel ? `, telefone ${cliente.tel}` : ""}.</p>
            {venda.obra_nome && <p><b>OBRA:</b> {venda.obra_nome}{venda.obra_endereco ? ` — ${venda.obra_endereco}` : ""}.</p>}
            <p><b>OBJETO:</b> fornecimento e/ou instalação dos itens descritos no orçamento nº {venda.numero ?? ""}, que integra este contrato.</p>
            <p><b>VALOR:</b> {formatCurrency(venda.total)}{typeof venda.condicao === "string" && venda.condicao ? `, nas condições: ${venda.condicao}` : ""}.</p>
            {venda.prazo_dias != null && <p><b>PRAZO:</b> {venda.prazo_dias} dias.</p>}
            {emp?.garantia && <p><b>GARANTIA:</b> {emp.garantia}</p>}
            <p><b>FORO:</b> {foroTxt}</p>
            <div className="grid grid-cols-2 gap-8 pt-10">
              <div className="border-t pt-2 text-center text-xs">{emp?.representante || nomeEmp}<br />CONTRATADA</div>
              <div className="border-t pt-2 text-center text-xs">{cliente?.nome || venda.cliente_nome}<br />CONTRATANTE</div>
            </div>
          </div>
        )}

        {tipo === "termo" && (
          <div className="space-y-3 pt-4 text-sm leading-relaxed">
            <p className="text-center text-base font-bold">TERMO DE ENTREGA E RECEBIMENTO</p>
            <p>Declaramos que os itens referentes ao pedido nº {venda.numero ?? ""}, do(a) cliente <b>{cliente?.nome || venda.cliente_nome}</b>{venda.obra_nome ? `, obra ${venda.obra_nome}` : ""}, foram entregues{venda.obra_endereco ? ` no endereço ${venda.obra_endereco}` : ""} e recebidos em conformidade.</p>
            <p>O CONTRATANTE declara ter conferido os produtos/serviços e atesta o recebimento sem ressalvas, salvo as anotações abaixo.</p>
            <div className="mt-3 rounded border p-3 text-xs text-neutral-500" style={{ minHeight: 70 }}>Observações / ressalvas:</div>
            <p className="pt-2 text-xs text-neutral-600">Data da entrega: ____/____/______</p>
            <div className="grid grid-cols-2 gap-8 pt-10">
              <div className="border-t pt-2 text-center text-xs">{nomeEmp}<br />Responsável pela entrega</div>
              <div className="border-t pt-2 text-center text-xs">{cliente?.nome || venda.cliente_nome}<br />Recebedor</div>
            </div>
          </div>
        )}

        {tipo === "recibo" && (
          <div className="space-y-3 pt-4 text-sm leading-relaxed">
            <p className="text-center text-base font-bold">RECIBO</p>
            <p>Recebemos de <b>{cliente?.nome || venda.cliente_nome}</b>{cliente?.doc ? ` (documento ${cliente.doc})` : ""} a importância de <b>{formatCurrency(venda.total)}</b>, referente ao pedido nº {venda.numero ?? ""}{venda.obra_nome ? ` — obra ${venda.obra_nome}` : ""}.</p>
            {typeof venda.condicao === "string" && venda.condicao && <p>Condição de pagamento: {venda.condicao}.</p>}
            <p>Para clareza, firmamos o presente recibo.</p>
            <p className="pt-2 text-xs text-neutral-600">{emp?.cidade || ""}{emp?.cidade ? ", " : ""}____/____/______</p>
            <div className="pt-10">
              <div className="mx-auto w-72 border-t pt-2 text-center text-xs">{emp?.representante || nomeEmp}<br />{nomeEmp}{emp?.cnpj ? ` · CNPJ ${emp.cnpj}` : ""}</div>
            </div>
          </div>
        )}

        <p className="mt-8 border-t pt-3 text-center text-xs text-neutral-500">{emp?.rodape || `${nomeEmp}${emp?.cnpj ? ` · CNPJ ${emp.cnpj}` : ""}`}</p>
      </div>
    </div>
  );
}
