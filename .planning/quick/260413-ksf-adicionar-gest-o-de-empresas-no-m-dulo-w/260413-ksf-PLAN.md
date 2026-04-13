---
phase: quick
plan: 260413-ksf
type: execute
wave: 1
depends_on: []
files_modified:
  - src/types/wifi.ts
  - server/types/wifi.ts
  - server/services/wifiEmpresas.ts
  - server/routes/wifiEmpresas.ts
  - server/index.ts
  - server/scripts/seedWifiEmpresas.ts
  - src/components/wifi/EmpresasTab.tsx
  - src/components/wifi/WifiSocial.tsx
  - src/components/wifi/WifiPointForm.tsx
autonomous: true
requirements: [QUICK-260413]

must_haves:
  truths:
    - "User can see list of Wi-Fi companies in new 'Empresas' tab"
    - "User can create/edit/delete companies via CRUD interface"
    - "User can select company as responsible in Wi-Fi point form"
    - "Each company card shows associated points and statistics"
    - "Points without company are shown separately"
  artifacts:
    - path: "src/types/wifi.ts"
      provides: "WifiEmpresa interface + empresaId in WifiPoint"
      contains: "interface WifiEmpresa"
    - path: "server/types/wifi.ts"
      provides: "DBWifiEmpresa + WifiEmpresaApi backend types"
      contains: "interface DBWifiEmpresa"
    - path: "server/services/wifiEmpresas.ts"
      provides: "CRUD service for wifi_empresas collection"
      exports: ["getWifiEmpresas", "createWifiEmpresa", "updateWifiEmpresa", "deleteWifiEmpresa"]
    - path: "server/routes/wifiEmpresas.ts"
      provides: "REST endpoints at /api/wifi-empresas"
      exports: ["wifiEmpresasRouter"]
    - path: "src/components/wifi/EmpresasTab.tsx"
      provides: "Company cards with point aggregation"
      min_lines: 50
    - path: "src/components/wifi/WifiSocial.tsx"
      provides: "'empresas' tab in tab array"
      pattern: "'empresas', label: 'Empresas'"
  key_links:
    - from: "src/components/wifi/WifiSocial.tsx"
      to: "src/components/wifi/EmpresasTab.tsx"
      via: "view === 'empresas' conditional render"
    - from: "src/components/wifi/WifiPointForm.tsx"
      to: "/api/wifi-empresas"
      via: "fetch empresas for dropdown"
    - from: "server/routes/wifiEmpresas.ts"
      to: "wifi_empresas collection"
      via: "wifiEmpresas service"
---

<objective>
Add company management to Wi-Fi Social module with new "Empresas" tab, CRUD backend, and company dropdown in point form.

Purpose: Allow managers to track which company is responsible for each Wi-Fi point and view aggregated statistics per company.
Output: Working CRUD for companies, company cards with point aggregation, dropdown integration in point form.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/execute-plan.md
@$HOME/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/quick/260413-ksf-adicionar-gest-o-de-empresas-no-m-dulo-w/260413-ksf-CONTEXT.md
@.planning/quick/260413-ksf-adicionar-gest-o-de-empresas-no-m-dulo-w/260413-ksf-RESEARCH.md

<interfaces>
<!-- Key patterns from existing codebase -->

From src/types/wifi.ts (line 44):
```typescript
export interface WifiPoint {
  id: string;
  nome: string;
  endereco: string;
  // ...existing fields...
  responsavelOperacional?: string | null; // existing field
}
```

From server/types/wifi.ts (line 8):
```typescript
export interface DBWifiPoint {
  _id?: ObjectId;
  nome: string;
  // ...existing fields...
  responsavelOperacional?: string | null;
  updatedAt?: Date;
}
```

