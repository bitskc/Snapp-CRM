# ServiceSnapp CRM - Architecture Documentation

## System Overview

ServiceSnapp CRM is a **client-side, AI-powered CRM application** built for field service businesses. The entire application runs in the browser with no backend infrastructure.

### Architecture Philosophy
- **Browser-first**: All logic executes client-side
- **Zero infrastructure**: No servers, databases, or hosting costs
- **AI-augmented**: Gemini AI handles lead discovery, analysis, and content generation
- **Progressive enhancement**: Core features work offline, AI features require internet

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              React Application (SPA)                   │ │
│  │                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │ │
│  │  │   App.tsx    │  │  LeadModal   │  │ LeadFinder  │ │ │
│  │  │  (Router &   │  │  (Details &  │  │ (AI Search) │ │ │
│  │  │   State)     │  │   AI Tools)  │  │             │ │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │ │
│  │         │                  │                  │         │ │
│  │         └──────────────────┼──────────────────┘         │ │
│  │                            │                            │ │
│  │  ┌─────────────────────────▼──────────────────────┐   │ │
│  │  │           Services Layer                        │   │ │
│  │  │  ┌────────────────┐    ┌──────────────────┐   │   │ │
│  │  │  │  crmService    │    │  geminiService   │   │   │ │
│  │  │  │  (CRUD ops)    │    │  (AI ops)        │   │   │ │
│  │  │  └────────┬───────┘    └────────┬─────────┘   │   │ │
│  │  └───────────┼──────────────────────┼─────────────┘   │ │
│  │              │                      │                  │ │
│  └──────────────┼──────────────────────┼──────────────────┘ │
│                 │                      │                    │
│  ┌──────────────▼──────┐    ┌─────────▼────────────────┐  │
│  │   localStorage      │    │   External APIs          │  │
│  │   ├─ leads          │    │   ├─ Google Gemini       │  │
│  │   ├─ settings       │    │   └─ Nominatim (OSM)     │  │
│  │   └─ products       │    │                           │  │
│  └─────────────────────┘    └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Layer 1: UI Components (React)

#### **App.tsx** - Application Shell
**Responsibilities**:
- Application routing (tab-based: Dashboard, Finder, Settings)
- Global state management (leads, settings, products)
- View mode switching (Kanban/List)
- Search and filter logic
- Lead selection and navigation

**State**:
```typescript
activeTab: 'dashboard' | 'finder' | 'settings'
viewMode: 'kanban' | 'list'
leads: Lead[]
settings: AppSettings | null
products: Product[]
selectedLead: Lead | null
searchFilter: string
needsContactFilter: boolean
sourceFilter: 'ALL' | 'MANUAL' | 'AI'
```

**Sub-components** (inline, should be extracted):
- `KanbanColumn` - Status-based columns
- `ListView` - Table view of leads

---

#### **LeadModal.tsx** - Lead Detail View
**Responsibilities**:
- Display/edit lead information
- Notes management (add, view chronological notes)
- AI-powered actions:
  - Lead analysis & scoring
  - Call script generation
  - Email generation (cold/follow-up)
  - Smart prescription execution
- Product assignment
- Status management
- Keyboard navigation (arrow keys)
- Touch gestures (swipe)

**Key Features**:
- Full-screen modal overlay
- Real-time save on any change
- Copy-to-clipboard functionality
- Email client integration
- Responsive design

---

#### **LeadFinder.tsx** - AI Discovery Interface
**Responsibilities**:
- Chat-style AI interaction
- Natural language lead search
- Display discovered leads with metadata
- Bulk lead import to CRM

**Workflow**:
1. User enters query: "Find HVAC companies in Oklahoma"
2. AI searches Google and structures results
3. Display leads with preview cards
4. User selects leads to save
5. Leads added to CRM with `source: 'AI_FINDER'`

---

#### **SettingsPage.tsx** - Configuration Panel
**Responsibilities**:
- Company profile editing
- Product catalog management
- Custom status pipeline configuration
- AI-assisted product descriptions

**Sections**:
1. **Company Info**: Name, description, sales persona
2. **Products**: CRUD for service offerings
3. **Status Pipeline**: Custom stages with colors and ordering
4. **Integrations** (placeholder): Google Sheets URL

---

