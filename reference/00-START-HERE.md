# Reference Documentation - Start Here

Welcome to the IEP Copilot reference documentation. This guide will help you navigate the documentation efficiently.

## 📍 New to the Project?

Start with these files in order:

1. **[../README.md](../README.md)** (Root)
   - Quick start guide
   - Setup and deployment instructions
   - Environment configuration

2. **[PROJECT.md](./PROJECT.md)**
   - Project overview and current status
   - Key features and decisions
   - Known issues and blockers
   - Target users and business context

3. **[ARCHITECTURE.md](../ARCHITECTURE.md)** (Root)
   - Comprehensive technical architecture
   - Database schema and RLS policies
   - API patterns and processing pipeline
   - Security and storage architecture

## 🎯 Working on Specific Tasks?

### Development & Implementation
- **[TODO.md](./TODO.md)** - Current sprint focus and roadmap
- **[PROMPTS.md](./PROMPTS.md)** - Reusable prompts for common tasks
- **[CONTEXT.md](./CONTEXT.md)** - AI assistant guidelines and preferences

### Understanding Past Decisions
- **[DECISIONS.md](./DECISIONS.md)** - Architecture Decision Records (ADRs)
  - Why certain technology choices were made
  - Trade-offs considered
  - Historical context for current architecture

### Testing & Quality
- **[../test-docs/](../test-docs/)** - Test data systems
  - Comprehensive testing system (recommended)
  - Batch IEP testing
  - Real sample document guidelines

## 📂 Reference Directory Structure

```
reference/
├── 00-START-HERE.md         ← You are here
├── PROJECT.md               ← Project overview and status
├── TODO.md                  ← Current work and roadmap
├── CONTEXT.md               ← AI assistant context
├── DECISIONS.md             ← Architecture decisions
├── PROMPTS.md               ← Reusable prompts
├── TWO-PANE-UI-IMPLEMENTATION.md  ← UI implementation guide
│
├── future-features/         ← Not yet implemented
│   ├── ENGAGEMENT_FEATURES_ANALYSIS.md
│   ├── PASSIVE_ENGAGEMENT_STRATEGY.md
│   └── IEP_COPILOT_SOCIAL_MEDIA_LAUNCH_PLAN.md
│
└── archive/                 ← Historical documents
    ├── planning/            ← Strategic planning docs
    ├── sessions/            ← Development session notes
    └── phase1-foundation-completed/  ← Completed implementation guides
```

## 🔍 Quick Reference by Topic

### Architecture & Design
- System architecture: [../ARCHITECTURE.md](../ARCHITECTURE.md)
- Design decisions: [DECISIONS.md](./DECISIONS.md)
- UI implementation: [TWO-PANE-UI-IMPLEMENTATION.md](./TWO-PANE-UI-IMPLEMENTATION.md)

### Current Work
- Active tasks: [TODO.md](./TODO.md)
- Project status: [PROJECT.md](./PROJECT.md)

### Development Tools
- Common prompts: [PROMPTS.md](./PROMPTS.md)
- AI assistant guidelines: [CONTEXT.md](./CONTEXT.md)

### Testing
- Test data: [../test-docs/](../test-docs/)
- Comprehensive system: [../test-docs/COMPREHENSIVE_TESTING.md](../test-docs/COMPREHENSIVE_TESTING.md)
- Batch testing: [../test-docs/BATCH_TESTING.md](../test-docs/BATCH_TESTING.md)

### Future Planning
- Engagement features: [future-features/ENGAGEMENT_FEATURES_ANALYSIS.md](./future-features/ENGAGEMENT_FEATURES_ANALYSIS.md)
- Passive intelligence: [future-features/PASSIVE_ENGAGEMENT_STRATEGY.md](./future-features/PASSIVE_ENGAGEMENT_STRATEGY.md)
- Social media strategy: [future-features/IEP_COPILOT_SOCIAL_MEDIA_LAUNCH_PLAN.md](./future-features/IEP_COPILOT_SOCIAL_MEDIA_LAUNCH_PLAN.md)

### Historical Context
- Phase 1 implementation: [archive/phase1-foundation-completed/](./archive/phase1-foundation-completed/)
- Strategic plans: [archive/planning/](./archive/planning/)
- Development sessions: [archive/sessions/](./archive/sessions/)

## 🚀 Common Tasks

### I need to understand the codebase
1. Read [PROJECT.md](./PROJECT.md) for overview
2. Review [../ARCHITECTURE.md](../ARCHITECTURE.md) for technical details
3. Check [DECISIONS.md](./DECISIONS.md) for context on why things are the way they are

### I'm starting new development work
1. Check [TODO.md](./TODO.md) for current priorities
2. Review [CONTEXT.md](./CONTEXT.md) for coding conventions
3. Use [PROMPTS.md](./PROMPTS.md) for common development prompts

### I need to test my changes
1. Read [../test-docs/README.md](../test-docs/README.md) for testing systems
2. Generate test data: [../test-docs/COMPREHENSIVE_TESTING.md](../test-docs/COMPREHENSIVE_TESTING.md)
3. Run smoke tests: See [../README.md](../README.md)

### I'm planning future features
1. Check [future-features/](./future-features/) for existing plans
2. Review [DECISIONS.md](./DECISIONS.md) to understand past trade-offs
3. Document new decisions in [DECISIONS.md](./DECISIONS.md)

### I need to understand a past decision
1. Search [DECISIONS.md](./DECISIONS.md) for ADRs
2. Check [archive/planning/](./archive/planning/) for strategic context
3. Review [archive/sessions/](./archive/sessions/) for detailed session notes

## 📝 Documentation Conventions

### When to Update Which File

- **TODO.md** - Update when priorities change or tasks complete
- **PROJECT.md** - Update when project status changes significantly
- **DECISIONS.md** - Add new ADR when making significant technical decisions
- **ARCHITECTURE.md** - Update when architecture changes (schema, APIs, etc.)
- **CONTEXT.md** - Update when coding conventions change

### Archive Policy

Documents are archived when:
- They're completed (like phase1-foundation)
- They're historical session notes (assistant-comms)
- They're superseded by newer plans

Archived documents are kept for historical context but aren't actively maintained.

## ❓ Still Have Questions?

If you can't find what you're looking for:
1. Check the [archive/](./archive/) folders for historical context
2. Search across all markdown files for keywords
3. Review [../README.md](../README.md) for setup and deployment questions

---

**Last Updated:** 2026-01-03
**Maintained by:** IEP Copilot team
