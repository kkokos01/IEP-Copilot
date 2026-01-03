# Week 3: Validators (Separate from Extraction)

**Objective:** Deterministic validation rules that run independently of extraction

**Prerequisites:**
- Week 1-2 completed (extraction working)
- Have 3-5 test IEPs with `extracted_iep_data` records

## What You're Building

By end of week 3, you'll have:
1. `validation_issues` table for storing detected problems
2. Reusable validator functions (pure TypeScript, no AI)
3. Inngest function that runs validators after extraction
4. Ability to re-run validators without re-extracting

## Why Validators Are Separate

**Extraction (Week 1-2):** Expensive AI call, extracts data
**Validation (Week 3):** Cheap deterministic rules, finds issues

**Benefits:**
- Can add new validators without re-processing documents
- Can re-run validators on demand (e.g., when rules change)
- Validators are testable (unit tests)
- Different failure modes: extraction fails → no data; validation fails → issues flagged

## Step 1: Database Migration

**File:** `supabase/migrations/YYYYMMDD_create_validation_issues.sql`

```sql
-- Validation issues table
create table validation_issues (
  id uuid primary key default uuid_generate_v4(),
  extracted_iep_data_id uuid references extracted_iep_data(id) on delete cascade,

  -- Issue details
  severity text check (severity in ('error', 'warning', 'info')) not null,
  category text not null, -- 'missing_field', 'invalid_format', 'compliance', 'quality'
  title text not null,
  message text not null,

  -- Field location
  field_path text, -- JSON path like '/goals/0/baseline/value'

  -- Status
  status text check (status in ('open', 'acknowledged', 'fixed', 'dismissed')) default 'open',
  dismissed_by uuid references auth.users(id),
  dismissed_at timestamptz,
  dismissal_reason text,

  -- Metadata
  validator_name text not null,
  validator_version text not null default '1.0',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_validation_issues_extraction on validation_issues(extracted_iep_data_id);
create index idx_validation_issues_status on validation_issues(status);
create index idx_validation_issues_severity on validation_issues(severity);

-- Trigger for updated_at
create trigger set_validation_issues_updated_at
  before update on validation_issues
  for each row
  execute function update_updated_at_column();
```

**Run Migration:**
```bash
supabase migration up
```

**Verify:**
```sql
select * from validation_issues limit 1;
```

## Step 2: Validator Type Definitions

**File:** `src/lib/validators/types.ts`

```typescript
export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'missing_field' | 'invalid_format' | 'compliance' | 'quality';
  title: string;
  message: string;
  fieldPath?: string;
  validatorName: string;
  validatorVersion: string;
}

export interface IEPData {
  student?: {
    name?: { value?: string; evidence?: any[] };
    dateOfBirth?: { value?: string; evidence?: any[] };
    grade?: { value?: string; evidence?: any[] };
    school?: { value?: string; evidence?: any[] };
    district?: { value?: string; evidence?: any[] };
    primaryLanguage?: { value?: string; evidence?: any[] };
  };
  disability?: {
    primary?: { value?: string; evidence?: any[] };
    secondary?: Array<{ value?: string; evidence?: any[] }>;
  };
  dates?: {
    iepStartDate?: { value?: string; evidence?: any[] };
    iepEndDate?: { value?: string; evidence?: any[] };
    annualReviewDate?: { value?: string; evidence?: any[] };
    triennialEvaluationDate?: { value?: string; evidence?: any[] };
    nextProgressReportDate?: { value?: string; evidence?: any[] };
  };
  plaafp?: {
    academicStrengths?: { value?: string; evidence?: any[] };
    academicNeeds?: { value?: string; evidence?: any[] };
    functionalStrengths?: { value?: string; evidence?: any[] };
    functionalNeeds?: { value?: string; evidence?: any[] };
    parentConcerns?: { value?: string; evidence?: any[] };
  };
  goals?: Array<{
    goalText?: { value?: string; evidence?: any[] };
    domain?: { value?: string; evidence?: any[] };
    baseline?: { value?: string; evidence?: any[] };
    target?: { value?: string; evidence?: any[] };
    measurementMethod?: { value?: string; evidence?: any[] };
    progressMonitoringFrequency?: { value?: string; evidence?: any[] };
  }>;
  services?: Array<{
    serviceType?: { value?: string; evidence?: any[] };
    frequency?: { value?: string; evidence?: any[] };
    duration?: { value?: string; evidence?: any[] };
    location?: { value?: string; evidence?: any[] };
    provider?: { value?: string; evidence?: any[] };
    startDate?: { value?: string; evidence?: any[] };
    endDate?: { value?: string; evidence?: any[] };
  }>;
  accommodations?: Array<{
    description?: { value?: string; evidence?: any[] };
    category?: { value?: string; evidence?: any[] };
    appliesTo?: { value?: string; evidence?: any[] };
  }>;
}
```

