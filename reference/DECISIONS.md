# Architecture Decision Records

## 2024-12-20: Use Supabase over Firebase

**Status**: Implemented  
**Decision**: Use Supabase (PostgreSQL) instead of Firebase for backend  
**Context**: Need a full-stack solution with auth, database, and storage  

### Alternatives Considered
- **Firebase**: NoSQL, limited query capabilities, vendor lock-in
- **AWS Amplify**: Complex setup, multiple services to manage
- **Custom Backend**: Full control but high maintenance overhead

### Rationale
- SQL relationships needed for complex document/citation structure
- Row Level Security (RLS) for multi-tenant isolation
- Built-in auth with JWT support
- Single vendor for all backend services
- Mature ecosystem with good TypeScript support

### Consequences
- ✅ Strong typing with generated types
- ✅ Complex queries across related tables
- ✅ Easy local development with Docker
- ✅ Direct SQL access for debugging
- ❌ Learning curve for team members
- ❌ Migration if outgrowing PostgreSQL

---

## 2024-12-20: Event-Driven Architecture with Inngest

**Status**: Implemented  
**Decision**: Use Inngest for background job processing  
**Context**: Need reliable document processing pipeline with retries  

### Alternatives Considered
- **Direct processing in API routes**: Timeout issues, no retries
- **Cron jobs**: Poor visibility, difficult to trigger on demand
- **AWS SQS + Lambda**: Complex setup, higher cost
- **BullMQ (Redis)**: Self-hosted, additional infrastructure

### Rationale
- Event-driven model matches document processing flow
- Built-in retry mechanisms with exponential backoff
- Excellent observability and debugging UI
- Vercel integration with simple webhook setup
- Pay-per-use pricing model
- TypeScript-first with event schema validation

### Consequences
- ✅ Reliable processing with automatic retries
- ✅ Great debugging experience
- ✅ Scalable without infrastructure management
- ✅ Event schema prevents runtime errors
- ❌ Additional dependency
- ❌ Vendor lock-in for job processing

---

## 2024-12-22: Workload Identity Federation for GCP Auth

**Status**: Implemented  
**Decision**: Use WIF instead of service account JSON keys  
**Context**: Need secure GCP authentication for production deployment  

### Alternatives Considered
- **Service Account JSON keys**: 
  - Easy to use but security risk
  - Key rotation is manual
  - Keys can be checked into git accidentally
- **Compute Engine Service Account**: 
  - Only works on GCP infrastructure
  - Not compatible with Vercel

### Rationale
- No long-lived secrets to manage
- Automatic credential rotation
- Works with Vercel's OIDC integration
- Follows security best practices
- Audit trail for all access

### Consequences
- ✅ No risk of leaked keys
- ✅ Automatic credential management
- ✅ Production-ready security
- ❌ More complex initial setup
- ❌ Documentation could be better

---

## 2024-12-28: Direct Storage Uploads

**Status**: Implemented  
**Decision**: Upload files directly to Supabase Storage, not via API  
**Context**: Vercel has 4.5MB request body limit  

### Alternatives Considered
- **Upload via API route**: 
  - Simpler client code
  - But hits Vercel limits
  - Timeout issues on large files
- **S3 presigned URLs**: 
  - Additional service to manage
  - More complex CORS setup

### Rationale
- Bypasses Vercel limitations completely
- Reduces server load and costs
- More reliable for large files
- Simpler error handling
- Still secure with RLS policies

### Consequences
- ✅ Can handle files up to 50MB
- ✅ Faster uploads (direct to storage)
- ✅ No server timeouts
- ❌ More complex client code
- ❌ Two-step upload process

---

## 2025-01-05: Batched LLM Processing

**Status**: Implemented  
**Decision**: Process documents in 15-page batches  
**Context**: LLM context limits and reliability concerns  

### Alternatives Considered
- **Full document at once**: 
  - Exceeds context limits
  - Single point of failure
- **Page-by-page processing**: 
  - Too many API calls
  - Loses context between pages
- **Semantic chunking**: 
  - Complex to implement
  - Variable chunk sizes

