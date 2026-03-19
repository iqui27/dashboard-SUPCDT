# Dashboard SUPCDT — Requirements

## Product Intent
Transformar o dashboard em uma ferramenta institucional pronta para uso real, com autenticação obrigatória, interface proprietária, monitoramento confiável de projetos e um módulo operacional dedicado ao projeto Wi-Fi Social.

## Locked Decisions
- A autenticação continua obrigatória em todo o produto.
- A tela de login deve ser personalizada para o SUPCDT e não pode reaproveitar a identidade visual do outro dashboard.
- A opção de "entrar sem login" deve ser removida.
- O plano deve partir do estado real do banco `dashboard_supcdt`, não de mocks do frontend.
- O módulo Wi-Fi Social será construído dentro do dashboard existente.
- A direção visual será `minimalismo institucional contemporâneo`: limpa, precisa, responsiva e com UX profissional.

## Requirements

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

## Current Data Reality
- Banco ativo de projetos: `dashboard_supcdt`
- Collection principal: `projetos_supcdt`
- Volume atual observado: `5` projetos
- Collection `lancamentos`: `0` documentos
- O projeto `Wi-Fi Social` já existe como registro inicial, mas ainda sem operação real

## Real Schema Findings
- Os documentos atuais usam principalmente: `nome`, `nomeOSC`, `status`, `responsavelSECTI`, `raPerigao`, `descricao`, `objetivos`, `valorTotal`, `cronograma`, `metas`
- O frontend ainda assume um shape mais amplo e diferente em vários pontos
- Isso torna obrigatório um passo de alinhamento de contrato antes de evoluir o monitoramento
