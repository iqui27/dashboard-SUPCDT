# Quick Task 260413-ksf: Adicionar gestão de empresas no módulo Wi-Fi Social - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Task Boundary

Adicionar gestão de empresas no módulo Wi-Fi Social com nova aba de gerenciamento, agregação por empresa e dropdown de empresa responsável em pontos Wi-Fi. Lista inicial de empresas: uaifacil (claudio henrique), maiswifi/clickmidia/mfi/sr midia (bruna/rafael), conecta (alesson Silva), cleanmídia (felix silva), mixdftelecom (bruno melo), mobtv (pedro).

</domain>

<decisions>
## Implementation Decisions

### UI Structure
- **Decision:** Sub-seção dentro de Wi-Fi Social — nova aba "Empresas" dentro do WifiDashboard (ao lado de Mapa, Tabela, Status)
- **Why:** Empresas são diretamente relacionadas aos pontos Wi-Fi, mantém contexto do módulo
- **Implementation:** Adicionar tab "Empresas" no WifiDashboard.tsx com componente EmpresasTab.tsx

### Data Storage
- **Decision:** Coleção MongoDB separada `wifi_empresas` — permite referência por ID em WifiPoint
- **Why:** Poucas empresas com muitos pontos — estrutura relacional simples, permite CRUD de empresas independente
- **Implementation:** Nova coleção wifi_empresas, campo empresaId?: string em WifiPoint, endpoints CRUD REST

### Aggregation View
- **Decision:** Dashboard com KPIs + lista pontos por empresa — card para cada empresa
- **Why:** Visão consolidada útil para gestor — ver performance da empresa e pontos associados
- **Implementation:** Card por empresa com: nome, contato, nº pontos, status distribution, velocidade média, lista pontos

### Agent's Discretion
- Dropdown de empresa no WifiPointForm usa select com dados da coleção wifi_empresas
- Campo responsavelOperacional existente pode ser migrado para empresaId (nullable)
- Lista inicial de 6 empresas fornecida pelo user — seed data script ou manual insert
- Backend endpoints: GET/POST/PUT/DELETE /api/wifi-empresas
- Frontend: EmpresasTab.tsx com cards, WifiPointForm.tsx com dropdown

</decisions>

<specifics>
## Specific Ideas

### Lista de empresas inicial (seed data):
1. uaifacil — contato: claudio henrique, phone: 61984272787, email: claudio@uaifacil.com.br
2. maiswifi/clickmidia/mfi/sr midia — contato: bruna/rafael, phone: 61983236748, email: bruna@gestãopublicidade.com.br
3. conecta — contato: alesson Silva, phone: 61999227775, email: alesson@uaisfacil.com.br
4. cleanmídia — contato: felix silva, phone: 991816101, email: felixestera@gmail.com
5. mixdftelecom — contato: bruno melo, phone: 61998271477, email: bruno@mixdftelecom.com.br
6. mobtv — contato: pedro, phone: 62 991584939, email: redes@dsgroupbr.com

### Campo WifiPoint.empresaId:
- Campo opcional (empresaId?: string | null)
- Referência ObjectId para wifi_empresas
- Dropdown no WifiPointForm popula com GET /api/wifi-empresas
- Se null, ponto não tem empresa responsável

</specifics>

<canonical_refs>
## Canonical References

- `src/types/wifi.ts` — WifiPoint interface atual (tem responsavelOperacional campo legado)
- `src/components/wifi/WifiDashboard.tsx` — tabs existentes: Mapa, Tabela, Status
- `src/components/wifi/WifiPointForm.tsx` — form de criação/edição de pontos
- MongoDB collection `wifi_points` — existente (Phase 03)
- Backend routes em `server/routes/wifi.ts` — endpoints CRUD de pontos já existem

</canonical_refs>