# Week 6: Analytics Dashboard (IEP Summary)

**Objective:** Auto-generate insights from structured IEP data

**Prerequisites:**
- Week 1-2 completed (extraction working)
- Week 3 completed (validators working)
- Week 4-5 completed (UI components built)
- Have 5-10 extracted IEPs to test with

## What You're Building

By end of week 6, you'll have:
1. `iep_analytics` table with pre-computed metrics
2. Analytics computation function (TypeScript, no AI)
3. Inngest function to compute analytics after extraction
4. Dashboard UI showing service hours, goals, review dates, compliance

## Why Pre-Compute Analytics

**Option A: Compute on-demand (❌):**
- Query JSONB on every page load
- Slow for complex aggregations
- Hard to index

**Option B: Pre-compute and cache (✅):**
- Compute once after extraction
- Store in dedicated table
- Fast queries, easy to display
- Can re-compute if formula changes

## Step 1: Database Migration

**File:** `supabase/migrations/YYYYMMDD_create_iep_analytics.sql`

```sql
-- Pre-computed IEP analytics
create table iep_analytics (
  id uuid primary key default uuid_generate_v4(),
  extracted_iep_data_id uuid references extracted_iep_data(id) on delete cascade unique,
  child_id uuid references children(id),

  -- Service summary
  total_service_minutes_per_week int,
  service_breakdown jsonb, -- { "Special Ed": 90, "Speech": 60, "OT": 30 }

  -- Goal summary
  total_goals int,
  goals_by_domain jsonb, -- { "Reading": 2, "Math": 1, "Writing": 1 }
  goals_with_baseline int,
  goals_with_measurement int,

  -- Date flags
  annual_review_date date,
  triennial_eval_date date,
  days_until_annual_review int,

  -- Compliance flags
  is_review_overdue boolean default false,
  has_missing_baselines boolean default false,
  has_unmeasurable_goals boolean default false,

  computed_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_iep_analytics_child on iep_analytics(child_id);
create index idx_iep_analytics_extraction on iep_analytics(extracted_iep_data_id);

-- Trigger for updated_at
create trigger set_iep_analytics_updated_at
  before update on iep_analytics
  for each row
  execute function update_updated_at_column();
```

**Run Migration:**
```bash
supabase migration up
```

## Step 2: Analytics Computation Logic

**File:** `src/lib/analytics/computeIepAnalytics.ts`