## Step 3: Validator Functions

**File:** `src/lib/validators/iepValidators.ts`

```typescript
import { ValidationIssue, IEPData } from './types';

// Validator: Required fields present
export function validateRequiredFields(data: IEPData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.student?.name?.value) {
    issues.push({
      severity: 'error',
      category: 'missing_field',
      title: 'Missing Student Name',
      message: 'Student name is required but was not found in the IEP',
      fieldPath: '/student/name/value',
      validatorName: 'validateRequiredFields',
      validatorVersion: '1.0',
    });
  }

  if (!data.student?.dateOfBirth?.value) {
    issues.push({
      severity: 'error',
      category: 'missing_field',
      title: 'Missing Date of Birth',
      message: 'Student date of birth is required but was not found',
      fieldPath: '/student/dateOfBirth/value',
      validatorName: 'validateRequiredFields',
      validatorVersion: '1.0',
    });
  }

  if (!data.goals || data.goals.length === 0) {
    issues.push({
      severity: 'error',
      category: 'missing_field',
      title: 'No Goals Found',
      message: 'IEP must contain at least one annual goal',
      fieldPath: '/goals',
      validatorName: 'validateRequiredFields',
      validatorVersion: '1.0',
    });
  }

  return issues;
}

// Validator: Goal quality (measurability)
export function validateGoalMeasurability(data: IEPData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.goals) return issues;

  data.goals.forEach((goal, index) => {
    const goalText = goal.goalText?.value || '';

    // Check for measurable criteria
    const hasCriteria = /\d+%|\d+\/\d+|\d+ out of \d+|with \d+ accuracy/i.test(goalText);

    if (!hasCriteria) {
      issues.push({
        severity: 'warning',
        category: 'quality',
        title: `Goal ${index + 1}: Not Measurable`,
        message: 'Goal does not include specific measurable criteria (e.g., "80% accuracy", "4 out of 5 trials")',
        fieldPath: `/goals/${index}/goalText/value`,
        validatorName: 'validateGoalMeasurability',
        validatorVersion: '1.0',
      });
    }

    // Check for baseline
    if (!goal.baseline?.value) {
      issues.push({
        severity: 'warning',
        category: 'missing_field',
        title: `Goal ${index + 1}: Missing Baseline`,
        message: 'Goal does not have baseline data showing current level of performance',
        fieldPath: `/goals/${index}/baseline/value`,
        validatorName: 'validateGoalMeasurability',
        validatorVersion: '1.0',
      });
    }

    // Check for measurement method
    if (!goal.measurementMethod?.value) {
      issues.push({
        severity: 'info',
        category: 'missing_field',
        title: `Goal ${index + 1}: Measurement Method Not Specified`,
        message: 'Consider specifying how progress toward this goal will be measured',
        fieldPath: `/goals/${index}/measurementMethod/value`,
        validatorName: 'validateGoalMeasurability',
        validatorVersion: '1.0',
      });
    }
  });

  return issues;
}

// Validator: Date logic
export function validateDateLogic(data: IEPData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.dates) return issues;

  const startDate = data.dates.iepStartDate?.value ? new Date(data.dates.iepStartDate.value) : null;
  const endDate = data.dates.iepEndDate?.value ? new Date(data.dates.iepEndDate.value) : null;
  const reviewDate = data.dates.annualReviewDate?.value ? new Date(data.dates.annualReviewDate.value) : null;

  if (startDate && endDate && startDate >= endDate) {
    issues.push({
      severity: 'error',
      category: 'invalid_format',
      title: 'Invalid Date Range',
      message: 'IEP end date must be after start date',
      fieldPath: '/dates',
      validatorName: 'validateDateLogic',
      validatorVersion: '1.0',
    });
  }

  if (startDate && endDate) {
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff > 366) {
      issues.push({
        severity: 'warning',
        category: 'compliance',
        title: 'IEP Duration Exceeds One Year',
        message: 'IEPs must be reviewed at least annually. This IEP covers more than 365 days.',
        fieldPath: '/dates',
        validatorName: 'validateDateLogic',
        validatorVersion: '1.0',
      });
    }
  }

  if (reviewDate && new Date() > reviewDate) {
    const daysOverdue = Math.floor((new Date().getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));

    issues.push({
      severity: 'error',
      category: 'compliance',
      title: 'Annual Review Overdue',
      message: `Annual review was due ${daysOverdue} days ago. Schedule review meeting immediately.`,
      fieldPath: '/dates/annualReviewDate/value',
      validatorName: 'validateDateLogic',
      validatorVersion: '1.0',
    });
  }

  return issues;
}

// Validator: Service hours calculation
export function validateServiceHours(data: IEPData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.services || data.services.length === 0) {
    issues.push({
      severity: 'warning',
      category: 'missing_field',
      title: 'No Services Listed',
      message: 'No special education or related services found. All IEPs should specify services.',
      fieldPath: '/services',
      validatorName: 'validateServiceHours',
      validatorVersion: '1.0',
    });
    return issues;
  }

  // Check for services with missing frequency or duration
  data.services.forEach((service, index) => {
    if (!service.frequency?.value) {
      issues.push({
        severity: 'warning',
        category: 'missing_field',
        title: `Service ${index + 1}: Missing Frequency`,
        message: 'Service frequency not specified (e.g., "2 times per week")',
        fieldPath: `/services/${index}/frequency/value`,
        validatorName: 'validateServiceHours',
        validatorVersion: '1.0',
      });
    }

    if (!service.duration?.value) {
      issues.push({
        severity: 'warning',
        category: 'missing_field',
        title: `Service ${index + 1}: Missing Duration`,
        message: 'Service duration not specified (e.g., "30 minutes")',
        fieldPath: `/services/${index}/duration/value`,
        validatorName: 'validateServiceHours',
        validatorVersion: '1.0',
      });
    }
  });

  return issues;
}

// Main validator orchestrator
export function validateIEP(data: IEPData): ValidationIssue[] {
  return [
    ...validateRequiredFields(data),
    ...validateGoalMeasurability(data),
    ...validateDateLogic(data),
    ...validateServiceHours(data),
  ];
}
```

