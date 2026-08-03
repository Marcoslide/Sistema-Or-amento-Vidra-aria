-- ============================================================
-- Migration 0014 — Backfill de custo/hora (hora-homem / hora-máquina)
-- Recalcula custo_hora dos registros antigos que estavam 0/null, usando a MESMA
-- fórmula do app (src/lib/custos/calc.ts). NÃO sobrescreve custo_hora manual > 0.
-- Só recalcula quando há dados suficientes (horas efetivas > 0). Idempotente.
-- NÃO destrutiva. NÃO executar em produção.
-- ============================================================

-- Hora-Homem
update labor_costs set custo_hora = round(
  ( coalesce(salario,0) + coalesce(encargos,0) + coalesce(beneficios,0)
    + case when tipo_adicional = 'percentual' then coalesce(salario,0) * coalesce(adicionais,0) / 100
           else coalesce(adicionais,0) end
  ) / nullif(
    case when coalesce(horas_produtivas,0) > 0 then horas_produtivas
         else coalesce(horas_contratadas,0) * coalesce(produtividade,0) / 100 end, 0)
, 4)
where (custo_hora is null or custo_hora = 0)
  and ( case when coalesce(horas_produtivas,0) > 0 then horas_produtivas
             else coalesce(horas_contratadas,0) * coalesce(produtividade,0) / 100 end ) > 0;

-- Hora-Máquina
update machine_costs set custo_hora = round(
  ( case when coalesce(depreciacao_mes,0) > 0 then depreciacao_mes
         else case when coalesce(vida_util_meses,0) > 0
                   then greatest(0, coalesce(aquisicao,0) - coalesce(valor_residual,0)) / vida_util_meses
                   else 0 end end
    + coalesce(energia,0) + coalesce(manutencao,0) + coalesce(seguro,0) + coalesce(consumiveis,0) + coalesce(operador,0)
  ) / nullif(
    case when coalesce(horas_produtivas,0) > 0 then horas_produtivas else coalesce(horas_disponiveis,0) end, 0)
, 4)
where (custo_hora is null or custo_hora = 0)
  and ( case when coalesce(horas_produtivas,0) > 0 then horas_produtivas else coalesce(horas_disponiveis,0) end ) > 0;

-- Registros sem horas suficientes permanecem com custo_hora 0 (dados faltantes) — a tela
-- indica isso ao exibir R$ 0,00; complete horas produtivas/contratadas para recalcular.
