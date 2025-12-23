-- 001_init_iep_copilot.sql
-- IEP Copilot: Complete schema with RLS
-- Improvements over original:
--   1. Fixed citations RLS policy bug
--   2. Added effective_date to documents
--   3. Added document_type enum for type safety
--   4. Added indexes for common query patterns
--   5. Added updated_at triggers
--   6. Added soft delete support

create extension if not exists "pgcrypto";

-- =============================================================================
-- UTILITY: Updated_at trigger
-- =============================================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =============================================================================
-- ENUMS
-- =============================================================================
create type public.document_type as enum (
  'iep',
  'evaluation', 
  'progress_report',
  'email',
  'meeting_notes',
  'prior_written_notice',
  'other'
);

create type public.document_status as enum (
  'uploaded',
  'processing',
  'extracted',
  'analyzing',
  'complete',
  'analysis_failed',
  'failed'
);

create type public.finding_category as enum (
  'services',
  'goals',
  'accommodations',
  'baseline',
  'placement',
  'procedural',
  'timeline',
  'other'
);

create type public.verification_status as enum (
  'pending',
  'verified',
  'failed',
  'skipped'
);

-- =============================================================================
-- CHILDREN
-- =============================================================================
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date_of_birth date null,
  district text null,
  school text null,
  grade text null,
  disability_categories text[] null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null -- soft delete
);

create index idx_children_user on public.children(user_id) where deleted_at is null;

create trigger children_updated_at
  before update on public.children
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- CASES
-- =============================================================================
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  name text not null,
  school_year text null, -- "2025-2026"
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index idx_cases_child on public.cases(child_id) where deleted_at is null;

create trigger cases_updated_at
  before update on public.cases
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- DOCUMENTS
-- =============================================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  
  -- Document metadata
  type public.document_type not null default 'other',
  source_filename text not null,
  storage_path text not null,
  mime_type text not null default 'application/pdf',
  file_size_bytes bigint null,
  
  -- IEP-specific metadata (null for non-IEP docs)
  effective_date date null,        -- When IEP goes into effect
  meeting_date date null,          -- When IEP meeting occurred
  
  -- Processing state
  status public.document_status not null default 'uploaded',
  page_count int null,
  
  -- Extraction metadata
  extractor text not null default 'gcp_docai_layout',
  extractor_version text null,
  extraction_started_at timestamptz null,
  extraction_completed_at timestamptz null,
  
  -- Error handling
  error_message text null,
  error_details jsonb null,
  retry_count int not null default 0,
  
  -- Extraction quality flag (for easier UI queries)
  is_partial_extraction boolean not null default false,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index idx_documents_case on public.documents(case_id) where deleted_at is null;
create index idx_documents_status on public.documents(status) where deleted_at is null;
create index idx_documents_type on public.documents(type) where deleted_at is null;
create index idx_documents_effective_date on public.documents(case_id, effective_date) 
  where type = 'iep' and deleted_at is null;

create trigger documents_updated_at
  before update on public.documents
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- DOCUMENT_PAGES (ground-truth page text)
-- =============================================================================
create table if not exists public.document_pages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number int not null, -- 1-based
  
  -- Extracted content
  text text not null,
  text_normalized text null, -- Pre-normalized for search/verification
  word_count int null,
  
  -- Page image (for highlighting)
  image_storage_path text null,
  image_width int null,
  image_height int null,
  
  -- Extraction confidence
  confidence real null, -- 0..1 average OCR confidence
  
  created_at timestamptz not null default now(),
  
  constraint document_pages_unique unique (document_id, page_number)
);

create index idx_document_pages_doc on public.document_pages(document_id);

-- =============================================================================
-- DOCUMENT_BLOCKS (layout elements with bounding boxes)
-- =============================================================================
create table if not exists public.document_blocks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number int not null,
  
  -- Block content
  block_type text not null check (block_type in (
    'paragraph', 'heading', 'list_item', 'table', 'table_cell', 
    'header', 'footer', 'page_number', 'other'
  )),
  text text not null,
  text_normalized text null,
  
  -- Geometry (normalized 0..1 coordinates)
  bbox jsonb null, -- {"x0": 0.1, "y0": 0.2, "x1": 0.9, "y1": 0.25}
  
  -- Reading order
  reading_order int null,
  
  -- Hierarchy (for nested structures like tables)
  parent_block_id uuid null references public.document_blocks(id) on delete cascade,
  
  -- Confidence
  confidence real null,
  
  created_at timestamptz not null default now()
);

create index idx_blocks_doc_page on public.document_blocks(document_id, page_number);
create index idx_blocks_reading_order on public.document_blocks(document_id, reading_order);

