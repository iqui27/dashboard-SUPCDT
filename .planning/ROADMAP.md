# Dashboard SUPCDT — Roadmap

## Visão
Levar o dashboard para uso institucional real com identidade própria, autenticação obrigatória, dados confiáveis e uma operação visual de monitoramento capaz de acomodar iniciativas como o Wi-Fi Social.

---

### Phase 01: Brand, Auth & Data Foundation
**Goal:** Remover atalhos inseguros, dar identidade própria ao produto e alinhar o contrato de dados para que as telas mostrem informação real.
**Requirements:** [AUTH-01, AUTH-02, BRAND-01, DATA-01, DATA-02, UX-01]
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Rebrand do login, remoção do bypass e shell responsivo
- [x] 01-02-PLAN.md — Auditoria de componentes e alinhamento do contrato de dados

**Key Results:**
- Login exclusivo do SUPCDT, sem "entrar sem login"
- Header e navegação consistentes em desktop e mobile
- Componentes principais usando dados reais ou empty states honestos
- Backend e frontend falando o mesmo shape de projeto

---

### Phase 02: Monitoring Model & Operational Readiness
**Goal:** Transformar projetos e metas em um sistema de monitoramento executivo e operacional confiável.
**Requirements:** [MON-01, MON-02, DATA-01, QUAL-01]
**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md — Camada de métricas e estados de monitoramento derivados da base atual
- [x] 02-02-PLAN.md — Modelo de expansão de dados para bloqueios, riscos, responsáveis e evidências

**Key Results:**
- KPIs e alertas derivados de dados reais
- Visão clara de status, vigência, progresso, responsável, risco e saúde operacional
- Gaps de dados documentados e prontos para evolução
- Base operacional pronta para servir de fundação ao módulo Wi-Fi Social

---

### Phase 03: Wi-Fi Social Operations Module
**Goal:** Criar um módulo operacional completo do Wi-Fi Social com mapa do DF, pontos, cobertura e status.
**Requirements:** [WIFI-01, WIFI-02, WIFI-03, MON-02, UX-01]
**Plans:** 3 plans

Plans:
- [x] 03-01-PLAN.md — Modelo de dados e CRUD operacional de pontos Wi-Fi
- [x] 03-02-PLAN.md — Mapa do DF com pontos, filtros, cobertura e estados
- [x] 03-03-PLAN.md — Fluxos operacionais: incidentes, manutenção, pendências e visão executiva

**Key Results:**
- Cadastro e edição de pontos no mapa
- Status operacional e cobertura por região
- Leitura clara do que está funcionando e do que precisa de ação
- Fila operacional, manutenção e criticidade territorial disponíveis no módulo

---

### Phase 04: Full Product Polish & Production UX
**Goal:** Elevar toda a interface para padrão institucional moderno, responsivo e consistente.
**Requirements:** [UX-01, QUAL-01, BRAND-01]
**Plans:** 2 plans

Plans:
- [x] 04-01-PLAN.md — Responsividade, navegação e padrões de interação em todo o produto
- [x] 04-02-PLAN.md — Sistema visual final, acessibilidade e acabamento de produção

**Key Results:**
- Produto consistente em mobile e desktop
- UX coesa entre dashboards, detalhes, formulários e relatórios
- Aparência profissional, distinta e pronta para adoção
- Shell mais leve, com code splitting e carregamento progressivo por módulo

---

## Requirement IDs

| ID | Descrição |
|----|-----------|
| AUTH-01 | Login personalizado com identidade visual própria do SUPCDT |
| AUTH-02 | Remover qualquer atalho de acesso sem autenticação |
| BRAND-01 | Shell visual coerente entre login, header e dashboard |
| UX-01 | Componentes principais devem ficar responsivos e com UX profissional |
| DATA-01 | Verificar todos os componentes para garantir funcionamento real, sem hardcodes críticos |
| DATA-02 | Alinhar contrato de dados entre Mongo, backend e frontend |
| MON-01 | Extrair indicadores reais de monitoramento com base nos dados atuais de projetos e metas |
| MON-02 | Identificar gaps de monitoramento e preparar modelo de expansão de dados |
| WIFI-01 | Criar módulo do projeto Wi-Fi Social com interface dedicada |
| WIFI-02 | Mapa do DF com cadastro e visualização de pontos, status e cobertura |
| WIFI-03 | Permitir acompanhamento operacional: funcionando, cobertura, necessidade de ação, manutenção |
| QUAL-01 | Revisão ampla dos componentes atuais para acabamento visual e consistência de interação |
