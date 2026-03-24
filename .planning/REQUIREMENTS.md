# Requirements: Dashboard SUPCDT — Módulos de Monitoramento

**Definido:** 2026-03-24
**Core Value:** Cada projeto pode ser monitorado com o nível de detalhe que seu contrato exige — sem configuração técnica

## v1 Requirements

### Modelo de Dados

- [ ] **DATA-01**: Sistema suporta tipo `Etapa` com id, nome, percentual (0-100) e lista de entregáveis
- [ ] **DATA-02**: Sistema suporta tipo `Entregavel` com id, nome e flag `concluido`
- [ ] **DATA-03**: Sistema suporta tipo `RubricaOrcamentaria` com nome, previsto, executado e lista de aditivos
- [ ] **DATA-04**: Sistema suporta tipo `AditivoRubrica` com descrição, valor e data
- [ ] **DATA-05**: Sistema suporta tipo `Parceiro` com nome, papel e status (Ativo/Apoiador/Consultor/Inativo)
- [ ] **DATA-06**: Sistema suporta tipo `Risco` com descrição, probabilidade, impacto, mitigação e status
- [ ] **DATA-07**: Sistema suporta tipo `DecisaoGovernanca` com título, data, descrição e responsável
- [ ] **DATA-08**: Sistema suporta tipo `IndicadorPesquisa` com nome, categoria e série `{label, valor}[]`
- [ ] **DATA-09**: Tipo `Projeto` inclui campo `modulosAtivos` com flags boolean para cada módulo
- [ ] **DATA-10**: Projetos existentes sem `modulosAtivos` continuam funcionando (retrocompatibilidade)

### API — Etapas

- [ ] **ETAP-01**: Gestor pode criar etapa via `POST /api/projects/:id/etapas` (requer auth)
- [ ] **ETAP-02**: Gestor pode atualizar percentual e nome via `PUT /api/projects/:id/etapas/:etapaId`
- [ ] **ETAP-03**: Gestor pode excluir etapa via `DELETE /api/projects/:id/etapas/:etapaId`
- [ ] **ETAP-04**: Gestor pode marcar entregável como concluído via `PATCH /api/projects/:id/etapas/:etapaId/entregaveis/:entId`
- [ ] **ETAP-05**: Gestor pode adicionar/remover entregáveis de uma etapa

### API — Orçamento

- [ ] **ORÇA-01**: Gestor pode criar rubrica via `POST /api/projects/:id/rubricas`
- [ ] **ORÇA-02**: Gestor pode atualizar previsto/executado por rubrica via `PUT /api/projects/:id/rubricas/:rubricaId`
- [ ] **ORÇA-03**: Gestor pode adicionar aditivo a uma rubrica
- [ ] **ORÇA-04**: Gestor pode excluir rubrica

### API — Parceiros

- [ ] **PARC-01**: Gestor pode criar parceiro via `POST /api/projects/:id/parceiros`
- [ ] **PARC-02**: Gestor pode atualizar parceiro (nome, papel, status)
- [ ] **PARC-03**: Gestor pode excluir parceiro

### API — Riscos

- [ ] **RISC-01**: Gestor pode criar risco via `POST /api/projects/:id/riscos`
- [ ] **RISC-02**: Gestor pode atualizar risco (probabilidade, impacto, mitigação, status)
- [ ] **RISC-03**: Gestor pode fechar/reabrir risco via status

### API — Governança

- [ ] **GOVN-01**: Gestor pode criar decisão via `POST /api/projects/:id/decisoes`
- [ ] **GOVN-02**: Gestor pode editar e excluir decisão

### API — Indicadores

- [ ] **INDC-01**: Gestor pode criar indicador com nome, categoria e dados iniciais
- [ ] **INDC-02**: Gestor pode editar dados do indicador (adicionar/remover séries)
- [ ] **INDC-03**: Gestor pode excluir indicador

### API — Configuração de Módulos

- [ ] **MODU-01**: Gestor pode ativar/desativar módulos via `PATCH /api/projects/:id/modulos`

### UI — Wizard (Passo 5)

- [ ] **WIZD-01**: CriacaoProjetoWizard exibe passo "5. Módulos" com toggles para cada módulo
- [ ] **WIZD-02**: Cada toggle exibe nome e descrição de uma linha do módulo
- [ ] **WIZD-03**: Estado dos módulos é salvo junto com o projeto na criação

### UI — DetalheProjeto: Etapas

- [ ] **UIET-01**: Seção "Etapas" aparece no DetalheProjeto quando módulo ativo
- [ ] **UIET-02**: Cada etapa exibe nome, barra de progresso e % editável inline (click-to-edit)
- [ ] **UIET-03**: Entregáveis exibidos como checklist abaixo de cada etapa
- [ ] **UIET-04**: Botão "Nova etapa" abre modal compacto com nome + percentual inicial
- [ ] **UIET-05**: Botão "Adicionar entregável" inline em cada etapa

### UI — DetalheProjeto: Orçamento

- [ ] **UIOB-01**: Seção "Orçamento" exibe total previsto, total executado e saldo em header compacto
- [ ] **UIOB-02**: Lista divide-y com uma linha por rubrica: nome | barra proporcional | previsto | executado | saldo
- [ ] **UIOB-03**: Variação percentual exibida com cor (verde ≤100%, vermelho >100%)
- [ ] **UIOB-04**: Aditivos exibidos como sublista colapsável por rubrica
- [ ] **UIOB-05**: Botão "Nova rubrica" e "Adicionar aditivo" acessíveis inline

### UI — DetalheProjeto: Parceiros

