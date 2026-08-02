"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Search, MoreHorizontal, Pencil, Copy, Power, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  optionsFrom?: "lojas" | "contas" | "familias" | "fornecedores";
  full?: boolean; required?: boolean;
  showWhen?: (v: Record<string, unknown>) => boolean;
};
export type Column = {
  key: string; label: string; align?: "right";
  render?: (row: Record<string, unknown>) => React.ReactNode;
};
type Row = Record<string, unknown> & { id: string; nome?: string; descricao?: string; ativo?: boolean; store_id?: string | null };

export function CadastroView(props: {
  entity: string; title: string; description: string;
  table: string; select: string; orderBy?: string;
  nameKey?: string; columns: Column[]; fields: Field[];
  searchKeys: string[]; lojaFilter?: boolean;
  novo: () => Record<string, unknown>;
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
    return f.options || [];
  }

  return (
    <div className="space-y-6">
      <PageHeader title={props.title} description={props.description}>
        <Button className="gap-1.5" onClick={abrirNovo}><Plus className="h-4 w-4" /> Novo</Button>
      </PageHeader>

      {erro && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {erro} — verifique a conexão. Os dados não são exibidos para não mostrar informação desatualizada.
        </div>
      )}
      {msg && <div className="rounded-lg border bg-muted px-4 py-2 text-sm">{msg}</div>}

      {sel.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-accent px-4 py-2 text-sm">
          <b>{sel.size} selecionado(s)</b>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => massa("inativar")}>Inativar</Button>
            <Button size="sm" variant="outline" onClick={() => massa("reativar")}>Reativar</Button>
            <Button size="sm" variant="destructive" onClick={() => massa("excluir")}>Excluir</Button>
            <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>Limpar</Button>
          </div>
        </div>
      )}

      <Card><CardContent className="p-0">
        <div className="flex flex-wrap gap-3 border-b p-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar..." className="pl-9" />
          </div>
          {props.lojaFilter && (
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={lojaSel} onChange={(e) => setLojaSel(e.target.value)}>
              <option value="">Todas as lojas</option>
              {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          )}
        </div>

        <p className="px-4 pt-2 text-[11px] text-muted-foreground sm:hidden">← deslize para ver preço, status e ações →</p>
        <div className="overflow-x-auto">
          <Table className="min-w-[680px]">
            <TableHeader><TableRow>
              <TableHead className="w-10 pl-4"></TableHead>
              {props.columns.map((c) => <TableHead key={c.key} className={c.align === "right" ? "text-right" : ""}>{c.label}</TableHead>)}
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={props.columns.length + 3} className="py-10 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={props.columns.length + 3} className="py-10 text-center text-muted-foreground">{erro ? "—" : "Nenhum registro."}</TableCell></TableRow>
              ) : filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-4">
                    <input type="checkbox" checked={sel.has(row.id)} onChange={(e) => {
                      const n = new Set(sel); if (e.target.checked) n.add(row.id); else n.delete(row.id); setSel(n);
                    }} className="h-4 w-4 accent-primary" />
                  </TableCell>
                  {props.columns.map((c) => (
                    <TableCell key={c.key} className={c.align === "right" ? "text-right" : ""}>
                      {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                    </TableCell>
                  ))}
                  <TableCell>
                    {row.ativo === false
                      ? <Badge variant="secondary">Inativo</Badge>
                      : <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Ativo</Badge>}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirEdit(row)}><Pencil className="h-4 w-4" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicar(row)}><Copy className="h-4 w-4" /> Duplicar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggle(row)}><Power className="h-4 w-4" /> {row.ativo === false ? "Reativar" : "Inativar"}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => excluir(row)}><Trash2 className="h-4 w-4" /> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>

      {/* Form */}
      <Dialog open={!!form} onOpenChange={(o) => { if (!o) { setForm(null); setMsg(""); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "Editar" : "Novo"} — {props.title}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
              {props.fields.filter((f) => !f.showWhen || f.showWhen(form)).map((f) => (
                <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                  {f.type === "checkbox" ? (
                    <label className="mt-6 flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={Boolean(form[f.key])} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} className="h-4 w-4 accent-primary" />
                      {f.label}
                    </label>
                  ) : (
                    <>
                      <Label className="mb-1 block">{f.label}{f.required ? " *" : ""}</Label>
                      {f.type === "select" ? (
                        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                          value={String(form[f.key] ?? "")} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                          <option value="">—</option>
                          {optsFor(f).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : f.type === "textarea" ? (
                        <textarea className="min-h-[70px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value={String(form[f.key] ?? "")} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                      ) : (
                        <Input type={f.type === "number" ? "number" : "text"} value={String(form[f.key] ?? "")}
                          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setForm(null); setMsg(""); }}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exclusão bloqueada por vínculo */}
      <Dialog open={!!blocked} onOpenChange={(o) => { if (!o) setBlocked(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Não é possível excluir</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Este cadastro possui utilização no sistema e não pode ser apagado:</p>
          <ul className="list-disc pl-5 text-sm text-destructive">
            {blocked?.det.map((d, i) => <li key={i}>{d.n} {d.label}</li>)}
          </ul>
          <p className="text-sm text-muted-foreground">Para preservar o histórico, o cadastro pode ser <b>inativado</b>.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlocked(null)}>Fechar</Button>
            <Button onClick={inativarBloqueado}>Inativar cadastro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