## Step 4: Inngest Validation Function

**File:** `src/inngest/functions/validateIepExtraction.ts`

```typescript
import { inngest } from '@/inngest/client';
import { validateIEP } from '@/lib/validators/iepValidators';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const validateIepExtraction = inngest.createFunction(
  { id: 'validate-iep-extraction' },
  { event: 'extraction.completed' },
  async ({ event, step }) => {
    const { extractionId } = event.data;

    // Get extraction data
    const extraction = await step.run('get-extraction', async () => {
      const { data, error } = await supabase
        .from('extracted_iep_data')
        .select('id, data')
        .eq('id', extractionId)
        .single();

      if (error) throw error;
      return data;
    });

    // Run validators
    const issues = await step.run('run-validators', async () => {
      return validateIEP(extraction.data);
    });

    // Save issues to database
    if (issues.length > 0) {
      await step.run('save-validation-issues', async () => {
        const { error } = await supabase
          .from('validation_issues')
          .insert(
            issues.map(issue => ({
              extracted_iep_data_id: extractionId,
              ...issue,
            }))
          );

        if (error) throw error;
      });
    }

    return { issueCount: issues.length };
  }
);
```

## Step 5: Register Validator Function

**File:** `src/inngest/functions/index.ts`

```typescript
import { extractIepStructuredData } from './extractIepStructuredData';
import { validateIepExtraction } from './validateIepExtraction';

export const functions = [
  extractIepStructuredData,
  validateIepExtraction,
  // ... other functions
];
```

