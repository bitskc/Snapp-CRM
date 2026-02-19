# PRD: Growth Lab (SaaS Marketing Suite)

## Introduction
The **Growth Lab** is a strategic marketing engine built directly into ServiceSnapp to drive B2B SaaS growth. It moves away from generic social media management towards a theme-driven, high-intent workflow that turns product milestones and market pain points into actionable content and outreach.

## Goals
- Align all marketing efforts behind a **Weekly Campaign Theme**.
- Generate daily high-intent hooks for LinkedIn and X.
- Facilitate community engagement via pre-filled search deep-links.
- Track outreach success through manual reply confirmation.

## User Stories

### US-001: Growth Lab Database Schema
**Description:** As a developer, I need to store campaign themes, ideas, and outreach opportunities.
**Acceptance Criteria:**
- [ ] Create `growth_settings` table (user_id, current_theme, updated_at).
- [ ] Create `growth_concepts` table (id, topic, theme_snapshot, status).
- [ ] Create `growth_posts` table (id, concept_id, platform, content).
- [ ] Create `engagement_opportunities` table (id, query_url, suggested_reply, status).
- [ ] Typecheck passes.

### US-002: Weekly Theme Logic & Nixing
**Description:** As a user, I want the AI to suggest a weekly strategic theme that I can approve or replace.
**Acceptance Criteria:**
- [ ] Implement `generateWeeklyTheme()` in `geminiService`.
- [ ] UI allows user to trigger a re-suggest (nix current theme).
- [ ] Theme is persisted to `growth_settings`.
- [ ] Typecheck passes.
- [ ] Verify in browser using dev-browser skill.

### US-003: Campaign-Aligned Daily Sparks
**Description:** As a user, I want 3-4 raw marketing ideas daily that align with my weekly theme.
**Acceptance Criteria:**
- [ ] Implement `generateDailySparks(activeTheme)` in `crmService`.
- [ ] Prompts ensure alignment with the Weekly Theme and B2B SaaS persona.
- [ ] Typecheck passes.

### US-004: Idea Triage Dashboard
**Description:** As a user, I want to see raw ideas as cards and decide which to "Kill" or "Ignite".
**Acceptance Criteria:**
- [ ] Build `GrowthIdeation` component.
- [ ] "Kill" action archives the concept.
- [ ] "Ignite" action moves concept to the Forge stage.
- [ ] Typecheck passes.
- [ ] Verify in browser using dev-browser skill.

### US-005: Platform Expansion (The Forge)
**Description:** As a user, I want to generate platform-specific post kits once an idea is ignited.
**Acceptance Criteria:**
- [ ] Implement `expandConcept(conceptId, platform)` for LinkedIn and X.
- [ ] LinkedIn content is professional/long-form; X content is punchy/thread-ready.
- [ ] Typecheck passes.

### US-006: Post Kit UI & Clipboard Actions
**Description:** As a user, I want to review my forge kits and copy them to my clipboard.
**Acceptance Criteria:**
- [ ] UI displays generated posts for the selected platform.
- [ ] "Copy to Clipboard" button works for text and hashtags.
- [ ] Typecheck passes.
- [ ] Verify in browser using dev-browser skill.

### US-007: Outreach Search Link Generator (The Pulse)
**Description:** As a user, I want pre-filled search links for Reddit/X based on my active theme.
**Acceptance Criteria:**
- [ ] AI generates `query_url` matching theme-related pain points.
- [ ] Search links open in new tabs.
- [ ] Typecheck passes.

### US-008: Value-First Reply Templates
**Description:** As a user, I want suggested replies for outreach that don't sound like spam.
**Acceptance Criteria:**
- [ ] AI generates 3 distinct "human-first" replies for each opportunity.
- [ ] Templates prioritize solving the user's problem over pitching the product.
- [ ] Typecheck passes.

### US-009: Outreach Tracking UI
**Description:** As a user, I want to track which outreach opportunities I have completed.
**Acceptance Criteria:**
- [ ] Checklist interface for engagement opportunities.
- [ ] Marking "Done" increments the reply counter metric.
- [ ] Typecheck passes.
- [ ] Verify in browser using dev-browser skill.

### US-010: Growth Lab Routing & Layout
**Description:** As a user, I want a dedicated section of the app to manage my growth experiments.
**Acceptance Criteria:**
- [ ] Add `/growth-lab` route.
- [ ] Sidebar/Navigation includes "Growth Lab" link.
- [ ] Dashboard shows weekly theme and key metrics.
- [ ] Typecheck passes.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements
- **FR-1**: Only one active Campaign Theme per week.
- **FR-2**: Daily Sparks must be regenerated if a theme is "nixed".
- **FR-3**: Post expansion must be granular (user chooses when to generate for each platform).
- **FR-4**: Privacy: No data is posted automatically to any social network.

## Non-Goals
- Real-time social listening (API limitations).
- Image/Video generation (v1 scope).
- Automatic posting via OAuth.

## Success Metrics
- **Primary**: Number of outreach replies confirmed as "Done".
- **Secondary**: Rate of idea "Ignition" (Conversion from Spark to Forge).
