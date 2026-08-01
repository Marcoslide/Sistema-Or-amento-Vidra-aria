-- ============================================================
-- Migration 0001 — Comercial (App 3)
-- Complementa `sales` + histórico de status + RPC transacional/idempotente.
-- Rodar após schema.sql/rls.sql/seed.sql. Idempotente (IF NOT EXISTS / OR REPLACE).
-- ============================================================

alter table sales add column if not exists situacao text default 'ORCAMENTO';   -- status comercial configurável
alter table sales add column if not exists obs text;
alter table sales add column if not exists obs_interna text;
alter table sales add column if not exists prazo_dias integer;
alter table sales add column if not exists condicao jsonb;                        -- condição comercial
alter table sales add column if not exists entrada_prevista numeric(14,2) default 0;
alter table sales add column if not exists custo_prev numeric(14,2) default 0;
alter table sales add column if not exists margem_prev numeric(14,2) default 0;

-- histórico de status/situação
create table if not exists sale_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sale_id uuid not null references sales(id) on delete cascade,
  campo text not null,               -- 'status' (ciclo) ou 'situacao' (comercial)
  de text, para text,
  user_id uuid, usuario text, obs text,
  created_at timestamptz not null default now()
);
alter table sale_status_history enable row level security;
drop policy if exists ssh_org on sale_status_history;
create policy ssh_org on sale_status_history
  using (organization_id = app_org_id())
  with check (organization_id = app_org_id());

-- numeração por loja (sequência simples via max+1 dentro da RPC de criação; aqui só índice)
create index if not exists idx_sales_numero on sales(organization_id, store_id, numero);

-- ============================================================
-- RPC: transformar orçamento em venda — TRANSACIONAL e IDEMPOTENTE.
--  - venda_gerada já true  -> no-op (não duplica por clique duplo);
--  - idempotency key repetida -> no-op;
--  - gera parcelas (receivables) do saldo, entrada (receivable_payment) e UM cash_movement;
--  - saldo nunca negativo; entrada limitada ao total.
-- SECURITY INVOKER: roda sob RLS do usuário (isolamento preservado).
-- ============================================================
create or replace function fn_transformar_venda(
  p_sale_id uuid,
  p_idem text,
  p_entrada numeric default 0,
  p_forma text default null,
  p_conta text default null,
  p_operadora text default null,
  p_parcelas integer default 1,
  p_venc_primeira date default null
) returns jsonb
language plpgsql security invoker as $$
declare
  v_sale sales%rowtype;
  v_total numeric(14,2);
  v_entrada numeric(14,2);
  v_saldo numeric(14,2);
  v_parc int;
  v_valor_parc numeric(14,2);
  i int;
  v_venc date;
begin
  select * into v_sale from sales where id = p_sale_id for update;
  if not found then raise exception 'Venda não encontrada'; end if;

  -- idempotência: recebimento com a mesma chave já existe -> no-op
  if p_idem is not null and exists (select 1 from receivable_payments where idempotency_key = p_idem) then
    return jsonb_build_object('ok', true, 'idempotent', true, 'sale_id', p_sale_id);
  end if;

  -- já é venda -> não duplica
  if v_sale.venda_gerada then
    return jsonb_build_object('ok', true, 'already', true, 'sale_id', p_sale_id);
  end if;

  v_total := coalesce(v_sale.total, 0);
  v_entrada := greatest(0, least(coalesce(p_entrada, 0), v_total)); -- entrada nunca > total, nunca < 0
  v_saldo := round(v_total - v_entrada, 2);
  v_parc := greatest(1, coalesce(p_parcelas, 1));
  v_venc := coalesce(p_venc_primeira, current_date);

  update sales set venda_gerada = true, status = 'VENDA_CONFIRMADA', situacao = 'VENDA_CONFIRMADA',
    entrada_prevista = v_entrada, updated_at = now() where id = p_sale_id;

  insert into sale_status_history(organization_id, sale_id, campo, de, para, user_id, obs)
    values (v_sale.organization_id, p_sale_id, 'status', v_sale.status, 'VENDA_CONFIRMADA', auth.uid(), 'Transformação em venda');

  -- parcelas previstas do saldo
  if v_saldo > 0 then
    v_valor_parc := round(v_saldo / v_parc, 2);
    for i in 1..v_parc loop
      insert into receivables(organization_id, store_id, sale_id, descricao, valor, vencimento, status)
        values (v_sale.organization_id, v_sale.store_id, p_sale_id,
          'Parcela ' || i || '/' || v_parc,
          case when i < v_parc then v_valor_parc else round(v_saldo - v_valor_parc * (v_parc - 1), 2) end,
          v_venc + ((i - 1) || ' month')::interval, 'ABERTO');
    end loop;
  end if;

  -- entrada: recebimento (idempotente) + UM único movimento de caixa
  if v_entrada > 0 then
    insert into receivable_payments(organization_id, store_id, sale_id, valor, forma, conta, operadora, idempotency_key, created_by)
      values (v_sale.organization_id, v_sale.store_id, p_sale_id, v_entrada, p_forma, p_conta, p_operadora, p_idem, auth.uid());
    insert into cash_movements(organization_id, store_id, tipo, valor, descricao, forma, origem_tipo, origem_id, created_by)
      values (v_sale.organization_id, v_sale.store_id, 'entrada', v_entrada, 'Entrada da venda', p_forma, 'venda', p_sale_id, auth.uid());
  end if;

  return jsonb_build_object('ok', true, 'sale_id', p_sale_id, 'entrada', v_entrada, 'saldo', v_saldo, 'parcelas', v_parc);
end $$;
