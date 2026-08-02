"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, MoreHorizontal, Pencil, Copy, Power, Trash2, X } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { listRows, listAtivos } from "@/lib/data/cadastro-core";
import { acaoExcluir, acaoSetAtivo, acaoSalvar, acaoDuplicar } from "@/lib/data/cadastro-actions";

export type Field = {
  key: string; label: string;
  type: "text" | "number" | "checkbox" | "select" | "textarea";
  options?: { value: string; label: string }[];
  optionsFrom?: "lojas" | "contas" | "familias" | "fornecedores" | "centrocustos";
  full?: boolean; required?: boolean;
  showWhen?: (v: Record<string, unknown>) => boolean;
};
export type Column = {
  key: string; label: string; align?: "right";
  render?: (row: Record<string, unknown>) => React.ReactNode;
};
type Row = Record<string, unknown> & { id: string; nome?: string; descricao?: string; ativo?: boolean; store_id?: string | null };

// Estilos de controle de formulário no visual V6 (mesmas medidas de .v6-search input / .v6-op select).
const ctrl: React.CSSProperties = {
  width: "100%", height: 38, border: "1px solid var(--v6-border)", borderRadius: 9,
  padding: "0 11px", background: "var(--v6-card)", fontSize: 13.5, color: "var(--v6-fg)", outline: "none",
};

