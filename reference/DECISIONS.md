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

## Pending Decisions

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
