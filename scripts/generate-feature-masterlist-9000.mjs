#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Platform definitions ────────────────────────────────────────────
const PLATFORMS = [
  {
    prefix: 'C',
    name: 'Cursor',
    count: 3000,
    domains: [
      { name: 'Composer & Multi-File Editing', weight: 200, capabilities: ['Multi-file diff generation','Cross-file refactor orchestration','Architectural scaffolding','Component extraction','Batch rename propagation','Import graph rewiring','Code movement tracking','Conflict-free merge planning','Dependency-aware ordering','Incremental apply'] },
      { name: 'Cursor Tab Autocomplete', weight: 180, capabilities: ['Speculative decoding','Multi-line prediction','Pattern-aware completion','Type-driven suggestions','Context-window optimization','Cursor movement prediction','Partial accept','Inline parameter hints','Return type inference','Docstring completion'] },
      { name: 'Codebase Indexing & RAG', weight: 200, capabilities: ['Embedding construction','Semantic search','Symbol resolution','Cross-repo linking','Incremental re-index','Chunk ranking','Context retrieval','File-relevance scoring','Dependency graph traversal','Natural language queries'] },
      { name: 'Inline Chat & Edit', weight: 180, capabilities: ['Selection-scoped chat','Inline diff preview','Quick fix generation','Explanation overlay','Regex generation','Type annotation','Error correction','Code translation','Comment generation','Simplification'] },
      { name: 'Agent Mode', weight: 200, capabilities: ['Autonomous planning','Terminal command execution','Build error recovery','Test generation','Dependency installation','File creation','Lint fix loops','Multi-step debugging','Git operations','Environment setup'] },
      { name: 'Debug Intelligence', weight: 150, capabilities: ['Stack trace analysis','Breakpoint suggestion','Variable inspection','Runtime error diagnosis','Memory leak detection','Performance profiling','Exception prediction','Log correlation','State snapshot','Watchpoint automation'] },
      { name: 'Model Routing & Selection', weight: 120, capabilities: ['Auto model selection','Cost optimization','Latency routing','Capability matching','Fallback chains','Token budget management','Quality scoring','A/B routing','Provider failover','Custom model endpoints'] },
      { name: 'Code Review & Quality', weight: 150, capabilities: ['PR review generation','Security scanning','Style enforcement','Complexity analysis','Dead code detection','Duplication finding','API misuse detection','Performance anti-patterns','Accessibility checks','License compliance'] },
      { name: 'Context Management', weight: 180, capabilities: ['@ mentions','File pinning','Folder scoping','Git diff context','Terminal output context','Image context','URL context','Documentation context','Error context','Custom context providers'] },
      { name: 'Integrated Browser & Visual', weight: 120, capabilities: ['Live preview','Visual debugging','DOM inspection','CSS editing','Screenshot capture','Responsive testing','Network monitoring','Console forwarding','Hot reload sync','Drag-drop UI editing'] },
      { name: 'Privacy & Enterprise', weight: 100, capabilities: ['SOC 2 compliance','Zero data retention','On-premise deployment','SSO integration','Audit logging','Role-based access','IP allowlisting','Data residency','Encryption at rest','Compliance reporting'] },
      { name: 'Extensions & Ecosystem', weight: 120, capabilities: ['VS Code extension support','Theme compatibility','Keybinding import','Settings sync','Extension marketplace','Custom snippets','Language server protocol','Debug adapter protocol','Task runner integration','Workspace trust'] },
      { name: 'Terminal Intelligence', weight: 100, capabilities: ['Command suggestion','Output parsing','Error extraction','Process monitoring','Shell history analysis','Environment detection','Path resolution','Permission handling','Signal management','Session persistence'] },
    ]
  },
  {
    prefix: 'W',
    name: 'Windsurf',
    count: 3000,
    domains: [
      { name: 'Cascade Agent System', weight: 220, capabilities: ['Multi-step task planning','Autonomous code generation','Iterative error correction','Context-aware refactoring','Test-driven development','Architecture design','API integration','Database schema design','Migration generation','Deployment scripting'] },
      { name: 'Deep Codebase Awareness', weight: 200, capabilities: ['Full repository indexing','Dependency graph analysis','Pattern recognition','Convention detection','Import chain resolution','Module boundary mapping','API surface analysis','Type hierarchy traversal','Call graph construction','Dead code identification'] },
      { name: 'Windsurf Tab Completions', weight: 180, capabilities: ['Multi-action suggestions','Cursor movement prediction','Auto-import insertion','Chain action completion','Type-ahead buffering','Semantic completion','Contextual ranking','Partial acceptance','Undo-aware suggestions','Throttled inference'] },
      { name: 'Memories & Rules Engine', weight: 180, capabilities: ['Project convention learning','Coding style retention','Architecture preference tracking','Review feedback memory','Error pattern caching','Dependency preference storage','Testing strategy memory','Naming convention rules','File organization rules','Comment style enforcement'] },
      { name: 'Terminal & Shell Integration', weight: 150, capabilities: ['Command execution','Output analysis','Error recovery loops','Build system integration','Package manager awareness','Script generation','Environment variable management','Process orchestration','Log streaming','Interactive shell support'] },
      { name: 'Plan & Act Workflow', weight: 200, capabilities: ['Step-by-step planning','Change preview','Approval workflows','Rollback support','Checkpoint creation','Progress tracking','Parallel task execution','Dependency ordering','Risk assessment','Completion estimation'] },
      { name: 'MCP Integrations', weight: 150, capabilities: ['Figma design import','Slack notifications','Stripe API bridging','GitHub integration','Jira sync','Linear issue tracking','Notion documentation','Vercel deployment','Supabase connection','Firebase integration'] },
      { name: 'Multi-Model Flexibility', weight: 120, capabilities: ['Model switching','Provider abstraction','Cost tracking','Quality benchmarking','Latency monitoring','Token optimization','Custom model hosting','Fine-tuned model support','Embedding model selection','Specialized task routing'] },
      { name: 'Flow State Optimization', weight: 150, capabilities: ['Distraction reduction','Context preservation','Seamless transitions','Keyboard-first navigation','Command palette enhancement','Quick action bar','Focus mode','Split view intelligence','Tab management','Workspace snapshots'] },
      { name: 'Code Generation & Scaffolding', weight: 150, capabilities: ['Project bootstrapping','Component generation','API endpoint scaffolding','Test suite generation','Documentation generation','Type definition creation','Config file generation','CI/CD pipeline creation','Docker setup','Infrastructure as code'] },
      { name: 'Refactoring Intelligence', weight: 120, capabilities: ['Safe rename propagation','Extract method/component','Move to file','Inline variable','Change signature','Convert syntax','Modernize patterns','Remove dead code','Optimize imports','Restructure modules'] },
      { name: 'Collaboration & Team', weight: 100, capabilities: ['Shared context sessions','Team rules sync','Convention enforcement','Knowledge base sharing','Code review automation','Pair programming mode','Team analytics','Onboarding assistance','Style guide enforcement','Shared prompt library'] },
      { name: 'Performance & Reliability', weight: 80, capabilities: ['Streaming responses','Connection resilience','Cache management','Offline fallback','Memory optimization','CPU throttling','Background indexing','Incremental updates','Error boundaries','Graceful degradation'] },
    ]
  },
  {
    prefix: 'A',
    name: 'Antigravity',
    count: 3000,
    domains: [
      { name: 'Autonomous Agent Architecture', weight: 220, capabilities: ['End-to-end task execution','Multi-agent orchestration','Agent delegation','Task decomposition','Goal-oriented planning','Self-correction loops','Progress monitoring','Failure recovery','Resource allocation','Priority scheduling'] },
      { name: 'Mission Control Dashboard', weight: 180, capabilities: ['Agent spawning','Parallel workspace management','Real-time status monitoring','Agent interaction','Task queue management','Resource visualization','Performance metrics','Cost tracking','History browsing','Batch operations'] },
      { name: 'Browser Subagent', weight: 180, capabilities: ['Automated web testing','Screenshot capture','DOM interaction','Form filling','Navigation automation','Visual regression testing','Performance auditing','Accessibility testing','Network interception','Session recording'] },
      { name: 'Artifacts System', weight: 200, capabilities: ['Implementation plan generation','Task list tracking','Code diff presentation','Walkthrough creation','Screenshot embedding','Video recording','Mermaid diagram generation','Table formatting','Carousel views','Interactive feedback'] },
      { name: 'Knowledge Base & Memory', weight: 180, capabilities: ['Cross-conversation learning','Knowledge item curation','Pattern retention','Context persistence','Codebase understanding','Convention tracking','Error history','Solution caching','Preference learning','Skill accumulation'] },
      { name: 'Predictive Intelligence', weight: 150, capabilities: ['Intent prefetching','Proactive suggestions','Anticipatory caching','Next-action prediction','Error prevention','Dependency forecasting','Resource pre-allocation','Context pre-loading','Query optimization','Workflow anticipation'] },
      { name: 'Self-Healing Code', weight: 150, capabilities: ['Auto lint fixing','Syntax error recovery','Type error correction','Import resolution','Missing dependency detection','Configuration repair','Build error remediation','Test failure diagnosis','Runtime crash recovery','Schema migration repair'] },
      { name: 'Cross-Surface Operations', weight: 150, capabilities: ['Editor-terminal bridging','Browser-editor sync','Terminal output parsing','File system awareness','Git integration','Process management','Environment detection','Path resolution','Permission handling','Resource monitoring'] },
      { name: 'Multi-Model Orchestration', weight: 120, capabilities: ['Model selection routing','Capability-based dispatch','Cost optimization','Quality assurance','Fallback management','Token budgeting','Parallel inference','Response aggregation','Confidence scoring','Model benchmarking'] },
      { name: 'Code Generation Engine', weight: 150, capabilities: ['Full-stack scaffolding','API generation','Database modeling','UI component creation','Test suite generation','Documentation writing','Config generation','Migration creation','Deployment scripting','Infrastructure setup'] },
      { name: 'Interactive Feedback Loop', weight: 120, capabilities: ['Artifact commenting','Inline suggestions','Approval workflows','Revision tracking','Change negotiation','Preference updating','Quality rating','Context correction','Scope refinement','Priority adjustment'] },
      { name: 'Enterprise & Governance', weight: 100, capabilities: ['Access control','Audit trails','Compliance monitoring','Data sovereignty','Encryption management','Policy enforcement','Usage analytics','Cost allocation','Team management','SSO integration'] },
      { name: 'Performance Optimization', weight: 100, capabilities: ['Streaming responses','Incremental processing','Background computation','Cache intelligence','Memory management','CPU scheduling','Network optimization','Lazy loading','Prefetch strategies','Resource pooling'] },
    ]
  }
];