#### **MapView.tsx** - Geographic Visualization
**Responsibilities**:
- Display leads on interactive map (Leaflet)
- Filter by leads with geocoded coordinates
- Cluster markers for multiple leads in same area
- Click marker to open lead details

**Dependencies**:
- Leaflet.js (external CDN)
- OpenStreetMap tiles
- Requires `latitude` and `longitude` on leads

---

#### **Layout.tsx** - Navigation Shell
**Responsibilities**:
- Top navigation bar
- Tab switching UI
- Consistent padding and structure

---

### Layer 2: Services (Business Logic)

#### **crmService.ts** - Data Persistence Layer
**Pattern**: Simulates async API calls with setTimeout delays

**Functions**:
| Function | Purpose | Storage Key |
|----------|---------|-------------|
| `fetchLeads()` | Load all leads, apply migrations | `servicesnapp_crm_data` |
| `saveLead(lead)` | Save/update lead, auto-geocode | `servicesnapp_crm_data` |
| `deleteLead(id)` | Remove lead | `servicesnapp_crm_data` |
| `addNoteToLead(id, content)` | Append note to lead | `servicesnapp_crm_data` |
| `fetchSettings()` | Load settings with defaults | `servicesnapp_crm_settings` |
| `saveSettings(settings)` | Update settings | `servicesnapp_crm_settings` |
| `fetchProducts()` | Load products catalog | `servicesnapp_crm_products` |
| `saveProduct(product)` | Save/update product | `servicesnapp_crm_products` |
| `deleteProduct(id)` | Remove product | `servicesnapp_crm_products` |

**Geocoding Logic**:
- Triggered when `lead.location` exists but coordinates are missing
- Uses Nominatim API (OpenStreetMap)
- In-memory cache to prevent duplicate lookups
- Respects rate limits (1 req/sec by user behavior)

**Data Migrations**:
```typescript
// Example: Adding productIds to old leads
return leads.map(l => ({ 
  ...l, 
  productIds: l.productIds || [] 
}));
```

---

#### **geminiService.ts** - AI/ML Layer

**Initialization**:
```typescript
// Frontend calls Supabase Edge Function (ai-gateway).
// Gemini API key is stored server-side as an edge function secret.
const { data } = await supabase.functions.invoke('ai-gateway', { body: { action, payload } });
```

**AI Functions**:

##### 1. `findLeadsWithAI(query: string)`
- **Model**: `gemini-3-pro-preview`
- **Tool**: Google Search grounding
- **Output**: Array of partial leads
- **Use case**: "Find plumbing companies in Texas"

##### 2. `generateCallScript(lead, settings, products)`
- **Model**: `gemini-3-flash-preview`
- **Output**: Markdown-formatted call script
- **Context**: Company info, lead history, selected products
- **Features**: Personalized, objection handling

##### 3. `generateEmail(lead, type, settings, products)`
- **Types**: `COLD` | `FOLLOW_UP`
- **Output**: `{ subject: string, body: string }`
- **Personalization**: Uses sales persona, lead context

##### 4. `analyzeLead(lead, settings)`
- **Output**: `{ score: number, reasoning: string, nextAction: string }`
- **Score**: 0-100 (likelihood to buy)
- **Use case**: Lead qualification

##### 5. `executePrescription(lead, settings, products, nextAction, userInstructions)`
- **Output**: `{ type: 'email' | 'script', content: string, subject?: string }`
- **Smart routing**: Determines if email or script is needed
- **Use case**: "Execute the next action for this lead"

##### 6. `generateProductDescription(productName, companyDesc)`
- **Output**: One-sentence product pitch
- **Use case**: Auto-generate descriptions for new products

**Error Handling Pattern**:
```typescript
try {
  const response = await ai.models.generateContent({...});
  return JSON.parse(response.text);
} catch (error) {
  console.error("Error:", error);
  return fallbackValue; // Never throw to UI
}
```

---

## Data Architecture

### Storage Strategy: localStorage

**Keys**:
- `servicesnapp_crm_data` - Lead records
- `servicesnapp_crm_settings` - App configuration
- `servicesnapp_crm_products` - Service catalog

**Capacity**: ~5-10MB (browser-dependent)

**Serialization**: JSON.stringify/parse

