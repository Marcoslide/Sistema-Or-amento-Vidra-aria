-- ============================================================
-- Migration 0003 — FINANCEIRO (App 4)
-- Contas a Receber / Caixa / Contas a Pagar (RPCs transacionais e idempotentes) +
-- Centro de Custos, Hora-Homem, Hora-Máquina, Depreciação, custos extras por venda.
-- Rodar após 0001/0002. Idempotente. NÃO executar em produção.
-- Dinheiro sempre numeric (nunca float). store_id obrigatório (sem fallback L1).
-- ============================================================

-- ---------- Colunas auxiliares em receivables/payables ----------
alter table receivables add column if not exists forma text;                 -- forma prevista
alter table receivables add column if not exists numero_parcela int;
alter table receivables add column if not exists total_parcelas int;
alter table payables    add column if not exists centro_custo_id uuid;
alter table payables    add column if not exists parcela int;
alter table payables    add column if not exists total_parcelas int;

-- ---------- Centro de Custos ----------
create table if not exists cost_centers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id) on delete set null,
  nome text not null, tipo text default 'fixo',          -- fixo | variavel | administrativo | ...
  valor numeric(14,2) default 0, percentual numeric(6,2) default 0,
  base_valor boolean default true,                        -- true=valor fixo, false=percentual
  periodicidade text default 'mensal',
  participa_rateio boolean default true,
  criterio_rateio text default 'faturamento',             -- faturamento|quantidade|horas|m2|ml|personalizado
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Hora-Homem ----------
create table if not exists labor_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id) on delete set null,
  nome text not null, salario numeric(14,2) default 0, encargos numeric(14,2) default 0,
  beneficios numeric(14,2) default 0, adicionais numeric(14,2) default 0,
  tipo_adicional text default 'valor',                    -- valor | percentual
  horas_contratadas numeric(10,2) default 220, horas_produtivas numeric(10,2) default 176,
  produtividade numeric(6,2) default 80, custo_hora numeric(14,4) default 0,
  centro_custo_id uuid references cost_centers(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Hora-Máquina ----------
create table if not exists machine_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id) on delete set null,
  nome text not null, aquisicao numeric(14,2) default 0, vida_util_meses int default 120,
  valor_residual numeric(14,2) default 0, depreciacao_mes numeric(14,2) default 0,
  energia numeric(14,2) default 0, manutencao numeric(14,2) default 0, seguro numeric(14,2) default 0,
  consumiveis numeric(14,2) default 0, operador numeric(14,2) default 0,
  horas_disponiveis numeric(10,2) default 176, horas_produtivas numeric(10,2) default 140,
  custo_hora numeric(14,4) default 0, tipo text default 'valor',
  centro_custo_id uuid references cost_centers(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Depreciação (bens) ----------
create table if not exists depreciation_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id) on delete set null,
  nome text not null, custo_original numeric(14,2) default 0, data_compra date,
  vida_util_meses int default 60, valor_residual numeric(14,2) default 0,
  deprec_acumulada numeric(14,2) default 0, valor_contabil numeric(14,2) default 0,
  status text default 'ativo', baixado boolean default false, data_baixa date,
  ganho_perda_baixa numeric(14,2) default 0,
  centro_custo_id uuid references cost_centers(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Custos extras por venda (análise financeira) ----------
create table if not exists sale_extra_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sale_id uuid not null references sales(id) on delete cascade,
  store_id uuid references stores(id),
  descricao text not null, categoria text,               -- produto|reclamacao|assistencia|rateio|outro
  valor numeric(14,2) not null default 0, data date default current_date,
  fornecedor text, centro_custo_id uuid references cost_centers(id) on delete set null,
  participa_margem boolean not null default true, obs text,
  created_by uuid, created_at timestamptz not null default now()
);
create index if not exists idx_sec_sale on sale_extra_costs(sale_id);

-- ---------- Permissões novas ----------
insert into permissions(key,descricao) values
 ('fin.centro_custos','Centro de custos'),('fin.ponto_equilibrio','Ponto de equilíbrio'),
 ('fin.custos_venda','Custos por venda')
on conflict (key) do nothing;

-- ---------- RLS das novas tabelas (org + loja quando aplicável) ----------
do $$ declare t text; begin
  foreach t in array array['cost_centers','labor_costs','machine_costs','depreciation_assets','sale_extra_costs']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I on %I;', t||'_org', t);
    execute format($f$create policy %I on %I
       using (organization_id = app_org_id())
       with check (organization_id = app_org_id());$f$, t||'_org', t);
  end loop;
end $$;

-- ============================================================
-- RPC: registrar recebimento de uma parcela (receivable)
--  - idempotente (idempotency_key);
--  - NÃO permite receber acima do saldo; saldo nunca negativo;
--  - gera UM único cash_movement (entrada) na loja da parcela;
--  - atualiza status da parcela (ABERTO/PARCIAL/RECEBIDO).
-- ============================================================
create or replace function fn_receber_parcela(
  p_receivable_id uuid, p_valor numeric, p_idem text,
  p_forma text default null, p_conta text default null, p_operadora text default null
) returns jsonb language plpgsql security invoker as $$
declare
  r receivables%rowtype; v_pago numeric(14,2); v_saldo numeric(14,2); v_val numeric(14,2); v_novo numeric(14,2);
