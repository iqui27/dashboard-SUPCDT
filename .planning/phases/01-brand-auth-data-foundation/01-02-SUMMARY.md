# 01-02 Summary — Data Contract & Real Monitoring

## Entregue
- Contrato canônico de `Projeto` alinhado ao schema real do Mongo (`nome`, `nomeOSC`, `status`, `responsavelSECTI`, `raPerigao`, `descricao`, `objetivos`, `metas`, `cronograma`).
- Backend normalizando leitura e escrita de projetos num único shape.
- Introdução de `numeroUnico` e `chaveIntegracao` para permitir vínculo entre dashboards sem depender apenas do `_id`.
- Listagem, dashboard, detalhe, relatórios, wizard e modais principais adaptados ao contrato real.
- Placeholders críticos removidos da interface pública e substituídos por estados honestos.
- Lacunas de monitoramento explicitadas para a fase seguinte: riscos, evidências, saúde operacional, incidentes, manutenção e cobertura geográfica detalhada.

## Verificação
- `npm run lint`
- `npm run build`

## Observações
- Quando `numeroUnico` ainda não existe, a `chaveIntegracao` usa fallback determinístico sem colidir entre projetos em planejamento.
- O PDF institucional foi mantido indisponível de forma explícita até que a base suporte anexos/evidências e template homologado.
