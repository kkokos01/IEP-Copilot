# Phase 1: Foundation Architecture - Overview
**Duration:** 8 weeks (Weeks 1-6 detailed, Weeks 7-8 strategic)
**Goal:** Replace generic findings with structured extraction, enable passive intelligence

## Implementation Files

Read and implement in this order:

1. **`SHARED_CONTEXT.md`** - Common setup, architecture decisions, prerequisites
2. **`week-1-2-structured-extraction.md`** - Database, schema, extraction pipeline
3. **`week-3-validators.md`** - Validation rules and issue tracking
4. **`week-4-5-evidence-ui.md`** - UI components with source citations
5. **`week-6-analytics.md`** - Auto-generated insights dashboard
6. **`week-7-8-strategic.md`** - High-level approach for passive intelligence

## Success Criteria by End of Week 6

- ✅ Extraction accuracy ≥85%
- ✅ Processing time <2 min per IEP
- ✅ Evidence quality: ≥90% citations valid
- ✅ Cost per extraction <$2
- ✅ Users can view extracted data with source links
- ✅ Validation issues auto-detected
- ✅ Analytics auto-compute from structured data

## Why This Sequence

**Weeks 1-2 First:** Extraction is the foundation. Everything else depends on structured data quality.

**Week 3 Second:** Validators run independently and can be added/modified without re-extracting. Separate them from extraction.

**Weeks 4-5 Third:** UI needs real data to build against. Can't build evidence links without extraction working.

**Week 6 Fourth:** Analytics require stable schema. Computing insights is meaningless without validated data.

**Weeks 7-8 Strategic:** Passive intelligence reuses OCR + extraction pipeline. Detail it 2 weeks before implementation based on learnings from 1-6.

## Team & Resources

**Phase 1 (Weeks 1-8):**
- 1 full-stack developer
- 1 designer (part-time, weeks 4-5 for UI components)
- Budget: $5K (LLM costs, tools, testing)

## Critical Dependencies

**Technical Stack (assumed):**
- Database: PostgreSQL (Supabase)
- Backend: Next.js API routes
- Async jobs: Inngest
- AI: Anthropic Claude API
- Frontend: React, shadcn/ui components

**Before Starting Week 1:**
- Supabase project set up
- Anthropic API key configured
- Inngest dev environment running
- Basic IEP upload working (current state)

## Adaptation Triggers

**Re-plan if:**
1. Extraction accuracy <85% after week 2 → May need different approach
2. Processing cost >$2/IEP → Need to optimize prompts or model
3. Evidence linking quality poor → May need different OCR provider
4. Schema changes needed in week 3+ → Affects all downstream work

**When to detail Week 7-8:**
- 2 weeks before (end of week 5)
- After validating extraction quality with production IEPs
- After understanding actual costs and latency

## Next Steps

1. Review `SHARED_CONTEXT.md` for architecture decisions
2. Begin `week-1-2-structured-extraction.md` implementation
3. Document learnings daily (will inform weeks 7-8 planning)
4. Set up metrics dashboard from day 1 (track costs, accuracy, latency)

---

*Phase 1 Overview*
*Last Updated: 2026-01-03*