**Migration Strategy**:
- Check for missing fields on load
- Apply defaults for new properties
- Never break existing data

---

### Data Models (TypeScript)

#### Lead
```typescript
interface Lead {
  id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  status: LeadStatus;  // Customizable via StatusConfig[]
  notes: Note[];
  description?: string;
  location?: string;
  latitude?: number;      // Auto-geocoded
  longitude?: number;     // Auto-geocoded
  source: 'MANUAL' | 'AI_FINDER';
  productIds: string[];   // References Product.id
  aiAnalysis?: LeadAIAnalysis;
  createdAt: string;      // ISO 8601
}
```

#### AppSettings
```typescript
interface AppSettings {
  companyName: string;
  companyDescription: string;
  aboutMe: string;        // Sales persona
  sheetUrl?: string;      // Placeholder for future export
  statuses: StatusConfig[];
}
```

#### StatusConfig
```typescript
interface StatusConfig {
  id: string;            // e.g., 'COLD', 'WARM'
  label: string;         // Display name
  color: string;         // Tailwind color (blue, green, etc.)
  order: number;         // Pipeline position
}
```

---

## External Dependencies

### Runtime APIs

#### Google Gemini API
- **Purpose**: All AI features
- **Authentication**: API key via environment variable
- **Rate Limits**: Per Google Cloud project quotas
- **Models Used**:
  - `gemini-3-pro-preview` - Search + reasoning
  - `gemini-3-flash-preview` - Fast content generation

#### Nominatim (OpenStreetMap)
- **Purpose**: Geocoding locations to coordinates
- **Rate Limit**: 1 request/second (Usage Policy)
- **Authentication**: None (requires User-Agent header)
- **Caching**: In-memory during session

---

### Frontend Libraries

#### Core
- **React 19**: View layer
- **react-dom**: DOM rendering
- **TypeScript 5.8**: Type safety

#### UI
- **lucide-react**: Icon components
- **TailwindCSS**: Utility-first CSS (CDN)
- **Leaflet.js**: Map visualization (CDN)
- **react-markdown**: Render AI-generated content

#### Build
- **Vite 6**: Dev server, bundler, HMR
- **@vitejs/plugin-react**: React Fast Refresh

---

## Build & Deployment

### Development
```bash
npm install
# Create .env.local with:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
npm run dev  # http://localhost:3000
```

### Production Build
```bash
npm run build    # Output: dist/
npm run preview  # Test production build
```

### Deployment Targets
- **Static hosting**: Netlify, Vercel, GitHub Pages
- **Requirements**: Serve `index.html` for all routes (SPA)
- **Environment**: Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for frontend.
- **AI Secret**: Set `GEMINI_API_KEY` in Supabase Edge Function secrets.

---

## Data Flow Diagram

### Example: Saving a Lead with AI Analysis

```
User edits lead
    ↓
LeadModal.handleInputChange()
    ↓
setEditedLead({ ...lead, field: value })
    ↓
User clicks "Analyze Lead"
    ↓
LeadModal.handleAnalyzeLead()
    ↓
setAnalyzing(true)
    ↓
geminiService.analyzeLead(lead, settings)
    ↓
Google Gemini API call
    ↓
{ score: 75, reasoning: "...", nextAction: "..." }
    ↓
setEditedLead({ ...lead, aiAnalysis: result })
    ↓
saveLead(editedLead)
    ↓
crmService.saveLead()
    ↓
localStorage.setItem('servicesnapp_crm_data', JSON.stringify(leads))
    ↓
onUpdate(editedLead)
    ↓
App.handleLeadUpdate()
    ↓
setLeads(prev => prev.map(l => l.id === lead.id ? updatedLead : l))
    ↓
UI re-renders with new data
```

---

## Security Considerations

### Current State (Insecure - Demo Only)
- ❌ API key exposed in browser (process.env)
- ❌ No authentication
- ❌ No authorization
- ❌ No input validation/sanitization
- ❌ XSS vulnerable (user-generated content)
- ❌ Data visible in localStorage (no encryption)

### Production Requirements
- ✅ Move API calls to backend proxy
- ✅ Implement user authentication (OAuth, JWT)
- ✅ Validate/sanitize all inputs
- ✅ Use Content Security Policy headers
- ✅ Encrypt sensitive data
- ✅ Rate limiting on API endpoints
- ✅ HTTPS only

