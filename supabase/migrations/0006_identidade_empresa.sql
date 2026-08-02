-- ============================================================
-- Migration 0006 — ADITIVA: identidade configurável da empresa e das lojas (paridade V6)
-- A V6 permite cadastrar a empresa usuária (nome fantasia, razão, dados fiscais,
-- endereço, representante legal, foro, logomarca) e cada loja com dados próprios.
-- Essa identidade alimenta a sidebar, o login e os documentos (PDFs).
-- NÃO destrutiva (apenas add column if not exists). NÃO executar em produção.
-- Reversão: alter table ... drop column <coluna>;  (colunas listadas abaixo)
-- Rodar após 0001..0005.
-- ============================================================

-- ---------- organizations (empresa usuária / vidraçaria) ----------
alter table organizations add column if not exists fantasia text;
alter table organizations add column if not exists razao_social text;
alter table organizations add column if not exists ie text;                 -- inscrição estadual
alter table organizations add column if not exists im text;                 -- inscrição municipal
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
alter table organizations add column if not exists garantia text;           -- garantia padrão
alter table organizations add column if not exists rodape text;             -- rodapé do documento
alter table organizations add column if not exists representante text;      -- representante legal
alter table organizations add column if not exists rep_cpf text;
alter table organizations add column if not exists foro_comarca text;
alter table organizations add column if not exists foro_estado text;
alter table organizations add column if not exists foro_texto text;
alter table organizations add column if not exists foro_revisado boolean not null default false;
alter table organizations add column if not exists validade_dias integer not null default 15;
alter table organizations add column if not exists logo_url text;           -- data URI ou URL pública da logomarca

-- ---------- stores (lojas / operações — dados fiscais próprios) ----------
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
alter table stores add column if not exists logo_url text;                  -- logo própria da loja (opcional)

-- Observação sobre logomarca:
--   A logomarca é gravada como data URI (base64) na coluna logo_url — mesma abordagem da V6
--   (funciona sem bucket de Storage). Se preferir Storage do Supabase, crie um bucket público
--   'logos' e grave a URL pública em logo_url; o app aceita ambos (data URI ou URL http).