const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const COMPLEXITIES = ['S', 'M', 'L', 'XL'];
const VERBS = ['Enable','Implement','Support','Provide','Introduce','Automate','Surface','Optimize','Expand','Streamline','Harden','Orchestrate','Refine','Standardize','Accelerate','Instrument','Unify','Personalize','Scale','Add'];
const OPTIMIZED_FOR = ['offline-first setups','legacy modernization','monorepos','CI/CD pipelines','polyglot projects','remote development','cross-platform builds','enterprise workspaces','rapid prototyping','test-heavy codebases','security-sensitive environments','large repositories','microservice architectures','mobile development','data science workflows'];

function pick(arr, idx) { return arr[idx % arr.length]; }

function generateFeatures(platform) {
  const features = [];
  let globalIdx = 0;
  const totalWeight = platform.domains.reduce((s, d) => s + d.weight, 0);

  for (const domain of platform.domains) {
    const domainCount = Math.round((domain.weight / totalWeight) * platform.count);
    for (let i = 0; i < domainCount && globalIdx < platform.count; i++) {
      globalIdx++;
      const id = `${platform.prefix}-${String(globalIdx).padStart(4, '0')}`;
      const cap = pick(domain.capabilities, i);
      const verb = pick(VERBS, globalIdx);
      const opt = pick(OPTIMIZED_FOR, globalIdx + i);
      const priority = pick(PRIORITIES, globalIdx);
      const complexity = pick(COMPLEXITIES, globalIdx + i);
      features.push({
        id, domain: domain.name, platform: platform.name,
        title: `${verb} ${cap} for ${domain.name}`,
        description: `Deliver ${cap.toLowerCase()} improvements in ${domain.name.toLowerCase()} with ${pick(['configurable thresholds','team-level controls','resilient retry logic','context-aware suggestions','conflict-safe merges','low-latency execution','workspace-scoped settings','progressive rollout flags','accessibility-first interactions','granular permissions','policy-aware safeguards','deterministic fallback behavior','traceable audit events','privacy-first defaults','one-click actions','real-time feedback'], globalIdx)}, optimized for ${opt}.`,
        priority, complexity
      });
    }
  }
  // Fill remainder
  while (features.length < platform.count) {
    globalIdx++;
    const id = `${platform.prefix}-${String(globalIdx).padStart(4, '0')}`;
    const dom = pick(platform.domains, globalIdx);
    const cap = pick(dom.capabilities, globalIdx);
    features.push({
      id, domain: dom.name, platform: platform.name,
      title: `${pick(VERBS, globalIdx)} ${cap} for ${dom.name}`,
      description: `Extended capability for ${cap.toLowerCase()} within ${dom.name.toLowerCase()}.`,
      priority: pick(PRIORITIES, globalIdx),
      complexity: pick(COMPLEXITIES, globalIdx)
    });
  }
  return features.slice(0, platform.count);
}

