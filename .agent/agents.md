# Snapp-CRM AI Agent Guide

## Project Overview

**ServiceSnapp CRM** is a modern, AI-powered Customer Relationship Management application designed for field service businesses (HVAC, Plumbing, Electrical). It combines traditional CRM functionality with AI-driven lead discovery, analysis, and sales automation.

### Technology Stack
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: TailwindCSS (CDN)
- **AI/ML**: Google Gemini API (gemini-3-pro-preview, gemini-3-flash-preview)
- **Data Storage**: LocalStorage (client-side only)
- **Maps**: Leaflet.js with OpenStreetMap
- **Icons**: Lucide React

### Current State
This is a **proof-of-concept/demo application** that runs entirely in the browser with no backend. It uses localStorage for persistence and external APIs for AI and geocoding.

---

## Application Architecture

### Core Components

#### 1. **App.tsx** (Main Container)
- Manages application state (leads, settings, products)
- Provides tab navigation (Dashboard, Finder, Settings)
- Implements Kanban and List view modes
- Handles filtering and search logic

#### 2. **LeadModal.tsx** (Lead Details & Actions)
- Full-screen modal for viewing/editing lead details
- AI-powered features:
  - Lead scoring and analysis
  - Call script generation
  - Email generation (cold/follow-up)
  - Smart action prescriptions
- Keyboard navigation support
- Swipe gestures for mobile

#### 3. **LeadFinder.tsx** (AI Lead Discovery)
- Chat-style interface for AI-powered lead research
- Uses Google Search Grounding to find real businesses
- Allows users to save discovered leads to CRM

#### 4. **SettingsPage.tsx** (Configuration)
- Company profile settings
- Product/service catalog management
- Custom status pipeline configuration
- AI description generation for products

#### 5. **Layout.tsx** (Shell)
- Navigation bar with tab switching
- Responsive layout container

#### 6. **MapView.tsx** (Geographic Visualization)
- Displays leads on an interactive map
- Requires leads to have geocoded coordinates

### Services Layer

#### **crmService.ts**
Handles all data persistence operations:
- `fetchLeads()` / `saveLead()` / `deleteLead()`
- `fetchSettings()` / `saveSettings()`
- `fetchProducts()` / `saveProduct()` / `deleteProduct()`
- `addNoteToLead()`
- Automatic geocoding via Nominatim (OpenStreetMap)

#### **geminiService.ts**
All AI functionality powered by Google Gemini:
- `findLeadsWithAI()` - Business discovery with Google Search
- `generateCallScript()` - Personalized sales scripts
- `generateEmail()` - Cold/follow-up email generation
- `analyzeLead()` - Lead scoring and qualification
- `executePrescription()` - Smart next-action content generation
- `generateProductDescription()` - AI product descriptions

### Data Models (types.ts)

```typescript
// Core entities
Lead, Note, Product, AppSettings, StatusConfig
LeadAIAnalysis, ChatMessage

// Lead sources
'MANUAL' | 'AI_FINDER'

// Lead statuses (customizable)
Default: 'COLD' | 'WARM' | 'LIVE' | 'DEAD'
```

---

## Key Features & Workflows

### 1. **AI Lead Discovery**
User enters a query like "find HVAC companies in Oklahoma City" → AI uses Google Search → Returns structured lead data → User can save to CRM

### 2. **Lead Management**
- Kanban board view (organized by status)
- List view (table format)
- Search and filtering (by source, contact status)
- Custom status pipelines

### 3. **AI Sales Assistance**
- **Analyze Lead**: Scores lead quality (0-100) and suggests next action
- **Generate Script**: Creates personalized phone call scripts
- **Generate Email**: Writes cold/follow-up emails
- **Execute Prescription**: Generates specific content based on AI recommendations

### 4. **Product Assignment**
Leads can be tagged with relevant products/services to personalize AI-generated content

---

## Development Guidelines

### Code Style
- **TypeScript**: Strict mode, full type annotations
- **React**: Functional components with hooks
- **State Management**: Local state (useState), no global state library
- **Async Patterns**: async/await with proper error handling

### File Organization
```
/
├── App.tsx              # Main application container
├── index.tsx            # React entry point
├── types.ts             # Shared TypeScript definitions
├── components/          # UI components
│   ├── Layout.tsx
│   ├── LeadModal.tsx
│   ├── LeadFinder.tsx
│   ├── SettingsPage.tsx
│   └── MapView.tsx
└── services/            # Business logic & external APIs
    ├── crmService.ts    # Data persistence
    └── geminiService.ts # AI functionality
```