- [ ] **UIPA-01**: Seção "Parceiros" exibe lista divide-y com nome, papel e badge de status
- [ ] **UIPA-02**: Botão "Adicionar parceiro" abre modal compacto
- [ ] **UIPA-03**: Inline edit de status por parceiro (click no badge)

### UI — DetalheProjeto: Riscos

- [ ] **UIRC-01**: Seção "Riscos" exibe lista com indicador visual de severidade (cor por probabilidade × impacto)
- [ ] **UIRC-02**: Riscos encerrados aparecem separados (opacidade reduzida)
- [ ] **UIRC-03**: Botão "Novo risco" e modal de edição

### UI — DetalheProjeto: Governança

- [ ] **UIGN-01**: Seção "Decisões" exibe lista cronológica com data, título e responsável
- [ ] **UIGN-02**: Botão "Nova decisão" abre modal compacto

### UI — DetalheProjeto: Indicadores de Pesquisa

- [ ] **UIIN-01**: Seção "Indicadores" exibe cada indicador com nome, categoria e barras horizontais por série
- [ ] **UIIN-02**: Botão "Novo indicador" abre modal com campos nome, categoria e editor de série

### UI — Configuração de Módulos

- [ ] **UIMD-01**: Ícone de engrenagem no header do DetalheProjeto abre painel de módulos
- [ ] **UIMD-02**: Painel exibe toggles para ativar/desativar módulos após criação
- [ ] **UIMD-03**: Módulos desativados ocultam suas seções sem deletar os dados

## v2 Requirements

### Exportação e Relatórios

- **EXP-01**: Exportar seção de etapas em PDF institucional
- **EXP-02**: Exportar orçamento por rubrica em CSV
- **EXP-03**: Relatório consolidado de riscos

### Histórico e Auditoria

- **HIST-01**: Histórico de alterações de % de etapa com data e autor
- **HIST-02**: Histórico de mudanças de status de risco

### Visualizações Avançadas

- **VIZ-01**: Gráfico de Gantt das etapas
- **VIZ-02**: Dashboard comparativo de orçamento entre projetos
- **VIZ-03**: Mapa de calor de riscos (matriz probabilidade × impacto)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Coleções MongoDB separadas por módulo | Complexidade desnecessária; dados embutidos são suficientes |
| Permissões granulares por módulo | Controle de acesso é por projeto; granularidade por campo é v3+ |
| Notificações de prazo de etapa | Requer scheduler; fora do escopo desta iteração |
| Integração com Google Sheets por módulo | Módulos são dados nativos; Sheets é para projetos legados |
| App mobile | Web-first; mobile é milestone separado |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 5 | Pending |
| DATA-02 | Phase 5 | Pending |
| DATA-03 | Phase 5 | Pending |
| DATA-04 | Phase 5 | Pending |
| DATA-05 | Phase 5 | Pending |
| DATA-06 | Phase 5 | Pending |
| DATA-07 | Phase 5 | Pending |
| DATA-08 | Phase 5 | Pending |
| DATA-09 | Phase 5 | Pending |
| DATA-10 | Phase 5 | Pending |
| ETAP-01 | Phase 6 | Pending |
| ETAP-02 | Phase 6 | Pending |
| ETAP-03 | Phase 6 | Pending |
| ETAP-04 | Phase 6 | Pending |
| ETAP-05 | Phase 6 | Pending |
| ORÇA-01 | Phase 6 | Pending |
| ORÇA-02 | Phase 6 | Pending |
| ORÇA-03 | Phase 6 | Pending |
| ORÇA-04 | Phase 6 | Pending |
| PARC-01 | Phase 6 | Pending |
| PARC-02 | Phase 6 | Pending |
| PARC-03 | Phase 6 | Pending |
| RISC-01 | Phase 6 | Pending |
| RISC-02 | Phase 6 | Pending |
| RISC-03 | Phase 6 | Pending |
| GOVN-01 | Phase 6 | Pending |
| GOVN-02 | Phase 6 | Pending |
| INDC-01 | Phase 6 | Pending |
| INDC-02 | Phase 6 | Pending |
| INDC-03 | Phase 6 | Pending |
| MODU-01 | Phase 6 | Pending |
| WIZD-01 | Phase 7 | Pending |
| WIZD-02 | Phase 7 | Pending |
| WIZD-03 | Phase 7 | Pending |
| UIET-01 | Phase 8 | Pending |
| UIET-02 | Phase 8 | Pending |
| UIET-03 | Phase 8 | Pending |
| UIET-04 | Phase 8 | Pending |
| UIET-05 | Phase 8 | Pending |
| UIOB-01 | Phase 8 | Pending |
| UIOB-02 | Phase 8 | Pending |
| UIOB-03 | Phase 8 | Pending |
| UIOB-04 | Phase 8 | Pending |
| UIOB-05 | Phase 8 | Pending |
| UIPA-01 | Phase 9 | Pending |
| UIPA-02 | Phase 9 | Pending |
| UIPA-03 | Phase 9 | Pending |
| UIRC-01 | Phase 9 | Pending |
| UIRC-02 | Phase 9 | Pending |
| UIRC-03 | Phase 9 | Pending |
| UIGN-01 | Phase 9 | Pending |
| UIGN-02 | Phase 9 | Pending |
| UIIN-01 | Phase 9 | Pending |
| UIIN-02 | Phase 9 | Pending |
| UIMD-01 | Phase 10 | Pending |
| UIMD-02 | Phase 10 | Pending |
| UIMD-03 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 56 total
- Mapped to phases: 56
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