-- =============================================================================
-- FINDINGS (AI-generated or user-created observations)
-- =============================================================================
create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  
  -- Origin
  created_by text not null default 'ai' check (created_by in ('ai', 'user')),
  
  -- Status
  status text not null default 'active' check (status in (
    'active', 'needs_review', 'dismissed', 'addressed'
  )),
  
  -- Content
  category public.finding_category not null default 'other',
  title text not null,
  summary text not null,
  why_it_matters text null,
  questions_to_ask text[] not null default '{}',
  
  -- AI metadata
  confidence real null check (confidence >= 0 and confidence <= 1),
  model_version text null,
  
  -- Review tracking
  needs_review_reason text null,
  reviewed_at timestamptz null,
  reviewed_by uuid null references auth.users(id),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index idx_findings_doc on public.findings(document_id) where deleted_at is null;
create index idx_findings_case on public.findings(case_id) where deleted_at is null;
create index idx_findings_status on public.findings(status) where deleted_at is null;

create trigger findings_updated_at
  before update on public.findings
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- CITATIONS (evidence linking findings to source text)
-- =============================================================================
create table if not exists public.citations (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references public.findings(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  
  -- Location
  page_number int not null,
  quote_text text not null,
  quote_text_normalized text null, -- For verification matching
  
  -- Geometry (for highlighting)
  bbox jsonb null,
  
  -- Verification
  verification_status public.verification_status not null default 'pending',
  verification_score real null, -- Fuzzy match score if not exact
  verified_at timestamptz null,
  
  created_at timestamptz not null default now()
);

create index idx_citations_finding on public.citations(finding_id);
create index idx_citations_doc_page on public.citations(document_id, page_number);
create index idx_citations_verification on public.citations(verification_status);

-- =============================================================================
-- REQUESTS (procedural request tracker)
-- =============================================================================
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  
  -- Request type
  type text not null check (type in (
    'initial_evaluation',
    'reevaluation', 
    'independent_evaluation',
    'progress_data',
    'meeting_request',
    'written_explanation',
    'records_request',
    'other'
  )),
  
  -- Status tracking
  status text not null default 'draft' check (status in (
    'draft', 'ready', 'sent', 'awaiting_response', 'responded', 'escalated', 'closed'
  )),
  
  -- Dates
  drafted_at timestamptz not null default now(),
  sent_at timestamptz null,
  sent_via text null check (sent_via in ('email', 'mail', 'hand_delivered', 'other')),
  due_date date null, -- Calculated based on request type + sent_at
  response_received_at timestamptz null,
  
  -- Content
  subject text null,
  body text null,
  generated_document_id uuid null references public.documents(id) on delete set null,
  
  -- Related findings (what prompted this request)
  related_finding_ids uuid[] not null default '{}',
  
  notes text null,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index idx_requests_case on public.requests(case_id) where deleted_at is null;
create index idx_requests_status on public.requests(status) where deleted_at is null;
create index idx_requests_due_date on public.requests(due_date) 
  where status in ('sent', 'awaiting_response') and deleted_at is null;

create trigger requests_updated_at
  before update on public.requests
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- EVENTS (meetings, deadlines, communications)
-- =============================================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  
  -- Event type
  type text not null check (type in (
    'iep_meeting', 'eligibility_meeting', 'manifestation_meeting',
    'phone_call', 'email', 'deadline', 'other'
  )),
  
  -- Timing
  event_date date not null,
  event_time time null,
  duration_minutes int null,
  
  -- Content
  title text not null,
  location text null,
  attendees text[] null default '{}',
  notes text null,
  
  -- Meeting recap (for meeting types)
  recap_document_id uuid null references public.documents(id) on delete set null,
  recap_status text null check (recap_status in ('pending', 'draft', 'sent')),
  
  -- Reminders
  reminder_sent_at timestamptz null,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index idx_events_case_date on public.events(case_id, event_date) where deleted_at is null;
create index idx_events_upcoming on public.events(event_date) 
  where deleted_at is null;

create trigger events_updated_at
  before update on public.events
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- AUDIT LOG (append-only)
-- =============================================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- What was affected
  entity_type text not null, -- 'document', 'finding', 'request', etc.
  entity_id uuid null,
  case_id uuid null references public.cases(id) on delete set null,
  
  -- What happened
  action text not null, -- 'create', 'update', 'delete', 'view', 'export', etc.
  
  -- Details
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet null,
  user_agent text null,
  
  created_at timestamptz not null default now()
);

