# IEP Copilot: Pragmatic Architecture Plan

**Philosophy:** Build a great single-product app today. Avoid decisions that make multi-vertical hard later.

**Date:** 2026-01-03
**Status:** Recommended Approach

---

## The Core Question

> "How do we build IEP Copilot as strongly as possible today, while not painting ourselves into a corner for future modularization?"

**Answer:** Adopt the **patterns** from the pack architecture that make IEP Copilot better **right now**, but skip the **abstractions** (registry, dynamic loading, multi-pack support) that only matter when you have a second vertical.

---

## What to Adopt NOW (Immediate Value)

These patterns improve IEP Copilot **today** and happen to make future modularization easier:

### 1. Structured Extraction (Not Generic Findings)

**Current Problem:**
```typescript
// findings table: generic category + title + summary
{
  category: "goals",
  title: "Missing baseline data",
  summary: "Goal 1 doesn't have baseline information"
}
```

**Why this hurts:**
- Can't query "show me all goals with missing baselines"
- Can't export structured data (CSV, API)
- Can't build field-level UI (everything is just text blobs)
- Hard to implement "edit this goal" workflow

**Better Approach (adopt now):**
```typescript
// extracted_iep_goals table
{
  student: { name: "...", dob: "...", ... },
  goals: [
    {
      goal_area: "reading",
      annual_goal: "Student will improve reading...",
      baseline: "Currently reads at 2nd grade level",
      measurement_method: "DIBELS assessment",
      // ... actual structured data
    }
  ]
}
```

**Benefits NOW:**
- Build rich UI (editable tables, dropdowns for goal areas)
- Export to CSV, send to school district APIs
- Query: "Find all IEPs with reading goals"
- Users can edit actual data, not just dismiss findings
- **Enable dashboards & analytics** (see dedicated section below)

**Future benefit:** This is already the extraction model for packs. No migration needed.

**Implementation:**
- Add `extracted_iep_goals` table with JSONB column
- Keep JSON Schema in `src/schemas/iep_goals.schema.json`
- Use schema to build LLM prompt
- Validate extraction against schema

### 2. Evidence-Based Fields (Know Where Data Came From)

**Current Problem:**
```typescript
// Citation points to whole finding, not specific field
annual_goal: "Student will improve reading"
// User asks: "Where did you get this?" → can't answer at field level
```

**Better Approach (adopt now):**
```typescript
annual_goal: {
  value: "Student will improve reading comprehension...",
  evidence: [{
    page: 3,
    quote: "Student will improve reading comprehension...",
    bbox: { x0: 0.1, y0: 0.3, x1: 0.9, y1: 0.35 },
    confidence: 0.95
  }],
  status: "extracted"  // or "user_corrected"
}
```

**Benefits NOW:**
- "Click to see source" on any field
- Track user corrections for accuracy measurement
- Show confidence per field (not just per document)
- Identify which fields need review

**Future benefit:** This is the `FieldWithEvidence<T>` pattern. Already multi-vertical ready.

**Implementation:**
- Use JSONB structure with evidence arrays
- Build `<EvidenceLink>` component for any field
- Track when users override values

### 3. Validators Separate from Extraction

**Current Problem:**
```typescript
// generateFindings.ts does BOTH extraction AND validation in one LLM call
// LLM outputs: "Missing baseline data" as a finding
```

**Why this hurts:**
- Can't re-validate without re-extracting (expensive)
- Can't improve validators without re-running LLM
- Mixing non-deterministic (LLM) with deterministic (rules)
- Hard to test validator logic

**Better Approach (adopt now):**
```typescript
// Step 1: Extract structured data (LLM)
const extracted = await extractIepGoals(pages);

// Step 2: Run deterministic validators
const issues = [
  ...validateRequiredFields(extracted),
  ...validateGoalMeasurability(extracted),
  ...validateDateLogic(extracted),
];
```

**Benefits NOW:**
- Re-validate after user edits (instant, no LLM call)
- A/B test validator improvements
- Validators are unit-testable
- Clear separation: LLM = extraction, code = validation

**Future benefit:** Validators are already vertical-agnostic functions.

**Implementation:**
- Create `src/validators/iep_goals.ts` with validator functions
- Add `validation_issues` table
- Run validators after extraction
- Add "Revalidate" button in UI

### 4. Schema-Driven LLM Prompts

