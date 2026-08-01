"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, MoreHorizontal, Pencil, Copy, Power, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  getPerfisData, perfilSalvar, perfilDuplicar, perfilSetAtivo, perfilExcluir, perfilTogglePerm, type PerfilData,
} from "@/lib/data/perfis-actions";

export default function PerfisPage() {
  const [data, setData] = useState<PerfilData | null>(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState<{ id: string | null; nome: string } | null>(null);
  const [permSet, setPermSet] = useState<Set<string>>(new Set());

  const carregar = useCallback(async () => {
    try {
      const d = await getPerfisData();
      setData(d);
      setPermSet(new Set(d.rolePerms.map((r) => r.role_id + "|" + r.permission_key)));
      setErro("");
    } catch (e) { setErro((e as Error).message); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function toggle(roleId: string, perm: string, on: boolean) {
    const key = roleId + "|" + perm;
    const next = new Set(permSet); if (on) next.add(key); else next.delete(key); setPermSet(next);
    const r = await perfilTogglePerm(roleId, perm, on);
    if (!r.ok) { setMsg(r.error || "Falha."); await carregar(); }
  }
  async function salvar() {
    if (!form) return;
    const r = await perfilSalvar(form.id, form.nome);
    if (!r.ok) { setMsg(r.error || "Falha."); return; }
    setForm(null); setMsg(""); await carregar();
  }
  async function excluir(id: string) {
    const r = await perfilExcluir(id);
    if (r.ok) { await carregar(); return; }
    if (r.blocked) { setMsg("Perfil em uso por " + (r.det?.[0]?.n || 0) + " usuário(s) — inative em vez de excluir."); return; }
    setMsg(r.error || "Falha ao excluir.");
  }

  if (erro) return <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro} — verifique a conexão.</div>;
  if (!data) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Perfis e permissões" description="Matriz de permissões por perfil. Perfil em uso ou Administrador não podem ser excluídos.">
        {data.canManage && <Button className="gap-1.5" onClick={() => setForm({ id: null, nome: "" })}><Plus className="h-4 w-4" /> Novo perfil</Button>}
      </PageHeader>
      {msg && <div className="rounded-lg border bg-muted px-4 py-2 text-sm">{msg}</div>}

      {data.roles.map((role) => (
        <Card key={role.id}>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-semibold">
                  {role.nome}
                  {role.ativo === false && <Badge variant="secondary">Inativo</Badge>}
                  {data.inUse[role.id] ? <span className="text-xs text-muted-foreground">em uso por {data.inUse[role.id]} usuário(s)</span> : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.permissions.filter((p) => permSet.has(role.id + "|" + p.key)).length} permissão(ões)
                </div>
              </div>
              {data.canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setForm({ id: role.id, nome: role.nome })}><Pencil className="h-4 w-4" /> Renomear</DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => { await perfilDuplicar(role.id); await carregar(); }}><Copy className="h-4 w-4" /> Duplicar</DropdownMenuItem>
                    {role.id !== "admin" && <DropdownMenuItem onClick={async () => { await perfilSetAtivo(role.id, role.ativo === false); await carregar(); }}><Power className="h-4 w-4" /> {role.ativo === false ? "Reativar" : "Inativar"}</DropdownMenuItem>}
                    {role.id !== "admin" && data.canDelete && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => excluir(role.id)}><Trash2 className="h-4 w-4" /> Excluir</DropdownMenuItem></>}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {data.permissions.map((p) => {
                const on = permSet.has(role.id + "|" + p.key);
                const locked = role.id === "admin"; // admin sempre tem tudo
                return (
                  <label key={p.key} className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${on ? "border-primary/40 bg-primary/5" : ""}`}>
                    <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={on || locked} disabled={locked || !data.canManage}
                      onChange={(e) => toggle(role.id, p.key, e.target.checked)} />
                    {p.descricao || p.key}
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!form} onOpenChange={(o) => { if (!o) { setForm(null); setMsg(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "Renomear perfil" : "Novo perfil"}</DialogTitle></DialogHeader>
          {form && (<div><Label className="mb-1 block">Nome do perfil *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