```typescript
interface IEPAnalytics {
  total_service_minutes_per_week: number;
  service_breakdown: Record<string, number>;
  total_goals: number;
  goals_by_domain: Record<string, number>;
  goals_with_baseline: number;
  goals_with_measurement: number;
  annual_review_date: string | null;
  triennial_eval_date: string | null;
  days_until_annual_review: number | null;
  is_review_overdue: boolean;
  has_missing_baselines: boolean;
  has_unmeasurable_goals: boolean;
}

export function computeIepAnalytics(data: any): IEPAnalytics {
  // Service minutes calculation
  let totalMinutes = 0;
  const serviceBreakdown: Record<string, number> = {};

  if (data.services) {
    data.services.forEach((service: any) => {
      const freq = service.frequency?.value || '';
      const dur = service.duration?.value || '';
      const serviceType = service.serviceType?.value || 'Unknown';

      // Parse frequency (e.g., "2 times per week" -> 2)
      const freqMatch = freq.match(/(\d+)/);
      const freqNum = freqMatch ? parseInt(freqMatch[1]) : 0;

      // Parse duration (e.g., "30 minutes" -> 30)
      const durMatch = dur.match(/(\d+)/);
      const durNum = durMatch ? parseInt(durMatch[1]) : 0;

      const minutesPerWeek = freqNum * durNum;
      totalMinutes += minutesPerWeek;

      serviceBreakdown[serviceType] = (serviceBreakdown[serviceType] || 0) + minutesPerWeek;
    });
  }

  // Goal analysis
  const goals = data.goals || [];
  const goalsByDomain: Record<string, number> = {};
  let goalsWithBaseline = 0;
  let goalsWithMeasurement = 0;
  let hasUnmeasurableGoals = false;

  goals.forEach((goal: any) => {
    const domain = goal.domain?.value || 'Other';
    goalsByDomain[domain] = (goalsByDomain[domain] || 0) + 1;

    if (goal.baseline?.value) {
      goalsWithBaseline++;
    }

    if (goal.measurementMethod?.value) {
      goalsWithMeasurement++;
    }

    // Check if goal text has measurable criteria
    const goalText = goal.goalText?.value || '';
    const hasCriteria = /\d+%|\d+\/\d+|\d+ out of \d+|with \d+ accuracy/i.test(goalText);
    if (!hasCriteria) {
      hasUnmeasurableGoals = true;
    }
  });

  // Date calculations
  const annualReviewDate = data.dates?.annualReviewDate?.value || null;
  const triennialEvalDate = data.dates?.triennialEvaluationDate?.value || null;

  let daysUntilReview = null;
  let isOverdue = false;

  if (annualReviewDate) {
    const reviewDate = new Date(annualReviewDate);
    const today = new Date();
    daysUntilReview = Math.floor((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    isOverdue = daysUntilReview < 0;
  }

  return {
    total_service_minutes_per_week: totalMinutes,
    service_breakdown: serviceBreakdown,
    total_goals: goals.length,
    goals_by_domain: goalsByDomain,
    goals_with_baseline: goalsWithBaseline,
    goals_with_measurement: goalsWithMeasurement,
    annual_review_date: annualReviewDate,
    triennial_eval_date: triennialEvalDate,
    days_until_annual_review: daysUntilReview,
    is_review_overdue: isOverdue,
    has_missing_baselines: goalsWithBaseline < goals.length,
    has_unmeasurable_goals: hasUnmeasurableGoals,
  };
}
```

## Step 3: Inngest Analytics Function

**File:** `src/inngest/functions/computeIepAnalytics.ts`

```typescript
import { inngest } from '@/inngest/client';
import { computeIepAnalytics } from '@/lib/analytics/computeIepAnalytics';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const computeAnalytics = inngest.createFunction(
  { id: 'compute-iep-analytics' },
  { event: 'extraction.completed' },
  async ({ event, step }) => {
    const { extractionId, documentId } = event.data;

    // Get extraction data
    const extraction = await step.run('get-extraction', async () => {
      const { data, error } = await supabase
        .from('extracted_iep_data')
        .select('id, data, document_id')
        .eq('id', extractionId)
        .single();

      if (error) throw error;
      return data;
    });

    // Get child_id from document
    const childId = await step.run('get-child-id', async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('child_id')
        .eq('id', extraction.document_id)
        .single();

      if (error) throw error;
      return data.child_id;
    });

    // Compute analytics
    const analytics = await step.run('compute-analytics', async () => {
      return computeIepAnalytics(extraction.data);
    });

    // Save to database (upsert in case we re-run)
    await step.run('save-analytics', async () => {
      const { error } = await supabase
        .from('iep_analytics')
        .upsert({
          extracted_iep_data_id: extractionId,
          child_id: childId,
          ...analytics,
        }, {
          onConflict: 'extracted_iep_data_id'
        });

      if (error) throw error;
    });

    return analytics;
  }
);
```

## Step 4: Register Analytics Function

**File:** `src/inngest/functions/index.ts`

```typescript
import { extractIepStructuredData } from './extractIepStructuredData';
import { validateIepExtraction } from './validateIepExtraction';
import { computeAnalytics } from './computeIepAnalytics';

export const functions = [
  extractIepStructuredData,
  validateIepExtraction,
  computeAnalytics,
  // ... other functions
];
```

## Step 5: Dashboard UI Component

