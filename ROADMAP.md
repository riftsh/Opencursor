# OpenCursor Roadmap v1.0.1

> **⚠️ WORK IN PROGRESS:** This project is actively being developed. No major features are available yet - we're still building the foundation.

---

## Current Status

**Version:** v1.0.1 (Development Phase)
**Status:** Early Development - Foundation Building
**Last Updated:** April 2026

OpenCursor is in early development. We're stabilizing the VS Code fork and integrating AI from Continue.dev. **Not production-ready yet.**

---

## v1.0.1 Roadmap

### Phase 1: Foundation & Stability

#### Bug Fixes
1. AI chat panel fails to initialize on macOS intermittently (Critical)
2. Memory leak in extension host with Ollama (Critical)
3. Terminal integration breaks on workspace switch (Critical)
4. API keys stored in plain text - implement encryption at rest (Critical)
5. Inline edits apply to wrong line range sometimes (Critical)
6. Chat history doesn't persist between sessions (High)
7. Multi-cursor editing broken with AI suggestions (High)
8. Theme switching doesn't apply to AI chat panel (High)
9. Large files (>10MB) cause performance issues (High)
10. Command palette excludes AI commands (High)
11. Extension host crashes on malformed AI JSON (High)
12. Auto-save triggers during AI streaming (Medium)
13. Minimap glitches with AI highlighting (Medium)
14. Status bar shows wrong AI model name (Medium)
15. Format on save conflicts with AI suggestions (Medium)

#### Core Features
16. Multi-turn conversation history with persistence
17. Export chat as markdown/PDF
18. Chat search and filtering
19. Message pinning and bookmarking
20. Code block syntax highlighting in chat
21. Inline diff preview for AI suggestions
22. Accept/reject buttons for inline edits
23. AI response streaming with typing indicator
24. Model selector with token usage counter
25. Context indicator showing included files

#### AI Integration
26. Full Continue.dev integration
27. OpenAI GPT-4/GPT-3.5 support
28. Anthropic Claude 3 support
29. Google Gemini support
30. Local Ollama integration
31. BYOK (Bring Your Own Key) system
32. Custom model endpoint support
33. Model fallback mechanisms
34. Usage tracking and cost estimation

---

### Phase 2: Editor Enhancements

#### AI-Powered Coding
35. Tab autocomplete with AI suggestions
36. Ghost text for completions
37. Smart code completion ranking
38. Context-aware symbol suggestions
39. Multi-cursor AI support
40. AI-powered go-to-definition
41. AI-generated documentation hover
42. Inline parameter hints from AI
43. Refactoring suggestions panel
44. Test generation from code

#### Code Intelligence
45. Natural language code search
46. Semantic codebase understanding
47. Auto-generate unit tests
48. Auto-generate integration tests
49. Auto-generate README/CHANGELOG
50. Code review automation
51. Security vulnerability detection
52. Performance optimization suggestions

---

### Phase 3: UI/UX Improvements

#### Layout & Navigation
53. Collapsible activity bar sections
54. Floating AI chat panel
55. Tab stacking with previews
56. Breadcrumbs with file icons
57. Custom scrollbars and smooth scrolling

#### AI Interface
58. Redesigned chat panel with message bubbles
59. Typing indicator animation
60. Inline diff preview styling
61. Accept/reject button design
62. Model selector dropdown with logos
63. Token usage counter widget
64. Conversation history sidebar
65. Context indicator UI

#### Editor Visuals
66. Bracket pair colorization 2.0
67. Sticky headers for functions/classes
68. Custom cursor styles (block, line, bar)
69. Selection highlight animation
70. Inline parameter hints styling
71. Error squiggle animation
72. Quick fix lightbulb animation

#### Terminal & Status
73. Terminal tabs with process indicators
74. AI status bar icon with animation
75. Debug console object tree view
76. Notification center for AI alerts
77. Settings UI with AI categories

---

### Phase 4: Advanced & Enterprise

#### Team Features
78. Real-time pair programming
79. Team knowledge sharing
80. Shared AI prompts library
81. Organization-wide model management
82. Audit logging for AI interactions

#### Enterprise
83. Compliance reporting (GDPR/SOC2)
84. SSO/SAML integration
85. On-premise deployment option
86. Air-gapped environment support
87. Custom model fine-tuning interface

#### Architecture
88. Architecture diagram generation
89. Database migration generation

---

## Version Timeline

| Version | Focus | ETA |
|---------|-------|-----|
| v1.0.0 | VS Code fork foundation (merged, features pending) | Foundation |
| v1.0.1 | **Current: Bug fixes + Core features** | Q2 2026 |
| v1.0.2 | Editor enhancements | Q3 2026 |
| v1.0.3 | UI/UX polish | Q4 2026 |
| v1.1.0 | Advanced features | Q1 2027 |
| v2.0.0 | Enterprise & collaboration | 2027 |

---

## Extended Feature Masterlist

**📋 Full Feature Catalog:** [FEATURE_MASTERLIST_9000.md](./FEATURE_MASTERLIST_9000.md)

The complete feature catalog contains **9,000 planned features** across three platforms:

| Platform | Features | Key Domains |
|----------|----------|-------------|
| **Cursor** | 3,000 | Composer & Multi-File Editing (300), Tab Autocomplete (270), Codebase Indexing & RAG (300), Inline Chat & Edit (270), Agent Mode (300), Debug Intelligence (225), Model Routing (180), Code Review (225), Context Management (270), Browser & Visual (180), Privacy & Enterprise (150), Extensions (180), Terminal (150) |
| **Windsurf** | 3,000 | Cascade Agent (330), Deep Codebase (300), Tab Completions (270), Memories & Rules (270), Terminal Integration (225), Plan & Act (300), MCP (225), Multi-Model (180), Flow State (225), Code Generation (225), Refactoring (180), Collaboration (150), Performance (120) |
| **Antigravity** | 3,000 | Autonomous Agent (330), Mission Control (270), Browser Subagent (270), Artifacts (300), Knowledge Base (270), Predictive Intelligence (225), Self-Healing (225), Cross-Surface (225), Multi-Model (180), Code Engine (225), Feedback Loop (180), Enterprise (150), Performance (150) |

See the full masterlist for detailed feature specifications with priorities (P0-P3) and complexity ratings (S/M/L/XL).

---

**Maintainer:** Devflex-ai
**Last Updated:** April 2026
