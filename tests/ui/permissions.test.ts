import { test } from "node:test";
import assert from "node:assert/strict";
import { filtrarNav, podeVerCusto, podeVerMargem, temPerm } from "../../src/lib/permissions.ts";

// Simula o grupo "Sistema" com itens que exigem permissão
const GRUPOS = [
  { title: "Operação", items: [{ perm: undefined, href: "/dashboard" }, { href: "/orcamentos" }] },
  { title: "Sistema", items: [
    { perm: "adm.usuarios", href: "/usuarios" },
    { perm: "adm.config", href: "/perfis" },
    { perm: "adm.config", href: "/configuracoes" },
  ] },
];

const PERMS_ADMIN = ["adm.usuarios", "adm.config", "fin.ver_custos", "fin.ver_margem", "vendas.todas"];
const PERMS_VENDEDOR = ["vendas.proprias", "vendas.editar", "fin.ver_valores"];

test("temPerm: item sem perm é público", () => {
  assert.equal(temPerm([], undefined), true);
  assert.equal(temPerm([], "adm.usuarios"), false);
  assert.equal(temPerm(["adm.usuarios"], "adm.usuarios"), true);
});

test("admin vê o grupo Sistema completo", () => {
  const g = filtrarNav(GRUPOS, PERMS_ADMIN);
  const sistema = g.find((x) => x.title === "Sistema");
  assert.ok(sistema, "grupo Sistema presente");
  assert.deepEqual(sistema.items.map((i) => i.href), ["/usuarios", "/perfis", "/configuracoes"]);
});

test("vendedor NÃO vê Usuários/Perfis/Configurações (grupo Sistema some)", () => {
  const g = filtrarNav(GRUPOS, PERMS_VENDEDOR);
  assert.equal(g.find((x) => x.title === "Sistema"), undefined, "grupo Sistema oculto");
  // ainda vê Operação (itens públicos)
  const op = g.find((x) => x.title === "Operação");
  assert.ok(op && op.items.length === 2);
});

test("vendedor não vê custo nem margem; admin vê ambos", () => {
  assert.equal(podeVerCusto(PERMS_VENDEDOR), false);
  assert.equal(podeVerMargem(PERMS_VENDEDOR), false);
  assert.equal(podeVerCusto(PERMS_ADMIN), true);
  assert.equal(podeVerMargem(PERMS_ADMIN), true);
});
