# PRD: Daily Sales Plan (AI Sales Autopilot)

## Introduction

The Daily Sales Plan is a guided daily action system that scans the user's entire pipeline and generates a prioritized list of sales actions — each with pre-generated content ready to execute. Instead of manually browsing leads to decide what to do next, the user opens the Daily Sales Plan page, sees their top-priority actions, and works through them one by one. Each action auto-logs a note to the lead when completed, keeping the pipeline up to date with zero manual bookkeeping.

The queue auto-generates on app load and shows a badge with the pending action count in the navigation. It does **not** regenerate if the user still has uncompleted actions from a previous session — it only refreshes when the queue is empty or the user explicitly requests it.

**Trust statement:** Nothing is sent automatically. You review and copy all content before sending.

## Goals

- Eliminate decision fatigue: the user never has to decide "which lead should I work on next?"
- Pre-generate all action content (emails, call scripts, social posts) so the user can execute immediately
- Auto-log every completed action as a note on the lead
- Show a persistent badge in the nav so the user always knows how many actions are pending
- Allow the user to configure which pipeline statuses are included in queue generation
- Keep the queue stable — don't regenerate until the user has worked through or dismissed pending actions

## Architecture Decisions

### Two-Pass AI Approach
Queue generation uses two AI passes to stay within token limits and keep the UI snappy:
- **Pass 1 (generate_queue):** Receives compact lead summaries (not full note histories). Returns action "stubs" — `leadId`, `actionType`, `priority`, `reasoning`. No pre-generated content yet.
- **Pass 2 (generate_action_content):** When the user clicks "Start" on an action, a second AI call generates the full content (email body, call script, social post) for that specific action. This is lazy/on-demand.

