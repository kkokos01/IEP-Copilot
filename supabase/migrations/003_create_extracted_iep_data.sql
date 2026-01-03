-- 003_create_extracted_iep_data.sql
-- Structured IEP extraction with field-level evidence
-- Week 1-2: Foundation for structured extraction pipeline

-- =============================================================================
-- EXTRACTED IEP DATA (structured JSONB with evidence)
-- =============================================================================
create table if not exists public.extracted_iep_data (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,

  -- Structured extraction (stores full IEP data as JSON)
  data jsonb not null,
  schema_version text not null default '1.0.0',

  -- Metadata
  model_used text not null, -- 'claude-sonnet-4-5-20250929'
  extraction_prompt_version text,
  extracted_at timestamptz not null default now(),

  -- Status tracking
  status text not null default 'extracted' check (status in ('extracted', 'reviewed', 'approved')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,

  -- Search optimization (for student name, school, etc.)
  search_vector tsvector generated always as (
    to_tsvector('english',
      coalesce(data->'student'->'name'->>'value', '') || ' ' ||
      coalesce(data->'student'->'school'->>'value', '') || ' ' ||
      coalesce(data::text, '')
    )
  ) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_extracted_iep_document on public.extracted_iep_data(document_id);
create index idx_extracted_iep_status on public.extracted_iep_data(status);
create index idx_extracted_iep_search on public.extracted_iep_data using gin(search_vector);

-- Only one extraction per document (can be replaced/updated)
create unique index idx_extracted_iep_unique_doc on public.extracted_iep_data(document_id);

-- Trigger for updated_at
create trigger extracted_iep_data_updated_at
  before update on public.extracted_iep_data
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- =============================================================================
alter table public.extracted_iep_data enable row level security;

-- Users can read extractions for their own documents
create policy "Users can read own extractions"
  on public.extracted_iep_data for select
  using (
    exists (
      select 1 from public.documents d
      join public.cases c on c.id = d.case_id
      join public.children ch on ch.id = c.child_id
      where d.id = extracted_iep_data.document_id
        and ch.user_id = auth.uid()
    )
  );

-- Users can update extractions for their own documents
create policy "Users can update own extractions"
  on public.extracted_iep_data for update
  using (
    exists (
      select 1 from public.documents d
      join public.cases c on c.id = d.case_id
      join public.children ch on ch.id = c.child_id
      where d.id = extracted_iep_data.document_id
        and ch.user_id = auth.uid()
    )
  );

-- Service role can insert (from Inngest function)
create policy "Service role can insert extractions"
  on public.extracted_iep_data for insert
  with check (true); -- Service role bypasses RLS anyway, but explicit for clarity
