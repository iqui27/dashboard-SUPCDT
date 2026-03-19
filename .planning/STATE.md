# State — Dashboard SUPCDT

## Current Position
- **Active Phase:** Nenhuma — Roadmap principal concluído
- **Completed Phase:** 04 — Full Product Polish & Production UX
- **Status:** Phases 01 a 04 executadas e validadas. O produto agora cobre fundação, monitoramento operacional, módulo Wi‑Fi Social e shell final com carregamento progressivo.
- **Last Updated:** 2026-03-19

## What We Know Now
- A memória compartilhada quase não tinha contexto do projeto; o histórico útil estava no próprio repositório.
- O projeto já recebeu um primeiro lote de profissionalização técnica e a execução completa da phase 01.
- O schema real do Mongo em `dashboard_supcdt.projetos_supcdt` agora já está refletido pelo contrato canônico de projeto usado pela aplicação.
- A aplicação agora também expõe um bloco `monitoramento.operacional` com estados executivos e operacionais editáveis.
- Há `5` projetos na base observada e `0` lançamentos operacionais.
- O projeto `Wi-Fi Social` já existe como cadastro embrionário, com meta inicial de pontos ativados.
- O modelo agora já prevê `numeroUnico` e `chaveIntegracao` para vínculo entre dashboards.
- O Wi‑Fi Social agora também tem uma coleção dedicada de pontos georreferenciados e um módulo visual próprio no frontend.
- O módulo também já deriva prioridade operacional, territórios críticos, manutenção pendente e incidentes por ponto.
- O shell agora usa code splitting e chunking explícito para reduzir o peso do carregamento inicial.
- A aplicação agora tem uma suíte Playwright de smoke público cobrindo login, recuperação de senha e reset por querystring.
- A rota de redefinição de senha foi alinhada para `/reset-password?token=...`, compatível com o link enviado pelo backend.
- A suíte de smoke agora está separada entre execução pública e autenticada, com scripts dedicados.
- O smoke autenticado agora bloqueia por padrão ambientes com `VITE_API_BASE_URL` remota e só roda com opt-in explícito.
- Existe agora um fluxo recomendado de smoke autenticado local com `.env.e2e.local`, usuário dedicado `smoke.qa` e preflight de Mongo.
- O fluxo recomendado foi validado ponta a ponta com Mongo Docker local, usuário de smoke garantido e acesso autenticado até o módulo Wi‑Fi Social.
- O ambiente local agora também tem seed idempotente e teste funcional cobrindo carteira de projetos, detalhe de projeto e operação Wi‑Fi Social.
- A QA local agora cobre também exportação Saiweb e fluxos de edição persistente em projeto e ponto Wi‑Fi.
- A QA local agora também valida registro de novo lançamento e sua presença no CSV Saiweb exportado.
- A QA local agora também cobre gestão de usuários com criação, edição e trava contra auto-rebaixamento do próprio admin.
- A QA local agora também valida desativação, reativação e reset de senha de usuário com tentativa real de login.
- A rota `PUT /api/projetos/:id` voltou a persistir `monitoramento`, destravando o modal de atualização operacional.
- O `UserManagement` agora recebe `currentUserId`, ativando corretamente as proteções de auto-gestão no frontend.

## Real Database Findings
- Collection principal: `projetos_supcdt`
- Campos observados com frequência: `nome`, `nomeOSC`, `status`, `responsavelSECTI`, `raPerigao`, `descricao`, `objetivos`, `valorTotal`, `cronograma`, `metas`
- Collection `lancamentos`: vazia
- Isso indica que o produto ainda está mais próximo de planejamento e acompanhamento de metas do que de operação diária rica em evidências

## Decisions
- Direção visual: `minimalismo institucional contemporâneo`
- Autenticação obrigatória, sem atalho de login automático
- O roadmap começa pela fundação de identidade e dados antes do módulo Wi-Fi Social
- O módulo Wi-Fi Social será tratado como vertical operacional dentro do dashboard atual
- O plano existente em `.planning/WIFI_SOCIAL_PLAN.md` será reaproveitado como insumo, não como fonte única
- O backend passa a normalizar projetos num shape único, com fallback de integração quando `numeroUnico` ainda não existe
- O monitoramento operacional foi incorporado ao documento principal do projeto, sem criar uma entidade paralela nesta etapa

## Risks
- Sem `lancamentos`, parte do monitoramento real ainda precisará nascer com novos campos/fluxos
- Alguns projetos ainda carregam cadastro embrionário, então a UI precisa continuar tratando lacunas de dados com honestidade
- Ainda existe oportunidade futura de reduzir mais os chunks `vendor`, `charts` e `maps`
- O aviso de `baseline-browser-mapping` continua não bloqueante no build
- O smoke autenticado ainda depende de credenciais reais (`E2E_USERNAME` e `E2E_PASSWORD`) para validar a jornada protegida ponta a ponta
- O `.env` atual aponta para API remota, então qualquer smoke autenticado precisa decisão consciente de ambiente

## Next Up
- Decidir se o smoke autenticado será executado contra API remota existente ou após apontar `.env` para backend local
- Manter o Mongo local do E2E como caminho padrão para validar autenticação sem tocar a API remota
- Quando houver ambiente aprovado, executar o smoke autenticado com credenciais reais e validar a jornada protegida ponta a ponta
- Expandir a QA local para áreas ainda não cobertas, como busca avançada de usuários, fluxos de recuperação por e-mail e guardrails adicionais de relatórios, se a operação pedir
- Realizar QA funcional com dados reais nos módulos de projetos e Wi‑Fi Social
- Preencher dados operacionais faltantes nos projetos e pontos Wi‑Fi
- Atacar otimizações adicionais de bundle apenas se a operação real justificar
