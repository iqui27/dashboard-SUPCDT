# Context — Phase 02: Monitoring Model & Operational Readiness

## Por que esta fase existe
Após a phase 01, o produto já tem identidade própria, autenticação obrigatória e contrato de dados coerente com o Mongo real. O problema agora não é mais visual: é profundidade operacional.

Hoje o dashboard consegue mostrar:
- status cadastral do projeto
- metas e progresso físico
- território declarado
- responsável informado
- valor total

Ainda não consegue mostrar com consistência:
- risco real
- saúde operacional
- incidentes abertos
- manutenção
- evidências de campo
- próximos passos
- cobertura detalhada preparada para o Wi-Fi Social

## Estado atual da base
- Banco observado: `dashboard_supcdt`
- Collection principal: `projetos_supcdt`
- Collection de lançamentos operacionais ainda não existe com dados reais (`lancamentos_supcdt` segue vazia na prática)
- Os projetos de planejamento ainda carregam valores genéricos como `Em Planejamento`, `TBD` e territórios amplos

## Decisão de modelagem
Em vez de criar uma segunda entidade paralela agora, o monitoramento operacional será introduzido no próprio documento de projeto, em um objeto `monitoramento`, para:
- acelerar adoção
- manter um único fluxo de edição
- permitir que o Wi-Fi Social nasça depois como vertical especializada, sem reabrir a fundação

## Campos operacionais necessários
- `statusOperacional`
- `nivelRisco`
- `saudeEntrega`
- `precisaAcao`
- `incidentesAbertos`
- `manutencaoStatus`
- `resumoExecutivo`
- `bloqueios`
- `proximosPassos`
- `evidencias`
- `coberturaDetalhada`
- `responsavelOperacional`
- `ultimaAtualizacao`

## Resultado esperado ao fim da fase
- Projeto passa a ter leitura executiva e operacional
- Dashboard passa a contar projetos sob risco e incidentes
- Detalhe do projeto deixa de ser apenas cadastro e vira painel de acompanhamento
- Wi-Fi Social fica com modelo-base pronto para receber pontos, cobertura e status de rede