### Rationale
- Fits within Claude's context window (~100K tokens)
- Maintains some context between pages
- Reduces failure impact (lose only 15 pages)
- Cost-effective with fewer API calls
- Easy to implement and debug

### Consequences
- ✅ Reliable processing within limits
- ✅ Faster failure recovery
- ✅ Predictable costs
- ❌ Some context lost at boundaries
- ❌ May miss cross-batch patterns

---

## 2025-01-08: Soft Delete Pattern

**Status**: Implemented  
**Decision**: Use `deleted_at` timestamps instead of hard deletes  
**Context**: Need audit trail and ability to recover data  

### Alternatives Considered
- **Hard deletes**: 
  - Simple implementation
  - But permanent data loss
  - Audit trail gaps
- **Archive tables**: 
  - Complex to maintain
  - Query complications
  - Schema duplication

### Rationale
- Compliance requirements for data retention
- Users often accidentally delete important documents
- Audit trail needs complete history
- Easy to implement with triggers
- Can still query "active" data efficiently

### Consequences
- ✅ Recover from accidental deletions
- ✅ Complete audit history
- ✅ Simple implementation
- ❌ Larger storage requirements
- ❌ Must remember to filter in queries

---

## 2025-01-10: Citation Verification Strategy

**Status**: Implemented  
**Decision**: Use normalized text matching with overlap scoring  
**Context**: Need to verify AI-generated citations against source  

### Alternatives Considered
- **Exact string matching**: 
  - Fails with OCR errors
  - Too strict
- **Fuzzy matching only**: 
  - Can produce false positives
  - Hard to tune thresholds
- **Embedding similarity**: 
  - Computationally expensive
  - Overkill for this use case

### Rationale
- Normalized text handles most OCR variations
- Overlap scoring ensures spatial proximity
- Exact match preferred, fuzzy as fallback
- Transparent verification process
- Can explain why verification failed

### Consequences
- ✅ Handles minor OCR errors
- ✅ Spatial verification with bboxes
- ✅ Configurable strictness
- ❌ Still fails on major OCR errors
- ❌ Complex implementation

---

## 2025-01-15: TypeScript Strict Mode

**Status**: Implemented  
**Decision**: Enable strict mode and avoid `any` types  
**Context**: Improve code quality and reduce runtime errors  

### Alternatives Considered
- **Standard TypeScript**: 
  - Easier migration
  - But allows unsafe patterns
- **JavaScript with JSDoc**: 
  - No compile-time checking
  - Poor IDE support

### Rationale
- Catches errors at compile time
- Better IDE support with autocomplete
- Self-documenting code
- Forces explicit error handling
- Required for type-safe database access

### Consequences
- ✅ Fewer runtime errors
- ✅ Better developer experience
- ✅ Self-documenting code
- ❌ Longer initial development
- ❌ More complex type definitions

---

## 2025-01-18: Automated Migrations via GitHub Actions

**Status**: Implemented  
**Decision**: Automatic database migrations on PR/merge  
**Context**: Need reliable database deployment process  

### Alternatives Considered
- **Manual migrations**: 
  - Error-prone
  - Easy to forget
- **Migration in application code**: 
  - Security concerns
  - Timing issues
- **Separate deployment step**: 
  - Additional complexity
  - Can be forgotten

### Rationale
- Migrations always applied before code
- Separate environments (dev/prod)
- Rollback capability
- Audit trail of changes
- No manual intervention needed

### Consequences
- ✅ Always in sync with code
- ✅ Zero manual errors
- ✅ Clear history of changes
- ❌ Requires GitHub secrets
- ❌ More complex initial setup

---

## 2026-01-01: Adaptive Fuzzy Verification by Default

**Status**: Implemented
**Decision**: Enable fuzzy citation verification by default, with adaptive fallback strategy
**Context**: Citation verification was failing too often on OCR documents

### Alternatives Considered
- **Fuzzy disabled by default**:
  - Previous approach
  - Required manual opt-in
  - Led to many false "needs_review" findings
- **Fuzzy only (no exact/normalized)**:
  - Simpler but less accurate
  - Could produce false positives