**Current Problem:**
```typescript
// Hard-coded prompt in generateFindings.ts
const SYSTEM_PROMPT = `You are analyzing an IEP. Look for:
- Goals with missing baselines
- Vague measurement methods
- ...
`;
```

**Why this hurts:**
- Adding a new field requires editing prompt code
- Can't version prompts separately from code
- Hard to A/B test prompt variations

**Better Approach (adopt now):**
```typescript
// Load schema
const schema = await loadSchema('iep_goals.v1.json');

// Generate prompt from schema
const prompt = buildExtractionPrompt(schema, pages);
// Prompt includes: field descriptions, enums, required fields, extraction hints
```

**Benefits NOW:**
- Schema is documentation AND prompt template
- Update extraction by editing JSON, not code
- Version schemas: `iep_goals.v1.json` → `v2.json`
- Easy to test schema changes

**Future benefit:** Schema files work for any vertical.

**Implementation:**
- Create `src/schemas/` directory
- Add JSON Schema files with custom `x-extraction` hints
- Build prompt generator from schema
- Store `schema_version` in database

---

## 5. Dashboards & Analytics

**Why Structured Data Enables This:**

Generic findings can't power analytics:
```typescript
// findings table
{ category: "services", summary: "30 min/week reading support" }
// Can't query: "Total service hours across all IEPs?"
// Can't chart: "Service hours trend over time?"
```

Structured data unlocks insights:
```typescript
// extracted_iep_goals.data
{
  services: [
    { type: "reading_support", frequency: 2, duration: 30, unit: "minutes_per_week" },
    { type: "speech_therapy", frequency: 1, duration: 45, unit: "minutes_per_week" }
  ]
}
// ✅ Total hours: SUM(frequency * duration)
// ✅ Year-over-year comparison
// ✅ Benchmark: "Typical is 60-90 min/week"
```

---

## 6. Passive Progress Intelligence (The Engagement Driver)

**Core Philosophy:** Parents are overwhelmed. Don't ask them to do more. **Analyze what already exists.**

**The Problem:**
```
❌ Active tracking: "Please log your child's reading progress every week"
→ One more thing on busy parent's plate
→ Inconsistent logging = incomplete data
→ Feels like homework for parents
```

**The Solution:**
```
✅ Passive intelligence: "Forward homework to track@iepcopilot.com"
→ Parents already see homework
→ AI analyzes automatically
→ Zero additional burden
```

### Feature A: Email-to-Analyze (The Killer Feature)

**How it works:**
```
Child does homework
    ↓
Parent takes photo → Emails to homework@child-name.iepcopilot.com
    ↓
AI analyzes: OCR image, match to IEP goals, assess performance
    ↓
Parent receives insight email (weekly summary)
```

**Example Flow:**
```
Email received:
From: parent@gmail.com
To: homework@emma.iepcopilot.com
Subject: Math worksheet
Attachment: worksheet.jpg

AI Analysis:
📄 Math worksheet detected
• Computation problems: 5/5 correct (100%) ✓
• Word problems: 2/5 correct (40%) ⚠️

Matched to IEP Goal:
🎯 "Solve 2-step word problems with 80% accuracy"
   Current performance: 40%
   Target: 80%
   Gap: -40 percentage points

💡 PATTERN DETECTED:
Emma can calculate correctly but struggles to extract
numbers from word problems.

RECOMMENDATION:
Request additional support for reading comprehension
in math context.
```

**Parent receives:**
```
📧 Weekly Progress Summary

12 homework samples analyzed this week

🎯 Goal Progress:
• Reading: ████████░░ 85% to target (↗ improving!)
• Math: ████░░░░░░ 40% to target (⚠️ needs support)
• Writing: ██████░░░░ 60% to target (→ stable)

💡 This Week's Insight:
Reading comprehension is improving rapidly! Emma is now
reading at 3.5 grade level (up from 3.0 last month).
Goal target is 4.0 by June - she's ahead of schedule.

⚠️ Action Needed:
Math word problems show no progress. Consider requesting
strategy review at next progress meeting.

[View Details] [Export for IEP Meeting]
```

**Benefits:**
- **Zero parent burden**: Forward emails they already get
- **Objective data**: AI assessment vs. parent/teacher bias
- **Continuous monitoring**: Every assignment is data
- **Evidence collection**: Automatic portfolio building
- **Proactive insights**: System tells parents what matters