create index idx_audit_user_time on public.audit_log(user_id, created_at desc);
create index idx_audit_entity on public.audit_log(entity_type, entity_id);
create index idx_audit_case on public.audit_log(case_id, created_at desc) where case_id is not null;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.children enable row level security;
alter table public.cases enable row level security;
alter table public.documents enable row level security;
alter table public.document_pages enable row level security;
alter table public.document_blocks enable row level security;
alter table public.findings enable row level security;
alter table public.citations enable row level security;
alter table public.requests enable row level security;
alter table public.events enable row level security;
alter table public.audit_log enable row level security;

-- Helper function: Check if user owns a case
create or replace function public.user_owns_case(p_case_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 
    from public.cases ca
    join public.children ch on ch.id = ca.child_id
    where ca.id = p_case_id 
      and ch.user_id = auth.uid()
      and ch.deleted_at is null
      and ca.deleted_at is null
  );
end;
$$ language plpgsql security definer stable;

-- Helper function: Check if user owns a document
create or replace function public.user_owns_document(p_document_id uuid)
returns boolean as $$
begin
  return exists (
    select 1
    from public.documents d
    join public.cases ca on ca.id = d.case_id
    join public.children ch on ch.id = ca.child_id
    where d.id = p_document_id
      and ch.user_id = auth.uid()
      and ch.deleted_at is null
      and ca.deleted_at is null
      and d.deleted_at is null
  );
end;
$$ language plpgsql security definer stable;

-- Children: direct ownership
create policy "children_policy" on public.children for all
  using (user_id = auth.uid() and deleted_at is null)
  with check (user_id = auth.uid());

-- Cases: via child ownership
create policy "cases_policy" on public.cases for all
  using (
    deleted_at is null and
    exists (
      select 1 from public.children c
      where c.id = child_id 
        and c.user_id = auth.uid()
        and c.deleted_at is null
    )
  )
  with check (
    exists (
      select 1 from public.children c
      where c.id = child_id 
        and c.user_id = auth.uid()
        and c.deleted_at is null
    )
  );

-- Documents: via case ownership
create policy "documents_policy" on public.documents for all
  using (deleted_at is null and public.user_owns_case(case_id))
  with check (public.user_owns_case(case_id));

-- Document pages: via document ownership
create policy "document_pages_policy" on public.document_pages for all
  using (public.user_owns_document(document_id))
  with check (public.user_owns_document(document_id));

-- Document blocks: via document ownership
create policy "document_blocks_policy" on public.document_blocks for all
  using (public.user_owns_document(document_id))
  with check (public.user_owns_document(document_id));

-- Findings: via case ownership (FIXED: was buggy in original)
create policy "findings_policy" on public.findings for all
  using (deleted_at is null and public.user_owns_case(case_id))
  with check (public.user_owns_case(case_id));

-- Citations: via finding's case ownership (FIXED: was self-referential)
create policy "citations_policy" on public.citations for all
  using (
    exists (
      select 1 from public.findings f
      where f.id = finding_id
        and f.deleted_at is null
        and public.user_owns_case(f.case_id)
    )
  )
  with check (
    exists (
      select 1 from public.findings f
      where f.id = finding_id
        and f.deleted_at is null
        and public.user_owns_case(f.case_id)
    )
  );

-- Requests: via case ownership
create policy "requests_policy" on public.requests for all
  using (deleted_at is null and public.user_owns_case(case_id))
  with check (public.user_owns_case(case_id));

-- Events: via case ownership
create policy "events_policy" on public.events for all
  using (deleted_at is null and public.user_owns_case(case_id))
  with check (public.user_owns_case(case_id));

-- Audit log: user can only see their own
create policy "audit_log_policy" on public.audit_log for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =============================================================================
-- SECURITY HARDENING: Lock search_path on security definer functions
-- Prevents potential SQL injection via object shadowing
-- =============================================================================
alter function public.user_owns_case(uuid) set search_path = public, pg_temp;
alter function public.user_owns_document(uuid) set search_path = public, pg_temp;

-- =============================================================================
-- STORAGE BUCKET (run via Supabase Dashboard or separate migration)
-- =============================================================================
-- Note: Storage buckets are typically created via Dashboard or API, not SQL.
-- Include this as a reminder:
--
-- Bucket: "documents"
-- - Private (not public)
-- - File size limit: 50MB
-- - Allowed MIME types: application/pdf, image/png, image/jpeg, image/webp
--
-- RLS Policy for storage.objects:
-- CREATE POLICY "Users can access own documents"
-- ON storage.objects FOR ALL
-- USING (
--   bucket_id = 'documents' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );
