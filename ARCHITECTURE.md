# IEP-Copilot Architecture Reference

**Last Updated:** 2026-01-03 20:05 PST

## Overview

This document provides a comprehensive reference for the IEP-Copilot application architecture, covering database schema, API patterns, security model, and implementation guidelines.

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [Security & RLS Policies](#security--rls-policies)
3. [API Patterns](#api-patterns)
4. [Frontend Data Fetching](#frontend-data-fetching)
5. [Processing Pipeline (Inngest)](#processing-pipeline-inngest)
6. [Storage Architecture](#storage-architecture)
7. [Implementation Guidelines](#implementation-guidelines)
8. [TypeScript Types](#typescript-types)

---

## Database Schema

### Core Entity Relationships

```
users (auth.users)
  ↓ user_id
children
  ↓ child_id
cases
  ↓ case_id
documents
  ├─→ document_pages (CASCADE)
  ├─→ document_blocks (CASCADE)
  ├─→ findings (CASCADE)
  │     ├─→ citations (CASCADE)
  │     └─→ validation_issues (CASCADE)
  ├─→ extracted_iep_data (CASCADE)
  └─→ requests/events (SET NULL)
```

### Documents Table

**Location:** `supabase/migrations/001_init_iep_copilot.sql:111-157`

```sql
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Metadata
  type public.document_type NOT NULL DEFAULT 'other',
  source_filename text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  file_size_bytes bigint NULL,

  -- IEP-specific dates
  effective_date date NULL,
  meeting_date date NULL,

  -- Processing state
  status public.document_status NOT NULL DEFAULT 'uploaded',
  page_count int NULL,

  -- Extraction tracking
  extractor text NOT NULL DEFAULT 'gcp_docai_layout',
  extractor_version text NULL,
  extraction_started_at timestamptz NULL,
  extraction_completed_at timestamptz NULL,

  -- Error handling
  error_message text NULL,
  error_details jsonb NULL,
  retry_count int NOT NULL DEFAULT 0,
  is_partial_extraction boolean NOT NULL DEFAULT false,

  -- Soft deletes
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
)
```

### Enums

**Document Types** (7 types):
- `iep` - Individual Education Program
- `evaluation` - Evaluations/assessments
- `progress_report` - Progress reports
- `email` - Email communications
- `meeting_notes` - Meeting notes
- `prior_written_notice` - PWN documents
- `other` - Other documents

**Document Status** (7 states):
- `uploaded` - Initial state when file is stored
- `processing` - OCR extraction in progress
- `extracted` - OCR complete, ready for analysis
- `analyzing` - AI findings generation in progress
- `complete` - All processing finished successfully
- `analysis_failed` - Findings generation failed
- `failed` - Critical processing failure

### CASCADE Deletion Behavior

When a document is deleted (hard delete):
- ✅ **document_pages** - Deleted automatically
- ✅ **document_blocks** - Deleted automatically
- ✅ **findings** - Deleted automatically
  - ✅ **citations** - Deleted when finding deleted
  - ✅ **validation_issues** - Deleted when finding deleted
- ✅ **extracted_iep_data** - Deleted automatically
  - ✅ **validation_issues** - Deleted when extracted_iep_data deleted
- ⚠️ **requests/events** - Reference set to NULL (survive deletion)

### Performance Indexes

```sql
idx_documents_case ON documents(case_id) WHERE deleted_at IS NULL
idx_documents_status ON documents(status) WHERE deleted_at IS NULL
idx_documents_type ON documents(type) WHERE deleted_at IS NULL
idx_documents_effective_date ON documents(case_id, effective_date)
  WHERE type = 'iep' AND deleted_at IS NULL
```

---

## Security & RLS Policies

### Helper Functions

**Location:** `supabase/migrations/001_init_iep_copilot.sql:420-546`

```sql
-- Check if user owns a case
CREATE FUNCTION user_owns_case(p_case_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.cases ca
    JOIN public.children ch ON ch.id = ca.child_id
    WHERE ca.id = p_case_id
      AND ch.user_id = auth.uid()
      AND ch.deleted_at IS NULL
      AND ca.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user owns a document
CREATE FUNCTION user_owns_document(p_document_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.documents d
    JOIN public.cases ca ON ca.id = d.case_id
    JOIN public.children ch ON ch.id = ca.child_id
    WHERE d.id = p_document_id
      AND ch.user_id = auth.uid()
      AND ch.deleted_at IS NULL
      AND ca.deleted_at IS NULL
      AND d.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

**Key Features:**
- Functions use `SECURITY DEFINER` (run as creator, not caller)
- Respects `deleted_at` soft deletes throughout chain
- Validates entire ownership chain (user → children → cases → documents)

### RLS Policies

**Documents Policy:**
```sql
CREATE POLICY "documents_policy" ON public.documents FOR ALL
  USING (deleted_at IS NULL AND public.user_owns_case(case_id))
  WITH CHECK (public.user_owns_case(case_id));
```

**Scoping:**
- **SELECT:** Only non-deleted documents where user owns the case
- **INSERT:** Case ownership required
- **UPDATE:** Case ownership required
- **DELETE:** Case ownership required

**Dependent Tables:**
- All use similar patterns via `user_owns_document()` or `user_owns_case()`
- Extracted IEP data has special policies for service role inserts

---

## API Patterns

### Authentication & User Verification

**Pattern:**
```typescript
// Extract token from Authorization header
const authHeader = request.headers.get("authorization");
if (!authHeader?.startsWith("Bearer ")) {
  return errorResponse(ERRORS.AUTH_MISSING);
}
const token = authHeader.slice(7); // Remove "Bearer "

// Verify and get user
const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
if (error || !user) {
  return errorResponse(ERRORS.AUTH_INVALID);
}

const userId = user.id;
```

### Ownership Verification

**Pattern:**
```typescript
// Step 1: Load resource with ownership chain
const { data: caseData, error } = await getSupabaseAdmin()
  .from("cases")
  .select(`id, child:children!inner(user_id)`)
  .eq("id", caseId)
  .single();

if (error || !caseData) {
  return errorResponse(ERRORS.CASE_NOT_FOUND);
}

// Step 2: Verify ownership
if (caseData.child.user_id !== userId) {
  return errorResponse(ERRORS.ACCESS_DENIED);
}
```

### Error Handling

**Comprehensive Error Codes:**
```typescript
// 401 Authentication
AUTH_MISSING, AUTH_INVALID

// 403 Authorization
ACCESS_DENIED

// 400 Validation
INVALID_CONTENT_TYPE, MISSING_DOCUMENT_ID, MISSING_STORAGE_PATH,
MISSING_CASE_ID, MISSING_FILE_INFO, INVALID_FILE_TYPE, FILE_TOO_LARGE

// 404 Not Found
CASE_NOT_FOUND, DOCUMENT_NOT_FOUND

// 500 Server
DOCUMENT_CREATE_FAILED, PROCESSING_START_FAILED, INTERNAL_ERROR
```

**Error Response Format:**
```typescript
return NextResponse.json(
  {
    success: false,
    error: {
      code: 'ERROR_CODE',
      message: 'User-friendly message',
      hint: 'Actionable suggestion'
    }
  },
  { status: 400 }
);
```

### Document Upload API

**Location:** `src/app/api/documents/upload/route.ts`

**Two-Stage Process:**
1. Client uploads file directly to Supabase Storage
2. Client calls API to create database record

**POST /api/documents/upload:**
```typescript
Request:
{
  documentId: string,        // UUID generated by client
  storagePath: string,       // Path in Supabase Storage
  caseId: string,            // Target case UUID
  type: string,              // document_type enum
  fileName: string,          // source_filename
  fileSize: number,          // file_size_bytes
  mimeType: string           // MIME type
}

Response (200):
{
  success: true,
  documentId: string,
  message: "Document uploaded successfully!"
}
```

**Validation:**
- Only `application/pdf` allowed
- Max file size: 50MB (API), 20MB (processing)
- Required fields: documentId, storagePath, caseId

**Graceful Degradation:**
- If Inngest event emit fails: Document still created, return 200 with warning
- If storage cleanup fails: Log but don't propagate to client
- If RLS query fails: Return 404 (permission check failed)

---

## Frontend Data Fetching

### Authentication Check

**Pattern:**
```typescript
const { data: { user } } = await getSupabaseClient().auth.getUser()
if (!user) {
  router.push('/') // Redirect to login
}
setUser(user)
```

### Document Data Loading

**Example:** `src/app/document/[id]/page.tsx`

```typescript
// Main document with relationships
const { data: doc } = await getSupabaseClient()
  .from('documents')
  .select('*, cases(name, children(name))')
  .eq('id', documentId)
  .single()

// Findings
const { data: findingsData } = await getSupabaseClient()
  .from('findings')
  .select('*')
  .eq('document_id', documentId)
  .order('category')

// Extracted IEP data
const { data: iepData } = await getSupabaseClient()
  .from('extracted_iep_data')
  .select('*')
  .eq('document_id', documentId)
  .single()

// Validation issues
const { data: issues } = await getSupabaseClient()
  .from('validation_issues')
  .select('*')
  .eq('extracted_iep_data_id', iepData.id)
  .order('severity')
```

### Authenticated API Calls

**File Upload Pattern:**
```typescript
// Get session
const { data: { session } } = await getSupabaseClient().auth.getSession()

// Upload to storage
const storagePath = `${session.user.id}/${documentId}/original.pdf`
await getSupabaseClient().storage
  .from('documents')
  .upload(storagePath, selectedFile)

// Create DB record via API
const response = await fetch('/api/documents/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ documentId, storagePath, ... })
})

// Cleanup on failure
if (!response.ok) {
  await getSupabaseClient().storage
    .from('documents')
    .remove([storagePath])
}
```

### Signed URLs for PDF Viewing

```typescript
const { data: signedUrlData } = await getSupabaseClient()
  .storage
  .from('documents')
  .createSignedUrl(doc.storage_path, 3600) // 1 hour expiry

setPdfUrl(signedUrlData?.signedUrl)
```

---

## Processing Pipeline (Inngest)

### Event Flow

```
document.uploaded (from API route)
  ↓
process-document (Inngest function)
  ├─ Load document metadata
  ├─ Download PDF from storage
  ├─ Validate file size (20MB limit)
  ├─ Split into chunks (if > 200 pages)
  ├─ Extract with Document AI (with retry)
  ├─ Persist pages + blocks to DB
  ├─ Optional: Render page images
  └─ Mark as "extracted"
    ↓
    document.extracted event
      ↓
      generate-findings (parallel)
      ├─ Batch page text
      ├─ Call Claude API
      ├─ Verify citations (fuzzy matching)
      └─ Save findings + citations
      ↓
      Mark as "complete" or "analysis_failed"
```

### Key Functions

**processDocument** (`src/inngest/functions/processDocument.ts`)
- Handles OCR extraction via Google Document AI
- Splits large PDFs into chunks (200 page limit)
- Tracks partial extraction failures
- Emits `document.extracted` event

**generateFindings** (`src/inngest/functions/generateFindings.ts`)
- AI-powered analysis using Claude
- Generates structured findings with evidence
- Verifies citations with fuzzy matching
- Handles deduplication

**extractIepStructuredData**
- Claude-based structured extraction
- Produces JSON schema output
- Stores evidence (page, quote, bounding box)

**validateIepExtraction**
- Deterministic validators
- Catches missing/invalid fields
- Separate from extraction (can be re-run)

### Retry & Error Handling

```typescript
{
  id: "process-document",
  retries: 3,
  onFailure: async ({ error, event }) => {
    const { documentId } = event.data;
    await updateDocumentStatus(documentId, "failed", {
      errorMessage: error.message,
      errorDetails: { stack: error.stack },
    });
  },
}
```

---

## Storage Architecture

### Supabase Storage

**Bucket:** `documents` (private, not public)

**Path Pattern:**
```
{userId}/{documentId}/original.pdf              # Main PDF
{userId}/{documentId}/pages/{pageNumber}.webp   # Optional page images
```

**Configuration:**
- Access: Private (RLS enforced)
- File Size Limit: 50MB (upload), 20MB (processing)
- Allowed MIME Types: `application/pdf`, `image/png`, `image/jpeg`, `image/webp`

### Storage RLS Policy

```sql
CREATE POLICY "Users can access own documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Key Points:**
- Users can only access files in their own folder (`{userId}/...`)
- RLS enforced at storage layer separate from database
- Admin operations bypass RLS (use `getSupabaseAdmin()`)

---

## Implementation Guidelines

### Delete Operations

**Pattern:**
```typescript
// 1. Verify ownership (RLS handles this automatically)
const { data: document } = await getSupabaseClient()
  .from('documents')
  .select('*, cases!inner(id, children!inner(user_id))')
  .eq('id', documentId)
  .single()

if (!document) {
  return errorResponse(ERRORS.DOCUMENT_NOT_FOUND) // 404
}

// 2. Delete from database (cascades automatically)
const { error } = await getSupabaseClient()
  .from('documents')
  .delete()
  .eq('id', documentId)

// 3. Clean up storage (bypasses RLS)
await getSupabaseAdmin().storage
  .from('documents')
  .remove([document.storage_path])

// 4. Audit log
await getSupabaseAdmin()
  .from('audit_log')
  .insert({
    user_id: userId,
    entity_type: 'document',
    entity_id: documentId,
    action: 'delete',
    metadata: { source_filename, type, storage_path }
  })
```

### Rename Operations

**Pattern:**
```typescript
// Update metadata only (no storage changes)
const { data, error } = await getSupabaseClient()
  .from('documents')
  .update({ source_filename: newName })
  .eq('id', documentId)
  .select()
  .single()
```

**Validation:**
- Non-empty string
- Reasonable length (< 255 chars)
- RLS enforces ownership automatically

### Recategorize Operations

**Pattern:**
```typescript
// Validate enum
const validTypes = ['iep', 'evaluation', 'progress_report', 'email',
                    'meeting_notes', 'prior_written_notice', 'other']
if (!validTypes.includes(newType)) {
  return errorResponse(ERRORS.INVALID_TYPE)
}

// Update type
const { data, error } = await getSupabaseClient()
  .from('documents')
  .update({ type: newType })
  .eq('id', documentId)
  .select()
  .single()
```

### Storage Cleanup

**Use Admin Client:**
```typescript
// Bypass RLS for storage operations
const { error } = await getSupabaseAdmin().storage
  .from('documents')
  .remove([
    `${userId}/${documentId}/original.pdf`,
    `${userId}/${documentId}/pages/1.webp`,
    // ... etc
  ])
```

**List and Remove Pattern:**
```typescript
// List all files for a document
const { data: files } = await getSupabaseAdmin().storage
  .from('documents')
  .list(`${userId}/${documentId}`)

// Remove all
const paths = files.map(f => `${userId}/${documentId}/${f.name}`)
await getSupabaseAdmin().storage
  .from('documents')
  .remove(paths)
```

### Audit Logging

**Pattern:**
```typescript
await getSupabaseAdmin()
  .from('audit_log')
  .insert({
    user_id: userId,
    entity_type: 'document',
    entity_id: documentId,
    case_id: caseId,
    action: 'delete', // or 'rename', 'recategorize', 'update'
    metadata: {
      source_filename: document.source_filename,
      type: document.type,
      storage_path: document.storage_path,
      old_value: oldValue,  // for updates
      new_value: newValue   // for updates
    },
  })
```

---

## TypeScript Types

**Location:** `src/types/supabase.ts`

### Core Types

```typescript
export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']

export type DocumentType = Database['public']['Enums']['document_type']
export type DocumentStatus = Database['public']['Enums']['document_status']

export type Finding = Database['public']['Tables']['findings']['Row']
export type Citation = Database['public']['Tables']['citations']['Row']
export type ExtractedIepData = Database['public']['Tables']['extracted_iep_data']['Row']
export type ValidationIssue = Database['public']['Tables']['validation_issues']['Row']
```

### Usage

```typescript
import { Document, DocumentType, DocumentStatus } from '@/types/supabase'

const doc: Document = await getDocument(id)
const type: DocumentType = 'iep'
const status: DocumentStatus = 'complete'
```

---

## Key Files Reference

### Database Migrations
- `supabase/migrations/001_init_iep_copilot.sql` - Main schema
- `supabase/migrations/003_create_extracted_iep_data.sql` - IEP extraction
- `supabase/migrations/004_create_validation_issues.sql` - Validation

### API Routes
- `src/app/api/documents/upload/route.ts` - Document upload/status
- `src/app/api/analytics/route.ts` - Analytics aggregation

### Frontend Pages
- `src/app/document/[id]/page.tsx` - Document viewer
- `src/app/case/[id]/page.tsx` - Case detail with documents
- `src/app/dashboard/analytics/page.tsx` - Analytics dashboard

### Supabase Client
- `src/lib/supabase.ts` - Client initialization

### Type Definitions
- `src/types/supabase.ts` - Auto-generated types

### Inngest Functions
- `src/inngest/functions/processDocument.ts` - Document processing
- `src/inngest/functions/generateFindings.ts` - Findings generation
- `src/inngest/client.ts` - Event schemas

---

## Notes

### Hard vs Soft Deletes
- Documents table has `deleted_at` column but **uses hard deletes**
- RLS policies check `deleted_at IS NULL` as extra safety
- When implementing delete, use hard delete: `.delete().eq('id', documentId)`
- Cascades handle all dependent data automatically

### RLS Best Practices
1. Always use helper functions (`user_owns_case`, `user_owns_document`)
2. Never trust client-provided IDs without verification
3. Pattern: Load resource → verify user → allow operation
4. Use `getSupabaseAdmin()` only for bypass operations (storage cleanup, service role inserts)

### Error Response Standards
- Always include: `code`, `message`, `hint`
- Use consistent HTTP status codes
- Return structured JSON
- Log errors server-side for debugging

---

**Document Version:** 1.0
**Last Reviewed:** 2026-01-03 20:05 PST
**Next Review:** As needed when schema/patterns change