**File:** `src/components/iep/IEPDashboard.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Target, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface IEPDashboardProps {
  analytics: any;
  extraction: any;
}

export function IEPDashboard({ analytics, extraction }: IEPDashboardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Service Hours Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Service Hours</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.floor(analytics.total_service_minutes_per_week / 60)}h {analytics.total_service_minutes_per_week % 60}m
          </div>
          <p className="text-xs text-muted-foreground">per week</p>
          <div className="mt-4 space-y-2">
            {Object.entries(analytics.service_breakdown).map(([service, minutes]) => (
              <div key={service} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{service}</span>
                <span className="font-medium">{minutes} min</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Goals Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">IEP Goals</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.total_goals}</div>
          <p className="text-xs text-muted-foreground">annual goals</p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">With baseline data</span>
              <span className="font-medium">
                {analytics.goals_with_baseline}/{analytics.total_goals}
              </span>
            </div>
            <Progress
              value={(analytics.goals_with_baseline / analytics.total_goals) * 100}
              className="h-2"
            />
          </div>
          <div className="mt-3 space-y-1">
            {Object.entries(analytics.goals_by_domain).map(([domain, count]) => (
              <Badge key={domain} variant="outline" className="mr-1">
                {domain}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Annual Review */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Annual Review</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {analytics.is_review_overdue ? (
            <>
              <div className="text-2xl font-bold text-red-600">Overdue</div>
              <p className="text-xs text-muted-foreground">
                {Math.abs(analytics.days_until_annual_review)} days past due
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">
                {analytics.days_until_annual_review} days
              </div>
              <p className="text-xs text-muted-foreground">until review</p>
            </>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            Due: {new Date(analytics.annual_review_date).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compliance</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.has_missing_baselines && (
              <Badge variant="warning" className="w-full justify-start">
                Missing baseline data
              </Badge>
            )}
            {analytics.has_unmeasurable_goals && (
              <Badge variant="warning" className="w-full justify-start">
                Goals not measurable
              </Badge>
            )}
            {!analytics.has_missing_baselines && !analytics.has_unmeasurable_goals && (
              <Badge variant="success" className="w-full justify-start">
                No issues detected
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Install dependencies:**
```bash
npx shadcn-ui@latest add card progress
```

**Add success variant to Badge** (if not already done):

```typescript
// src/components/ui/badge.tsx
const badgeVariants = cva(
  // ... existing code
  {
    variants: {
      variant: {
        // ... existing variants
        success: "border-transparent bg-green-500 text-white hover:bg-green-600",
      },
    },
  }
);
```

## Step 6: Integrate Dashboard in Document Page

**File:** `src/app/documents/[id]/page.tsx` (update from week 4-5)

```typescript
import { IEPDashboard } from '@/components/iep/IEPDashboard';
// ... other imports

async function getAnalytics(extractionId: string) {
  const { data, error } = await supabase
    .from('iep_analytics')
    .select('*')
    .eq('extracted_iep_data_id', extractionId)
    .single();

  if (error) throw error;
  return data;
}

