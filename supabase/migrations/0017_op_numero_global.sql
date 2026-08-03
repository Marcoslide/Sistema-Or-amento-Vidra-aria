-- ============================================================
-- Migration 0017 — Número de OP inequívoco (global por organização)
--
-- Problema: a numeração era por LOJA (max+1 dentro da loja), então duas lojas
-- geravam a mesma OP "#1001". Passa a ser GLOBAL por ORGANIZAÇÃO → número próprio único.
-- Esta é a versão canônica (maior número) de fn_iniciar_producao; vence a 0004.
-- Mantém a idempotência (1 OP por venda). create or replace, aditiva, NÃO destrutiva.
-- OPs já existentes conservam o número; a unicidade vale para as novas.
-- NÃO executar em produção. Rodar após 0004..0016.
-- ============================================================
create or replace function fn_iniciar_producao(p_sale_id uuid, p_etapas text[] default null)
returns jsonb language plpgsql security invoker as $$
declare
  v_sale sales%rowtype; v_order_id uuid; v_num bigint; i int;
  v_etapas text[] := coalesce(p_etapas, array['separacao','corte','lapidacao','tempera','laminacao','furacao','pintura','esquadria','montagem','conferencia','embalagem','expedicao']);
  r record;
begin
  select * into v_sale from sales where id = p_sale_id for update;
  if not found then raise exception 'Venda não encontrada'; end if;
  select id into v_order_id from production_orders where sale_id = p_sale_id;
  if v_order_id is not null then
    return jsonb_build_object('ok', true, 'already', true, 'order_id', v_order_id);
  end if;
  if not v_sale.venda_gerada then raise exception 'Só é possível produzir venda confirmada'; end if;

  -- Número GLOBAL por organização (inequívoco entre lojas).
  select coalesce(max(numero),1000)+1 into v_num from production_orders where organization_id = v_sale.organization_id;
  insert into production_orders(organization_id, store_id, numero, sale_id, cliente_nome, status, origem, created_by)
    values (v_sale.organization_id, v_sale.store_id, v_num, p_sale_id, v_sale.cliente_nome, 'EM_PRODUCAO', 'venda', auth.uid())
    returning id into v_order_id;

  for i in 1 .. array_length(v_etapas,1) loop
    insert into production_stages(organization_id, order_id, nome, ordem) values (v_sale.organization_id, v_order_id, v_etapas[i], i);
  end loop;

  for r in
    select it.product_id, it.regra, m.l, m.a, m.q, m.unit
    from sale_items it join sale_environments e on e.id = it.environment_id
    left join lateral (select l, a, q, unit from sale_measures where item_id = it.id limit 1) m on true
    where e.sale_id = p_sale_id
  loop
    insert into production_order_items(organization_id, order_id, product_id, regra, largura, altura, unidade, quantidade)
      values (v_sale.organization_id, v_order_id, r.product_id, r.regra, r.l, r.a, coalesce(r.unit,'cm'), coalesce(r.q,1));
  end loop;

  update sales set status = 'PRODUCAO', situacao = 'PRODUCAO', updated_at = now() where id = p_sale_id;
  insert into production_status_history(organization_id, order_id, escopo, alvo, de, para, user_id)
    values (v_sale.organization_id, v_order_id, 'ordem', 'status', 'AGUARDANDO', 'EM_PRODUCAO', auth.uid());
  return jsonb_build_object('ok', true, 'order_id', v_order_id, 'numero', v_num);
end $$;
