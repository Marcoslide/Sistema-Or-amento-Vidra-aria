-- ============================================================
-- Migration 0013 — REDE DE SEGURANÇA: reafirma a identidade da empresa/lojas
-- Corrige "column organizations.fantasia does not exist" (e afins) quando a 0006
-- não foi aplicada no ambiente. Idempotente (add column if not exists) — seguro
-- rodar mesmo com a 0006 já aplicada. Faz BACKFILL de fantasia/razão a partir de nome.
-- Nomes de coluna = os esperados pelo frontend (src/lib/data/empresa-actions.ts):
--   fantasia, razao_social, ie, im, tel, whatsapp, email, site, cep, logradouro,
--   numero, complemento, bairro, cidade, uf, garantia, rodape, representante,
--   rep_cpf, foro_comarca, foro_estado, foro_texto, foro_revisado, validade_dias, logo_url.
-- NÃO remove/sobrescreve id, nome, cnpj, created_at. NÃO executar em produção.
-- ============================================================

-- organizations
alter table organizations add column if not exists fantasia text;
alter table organizations add column if not exists razao_social text;
alter table organizations add column if not exists ie text;
alter table organizations add column if not exists im text;
alter table organizations add column if not exists tel text;
alter table organizations add column if not exists whatsapp text;
alter table organizations add column if not exists email text;
alter table organizations add column if not exists site text;
alter table organizations add column if not exists cep text;
alter table organizations add column if not exists logradouro text;
alter table organizations add column if not exists numero text;
alter table organizations add column if not exists complemento text;
alter table organizations add column if not exists bairro text;
alter table organizations add column if not exists cidade text;
alter table organizations add column if not exists uf text;
alter table organizations add column if not exists garantia text;
alter table organizations add column if not exists rodape text;
alter table organizations add column if not exists representante text;
alter table organizations add column if not exists rep_cpf text;
alter table organizations add column if not exists foro_comarca text;
alter table organizations add column if not exists foro_estado text;
alter table organizations add column if not exists foro_texto text;
alter table organizations add column if not exists foro_revisado boolean not null default false;
alter table organizations add column if not exists validade_dias integer not null default 15;
alter table organizations add column if not exists logo_url text;

-- stores
alter table stores add column if not exists nome_comercial text;
alter table stores add column if not exists ie text;
alter table stores add column if not exists im text;
alter table stores add column if not exists tel text;
alter table stores add column if not exists whatsapp text;
alter table stores add column if not exists email text;
alter table stores add column if not exists cep text;
alter table stores add column if not exists logradouro text;
alter table stores add column if not exists numero text;
alter table stores add column if not exists complemento text;
alter table stores add column if not exists bairro text;
alter table stores add column if not exists logo_url text;

-- Backfill seguro (não inventa dados fiscais): fantasia/razão herdam nome quando vazios.
update organizations set fantasia = nome where fantasia is null or fantasia = '';
update organizations set razao_social = nome where razao_social is null or razao_social = '';
