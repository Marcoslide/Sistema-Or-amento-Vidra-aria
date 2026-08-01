"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Search, MoreHorizontal, Pencil, Power, Trash2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  getUsuariosData, usuarioSalvar, usuarioSetStatus, usuarioExcluir, usuarioConvidar, type UsuariosData, type UsuarioRow,
} from "@/lib/data/usuarios-actions";

const STATUS = [
  { value: "ATIVO", label: "Ativo" },
  { value: "PENDENTE_APROVACAO", label: "Pendente de aprovação" },
  { value: "BLOQUEADO", label: "Bloqueado" },
];

export default function UsuariosPage() {
  const [data, setData] = useState<UsuariosData | null>(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<UsuarioRow | null>(null);
  const [convite, setConvite] = useState<{ email: string; nome: string; role_id: string; lojas: string[] } | null>(null);
  const [blocked, setBlocked] = useState<{ id: string; det: { label: string; n: number }[] } | null>(null);

  const carregar = useCallback(async () => {
    try { setData(await getUsuariosData()); setErro(""); } catch (e) { setErro((e as Error).message); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const lista = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return q ? data.usuarios.filter((u) => (u.nome + " " + (u.email || "")).toLowerCase().includes(q)) : data.usuarios;
  }, [data, query]);

  const roleName = (id: string | null) => data?.roles.find((r) => r.id === id)?.nome || "—";
  const lojaNames = (ids: string[]) => ids.map((i) => data?.stores.find((s) => s.id === i)?.nome || i).join(", ") || "—";

  async function salvarEdit() {
    if (!edit) return;
    const r = await usuarioSalvar(edit.id, { nome: edit.nome, role_id: edit.role_id || "", seller_id: edit.seller_id, status: edit.status, lojas: edit.lojas });
    if (!r.ok) { setMsg(r.error || "Falha."); return; }
    setEdit(null); setMsg(""); await carregar();
  }
  async function enviarConvite() {
    if (!convite) return;
    if (!convite.email.trim()) { setMsg("Informe o e-mail."); return; }
    const r = await usuarioConvidar(convite);
    if (!r.ok) { setMsg(r.error || "Falha."); return; }
    setConvite(null); setMsg("Convite enviado."); await carregar();
  }
  async function excluir(id: string) {
    const r = await usuarioExcluir(id);
    if (r.ok) { await carregar(); return; }
    if (r.blocked) { setBlocked({ id, det: r.det || [] }); return; }
    setMsg(r.error || "Falha ao excluir.");
  }

  if (erro) return <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro} — verifique a conexão.</div>;
  if (!data) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Usuários" description="Usuários reais (Supabase Auth), vínculo com lojas e permissões por perfil.">
        {data.canManage && (
          <Button className="gap-1.5" onClick={() => setConvite({ email: "", nome: "", role_id: data.roles[0]?.id || "", lojas: [] })}>
            <UserPlus className="h-4 w-4" /> Convidar usuário
          </Button>
        )}
      </PageHeader>
      {msg && <div className="rounded-lg border bg-muted px-4 py-2 text-sm">{msg}</div>}
      {!data.canInvite && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Convite/criação de usuários exige <code>SUPABASE_SERVICE_ROLE_KEY</code> no servidor (staging). A edição de perfis/lojas/status já funciona.
        </div>
      )}

      <Card><CardContent className="p-0">
        <div className="border-b p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou e-mail..." className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="pl-6">Usuário</TableHead><TableHead>Perfil</TableHead><TableHead>Lojas</TableHead>
              <TableHead>Status</TableHead><TableHead className="pr-6 text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {lista.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="pl-6">
                    <div className="font-medium">{u.nome || "—"}{u.id === data.myId && <Badge className="ml-2" variant="secondary">você</Badge>}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>{roleName(u.role_id)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lojaNames(u.lojas)}</TableCell>
                  <TableCell>
                    {u.status === "ATIVO" ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Ativo</Badge>
                      : u.status === "BLOQUEADO" ? <Badge variant="destructive">Bloqueado</Badge>
                        : <Badge variant="secondary">Pendente</Badge>}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    {data.canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEdit({ ...u })}><Pencil className="h-4 w-4" /> Editar</DropdownMenuItem>
                          {u.id !== data.myId && (
                            <DropdownMenuItem onClick={async () => { await usuarioSetStatus(u.id, u.status === "BLOQUEADO" ? "ATIVO" : "BLOQUEADO"); await carregar(); }}>
                              <Power className="h-4 w-4" /> {u.status === "BLOQUEADO" ? "Desbloquear" : "Bloquear"}
                            </DropdownMenuItem>
                          )}
                          {u.status === "PENDENTE_APROVACAO" && <DropdownMenuItem onClick={async () => { await usuarioSetStatus(u.id, "ATIVO"); await carregar(); }}>Aprovar</DropdownMenuItem>}
                          {data.canDelete && u.id !== data.myId && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => excluir(u.id)}><Trash2 className="h-4 w-4" /> Excluir</DropdownMenuItem></>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>

      {/* Editar usuário */}
      <Dialog open={!!edit} onOpenChange={(o) => { if (!o) { setEdit(null); setMsg(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div><Label className="mb-1 block">Nome</Label><Input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="mb-1 block">Perfil</Label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={edit.role_id || ""} onChange={(e) => setEdit({ ...edit, role_id: e.target.value })}>
                    <option value="">—</option>{data.roles.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                  </select>
                </div>
                <div><Label className="mb-1 block">Status</Label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                    {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div><Label className="mb-1 block">Vincular a vendedor</Label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={edit.seller_id || ""} onChange={(e) => setEdit({ ...edit, seller_id: e.target.value || null })}>
                  <option value="">— nenhum —</option>{data.sellers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div><Label className="mb-1 block">Lojas de acesso</Label>
                <div className="flex flex-wrap gap-2">
                  {data.stores.map((s) => (
                    <label key={s.id} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={edit.lojas.includes(s.id)}
                        onChange={(e) => setEdit({ ...edit, lojas: e.target.checked ? [...edit.lojas, s.id] : edit.lojas.filter((x) => x !== s.id) })} />
                      {s.nome}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={salvarEdit}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convidar */}
      <Dialog open={!!convite} onOpenChange={(o) => { if (!o) { setConvite(null); setMsg(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle><span className="inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Convidar usuário</span></DialogTitle></DialogHeader>
          {convite && (
            <div className="space-y-3">
              <div><Label className="mb-1 block">E-mail *</Label><Input type="email" value={convite.email} onChange={(e) => setConvite({ ...convite, email: e.target.value })} /></div>
              <div><Label className="mb-1 block">Nome</Label><Input value={convite.nome} onChange={(e) => setConvite({ ...convite, nome: e.target.value })} /></div>
              <div><Label className="mb-1 block">Perfil</Label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={convite.role_id} onChange={(e) => setConvite({ ...convite, role_id: e.target.value })}>
                  {data.roles.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>
              <div><Label className="mb-1 block">Lojas de acesso</Label>
                <div className="flex flex-wrap gap-2">
                  {data.stores.map((s) => (
                    <label key={s.id} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={convite.lojas.includes(s.id)}
                        onChange={(e) => setConvite({ ...convite, lojas: e.target.checked ? [...convite.lojas, s.id] : convite.lojas.filter((x) => x !== s.id) })} />
                      {s.nome}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setConvite(null)}>Cancelar</Button><Button onClick={enviarConvite}>Enviar convite</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exclusão bloqueada por histórico */}
      <Dialog open={!!blocked} onOpenChange={(o) => { if (!o) setBlocked(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Não é possível excluir</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Este usuário possui histórico e não pode ser apagado:</p>
          <ul className="list-disc pl-5 text-sm text-destructive">{blocked?.det.map((d, i) => <li key={i}>{d.n} {d.label}</li>)}</ul>
          <p className="text-sm text-muted-foreground">Ele pode ser <b>bloqueado</b> para preservar o histórico.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlocked(null)}>Fechar</Button>
            <Button onClick={async () => { if (blocked) { await usuarioSetStatus(blocked.id, "BLOQUEADO"); setBlocked(null); await carregar(); } }}>Bloquear usuário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
