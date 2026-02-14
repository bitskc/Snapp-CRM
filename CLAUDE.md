# CLAUDE.md - AI Assistant Guide for ServiceSnapp CRM

## Project Overview

ServiceSnapp CRM is an AI-powered, browser-based Customer Relationship Management application for field service businesses (HVAC, Plumbing, Electrical, etc.). It runs as a React 19 + TypeScript SPA with a Supabase backend and Google Gemini AI integration for lead discovery, scoring, and content generation.

## Tech Stack

- **Frontend:** React 19, TypeScript 5.8, React Router v7
- **Build:** Vite 6 (dev server on port 3000)
- **Styling:** Tailwind CSS v3 (loaded via CDN in `index.html`), dark theme hardcoded
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **AI:** Google Gemini 3 Flash Preview (via Supabase Edge Function `ai-gateway`)
- **Maps:** Leaflet.js (via CDN), Nominatim/OpenStreetMap for geocoding
- **Drag & Drop:** @dnd-kit
- **Icons:** lucide-react

## Quick Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
```

## Environment Variables

Required in `.env.local`:
```
GEMINI_API_KEY=<Google Gemini API key>
VITE_SUPABASE_URL=<Supabase project URL>
VITE_SUPABASE_ANON_KEY=<Supabase anonymous key>
```

Vite injects `GEMINI_API_KEY` as both `process.env.API_KEY` and `process.env.GEMINI_API_KEY` (see `vite.config.ts`).

## Project Structure

```
/
├── App.tsx                  # Root component: AuthProvider → CRMProvider → Router
├── index.tsx                # React DOM entry point
├── types.ts                 # All TypeScript interfaces (Lead, Note, Product, etc.)
├── index.html               # HTML template (loads Tailwind, Leaflet, Google Fonts via CDN)
├── vite.config.ts           # Vite config (port 3000, path alias @/, env injection)
├── tsconfig.json            # TypeScript config (ES2022, react-jsx, @/* path alias)
│
├── components/              # React UI components
│   ├── ErrorBoundary.tsx    # Global error boundary
│   ├── Layout.tsx           # Navigation shell (desktop sidebar + mobile bottom nav)
│   ├── Login.tsx            # Auth UI (signin, signup, magic link, password reset)
│   ├── LeadModal.tsx        # Lead detail view/editor with AI features (largest: ~760 LOC)
│   ├── LeadFinder.tsx       # AI-powered lead discovery chat interface
│   ├── KanbanBoard.tsx      # Drag-and-drop pipeline board
│   ├── KanbanColumn.tsx     # Individual status column for kanban
│   ├── LeadCard.tsx         # Lead display card
│   ├── SortableLeadCard.tsx # Draggable wrapper for LeadCard
│   ├── ListView.tsx         # Table/list view of leads
│   ├── MapView.tsx          # Leaflet map visualization
│   ├── ImportModal.tsx      # Bulk lead import via AI parsing
│   ├── SettingsPage.tsx     # Company, product, and status configuration
│   └── ToastContainer.tsx   # Toast notification system
│
├── contexts/                # React Context providers
│   ├── AuthContext.tsx       # Supabase auth state (user, session, loading)
│   └── CRMContext.tsx        # Global CRM state (leads, settings, products, toasts)
│
├── pages/                   # Route page wrappers
│   ├── Dashboard.tsx        # Main pipeline view (kanban/list/map, filtering, sorting)
│   ├── Finder.tsx           # Lead discovery page
│   └── Settings.tsx         # Settings page
│
├── services/                # Business logic and API calls
│   ├── crmService.ts        # CRUD for leads, products, settings + geocoding
│   ├── geminiService.ts     # AI operations via Supabase edge function
│   └── supabaseClient.ts    # Supabase client initialization
│
├── hooks/                   # Custom React hooks
│   ├── useClickOutside.ts   # Click outside detection
│   └── useDebounce.ts       # Input debouncing (300ms)
│
├── utils/
│   └── validation.ts        # Email, phone, URL, and lead validation
│
└── supabase/
    └── functions/
        └── ai-gateway/
            └── index.ts     # Deno edge function: secure proxy to Gemini API
```

## Architecture

### Component Hierarchy

```
App (AuthProvider)
└── AppContent
    ├── Login (when unauthenticated)
    └── CRMProvider → BrowserRouter → Layout
        ├── DashboardPage (/)
        │   ├── KanbanBoard → KanbanColumn → SortableLeadCard → LeadCard
        │   ├── ListView
        │   ├── MapView
        │   ├── LeadModal (selected lead detail)
        │   └── ImportModal
        ├── FinderPage (/finder)
        │   └── LeadFinder
        └── SettingsPageRoute (/settings)
            └── SettingsPage
        ToastContainer (global)
