# Growth Lab AI Prompt Library

## 1. Weekly Theme Generation (`generateWeeklyTheme`)
**Goal**: Suggest a strategic "Battleground" for the week based on company context.
**Prompt**:
```text
You are a Senior B2B SaaS Marketing Strategist. 
Context: ${companyDescription}. 
Persona: ${aboutMe}.

Identify 3 potential 'Weekly Growth Themes' for this SaaS. 
A theme should be a specific strategic angle like 'Solving Dispatch Chaos', 'The Hidden Cost of Manual Invoicing', or 'Automating the Field Service Follow-up'.

Return a JSON array of objects:
[{ "theme": "...", "goal": "...", "reasoning": "..." }]
```

## 2. Daily Spark Generation (`generateDailySparks`)
**Goal**: Generate 3-4 raw marketing hooks aligned with the active theme.
**Prompt**:
```text
Active Theme: ${currentTheme}.
Context: ${companyDescription}.

Generate 4 'Daily Sparks' - these are raw, high-intent marketing hooks or concepts.
Rules:
- Must align with the Active Theme.
- Avoid generic 'buy our product' messaging.
- Focus on pain points or counter-intuitive insights for the field service industry.

Return a JSON array of strings: ["Spark 1", "Spark 2", ...]
```

## 3. Platform Expansion: LinkedIn (`expandLinkedIn`)
**Goal**: Professional, narrative-driven long-form content.
**Prompt**:
```text
Concept: ${conceptTopic}.
Theme: ${activeTheme}.

Draft a high-impact LinkedIn post.
Structure:
- Strong hook (first line).
- Narrative context or a short story.
- 3 bullet points of value.
- Call to value (not just 'click here').
- 3 relevant hashtags.

Return as Markdown.
```

## 4. Platform Expansion: X/Twitter (`expandX`)
**Goal**: Punchy, viral-leaning, thread-friendly content.
**Prompt**:
```text
Concept: ${conceptTopic}.
Theme: ${activeTheme}.

Draft a punchy X (Twitter) post (max 280 chars).
Structure:
- Question-based or controversial hook.
- Singular value statement.
- 2 hashtags.

Return as Markdown.
```

## 5. Outreach Query Discovery (`generateOutreachQueries`)
**Goal**: Generate pre-filled search URLs for relevant community pain points.
**Prompt**:
```text
Theme: ${activeTheme}.

Generate 3 search queries for 'The Pulse' outreach.
Queries should target Reddit or X (Twitter) where users are complaining about the THEME's related pain point.

Return JSON array:
[{ "platform": "Reddit", "label": "Complaints about X in r/smallbusiness", "url": "https://www.reddit.com/report?q=..." }]
```

## 6. Value-First Reply Templates (`generateReplyTemplates`)
**Goal**: Human-first suggestions for community engagement.
**Prompt**:
```text
Opportunity: ${queryLabel}.
Theme: ${activeTheme}.

Suggest 3 'Value-First' reply templates for this outreach opportunity.
Rules:
- NO PITCHING initially.
- Mention a specific insight related to the theme.
- Ask a follow-up question to start a conversation.
- Sound like a helpful peer, not a bot.

Return as JSON array of strings.
```
