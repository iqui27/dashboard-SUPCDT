# Quick Task 260413-ksf: Gestão de Empresas Wi-Fi Social - Research

**Researched:** 2026-04-13
**Domain:** Wi-Fi Social module — adding company management with aggregation
**Confidence:** HIGH

## Summary

The Wi-Fi Social module (Phase 03) is fully implemented with `wifi_social_points` collection, CRUD endpoints, map/dashboard/table views, and a point creation form. Adding company management requires:
1. New `wifi_empresas` collection with CRUD endpoints
2. `empresaId` reference field in WifiPoint
3. New "Empresas" tab in WifiSocial with aggregation cards
4. Dropdown in WifiPointForm to select responsible company

**Primary recommendation:** Follow the exact pattern established in `server/services/wifi.ts` for the new empresas service, and add the new tab alongside existing 'mapa', 'painel', 'lista' tabs in WifiSocial.tsx.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **UI Structure:** Sub-seção dentro de Wi-Fi Social — nova aba "Empresas" dentro do WifiDashboard (ao lado de Mapa, Tabela, Status)
- **Data Storage:** Coleção MongoDB separada `wifi_empresas` — permite referência por ID em WifiPoint
- **Aggregation View:** Dashboard com KPIs + lista pontos por empresa — card para cada empresa

### Agent's Discretion
- Dropdown de empresa no WifiPointForm usa select com dados da coleção wifi_empresas
- Campo responsavelOperacional existente pode ser migrado para empresaId (nullable)
- Lista inicial de 6 empresas fornecida pelo user — seed data script ou manual insert
- Backend endpoints: GET/POST/PUT/DELETE /api/wifi-empresas
- Frontend: EmpresasTab.tsx com cards, WifiPointForm.tsx com dropdown
</user_constraints>

## Standard Stack

### Core (Existing — use same pattern)
| Component | File | Purpose |
|-----------|------|---------|
| WifiPoint model | `src/types/wifi.ts` | Frontend type (id, nome, status, regiao...) |
| DBWifiPoint model | `server/types/wifi.ts` | Backend DB type with ObjectId + Date |
| Wifi services | `server/services/wifi.ts` | CRUD + normalization + stats aggregation |
| Wifi routes | `server/routes/wifi.ts` | Express Router mounted at `/api/wifi` |
| DB client | `server/db/client.ts` | `getDatabase('dashboard_supcdt')` singleton |

### New (to create)
| Component | Purpose |
|-----------|---------|
| `WifiEmpresa` type (frontend) | Company model: id, nome, contatoNome, telefone, email |
| `DBWifiEmpresa` type (backend) | Same with ObjectId + Date |
| `wifi-empresas` service | CRUD following wifi.ts pattern |
| `wifi-empresas` routes | Router at `/api/wifi-empresas` |

**Installation:** No new dependencies — all patterns exist in codebase.

## Architecture Patterns

### Tab Structure Pattern (WifiSocial.tsx)
```typescript
// Current tabs — lines 209-227
type WifiView = 'mapa' | 'painel' | 'lista';

// Tab buttons with rounded-full styling
{[
  { id: 'mapa', label: 'Mapa', icon: MapPinned },
  { id: 'painel', label: 'Painel', icon: LayoutGrid },
  { id: 'lista', label: 'Lista', icon: ListFilter }
].map((tab) => (
  <button
    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
      view === tab.id ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-secondary'
    }`}
  >...</button>
))}
```

**Add:** `{ id: 'empresas', label: 'Empresas', icon: Building2 }` tab.

### WifiPoint Model Extension
```typescript
// src/types/wifi.ts — add to WifiPoint interface (line 44)
export interface WifiPoint {
  // ...existing fields...
  responsavelOperacional?: string | null; // existing — can coexist
  empresaId?: string | null; // NEW — ObjectId reference to wifi_empresas
}

// server/types/wifi.ts — add to DBWifiPoint (line 8)
export interface DBWifiPoint {
  // ...existing fields...
  responsavelOperacional?: string | null;
  empresaId?: ObjectId | null; // NEW — MongoDB ObjectId reference
}
```

### Backend CRUD Pattern (server/services/wifi.ts)
```typescript
// Pattern to follow for wifi-empresas service
const COLLECTION_NAME = 'wifi_empresas'; // NEW collection

export async function createWifiEmpresa(data: Omit<DBWifiEmpresa, '_id'>): Promise<DBWifiEmpresa> {
  const db = await getDatabase('dashboard_supcdt');
  const collection = db.collection<DBWifiEmpresa>(COLLECTION_NAME);
  const newEmpresa = { ...data, createdAt: new Date(), updatedAt: new Date() };
  const result = await collection.insertOne(newEmpresa);
  return { ...newEmpresa, _id: result.insertedId };
}

// Similar pattern for getWifiEmpresas, getWifiEmpresaById, updateWifiEmpresa, deleteWifiEmpresa
```

### Route Mounting (server/index.ts)
```typescript
// Lines 117-133 — add after wifi router
app.use('/api/wifi', wifiRouter);
app.use('/api/wifi-empresas', wifiEmpresasRouter); // NEW
```

### WifiPointForm Dropdown Pattern
```typescript
// WifiPointForm.tsx — uses Select component (lines 467-476, 495-504)
// Add empresa dropdown following same pattern:

<div className="space-y-2">
  <Label>Empresa responsável</Label>
  <Select value={form.empresaId ?? ''} onValueChange={(value) => setForm((current) => ({ ...current, empresaId: value || null }))}>
    <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Nenhuma empresa" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="">Sem empresa</SelectItem>
      {empresas.map((empresa) => (
        <SelectItem key={empresa.id} value={empresa.id}>{empresa.nome}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Company CRUD endpoints | Custom Express handlers | Copy `server/routes/wifi.ts` pattern | Verified auth + validation pattern |
| DB normalization | Custom sanitizers | Copy `server/services/wifi.ts` normalizeWifiPointInput pattern | Handles null, trimming, Date parsing |
| Tab styling | Custom tab component | Copy WifiSocial.tsx button pattern | Consistent with existing tabs |
| Dropdown styling | Custom select | Use existing Select from shadcn/ui | Already used in WifiPointForm |

## Seed Data

Initial 6 companies (from CONTEXT.md):
```typescript
const SEED_EMPRESAS = [
  { nome: 'uaifacil', contatoNome: 'claudio henrique', telefone: '61984272787', email: 'claudio@uaifacil.com.br' },
  { nome: 'maiswifi/clickmidia/mfi/sr midia', contatoNome: 'bruna/rafael', telefone: '61983236748', email: 'bruna@gestãopublicidade.com.br' },
  { nome: 'conecta', contatoNome: 'alesson Silva', telefone: '61999227775', email: 'alesson@uaisfacil.com.br' },
  { nome: 'cleanmídia', contatoNome: 'felix silva', telefone: '991816101', email: 'felixestera@gmail.com' },
  { nome: 'mixdftelecom', contatoNome: 'bruno melo', telefone: '61998271477', email: 'bruno@mixdftelecom.com.br' },
  { nome: 'mobtv', contatoNome: 'pedro', telefone: '62 991584939', email: 'redes@dsgroupbr.com' }
];
```

**Recommendation:** Create `server/scripts/seedWifiEmpresas.ts` script (pattern: existing scripts in `server/scripts/` folder like `createUser.ts`).

## Common Pitfalls

### Pitfall 1: Types Mirrored in Two Places
**What goes wrong:** `src/types/wifi.ts` and `server/types/wifi.ts` are separate — forgetting to update both.
**How to avoid:** Always update frontend AND backend types in same commit. Document in task.

### Pitfall 2: ObjectId vs String Confusion
**What goes wrong:** Backend uses `ObjectId`, frontend uses `string` for IDs.
**How to avoid:** Use `toIsoDate()` and `mapWifiPointToApi()` pattern to convert ObjectId to string.id on API response.

### Pitfall 3: Auth Middleware Missing
**What goes wrong:** New routes without `requireAuth` middleware allow unauthenticated access.
**How to avoid:** All routes must use `requireAuth` from `server/middleware/auth.js` (see existing wifi.ts pattern).

### Pitfall 4: Null empresaId Handling
**What goes wrong:** Points without empresa break aggregation queries.
**How to avoid:** Make `empresaId?: string | null` optional with null default. Handle null in aggregation (points without empresa shown separately).

## Code Examples

### WifiEmpresa Type (Frontend)
```typescript
// src/types/wifi.ts — add after WifiPoint interface
export interface WifiEmpresa {
  id: string;
  nome: string;
  contatoNome?: string | null;
  telefone?: string | null;
  email?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
```

### WifiEmpresa Type (Backend)
```typescript
// server/types/wifi.ts — add after DBWifiPoint
export interface DBWifiEmpresa {
  _id?: ObjectId;
  nome: string;
  contatoNome?: string | null;
  telefone?: string | null;
  email?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WifiEmpresaApi {
  id: string;
  nome: string;
  contatoNome?: string | null;
  telefone?: string | null;
  email?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
```

### Aggregation Query for EmpresasTab
```typescript
// In WifiSocial.tsx or separate hook
// Fetch all points, all empresas, then aggregate in frontend
const empresasWithPoints = empresas.map((empresa) => ({
  empresa,
  pontos: points.filter((p) => p.empresaId === empresa.id),
  totalPontos: points.filter((p) => p.empresaId === empresa.id).length,
  statusDistribution: buildWifiStatsFromPoints(points.filter((p) => p.empresaId === empresa.id))
}));
const pontosSemEmpresa = points.filter((p) => !p.empresaId);
```

## Environment Availability

| Dependency | Required By | Available | Version |
|------------|------------|-----------|---------|
| MongoDB | wifi_empresas collection | ✓ | 6.x (Atlas) |
| Express | wifi-empresas router | ✓ | 5.x |
| shadcn/ui Select | WifiPointForm dropdown | ✓ | existing |
| Lucide Building2 icon | Empresas tab | ✓ | existing in lucide-react |

**No blockers detected.**

## Sources

### Primary (HIGH confidence)
- `src/types/wifi.ts` — WifiPoint model, existing patterns [VERIFIED: codebase]
- `server/types/wifi.ts` — DBWifiPoint model, ObjectId patterns [VERIFIED: codebase]
- `server/services/wifi.ts` — CRUD pattern, collection name, normalization [VERIFIED: codebase]
- `server/routes/wifi.ts` — Router pattern, auth middleware [VERIFIED: codebase]
- `src/components/wifi/WifiSocial.tsx` — Tab structure, view state pattern [VERIFIED: codebase]
- `src/components/wifi/WifiPointForm.tsx` — Form structure, Select usage [VERIFIED: codebase]
- `server/index.ts` — Route mounting pattern [VERIFIED: codebase]
- `server/db/client.ts` — Database connection pattern [VERIFIED: codebase]
- `.planning/STATE.md` — Project decisions, Phase 03 history [VERIFIED: codebase]
- `CONTEXT.md` — User locked decisions [VERIFIED: planning directory]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — patterns exist in Phase 03 implementation
- Architecture: HIGH — WifiSocial tab pattern verified
- Pitfalls: HIGH — known from STATE.md decisions

**Research date:** 2026-04-13
**Valid until:** 30 days (stable patterns, no external dependencies)