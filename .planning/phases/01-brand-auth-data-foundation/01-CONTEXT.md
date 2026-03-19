# Phase 01: Brand, Auth & Data Foundation - Context

**Gathered:** 2026-03-18  
**Status:** Ready for planning
**Source:** Conversa com o usuário + auditoria do repositório + inspeção read-only do Mongo

<domain>
## Phase Boundary

Esta fase não implementa ainda o módulo Wi-Fi Social completo.

Ela prepara o terreno:
- identidade própria do produto
- autenticação obrigatória sem bypass
- shell responsivo
- auditoria dos componentes atuais
- alinhamento do contrato de dados para projetos e monitoramento

</domain>

<decisions>
## Implementation Decisions

### Brand & UX
- O produto deve ter linguagem visual própria, não clone de outro dashboard.
- A direção é minimalismo institucional contemporâneo: sóbrio, preciso, elegante e responsivo.
- O login é parte do produto, não apenas uma porta de entrada técnica.

### Auth
- A opção "Testar sem login (Admin)" deve sair.
- O fluxo de acesso deve depender sempre de autenticação real.

### Data
- O banco observado usa `dashboard_supcdt.projetos_supcdt`.
- O schema real hoje é mais simples que o tipo `Projeto` do frontend.
- O alinhamento de dados é pré-condição para qualquer monitoramento profissional.

### Wi-Fi Social
- O projeto já existe como registro inicial na base.
- O módulo completo de mapa/operação entra depois da fundação de dados e shell.

</decisions>

<specifics>
## Specific Ideas

- Rebranding do login e do header com visual institucional distintivo
- Navegação mobile séria, não apenas tabs desktop escondidas
- Adaptador ou normalização no backend para transformar `nome`/`nomeOSC`/`status` em contrato consistente
- Revisão dos componentes para eliminar mocks críticos e placeholders visíveis ao usuário

</specifics>

<deferred>
## Deferred Ideas

- Mapa do DF do Wi-Fi Social
- Cobertura e saúde dos pontos Wi-Fi
- Incidentes, manutenção e workflows operacionais
- Polish global de todas as telas após estabilização do contrato de dados

</deferred>