export default async function DocumentPage({ params }: { params: { id: string } }) {
  const extraction = await getExtraction(params.id);
  const issues = await getValidationIssues(extraction.id);
  const analytics = await getAnalytics(extraction.id);

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">
        IEP Review: {extraction.data.student?.name?.value || 'Student'}
      </h1>

      {/* Dashboard at top */}
      <div className="mb-8">
        <IEPDashboard analytics={analytics} extraction={extraction} />
      </div>

      {/* Existing tabs below */}
      <Tabs defaultValue="goals">
        {/* ... rest of tabs from week 4-5 ... */}
      </Tabs>
    </div>
  );
}
```

## Testing Checklist

**Week 6 Milestones:**
- [ ] `iep_analytics` table created
- [ ] Analytics compute correctly for test IEPs
- [ ] Service minutes calculated accurately
- [ ] Goal counts by domain correct
- [ ] Date calculations (days until review) accurate
- [ ] Dashboard displays all 4 cards

**Test Cases:**

1. **IEP with services:**
   - Input: "Speech 2x/week, 30 min", "OT 1x/week, 45 min"
   - Expected: 105 min/week total, breakdown shows both

2. **IEP with goals:**
   - Input: 3 reading goals, 2 math goals
   - Expected: 5 total, breakdown shows Reading: 3, Math: 2

3. **IEP with missing baselines:**
   - Input: 2 goals with baselines, 1 without
   - Expected: `has_missing_baselines: true`, progress bar shows 2/3

4. **Overdue review:**
   - Input: Annual review date = 30 days ago
   - Expected: `is_review_overdue: true`, shows "30 days past due"

## Success Criteria

By end of week 6:

- ✅ Analytics auto-compute after extraction
- ✅ Dashboard shows service hours, goal counts, review dates
- ✅ Visual indicators for compliance issues
- ✅ No manual data entry required
- ✅ Dashboard loads fast (<500ms)

**User Experience:**
- Upload IEP → Dashboard populates automatically
- See "90 minutes/week" service hours at a glance
- Notice "Overdue" warning if annual review passed
- Understand goal distribution (Reading: 3, Math: 2, etc.)

## Manual Re-Computation

If analytics formula changes, re-compute for all IEPs:

**File:** `src/scripts/recompute-all-analytics.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { computeIepAnalytics } from '@/lib/analytics/computeIepAnalytics';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function recomputeAllAnalytics() {
  // Get all extractions
  const { data: extractions, error } = await supabase
    .from('extracted_iep_data')
    .select('id, data, document_id');

  if (error) throw error;

  console.log(`Recomputing analytics for ${extractions.length} IEPs...`);

  for (const extraction of extractions) {
    // Get child_id
    const { data: doc } = await supabase
      .from('documents')
      .select('child_id')
      .eq('id', extraction.document_id)
      .single();

    // Compute analytics
    const analytics = computeIepAnalytics(extraction.data);

    // Upsert
    await supabase
      .from('iep_analytics')
      .upsert({
        extracted_iep_data_id: extraction.id,
        child_id: doc?.child_id,
        ...analytics,
      }, {
        onConflict: 'extracted_iep_data_id'
      });

    console.log(`✓ ${extraction.id}`);
  }

  console.log('Done!');
}

recomputeAllAnalytics().catch(console.error);
```

**Run:**
```bash
npx tsx src/scripts/recompute-all-analytics.ts
```

## Common Issues & Solutions

**Issue:** Service minutes calculation wrong
- **Solution:** IEP formats vary. Handle "2 times/week", "2x per week", "twice weekly". Add more regex patterns.

**Issue:** Goal domain not categorized correctly
- **Solution:** AI might use different labels. Normalize in computation logic or add mapping.

**Issue:** Dashboard shows "NaN" or undefined
- **Solution:** Handle null/missing data gracefully. Use `|| 0` defaults.

**Issue:** Analytics don't update after editing goal
- **Solution:** Either re-trigger `extraction.completed` event or add separate `iep.updated` event.

## Next Steps

After Week 6 completion:
1. **Phase 1 Complete!** All foundation pieces done.
2. Review `week-7-8-strategic.md` for high-level passive intelligence plan
3. Schedule detailed planning session for weeks 7-8 (2 weeks from now)
4. Gather user feedback on weeks 1-6:
   - Is extraction accurate?
   - Are validations helpful or noisy?
   - Is dashboard useful?
   - What's missing?

## Week 7-8 Preview

**Passive Intelligence (Email-to-Analyze):**
- Parents email homework/teacher notes to analyze@iepcopilot.com
- AI analyzes in context of IEP goals
- Returns insights via email + dashboard
- Reuses extraction pipeline from weeks 1-2

**Detail this in 2 weeks** after validating extraction quality with production data.

---

*Week 6 Implementation Guide*
*Last Updated: 2026-01-03*
