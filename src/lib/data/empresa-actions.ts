"use server";

import { getCtx, ctxHasPerm, ctxAudit } from "@/lib/data/server-ctx";

// ============================================================
// Identidade configurável da empresa usuária (vidraçaria) e das lojas.
// - VidroGestor = nome do software (marca discreta no rodapé do menu).
// - Empresa/vidraçaria = cadastro do cliente que usa o sistema; alimenta
//   sidebar/cabeçalho, login e todos os documentos (PDFs).
// Escrita exige permissão adm.config; leitura é escopada por RLS (org).
// ============================================================

export type Empresa = {
  nome: string;            // organizations.nome (obrigatório do schema)
  fantasia: string; razao_social: string; cnpj: string; ie: string; im: string;
  tel: string; whatsapp: string; email: string; site: string;
  cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string;
  garantia: string; rodape: string;
  representante: string; rep_cpf: string; foro_comarca: string; foro_estado: string; foro_texto: string; foro_revisado: boolean;
  validade_dias: number; logo_url: string;
};

const EMPRESA_COLS =
  "nome,fantasia,razao_social,cnpj,ie,im,tel,whatsapp,email,site,cep,logradouro,numero,complemento,bairro,cidade,uf,garantia,rodape,representante,rep_cpf,foro_comarca,foro_estado,foro_texto,foro_revisado,validade_dias,logo_url";

function normEmpresa(o: Record<string, unknown> | null): Empresa {
  const g = (k: string) => (o?.[k] as string) ?? "";
  return {
    nome: g("nome"), fantasia: g("fantasia"), razao_social: g("razao_social"), cnpj: g("cnpj"),
    ie: g("ie"), im: g("im"), tel: g("tel"), whatsapp: g("whatsapp"), email: g("email"), site: g("site"),
    cep: g("cep"), logradouro: g("logradouro"), numero: g("numero"), complemento: g("complemento"),
    bairro: g("bairro"), cidade: g("cidade"), uf: g("uf"), garantia: g("garantia"), rodape: g("rodape"),
    representante: g("representante"), rep_cpf: g("rep_cpf"), foro_comarca: g("foro_comarca"),
    foro_estado: g("foro_estado"), foro_texto: g("foro_texto"), foro_revisado: Boolean(o?.foro_revisado),
    validade_dias: Number(o?.validade_dias) || 15, logo_url: g("logo_url"),
  };
}

export async function getEmpresa(): Promise<{ ok: boolean; error?: string; data?: Empresa }> {
  try {
    const c = await getCtx();
    const { data, error } = await c.supabase.from("organizations").select(EMPRESA_COLS).eq("id", c.org).maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: normEmpresa(data as Record<string, unknown>) };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function saveEmpresa(dados: Partial<Empresa>): Promise<{ ok: boolean; error?: string }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "adm.config"))) return { ok: false, error: "Sem permissão para editar os dados da empresa." };
    const nome = (dados.fantasia || dados.razao_social || dados.nome || "").trim();
    if (!nome) return { ok: false, error: "Informe o nome fantasia ou a razão social." };
    const patch: Record<string, unknown> = {
      nome, // mantém organizations.nome coerente (fantasia > razão > nome)
      fantasia: dados.fantasia ?? null, razao_social: dados.razao_social ?? null, cnpj: dados.cnpj ?? null,
      ie: dados.ie ?? null, im: dados.im ?? null, tel: dados.tel ?? null, whatsapp: dados.whatsapp ?? null,
      email: dados.email ?? null, site: dados.site ?? null, cep: dados.cep ?? null, logradouro: dados.logradouro ?? null,
      numero: dados.numero ?? null, complemento: dados.complemento ?? null, bairro: dados.bairro ?? null,
      cidade: dados.cidade ?? null, uf: dados.uf ?? null, garantia: dados.garantia ?? null, rodape: dados.rodape ?? null,
      representante: dados.representante ?? null, rep_cpf: dados.rep_cpf ?? null, foro_comarca: dados.foro_comarca ?? null,
      foro_estado: dados.foro_estado ?? null, foro_texto: dados.foro_texto ?? null, foro_revisado: Boolean(dados.foro_revisado),
      validade_dias: Number(dados.validade_dias) || 15,
    };
    if (dados.logo_url !== undefined) patch.logo_url = dados.logo_url || null;
    const { error } = await c.supabase.from("organizations").update(patch).eq("id", c.org);
    if (error) return { ok: false, error: error.message };
    await ctxAudit(c, "Configurações", "Salvou dados da empresa", nome);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// Identidade leve para sidebar/login/PDF (nome exibível + logo). Nunca lança.