### Client-Side Pre-Filtering
Before calling the AI, the client deterministically pre-filters and ranks leads:
1. Filter by user-configured autopilot statuses
2. Exclude leads contacted today (any note with today's date)
3. Rank by: days since last contact (staleness), AI match score, status progression potential
4. Send only the top 40–80 compact lead summaries to the AI

Each compact summary includes: `id`, `companyName`, `status`, `matchScore`, `daysSinceLastContact`, `noteCount`, `description` (truncated to ~100 chars).

### State Management
Queue state is managed via a dedicated `useAutopilotQueue()` custom hook (stored in `hooks/useAutopilotQueue.ts`) that reads from `CRMContext` for leads/settings but manages queue state independently via `localStorage`. The hook exposes the queue, pending count, and mutation methods. This prevents global rerenders when queue state changes.

## User Stories

### US-001: Autopilot types and interfaces
**Description:** As a developer, I need TypeScript types for the autopilot queue system so all components share a consistent data contract.

**Acceptance Criteria:**
- [ ] Add to `types.ts`: `AutopilotAction` interface with fields: `id` (string), `leadId` (string), `leadName` (string), `contactName` (string, optional), `email` (string, optional), `phone` (string, optional), `actionType` ('email' | 'call' | 'social' | 'note'), `priority` (number 1-10), `reasoning` (string), `content` (string, optional — filled lazily), `status` ('pending' | 'completed' | 'skipped')
- [ ] Add `AutopilotQueue` interface: `generatedAt` (ISO string), `actions` (AutopilotAction[])
- [ ] Add optional `autopilotStatuses` field (string[]) to `AppSettings` interface
- [ ] Typecheck passes

### US-002: Autopilot settings — configurable statuses
**Description:** As a user, I want to choose which pipeline statuses are included in the Daily Sales Plan so that I only see actions for leads I'm actively working.

**Acceptance Criteria:**
- [ ] Add an "Autopilot" section to the Settings page (within General settings area)
- [ ] Show checkboxes for each configured pipeline status
- [ ] Selected statuses are saved via the existing `saveSettings` flow (new `autopilotStatuses` field on `AppSettings`)
- [ ] Default: all statuses except the last one (typically DEAD) are selected
- [ ] Update `fetchSettings` and `saveSettings` in `crmService.ts` to read/write `autopilot_statuses` field
- [ ] Typecheck passes
- [ ] Verify in browser

### US-003: Client-side lead pre-filtering utility
**Description:** As a developer, I need a utility function that filters and ranks leads for autopilot queue generation, so only the most relevant leads are sent to the AI.

**Acceptance Criteria:**
- [ ] Create `utils/autopilotHelpers.ts` with a `preFilterLeads(leads, settings)` function
- [ ] Filters out leads not in configured `autopilotStatuses`
- [ ] Filters out leads that have a note with today's date
- [ ] Ranks remaining leads by: days since last contact (desc), match score (desc), note count (asc — fewer notes = less engaged)
- [ ] Returns top 60 leads as compact summaries: `{ id, companyName, status, matchScore, daysSinceLastContact, noteCount, description }` (description truncated to 100 chars)
- [ ] Typecheck passes

### US-004: Queue generation via AI (Pass 1 — stubs)
**Description:** As a user, I want the system to analyze my pipeline and generate a prioritized list of action stubs so I know exactly what to do next.

**Acceptance Criteria:**
- [ ] New `generate_queue` action in `ai-gateway/index.ts` edge function that accepts compact lead summaries and returns prioritized action stubs
- [ ] Each stub includes: `leadId`, `leadName`, `actionType` (email | call | social | note), `priority` (1-10), `reasoning` (1 sentence: why this action, why now)
- [ ] AI prompt instructs: max 15-20 actions, max 2 actions per lead, prioritize by staleness + score + status potential
- [ ] Response uses `responseMimeType: 'application/json'` and `parseJsonResponse` helper
- [ ] New `generateActionQueue(leadSummaries, settings, products)` function in `geminiService.ts` that calls the gateway
- [ ] Typecheck passes

### US-005: Action content generation via AI (Pass 2 — on-demand)
**Description:** As a user, I want the system to generate the full content for an action when I'm ready to work on it, so content is fresh and context-specific.

**Acceptance Criteria:**
- [ ] New `generate_action_content` action in `ai-gateway/index.ts` that accepts a single lead's full data + action type and returns generated content
- [ ] For email: returns `{ subject, body }`; for call: returns script in markdown; for social: returns `{ content, rationale }`; for note: returns a check-in note draft
- [ ] New `generateActionContent(lead, actionType, settings, products)` function in `geminiService.ts`
- [ ] Typecheck passes

### US-006: useAutopilotQueue hook — queue state management
**Description:** As a developer, I need a custom hook that manages the autopilot queue lifecycle (load, generate, complete, snooze, persist) independently from CRMContext.

**Acceptance Criteria:**
- [ ] Create `hooks/useAutopilotQueue.ts` with hook `useAutopilotQueue()`
- [ ] Hook reads `leads`, `settings`, `products` from `useCRM()`
- [ ] Stores queue in `localStorage` under key `autopilot-queue`
- [ ] On mount: loads queue from localStorage if it exists, has pending actions, and is <24 hours old
- [ ] `generateQueue()` method: calls `preFilterLeads`, then `generateActionQueue`, saves result to localStorage
- [ ] `completeAction(actionId)` method: marks action completed, calls `addNoteToLead` with prefix "Autopilot:", removes from pending
- [ ] `snoozeAction(actionId)` method: moves action to end of queue (does not log a note)
- [ ] `refreshQueue()` method: forces regeneration regardless of pending actions
- [ ] `setActionContent(actionId, content)` method: sets the lazily-generated content on an action
- [ ] Exposes: `queue`, `pendingActions`, `pendingCount`, `isGenerating`, `currentAction` (first pending), `generateQueue`, `completeAction`, `snoozeAction`, `refreshQueue`, `setActionContent`
- [ ] Listens to `storage` event for cross-tab sync
- [ ] Typecheck passes

### US-007: Autopilot page — queue display
**Description:** As a user, I want to see my action queue as a clear, ordered list so I can work through it top to bottom.

**Acceptance Criteria:**
- [ ] New route `/autopilot` added in `App.tsx`
- [ ] New page component `pages/Autopilot.tsx` and main component `components/AutopilotPage.tsx`
- [ ] Page uses `useAutopilotQueue()` hook for all state
- [ ] Shows queue as a vertical list of action cards, ordered by priority
- [ ] Each card shows: lead company name, action type icon (Phone/Mail/Share2/FileText from lucide-react), priority indicator (colored dot or number), reasoning summary (1 line), and a "Start" button
- [ ] Queue summary at top: "X actions remaining" with a progress bar (completed / total)
- [ ] Empty state when queue is empty: "All caught up! 🎉" with a "Generate New Queue" button
- [ ] Loading state with skeleton cards while queue is generating
- [ ] "Refresh Queue" button in header (disabled while generating)
- [ ] Typecheck passes
- [ ] Verify in browser

### US-008: Action execution view
**Description:** As a user, I want to see the pre-generated content for an action and execute it in one click so I can move fast.

**Acceptance Criteria:**
- [ ] When user clicks "Start" on a queue card, the view expands inline (or slides in) to show the full action detail
- [ ] On expand, if `action.content` is empty, calls `generateActionContent` and shows a loading spinner until content arrives; then calls `setActionContent` to cache it
- [ ] Shows: lead name, contact info (phone, email), action type, AI reasoning, and the full generated content
- [ ] "Copy to Clipboard" button copies the generated content (email body, script, etc.) with toast confirmation
- [ ] "Mark Complete" button: logs the action as a note on the lead (e.g., "Autopilot: Sent follow-up email — [1-line summary]"), marks action completed, advances to next action
- [ ] "Snooze" button: moves the action to the end of the queue without logging, advances to next
- [ ] "Regenerate" button: re-generates just this action's content via `generateActionContent` (shows loading)
- [ ] After completing/snoozing, automatically shows the next pending action
- [ ] Typecheck passes
- [ ] Verify in browser

### US-009: Navigation badge
**Description:** As a user, I want to see a badge on the Daily Sales Plan nav item showing how many actions are pending so I know at a glance if I have work to do.

**Acceptance Criteria:**
- [ ] Add "Daily Sales Plan" nav item in `Layout.tsx` using the `Zap` icon from lucide-react, linking to `/autopilot`
- [ ] Nav item shows a numeric badge when queue has pending actions (read from `useAutopilotQueue()` hook's `pendingCount`)
- [ ] Badge is hidden when queue is empty (0 actions)
- [ ] Badge styling: small circle with count, brand color background (`bg-brand-500`), white text, positioned top-right of the icon/label
- [ ] Works on both desktop sidebar and mobile bottom nav
- [ ] Update `getActiveTab()` to recognize `/autopilot` path
- [ ] Typecheck passes
- [ ] Verify in browser

### US-010: Auto-generate queue on app load
**Description:** As a user, I want the queue to generate automatically when I open the app so actions are ready when I navigate to the Daily Sales Plan page.

**Acceptance Criteria:**
- [ ] In `useAutopilotQueue` hook: on mount, if no valid queue exists (empty, or all completed, or >24h old), trigger `generateQueue()` silently in the background
- [ ] If a valid queue with pending actions exists and is <24 hours old, load it from localStorage (do not regenerate)
- [ ] Generation runs silently — no blocking UI, no loading spinner outside the Autopilot page
- [ ] Badge in nav updates once generation completes
- [ ] Typecheck passes

### US-011: Queue invalidation for deleted/changed leads
**Description:** As a developer, I need the queue to gracefully handle leads that were deleted or moved to excluded statuses after the queue was generated.

**Acceptance Criteria:**
- [ ] When rendering queue actions, check if the lead still exists in `leads` from CRMContext
- [ ] If a lead was deleted, auto-skip its action (mark as 'skipped', do not show in UI)
- [ ] If a lead's status was changed to one not in `autopilotStatuses`, show the action grayed out with a note "Lead status changed" and allow manual skip
- [ ] Typecheck passes

## Functional Requirements

- FR-1: Add `autopilot_statuses` field to `AppSettings` type (array of status ID strings) and persist to settings table
- FR-2: Add `generate_queue` action to the `ai-gateway` edge function — accepts compact lead summaries, returns action stubs (no content)
- FR-3: Add `generate_action_content` action to `ai-gateway` — accepts single lead data + action type, returns full generated content
- FR-4: Client-side pre-filtering: filter leads by configured statuses, exclude leads contacted today, rank by staleness/score, send top 40-80 compact summaries to AI
- FR-5: Queue is stored as JSON in `localStorage` under key `autopilot-queue` with shape: `{ generatedAt: ISO string, actions: AutopilotAction[] }`
- FR-6: Each `AutopilotAction` has: `id` (random), `leadId`, `leadName`, `actionType`, `priority`, `reasoning`, `content` (optional, filled lazily), `status` ('pending' | 'completed' | 'skipped')
- FR-7: "Mark Complete" writes a note to the lead via `addNoteToLead` with prefix "Autopilot:" and a summary of the action taken
- FR-8: Queue generation is limited to 15-20 actions, max 2 per lead
- FR-9: Content generation (Pass 2) happens on-demand when user clicks "Start"
- FR-10: Queue auto-generates on app load if empty or >24h old; does not regenerate if pending actions exist
- FR-11: Queue invalidation: auto-skip actions for deleted leads; flag actions for leads moved to excluded statuses
- FR-12: Add `/autopilot` route in `App.tsx` and "Daily Sales Plan" nav link with badge in `Layout.tsx`
- FR-13: "Snooze" moves action to end of queue without logging a note
- FR-14: Cross-tab sync via `storage` event listener on `localStorage`

## Non-Goals

- No direct email sending (SMTP integration) — content is copied to clipboard for V1
- No automated scheduling or timers — user manually works the queue
- No follow-up date scheduling or reminders
- No action history or analytics dashboard
- No batch execution ("execute all at once")
- No push notifications or browser notifications
- No database persistence for queue (localStorage only for V1)

## Design Considerations

- The Daily Sales Plan page should feel like a **focused work mode** — minimal chrome, clear next-action emphasis
- Consider a "focus mode" layout: current action takes up most of the screen, queue list is a compact sidebar or collapsed
- Reuse existing component patterns: card styling from LeadCard, content display from LeadModal's generated content overlay, note submission from LeadSidebar
- Action type icons: Phone (call script), Mail (email), Share2 (social post), FileText (note/check-in)
- Progress bar at the top gives a sense of accomplishment as actions are completed
- Use the `Zap` icon from lucide-react for the nav item
- Reasoning shown as simple bullet cues (e.g., "Last contacted 12 days ago · Match score: 85") rather than long AI paragraphs
- "Snooze" instead of "Skip" for intentional UX framing

## Technical Considerations

- Queue generation requires sending summarized lead data to the AI — keep payload compact (don't send full note histories, just last note date + count)
- localStorage has a ~5MB limit — 20 action stubs should be well under this; content is cached in-memory only (not persisted)
- The `generate_queue` AI prompt must return valid JSON; use `responseMimeType: 'application/json'` and the `parseJsonResponse` helper in the edge function
- Pass 1 (stubs) may take 3-5 seconds; Pass 2 (content) takes 2-4 seconds per action — both are acceptable latencies with loading states
- Queue state in `useAutopilotQueue` hook reads `leads` from CRMContext but does not write to it, avoiding circular dependencies
- AI failure handling: single retry on parse failure; fallback UI with "Try again" button if generation fails
- Disable "Refresh Queue" button while generation is in-flight to prevent concurrent requests

## Success Metrics

- User can go from app open → executing first sales action in under 10 seconds
- Queue generation produces actionable, lead-specific content (not generic templates)
- Completing all daily queue actions takes 15-30 minutes for a pipeline of 50 leads
- Zero manual note-taking required — all actions auto-logged

## Open Questions

- Should completed actions show a "done" state in the queue list (strikethrough) or be removed immediately? (Suggest: keep with strikethrough during session, remove on next generation)
- Should the queue prioritize leads the user has never contacted over stale leads? (Suggest: yes, weight "never contacted" higher)
- Max queue size: is 15-20 the right daily workload, or should this be configurable? (Suggest: fixed at 15-20 for V1)
