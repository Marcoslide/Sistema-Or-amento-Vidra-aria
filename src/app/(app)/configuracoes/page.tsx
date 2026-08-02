"use client";
/* eslint-disable @next/next/no-img-element -- logomarca é data URI/URL dinâmica, incompatível com next/image */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Save, Plus, Upload, RotateCcw, Building2, Store, MoreHorizontal, Pencil, Power,
  CreditCard, Landmark, Layers, Users, UserCog, Package, Tags, Truck, Clock, Cog, TrendingDown, ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getEmpresa, saveEmpresa, type Empresa,
  listLojasFull, saveLoja, toggleLojaAtiva, type LojaFull,
} from "@/lib/data/empresa-actions";

const TABS = [
  { v: "empresa", l: "Empresa" },
  { v: "lojas", l: "Lojas e operações" },
  { v: "mais", l: "Mais cadastros" },
];

const EMPRESA_VAZIA: Empresa = {
  nome: "", fantasia: "", razao_social: "", cnpj: "", ie: "", im: "", tel: "", whatsapp: "", email: "", site: "",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", garantia: "", rodape: "",
  representante: "", rep_cpf: "", foro_comarca: "", foro_estado: "", foro_texto: "", foro_revisado: false,
  validade_dias: 15, logo_url: "",
};

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState("empresa");

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div className="v6-page-title">Configurações</div>
        <div className="v6-page-desc">Central de cadastros: empresa, lojas e operações, e os demais cadastros do sistema.</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {TABS.map((t) => (
          <button key={t.v} className={`v6-chip${tab === t.v ? " active" : ""}`} onClick={() => setTab(t.v)}>{t.l}</button>
        ))}
      </div>

      {tab === "empresa" && <AbaEmpresa toast={toast} />}
      {tab === "lojas" && <AbaLojas toast={toast} />}
      {tab === "mais" && <AbaMais />}
    </div>
  );
}

type Toast = ReturnType<typeof useToast>["toast"];