export type Identidade = { nome: string; logo: string; rodape: string };
export async function getIdentidade(): Promise<Identidade> {
  try {
    const c = await getCtx();
    const { data } = await c.supabase.from("organizations").select("nome,fantasia,razao_social,logo_url,rodape").eq("id", c.org).maybeSingle();
    const nome = ((data?.fantasia as string) || (data?.razao_social as string) || (data?.nome as string) || "VidroGestor").trim();
    return { nome, logo: (data?.logo_url as string) || "", rodape: (data?.rodape as string) || "" };
  } catch { return { nome: "VidroGestor", logo: "", rodape: "" }; }
}

// ---------------- LOJAS (cadastro fiscal completo) ----------------
export type LojaFull = {
  id: string; nome: string; nome_comercial: string; tipo: string; cnpj: string; ie: string; im: string;
  tel: string; whatsapp: string; email: string; cep: string; logradouro: string; numero: string;
  complemento: string; bairro: string; cidade: string; uf: string; resp: string; logo_url: string; ativo: boolean;
};

const LOJA_COLS =
  "id,nome,nome_comercial,tipo,cnpj,ie,im,tel,whatsapp,email,cep,logradouro,numero,complemento,bairro,cidade,uf,resp,logo_url,ativo";

function normLoja(o: Record<string, unknown>): LojaFull {
  const g = (k: string) => (o?.[k] as string) ?? "";
  return {
    id: g("id"), nome: g("nome"), nome_comercial: g("nome_comercial"), tipo: g("tipo") || "loja", cnpj: g("cnpj"),
    ie: g("ie"), im: g("im"), tel: g("tel"), whatsapp: g("whatsapp"), email: g("email"), cep: g("cep"),
    logradouro: g("logradouro"), numero: g("numero"), complemento: g("complemento"), bairro: g("bairro"),
    cidade: g("cidade"), uf: g("uf"), resp: g("resp"), logo_url: g("logo_url"), ativo: o?.ativo !== false,
  };
}

export async function listLojasFull(): Promise<{ ok: boolean; error?: string; data?: LojaFull[] }> {
  try {
    const c = await getCtx();
    const { data, error } = await c.supabase.from("stores").select(LOJA_COLS).eq("organization_id", c.org).order("nome");
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data || []).map((r) => normLoja(r as Record<string, unknown>)) };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function saveLoja(dados: Partial<LojaFull>): Promise<{ ok: boolean; error?: string }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "adm.config"))) return { ok: false, error: "Sem permissão para editar lojas." };
    const nome = (dados.nome || "").trim();
    if (!nome) return { ok: false, error: "Informe o nome da loja." };
    const patch: Record<string, unknown> = {
      nome, nome_comercial: dados.nome_comercial ?? null, tipo: dados.tipo || "loja", cnpj: dados.cnpj ?? null,
      ie: dados.ie ?? null, im: dados.im ?? null, tel: dados.tel ?? null, whatsapp: dados.whatsapp ?? null,
      email: dados.email ?? null, cep: dados.cep ?? null, logradouro: dados.logradouro ?? null, numero: dados.numero ?? null,
      complemento: dados.complemento ?? null, bairro: dados.bairro ?? null, cidade: dados.cidade ?? null, uf: dados.uf ?? null,
      resp: dados.resp ?? null,
    };
    if (dados.logo_url !== undefined) patch.logo_url = dados.logo_url || null;
    if (dados.id) {
      const { error } = await c.supabase.from("stores").update(patch).eq("id", dados.id).eq("organization_id", c.org);
      if (error) return { ok: false, error: error.message };
      await ctxAudit(c, "Lojas", "Editou loja", nome);
    } else {
      patch.organization_id = c.org; patch.ativo = true;
      const { error } = await c.supabase.from("stores").insert(patch);
      if (error) return { ok: false, error: error.message };
      await ctxAudit(c, "Lojas", "Criou loja", nome);
    }
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function toggleLojaAtiva(id: string): Promise<{ ok: boolean; error?: string; ativo?: boolean }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "adm.config"))) return { ok: false, error: "Sem permissão para inativar/reativar lojas." };
    const { data: atual } = await c.supabase.from("stores").select("ativo,nome").eq("id", id).eq("organization_id", c.org).maybeSingle();
    if (!atual) return { ok: false, error: "Loja não encontrada." };
    const novo = atual.ativo === false; // inativa vira ativa e vice-versa
    const { error } = await c.supabase.from("stores").update({ ativo: novo }).eq("id", id).eq("organization_id", c.org);
    if (error) return { ok: false, error: error.message };
    await ctxAudit(c, "Lojas", novo ? "Reativou loja" : "Inativou loja", (atual.nome as string) || "");
    return { ok: true, ativo: novo };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
