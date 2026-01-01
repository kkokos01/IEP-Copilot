-- 002_add_verification_method.sql
-- Adds verification_method column to citations table for tracking how citations were verified
-- This helps monitor OCR quality and citation verification accuracy

-- Add verification_method column (nullable for backwards compatibility)
alter table public.citations
  add column if not exists verification_method text null
  check (verification_method in ('exact', 'normalized', 'fuzzy', 'none', 'page_not_found'));

-- Add comment for documentation
comment on column public.citations.verification_method is
  'How the citation was verified: exact (character-for-character), normalized (after OCR normalization), fuzzy (Levenshtein-based), none (failed), page_not_found';

-- Create index for analyzing verification patterns
create index if not exists idx_citations_verification_method
  on public.citations(verification_method)
  where verification_method is not null;