### Component Patterns
- Components are self-contained with local state
- Props are typed with explicit interfaces
- Event handlers prefixed with `handle*`
- Loading states managed with boolean flags
- Error handling via try/catch with console.error fallbacks

### Styling Conventions
- TailwindCSS utility classes
- Dark mode first (slate color palette)
- Custom brand colors defined in index.html
- Responsive design (mobile-first approach)
- Custom scrollbar styles for Kanban views

---

## AI Agent Development Tips

### When Adding Features
1. **Maintain the localStorage pattern**: All data must serialize to JSON
2. **Preserve AI context**: Pass `settings` and `products` to all AI functions for personalization
3. **Keep it client-side**: No backend dependencies
4. **Follow the existing type system**: Update `types.ts` when adding new data structures

### When Working with AI Features
- All Gemini calls use structured output (JSON schemas)
- API key loaded from environment: `process.env.API_KEY`
- Models in use:
  - `gemini-3-pro-preview` for search-grounded discovery
  - `gemini-3-flash-preview` for content generation
- Always provide context (company info, user persona, lead history)

### Common Patterns
```typescript
// Saving data
const updatedLead = { ...lead, field: newValue };
await saveLead(updatedLead);
setLeads(prev => prev.map(l => l.id === lead.id ? updatedLead : l));

// AI generation with loading state
setIsGenerating(true);
try {
  const result = await generateSomething(params);
  setContent(result);
} catch (error) {
  console.error("Error:", error);
} finally {
  setIsGenerating(false);
}
```

### Testing Locally
```bash
npm install
# Create .env.local with: GEMINI_API_KEY=your_key_here
npm run dev
# Visit http://localhost:3000
```

---

## Known Limitations & Technical Debt

### Critical Issues
1. **No environment file**: `.env.local` is missing from repository
2. **Duplicate App.tsx**: Two App.tsx files exist (root and components/)
3. **No backend**: All data lost on browser clear
4. **API key exposure**: Key visible in browser (process.env)
5. **Rate limiting**: No throttling on external API calls (Nominatim, Gemini)

### Architectural Concerns
- localStorage size limits (~5-10MB)
- No authentication/multi-user support
- No data export/import functionality
- Geocoding happens on every save (should cache)
- No offline support beyond localStorage

### See ISSUES.md for detailed analysis

---

## Future Enhancements

### Recommended Next Steps
1. **Backend Integration**: Replace localStorage with a proper database
2. **Authentication**: Add user accounts and permissions
3. **Real CRM Integrations**: Connect to HubSpot, Salesforce, etc.
4. **Email Integration**: Actually send emails instead of just generating them
5. **Analytics Dashboard**: Lead conversion tracking, pipeline metrics
6. **Mobile App**: React Native version
7. **Team Collaboration**: Shared leads, task assignments
8. **Scheduled Follow-ups**: Reminder system for "Needs Contact Today"

---

## Important Conventions

### When modifying this codebase:
- ✅ **DO** maintain backward compatibility with localStorage data
- ✅ **DO** add loading states for all async operations
- ✅ **DO** provide fallback UI when AI calls fail
- ✅ **DO** update types.ts when changing data structures
- ✅ **DO** test with and without API key configured
- ❌ **DON'T** introduce breaking changes to data schema without migration logic
- ❌ **DON'T** add npm dependencies without updating package.json
- ❌ **DON'T** hardcode API keys or sensitive data
- ❌ **DON'T** remove backward compatibility for existing localStorage keys

---

## Getting Help

### Debug Checklist
1. Check browser console for errors
2. Verify `GEMINI_API_KEY` in .env.local
3. Check localStorage (DevTools → Application → Local Storage)
4. Test with browser extensions disabled (some block external scripts)
5. Clear localStorage if data corruption suspected: `localStorage.clear()`

### Common Issues
- **"API key not configured"**: Missing or incorrect `.env.local`
- **Leads not appearing**: Check localStorage, verify JSON format
- **AI features not working**: API key issue or network connectivity
- **Map not loading**: Check Leaflet CDN, verify coordinates exist
- **TypeScript errors**: Run `npm install` to ensure types are installed
