-- 004_create_validation_issues.sql
-- Validation issues for extracted IEP data
-- Week 3: Deterministic validators separate from extraction

-- =============================================================================
-- VALIDATION ISSUES (quality checks on extracted data)
-- =============================================================================
create table if not exists public.validation_issues (
  id uuid primary key default gen_random_uuid(),
  extracted_iep_data_id uuid not null references public.extracted_iep_data(id) on delete cascade,

  -- Issue details
  severity text not null check (severity in ('error', 'warning', 'info')),
  category text not null, -- 'missing_field', 'invalid_format', 'compliance', 'quality'
  title text not null,
  message text not null,

  -- Field location (JSON path like '/goals/0/baseline/value')
  field_path text,

  -- Status
  status text not null default 'open' check (status in ('open', 'acknowledged', 'fixed', 'dismissed')),
  dismissed_by uuid references auth.users(id),
  dismissed_at timestamptz,
  dismissal_reason text,

  -- Metadata
  validator_name text not null,
  validator_version text not null default '1.0',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_validation_issues_extraction on public.validation_issues(extracted_iep_data_id);
create index idx_validation_issues_status on public.validation_issues(status);
create index idx_validation_issues_severity on public.validation_issues(severity);

-- Trigger for updated_at
create trigger validation_issues_updated_at
  before update on public.validation_issues
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- =============================================================================
alter table public.validation_issues enable row level security;

-- Users can read validation issues for their own extractions
create policy "Users can read own validation issues"
  on public.validation_issues for select
  using (
    exists (
      select 1 from public.extracted_iep_data e
      join public.documents d on d.id = e.document_id
      join public.cases c on c.id = d.case_id
      join public.children ch on ch.id = c.child_id
      where e.id = validation_issues.extracted_iep_data_id
        and ch.user_id = auth.uid()
    )
  );

-- Users can update validation issues for their own extractions
create policy "Users can update own validation issues"
  on public.validation_issues for update
  using (
    exists (
      select 1 from public.extracted_iep_data e
      join public.documents d on d.id = e.document_id
      join public.cases c on c.id = d.case_id
      join public.children ch on ch.id = c.child_id
      where e.id = validation_issues.extracted_iep_data_id
        and ch.user_id = auth.uid()
    )
  );

-- Service role can insert (from Inngest function)
create policy "Service role can insert validation issues"
  on public.validation_issues for insert
  with check (true); -- Service role bypasses RLS anyway, but explicit for clarity