// ── Generate ────────────────────────────────────────────────────────
const allFeatures = PLATFORMS.flatMap(generateFeatures);

// ── Write Markdown ──────────────────────────────────────────────────
let md = `# OpenCursor 9,000 Feature Masterlist\n\nTotal features: **${allFeatures.length}**\n\n`;
md += `## Platform Distribution\n`;
for (const p of PLATFORMS) {
  md += `- **${p.name}**: ${p.count} features\n`;
}
md += `\n## Domain Distribution\n\n`;

for (const platform of PLATFORMS) {
  md += `### ${platform.name} Domains\n`;
  for (const d of platform.domains) {
    const count = allFeatures.filter(f => f.platform === platform.name && f.domain === d.name).length;
    md += `- ${d.name}: ${count}\n`;
  }
  md += `\n`;
}

let num = 0;
let currentPlatform = '';
let currentDomain = '';
for (const f of allFeatures) {
  if (f.platform !== currentPlatform) {
    currentPlatform = f.platform;
    currentDomain = '';
    md += `---\n\n## ${f.platform} Features\n\n`;
  }
  if (f.domain !== currentDomain) {
    currentDomain = f.domain;
    md += `### ${f.domain}\n\n`;
  }
  num++;
  md += `${num}. \`${f.id}\` | **${f.title}**\n`;
  md += `   - Description: ${f.description}\n`;
  md += `   - Priority: \`${f.priority}\` | Complexity: \`${f.complexity}\`\n`;
}

await fs.writeFile(path.join(ROOT, 'FEATURE_MASTERLIST_9000.md'), md, 'utf8');
console.log(`✅ Wrote FEATURE_MASTERLIST_9000.md (${allFeatures.length} features)`);

// ── Write JSON ──────────────────────────────────────────────────────
await fs.writeFile(path.join(ROOT, 'FEATURE_MASTERLIST_9000.json'), JSON.stringify(allFeatures, null, 2), 'utf8');
console.log(`✅ Wrote FEATURE_MASTERLIST_9000.json (${allFeatures.length} features)`);
