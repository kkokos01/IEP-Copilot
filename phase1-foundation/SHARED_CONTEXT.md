# Shared Context - Phase 1 Foundation

## Current State (Baseline)

**What's Working:**
- ✅ Basic IEP upload (file upload UI)
- ✅ OCR with Google Document AI
- ✅ Generic findings table (will be replaced)
- ✅ One document per child

**What's Missing:**
- ❌ Structured data extraction (everything is unstructured text)
- ❌ Field-level evidence/citations
- ❌ Validation rules
- ❌ Rich UI (just plain text display)
- ❌ Analytics/insights

## Architecture Decisions

### 1. Structured Extraction via Claude

**Decision:** Use Claude Sonnet 4.5 with JSON schema output for IEP extraction.

**Rationale:**
- Long context (200K tokens) handles full IEPs
- Excellent instruction following for structured output
- Can include evidence (quotes, page numbers, bounding boxes)
- Lower cost than GPT-4 for similar quality

**Alternatives Considered:**
- GPT-4: More expensive, similar quality
- Fine-tuned models: Not enough training data yet, premature optimization
- Rule-based extraction: Too brittle for varied IEP formats

### 2. Evidence-First Design

**Decision:** Every extracted field includes evidence array with page, quote, bbox, confidence.

**Rationale:**
- Builds trust (users can verify AI didn't hallucinate)
- Enables citation UI (click field → see source)
- Supports debugging (why did AI extract this?)
- Required for compliance (IEP advocates need proof)

**Schema Pattern:**
```json
{
  "fieldName": {
    "value": "extracted content",
    "evidence": [
      {
        "page": 3,
        "quote": "exact text from document",
        "bbox": { "x0": 0.1, "y0": 0.3, "x1": 0.9, "y1": 0.35 },
        "confidence": 0.95
      }
    ]
  }
}
```

### 3. Extraction Separate from Validation

**Decision:** Split extraction (AI-powered) from validation (deterministic rules).

**Rationale:**
- Extraction is expensive, validation is cheap
- Can re-run validators without re-extracting
- Can add new validators retroactively
- Different failure modes (extraction fails → no data, validation fails → issues logged)

**Flow:**
1. Document uploaded → OCR → pages extracted
2. Claude extracts structured data → saved to `extracted_iep_data`
3. Validators run → issues saved to `validation_issues`
4. Analytics compute → saved to `iep_analytics`

### 4. JSONB for Flexibility

**Decision:** Store extracted IEP data as JSONB in PostgreSQL, not rigid columns.

**Rationale:**
- IEP formats vary by state/district
- Schema will evolve as we learn
- Easy to add optional fields without migrations
- PostgreSQL JSONB is indexed and queryable

**Trade-off:**
- Less type safety (handled by validation layer)
- More complex queries (use views for common patterns)

### 5. Async Processing with Inngest

**Decision:** Use Inngest for extraction, validation, analytics pipeline.

**Rationale:**
- Extraction can take 30-60 seconds (too slow for HTTP request)
- Retries on failure (Claude API can be flaky)
- Observable (can track job progress)
- Event-driven (extraction.completed → triggers validators)

**Event Flow:**
```
document.uploaded
  → extract-iep-structured-data
    → extraction.completed
      → validate-iep-extraction (parallel)
      → compute-iep-analytics (parallel)
```

## Technical Stack

**Database:**
- PostgreSQL via Supabase
- Row-level security (RLS) for multi-user
- Triggers for `updated_at` timestamps

**Backend:**
- Next.js 14+ (App Router)
- API routes for mutations
- Server components for data fetching

**AI/ML:**
- Anthropic Claude API (Sonnet 4.5)
- Model: `claude-sonnet-4-5-20250929`
- Max tokens: 16000 (for extraction)
- Temperature: 0.1 (low for consistency)

**Async Jobs:**
- Inngest for background processing
- Local dev: `npx inngest-cli@latest dev`
- Production: Inngest Cloud

**Frontend:**
- React 18+
- shadcn/ui components
- Tailwind CSS
- TypeScript

## Database Conventions

**Naming:**
- Tables: snake_case (e.g., `extracted_iep_data`)
- Columns: snake_case (e.g., `created_at`)
- Indexes: `idx_{table}_{column}` (e.g., `idx_validation_issues_status`)

**Standard Columns:**
Every table has:
```sql
id uuid primary key default uuid_generate_v4(),
created_at timestamptz default now(),
updated_at timestamptz default now()
```

**Soft Deletes:**
Not implemented yet. Hard deletes with `on delete cascade` for related data.

**RLS (Row-Level Security):**
Phase 1: Not critical (single user testing)
Phase 2: Required (advocate multi-tenancy)

## API Conventions

**Inngest Functions:**
- Location: `src/inngest/functions/`
- Naming: `{verb}{Noun}.ts` (e.g., `extractIepStructuredData.ts`)
- Export: `export const functionName = inngest.createFunction(...)`

**API Routes:**
- Location: `src/app/api/`
- RESTful where possible
- Return JSON with consistent error structure

## Cost Estimates

**Per IEP Extraction:**
- OCR (Document AI): $1.50 per document (already implemented)
- Claude extraction (avg 40K tokens): $0.30 (input) + $0.15 (output) = $0.45
- Total: ~$2.00 per IEP

**Monthly at Scale:**
- 100 IEPs/month: $200
- 1,000 IEPs/month: $2,000
- 10,000 IEPs/month: $20,000

**Optimization Levers:**
- Switch to Claude Haiku for re-processing: 5x cheaper
- Cache OCR results: avoid re-processing same document
- Prompt compression: reduce input tokens

## Error Handling

**Extraction Failures:**
- Inngest retries 2x with exponential backoff
- After 3 failures: mark document as `extraction_failed`
- User sees: "We're having trouble processing this IEP. Support has been notified."

**Validation Failures:**
- Never block user (validation is advisory)
- Issues logged to `validation_issues` table
- User sees issues in UI, can dismiss

**Analytics Failures:**
- Retry silently
- Missing analytics should not break UI (graceful degradation)

## Testing Strategy

**Phase 1 Focus:**
- Manual testing with real IEPs (3-5 diverse formats)
- Claude.ai prototyping before coding
- Database migrations tested locally then staging

**Later:**
- Unit tests for validators (deterministic)
- Integration tests for extraction pipeline
- E2E tests for critical user flows

## Environment Variables

**Required for Phase 1:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Document AI (already configured)
GOOGLE_APPLICATION_CREDENTIALS=
GCP_PROJECT_ID=
```

## File Structure

```
src/
├── app/
│   ├── api/
│   └── documents/[id]/page.tsx
├── components/
│   ├── ui/ (shadcn components)
│   └── iep/
│       ├── EvidenceLink.tsx
│       ├── GoalsReviewTable.tsx
│       ├── ValidationIssuesPanel.tsx
│       └── IEPDashboard.tsx
├── inngest/
│   ├── client.ts
│   └── functions/
│       ├── extractIepStructuredData.ts
│       ├── validateIepExtraction.ts
│       └── computeIepAnalytics.ts
├── lib/
│   ├── extraction/
│   │   └── buildExtractionPrompt.ts
│   ├── validators/
│   │   └── iepValidators.ts
│   ├── analytics/
│   │   └── computeIepAnalytics.ts
│   └── supabase.ts
└── schemas/
    └── iep_extraction.v1.schema.json
```

## Metrics to Track (Week 1+)

**Extraction Quality:**
- Accuracy: % of fields correctly extracted (manual review sample)
- Completeness: % of required fields found
- Evidence quality: % of citations that match source

**Performance:**
- Processing time (upload → extraction complete)
- Cost per extraction
- Inngest job success rate

**User Behavior (Week 4+):**
- Time spent reviewing extracted data
- % of users who click evidence links
- % of users who edit fields

**Dashboard:**
Create simple Supabase dashboard or Metabase view to track these daily.

---

*Shared Context for Phase 1 Implementation*
*Last Updated: 2026-01-03*