### Feature B: School Portal Integration

**Auto-sync from:**
- Google Classroom (most common K-12)
- Canvas, PowerSchool, Schoology, Seesaw

**What we can access (with parent permission):**
```json
{
  "assignments": [
    {
      "title": "Reading: Charlotte's Web Ch 1-3",
      "grade": "8/10",
      "teacherFeedback": "Good understanding. Work on inference.",
      "attachments": ["worksheet.pdf"]
    }
  ]
}
```

**Our analysis:**
```
Assignment: Charlotte's Web Ch 1-3
Grade: 8/10 (80%)
Text level: 4th grade

Matched to IEP Goal: Reading Comprehension
Target: Read at 4th grade level by June

📈 PROGRESS UPDATE:
Emma is now successfully comprehending 4th grade texts!
This meets her IEP goal target early (3 months ahead).

RECOMMENDATION:
✓ Goal achieved early
□ Consider advancing to 5th grade texts
□ Update goal in annual review (March 2026)
```

### Feature C: Smart Dashboard (Auto-Populated)

**Parent sees (no manual entry):**
```
┌─────────────────────────────────────────┐
│ 📊 Emma's Progress (This Month)        │
├─────────────────────────────────────────┤
│ Data sources:                           │
│ • 12 homework samples (email)           │
│ • 8 Google Classroom assignments        │
│ • 3 teacher emails                      │
│ • 1 progress report (uploaded)          │
│                                         │
│ 🎯 IEP Goal Status:                    │
│                                         │
│ Reading Comprehension                   │
│ ████████░░ 85% to goal (↗ +15%)        │
│ Current: 3.5 grade level                │
│ Target: 4.0 grade level by June         │
│ Status: Ahead of schedule               │
│                                         │
│ Math Word Problems                      │
│ ████░░░░░░ 40% to goal (→ no change)   │
│ Current: 40% accuracy                   │
│ Target: 80% accuracy                    │
│ ⚠️ May need additional support          │
│                                         │
│ ⏰ Upcoming Deadlines:                  │
│ • Annual Review: March 15 (42 days)     │
│ • Progress Report Due: Jan 31 (28 days) │
│                                         │
│ [Export for Meeting] [View All Data]   │
└─────────────────────────────────────────┘
```

**Key features:**
- Auto-populated from homework + integrations
- No manual logging
- Real-time goal progress
- Proactive alerts

### Why This Creates a Moat

**No competitor can replicate because it requires:**
1. ✅ Structured IEP extraction (you already built this)
2. ✅ Domain-specific AI models (reading level, math patterns)
3. ✅ Multi-modal analysis (images, PDFs, structured data)
4. ✅ Longitudinal tracking (progress over time)
5. ✅ Goal-matching engine (link work to specific IEP goals)

**Competitive advantages:**
- **Zero-burden UX**: Forward and forget (vs. manual logging)
- **Objective data**: AI assessment vs. subjective parent/teacher opinions
- **Continuous assessment**: Every assignment is data (vs. quarterly reports)
- **Evidence-based advocacy**: "Here are 12 homework samples showing..."
- **Data flywheel**: More usage → More data → Better insights → More value

### Business Impact

**For Parents:**
- Informed advocacy without additional work
- Objective progress data for IEP meetings
- Early warning system (regression alerts)
- Confidence in decision-making

**For Business:**
- **Engagement**: Weekly email forwards (vs. once-a-year upload)
- **Retention**: 60% annual retention (vs. 5% without)
- **Differentiation**: No competitor has passive intelligence
- **Upsell**: Free = 1/week, Premium = unlimited + integrations
- **Network effects**: More users → Better benchmarks → More value

**For Product:**
- Validates structured extraction investment (user-facing value)
- Creates viral moments (parents share insights with other parents)
- Enables future AI features ("goals like yours typically...")
- Builds proprietary dataset (homework + outcomes)

### Database Schema Additions