- **ML-based verification**:
  - More sophisticated but complex
  - Overkill for current needs

### Rationale
- OCR errors are common in scanned IEP documents
- Multi-tier approach (exact → normalized → fuzzy) is most accurate
- Logging match statistics helps monitor OCR quality
- Default-on improves user experience without configuration
- Can still disable for debugging via env var

### Consequences
- ✅ Higher citation verification success rate
- ✅ Better handling of OCR artifacts
- ✅ Statistics logging for quality monitoring
- ✅ Tracks verification_method for analytics
- ❌ Slightly more compute for fuzzy matching
- ❌ Potential for false positives (mitigated by 0.85 threshold)

---

## 2026-01-01: Sentry for Error Tracking

**Status**: Implemented
**Decision**: Use Sentry for production error monitoring
**Context**: Need visibility into errors during beta launch

### Alternatives Considered
- **Vercel Analytics only**:
  - Limited error details
  - No stack traces
- **LogRocket**:
  - More expensive
  - Session recording not needed
- **Self-hosted (Grafana/Loki)**:
  - More control but maintenance overhead
  - Overkill for current scale

### Rationale
- Industry standard for error tracking
- Free tier sufficient for beta
- Excellent Next.js integration
- Session replay for debugging
- Alerts and dashboards included

### Consequences
- ✅ Real-time error alerts
- ✅ Stack traces with source maps
- ✅ Session replay for reproduction
- ✅ Performance monitoring included
- ❌ Additional dependency
- ❌ Requires DSN configuration per environment

---

## 2026-01-01: Structured Error Responses with Codes

**Status**: Implemented
**Decision**: Replace generic errors with structured responses including codes and hints
**Context**: Users were seeing unhelpful "Internal server error" messages

### Alternatives Considered
- **Generic error messages**:
  - Previous approach
  - Poor user experience
  - Difficult to debug
- **Detailed technical errors**:
  - Too much information for users
  - Security concerns
- **Error codes only**:
  - Not user-friendly
  - Requires lookup table

### Rationale
- User-friendly messages reduce support burden
- Error codes enable support to quickly identify issues
- Hints provide actionable next steps
- Consistent structure enables frontend error handling
- Technical details logged server-side only

### Consequences
- ✅ Better user experience
- ✅ Faster support resolution
- ✅ Consistent error format
- ✅ Actionable guidance for users
- ❌ More code to maintain
- ❌ Must update codes when adding new errors

---

## 2026-01-01: Layout Parser Response Format Handling (MILESTONE FIX)

**Status**: Implemented ✅ MVP WORKING
**Decision**: Support Layout Parser response format with proper page count derivation
**Context**: Document AI returned 0 pages because code expected `document.pages` array but Layout Parser uses `documentLayout.blocks` with `pageSpan`

### The Actual Problem (Root Cause Analysis)
1. Layout Parser does NOT populate `document.text` or `document.pages[].paragraphs`
2. Instead, all text is in `documentLayout.blocks[].textBlock.text`
3. Page information comes from `block.pageSpan.pageStart/pageEnd`, not `document.pages.length`
4. Our code was checking `document.pages.length` which was 0, causing early return

### Actual Response Format (from parsedTexasResults.json)
```json
{
  "pages": [{"pageNumber": 1, "image": {...}}],  // NO TEXT HERE
  "documentLayout": {
    "blocks": [
      {
        "blockId": "...",
        "textBlock": {"text": "ARD Type:", "type": "paragraph"},
        "pageSpan": {"pageStart": 1, "pageEnd": 1},
        "boundingBox": {...}
      }
    ]
  }
}
```

### The Fix
- Derive page count from blocks' `pageSpan.pageEnd` values (find max)
- Extract text from `textBlock.text` for each block
- Group text by page number from `pageSpan.pageStart`
- Handle nested blocks in `textBlock.blocks` if present

### Consequences
- ✅ Successfully processed 7 real IEP documents
- ✅ Full text extraction working
- ✅ Findings generated and displayed in UI
- ✅ Citations verified against source
- ❌ Bounding boxes may still be null (secondary issue)

