-- ============================================================
-- Migration 0015 — fn_concluir_producao DEFINITIVA e IDEMPOTENTE (paridade V6)
--
-- Corrige dois problemas apontados na homologação:
--  (B2) Idempotência: chamar a função de novo NÃO pode regredir uma venda que já
--       passou de PRONTO_EXECUCAO (ex.: já em EXECUCAO/FINALIZADA).
--  (B3) Ordem de migrations: esta é a versão canônica e de MAIOR número — sempre
--       vence a 0004/0012. Convenção adotada: a definição autoritativa de uma função
--       vive SEMPRE na migration de maior número; migrations antigas não são reeditadas.
--
-- Regras preservadas: só conclui com todas as etapas aplicáveis CONCLUIDAS e todas as
-- terceirizações recebidas E conferidas. create or replace (idempotente). NÃO destrutiva.
-- NÃO executar em produção. Rodar após 0004..0014.
-- ============================================================
create or replace function fn_concluir_producao(p_order_id uuid)
returns jsonb language plpgsql security invoker as $$
declare v_org uuid; v_sale uuid; v_ostatus text; v_sit text; v_pend int; v_terc int;
begin
  select organization_id, sale_id, status into v_org, v_sale, v_ostatus
    from production_orders where id = p_order_id for update;
  if v_org is null then raise exception 'OP não encontrada'; end if;

  -- IDEMPOTÊNCIA: OP já concluída → sucesso sem alterar nada.
  if v_ostatus = 'CONCLUIDA' then
    return jsonb_build_object('ok', true, 'order_id', p_order_id, 'already', true);
  end if;

  -- Travas obrigatórias.
  select count(*) into v_pend from production_stages
    where order_id = p_order_id and aplicavel = true and status <> 'CONCLUIDA';
  if v_pend > 0 then raise exception 'Existem etapas pendentes ou em andamento (%).', v_pend; end if;
  select count(*) into v_terc from production_outsourcing
    where order_id = p_order_id and (recebido = false or conferido = false);
  if v_terc > 0 then raise exception 'Existem terceirizações não recebidas/conferidas (%).', v_terc; end if;

  update production_orders set status = 'CONCLUIDA', concluida_at = now() where id = p_order_id;
  insert into production_status_history(organization_id, order_id, escopo, alvo, de, para, user_id)
    values (v_org, p_order_id, 'ordem', 'status', 'EM_PRODUCAO', 'CONCLUIDA', auth.uid());

  -- Libera a venda para a fila "Pronto para execução" APENAS se ainda não avançou.
  -- Nunca regride EXECUCAO/FINALIZADA (idempotência do lado da venda).
  select situacao into v_sit from sales where id = v_sale;
  if v_sit in ('VENDA_CONFIRMADA', 'PRODUCAO') then
    update sales set status = 'PRONTO_EXECUCAO', situacao = 'PRONTO_EXECUCAO', updated_at = now() where id = v_sale;
  end if;

  return jsonb_build_object('ok', true, 'order_id', p_order_id);
end $$;
