-- ============================================================
-- Migration 0012 — Etapa "Pronto para execução" no ciclo (paridade V6)
-- Fluxo V6: Produção → Pronto para execução → Em execução → Finalizada.
-- Ao concluir a produção, a venda é LIBERADA como PRONTO_EXECUCAO (fila),
-- e passa a EXECUCAO quando a equipe inicia (avanço comercial manual).
-- create or replace (idempotente). NÃO destrutiva. NÃO executar em produção.
-- Rodar após 0004..0011.
-- ============================================================
create or replace function fn_concluir_producao(p_order_id uuid)
returns jsonb language plpgsql security invoker as $$
declare v_org uuid; v_pend int; v_terc int;
begin
  select organization_id into v_org from production_orders where id = p_order_id for update;
  if v_org is null then raise exception 'OP não encontrada'; end if;
  select count(*) into v_pend from production_stages where order_id = p_order_id and aplicavel = true and status <> 'CONCLUIDA';
  if v_pend > 0 then raise exception 'Existem etapas pendentes ou em andamento (%).', v_pend; end if;
  select count(*) into v_terc from production_outsourcing where order_id = p_order_id and (recebido = false or conferido = false);
  if v_terc > 0 then raise exception 'Existem terceirizações não recebidas/conferidas (%).', v_terc; end if;

  update production_orders set status = 'CONCLUIDA', concluida_at = now() where id = p_order_id;
  insert into production_status_history(organization_id, order_id, escopo, alvo, de, para, user_id)
    values (v_org, p_order_id, 'ordem', 'status', 'EM_PRODUCAO', 'CONCLUIDA', auth.uid());
  -- Libera para execução: entra na fila "Pronto para execução" (não inicia execução automaticamente).
  update sales s set status = 'PRONTO_EXECUCAO', situacao = 'PRONTO_EXECUCAO', updated_at = now()
    from production_orders o where o.id = p_order_id and s.id = o.sale_id;
  return jsonb_build_object('ok', true, 'order_id', p_order_id);
end $$;
