# Child-Level Analytics Implementation Plan

**Date:** 2026-01-03
**Status:** Planning Phase
**Target:** Individual student analytics for B2C and B2B markets

---

## Executive Summary

Build a child-specific analytics dashboard showing a student's educational journey through their IEP documents. This complements the existing portfolio-level analytics and provides deep insights for parents (B2C) and per-client analysis for advocates (B2B).

**Key Insight:** We can implement meaningful child-level analytics NOW using existing IEP data, with clear paths for enhancement as we add progress report and evaluation extraction.

---

## Phase 1: Core Child Analytics (Implement Now)

### 1.1 Available Data

✅ **Currently Extracted from IEPs:**
- Student demographics (name, DOB, grade, school, district)
- IEP dates (effective date, meeting date, annual review, triennial evaluation)
- Goals (text, domain, baseline, target, measurement method, monitoring frequency)
- Services (type, frequency, duration, location, provider, dates)
- Accommodations (description, category, applies to)
- PLAAFP (strengths, needs, parent concerns)
- Validation issues (compliance problems, missing fields, quality issues)

✅ **Database Structure:**
```
child → cases → documents (multiple IEPs over time) → extracted_iep_data
```

Each child can have multiple cases (e.g., "2024-2025 IEP", "2025-2026 IEP")
Each case can have multiple documents (IEPs, evaluations, progress reports, etc.)
Documents are chronologically ordered by `effective_date`

### 1.2 Core Metrics to Implement

#### **Overview Card**
- Child name, grade, school, district
- Total IEPs on file
- Date range (first IEP → most recent IEP)
- Current compliance status (reviews due, evaluations due)
- Latest IEP effective date

#### **Goal Analytics**
- **Goal Count Trends**
  - X-axis: IEP dates
  - Y-axis: Total goals
  - Breakdown: Goals by domain (Math, Reading, Behavior, etc.)

- **Domain Distribution**
  - Pie chart or bar chart showing goal distribution by domain
  - Track domain changes over time (e.g., Math goals decreasing, Social-Emotional increasing)

- **Goal Stability**
  - New goals added in latest IEP
  - Goals continued from previous IEP (fuzzy match on text)
  - Goals removed/completed

#### **Service Analytics**
- **Service Comparison Table**
  ```
  Service Type    | Previous IEP        | Current IEP         | Change
  ----------------|---------------------|---------------------|--------
  Speech Therapy  | 2x/week, 30 min     | 3x/week, 30 min     | ↑ Frequency
  OT              | 1x/week, 45 min     | 1x/week, 45 min     | → No change
  Counseling      | Not provided        | 1x/month, 30 min    | + Added
  ```

- **Service Hours Trends**
  - Total service minutes per week over time
  - Service type breakdown (speech, OT, counseling, etc.)
  - Service location trends (general ed vs. special ed vs. pull-out)

- **Service Changes**
  - Services added in latest IEP
  - Services removed
  - Services with modified frequency/duration

#### **Accommodation Tracking**
- Total accommodation count over time
- Accommodation categories (Instructional, Testing, Environmental)
- Accommodations added/removed between IEPs

#### **Compliance Dashboard**
- Days until annual review due
- Days until triennial evaluation due
- IEP duration (start date → end date, flag if > 365 days)
- Overdue items (color-coded: red = overdue, yellow = due soon, green = current)

#### **Validation Issues**
- Total open issues for this child
- Issues by severity (error, warning, info)
- Issues by category (compliance, missing field, quality)
- Historical trend (issues decreasing or increasing over time?)

### 1.3 API Structure

**Route:** `/api/children/[childId]/analytics`

**Method:** GET

