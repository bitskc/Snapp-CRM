# 🚀 Snapp-CRM Architecture & Code Review
**Status:** Post-Phase 2 Implementation (Auth & Routing)
**Date:** 2026-02-14

## 1. 🏗️ Software Architect Review
**Focus:** System Design, Security, Scalability

### ✅ Strengths
-   **Supabase RLS (Row Level Security):** This is the strongest part of the architecture. By enforcing isolation at the database level (`user_id = auth.uid()`), we have effectively mitigated 99% of data leak risks. Even if the frontend code has bugs, user A cannot query user B's data.
-   **SPA Architecture (Vite + React Router):** Good choice for a highly interactive "dashboard" application. The recent refactor to true routing (`/finder`, `/settings`) significantly improves the user experience and linkability.

### ⚠️ Critical Concerns (P0)
-   **API Key Exposure:** The Google Gemini API key is currently accessed via `import.meta.env` in client-side code.
    -   *Risk:* A malicious user can inspect the network traffic or source code, steal the key, and incur costs on your quota.
    -   *Recommendation:* This **MUST** be moved to a backend proxy. Since we are using Supabase, **Supabase Edge Functions** are the natural choice. We should create an endpoint that handles the AI request and holds the secret key server-side.

---

## 2. 👨‍💻 Lead Engineer Review
**Focus:** Code Quality, Maintainability, Technical Debt

### ✅ Strengths
-   **Component Modularization:** Extracting `Dashboard.tsx`, `Finder.tsx`, and `Settings.tsx` into `pages/` has greatly reduced the complexity of `App.tsx`.
-   **Service Layer Pattern:** `crmService.ts` provides a clean abstraction over Supabase. It makes swapping the backend (hypothetically) or adding caching much easier.

### ⚠️ Recommendations (P1)
-   **State Management Scalability:** We are currently fetching **ALL** leads in `App.tsx` on load.
    -   *Issue:* As a user grows to 1,000+ leads, this will slow down initial load significantly.
    -   *Fix:* Implement **server-side pagination** in `crmService.ts` and infinite scroll on the Dashboard.
-   **"Prop Drilling":** Data (`leads`, `products`) is being passed down 3-4 levels deep (App -> Dashboard -> LeadModal).
    -   *Fix:* Introduce a global `LeadsContext` or use a lightweight state manager like **Zustand** to avoid passing props through intermediate components.

---

## 3. 🎨 UI/UX/AX Expert Review
**Focus:** Usability, Accessibility (A11y), User Flow

### ✅ Strengths
-   **Visual Consistency:** The dark mode palette (Slate/Indigo) is professional and easy on the eyes for long work sessions.
-   **Mobile Responsiveness:** The new `Layout.tsx` handles mobile navigation gracefully.

### ❌ Accessibility Failures (P2)
-   **Modal Accessibility:** fast-fail.
    -   The `LeadModal` does not **trap focus**. A keyboard user tabbing through the modal will eventually tab *behind* it into the main page.
    -   **Missing ARIA Labels:** Buttons like "Close" (X icon) or "Edit" (Pencil icon) have no text labels. Screen reader users will just hear "Button".
    -   *Fix:* Add `aria-label="Close modal"` etc., and implement a focus trap.

### ⚠️ UX Friction
-   **Optimistic UI Sync:** When dragging a card in Kanban, if the network request fails, the card snaps back abruptly. We need better error toasts/feedback.

---

## 4. 🕵️ QA Team Review
**Focus:** Bugs, Edge Cases, Reliability

### ⚠️ Identified Risks
1.  **Concurrent Edits:** If User A opens a lead, waits 10 mins, and User B (or the same user on another tab) updates it, User A's save will overwrite User B's changes without warning.
    -   *Fix:* Implement "Last Updated" checks or Realtime subscriptions.
2.  **Network Resilience:** If the user loses internet while using the AI Finder, the app currently provides minimal feedback.
3.  **Data Integrity:** The import functionality relies on AI parsing. It is non-deterministic.
    -   *Test Case:* Import a CSV with 100 messy rows. Validate how many are dropped or malformed.

---

## 🏁 Consolidated Action Plan

### **Immediate (Sprint 1)**
1.  **[Security]** Migrate `geminiService` calls to **Supabase Edge Functions** to hide API Key.
2.  **[AX]** Fix Accessibility in `LeadModal` (RIA labels, focus trap).

### **Medium Term (Sprint 2)**
3.  **[Performance]** Implement Pagination for Leads.
4.  **[UX]** Add Toast Notifications for success/error states (instead of `console.error`).

### **Long Term**
5.  **[Arch]** Move to React Query or Zustand for state management.