// ---------------- ABA EMPRESA ----------------
function AbaEmpresa({ toast }: { toast: Toast }) {
  const [e, setE] = useState<Empresa>(EMPRESA_VAZIA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    getEmpresa().then((r) => {
      if (r.ok && r.data) setE(r.data); else if (r.error) setErro(r.error);
      setLoading(false);
    });
  }, []);

  const set = (k: keyof Empresa, v: string | number | boolean) => setE((p) => ({ ...p, [k]: v }));

  function onLogo(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_500_000) { toast({ variant: "warning", title: "Imagem grande", description: "Use uma logomarca de até ~1,5 MB." }); return; }
    const reader = new FileReader();
    reader.onload = () => set("logo_url", String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function salvar() {
    setSaving(true);
    const r = await saveEmpresa(e);
    setSaving(false);
    if (r.ok) toast({ variant: "success", title: "Dados da empresa salvos", description: "Já aparecem no menu, no login e nos documentos." });
    else toast({ variant: "warning", title: "Não foi possível salvar", description: r.error || "Tente novamente." });
  }

  if (loading) return <div className="v6-card"><div className="v6-card-b" style={{ color: "var(--v6-muted)" }}>Carregando…</div></div>;

  const F = (label: string, k: keyof Empresa, type = "text", span = false) => (
    <div className={span ? "v6-col-span" : ""}>
      <label className="v6-lbl">{label}</label>
      <input className="v6-inp" type={type} value={String(e[k] ?? "")} onChange={(ev) => set(k, type === "number" ? Number(ev.target.value) : ev.target.value)} maxLength={k === "uf" ? 2 : undefined} />
    </div>
  );

  return (
    <div className="v6-card">
      <div className="v6-card-h"><div className="v6-card-title">Dados da empresa</div><div className="v6-card-desc">Aparecem no login, no menu lateral e no cabeçalho/rodapé dos documentos.</div></div>
      <div className="v6-card-b">
        {erro && <div style={{ marginBottom: 14, padding: 12, borderRadius: 9, background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>{erro}</div>}

        {/* Logomarca */}
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", border: "1px solid var(--v6-border)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ width: 190, height: 78, border: "1px dashed var(--v6-border)", borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {e.logo_url ? <img src={e.logo_url} alt="logomarca" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 12, color: "var(--v6-muted-2)" }}>Sem logomarca</span>}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <b style={{ fontSize: 13 }}>Logomarca</b>
            <p style={{ fontSize: 12, color: "var(--v6-muted)", margin: "4px 0 8px" }}>Aparece no login, no topo do menu e nos PDFs. Envie um PNG ou JPG (de preferência com fundo transparente).</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <label className="v6-btn v6-btn-outline v6-btn-sm" style={{ cursor: "pointer" }}>
                <Upload size={14} /> Enviar logomarca
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(ev) => onLogo(ev.target.files?.[0])} />
              </label>
              {e.logo_url && <button className="v6-btn v6-btn-ghost v6-btn-sm" onClick={() => set("logo_url", "")}><RotateCcw size={14} /> Remover</button>}
            </div>
          </div>
        </div>

        <div className="v6-g2">
          {F("Nome fantasia", "fantasia")}
          {F("Razão social", "razao_social")}
          {F("CNPJ", "cnpj")}
          {F("Inscrição estadual", "ie")}
          {F("Inscrição municipal", "im")}
          {F("Validade padrão (dias)", "validade_dias", "number")}
          {F("Telefone", "tel")}
          {F("WhatsApp", "whatsapp")}
          {F("E-mail", "email")}
          {F("Site", "site")}
          {F("CEP", "cep")}
          {F("Logradouro", "logradouro")}
          {F("Número", "numero")}
          {F("Complemento", "complemento")}
          {F("Bairro", "bairro")}
          {F("Cidade", "cidade")}
          {F("UF", "uf")}
          <div />
          {F("Garantia padrão", "garantia", "text", true)}
          {F("Rodapé do documento", "rodape", "text", true)}
          <div className="v6-col-span"><div className="v6-hint">Campos usados no <b>contrato</b> (o sistema não gera contrato sem eles):</div></div>
          {F("Representante legal (assina o contrato)", "representante")}
          {F("CPF do representante", "rep_cpf")}
          {F("Foro — Comarca", "foro_comarca")}
          {F("Foro — Estado", "foro_estado")}
          <div className="v6-col-span">
            <label className="v6-lbl">Texto do foro (opcional — substitui o padrão)</label>
            <textarea className="v6-inp" rows={2} value={e.foro_texto} onChange={(ev) => set("foro_texto", ev.target.value)} placeholder="Vazio = texto padrão: foro do domicílio da CONTRATADA, com ressalva à legislação mais favorável ao consumidor." />
          </div>
          <div className="v6-col-span">
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={e.foro_revisado} onChange={(ev) => set("foro_revisado", ev.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--v6-primary)" }} />
              Cláusula de foro revisada juridicamente
            </label>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button className="v6-btn v6-btn-primary" onClick={salvar} disabled={saving}><Save size={16} /> {saving ? "Salvando…" : "Salvar dados da empresa"}</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- ABA LOJAS ----------------
const LOJA_VAZIA: LojaFull = {
  id: "", nome: "", nome_comercial: "", tipo: "loja", cnpj: "", ie: "", im: "", tel: "", whatsapp: "", email: "",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", resp: "", logo_url: "", ativo: true,
};

function AbaLojas({ toast }: { toast: Toast }) {
  const [rows, setRows] = useState<LojaFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [edit, setEdit] = useState<LojaFull | null>(null);

  const carregar = useCallback(() => {
    setLoading(true);
    listLojasFull().then((r) => {
      if (r.ok && r.data) { setRows(r.data); setErro(""); } else setErro(r.error || "Falha ao carregar lojas.");
      setLoading(false);
    });
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function toggle(l: LojaFull) {
    const r = await toggleLojaAtiva(l.id);
    if (r.ok) { toast({ variant: r.ativo ? "success" : "warning", title: `Loja ${r.ativo ? "reativada" : "inativada"}`, description: l.nome }); carregar(); }
    else toast({ variant: "warning", title: "Falha", description: r.error || "" });
  }

  return (
    <div className="v6-card">
      <div className="v6-card-h" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 18 }}>
        <div><div className="v6-card-title">Lojas e operações</div><div className="v6-card-desc">A operação selecionada no topo filtra vendas, financeiro e caixa. Lojas inativas somem de novos lançamentos, mas ficam no histórico.</div></div>
        <button className="v6-btn v6-btn-primary v6-btn-sm" onClick={() => setEdit({ ...LOJA_VAZIA })}><Plus size={14} /> Nova loja</button>
      </div>
      <div className="v6-card-b" style={{ overflowX: "auto" }}>
        {erro && <div style={{ marginBottom: 12, padding: 12, borderRadius: 9, background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>{erro}</div>}
        <table className="v6-tbl" style={{ minWidth: 820 }}>
          <thead><tr><th>Nome</th><th>Tipo</th><th>CNPJ</th><th>Cidade</th><th>Responsável</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--v6-muted)" }}>Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--v6-muted)" }}>Nenhuma loja cadastrada.</td></tr>
            ) : rows.map((l) => (
              <tr key={l.id}>
                <td style={{ fontWeight: 600 }}>{l.nome}{l.nome_comercial && l.nome_comercial !== l.nome ? <span style={{ color: "var(--v6-muted)", fontWeight: 400 }}> · {l.nome_comercial}</span> : null}</td>
                <td style={{ color: "var(--v6-muted)", textTransform: "capitalize" }}>{l.tipo}</td>
                <td style={{ color: "var(--v6-muted)" }}>{l.cnpj || "—"}</td>
                <td style={{ color: "var(--v6-muted)" }}>{l.cidade || "—"}{l.uf ? `/${l.uf}` : ""}</td>
                <td>{l.resp || "—"}</td>
                <td>{l.ativo ? <span className="v6-badge v6-badge-success">Ativa</span> : <span className="v6-badge v6-badge-muted">Inativa</span>}</td>
                <td style={{ textAlign: "right" }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button className="v6-icon-btn" style={{ width: 30, height: 30, border: 0, background: "transparent" }}><MoreHorizontal size={16} /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEdit({ ...l })}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggle(l)}><Power className="mr-2 h-4 w-4" /> {l.ativo ? "Inativar" : "Reativar"}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && <LojaDialog loja={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); carregar(); }} toast={toast} />}
    </div>
  );
}