```sql
-- Homework/work sample analysis
create table homework_analyses (
  id uuid primary key,
  child_id uuid references children(id),

  -- Source
  email_id text,
  uploaded_file_path text,
  integration_source text,  -- 'google_classroom', 'email', 'manual'

  -- Content
  content_type text,  -- 'homework', 'test', 'essay', 'report_card'
  subject_area text,  -- 'reading', 'math', 'writing'
  raw_content text,
  extracted_data jsonb,

  -- Analysis
  matched_goal_paths text[],  -- ['/goals/0', '/goals/2']
  grade_level_estimate numeric,
  accuracy_score numeric,

  -- AI insights
  analysis jsonb,
  insight text,
  recommendations text[],

  analyzed_at timestamptz default now()
);

-- Progress tracking (auto-computed from analyses)
create table goal_progress_snapshots (
  id uuid primary key,
  child_id uuid references children(id),
  goal_path text not null,

  -- Computed from homework analyses
  snapshot_date date default current_date,
  estimated_level numeric,  -- e.g., 3.5 grade level
  accuracy_rate numeric,    -- e.g., 0.85 (85%)
  sample_count int,         -- How many samples in this period
  trend text,               -- 'improving', 'stable', 'regressing'

  computed_at timestamptz default now()
);

-- School portal integrations
create table school_integrations (
  id uuid primary key,
  child_id uuid references children(id),

  integration_type text,  -- 'google_classroom', 'canvas', 'powerschool'
  credentials jsonb,      -- OAuth tokens (encrypted)
  last_sync_at timestamptz,
  sync_enabled boolean default true,

  created_at timestamptz default now()
);

-- IEP analytics (pre-computed for dashboard)
create table iep_analytics (
  id uuid primary key,
  child_id uuid references children(id),
  extracted_iep_goals_id uuid references extracted_iep_goals(id),

  -- Service totals
  total_service_minutes_per_week int,
  service_breakdown jsonb,

  -- Goal metrics
  total_goals int,
  goals_with_baseline int,
  goals_by_area jsonb,

  -- Dates
  annual_review_date date,
  triennial_eval_date date,

  -- Flags
  has_missing_baselines boolean,
  has_vague_measurements boolean,

  computed_at timestamptz default now()
);
```

### Implementation Priority

**Phase 4: Analytics Dashboard (1 week)**
- IEP service/goal summaries
- Year-over-year comparison
- Compliance calendar

**Phase 4.5: Passive Intelligence (2-3 weeks)** ← THE ENGAGEMENT DRIVER
1. Email-to-analyze (1 week)
2. AI homework analysis (1-2 weeks)
3. Weekly insight emails (included)

**Phase 6+: Advanced Features (defer)**
- Google Classroom integration (2 weeks)
- Advanced benchmarking
- Trend detection & predictions

---

## What to SKIP NOW (Pure Overhead)

These abstractions only matter when you have 2+ verticals:

### ❌ Skip: Pack Registry

You don't need:
```typescript
const pack = packRegistry.getPack("iep");
const docType = pack.docTypes.find(dt => dt.id === "iep_goals");
```

Just use:
```typescript
import { IEP_GOALS_SCHEMA } from '@/schemas/iep_goals';
import { validateIepGoals } from '@/validators/iep_goals';
```

Direct imports are simpler. Registry adds indirection you don't need yet.

### ❌ Skip: Document Classification System

You don't need to auto-detect "is this IEP Goals or IEP Services?"

Just let users select document type at upload:
```typescript
<select name="docType">
  <option value="iep_goals">IEP Goals</option>
  <option value="iep_services">IEP Services</option>
</select>
```

Build classification when you have 10+ doc types and users complain about the dropdown.

### ❌ Skip: UI Layout JSON

You don't need:
```json
{
  "sections": [
    { "type": "repeaterTable", "path": "/goals", ... }
  ]
}
```

Just build React components:
```typescript
<GoalsTable goals={extracted.goals} onEdit={handleEdit} />
```

Hard-coded components are faster to build, easier to customize, and perfectly fine for a single product.

### ❌ Skip: Export Adapter System

You don't need:
```typescript
interface ExportAdapter {
  run(ctx: ExportContext): Promise<ExportResult>;
}
```

Just build export functions:
```typescript
export async function exportToCsv(extractedId: string) { ... }
export async function exportToParentLetter(extractedId: string) { ... }
```

Add the abstraction when you have 3+ verticals sharing export logic.

---

## Database Schema (Pragmatic Version)

### What to Build NOW