From WifiSocial.tsx (lines 209-227) — Tab pattern:
```typescript
type WifiView = 'mapa' | 'painel' | 'lista';

{[
  { id: 'mapa', label: 'Mapa', icon: MapPinned },
  { id: 'painel', label: 'Painel', icon: LayoutGrid },
  { id: 'lista', label: 'Lista', icon: ListFilter }
].map((tab) => (
  <button className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
    view === tab.id ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-secondary'
  }`}>
    <tab.icon className="h-3.5 w-3.5" />
    {tab.label}
  </button>
))}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Backend — Types, Service, Routes, Seed</name>
  <files>
    src/types/wifi.ts,
    server/types/wifi.ts,
    server/services/wifiEmpresas.ts,
    server/routes/wifiEmpresas.ts,
    server/index.ts,
    server/scripts/seedWifiEmpresas.ts
  </files>
  <action>
    **CRITICAL: Update BOTH frontend AND backend types in same commit (STATE.md pattern).**

    1. **Add WifiEmpresa types** (both files):
       - Frontend (src/types/wifi.ts): Add `WifiEmpresa` interface with `id, nome, contatoNome?, telefone?, email?, createdAt?, updatedAt?`
       - Add `empresaId?: string | null` field to `WifiPoint` and `WifiPointInput` interfaces
       - Backend (server/types/wifi.ts): Add `DBWifiEmpresa` with `ObjectId` + `Date` fields, `WifiEmpresaApi` with string fields
       - Add `empresaId?: ObjectId | null` to `DBWifiPoint`, `empresaId?: string | null` to `WifiPointApi` and `WifiPointInput`

    2. **Create wifiEmpresas service** (server/services/wifiEmpresas.ts):
       - Copy pattern from `server/services/wifi.ts` — use `getDatabase('dashboard_supcdt')` singleton
       - Collection: `wifi_empresas`
       - Functions: `getWifiEmpresas()`, `getWifiEmpresaById(id)`, `createWifiEmpresa(data)`, `updateWifiEmpresa(id, data)`, `deleteWifiEmpresa(id)`
       - Add `mapWifiEmpresaToApi()` helper to convert ObjectId to string.id

    3. **Create wifiEmpresas routes** (server/routes/wifiEmpresas.ts):
       - Copy pattern from `server/routes/wifi.ts`
       - Router mounted at `/api/wifi-empresas`
       - GET /, GET /:id, POST /, PUT /:id, DELETE /:id
       - All routes use `requireAuth` middleware (STATE.md pattern)
       - Admin-only for POST/PUT/DELETE via `requireAdmin` middleware

    4. **Mount router** in server/index.ts:
       - Add `import wifiEmpresasRouter from './routes/wifiEmpresas'`
       - Add `app.use('/api/wifi-empresas', wifiEmpresasRouter)` after wifi router (line ~117)

    5. **Create seed script** (server/scripts/seedWifiEmpresas.ts):
       - Copy pattern from `server/scripts/createUser.ts`
       - Seed data from CONTEXT.md (6 companies):
         ```
         uaifacil (claudio henrique, 61984272787, claudio@uaifacil.com.br)
         maiswifi/clickmidia/mfi/sr midia (bruna/rafael, 61983236748, bruna@gestãopublicidade.com.br)
         conecta (alesson Silva, 61999227775, alesson@uaisfacil.com.br)
         cleanmídia (felix silva, 991816101, felixestera@gmail.com)
         mixdftelecom (bruno melo, 61998271477, bruno@mixdftelecom.com.br)
         mobtv (pedro, 62 991584939, redes@dsgroupbr.com)
         ```
       - Run via: `tsx server/scripts/seedWifiEmpresas.ts`

    **Avoid:** Do NOT use `requireAuth` for GET routes (viewers can see companies). Only admin for mutations.
  </files>
  <verify>
    <automated>
      curl -s http://localhost:4000/api/wifi-empresas | head -c 100
      # Should return JSON array (may be empty if seed not run)
      tsx server/scripts/seedWifiEmpresas.ts
      # Should insert 6 companies
    </automated>
  </verify>
  <done>
    Types added in both src/types/wifi.ts and server/types/wifi.ts
    Service file exists with CRUD functions
    Routes file exists with GET/POST/PUT/DELETE endpoints
    Router mounted in server/index.ts
    Seed script runs successfully and inserts 6 companies
    curl returns 200 with JSON array
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Frontend — EmpresasTab, WifiPointForm Dropdown, WifiSocial Tabs</name>
  <files>
    src/components/wifi/EmpresasTab.tsx,
    src/components/wifi/WifiSocial.tsx,
    src/components/wifi/WifiPointForm.tsx
  </files>
  <action>
    1. **Create EmpresasTab.tsx** (src/components/wifi/EmpresasTab.tsx):
       - Props: `empresas: WifiEmpresa[]`, `points: WifiPoint[]`, `onCreateEmpresa`, `onEditEmpresa`, `onDeleteEmpresa`
       - Fetch `/api/wifi-empresas` on mount (use same pattern as WifiSocial fetching wifi points)
       - Use `buildWifiStatsFromPoints()` from wifi.ts for per-company aggregation
       - Card structure per company:
         ```tsx
         - Header: Company name + contact info (telefone, email)
         - KPIs: Nº pontos, velocidade média, status distribution (online/offline/instavel)
         - List: Points associated (clickable to open point detail)
         - Actions: Edit/Delete buttons (admin only)
         ```
       - Show "Pontos sem empresa" section for points with null empresaId
       - Use existing card styling: rounded-[1.35rem], divide-y, h-8 rounded-full buttons

    2. **Update WifiSocial.tsx** tabs (lines 209-227):
       - Change `type WifiView = 'mapa' | 'painel' | 'lista'` to include `'empresas'`
       - Add to tab array: `{ id: 'empresas', label: 'Empresas', icon: Building2 }`
       - Import `Building2` from lucide-react
       - Add conditional render for `view === 'empresas'`: `<EmpresasTab empresas={empresas} points={points} ... />`
       - Fetch empresas alongside points: `const [empresas, setEmpresas] = useState<WifiEmpresa[]>([])`

    3. **Update WifiPointForm.tsx** dropdown:
       - Add empresas fetch on mount: `const [empresas, setEmpresas] = useState<WifiEmpresa[]>([])`
       - Add dropdown using existing Select component pattern (lines 467-476):
         ```tsx
         <div className="space-y-2">
           <Label>Empresa responsável</Label>
           <Select
             value={form.empresaId ?? ''}
             onValueChange={(value) => setForm(current => ({ ...current, empresaId: value || null }))}
           >
             <SelectTrigger className="rounded-2xl">
               <SelectValue placeholder="Nenhuma empresa" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="">Sem empresa</SelectItem>
               {empresas.map(empresa => (
                 <SelectItem key={empresa.id} value={empresa.id}>{empresa.nome}</SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>
         ```
       - Update form type to include `empresaId?: string | null`
       - Ensure empresaId is sent in POST/PUT payload

    4. **Update WifiPoint type usage**:
       - Ensure WifiPointList and other components handle new `empresaId` field (display company name if available)

    **Avoid:** Do NOT create new Select component — use existing from shadcn/ui. Do NOT break existing tabs styling.
  </files>
  <verify>
    <automated>
      npm run build
      # Should compile without errors
    </automated>
  </verify>
  <done>
    EmpresasTab.tsx exists with company cards and point aggregation
    WifiSocial.tsx has 'empresas' tab showing EmpresasTab
    WifiPointForm.tsx has company dropdown populated from /api/wifi-empresas
    Creating point with empresaId saves correctly
    npm run build succeeds
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client→API | Untrusted input from browser |
| API→MongoDB | Authenticated operations on wifi_empresas collection |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260413-01 | S (Spoofing) | wifi-empresas routes | mitigate | requireAuth middleware on all routes, requireAdmin on mutations |
| T-260413-02 | T (Tampering) | WifiEmpresaInput | mitigate | Validate nome is non-empty string in service, trim input |
| T-260413-03 | I (Info Disclosure) | GET /api/wifi-empresas | accept | Company data is non-sensitive operational info, viewers can access |
| T-260413-04 | D (DoS) | seed script | accept | Manual script, not exposed endpoint |
| T-260413-05 | E (Elevation) | POST/PUT/DELETE | mitigate | requireAdmin middleware prevents non-admin mutations |
</threat_model>

<verification>
- Run seed script: `tsx server/scripts/seedWifiEmpresas.ts`
- curl /api/wifi-empresas returns 200 with 6 companies
- Create test point with empresaId via WifiPointForm
- Verify point shows company name in list
- EmpresasTab shows correct statistics per company
- npm run build succeeds
</verification>

<success_criteria>
- New "Empresas" tab visible in Wi-Fi Social
- CRUD operations work for companies (admin only for mutations)
- Company dropdown appears in WifiPointForm
- Points can be assigned to companies
- Company cards show aggregated statistics
- All TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/260413-ksf-adicionar-gest-o-de-empresas-no-m-dulo-w/260413-ksf-SUMMARY.md`
</output>