# Dashboard SUPCDT — Módulos de Monitoramento Avançado

## What This Is

Dashboard de monitoramento de projetos públicos da SUPCDT/SECTI-DF. A plataforma já gerencia projetos, metas trimestrais, lançamentos de execução e OSCs. Este milestone adiciona 6 módulos configuráveis por projeto — etapas, orçamento por rubrica, parceiros, riscos, governança e indicadores de pesquisa — tornando o acompanhamento comparável ao nível de detalhe exigido por contratos como o Polo Criativo SCS.

## Core Value

Cada projeto deve poder ser monitorado com o nível de detalhe que seu contrato exige — nem mais, nem menos — sem configuração técnica.

## Requirements

### Validated

- ✓ CRUD de projetos com metas trimestrais e lançamentos de execução — existing
- ✓ DetalheProjeto com hero, KPIs, seção de execução — existing
- ✓ CriacaoProjetoWizard com 4 etapas (Identificação, Governança, Escopo, Cronograma) — existing
- ✓ Modelos de dados `Projeto`, `Meta`, `Lancamento` no MongoDB — existing
- ✓ UI minimalista com Tailwind + shadcn/ui, header compacto, listas divide-y — existing

### Active

**Módulo: Etapas**
- [ ] Gestor pode criar etapas com nome, % de progresso e entregáveis
- [ ] Gestor pode editar % de uma etapa inline no DetalheProjeto
- [ ] Gestor pode marcar entregáveis individuais como concluídos
- [ ] Etapas são opcionais por projeto (ativadas por toggle no wizard)

**Módulo: Orçamento por Rubrica**
- [ ] Gestor pode definir rubricas orçamentárias (Bolsas, Custeio, Capital, etc.)
- [ ] Gestor pode registrar previsto e executado por rubrica
- [ ] Sistema calcula saldo (previsto − executado) automaticamente
- [ ] Gestor pode adicionar aditivos vinculados a rubrica específica
- [ ] Rubrica exibe variação percentual executado/previsto
- [ ] Módulo é opcional por projeto

**Módulo: Parceiros Institucionais**
- [ ] Gestor pode cadastrar parceiros com nome, papel e status de envolvimento
- [ ] Status de envolvimento: Ativo, Apoiador, Consultor, Inativo
- [ ] Lista de parceiros visível no DetalheProjeto
- [ ] Módulo é opcional por projeto

**Módulo: Riscos**
- [ ] Gestor pode cadastrar riscos com descrição, probabilidade, impacto e mitigação
- [ ] Probabilidade: Alta / Média / Baixa
- [ ] Impacto: Alto / Médio / Baixo
- [ ] Status do risco: Aberto / Em mitigação / Encerrado
- [ ] Módulo é opcional por projeto

**Módulo: Governança / Decisões**
- [ ] Gestor pode registrar decisões com título, data, descrição e responsável
- [ ] Decisões aparecem em lista cronológica no DetalheProjeto
- [ ] Módulo é opcional por projeto

**Módulo: Indicadores de Pesquisa**
- [ ] Gestor pode criar indicadores com nome, categoria e série de dados (label + valor %)
- [ ] Indicadores exibidos como lista de barras horizontais simples
- [ ] Gestor pode editar/excluir indicadores e seus dados
- [ ] Módulo é opcional por projeto

**Configuração de módulos**
- [ ] CriacaoProjetoWizard ganha aba "5. Módulos" para ativar/desativar módulos
- [ ] DetalheProjeto mostra apenas seções dos módulos ativos
- [ ] Gestor pode ativar/desativar módulos após criação via painel de configuração no DetalheProjeto

**Modelo de dados**
- [ ] Tipo `Etapa` com `id`, `nome`, `percentual`, `entregaveis: Entregavel[]`
- [ ] Tipo `RubricaOrcamentaria` com `nome`, `previsto`, `executado`, `aditivos`
- [ ] Tipo `Parceiro` com `nome`, `papel`, `status`
- [ ] Tipo `Risco` com `descricao`, `probabilidade`, `impacto`, `mitigacao`, `status`
- [ ] Tipo `DecisaoGovernanca` com `titulo`, `data`, `descricao`, `responsavel`
- [ ] Tipo `IndicadorPesquisa` com `nome`, `categoria`, `dados: {label, valor}[]`
- [ ] Tipo `ModulosAtivos` como flags boolean em `Projeto`
- [ ] Endpoints REST para CRUD de cada módulo
- [ ] Persistência MongoDB em `custom_projects` (campos embarcados no documento do projeto)

### Out of Scope

- Módulos independentes com coleções MongoDB separadas — os dados são embutidos no documento do projeto para simplicidade
- Dashboard comparativo entre projetos (futuro milestone)
- Exportação PDF com os novos módulos — depende do template institucional já planejado
- Permissões granulares por módulo — controle de acesso é por projeto, não por campo
- Histórico de alterações por campo (audit trail) — fora deste escopo

## Context

- Stack: React 18 + TypeScript + Vite, Tailwind 3.4, shadcn/ui, Express 5, MongoDB 6
- Codebase brownfield: `DetalheProjeto.tsx` já tem seção de metas/lançamentos; os novos módulos seguem o mesmo padrão visual (divide-y, rounded-[1.35rem], botões h-8 rounded-full)
- Projeto de referência real: Polo Criativo SCS — 4 etapas (85-100% cada), 3 rubricas, 9 parceiros, riscos identificados (gentrificação, resistência comunitária)
- O `CriacaoProjetoWizard` usa steps array — adicionar passo 5 é incremental
- Todos os módulos devem seguir o padrão minimalista estabelecido na branch atual (PR #3)

## Constraints

- **Tech stack**: React + TypeScript + Express + MongoDB — sem novas dependências de banco
- **UI pattern**: Seguir rigorosamente o padrão minimalista (hero compacto, divide-y, shadcn/ui) — não adicionar cards com gradiente
- **Dados embutidos**: Todos os módulos persistem dentro do documento `custom_projects` — sem novas coleções
- **Compatibilidade**: Projetos existentes sem módulos ativos não devem quebrar — flags `modulosAtivos` são opcionais com default false
- **Branch**: Trabalhar sobre `claude/recursing-gagarin` (PR #3 já aberto)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dados embutidos no documento do projeto | Simplicidade de query; módulos são parte do projeto, não entidades independentes | — Pending |
| Módulos opcionais via flags boolean | Evita poluir UI de projetos simples; cada projeto ativa o que precisa | — Pending |
| UI segue padrão existente (divide-y, rounded-[1.35rem]) | Consistência visual; não re-inventar o que já está validado no PR #3 | — Pending |
| Passo 5 no wizard para configurar módulos | Onboarding guiado; gestor declara intenção no início, não retroativamente | — Pending |

---
*Last updated: 2026-03-24 após inicialização*
