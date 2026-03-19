# Context — Phase 03: Wi-Fi Social Operations Module

## Por que esta fase existe
As duas primeiras fases profissionalizaram a fundação do produto e introduziram uma camada de monitoramento operacional no contrato principal de projetos. O próximo passo é transformar o projeto `Wi-Fi Social` em uma vertical operacional de verdade.

O usuário precisa:
- cadastrar pontos no mapa do DF
- visualizar cobertura e status
- identificar o que está funcionando, instável ou offline
- registrar necessidade de ação, manutenção e observações por local

## Decisão de arquitetura
- O projeto `Wi-Fi Social` continuará existindo na carteira principal de projetos.
- Os pontos físicos serão modelados em uma coleção própria, para não poluir o documento principal do projeto com itens georreferenciados.
- A interface será incorporada como nova aba do dashboard atual, aproveitando autenticação, shell e sistema visual existentes.

## Entidade operacional necessária
- `nome`
- `endereco`
- `regiaoAdministrativa`
- `latitude`
- `longitude`
- `status`
- `coberturaRaioMetros`
- `velocidadeMbps`
- `usuariosConectados`
- `precisaAcao`
- `responsavelOperacional`
- `ultimaManutencao`
- `observacoes`

## Resultado esperado ao fim da fase
- Nova aba `Wi‑Fi Social` acessível pelo shell principal
- CRUD de pontos com persistência real no Mongo
- Mapa do DF com marcadores e círculos de cobertura
- Painel com KPIs, distribuição por status e cobertura territorial
- Base pronta para evolução de manutenção, incidentes e alertas por local