function LojaDialog({ loja, onClose, onSaved, toast }: { loja: LojaFull; onClose: () => void; onSaved: () => void; toast: Toast }) {
  const [l, setL] = useState<LojaFull>(loja);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof LojaFull, v: string) => setL((p) => ({ ...p, [k]: v }));

  function onLogo(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_500_000) { toast({ variant: "warning", title: "Imagem grande", description: "Use uma logo de até ~1,5 MB." }); return; }
    const reader = new FileReader();
    reader.onload = () => set("logo_url", String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function salvar() {
    if (!l.nome.trim()) { setErr("Informe o nome da loja."); return; }
    setSaving(true);
    const r = await saveLoja(l);
    setSaving(false);
    if (r.ok) { toast({ variant: "success", title: loja.id ? "Loja atualizada" : "Loja criada", description: l.nome }); onSaved(); }
    else setErr(r.error || "Não foi possível salvar.");
  }

  const F = (label: string, k: keyof LojaFull, span = false) => (
    <div className={span ? "v6-col-span" : ""}>
      <label className="v6-lbl">{label}</label>
      <input className="v6-inp" value={String(l[k] ?? "")} onChange={(ev) => set(k, ev.target.value)} maxLength={k === "uf" ? 2 : undefined} />
    </div>
  );

  return (
    <div className="v6-modal-scrim" onClick={onClose}>
      <div className="v6-modal" onClick={(ev) => ev.stopPropagation()}>
        <div className="v6-modal-h"><span>{loja.id ? "Editar" : "Nova"} loja / operação</span><button className="v6-x" onClick={onClose}>✕</button></div>
        <div className="v6-modal-b">
          {err && <div className="v6-field-err" style={{ marginBottom: 10 }}>{err}</div>}
          <div className="v6-g2">
            {F("Nome (interno)", "nome", true)}
            {F("Nome comercial (aparece nos documentos)", "nome_comercial", true)}
            <div>
              <label className="v6-lbl">Tipo</label>
              <select className="v6-inp" value={l.tipo} onChange={(ev) => set("tipo", ev.target.value)}>
                <option value="loja">Loja</option><option value="fabrica">Fábrica / Produção</option><option value="deposito">Depósito</option>
              </select>
            </div>
            {F("Responsável", "resp")}
            {F("CNPJ", "cnpj")}
            {F("Inscrição estadual", "ie")}
            {F("Inscrição municipal", "im")}
            {F("Telefone", "tel")}
            {F("WhatsApp", "whatsapp")}
            {F("E-mail", "email")}
            {F("CEP", "cep")}
            {F("Logradouro", "logradouro")}
            {F("Número", "numero")}
            {F("Complemento", "complemento")}
            {F("Bairro", "bairro")}
            {F("Cidade", "cidade")}
            {F("UF", "uf")}
            <div className="v6-col-span">
              <label className="v6-lbl">Logo própria da loja (opcional)</label>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 120, height: 52, border: "1px dashed var(--v6-border)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {l.logo_url ? <img src={l.logo_url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 11, color: "var(--v6-muted-2)" }}>Sem logo</span>}
                </div>
                <label className="v6-btn v6-btn-outline v6-btn-sm" style={{ cursor: "pointer" }}><Upload size={14} /> Enviar<input type="file" accept="image/*" style={{ display: "none" }} onChange={(ev) => onLogo(ev.target.files?.[0])} /></label>
                {l.logo_url && <button className="v6-btn v6-btn-ghost v6-btn-sm" onClick={() => set("logo_url", "")}>Remover</button>}
              </div>
            </div>
          </div>
        </div>
        <div className="v6-modal-f">
          <button className="v6-btn v6-btn-outline" onClick={onClose}>Cancelar</button>
          <button className="v6-btn v6-btn-primary" onClick={salvar} disabled={saving}><Save size={16} /> {saving ? "Salvando…" : "Salvar loja"}</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- ABA MAIS CADASTROS ----------------
type ItemMais = { href: string; label: string; desc: string; icon: React.ElementType };
const GRUPOS_MAIS: { titulo: string; itens: ItemMais[] }[] = [
  { titulo: "Acesso", itens: [
    { href: "/usuarios", label: "Usuários", desc: "Equipe com acesso ao sistema.", icon: Users },
    { href: "/perfis", label: "Perfis de acesso", desc: "Permissões por função.", icon: UserCog },
  ] },
  { titulo: "Comercial", itens: [
    { href: "/clientes", label: "Clientes", desc: "Cadastro de clientes.", icon: Users },
    { href: "/vendedores", label: "Vendedores", desc: "Equipe comercial.", icon: UserCog },
    { href: "/produtos", label: "Produtos", desc: "Itens, preços e regras.", icon: Package },
    { href: "/familias", label: "Famílias", desc: "Agrupamento (inclui Moldura).", icon: Tags },
    { href: "/fornecedores", label: "Fornecedores", desc: "Cadastro de fornecedores.", icon: Truck },
  ] },
  { titulo: "Financeiro", itens: [
    { href: "/contas", label: "Contas financeiras", desc: "Caixas e contas bancárias.", icon: Landmark },
    { href: "/operadoras", label: "Operadoras de cartão", desc: "Taxas e prazos.", icon: CreditCard },
    { href: "/centro-custos", label: "Centro de custos", desc: "Custos fixos e variáveis.", icon: Layers },
    { href: "/hora-homem", label: "Hora-homem", desc: "Custo de mão de obra.", icon: Clock },
    { href: "/hora-maquina", label: "Hora-máquina", desc: "Custo de equipamentos.", icon: Cog },
    { href: "/depreciacao", label: "Depreciação", desc: "Depreciação de ativos.", icon: TrendingDown },
  ] },
];

function AbaMais() {
  return (
    <div>
      {GRUPOS_MAIS.map((g) => (
        <div key={g.titulo} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--v6-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>{g.titulo}</div>
          <div className="v6-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
            {g.itens.map((it) => {
              const Icon = it.icon;
              return (
                <Link key={it.href} href={it.href} className="v6-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, textDecoration: "none", color: "inherit" }}>
                  <div className="v6-ic" style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--v6-primary-soft)", color: "var(--v6-primary)" }}><Icon size={20} /></div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{it.label}</div><div style={{ fontSize: 12.5, color: "var(--v6-muted)" }}>{it.desc}</div></div>
                  <ChevronRight size={18} style={{ color: "var(--v6-muted)" }} />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
