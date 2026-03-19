# Plano de Implementação: Aba Wi-Fi Social

## Visão Geral

Criar uma nova aba no dashboard SUPCDT para gerenciamento e monitoramento de pontos de Wi-Fi Social do governo do DF, com mapa interativo geográfico, visualização por Regiões Administrativas, painel de monitoramento e CRUD completo.

---

## Stack Confirmada

| Categoria | Tecnologia |
|-----------|------------|
| Mapa | React Leaflet + react-leaflet-cluster |
| Tiles | CartoDB Positron (gratuito, visual limpo) |
| UI | shadcn/ui + Tailwind CSS (já instalado) |
| Dados | MongoDB (mesma instância do projeto) |
| Gráficos | Recharts (já instalado) |

---

## Fases de Implementação

### Fase 1: Foundation (INSTALAÇÃO + DADOS)

#### Tarefa 1.1: Instalar dependências do mapa
```bash
npm install leaflet react-leaflet react-leaflet-cluster
npm install -D @types/leaflet
```

**Verificar:** `npm install` executa sem erros

#### Tarefa 1.2: Criar tipo TypeScript para ponto Wi-Fi
Criar `src/types/wifi.ts`:
```typescript
export interface WifiPoint {
  _id: string;
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
  regiao: string; // RA do DF
  status: 'online' | 'offline' | 'instavel';
  velocidade?: number;
  usuariosConectados?: number;
  instaladoEm: Date;
  atualizadoEm: Date;
  observacoes?: string;
}

export const REGIOES_ADMINISTRATIVAS = [
  "Plano Piloto", "Gama", "Taguatinga", "Brazlândia", "Sobradinho",
  "Planaltina", "Núcleo Bandeirante", "Ceilândia", "Cruzeiro", "Guará",
  "Lago Sul", "Lago Norte", "Candangolândia", "Águas Claras", "Samambaia",
  "Santa Maria", "Recanto das Emas", "São Sebastião", "Riacho Fundo",
  "Riacho Fundo II", "Park Way", "Sudoeste/Octogonal", "Varjão",
  "SCIA/Estrutural", "SIA", "Sobradinho II", "Jardim Botânico", "Itapoã",
  "Arniqueira", "Vicente Pires", "Fercal", "Sol Nascente/Pôr do Sol",
  "Arapoanga", "Água Quente"
] as const;
```

#### Tarefa 1.3: Criar rota API para Wi-Fi Points
Criar `server/routes/wifi.ts` com endpoints:
- `GET /api/wifi` - Listar todos os pontos (com filtros)
- `GET /api/wifi/:id` - Obter ponto específico
- `POST /api/wifi` - Criar novo ponto
- `PUT /api/wifi/:id` - Atualizar ponto
- `DELETE /api/wifi/:id` - Excluir ponto
- `GET /api/wifi/stats` - Estatísticas agregadas

**Montar em:** `server/index.ts`

---

### Fase 2: Componentes UI

#### Tarefa 2.1: Criar componente principal WifiSocial
Criar `src/components/wifi/WifiSocial.tsx`:
- Estado para tabs (Mapa | Lista | Dashboard)
- Carregamento de dados via API
- Layout com sidebar de filtros

#### Tarefa 2.2: Criar componente WifiMap
Criar `src/components/wifi/WifiMap.tsx`:
- Mapa Leaflet centrado no DF (lat: -15.78, lng: -47.93)
- Tile layer CartoDB Positron
- Markers customizados por status:
  - 🟢 Verde = online
  - 🔴 Vermelho = offline
  - 🟡 Amarelo = instável
- Clustering com react-leaflet-cluster
- Popup ao clicar no marker com detalhes
- Ao clicar no mapa → abre formulário para criar novo ponto

#### Tarefa 2.3: Criar componente WifiTable
Criar `src/components/wifi/WifiTable.tsx`:
- Tabela com colunas: Nome, Endereço, RA, Status, Velocidade, Ações
- Busca por nome/endereço
- Filtro por RA
- Filtro por status
- Ordenação por coluna
- Botões editar/excluir

#### Tarefa 2.4: Criar componente WifiDashboard  
Criar `src/components/wifi/WifiDashboard.tsx`:
- Cards de KPI:
  - Total de pontos
  - % Online
  - % Offline
  - % Instável
- Gráfico de pizza: distribuição por status
- Gráfico de barras: pontos por RA (top 10)
- Lista de últimos pontos adicionados

#### Tarefa 2.5: Criar formulário WifiPointForm
Criar `src/components/wifi/WifiPointForm.tsx`:
- Campos: nome, endereço, latitude, longitude (input ou clique no mapa), RA (select), status, velocidade, observações
- Validação com Zod
- Modal usando shadcn/ui Dialog

---

### Fase 3: Integração

#### Tarefa 3.1: Adicionar aba no Header
Em `src/components/Header.tsx`:
- Adicionar novo item ao array tabs:
```typescript
{ id: 'wifi', label: 'Wi-Fi Social', icon: Wifi }
```
- Importar ícone Wifi do lucide-react

#### Tarefa 3.2: Adicionar rota no App.tsx
Em `src/App.tsx`:
- Adicionar 'wifi' ao type AppTab
- Importar componente WifiSocial
- Adicionar renderização condicional:
```typescript
{currentTab === 'wifi' && <WifiSocial />}
```

#### Tarefa 3.3: Criar utilitário API
Criar `src/lib/api/wifi.ts`:
- fetchWifiPoints(), fetchWifiPoint(), createWifiPoint(), updateWifiPoint(), deleteWifiPoint(), fetchWifiStats()

---

## Estrutura de Arquivos Final

```
src/
├── components/
│   └── wifi/
│       ├── WifiSocial.tsx      # Componente principal
│       ├── WifiMap.tsx         # Mapa interativo
│       ├── WifiTable.tsx       # Lista de pontos
│       ├── WifiDashboard.tsx   # KPIs e gráficos
│       ├── WifiPointForm.tsx  # Formulário CRUD
│       └── WifiFilters.tsx     # Filtros sidebar
├── lib/
│   └── api/
│       └── wifi.ts             # API client
└── types/
    └── wifi.ts                # Tipos TypeScript

server/
└── routes/
    └── wifi.ts                # API endpoints
```

---

## Dependências Entre Tarefas

```
[1.1 Install] → [1.2 Types] → [1.3 API] → [2.1 WifiSocial]
                                                      ↓
[2.3 Dashboard] ← [2.2 Map] ←───────────────────── [2.5 Form]
                                                      ↓
                              [3.3 API Client] ←──── [2.4 Table]
                                                      ↓
                                           [3.2 App.tsx]
                                                      ↓
                                           [3.1 Header]
```

---

## Estimativa de Esforço

| Fase | Tarefas | Complexidade |
|------|---------|--------------|
| Foundation | 3 | Baixa |
| Componentes | 5 | Média-Alta |
| Integração | 3 | Baixa |
| **Total** | **11** | ~4-6 horas |

---

## Observações

1. **Mapa geográfico com RAs**: Para ter as regiões administrativas demarcadas no mapa, podemos:
   - Usar GeoJSON das fronteiras das RAs do DF (disponível em dados abertos do GDF)
   - Overlay de polígonos coloridos por quantidade de pontos
   - **Prioridade inicial**: Apenas markers, polígonos podem ser iteracao futura

2. **Dados iniciais**: Precisaremos de dados mock ou importação inicial para testar

3. **Permissões**: Same permissions as other tabs (auth required)

4. **Responsividade**: Mapa funciona bem em desktop, lista/tabela melhor para mobile