begin
  if p_idem is not null and exists (select 1 from receivable_payments where idempotency_key = p_idem) then
    return jsonb_build_object('ok', true, 'idempotent', true);
  end if;
  select * into r from receivables where id = p_receivable_id for update;
  if not found then raise exception 'Parcela não encontrada'; end if;
  select coalesce(sum(valor),0) into v_pago from receivable_payments where receivable_id = p_receivable_id and estornado = false;
  v_saldo := round(r.valor - v_pago, 2);
  v_val := round(coalesce(p_valor,0), 2);
  if v_val <= 0 then raise exception 'Valor de recebimento inválido'; end if;
  if v_val > v_saldo then raise exception 'Recebimento (%) acima do saldo da parcela (%)', v_val, v_saldo; end if;

  insert into receivable_payments(receivable_id, sale_id, organization_id, store_id, valor, forma, conta, operadora, idempotency_key, created_by)
    values (r.id, r.sale_id, r.organization_id, r.store_id, v_val, p_forma, p_conta, p_operadora, p_idem, auth.uid());
  insert into cash_movements(organization_id, store_id, tipo, valor, descricao, forma, origem_tipo, origem_id, created_by)
    values (r.organization_id, r.store_id, 'entrada', v_val, coalesce(r.descricao,'Recebimento'), p_forma, 'recebimento', r.id, auth.uid());

  v_novo := round(v_pago + v_val, 2);
  update receivables set status = case when v_novo >= r.valor then 'RECEBIDO' when v_novo > 0 then 'PARCIAL' else 'ABERTO' end
    where id = r.id;
  return jsonb_build_object('ok', true, 'recebido', v_novo, 'saldo', round(r.valor - v_novo, 2));
end $$;

-- ============================================================
-- RPC: estornar um recebimento — gera movimento inverso (saída) e reabre a parcela.
-- Idempotente: recebimento já estornado -> no-op.
-- ============================================================
create or replace function fn_estornar_recebimento(p_payment_id uuid)
returns jsonb language plpgsql security invoker as $$
declare p receivable_payments%rowtype; r receivables%rowtype; v_pago numeric(14,2);
begin
  select * into p from receivable_payments where id = p_payment_id for update;
  if not found then raise exception 'Recebimento não encontrado'; end if;
  if p.estornado then return jsonb_build_object('ok', true, 'idempotent', true); end if;
  update receivable_payments set estornado = true where id = p.id;
  insert into cash_movements(organization_id, store_id, tipo, valor, descricao, forma, origem_tipo, origem_id, created_by)
    values (p.organization_id, p.store_id, 'saida', p.valor, 'Estorno de recebimento', p.forma, 'estorno_receb', p.id, auth.uid());
  if p.receivable_id is not null then
    select * into r from receivables where id = p.receivable_id;
    select coalesce(sum(valor),0) into v_pago from receivable_payments where receivable_id = p.receivable_id and estornado = false;
    update receivables set status = case when v_pago >= r.valor then 'RECEBIDO' when v_pago > 0 then 'PARCIAL' else 'ABERTO' end
      where id = p.receivable_id;
  end if;
  return jsonb_build_object('ok', true, 'estornado', p.valor);
end $$;

-- ============================================================
-- RPC: pagar (total/parcial) uma conta a pagar — UM cash_movement (saída), idempotente,
-- nunca acima do saldo.
-- ============================================================
create or replace function fn_pagar_conta(
  p_payable_id uuid, p_valor numeric, p_idem text, p_forma text default null, p_conta_fin text default null
) returns jsonb language plpgsql security invoker as $$
declare pb payables%rowtype; v_pago numeric(14,2); v_saldo numeric(14,2); v_val numeric(14,2);
begin
  if p_idem is not null and exists (select 1 from payable_payments where idempotency_key = p_idem) then
    return jsonb_build_object('ok', true, 'idempotent', true);
  end if;
  select * into pb from payables where id = p_payable_id for update;
  if not found then raise exception 'Conta a pagar não encontrada'; end if;
  if pb.cancelada then raise exception 'Conta cancelada não pode ser paga'; end if;
  select coalesce(sum(valor),0) into v_pago from payable_payments where payable_id = p_payable_id and estornado = false;
  v_saldo := round(pb.valor - v_pago, 2);
  v_val := round(coalesce(p_valor,0), 2);
  if v_val <= 0 then raise exception 'Valor de pagamento inválido'; end if;
  if v_val > v_saldo then raise exception 'Pagamento (%) acima do saldo (%)', v_val, v_saldo; end if;

  insert into payable_payments(payable_id, organization_id, store_id, valor, forma, conta_fin, idempotency_key, created_by)
    values (pb.id, pb.organization_id, pb.store_id, v_val, p_forma, p_conta_fin, p_idem, auth.uid());
  insert into cash_movements(organization_id, store_id, tipo, valor, descricao, forma, origem_tipo, origem_id, created_by)
    values (pb.organization_id, pb.store_id, 'saida', v_val, coalesce(pb.descricao,'Pagamento'), p_forma, 'pagamento', pb.id, auth.uid());
  return jsonb_build_object('ok', true, 'pago', round(v_pago + v_val,2), 'saldo', round(pb.valor - v_pago - v_val,2));
end $$;

-- ============================================================
-- RPC: estornar pagamento — movimento inverso (entrada). Idempotente.
-- ============================================================
create or replace function fn_estornar_pagamento(p_payment_id uuid)
returns jsonb language plpgsql security invoker as $$
declare p payable_payments%rowtype;
begin
  select * into p from payable_payments where id = p_payment_id for update;
  if not found then raise exception 'Pagamento não encontrado'; end if;
  if p.estornado then return jsonb_build_object('ok', true, 'idempotent', true); end if;
  update payable_payments set estornado = true where id = p.id;
  insert into cash_movements(organization_id, store_id, tipo, valor, descricao, forma, origem_tipo, origem_id, created_by)
    values (p.organization_id, p.store_id, 'entrada', p.valor, 'Estorno de pagamento', p.forma, 'estorno_pgto', p.id, auth.uid());
  return jsonb_build_object('ok', true, 'estornado', p.valor);
end $$;