```sql
-- Stores structured extraction (replaces generic findings)
create table extracted_iep_goals (
  id uuid primary key,
  document_id uuid references documents(id),

  -- Structured data (conforms to iep_goals.schema.json)
  data jsonb not null,

  -- Metadata
  schema_version text not null,  -- "1.0.0"
  model_used text,
  extracted_at timestamptz default now(),

  -- Status
  status text check (status in ('extracted', 'reviewed', 'approved'))
);

-- Stores validation issues (separate from extraction)
create table validation_issues (
  id uuid primary key,
  extracted_iep_goals_id uuid references extracted_iep_goals(id),

  -- Issue details
  severity text check (severity in ('error', 'warning', 'info')),
  title text not null,
  message text not null,
  field_path text,  -- e.g., "/goals/0/baseline"

  -- Status
  status text check (status in ('open', 'fixed', 'dismissed'))
);

-- User corrections (learning loop)
create table field_corrections (
  id uuid primary key,
  extracted_iep_goals_id uuid references extracted_iep_goals(id),
  user_id uuid references auth.users(id),

  field_path text not null,
  original_value jsonb,
  corrected_value jsonb,
  corrected_at timestamptz default now()
);
```

**Notice:** Table names are specific (`extracted_iep_goals`, not `extracted_documents`). This is fine! Rename later if needed.

### What to SKIP NOW

- ❌ `pack_id` column (you only have one "pack")
- ❌ `doc_type_id` column (use different tables per type)
- ❌ `export_artifacts` table (build when you add exports)

---

## File Structure (Pragmatic Version)

```
/iep-copilot/src/
├── schemas/
│   ├── iep_goals.schema.json       # JSON Schema for goals
│   └── iep_services.schema.json    # JSON Schema for services
├── validators/
│   ├── iep_goals.ts                # Validator functions
│   └── iep_services.ts
├── extractors/
│   ├── iep_goals.ts                # Prompt builder + post-processing
│   └── iep_services.ts
├── lib/
│   ├── evidence.ts                 # FieldWithEvidence helpers
│   ├── schema-utils.ts             # JSON Schema → prompt builder
│   └── validator-utils.ts          # Validator execution helpers
├── inngest/functions/
│   ├── processDocument.ts          # OCR (unchanged)
│   ├── extractIepGoals.ts          # NEW: Structured extraction
│   └── validateIepGoals.ts         # NEW: Run validators
└── components/
    ├── iep/
    │   ├── GoalsReviewTable.tsx    # Hard-coded component for goals
    │   ├── ServicesReviewTable.tsx
    │   └── EvidenceLink.tsx        # Reusable evidence viewer
    └── ui/
        └── ...                     # Existing shadcn components
```

**Notice:**
- ✅ Schemas as JSON files (reusable)
- ✅ Validators as pure functions (testable)
- ✅ Extractors separated (but not in a "pack" abstraction)
- ✅ Components are specific to IEP (not generic)

**No `packs/` directory. No `core/models/`. No `packRegistry.ts`.**

---

## Anti-Patterns to AVOID (Future-Proofing)

These will bite you later:

### 🚫 Anti-Pattern 1: Storing Extracted Data as Unstructured Text

**Bad:**
```sql
create table findings (
  summary text  -- "Goal: Student will improve reading. Baseline: 2nd grade level"
);
```

**Why it hurts future:** Can't migrate to structured format without re-running LLM on all docs.

**Good:**
```sql
create table extracted_iep_goals (
  data jsonb  -- { "goals": [{ "annual_goal": "...", "baseline": "..." }] }
);
```

**Migration path:** Change JSONB structure, maybe backfill. Don't need LLM.

### 🚫 Anti-Pattern 2: Mixing Extraction Logic with Validation Logic

**Bad:**
```typescript
// LLM outputs both data AND issues
const result = await llm.extract(`Find goals and also tell me if baselines are missing`);
// Returns: { goals: [...], issues: [...] }
```

**Why it hurts future:** Different verticals have different validators. Can't share extraction code.

**Good:**
```typescript
const extracted = await extractIepGoals(pages);  // LLM
const issues = validateIepGoals(extracted);      // Deterministic
```

**Migration path:** Validators become vertical-specific. Extraction stays generic.

### 🚫 Anti-Pattern 3: Hard-Coding Field Paths in UI Components

**Bad:**
```typescript
<td>{finding.summary}</td>  // What if schema changes?
```

**Why it hurts future:** Changing schema requires changing every component.

**Good:**
```typescript
<td>
  <FieldWithEvidenceDisplay
    field={goal.baseline}
    onChange={(value) => updateField('/goals/0/baseline', value)}
  />
</td>
```