**Authentication:**
- Verify user owns the child via children.user_id
- Return 404 if not authorized (don't leak existence)

**Response Structure:**
```typescript
{
  child: {
    id: uuid,
    name: string,
    currentGrade: string,
    currentSchool: string
  },

  overview: {
    totalIEPs: number,
    dateRange: { first: date, latest: date },
    latestIEPDate: date,
    complianceStatus: {
      annualReview: { date: date, status: 'current' | 'due_soon' | 'overdue', daysUntilDue: number },
      triennialEvaluation: { date: date, status: 'current' | 'due_soon' | 'overdue', daysUntilDue: number }
    }
  },

  timeline: Array<{
    iepDate: date,
    meetingDate: date,
    goalCount: number,
    goalsByDomain: { [domain: string]: number },
    serviceCount: number,
    servicesByType: { [type: string]: number },
    accommodationCount: number,
    totalServiceMinutesPerWeek: number,
    validationIssues: { total: number, errors: number, warnings: number }
  }>,

  latestVsPrevious: {
    goals: {
      current: number,
      previous: number,
      change: number,
      added: number,
      removed: number,
      continued: number,
      domainChanges: { [domain: string]: { current: number, previous: number, change: number } }
    },
    services: {
      current: number,
      previous: number,
      added: Array<{ type: string, frequency: string, duration: string }>,
      removed: Array<{ type: string, frequency: string, duration: string }>,
      modified: Array<{ type: string, from: string, to: string }>,
      totalMinutesPerWeek: { current: number, previous: number, change: number }
    },
    accommodations: {
      current: number,
      previous: number,
      added: Array<string>,
      removed: Array<string>
    }
  },

  validation: {
    totalIssues: number,
    openIssues: number,
    byCategory: { [category: string]: number },
    bySeverity: { error: number, warning: number, info: number },
    recentIssues: Array<{
      iepDate: date,
      severity: string,
      category: string,
      title: string,
      message: string,
      status: string
    }>
  }
}
```

### 1.4 Database Queries

#### Query 1: Get Child's IEP Timeline

```typescript
const { data: ieps, error } = await getSupabaseAdmin()
  .from('documents')
  .select(`
    id,
    effective_date,
    meeting_date,
    status,
    case_id,
    cases!inner (
      id,
      child_id,
      children!inner (
        id,
        name,
        grade,
        school,
        district,
        user_id
      )
    ),
    extracted_iep_data (
      id,
      data,
      extracted_at
    )
  `)
  .eq('cases.child_id', childId)
  .eq('type', 'iep')
  .order('effective_date', { ascending: false });

// Verify ownership
if (ieps[0]?.cases?.children?.user_id !== user.id) {
  return errorResponse(ERRORS.ACCESS_DENIED);
}
```

#### Query 2: Get Validation Issues for Child

```typescript
const { data: issues } = await getSupabaseAdmin()
  .from('validation_issues')
  .select(`
    id,
    severity,
    category,
    title,
    message,
    field_path,
    status,
    extracted_iep_data!inner (
      id,
      document_id,
      documents!inner (
        id,
        effective_date,
        case_id,
        cases!inner (
          child_id
        )
      )
    )
  `)
  .eq('extracted_iep_data.documents.cases.child_id', childId);
```

### 1.5 Data Processing Logic

#### Goal Comparison Algorithm

```typescript
function compareGoals(currentIEP: IEP, previousIEP: IEP) {
  const currentGoals = currentIEP.extracted_iep_data?.data?.goals || [];
  const previousGoals = previousIEP.extracted_iep_data?.data?.goals || [];

  const added: Goal[] = [];
  const removed: Goal[] = [];
  const continued: Goal[] = [];

  // Find continued goals (fuzzy match on goal text + domain)
  currentGoals.forEach(cGoal => {
    const match = previousGoals.find(pGoal =>
      similarity(cGoal.goalText?.value, pGoal.goalText?.value) > 0.8 &&
      cGoal.domain?.value === pGoal.domain?.value
    );

    if (match) {
      continued.push(cGoal);
    } else {
      added.push(cGoal);
    }
  });

  // Find removed goals
  previousGoals.forEach(pGoal => {
    const match = currentGoals.find(cGoal =>
      similarity(cGoal.goalText?.value, pGoal.goalText?.value) > 0.8 &&
      cGoal.domain?.value === pGoal.domain?.value
    );

    if (!match) {
      removed.push(pGoal);
    }
  });

  return { added, removed, continued };
}
```

#### Service Hours Calculation

```typescript
function calculateServiceHours(services: Service[]) {
  let totalMinutesPerWeek = 0;

  services.forEach(service => {
    const frequency = parseFrequency(service.frequency?.value); // "2 times per week" → 2
    const duration = parseDuration(service.duration?.value);   // "30 minutes" → 30

    if (frequency && duration) {
      totalMinutesPerWeek += frequency * duration;
    }
  });

  return totalMinutesPerWeek;
}

// Helper: Parse frequency text
function parseFrequency(text: string): number | null {
  // "2 times per week" → 2
  // "1x/week" → 1
  // "Daily" → 5
  const match = text?.match(/(\d+)\s*(?:times?|x)\s*(?:per|\/)\s*week/i);
  if (match) return parseInt(match[1]);

  if (/daily/i.test(text)) return 5;
  if (/monthly/i.test(text)) return 0.25; // Approximate

  return null;
}

// Helper: Parse duration text
function parseDuration(text: string): number | null {
  // "30 minutes" → 30
  // "1 hour" → 60
  const minuteMatch = text?.match(/(\d+)\s*min/i);
  if (minuteMatch) return parseInt(minuteMatch[1]);

  const hourMatch = text?.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr)/i);
  if (hourMatch) return parseFloat(hourMatch[1]) * 60;

  return null;
}
```

#### Compliance Status Calculation

```typescript
function getComplianceStatus(date: string): ComplianceStatus {
  if (!date) return { status: 'unknown', daysUntilDue: null };

  const dueDate = new Date(date);
  const today = new Date();
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'overdue', daysUntilDue: Math.abs(diffDays) };
  } else if (diffDays <= 30) {
    return { status: 'due_soon', daysUntilDue: diffDays };
  } else {
    return { status: 'current', daysUntilDue: diffDays };
  }
}
```

### 1.6 Performance Considerations

**Optimization Strategies:**

1. **Query Optimization**
   - Use single query with joins instead of multiple queries
   - Limit JSONB traversal depth
   - Index on `child_id`, `case_id`, `effective_date`, `type`

2. **Caching**
   - Cache child analytics for 5 minutes (data rarely changes)
   - Invalidate cache on document upload/update
   - Use Redis or Vercel Edge Config

3. **Response Size**
   - Limit timeline to most recent 5 IEPs by default
   - Allow pagination for full history
   - Compress JSONB data in response

4. **Lazy Loading**
   - Load overview + latest comparison first
   - Load full timeline on user request
   - Load validation issues on demand

**Estimated Query Performance:**
- Child with 3 IEPs: ~200ms
- Child with 10 IEPs: ~500ms
- Child with 20+ IEPs: Consider pagination

---

## Phase 2: Progress Tracking (Future Enhancement)

### 2.1 Required New Data

**Add Progress Report Extraction:**

```typescript
// New table: progress_report_data
{
  id: uuid,
  document_id: uuid → documents(id) CASCADE,
  data: {
    reportingPeriod: {
      start: { value: date, evidence: [] },
      end: { value: date, evidence: [] }
    },
    goals: Array<{
      goalReference: { value: string, evidence: [] },  // Reference to IEP goal
      progressStatus: { value: 'met' | 'progressing' | 'not_met' | 'regressing', evidence: [] },
      progressDescription: { value: string, evidence: [] },
      dataPoints: Array<{
        date: { value: date, evidence: [] },
        performance: { value: string, evidence: [] }
      }>
    }>,
    teacherComments: { value: string, evidence: [] }
  },
  schema_version: text,
  extracted_at: timestamptz
}
```

### 2.2 New Metrics Enabled

- **Goal Achievement Rate:** % of goals marked as "met" or "progressing"
- **Progress Velocity:** Rate of progress toward targets over time
- **At-Risk Goals:** Goals showing "not_met" or "regressing" status
- **Progress Timeline:** Visual chart of goal progress over reporting periods

### 2.3 Implementation Estimate

- Database migration: 1 hour
- Extraction prompt + schema: 4 hours
- Inngest function: 2 hours
- API updates: 3 hours
- **Total:** ~1-2 days

---

## Phase 3: Evaluation Integration (Future Enhancement)

### 3.1 Required New Data

**Add Evaluation Extraction:**

```typescript
// New table: evaluation_data
{
  id: uuid,
  document_id: uuid → documents(id) CASCADE,
  data: {
    evaluationDate: { value: date, evidence: [] },
    evaluationType: { value: string, evidence: [] },  // "Psychoeducational", "Speech/Language", etc.
    assessments: Array<{
      name: { value: string, evidence: [] },
      type: { value: string, evidence: [] },
      score: { value: string, evidence: [] },
      percentile: { value: number, evidence: [] },
      interpretation: { value: string, evidence: [] }
    }>,
    recommendations: Array<{
      category: { value: 'service' | 'accommodation' | 'goal' | 'placement' | 'other', evidence: [] },
      description: { value: string, evidence: [] },
      priority: { value: 'high' | 'medium' | 'low', evidence: [] }
    }>,
    eligibility: {
      qualified: { value: boolean, evidence: [] },
      categories: { value: string[], evidence: [] },
      justification: { value: string, evidence: [] }
    },
    areasOfStrength: { value: string, evidence: [] },
    areasOfNeed: { value: string, evidence: [] }
  },
  schema_version: text,
  extracted_at: timestamptz
}
```

### 3.2 New Metrics Enabled

- **Recommendation Implementation Rate:** % of evaluation recommendations reflected in subsequent IEP
- **Recommendation Lag Time:** Days between evaluation and IEP changes
- **Assessment Score Trends:** Track scores over multiple evaluations (e.g., reading levels improving)
- **Unaddressed Recommendations:** Evaluation recommendations not in current IEP

### 3.3 Comparison View: Evaluation → IEP

```typescript
{
  evaluationDate: date,
  iepDate: date,
  lagDays: number,

  recommendations: {
    total: number,
    implemented: number,
    partiallyImplemented: number,
    notImplemented: number,

    details: Array<{
      recommendation: string,
      status: 'implemented' | 'partial' | 'not_implemented',
      iepMatch: string | null  // Matching goal/service/accommodation text
    }>
  },

  eligibilityChanges: {
    categoriesAdded: string[],
    categoriesRemoved: string[]
  }
}
```

### 3.4 Implementation Estimate

- Database migration: 1 hour
- Extraction prompt + schema: 6 hours (more complex than progress reports)
- Inngest function: 3 hours
- Linking algorithm (recommendations → IEP): 4 hours
- API updates: 4 hours
- **Total:** ~2-3 days

---

## Phase 4: Advanced Analytics (Long-Term)

### 4.1 Goal Linking Across IEPs

**Challenge:** Currently no direct link between "same goal" in consecutive IEPs

**Solution:** Add `parent_goal_id` field to track continued goals

```typescript
// In extracted_iep_data.data.goals
{
  goalText: { value: string, evidence: [] },
  domain: { value: string, evidence: [] },
  parentGoalId: { value: uuid | null, evidence: [] },  // NEW: Link to previous IEP's goal
  status: { value: 'new' | 'continued' | 'modified', evidence: [] }  // NEW
}
```

**Benefits:**
- Definitive tracking of goal lifecycle
- Accurate "goal met" vs "goal continued" analysis
- Multi-year goal progression

**Implementation:** Requires AI-powered goal matching during extraction

### 4.2 Predictive Analytics

**Goal Achievement Prediction:**
- Input: Goal baseline, target, progress report history
- Output: Likelihood of meeting goal by annual review
- Algorithm: Simple regression or ML model

**Service Effectiveness Analysis:**
- Correlate service hours with progress toward related goals
- Identify which services correlate with positive progress
- Suggest service adjustments

**Compliance Risk Scoring:**
- Analyze historical compliance issues
- Predict likelihood of future compliance problems
- Suggest preventive actions

### 4.3 Multi-Child Family Analytics

**For families with multiple children in special education:**

- Compare IEP quality across siblings
- Identify district patterns (are all children missing same services?)
- Track total family service hours (for scheduling)
- Combined compliance calendar

---

## Implementation Checklist

### Phase 1: Core Child Analytics (Immediate)

- [ ] Create `/api/children/[childId]/analytics` route
- [ ] Implement authentication + ownership verification
- [ ] Write query to fetch child's IEP timeline
- [ ] Write query to fetch child's validation issues
- [ ] Implement goal comparison algorithm (added/removed/continued)
- [ ] Implement service comparison logic
- [ ] Implement service hours calculation with text parsing
- [ ] Implement compliance status calculation
- [ ] Build response aggregation logic
- [ ] Add caching (5-minute TTL)
- [ ] Test with real child data
- [ ] Document API in API_STANDARDS.md

### Phase 2: Progress Tracking (Future)

- [ ] Design progress_report_data schema
- [ ] Create database migration
- [ ] Write extraction prompt for progress reports
- [ ] Build Inngest function for progress extraction
- [ ] Update child analytics API to include progress data
- [ ] Build progress timeline visualization
- [ ] Test with real progress reports

### Phase 3: Evaluation Integration (Future)

- [ ] Design evaluation_data schema
- [ ] Create database migration
- [ ] Write extraction prompt for evaluations
- [ ] Build Inngest function for evaluation extraction
- [ ] Build recommendation → IEP linking algorithm
- [ ] Update child analytics API to include evaluation data
- [ ] Build evaluation → IEP comparison view
- [ ] Test with real evaluations

### Phase 4: Advanced Analytics (Long-Term)

- [ ] Add goal linking system (parent_goal_id)
- [ ] Build goal achievement prediction model
- [ ] Build service effectiveness analysis
- [ ] Build compliance risk scoring
- [ ] Implement multi-child family analytics

---

## Technical Specifications

### API Route

**Path:** `/api/children/[childId]/analytics`

**Method:** GET

**Auth:** Bearer token (user must own child)

**Query Params:**
- `limit` - Number of IEPs to include in timeline (default: 5, max: 20)
- `includeValidation` - Include validation issues (default: true)
- `compareMode` - 'latest' | 'all' (default: 'latest')

**Response Time Target:** < 500ms for typical child (5 IEPs)

**Caching Strategy:**
- Cache key: `child:${childId}:analytics`
- TTL: 5 minutes
- Invalidate on: document upload, document update, extraction completion

### Error Handling

**Error Codes:**
- `CHILD_NOT_FOUND` - Child ID doesn't exist or user doesn't own
- `NO_IEPS_FOUND` - Child has no IEP documents
- `EXTRACTION_PENDING` - IEPs exist but not yet extracted
- `INTERNAL_ERROR` - Unexpected error during processing

**Partial Data Handling:**
- If some IEPs lack extractions, include them with `extractionPending: true`
- If validation query fails, return analytics without validation section
- Never fail entire request due to partial data issues

### Security

**Row Level Security:**
- Child analytics accessible only to owning user
- Admin users cannot access unless explicitly granted
- Audit log all analytics requests for compliance

**Data Privacy:**
- Never expose child PII in analytics aggregations
- Never log child names or sensitive data
- Support data export for GDPR/CCPA compliance

---

## Success Metrics

### User Engagement

- % of users who view child analytics within first week
- Average time spent on child analytics page
- Feature adoption rate (timeline, comparisons, compliance)

### User Value

- NPS score before/after child analytics launch
- User feedback: "This helped me understand my child's IEP" (1-5 scale)
- Support ticket reduction related to IEP questions

### Technical Performance

- API response time (target: < 500ms p95)
- Cache hit rate (target: > 80%)
- Error rate (target: < 0.1%)

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Approve Phase 1 scope** for implementation
3. **Create feature branch** `feature/child-level-analytics`
4. **Implement API route** following this spec
5. **Test with real data** from beta users
6. **Document learnings** for Phases 2-4

---

**Document Version:** 1.0
**Last Updated:** 2026-01-03
**Owner:** Development Team
**Status:** Awaiting Approval
