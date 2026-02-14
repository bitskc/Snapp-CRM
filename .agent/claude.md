# Claude Development Guide - Snapp-CRM

This guide is optimized for Claude (Anthropic's AI assistant) working on the Snapp-CRM codebase.

---

## Quick Context Loading

When starting a new conversation:
1. Read `agents.md` first for full project overview
2. Check `ISSUES.md` for known problems (created during initial review)
3. Review `ARCHITECTURE.md` for system design details
4. Examine `types.ts` for current data models

---

## Project Mental Model

Think of this application as **three layers**:

### 1. **Data Layer** (services/)
- All data lives in browser localStorage
- `crmService.ts` = CRUD operations (like a mini ORM)
- `geminiService.ts` = AI/ML operations (external API calls)
- No real backend, no database, no authentication

### 2. **State Layer** (App.tsx)
- React state (`useState`) holds runtime data
- Main states: `leads[]`, `settings`, `products[]`
- Filtered views computed on-the-fly (no caching)
- State flows down via props, updates bubble up via callbacks

### 3. **UI Layer** (components/)
- **Layout**: Shell with navigation
- **Dashboard** (in App.tsx): Kanban/List views
- **LeadModal**: Deep-dive into single lead + AI tools
- **LeadFinder**: AI-powered discovery interface
- **SettingsPage**: Configuration management
- **MapView**: Geographic visualization

---

## Critical Files to Understand

### `types.ts` - Source of Truth
**ALWAYS** check this file first when:
- Adding new features (does the data model support it?)
- Seeing TypeScript errors (is the type definition correct?)
- Understanding relationships (which entities reference which?)

Key interfaces:
```typescript
Lead          // The core entity
AppSettings   // User configuration + company info
Product       // Services/products offered
StatusConfig  // Custom pipeline stages
```

### `App.tsx` - The Brain
This file does **too much** (common issue):
- Routing logic (tab switching)
- Data fetching and caching
- View mode switching (Kanban vs List)
- Filter logic
- Lead navigation (next/prev)
- Inline KanbanColumn and ListView components (should be extracted)

**When modifying**: Be careful with state updates, ensure `filteredLeads` logic stays in sync

### `geminiService.ts` - The AI Core
Every function here:
1. Constructs a detailed prompt with context
2. Calls Gemini API with JSON schema
3. Parses response
4. Returns typed data

**Pattern**: 
```typescript
export const aiFunction = async (params) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-*",
      contents: "detailed prompt with context",
      config: { responseSchema: {...} }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error:", error);
    return fallbackValue;
  }
};
```

---

## Common Development Tasks

### Adding a New Field to Leads

1. **Update types.ts**:
   ```typescript
   export interface Lead {
     // ... existing fields
     newField?: string;  // Make optional for backward compat
   }
   ```

2. **Update crmService.ts** (if migration needed):
   ```typescript
   export const fetchLeads = async () => {
     const leads = JSON.parse(stored);
     return leads.map(l => ({ 
       ...l, 
       newField: l.newField || 'default'  // Migration
     }));
   };
   ```

3. **Update UI** (LeadModal, Kanban cards, etc.)

4. **Update AI prompts** (if field should influence AI behavior)

### Adding a New AI Feature

1. **Create function in geminiService.ts**:
   ```typescript
   export const newAIFeature = async (
     lead: Lead, 
     settings: AppSettings
   ): Promise<ReturnType> => {
     const response = await ai.models.generateContent({
       model: "gemini-3-flash-preview",
       contents: `Context: ${settings.companyName}...`,
       config: {
         responseMimeType: "application/json",
         responseSchema: { ... }
       }
     });
     return JSON.parse(response.text);
   };
   ```

2. **Add UI trigger** (button in LeadModal)

3. **Add loading state**:
   ```typescript
   const [isLoading, setIsLoading] = useState(false);
   ```

4. **Handle errors gracefully** (don't break UX if AI fails)

### Adding a New Component

1. Create in `components/ComponentName.tsx`
2. Export default function with typed props interface
3. Import in App.tsx or parent component
4. Follow existing patterns (Tailwind dark mode styling)

---

## Code Patterns to Follow

### State Updates (Immutability)
```typescript
// ✅ CORRECT
setLeads(prev => prev.map(l => 
  l.id === targetId ? { ...l, field: newValue } : l
));

// ❌ WRONG
const lead = leads.find(l => l.id === targetId);
lead.field = newValue;  // Mutates state directly
```

### Async Operations
```typescript
// ✅ CORRECT
const handleAction = async () => {
  setIsLoading(true);
  try {
    const result = await apiCall();
    setState(result);
  } catch (error) {
    console.error("Action failed:", error);
    // Optionally show user-facing error
  } finally {
    setIsLoading(false);
  }
};

// ❌ WRONG
const handleAction = async () => {
  const result = await apiCall();  // No error handling
  setState(result);
};
```

### Conditional Rendering
```typescript
// ✅ CORRECT (with loading/error states)
{isLoading ? (
  <Loader2 className="animate-spin" />
) : error ? (
  <div>Error: {error}</div>
) : (
  <ActualContent data={data} />
)}
```

---

## Debugging Tips for Claude

### When Users Report Bugs

1. **Check localStorage structure**:
   ```javascript
   // Ask user to run in console:
   console.log(JSON.parse(localStorage.getItem('servicesnapp_crm_data')));
   ```

2. **Verify API key**:
   ```javascript
   console.log(process.env.API_KEY ? 'Set' : 'Missing');
   ```

3. **Check for errors**:
   - Look at browser console errors
   - Check Network tab for failed API calls
   - Verify TypeScript compilation (no build errors)

### When Making Changes

1. **Always test both views**: Kanban AND List
2. **Test filtering**: Ensure new fields work with search
3. **Test AI fallbacks**: What happens if API call fails?
4. **Test empty states**: No leads, no products, etc.
5. **Test localStorage**: Does data persist after refresh?

---

## Anti-Patterns to Avoid

### ❌ Don't Do This:
```typescript
// Hardcoding status values (should use settings.statuses)
if (lead.status === 'COLD') { ... }

// Forgetting to save to localStorage
setLeads(updatedLeads);  // Only updates React state!

// Not handling undefined/null
const name = lead.contactName.split(' ')[0];  // Crash if null

// Blocking the UI
for (let i = 0; i < leads.length; i++) {
  await expensiveOperation(leads[i]);  // Should batch or parallelize
}
```

### ✅ Do This Instead:
```typescript
// Use dynamic status checking
const coldStatus = settings.statuses.find(s => s.id === lead.status);

// Save to localStorage AND update state
const updated = [...leads, newLead];
await saveLead(newLead);  // Persists to localStorage
setLeads(updated);

// Safe property access
const name = lead.contactName?.split(' ')[0] || 'Unknown';

// Non-blocking async
await Promise.all(leads.map(l => expensiveOperation(l)));
```

---

## Testing Workflow

Since there are no automated tests, manual testing is critical:

### Before Committing
1. ✅ Run `npm run dev` - no errors
2. ✅ Test feature in Kanban view
3. ✅ Test feature in List view
4. ✅ Test with empty localStorage (clear data)
5. ✅ Test with existing data (seed data)
6. ✅ Test AI features (with valid API key)
7. ✅ Test offline (should work except AI/geocoding)
8. ✅ Check browser console (no errors)
9. ✅ Test responsive design (mobile viewport)

### Browser Compatibility
- ✅ Chrome/Edge (primary target)
- ✅ Firefox
- ✅ Safari (test importmap support)
- ✅ Mobile browsers (touch events)

---

## Environment Setup

### Quick Start
```bash
cd /home/andy/Documents/GitHub/Snapp-CRM
npm install
echo 'GEMINI_API_KEY=your_key_here' > .env.local
npm run dev
```

### Environment Variables
- `GEMINI_API_KEY` - Required for all AI features
- Loaded via Vite's `loadEnv()`
- Injected as `process.env.API_KEY` in browser

### Build Process
```bash
npm run build    # Production build → dist/
npm run preview  # Preview production build
```

---

## Key Dependencies

### Runtime
- **React 19**: Latest stable, uses new features
- **@google/genai**: Official Gemini SDK (v1.41+)
- **lucide-react**: Icon library (tree-shakeable)
- **react-markdown**: Render AI-generated markdown
- **Leaflet**: Map visualization (external CDN)
- **TailwindCSS**: Via CDN (not npm)

### Dev
- **Vite**: Dev server + bundler
- **TypeScript**: Type checking (strict mode)
- **@vitejs/plugin-react**: React support

### External (CDN)
- Leaflet.js (maps)
- TailwindCSS (styling)
- Google Fonts (Inter)

---

## Recommended Improvements

When user asks "what should we fix?", prioritize:

1. **Critical** (breaks functionality):
   - Fix duplicate App.tsx issue
   - Add .env.local file
   - Proper error boundaries

2. **High Priority** (UX/performance):
   - Extract inline components from App.tsx
   - Add loading skeletons
   - Debounce search input
   - Cache geocoding results properly

3. **Medium Priority** (code quality):
   - Add PropTypes or Zod validation
   - Split large components
   - Add JSDoc comments
   - Consistent error handling

4. **Low Priority** (nice-to-have):
   - Dark/light mode toggle
   - Keyboard shortcuts
   - Export/import data
   - Undo/redo functionality

---

## Communication Tips

### When Asking for Clarification
Be specific:
- "Should this feature work with existing leads or only new ones?"
- "Do you want this to persist to localStorage or just UI state?"
- "Should the AI call block the UI or happen in background?"

### When Explaining Changes
Use concrete examples:
- "I moved the KanbanColumn component from App.tsx (line 11-70) to components/KanbanColumn.tsx"
- "The new field `priority` is optional (?) for backward compatibility"
- "This change affects 3 files: types.ts, LeadModal.tsx, and crmService.ts"

### When Encountering Issues
Provide context:
- "The build fails because X imports Y but Y doesn't export Z"
- "This would work but it breaks the existing filter logic on line 169"
- "We need to update the localStorage migration in crmService.ts:99"

---

## Quick Reference: File Purposes

| File | Purpose | Modify When... |
|------|---------|----------------|
| `types.ts` | Type definitions | Adding/changing data structures |
| `App.tsx` | Main app logic | Changing views, filters, routing |
| `crmService.ts` | Data persistence | Changing storage logic |
| `geminiService.ts` | AI features | Adding AI capabilities |
| `LeadModal.tsx` | Lead details + AI tools | Enhancing lead interactions |
| `LeadFinder.tsx` | AI discovery | Changing search flow |
| `SettingsPage.tsx` | Configuration | Adding settings |
| `Layout.tsx` | Navigation shell | Changing app structure |
| `MapView.tsx` | Map visualization | Map-related features |
| `vite.config.ts` | Build config | Changing ports, aliases, env vars |
| `index.html` | HTML template | CDN imports, global styles |
| `package.json` | Dependencies | Adding/updating packages |

---

## Final Notes

This is a **demo/prototype application**. The code prioritizes:
1. **Speed of development** over robustness
2. **Feature completeness** over code organization  
3. **Working demos** over production readiness

When contributing, maintain this spirit but gradually improve quality. Don't over-engineer, but do fix critical issues.

**The goal**: Keep it simple, keep it working, make it better incrementally.