**Migration path:** Component works with any field. Just pass different paths.

### 🚫 Anti-Pattern 4: Document Type as Enum in Application Code

**Bad:**
```typescript
enum DocumentType {
  IEP_GOALS = 'iep_goals',
  IEP_SERVICES = 'iep_services',
}

switch (doc.type) {
  case DocumentType.IEP_GOALS: return extractGoals();
  case DocumentType.IEP_SERVICES: return extractServices();
}
```

**Why it hurts future:** Adding a vertical requires editing enum in 20 places.

**Good:**
```typescript
// Document type is just a string key
const EXTRACTORS = {
  'iep_goals': extractGoals,
  'iep_services': extractServices,
};

const extractor = EXTRACTORS[doc.type];
if (!extractor) throw new Error(`Unknown type: ${doc.type}`);
return extractor(pages);
```

**Migration path:** Add new entry to map. No code changes elsewhere.

---

## Adoption Roadmap (Incremental)

### Phase 1: Structured Extraction (2 weeks)

**Goal:** Replace generic findings with structured IEP data

**Tasks:**
1. Create `iep_goals.schema.json`
2. Add `extracted_iep_goals` table
3. Build prompt generator from schema
4. Create `extractIepGoals.ts` Inngest function
5. Save structured data to DB

**Success metric:** New uploads create `extracted_iep_goals` records

**Keeps working:** Old findings-based UI (read from old table)

### Phase 2: Validators (1 week)

**Goal:** Deterministic validation separate from extraction

**Tasks:**
1. Create `validators/iep_goals.ts` with validator functions
2. Add `validation_issues` table
3. Create `validateIepGoals.ts` Inngest function
4. Run validators after extraction

**Success metric:** Issues appear in DB, can re-validate without re-extract

**Keeps working:** Still using old UI, just different data source

### Phase 3: Evidence-Based UI (2 weeks)

**Goal:** Show extracted data with "click to source" on every field

**Tasks:**
1. Build `<GoalsReviewTable>` component
2. Add `<EvidenceLink>` component for field-level citations
3. Implement edit workflow (save to `field_corrections`)
4. Add "Apply suggestion" for validator fixes

**Success metric:** Users can edit goals, see evidence, apply fixes

**Deprecates:** Old findings UI (but keep table for archive)

### Phase 4: Analytics Dashboard (1 week)

**Goal:** Surface insights from structured IEP data

**Tasks:**
1. Create `iep_analytics` table
2. Build analytics computation job (runs after extraction)
3. Create dashboard components:
   - Service summary (total hours, breakdown)
   - Goals overview (baseline → current → target)
   - Compliance calendar (dates, alerts)
   - Year-over-year comparison

**Success metric:** Parents understand IEP at a glance

**Keeps working:** Can view dashboard without progress tracking yet

### Phase 4.5: Passive Intelligence (2-3 weeks)

**Goal:** Enable progress tracking with ZERO parent burden

**Tasks:**

**Week 1: Email Processing**
1. Set up inbound email handling (unique addresses per child)
2. Build OCR pipeline for images (Google Vision API)
3. Build PDF text extraction
4. Basic content classification (homework vs. test vs. report card)

**Week 2: AI Analysis**
1. Reading level estimation (Lexile framework approximation)
2. Math accuracy analysis (by problem type)
3. Writing assessment (sentence count, complexity, grade level)
4. Goal matching engine (link content to IEP goals)
5. Create `homework_analyses` table

**Week 3: Insight Generation**
1. Build weekly summary email template
2. Progress snapshot generation (auto-compute from analyses)
3. Trend detection (improving/stable/regressing)
4. Proactive alerts (regression, milestone achieved)
5. Create `goal_progress_snapshots` table

**Success metrics:**
- 40%+ of parents forward homework weekly
- 70%+ open weekly summary emails
- Parents cite data in IEP meetings

**This is THE engagement driver** - transforms from once-a-year to weekly use.

### Phase 5: Export & Learning Loop (1 week)

**Goal:** Export structured data, track corrections

**Tasks:**
1. Add CSV export (trivial with structured data)
2. Add "Parent Letter" export
3. Track corrections in `field_corrections` table
4. Build admin dashboard: correction rates, validator accuracy

**Success metric:** 20% of reviewed docs are exported

---

## When to Consider Full Pack Architecture

