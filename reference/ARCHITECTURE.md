# Architecture

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 18** - UI library
- **TypeScript 5.5** - Type safety
- **TailwindCSS 3.4** - Utility-first CSS
- **Zod 3.23** - Runtime validation

### Backend
- **Next.js API Routes** - Serverless functions
- **Supabase** - PostgreSQL database, Auth, Storage
- **Inngest** - Event-driven background jobs
- **Node.js 20/23** - Runtime environment

### External Services
- **Google Document AI** - PDF layout extraction and OCR
- **Anthropic Claude Sonnet** - Document analysis
- **Vercel** - Hosting and deployment

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js on Vercel)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST /api/documents/upload                                                 │
│    → Validate auth + file                                                   │
│    → Create document record                                                 │
│    → Upload to Supabase Storage                                            │
│    → Emit document.uploaded event                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INNGEST (Background Jobs)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  document.uploaded → processDocument                                        │
│    ├── Extract with Google Document AI                                      │
│    ├── Track partial extraction failures                                   │
│    └── Emit document.extracted                                              │
│                                                                             │
│  document.extracted → generateFindings                                      │
│    ├── Process in 15-page batches                                          │
│    ├── Verify citations                                                     │
│    └── Calculate bboxes via overlap scoring                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SUPABASE (Database + Storage)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL: documents, findings, citations, etc.                          │
│  Storage: documents/{userId}/{docId}/original.pdf                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── documents/     # Document upload/management
│   │   └── inngest/       # Inngest webhook endpoint
│   ├── dashboard/         # Main dashboard UI
│   ├── case/             # Case management
│   └── document/         # Document viewer
├── inngest/              # Background jobs
│   ├── client.ts         # Event type definitions
│   └── functions/        # Job implementations
│       ├── processDocument.ts
│       └── generateFindings.ts
├── lib/                  # Shared utilities
│   ├── supabase.ts       # Database clients
│   ├── docai.ts          # Google Document AI client
│   ├── pdf-utils.ts      # PDF manipulation
│   ├── pdf-render.ts     # Optional PDF rendering
│   ├── text-normalize.ts # OCR text normalization
│   └── env.ts            # Environment validation
└── types/                # TypeScript definitions
    └── supabase.ts       # Generated DB types
```

## Data Models

### Entity Relationships
```
users (auth.users)
  └── children (1:N)
      └── cases (1:N)
          └── documents (1:N)
              ├── document_pages (1:N)
              ├── document_blocks (1:N)
              └── findings (1:N)
                  └── citations (1:N)
```

### Key Tables

#### documents
- Stores document metadata and processing status
- Supports soft deletes with `deleted_at`
- Tracks extraction quality with `is_partial_extraction`
- Status flow: uploaded → processing → extracted → analyzing → complete

#### findings
- AI-generated or user-created observations
- Categories: services, goals, accommodations, baseline, placement, procedural
- Status: active, needs_review, dismissed, addressed
- Links to citations for evidence

#### citations
- Verifiable quotes linking findings to source text
- Includes bounding boxes for highlighting
- Verification status: pending, verified, failed, skipped
- Uses normalized text for fuzzy matching

## API Design

### REST Endpoints
- `POST /api/documents/upload` - Create document record
- `GET /api/documents/upload?id=<docId>` - Check processing status
- `POST /api/inngest` - Inngest webhook (internal)

### Event Schema
```typescript
Events = {
  "document.uploaded": { documentId: string, userId: string };
  "document.extracted": { documentId: string, pageCount: number, isPartial?: boolean };
  "document.analysis.requested": { documentId: string, analysisType: "findings" | "comparison" };
  "document.failed": { documentId: string, error: string, retryable: boolean };
}
```

## Security Architecture

### Authentication & Authorization
- Supabase Auth with JWT tokens
- Row Level Security (RLS) on all tables
- Helper functions: `user_owns_case()`, `user_owns_document()`

### Data Isolation
- Storage path: `documents/{userId}/{documentId}/`
- RLS policies ensure users only access their data
- Audit log tracks all user actions

### External Service Security
- GCP: Workload Identity Federation (no service keys)
- Supabase: Service role key for server operations
- Inngest: Event signing for webhook security

## Processing Pipeline

### Document Upload Flow
1. Client uploads directly to Supabase Storage
2. Client calls API with metadata
3. API creates document record
4. API emits `document.uploaded` event
5. Inngest starts background processing

### Extraction Process
1. Download PDF from Supabase Storage
2. Send to Google Document AI
3. Parse layout blocks and text
4. Store pages and blocks in database
5. Emit `document.extracted` event

### Analysis Process
1. Fetch document text in 15-page batches
2. Send batch to Claude with specific prompts
3. Parse findings with citations
4. Verify citations via text matching
5. Calculate bounding boxes via overlap scoring
6. Store verified findings

## Performance Considerations

### Database Optimization
- Indexes on common query patterns
- Soft deletes to preserve data
- JSONB for flexible metadata storage

### Processing Limits
- 15-page batches for LLM context limits
- 50MB file size limit for uploads
- 10-minute timeout for Vercel functions
- Retry logic with exponential backoff

### Caching Strategy
- Document text cached during processing
- Supabase client connection pooling
- Inngest event deduplication

## Deployment Architecture

### Environments
- **Development**: Local + preview deployments
- **Production**: Main branch deployment
- Separate Supabase projects per environment

### CI/CD Pipeline
- GitHub Actions for automated migrations
- PR previews for testing
- Smoke tests as deployment gate

### Monitoring
- Inngest dashboard for job monitoring
- Supabase logs for database queries
- Vercel analytics for performance metrics