---

## Performance Characteristics

### Strengths
- ⚡ **Instant load**: No API roundtrips for data
- ⚡ **Fast filtering**: In-memory JavaScript
- ⚡ **No latency**: All reads from localStorage

### Bottlenecks
- 🐌 **AI calls**: 1-5 second response times
- 🐌 **Geocoding**: 1-2 second per location
- 🐌 **Large datasets**: localStorage read/parse becomes slow >1000 leads
- 🐌 **No pagination**: All leads loaded at once

### Optimization Opportunities
1. Debounce search input
2. Virtual scrolling for large lists
3. Lazy load AI features (code splitting)
4. Cache geocoding results in localStorage
5. Web Workers for heavy JSON parsing

---

## Scalability Limits

### Current Constraints
| Resource | Limit | Impact |
|----------|-------|--------|
| localStorage size | ~5-10MB | Max ~500-1000 leads |
| Browser memory | Device-dependent | Rendering performance degrades |
| API rate limits | Gemini quota | AI features may fail |
| Geocoding | 1 req/sec | Slow bulk imports |

### Migration Path to Scale
1. **Phase 1**: Add backend API to replace localStorage
2. **Phase 2**: Implement pagination and incremental loading
3. **Phase 3**: Server-side AI processing with caching
4. **Phase 4**: Real-time sync (WebSockets) for team collaboration

---

## Testing Strategy

### Current State
- ❌ No unit tests
- ❌ No integration tests
- ❌ No E2E tests
- ❌ No type tests beyond TypeScript compiler

### Recommended Test Coverage
1. **Unit**: Services layer (crmService, geminiService)
2. **Integration**: Component + service interactions
3. **E2E**: Critical user flows (Playwright/Cypress)
4. **Visual**: Storybook for component library
5. **Type safety**: Exhaustiveness checking for unions

---

## Architectural Decisions

### Why Client-Side Only?
**Pros**:
- Zero hosting costs
- Instant deployment (static files)
- No backend complexity
- Built-in privacy (data never leaves browser)

**Cons**:
- No multi-device sync
- No team collaboration
- Data loss if localStorage cleared
- API key security impossible

**Verdict**: Acceptable for demo/prototype, not production

---

### Why localStorage over IndexedDB?
**Pros**:
- Simpler API
- Synchronous reads (easier state management)
- JSON-friendly

**Cons**:
- Size limits
- No structured queries
- Slower for large datasets

**Verdict**: Good enough for POC, migrate to IndexedDB if scaling

---

### Why Gemini over Other AI?
**Pros**:
- Google Search integration (grounding)
- Structured output (JSON schemas)
- Multimodal (future: image analysis)
- Competitive pricing

**Cons**:
- Vendor lock-in
- Rate limits
- Variable response times

**Verdict**: Best fit for lead discovery + content generation

---

## Future Architecture Vision

### Proposed: Hybrid Architecture
```
┌─────────────────────────────────────────────┐
│          Frontend (React SPA)               │
│  ├─ Offline-first design                   │
│  ├─ Service Worker caching                 │
│  └─ IndexedDB for local state              │
└──────────────┬──────────────────────────────┘
               │ HTTPS/WSS
┌──────────────▼──────────────────────────────┐
│        Backend (Node.js/Python)            │
│  ├─ REST API (CRUD operations)             │
│  ├─ WebSocket (real-time updates)          │
│  └─ Job Queue (background AI processing)   │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│         Persistence Layer                   │
│  ├─ PostgreSQL (relational data)           │
│  ├─ Redis (caching, sessions)              │
│  └─ S3 (file storage)                       │
└─────────────────────────────────────────────┘
```

### Migration Strategy
1. **Dual-write period**: Keep localStorage + add API calls
2. **Feature flag**: Gradually shift users to backend
3. **Export/import**: Allow data portability
4. **Deprecation**: Remove localStorage after full migration

---

## Conclusion

This architecture prioritizes **rapid prototyping** and **AI experimentation** over production readiness. It's an excellent foundation for:
- Validating product-market fit
- Demoing to potential customers  
- Iterating on AI features quickly

Before production launch, address:
1. Backend API integration
2. Security hardening
3. Scalability improvements
4. Test coverage
5. Error monitoring