```

### Routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | DashboardPage | Main lead pipeline (kanban, list, map views) |
| `/finder` | FinderPage | AI-powered lead discovery chat |
| `/settings` | SettingsPageRoute | Company settings, products, statuses |
| `*` | Redirect to `/` | 404 fallback |

### State Management

- **AuthContext** provides `user`, `loading`, `signIn`, `signUp`, `signOut`, `resetPassword`
- **CRMContext** provides `leads`, `settings`, `products`, `finderMessages`, `toasts`, and CRUD operations
- Local component state for UI concerns (filters, sorting, modals, view mode)
- No external state library (Redux, Zustand, etc.)

### Data Flow

1. CRMContext loads leads/settings/products from Supabase on mount
2. Components read from context and render
3. User actions trigger context methods → service calls → Supabase updates → state refresh
4. AI features route through `geminiService.ts` → Supabase Edge Function (`ai-gateway`) → Gemini API

### Database Tables (Supabase)

| Table | Key Columns |
|-------|-------------|
| `leads` | id, user_id, company_name, contact_name, email, phone, website, location, latitude, longitude, status, description, source, ai_analysis, match_score |
| `notes` | id, lead_id, content, type, user_id |
| `products` | id, user_id, name, description |
| `lead_products` | lead_id, product_id (join table) |
| `settings` | id, user_id, company_name, company_description, about_me, statuses |

Row-Level Security (RLS) enforces per-user data isolation.

### AI Gateway (Edge Function)

The Supabase edge function at `supabase/functions/ai-gateway/index.ts` is a Deno-based secure proxy. It supports these actions:

- `find_leads` - Search for businesses with Google Search grounding
- `generate_content` - General content generation (emails, social posts, call scripts)
- `analyze_lead` - Lead scoring and analysis
- `parse_import` - Parse bulk import data into structured leads

All requests require a valid JWT Bearer token.

## Key Data Types

Defined in `types.ts`:

- **Lead** - Core entity: company info, contact details, status, notes, AI analysis, geolocation
- **Note** - Text entries attached to leads
- **Product** - Services/products the business offers
- **AppSettings** - Company profile, description, persona, custom statuses
- **StatusConfig** - Pipeline status (label, color, order)
- **ChatMessage** - AI finder conversation messages
- **LeadAIAnalysis** - AI scoring (score, reasoning, nextAction)
- **LeadStatus** - Type alias for `string` (user-configurable statuses)

## Code Conventions

### Component Patterns

```typescript
// Named exports for components
export const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => { ... }

// Props interfaces defined above component in same file
interface ComponentNameProps {
  data: Type;
  onEvent: (arg: Type) => void;
}
```

### Naming

- **Components:** PascalCase (`LeadModal.tsx`, `KanbanBoard.tsx`)
- **Services:** camelCase (`crmService.ts`, `geminiService.ts`)
- **Hooks:** `use` prefix (`useClickOutside.ts`, `useDebounce.ts`)
- **Types/Interfaces:** PascalCase (`Lead`, `AppSettings`, `StatusConfig`)
- **Database columns:** snake_case (`company_name`, `user_id`)
- **TypeScript properties:** camelCase (`companyName`, `userId`)

### Styling

- Tailwind CSS utility classes applied directly in JSX
- Dark theme using slate color palette: `slate-950` (bg), `slate-900` (cards), `slate-800` (borders)
- Brand accent color: `brand-500`
- No CSS modules or styled-components
- Responsive: mobile bottom nav, desktop sidebar (breakpoint in Layout.tsx)

### Error Handling

- `ErrorBoundary` component wraps the app for React render errors
- Try-catch blocks in service functions with console.error logging
- Toast notifications for user-facing feedback (`CRMContext.addToast`)
- Fallback values returned on service failures

### Async Patterns

- All API calls are `async/await` with try-catch
- `useEffect` for data fetching on mount
- Loading states via boolean flags (`isLoading`, `isThinking`)
- No request cancellation or abort controllers currently

## What's NOT in the Project

- **No testing framework** - No Jest, Vitest, Playwright, or any test files
- **No linting/formatting** - No ESLint or Prettier configuration
- **No CI/CD** - No GitHub Actions or deployment pipelines
- **No pre-commit hooks** - No husky or lint-staged
- **No SSR** - Pure client-side SPA
- **No external state library** - Context API only

## External Dependencies (CDN)

These are loaded via `<script>` and `<link>` tags in `index.html`, not via npm:
- Tailwind CSS v3
- Leaflet.js (maps)
- Google Fonts (Inter)

## Common Tasks for AI Assistants

### Adding a new component
1. Create file in `components/` with PascalCase naming
2. Use `React.FC<Props>` pattern with interface above the component
3. Style with Tailwind utility classes (dark theme: slate palette)
4. Import and use in the relevant page or parent component

### Adding a new route
1. Create page wrapper in `pages/`
2. Add `<Route>` in `App.tsx` inside the `<Routes>` block
3. Add navigation link in `components/Layout.tsx`

### Adding a new AI action
1. Add the action handler in `supabase/functions/ai-gateway/index.ts` (Deno)
2. Add corresponding function in `services/geminiService.ts`
3. Call from component via the service function

### Adding a new database table
1. Create table in Supabase dashboard with RLS policies
2. Add CRUD functions in `services/crmService.ts`
3. Add TypeScript interface in `types.ts`
4. Integrate into `CRMContext.tsx` if global state is needed

### Modifying lead properties
1. Update the `Lead` interface in `types.ts`
2. Update `crmService.ts` for database mapping (camelCase ↔ snake_case)
3. Update `LeadModal.tsx` for display/editing
4. Update any affected components (LeadCard, ListView, etc.)

## Path Aliases

TypeScript and Vite both resolve `@/*` to the project root:
```typescript
import { Lead } from '@/types';
import { fetchLeads } from '@/services/crmService';
```

## Performance Notes

- Search input is debounced at 300ms (`useDebounce` hook)
- Leads are paginated at 50 per page
- Geocoding results are cached in-memory during session
- AI calls take 1-5 seconds (external API latency)
- No virtualization for large lists currently