## Step 6: Manual Re-Validation Endpoint (Optional but Useful)

**File:** `src/app/api/revalidate-iep/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';

export async function POST(request: NextRequest) {
  const { extractionId } = await request.json();

  if (!extractionId) {
    return NextResponse.json({ error: 'extractionId required' }, { status: 400 });
  }

  // Trigger validation manually
  await inngest.send({
    name: 'extraction.completed',
    data: { extractionId },
  });

  return NextResponse.json({ success: true });
}
```

**Usage:**
```bash
# Re-run validators on existing extraction
curl -X POST http://localhost:3000/api/revalidate-iep \
  -H "Content-Type: application/json" \
  -d '{"extractionId": "some-uuid"}'
```

## Testing Checklist

**Week 3 Milestones:**
- [ ] `validation_issues` table created
- [ ] Validator functions return issues for test data
- [ ] Can unit test validators (they're pure functions)
- [ ] Inngest function runs after `extraction.completed` event
- [ ] Issues saved to database
- [ ] Can query issues: `select * from validation_issues;`

**Test Cases:**

1. **Missing required field:**
   - Remove `student.name` from test extraction
   - Run validator
   - Should create error-level issue

2. **Unmeasurable goal:**
   - Create goal: "Student will improve reading"
   - Should create warning-level issue

3. **Invalid dates:**
   - Set `iepEndDate` before `iepStartDate`
   - Should create error-level issue

4. **Overdue review:**
   - Set `annualReviewDate` to past date
   - Should create error-level issue with days overdue

## Success Criteria

By end of week 3:

- ✅ Validators run after extraction completes
- ✅ Issues saved to `validation_issues` table
- ✅ Can re-run validators without re-extracting (via manual trigger)
- ✅ Different severity levels working (error, warning, info)
- ✅ Field paths correctly identify problematic fields

**Quality Checks:**
- Test with 3-5 IEPs (diverse quality levels)
- Manually verify: issues detected match actual problems
- No false positives (issues flagged that aren't real problems)
- All critical compliance issues caught (overdue reviews, missing required fields)

## Adding New Validators

**Pattern to follow:**

```typescript
export function validateNewRule(data: IEPData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Your validation logic here
  if (/* condition */) {
    issues.push({
      severity: 'warning', // or 'error', 'info'
      category: 'quality', // or 'missing_field', 'invalid_format', 'compliance'
      title: 'Short description',
      message: 'Detailed explanation for user',
      fieldPath: '/path/to/field',
      validatorName: 'validateNewRule',
      validatorVersion: '1.0',
    });
  }

  return issues;
}

// Add to validateIEP orchestrator
export function validateIEP(data: IEPData): ValidationIssue[] {
  return [
    ...validateRequiredFields(data),
    ...validateGoalMeasurability(data),
    ...validateDateLogic(data),
    ...validateServiceHours(data),
    ...validateNewRule(data), // Add here
  ];
}
```

## Common Issues & Solutions

**Issue:** Validators not running
- **Solution:** Check Inngest dev server logs. Ensure `extraction.completed` event is being sent from extraction function.

**Issue:** Too many false positives
- **Solution:** Start with high-confidence rules. Use `info` severity for experimental validators. Gather user feedback before promoting to `warning` or `error`.

**Issue:** Field paths not matching
- **Solution:** Use exact JSON paths. Test with `lodash.get()` if needed: `_.get(data, fieldPath)` should return the field value.

**Issue:** Validator performance slow
- **Solution:** Validators should be <100ms total. Profile with `console.time()`. Avoid complex regex or nested loops.

## Next Steps

After Week 3 completion:
1. Proceed to `week-4-5-evidence-ui.md`
2. Can now show validation issues in UI (week 4-5 will build the panel)
3. Consider adding unit tests for validators (optional but recommended)
4. Monitor: which validators are most useful? Which create noise?

---

*Week 3 Implementation Guide*
*Last Updated: 2026-01-03*