// Botão secundário no visual V6 (V6 só define .v6-btn-primary; secundários herdam .v6-btn + borda).
function btnSecundario(kind?: "danger" | "ghost"): React.CSSProperties {
  if (kind === "ghost") return { background: "transparent", color: "var(--v6-muted)" };
  if (kind === "danger") return { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" };
  return { background: "var(--v6-card)", color: "var(--v6-fg)", border: "1px solid var(--v6-border)" };
}

export function CadastroView(props: {
  entity: string; title: string; description: string;
  table: string; select: string; orderBy?: string;
  nameKey?: string; columns: Column[]; fields: Field[];
  searchKeys: string[]; lojaFilter?: boolean;
  novo: () => Record<string, unknown>;
  novoHref?: string;   // se definido, "Novo" navega para a página de criação (edição segue no diálogo)
}) {
  const nameKey = props.nameKey || "nome";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [query, setQuery] = useState("");
  const [lojaSel, setLojaSel] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [lojas, setLojas] = useState<{ id: string; nome: string }[]>([]);
  const [contas, setContas] = useState<{ id: string; nome: string }[]>([]);
  const [familias, setFamilias] = useState<{ id: string; nome: string }[]>([]);
  const [fornecedores, setFornecedores] = useState<{ id: string; nome: string }[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<{ id: string; nome: string }[]>([]);
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<{ id: string; det: { label: string; n: number }[] } | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRows<Row>(props.table, props.select, props.orderBy || nameKey);
      setRows(data); setErro("");
    } catch (e) { setRows([]); setErro((e as Error).message); }
    finally { setLoading(false); }
  }, [props.table, props.select, props.orderBy, nameKey]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    const precisaLojas = props.lojaFilter || props.fields.some((f) => f.optionsFrom === "lojas");
    const precisaContas = props.fields.some((f) => f.optionsFrom === "contas");
    if (precisaLojas) listAtivos("stores").then(setLojas).catch(() => {});
    if (precisaContas) listAtivos("financial_accounts").then(setContas).catch(() => {});
    if (props.fields.some((f) => f.optionsFrom === "familias")) listAtivos("product_families").then(setFamilias).catch(() => {});
    if (props.fields.some((f) => f.optionsFrom === "fornecedores")) listAtivos("suppliers").then(setFornecedores).catch(() => {});
    if (props.fields.some((f) => f.optionsFrom === "centrocustos")) listAtivos("cost_centers").then(setCentrosCusto).catch(() => {});
  }, [props.fields, props.lojaFilter]);

  const filtered = useMemo(() => {
    let r = rows;
    if (lojaSel) r = r.filter((x) => x.store_id === lojaSel);
    const q = query.trim().toLowerCase();
    if (q) r = r.filter((x) => props.searchKeys.some((k) => String(x[k] ?? "").toLowerCase().includes(q)));
    return r;
  }, [rows, query, lojaSel, props.searchKeys]);

  function abrirNovo() { setEditId(null); setForm(props.novo()); }
  function abrirEdit(row: Row) { setEditId(row.id); setForm({ ...row }); }

  async function salvar() {
    if (!form) return;
    const nome = String(form[nameKey] ?? "").trim();
    if (!nome) { setMsg("Informe " + nameKey + "."); return; }
    const payload: Record<string, unknown> = {};
    for (const f of props.fields) {
      if (f.showWhen && !f.showWhen(form)) continue;
      let v = form[f.key];
      if (f.type === "number") v = Number(v) || 0;
      else if (f.type === "checkbox") v = Boolean(v);
      else v = v === "" || v === undefined ? null : v;
      payload[f.key] = v;
    }
    const res = await acaoSalvar(props.entity, editId, payload);
    if (!res.ok) { setMsg(res.error || "Falha ao salvar."); return; }
    setForm(null); setMsg(""); await carregar();
  }

  async function excluir(row: Row) {
    const res = await acaoExcluir(props.entity, row.id);
    if (res.ok) { await carregar(); return; }
    if ("blocked" in res && res.blocked) { setBlocked({ id: row.id, det: res.det }); return; }
    setMsg(("error" in res && res.error) || "Falha ao excluir.");
  }
  async function inativarBloqueado() {
    if (!blocked) return;
    await acaoSetAtivo(props.entity, blocked.id, false);
    setBlocked(null); await carregar();
  }
  async function toggle(row: Row) { await acaoSetAtivo(props.entity, row.id, row.ativo === false); await carregar(); }
  async function duplicar(row: Row) { await acaoDuplicar(props.entity, row.id); await carregar(); }

  async function massa(acao: "inativar" | "reativar" | "excluir") {
    const ids = [...sel];
    for (const id of ids) {
      if (acao === "inativar") await acaoSetAtivo(props.entity, id, false);
      else if (acao === "reativar") await acaoSetAtivo(props.entity, id, true);
      else { const r = await acaoExcluir(props.entity, id); if (!r.ok && "blocked" in r) await acaoSetAtivo(props.entity, id, false); }
    }
    setSel(new Set()); await carregar();
  }

  function optsFor(f: Field): { value: string; label: string }[] {
    if (f.optionsFrom === "lojas") return lojas.map((l) => ({ value: l.id, label: l.nome }));
    if (f.optionsFrom === "contas") return contas.map((c) => ({ value: c.nome, label: c.nome }));
    if (f.optionsFrom === "familias") return familias.map((c) => ({ value: c.nome, label: c.nome }));
    if (f.optionsFrom === "fornecedores") return fornecedores.map((c) => ({ value: c.nome, label: c.nome }));
    if (f.optionsFrom === "centrocustos") return centrosCusto.map((c) => ({ value: c.id, label: c.nome }));
    return f.options || [];
  }

  const colSpanVazio = props.columns.length + 3;

  return (
    <div>
      {/* Cabeçalho de página V6 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div>
          <div className="v6-page-title">{props.title}</div>
          <div className="v6-page-desc">{props.description}</div>
        </div>
        {props.novoHref
          ? <Link href={props.novoHref} className="v6-btn v6-btn-primary" style={{ marginLeft: "auto" }}><Plus /> Novo</Link>
          : <button className="v6-btn v6-btn-primary" style={{ marginLeft: "auto" }} onClick={abrirNovo}><Plus /> Novo</button>}
      </div>

      {erro && (
        <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>
          {erro} — verifique a conexão. Os dados não são exibidos para não mostrar informação desatualizada.
        </div>
      )}
      {msg && <div className="v6-card" style={{ padding: 12, marginBottom: 12, fontSize: 13 }}>{msg}</div>}

      {/* Barra de seleção em massa */}
      {sel.size > 0 && (
        <div className="v6-card" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 12, borderColor: "var(--v6-primary)", background: "var(--v6-primary-soft)" }}>
          <b style={{ fontSize: 13 }}>{sel.size} selecionado(s)</b>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="v6-btn" style={btnSecundario()} onClick={() => massa("inativar")}>Inativar</button>
            <button className="v6-btn" style={btnSecundario()} onClick={() => massa("reativar")}>Reativar</button>
            <button className="v6-btn" style={btnSecundario("danger")} onClick={() => massa("excluir")}>Excluir</button>
            <button className="v6-btn" style={btnSecundario("ghost")} onClick={() => setSel(new Set())}>Limpar</button>
          </div>
        </div>
      )}

      {/* Card com busca + filtro de loja + tabela */}
      <div className="v6-card">
        <div className="v6-card-b" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", borderBottom: "1px solid var(--v6-border)" }}>
          <div className="v6-search" style={{ flex: 1, maxWidth: 340 }}>
            <Search />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar..." />
          </div>
          {props.lojaFilter && (
            <div className="v6-op" style={{ display: "flex" }}>
              <select style={{ ...ctrl, width: "auto" }} value={lojaSel} onChange={(e) => setLojaSel(e.target.value)}>
                <option value="">Todas as lojas</option>
                {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
          )}
        </div>

        <p style={{ padding: "8px 20px 0", fontSize: 11, color: "var(--v6-muted)" }} className="sm:hidden">← deslize para ver preço, status e ações →</p>
        <div className="v6-card-b" style={{ overflowX: "auto" }}>
          <table className="v6-tbl" style={{ minWidth: 680 }}>
            <thead><tr>
              <th style={{ width: 36 }}></th>
              {props.columns.map((c) => <th key={c.key} style={c.align === "right" ? { textAlign: "right" } : undefined}>{c.label}</th>)}
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Ações</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={colSpanVazio} style={{ textAlign: "center", padding: 28, color: "var(--v6-muted)" }}>Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={colSpanVazio} style={{ textAlign: "center", padding: 28, color: "var(--v6-muted)" }}>{erro ? "—" : "Nenhum registro."}</td></tr>
              ) : filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input type="checkbox" checked={sel.has(row.id)} onChange={(e) => {
                      const n = new Set(sel); if (e.target.checked) n.add(row.id); else n.delete(row.id); setSel(n);
                    }} style={{ width: 15, height: 15, accentColor: "var(--v6-primary)" }} />
                  </td>
                  {props.columns.map((c) => (
                    <td key={c.key} style={c.align === "right" ? { textAlign: "right" } : undefined}>
                      {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                    </td>
                  ))}
                  <td>
                    {row.ativo === false
                      ? <span className="v6-chip" style={{ padding: "3px 10px", cursor: "default" }}>Inativo</span>
                      : <span className="v6-chip" style={{ padding: "3px 10px", cursor: "default", background: "#dcfce7", color: "#15803d", borderColor: "#86efac" }}>Ativo</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="v6-icon-btn" style={{ width: 32, height: 32, border: 0, background: "transparent" }}><MoreHorizontal size={16} /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirEdit(row)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicar(row)}><Copy className="mr-2 h-4 w-4" /> Duplicar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggle(row)}><Power className="mr-2 h-4 w-4" /> {row.ativo === false ? "Reativar" : "Inativar"}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => excluir(row)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diálogo de formulário */}
      <Dialog open={!!form} onOpenChange={(o) => { if (!o) { setForm(null); setMsg(""); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "Editar" : "Novo"} — {props.title}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
              {props.fields.filter((f) => !f.showWhen || f.showWhen(form)).map((f) => (
                <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                  {f.type === "checkbox" ? (
                    <label style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                      <input type="checkbox" checked={Boolean(form[f.key])} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} style={{ width: 15, height: 15, accentColor: "var(--v6-primary)" }} />
                      {f.label}
                    </label>
                  ) : (
                    <>
                      <label style={{ display: "block", marginBottom: 4, fontSize: 12.5, fontWeight: 600, color: "var(--v6-muted)" }}>{f.label}{f.required ? " *" : ""}</label>
                      {f.type === "select" ? (
                        <select style={ctrl} value={String(form[f.key] ?? "")} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                          <option value="">—</option>
                          {optsFor(f).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : f.type === "textarea" ? (
                        <textarea style={{ ...ctrl, height: "auto", minHeight: 70, padding: "8px 11px" }}
                          value={String(form[f.key] ?? "")} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                      ) : (
                        <input type={f.type === "number" ? "number" : "text"} style={ctrl} value={String(form[f.key] ?? "")}
                          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <button className="v6-btn" style={btnSecundario()} onClick={() => { setForm(null); setMsg(""); }}>Cancelar</button>
            <button className="v6-btn v6-btn-primary" onClick={salvar}>Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exclusão bloqueada por vínculo */}
      <Dialog open={!!blocked} onOpenChange={(o) => { if (!o) setBlocked(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Não é possível excluir</DialogTitle></DialogHeader>
          <p style={{ fontSize: 13, color: "var(--v6-muted)" }}>Este cadastro possui utilização no sistema e não pode ser apagado:</p>
          <ul style={{ listStyle: "disc", paddingLeft: 20, fontSize: 13, color: "#b91c1c" }}>
            {blocked?.det.map((d, i) => <li key={i}>{d.n} {d.label}</li>)}
          </ul>
          <p style={{ fontSize: 13, color: "var(--v6-muted)" }}>Para preservar o histórico, o cadastro pode ser <b>inativado</b>.</p>
          <DialogFooter>
            <button className="v6-btn" style={btnSecundario()} onClick={() => setBlocked(null)}><X className="mr-1 h-4 w-4" /> Fechar</button>
            <button className="v6-btn v6-btn-primary" onClick={inativarBloqueado}>Inativar cadastro</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