---

## 2026-01-01: Base64 Encoding for GCP Credentials (RECOMMENDED)

**Status**: Implemented ✅ MVP WORKING
**Decision**: Use Base64-encoded service account JSON as primary credential method
**Context**: Vercel environment variables mangle JSON with newlines, causing parsing failures

### Alternatives Considered
- **Plain JSON with newline preprocessing**:
  - Fragile, depends on escape sequence handling
  - Failed in production despite working locally
- **Store credentials in secret manager**:
  - More secure but adds complexity
  - Additional service dependency
- **Base64 encode credentials** (CHOSEN):
  - Completely avoids all escape/newline issues
  - Simple to generate: `cat service-account.json | base64`
  - Industry standard practice

### Implementation
```typescript
// Priority 1: Base64-encoded service account key (recommended for Vercel)
const base64Key = process.env.GCP_SERVICE_ACCOUNT_KEY_BASE64;
if (base64Key) {
  const jsonStr = Buffer.from(base64Key, "base64").toString("utf-8");
  const credentials = JSON.parse(jsonStr);
  return new DocumentProcessorServiceClient({ credentials });
}
```

### How to Set Up
1. Get your service account JSON file
2. Run: `cat your-service-account.json | base64`
3. Copy the output to Vercel env var: `GCP_SERVICE_ACCOUNT_KEY_BASE64`