Build the full abstraction when you hit **2 of these 3:**

1. **You have a second vertical in active development** (TPA pack, medical records, etc.)
   - One vertical = premature abstraction
   - Two verticals = patterns emerge
   - Three verticals = abstraction pays for itself

2. **You're hiring a second developer**
   - Solo: direct imports are faster
   - Team: abstractions prevent stepping on toes
   - Plugin system makes work parallelizable

3. **Customers are asking for custom doc types**
   - Internal use only: hard-code is fine
   - White-label/multi-tenant: need dynamic loading
   - Customer-authored packs: need full plugin system

**Until then:** The pragmatic approach above gives you 80% of the benefits with 20% of the complexity.

---

## Migration Path: Pragmatic → Full Pack Architecture

When you're ready, here's how to migrate:

### Step 1: Wrap Existing Code in Pack Structure

```typescript
// Before (pragmatic):
import { IEP_GOALS_SCHEMA } from '@/schemas/iep_goals';
import { validateIepGoals } from '@/validators/iep_goals';
import { extractIepGoals } from '@/extractors/iep_goals';

// After (pack architecture):
const iepGoalsDocType: DocTypeDefinition = {
  id: 'iep_goals',
  schema: IEP_GOALS_SCHEMA,        // Same file!
  validators: [validateIepGoals],   // Same function!
  extractor: { buildPrompt: extractIepGoals },  // Same logic!
  ui: { sections: [...] },          // New: UI layout
};
```

**Work required:** Create wrapper object, add UI layout JSON. Core logic unchanged.

### Step 2: Migrate Tables

```sql
-- Rename specific table to generic
alter table extracted_iep_goals rename to extracted_documents;

-- Add pack columns
alter table extracted_documents
  add column pack_id text default 'iep',
  add column doc_type_id text default 'iep_goals';

-- Update constraints
alter table extracted_documents
  alter column pack_id drop default,
  alter column doc_type_id drop default;
```

**Work required:** One migration. No data loss.

### Step 3: Add Registry

```typescript
// Create registry
const packRegistry = new PackRegistry();
packRegistry.register(iepPack);

// Update code to use registry
const docType = packRegistry.getDocType('iep', 'iep_goals');
```

**Work required:** Add registry, update call sites. Extractors unchanged.

**Estimated migration time:** 1-2 weeks, mostly mechanical refactoring.

---

## Recommended Decision

**Build the pragmatic version.**

**Why:**
- You're solo, building one product
- Full pack architecture is 3-4 weeks vs. 1-2 weeks for pragmatic
- Pragmatic approach is better code even without multi-vertical
- Migration to full packs is straightforward when needed
- You can always add abstraction, hard to remove it

**Key patterns to adopt NOW:**
1. ✅ Structured extraction (JSONB with schema)
2. ✅ Evidence-based fields (FieldWithEvidence pattern)
3. ✅ Separate validators (deterministic checks)
4. ✅ Schema-driven prompts (JSON Schema files)
5. ✅ Passive intelligence (email-to-analyze, auto-tracking)

**Key abstractions to SKIP:**
1. ❌ Pack registry (direct imports are fine)
2. ❌ Classification system (manual selection)
3. ❌ UI layout JSON (hard-coded components)
4. ❌ Export adapters (simple functions)

**Result:**
- Better IEP Copilot in 6-8 weeks (includes passive intelligence)
- Clean architecture that's multi-vertical-ready
- Killer feature (passive progress tracking) that competitors can't copy
- Engagement driver (weekly vs. once-a-year use)
- No regrets when you build vertical #2

---

## Questions to Validate This Approach

1. **Do you plan to launch a second vertical in the next 6 months?**
   - No → Pragmatic approach
   - Yes → Consider full pack architecture

2. **Is your primary bottleneck development time or code quality?**
   - Development time → Pragmatic (ship faster)
   - Code quality → Full packs (more robust)

3. **Are you planning to hire developers soon?**
   - Solo for 6+ months → Pragmatic (less overhead)
   - Hiring in <3 months → Full packs (better onboarding)

4. **How important is "learning in public" / showing modular architecture to investors?**
   - Product-focused → Pragmatic
   - Platform-focused → Full packs (demonstrates vision)

**Most cases:** Pragmatic approach wins.

---

**Status:** Ready for feedback
**Next Step:** Provide additional recommendations for comparison and synthesis