### Consequences
- ✅ Works reliably in Vercel production
- ✅ No escape sequence issues
- ✅ Simple one-command generation
- ✅ Fallback to plain JSON still available
- ❌ Less readable (but you shouldn't be reading credentials anyway)

---

## 2026-01-01: Client-Side PDF Text Highlighting

**Status**: Implemented (Mostly Working)
**Decision**: Use pdf.js text layer for client-side citation highlighting instead of server-side bbox
**Context**: Document AI Layout Parser doesn't provide bounding box coordinates; all citations had null bbox

### The Problem
- Layout Parser provides intelligent document structure but NO bounding boxes
- OCR processor provides bounding boxes but less intelligent text extraction
- 100% of citations had null bbox, so PDF highlighting wasn't working

### Alternatives Considered
- **Server-side bbox from OCR processor**:
  - Requires switching away from Layout Parser
  - Loses intelligent document structure/chunking
  - User explicitly rejected: "I do not want less intelligent text extraction"
- **Hybrid extraction (Layout Parser + OCR)**:
  - Run both processors and merge results
  - Doubles API costs and processing time
  - Complex text matching between different extractions
- **Page-level fallback (just navigate to page)**:
  - Simple but not useful: "we already navigate to the page but we need to show specific text"
- **Client-side text search** (CHOSEN):
  - Enable pdf.js text layer rendering
  - Search for `quote_text` in the text layer DOM
  - Highlight matching text spans with CSS

### Implementation
```typescript
// PdfViewer.tsx
// 1. Enable text layer rendering
<Page renderTextLayer={true} onRenderSuccess={() => setTextLayerReady(true)} />

// 2. Search for quote text after render
const normalizedSearch = normalizeText(searchText);
const normalizedPage = normalizeText(fullText);
const matchStart = normalizedPage.indexOf(normalizedSearch);

// 3. Highlight matching spans
if (spanOverlaps) {
  span.style.backgroundColor = 'rgba(255, 213, 0, 0.5)';
}
```

### Fuzzy Matching Strategy
1. **Full match**: Search for entire normalized quote
2. **Partial fallback**: Try 80%, 60%, 40% of quote length
3. **Normalization**: Handle whitespace, quotes, dashes variations

### Consequences
- ✅ Maintains Layout Parser's intelligent extraction
- ✅ No additional API calls or processing costs
- ✅ Works with verified citations (text confirmed to exist)
- ✅ Accurate text-level highlighting (not just bbox rectangles)
- ✅ Auto-scrolls to highlighted text
- ⚠️ Some edge cases still not highlighting (needs investigation)
- ❌ Requires text layer rendering (slightly more DOM elements)
- ❌ Matching can fail if text differs significantly from stored quote

### Known Edge Cases (To Investigate)
- Very long quotes may have OCR differences in middle
- Multi-paragraph quotes spanning different blocks
- Text with significant formatting differences
- Quotes from scanned documents with OCR errors

---

## 2026-01-03: Child-Level Analytics Architecture

**Status**: Implemented
**Decision**: Build child analytics with client-side fuzzy matching and text parsing algorithms
**Context**: Need individual student analytics for both B2C (parents) and B2B (advocates) markets

### Alternatives Considered
- **Server-side fuzzy matching**: Run matching in database queries
  - Pro: Potentially faster for large datasets
  - Con: Complex PostgreSQL functions, harder to debug
- **Pre-compute all comparisons**: Store goal mappings at extraction time
  - Pro: Instant API responses
  - Con: Requires re-processing all documents when algorithm improves
- **Client-side only**: No API, compute everything in browser
  - Pro: No server cost
  - Con: Slow for users, can't cache results

### Rationale
- Fuzzy matching algorithm (Levenshtein distance) is simple and fast enough for API runtime
- Text parsing for service hours is deterministic and lightweight
- Client-side rendering already in place for other dashboards
- API-first approach allows future optimizations without UI changes
- Can add caching layer later if needed (5-minute TTL)

### Consequences
- ✅ Fast development iteration on matching algorithms
- ✅ Easy to debug with console logging in API
- ✅ Can improve accuracy without database migrations
- ✅ API response < 300ms for typical child (7 IEPs)
- ✅ Clean separation: API aggregates, UI presents
- ❌ Every request recalculates comparisons (no caching yet)
- ❌ May need optimization if children have 20+ IEPs

### Implementation Details
- **Fuzzy Matching**: 80% similarity threshold using Levenshtein distance
- **Service Hours**: Text parsing with regex ("2 times per week, 30 minutes" → 60 min/week)
- **Ownership**: Multi-step verification (children → cases → documents → extracted_iep_data)
- **Nested Relationships**: Handle Supabase `!inner` joins returning objects not arrays

---

## Pending Decisions

### Migrate to Vercel OIDC for GCP Authentication
**Context**: Currently using Base64-encoded service account keys. OIDC is more secure.
**Priority**: High - should implement before production launch
**Options**:
- Keep Base64 credentials (current - works but requires key rotation)
- Migrate to Vercel OIDC federation (recommended - no credentials to manage)

**Requirements for OIDC**:
1. Create GCP Workload Identity Pool and Provider
2. Configure service account with workload identity binding
3. Set 5 env vars in Vercel (project ID, number, SA email, pool ID, provider ID)
4. Update code to use `@vercel/oidc` package
5. See: https://vercel.com/docs/security/secure-backend-access/oidc/gcp

### PDF Rendering Strategy
**Context**: Optional server-side PDF rendering for highlighting  
**Options**: 
- Keep as optional feature
- Remove entirely (client-side only)
- Invest in proper server rendering

### Multi-tenant Architecture
**Context**: Future support for school districts  
**Options**:
- Row-level filtering only
- Separate schemas per organization
- Database per large organization

### Caching Strategy
**Context**: Improve performance for repeated access  
**Options**:
- Supabase Edge Functions with Redis
- Vercel KV
- In-memory caching with stale-while-revalidate

### Mobile App Approach
**Context**: Future mobile presence  
**Options**:
- React Native app
- Progressive Web App
- Native Swift/Kotlin apps

---

## Decision Template

```markdown
## YYYY-MM-DD: [Decision Title]

**Status**: [Proposed|Implemented|Rejected|Deprecated]  
**Decision**: [Brief statement of decision]  
**Context**: [Problem or situation requiring decision]  

### Alternatives Considered
- **Option 1**: [Description]
- **Option 2**: [Description]
- **Option 3**: [Description]

### Rationale
- [Reason 1]
- [Reason 2]
- [Reason 3]

### Consequences
- ✅ [Positive outcome 1]
- ✅ [Positive outcome 2]
- ❌ [Negative outcome 1]
- ❌ [Negative outcome 2]
```
