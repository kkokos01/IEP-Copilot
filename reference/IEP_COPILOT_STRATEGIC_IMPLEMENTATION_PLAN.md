# IEP Copilot: Strategic Implementation Plan
## Passive Intelligence Architecture for Parent Engagement

**Document Purpose:** Synthesize deep research across 4 dimensions to build passive intelligence features that meet validated parent needs, leverage available integrations, and create B2B2C opportunities with professional advocates.

**Research Foundation:**
- Parent Behavioral Reality & Pain Points
- School System Integration Landscape
- Educational Data Standards & Metrics
- IEP Advocate Business Models & Workflows

---

## EXECUTIVE SUMMARY

### The Core Insight

**Parents won't do active tracking. Period.**

Research validation:
- 90% of parenting app users abandon within 25 weeks
- Only 3% use health tracking apps beyond 1 week
- Parents experience "combat-level stress" managing IEP processes
- #1 parent request: "Don't give me more to do"

**But parents WILL:**
- ✅ Forward emails they already receive (zero marginal effort)
- ✅ Upload homework photos (they already see it daily)
- ✅ Connect Google Classroom (one-time, 2-minute setup)
- ✅ Read weekly summaries delivered to their inbox
- ✅ Prepare for IEP meetings (high-stakes moments)

### The Opportunity

**B2C Market:**
- 7.5M students with IEPs
- 750K families actively seeking help
- Current solutions: Hire advocate ($1,500-3,000 per case) or struggle alone

**B2B Market:**
- 6,000-10,000 professional advocates
- Charging $150-300/hour
- Spending 4-8 hours per case on document review (highly automatable)
- No specialized case management tools exist
- Willing to pay $149-299/month for tools that save 2+ hours per case

**B2B2C Model:**
- Advocates become distribution channel to parents
- Advocates refer/white-label tool to clients
- Network effects: Advocate directory creates marketplace
- Revenue: SaaS (advocates) + subscriptions (parents) + enterprise (districts)

### Strategic Recommendation

**Phase 1 (Months 1-6): Build for Advocates First**
- Product-market fit is clearer: They'll pay for time savings
- Easier to reach: COPAA, professional networks, conferences
- They validate B2C features: Won't recommend tools parents won't use
- They become distribution channel: Trusted referral to parents

**Phase 2 (Months 6-12): Passive Intelligence for Parents**
- Email-to-analyze (core killer feature)
- Google Classroom integration (24% market, excellent API)
- Weekly AI-generated insights (not daily logging)
- Validated by advocate partners before broad launch

**Phase 3 (Months 12-18): Network Effects & Scale**
- Advocate referral marketplace
- Parent community (critical mass required)
- Canvas integration (28% market)
- Professional referral network (therapists, evaluators, attorneys)

**Phase 4 (Months 18-24): Enterprise & Advanced Features**
- School district partnerships (reduce due process costs)
- PowerSchool/SIS integrations (harder, require admin approval)
- Advanced analytics and benchmarking
- International expansion

---

## PART 1: WHAT PARENTS WANT (AND WON'T DO)

### Research Findings: Parent Behavioral Reality

#### Pain Points (Ranked by Intensity)

**1. Overwhelm & Information Overload** ⚠️ CRITICAL
- "Combat-level stress" managing IEP processes
- 58% report burnout
- Can't keep track of scattered emails, documents, dates
- Don't understand educational jargon or evaluation results

**2. Lack of Data to Advocate Effectively**
- Schools say "making adequate progress" - parents have no counter-evidence
- Gut feeling child struggling, but can't quantify it
- No longitudinal view of whether interventions working
- Can't afford $1,500-3,000 for professional advocate

**3. Fear & Power Imbalance**
- Intimidated by school team (8 professionals vs. 1-2 parents)
- Fear retaliation if they push back
- Don't know their legal rights under IDEA
- Emotional exhaustion from fighting for child

**4. Privacy & Trust Concerns**
- 84% concerned about student data sharing
- Worried schools will access their private notes
- Don't trust "free" apps (selling data)
- Want control over who sees their child's information

**5. Time Poverty**
- Already juggling work, therapies, childcare, household
- 90% abandon apps within 25 weeks (no sustained engagement)
- Desktop-only tools don't work (need mobile)
- Can't commit to daily data entry

#### What Parents WILL Do

**HIGH EFFORT (Once or Twice a Year):**
- ✅ Upload IEP document when received
- ✅ Prepare extensively for IEP meetings (high stakes)
- ✅ Seek peer support in crisis moments
- ✅ Hire advocate if they can afford it
- ✅ Attend school meetings
- ✅ Research their child's disability

**MEDIUM EFFORT (Monthly):**
- ✅ Upload progress reports when received
- ✅ Read monthly summary emails
- ✅ Review school portal grades (if already using)
- ✅ Upload evaluation reports

**LOW EFFORT (Weekly):**
- ✅ Forward emails from teachers
- ✅ Upload homework photo (they see it daily anyway)
- ✅ Read weekly insight emails
- ✅ Click "yes/no" to simple questions

**ZERO EFFORT (Passive):**
- ✅ Auto-sync from Google Classroom (one-time setup)
- ✅ Auto-forward rules for school emails
- ✅ Receive AI-generated insights

#### What Parents WON'T Do

**❌ WILL NOT:**
- Daily journaling or progress logging
- Download native mobile apps (web only unless compelling reason)
- Pay upfront before seeing value (freemium required)
- Use desktop-first interfaces (mobile is primary)
- Manually enter data that could be automated
- Learn complex software (must be intuitive)
- Trust apps that aren't FERPA compliant
- Share data with schools unless they control it

### Design Principles from Research

**1. Passive by Default, Active by Choice**
- Core features require zero ongoing effort
- Optional features for engaged parents (journal, evidence collection)
- Never require manual entry for value delivery

**2. Mobile-First, But Not App-Required**
- Responsive web app (not native app download barrier)
- Email-based workflows (universal, no login required)
- SMS notifications (optional, high open rates)

**3. Privacy as Core Feature, Not Compliance Checkbox**
- Parent controls all data sharing
- Clear opt-in for any school/advocate access
- Transparent about what AI sees
- FERPA compliance prominently displayed

**4. Deliver Value Before Asking for Work**
- Free tier: Upload IEP → Get AI analysis (instant value)
- Week 1: Auto-analysis of existing documents
- Week 2-4: Weekly insights from passive data
- Month 2+: Ask for optional active engagement

**5. Piggyback on Existing Behaviors**
- Parents already check homework → Just take photo
- Parents already receive teacher emails → Just forward
- Parents already use Google Classroom → Just connect
- Parents already prepare for IEP meetings → Provide prep tools

---

## PART 2: INTEGRATION ROADMAP

### Research Findings: School System Ecosystem

#### Integration Complexity vs. Market Share Matrix

| Platform | Market Share | Integration Difficulty | API Quality | Priority |
|----------|--------------|----------------------|-------------|----------|
| **Google Classroom** | 24% K-12 | EASY | Excellent | **P0 (Month 6)** |
| **Canvas LMS** | 28% K-12 | EASY | Excellent | **P1 (Month 9)** |
| **Schoology** | 7% K-12 | MEDIUM | Good | P2 (Month 12) |
| **PowerSchool SIS** | 23% | MEDIUM-HARD | Good | P2 (Month 12) |
| **Infinite Campus** | 22% | MEDIUM-HARD | Fair | P3 (Month 15) |
| **Clever (Aggregator)** | 50%+ districts | MEDIUM | Excellent | **P1 (Month 9)** |
| **ClassLink (Aggregator)** | 25% districts | MEDIUM | Good | P2 (Month 12) |
| **ClassDojo** | 50% elem | **NO API** | N/A | ❌ Not possible |
| **Seesaw** | 25% elem | **NO API** | N/A | ❌ Not possible |

#### Phase 1: Email-to-Analyze (Month 6) - PRIORITY 0

**Why First:**
- Works with ANY school system (universal)
- Zero integration complexity
- Immediate value to parents
- Validates AI analysis pipeline
- Platform-agnostic (competitive moat)

**Technical Implementation:**
```typescript
// Unique email per child: homework@emma-smith.iepcopilot.com
// Powered by: AWS SES, SendGrid, or Cloudflare Email Routing

interface InboundEmail {
  from: string;           // parent@gmail.com
  to: string;             // homework@emma-smith.iepcopilot.com
  subject: string;
  body: string;
  attachments: Attachment[];
  receivedAt: Date;
}

interface Attachment {
  filename: string;
  mimeType: string;      // image/jpeg, application/pdf
  url: string;           // Temporary signed URL
  size: number;
}

// Inngest workflow
export const processInboundEmail = inngest.createFunction(
  { id: "process-inbound-email" },
  { event: "email.received" },
  async ({ event, step }) => {
    // Extract child_id from email address
    const childId = extractChildId(event.data.to); // "emma-smith" → UUID lookup

    // Step 1: OCR images, extract PDF text
    const content = await step.run("extract-content", async () => {
      return await extractAllAttachments(event.data.attachments);
    });

    // Step 2: Classify content type
    const classified = await step.run("classify-content", async () => {
      return await classifyWithClaude({
        content,
        types: ["homework", "test", "essay", "report_card", "progress_report", "teacher_note"]
      });
    });

    // Step 3: Match to IEP goals
    const matched = await step.run("match-goals", async () => {
      const iep = await getLatestIEP(childId);
      return await matchToGoals(classified, iep.goals);
    });

    // Step 4: Analyze performance
    const analysis = await step.run("analyze-performance", async () => {
      return await analyzeAgainstGoals({
        content: classified,
        matchedGoals: matched,
        historicalData: await getHistoricalAnalyses(childId)
      });
    });

    // Step 5: Save to database
    await step.run("save-analysis", async () => {
      await supabase.from('homework_analyses').insert({
        child_id: childId,
        email_id: event.data.messageId,
        content_type: classified.type,
        subject_area: classified.subject,
        raw_content: content.text,
        extracted_data: content.structured,
        matched_goal_paths: matched.map(m => m.goalPath),
        grade_level_estimate: analysis.gradeLevel,
        accuracy_score: analysis.accuracy,
        analysis: analysis.details,
        insight: analysis.insight,
        recommendations: analysis.recommendations
      });
    });

    // Step 6: Notify parent (immediate for tests/notes, batched for homework)
    if (classified.type === 'test' || classified.type === 'teacher_note') {
      await step.run("notify-parent-immediate", async () => {
        await sendEmail({
          to: event.data.from,
          subject: `📊 Analysis: ${classified.type}`,
          body: formatInsightEmail(analysis)
        });
      });
    } else {
      // Batch into weekly summary
      await step.run("queue-for-weekly-summary", async () => {
        await queueForWeeklySummary(childId, analysis);
      });
    }
  }
);
```

**Data Extraction Capabilities:**
- Reading worksheets: Lexile level estimation, question type analysis (literal vs. inferential), accuracy by question type
- Math worksheets: Problem type detection (computation vs. word problems), error pattern analysis, grade level alignment
- Writing samples: Word count, sentence structure complexity, grammar error detection, organization assessment
- Tests: Overall score, performance by standard/skill, comparison to class average (if available)
- Teacher notes: Sentiment analysis, concern flagging, positive feedback extraction

**User Experience:**
1. Parent receives email: "Welcome! Your child's homework email is homework@emma-smith.iepcopilot.com"
2. Parent adds to contacts, optionally creates forwarding rule
3. Parent forwards homework photo → Receives insight within 2 hours
4. Weekly summary email: "This week: 3 homework samples analyzed. Reading: On track. Math: Below target (details)."

#### Phase 2: Google Classroom Integration (Month 6-9) - PRIORITY 0

**Why Second:**
- 24% market share (large addressable market)
- OAuth 2.0 flow (industry standard, secure)
- Excellent API documentation
- Rate limits: 1,200 requests/minute (sufficient)
- Free tier: No API costs

**What We Can Access:**
- Assignments (title, description, due date, max points)
- Student submissions (status, attachments, submission history)
- Grades (numeric or text, grading history)
- Teacher feedback (private comments to student)
- Announcements
- Course materials

**Technical Implementation:**
```typescript
// OAuth 2.0 flow
const googleClassroomScopes = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
  'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
  'https://www.googleapis.com/auth/classroom.announcements.readonly'
];

// Database schema
create table school_integrations (
  id uuid primary key,
  child_id uuid references children(id),

  integration_type text not null, -- 'google_classroom', 'canvas', etc.

  -- OAuth credentials (encrypted)
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,

  -- Integration metadata
  connected_at timestamptz default now(),
  last_sync_at timestamptz,
  sync_enabled boolean default true,
  sync_frequency text default 'daily', -- 'realtime', 'hourly', 'daily', 'weekly'

  -- Error tracking
  last_error text,
  error_count int default 0,

  -- User preferences
  notification_preferences jsonb default '{"new_grade": true, "new_assignment": false}'::jsonb
);

create table synced_assignments (
  id uuid primary key,
  child_id uuid references children(id),
  integration_id uuid references school_integrations(id),

  -- Google Classroom IDs
  external_course_id text not null,
  external_assignment_id text not null,

  -- Assignment data
  title text not null,
  description text,
  subject_area text, -- Inferred from course name or AI classification
  due_date timestamptz,
  max_points numeric,

  -- Submission data
  submission_status text, -- 'TURNED_IN', 'RETURNED', 'NEW', 'RECLAIMED_BY_STUDENT'
  submission_date timestamptz,
  grade numeric,
  grade_text text, -- For non-numeric grades
  teacher_feedback text,

  -- Attachments
  submission_attachments jsonb, -- URLs to student's work

  -- Analysis (computed)
  matched_goal_paths text[],
  analysis jsonb,

  -- Metadata
  synced_at timestamptz default now(),
  updated_at timestamptz default now()
);

// Sync job (runs daily or triggered by webhook if available)
export const syncGoogleClassroom = inngest.createFunction(
  { id: "sync-google-classroom" },
  { cron: "0 6 * * *" }, // 6 AM daily
  async ({ step }) => {
    // Get all active Google Classroom integrations
    const integrations = await step.run("get-integrations", async () => {
      return await supabase
        .from('school_integrations')
        .select('*')
        .eq('integration_type', 'google_classroom')
        .eq('sync_enabled', true);
    });

    // Fan out to per-child sync
    for (const integration of integrations.data) {
      await step.sendEvent({
        name: "google-classroom.sync-child",
        data: { integrationId: integration.id, childId: integration.child_id }
      });
    }
  }
);

export const syncGoogleClassroomForChild = inngest.createFunction(
  { id: "sync-google-classroom-child" },
  { event: "google-classroom.sync-child" },
  async ({ event, step }) => {
    const { integrationId, childId } = event.data;

    // Refresh access token if needed
    const integration = await step.run("refresh-token", async () => {
      return await refreshGoogleToken(integrationId);
    });

    // Fetch courses
    const courses = await step.run("fetch-courses", async () => {
      return await googleClassroomAPI.courses.list({
        access_token: integration.access_token,
        studentId: 'me'
      });
    });

    // Fetch coursework for each course
    const coursework = await step.run("fetch-coursework", async () => {
      const allWork = [];
      for (const course of courses) {
        const work = await googleClassroomAPI.courses.courseWork.list({
          courseId: course.id,
          access_token: integration.access_token
        });

        for (const assignment of work.courseWork) {
          // Get student submission
          const submissions = await googleClassroomAPI.courses.courseWork.studentSubmissions.list({
            courseId: course.id,
            courseWorkId: assignment.id,
            userId: 'me',
            access_token: integration.access_token
          });

          allWork.push({
            course,
            assignment,
            submission: submissions.studentSubmissions[0]
          });
        }
      }
      return allWork;
    });

    // Upsert to database
    await step.run("save-coursework", async () => {
      for (const work of coursework) {
        await supabase.from('synced_assignments').upsert({
          child_id: childId,
          integration_id: integrationId,
          external_course_id: work.course.id,
          external_assignment_id: work.assignment.id,
          title: work.assignment.title,
          description: work.assignment.description,
          subject_area: inferSubject(work.course.name),
          due_date: work.assignment.dueDate,
          max_points: work.assignment.maxPoints,
          submission_status: work.submission?.state,
          submission_date: work.submission?.turnedInTimestamp,
          grade: work.submission?.assignedGrade,
          teacher_feedback: work.submission?.privateComment,
          submission_attachments: work.submission?.attachments,
          updated_at: new Date()
        }, { onConflict: 'external_assignment_id' });
      }
    });

    // Analyze new/updated assignments
    const newAssignments = coursework.filter(w => w.submission?.state === 'RETURNED' && w.submission?.assignedGrade);

    for (const work of newAssignments) {
      await step.sendEvent({
        name: "assignment.analyze",
        data: {
          childId,
          assignmentId: work.assignment.id,
          grade: work.submission.assignedGrade,
          maxPoints: work.assignment.maxPoints,
          teacherFeedback: work.submission.privateComment
        }
      });
    }

    // Update last sync time
    await step.run("update-sync-time", async () => {
      await supabase.from('school_integrations')
        .update({ last_sync_at: new Date() })
        .eq('id', integrationId);
    });
  }
);
```

**User Experience:**
1. Parent clicks "Connect Google Classroom"
2. OAuth flow: Google login → Permission approval → Redirect back
3. System syncs assignments (1-2 minutes)
4. Parent sees dashboard: "12 assignments synced. 3 new grades analyzed."
5. Daily sync runs automatically
6. Weekly summary includes Google Classroom insights

**Privacy Considerations:**
- Read-only access (cannot modify assignments or post as student)
- Parent can disconnect anytime
- Clear consent flow explaining what data is accessed
- Option to exclude specific courses from sync

#### Phase 3: Clever Integration (Month 9-12) - PRIORITY 1

**Why Third:**
- Aggregator platform: One integration → Access to 50+ SIS/LMS systems
- 50%+ of K-12 districts use Clever
- Simplifies multi-system support
- OAuth 2.0, well-documented API
- Provides unified data model

**What We Can Access via Clever:**
- Student demographics
- Course enrollments
- Grades and GPA
- Attendance
- Standardized test scores (if district shares)

**What We CANNOT Access:**
- IEP documents (not in Clever's scope)
- Detailed assignment-level data (varies by LMS)
- Teacher comments (not standardized)

**Strategic Value:**
- Complements Google Classroom (different data sets)
- Enables "one-click connect" for districts already using Clever
- Provides grade-level data for progress tracking

**Implementation Considerations:**
- Requires district administrator approval (not parent-initiated)
- Best positioned as B2B feature (district licenses for all IEP families)
- Privacy: District controls what data is shared via Clever

#### Phase 4: Canvas Integration (Month 12-15) - PRIORITY 2

**Why Fourth:**
- 28% K-12 market share (larger than Google Classroom)
- Excellent API (RESTful, well-documented)
- Similar data access to Google Classroom
- Many districts use Canvas for high school

**Technical Implementation:**
- Nearly identical OAuth flow to Google Classroom
- Can reuse most of Google Classroom sync logic
- Different API endpoints but similar data model

**Strategic Decision:**
- Build Google Classroom first to validate parent adoption
- Canvas integration is lower risk after GC success
- Consider: Hire contractor for Canvas integration (well-documented)

#### Phases 5-6: PowerSchool, Infinite Campus, Schoology (Months 15-24) - PRIORITY 3

**Why Later:**
- More complex integrations (admin approval required)
- Smaller incremental market coverage
- Requires B2B sales motion (not self-serve)
- Better to establish platform value first, then district partnerships

**Strategic Approach:**
- Partner with districts already using IEP Copilot
- Pilot with 5-10 forward-thinking districts
- Build case studies demonstrating parent engagement ROI
- Use success stories to sell to other districts

#### Integration Roadmap Timeline

```
Month 6:  ✅ Email-to-analyze (universal, no integration needed)
Month 9:  ✅ Google Classroom OAuth + sync
Month 12: ✅ Clever integration (district partnerships begin)
Month 15: ✅ Canvas integration
Month 18: 🟡 PowerSchool (pilot with 3-5 districts)
Month 21: 🟡 Infinite Campus (if PowerSchool pilot successful)
Month 24: 🟡 Schoology (if demand warrants)

🔴 NEVER: ClassDojo, Seesaw (no API, require screen scraping - avoid)
```

---

## PART 3: DATA ARCHITECTURE

### Required Data Fields (From Research)

#### IEP Document Fields (Already Extracting)

**Student Demographics:**
- Name, DOB, grade level, school, district
- Disability category(ies)
- English Learner status
- Primary language

**PLAAFP (Present Levels of Academic Achievement and Functional Performance):**
- Academic strengths and needs
- Functional strengths and needs
- How disability affects progress in general curriculum
- Baseline data for each area of concern
- Recent evaluation summaries

**Goals:**
```typescript
interface IEPGoal {
  id: string; // UUID
  goalPath: string; // JSON path for versioning

  // Core components
  category: 'academic' | 'functional' | 'behavioral' | 'transition';
  domain: string; // e.g., 'Reading Comprehension', 'Social Skills', 'Math Calculation'

  description: string; // Full goal text
  measurable: boolean; // Validator: Does goal include measurable criteria?

  // Measurement
  baseline: {
    value: string | number;
    date: Date;
    assessmentMethod: string;
    evidence?: FieldWithEvidence<string>; // Source in IEP document
  };

  target: {
    value: string | number;
    date: Date; // Target achievement date
    criteria: string; // e.g., "80% accuracy over 3 consecutive trials"
  };

  // Progress monitoring
  progressMonitoring: {
    method: string; // e.g., "CBM probes", "teacher observation", "rubric"
    frequency: string; // e.g., "weekly", "monthly", "quarterly"
    reportingSchedule: string; // e.g., "quarterly progress reports"
  };

  // Metadata
  annualGoal: boolean; // vs. short-term objective
  parentGoal: boolean; // Parent-suggested goal
  alignedStandards?: string[]; // State standards alignment
}
```

**Services:**
```typescript
interface IEPService {
  id: string;
  servicePath: string;

  serviceType: string; // e.g., "Special Education Teacher Support", "Speech-Language Therapy"

  frequency: {
    amount: number;
    unit: 'minutes' | 'hours' | 'sessions';
    per: 'day' | 'week' | 'month' | 'year';
  };

  duration: {
    amount: number;
    unit: 'minutes' | 'hours';
  };

  location: 'general_education_classroom' | 'special_education_classroom' | 'separate_location' | 'other';
  locationDetails?: string;

  startDate: Date;
  anticipatedEndDate: Date;

  provider: string; // Title, not name

  relatedGoals: string[]; // IEPGoal IDs this service supports
}
```

**Accommodations & Modifications:**
```typescript
interface Accommodation {
  id: string;
  type: 'presentation' | 'response' | 'setting' | 'timing_scheduling';
  description: string;
  applies_to: 'classroom' | 'testing' | 'both';
  frequency: 'daily' | 'as_needed' | 'during_tests_only';
}
```

**Dates:**
- IEP start date, end date
- Annual review date
- Triennial evaluation due date
- Next progress report date
- Meeting history

#### NEW: Progress Tracking Fields

**Homework Analyses:**
```sql
create table homework_analyses (
  id uuid primary key,
  child_id uuid references children(id),

  -- Source
  source_type text not null check (source_type in ('email', 'upload', 'google_classroom', 'canvas')),
  source_id text, -- Email message ID, assignment external ID, etc.

  -- Content
  content_type text not null check (content_type in (
    'homework', 'classwork', 'test', 'quiz', 'essay',
    'report_card', 'progress_report', 'teacher_note', 'other'
  )),
  subject_area text, -- 'reading', 'math', 'writing', 'science', 'social_studies', etc.

  raw_content text, -- OCR output or extracted text
  extracted_data jsonb, -- Structured extraction (questions, answers, scores)

  -- Analysis
  matched_goal_paths text[], -- ['/goals/0', '/goals/2']

  grade_level_estimate numeric, -- e.g., 3.5 (estimated using Lexile, NAEP, etc.)
  accuracy_score numeric, -- e.g., 0.85 (85% correct)

  performance_by_skill jsonb, -- { "literal_comprehension": 0.90, "inference": 0.70, "vocabulary": 0.80 }

  -- AI insights
  analysis jsonb, -- Full Claude analysis output
  insight text, -- Human-readable summary
  recommendations text[], -- Actionable suggestions

  -- Flags
  concerning boolean default false, -- AI flags significant regression or issue
  notable_progress boolean default false, -- AI flags significant improvement

  -- Metadata
  assignment_date date,
  analyzed_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Index for performance
create index idx_homework_child_date on homework_analyses(child_id, assignment_date desc);
create index idx_homework_goals on homework_analyses using gin(matched_goal_paths);
```

**Progress Snapshots (Aggregated):**
```sql
create table goal_progress_snapshots (
  id uuid primary key,
  child_id uuid references children(id),
  goal_path text not null,

  -- Time period
  snapshot_date date not null default current_date,
  snapshot_period text not null check (snapshot_period in ('weekly', 'monthly', 'quarterly', 'annual')),

  -- Computed metrics
  estimated_level numeric, -- Current grade level or performance level
  accuracy_rate numeric, -- Average accuracy across samples in period
  sample_count int not null, -- Number of homework/assessments in period

  -- Comparison to target
  baseline_value numeric, -- From IEP goal
  target_value numeric, -- From IEP goal
  current_value numeric, -- Computed from recent data
  percent_to_target numeric, -- (current - baseline) / (target - baseline)

  -- Trend analysis
  trend text check (trend in ('improving', 'stable', 'regressing')),
  trend_confidence numeric, -- 0.0-1.0, based on sample size and variance

  -- Insights
  ai_summary text,
  flags text[], -- ['below_target', 'ahead_of_schedule', 'inconsistent_performance']

  -- Metadata
  computed_at timestamptz default now()
);

-- Unique constraint: one snapshot per goal per period
create unique index idx_goal_snapshot_unique on goal_progress_snapshots(child_id, goal_path, snapshot_date, snapshot_period);
```

**Weekly Summaries:**
```sql
create table weekly_summaries (
  id uuid primary key,
  child_id uuid references children(id),

  week_start_date date not null,
  week_end_date date not null,

  -- Data summary
  homework_count int default 0,
  google_classroom_count int default 0,
  teacher_email_count int default 0,

  -- Progress highlights
  goals_on_track int default 0,
  goals_below_target int default 0,
  goals_ahead_of_schedule int default 0,

  -- AI-generated content
  summary text not null, -- "This week, Emma completed 3 reading assignments..."
  highlights text[], -- ["Strong progress on inference questions", "Math word problems improving"]
  concerns text[], -- ["Writing: Sentence structure remains below grade level"]
  recommendations text[], -- ["Consider requesting additional writing support"]

  -- Delivery
  email_sent_at timestamptz,
  email_opened_at timestamptz,
  parent_feedback text, -- Optional: parent can reply with comments

  created_at timestamptz default now()
);

create index idx_weekly_summary_child on weekly_summaries(child_id, week_start_date desc);
```

#### NEW: Academic Framework Data

**Reading Level Frameworks:**
```typescript
interface ReadingLevelEstimate {
  framework: 'lexile' | 'guided_reading' | 'dra' | 'grade_equivalent';

  lexile?: {
    score: number; // e.g., 450L
    range: { min: number; max: number }; // Confidence interval
    gradeEquivalent: number; // e.g., 3.5
  };

  guidedReading?: {
    level: string; // A-Z
    gradeRange: string; // e.g., "Grades 3-4"
  };

  dra?: {
    level: number; // 1-80
    gradeEquivalent: number;
  };

  confidence: number; // 0.0-1.0
  assessmentMethod: string; // "AI analysis of reading comprehension worksheet"
  assessmentDate: Date;
}
```

**Math Proficiency Frameworks:**
```typescript
interface MathProficiencyEstimate {
  framework: 'naep' | 'ccss_grade_level' | 'map_growth';

  naep?: {
    proficiencyLevel: 'below_basic' | 'basic' | 'proficient' | 'advanced';
    gradeLevel: number;
  };

  ccss?: {
    gradeLevel: number; // e.g., 3.5
    domainProficiency: {
      domain: string; // e.g., "Operations and Algebraic Thinking"
      proficiency: number; // 0.0-1.0
    }[];
  };

  confidence: number;
  assessmentMethod: string;
  assessmentDate: Date;
}
```

**Writing Assessment:**
```typescript
interface WritingAssessment {
  framework: 'six_traits' | 'lucy_calkins' | 'grade_level';

  sixTraits?: {
    ideas: number; // 1-5
    organization: number;
    voice: number;
    wordChoice: number;
    sentenceFluency: number;
    conventions: number;
  };

  lucyCalkins?: {
    onDemandLevel: string; // e.g., "Grade 3"
    checklistProgress: {
      criterion: string;
      mastered: boolean;
    }[];
  };

  gradeLevel?: {
    estimate: number; // e.g., 2.5
    wordCount: number;
    sentenceCount: number;
    complexSentences: number;
    grammarErrors: number;
  };

  confidence: number;
  assessmentMethod: string;
  assessmentDate: Date;
}
```

---

## PART 4: AI ANALYTICS PIPELINE

### Claude-Powered Analysis Workflow

#### Step 1: Content Extraction & Classification

**Input:** Email attachment or Google Classroom assignment
**Output:** Structured content with metadata

```typescript
// Prompt template for classification
const classificationPrompt = `
You are analyzing student work to determine its type and extract key information.

WORK SAMPLE:
${extractedText}

TASKS:
1. Classify the content type: homework, classwork, test, quiz, essay, report_card, progress_report, teacher_note, other
2. Identify the subject area: reading, math, writing, science, social_studies, other
3. Extract the assignment date (if visible)
4. Determine grade level of the content (if possible)

Respond in JSON:
{
  "contentType": "homework | classwork | test | quiz | essay | report_card | progress_report | teacher_note | other",
  "subjectArea": "reading | math | writing | science | social_studies | other",
  "assignmentDate": "YYYY-MM-DD or null",
  "estimatedGradeLevel": number or null,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of classification"
}
`;

const classification = await callClaude({
  model: "claude-sonnet-4-5",
  messages: [{ role: "user", content: classificationPrompt }],
  temperature: 0.1
});
```

#### Step 2: Goal Matching

**Input:** Classified content + Child's IEP goals
**Output:** Relevant goals for this work sample

```typescript
const goalMatchingPrompt = `
You are matching a student's work sample to their IEP goals.

WORK SAMPLE:
Type: ${classification.contentType}
Subject: ${classification.subjectArea}
Content: ${extractedText}

STUDENT'S IEP GOALS:
${JSON.stringify(iepGoals, null, 2)}

TASK:
Identify which IEP goals are relevant to this work sample. A goal is relevant if:
1. The work sample demonstrates skills related to the goal's domain
2. Performance on this work could indicate progress toward the goal
3. The subject areas align

For each relevant goal, provide:
- Goal ID
- Relevance score (0.0-1.0)
- Specific aspects of the work sample that relate to the goal

Respond in JSON:
{
  "matches": [
    {
      "goalId": "uuid",
      "goalPath": "/goals/0",
      "relevanceScore": 0.0-1.0,
      "reasoning": "How this work relates to the goal",
      "assessableSkills": ["skill1", "skill2"]
    }
  ]
}
`;
```

#### Step 3: Performance Analysis

**Input:** Work sample + Matched goals + Historical data
**Output:** Detailed performance assessment

```typescript
// For reading comprehension
const readingAnalysisPrompt = `
You are a special education expert analyzing a student's reading comprehension work.

STUDENT'S IEP GOAL:
${matchedGoal.description}
Baseline: ${matchedGoal.baseline.value} (${matchedGoal.baseline.date})
Target: ${matchedGoal.target.value} by ${matchedGoal.target.date}

WORK SAMPLE:
${extractedText}

HISTORICAL PERFORMANCE (last 8 weeks):
${JSON.stringify(historicalData, null, 2)}

TASKS:
1. Estimate the reading level of this text using Lexile framework
2. Analyze the questions and student responses
3. Calculate accuracy by question type (literal, inferential, critical)
4. Estimate current performance level
5. Compare to baseline and target
6. Assess progress trend
7. Provide specific, actionable recommendations

Respond in JSON following this schema:
{
  "readingLevel": {
    "lexileScore": number,
    "lexileRange": { "min": number, "max": number },
    "gradeEquivalent": number,
    "confidence": 0.0-1.0
  },
  "performance": {
    "overallAccuracy": 0.0-1.0,
    "byQuestionType": {
      "literal": 0.0-1.0,
      "inferential": 0.0-1.0,
      "critical": 0.0-1.0,
      "vocabulary": 0.0-1.0
    },
    "questionsCorrect": number,
    "questionsTotal": number
  },
  "progressAssessment": {
    "currentLevel": number, // e.g., 3.5 grade level
    "baselineLevel": number,
    "targetLevel": number,
    "percentToTarget": number, // 0.0-1.0
    "trend": "improving | stable | regressing",
    "trendConfidence": 0.0-1.0,
    "onTrack": boolean
  },
  "insights": {
    "strengths": ["strength1", "strength2"],
    "growthAreas": ["area1", "area2"],
    "patterns": ["pattern1", "pattern2"]
  },
  "recommendations": [
    {
      "recommendation": "Specific action",
      "rationale": "Why this would help",
      "priority": "high | medium | low"
    }
  ],
  "parentSummary": "2-3 sentence summary in plain language for parent email"
}
`;

// For math
const mathAnalysisPrompt = `
You are a special education expert analyzing a student's math work.

STUDENT'S IEP GOAL:
${matchedGoal.description}
Baseline: ${matchedGoal.baseline.value}
Target: ${matchedGoal.target.value}

WORK SAMPLE:
${extractedText}

TASKS:
1. Identify problem types (computation, word problems, multi-step, etc.)
2. Calculate accuracy by problem type
3. Identify error patterns
4. Estimate grade level proficiency
5. Compare to IEP goal baseline and target
6. Provide recommendations

[Similar JSON structure as reading]
`;

// For writing
const writingAnalysisPrompt = `
You are a special education expert analyzing a student's writing sample.

STUDENT'S IEP GOAL:
${matchedGoal.description}

WRITING SAMPLE:
${extractedText}

TASKS:
1. Count words, sentences, paragraphs
2. Assess organization (introduction, body, conclusion)
3. Evaluate sentence complexity and variety
4. Identify grammar, spelling, punctuation errors
5. Estimate grade level using appropriate framework
6. Compare to IEP goal criteria
7. Provide specific writing instruction recommendations

[Detailed writing analysis JSON structure]
`;
```

#### Step 4: Insight Generation

**Input:** Analysis results + Context
**Output:** Parent-friendly insights

```typescript
const insightPrompt = `
You are generating a weekly progress summary for a parent of a child with an IEP.

CHILD: ${childName}, Grade ${gradeLevel}

THIS WEEK'S DATA:
- ${homeworkCount} homework samples analyzed
- ${googleClassroomCount} Google Classroom assignments synced
- ${teacherEmailCount} teacher emails received

ANALYSIS RESULTS:
${JSON.stringify(weeklyAnalyses, null, 2)}

IEP GOALS PROGRESS:
${JSON.stringify(goalProgressSnapshots, null, 2)}

PARENT PROFILE:
- Primary language: ${primaryLanguage}
- Reading level preference: ${readingLevel} // "technical" vs "plain language"
- Notification preferences: ${notificationPrefs}

TASKS:
1. Write a warm, supportive weekly summary (3-4 paragraphs)
2. Highlight 2-3 specific wins or progress moments
3. Flag 1-2 areas of concern (if any) with specific evidence
4. Provide 1-2 actionable recommendations
5. Use plain language, avoid jargon
6. Be specific with data, but not overwhelming
7. Balance honesty about challenges with hope and empowerment

TONE:
- Supportive and empowering (you're the expert on your child)
- Data-driven but accessible
- Honest about concerns but solution-focused
- Celebrate progress genuinely

OUTPUT FORMAT:
{
  "emailSubject": "Concise, positive subject line",
  "summary": "3-4 paragraph main content",
  "highlights": ["specific positive moment 1", "specific positive moment 2"],
  "concerns": ["specific concern with data" or []],
  "recommendations": [
    {
      "action": "Specific recommendation",
      "why": "Rationale in plain language",
      "priority": "high | medium | low"
    }
  ],
  "dataSnapshot": {
    "goalsOnTrack": number,
    "goalsBelowTarget": number,
    "goalsAheadOfSchedule": number
  }
}
`;

const insight = await callClaude({
  model: "claude-sonnet-4-5",
  messages: [{ role: "user", content: insightPrompt }],
  temperature: 0.7 // Slightly higher for more natural language
});
```

#### Step 5: Alert Detection

**Automated flags for immediate parent notification:**

```typescript
interface AlertRule {
  id: string;
  name: string;
  condition: (data: AnalysisData) => boolean;
  severity: 'critical' | 'warning' | 'info';
  message: (data: AnalysisData) => string;
}

const alertRules: AlertRule[] = [
  {
    id: 'regression-detected',
    name: 'Performance Regression',
    condition: (data) => {
      // Trigger if current performance drops >15% from recent average
      const recentAvg = calculateRecentAverage(data.historical, weeks = 4);
      return data.current.accuracy < recentAvg * 0.85;
    },
    severity: 'warning',
    message: (data) =>
      `${data.goal.domain}: Performance dropped to ${data.current.accuracy}% ` +
      `(down from recent average of ${calculateRecentAverage(data.historical)}%). ` +
      `Consider discussing with teacher.`
  },

  {
    id: 'goal-achieved-early',
    name: 'Goal Target Achieved',
    condition: (data) => {
      return data.current.value >= data.goal.target.value &&
             new Date() < new Date(data.goal.target.date);
    },
    severity: 'info',
    message: (data) =>
      `Great news! ${data.child.name} has achieved their ${data.goal.domain} ` +
      `goal ahead of schedule. Consider requesting an updated, more challenging goal ` +
      `at the next IEP meeting.`
  },

  {
    id: 'falling-behind-target',
    name: 'Below Target Trajectory',
    condition: (data) => {
      const monthsRemaining = monthsBetween(new Date(), data.goal.target.date);
      const progressNeeded = (data.goal.target.value - data.current.value) / monthsRemaining;
      const recentProgress = calculateMonthlyProgressRate(data.historical);
      return recentProgress < progressNeeded * 0.5; // Less than half the needed rate
    },
    severity: 'warning',
    message: (data) =>
      `${data.goal.domain}: At current pace, ${data.child.name} may not reach ` +
      `the goal target by ${formatDate(data.goal.target.date)}. Consider requesting ` +
      `additional support or modified services.`
  },

  {
    id: 'inconsistent-performance',
    name: 'High Variability in Performance',
    condition: (data) => {
      const variance = calculateVariance(data.historical.map(h => h.accuracy));
      return variance > 0.15; // Standard deviation > 15%
    },
    severity: 'info',
    message: (data) =>
      `${data.goal.domain}: Performance varies significantly week-to-week. ` +
      `This could indicate inconsistent support, test anxiety, or environmental factors. ` +
      `Consider tracking patterns (time of day, specific topics, etc.).`
  },

  {
    id: 'teacher-concern-mentioned',
    name: 'Teacher Expressed Concern',
    condition: (data) => {
      // AI sentiment analysis of teacher feedback
      return data.teacherFeedback &&
             analyzeSentiment(data.teacherFeedback).concernLevel > 0.7;
    },
    severity: 'warning',
    message: (data) =>
      `Teacher note received expressing concern about ${data.goal.domain}. ` +
      `Feedback: "${data.teacherFeedback}". Consider scheduling a meeting to discuss support strategies.`
  }
];

// Run alert detection
const alerts = alertRules
  .filter(rule => rule.condition(analysisData))
  .map(rule => ({
    id: rule.id,
    severity: rule.severity,
    message: rule.message(analysisData),
    generatedAt: new Date()
  }));

// Send immediate notification for critical/warning alerts
if (alerts.some(a => a.severity in ['critical', 'warning'])) {
  await sendImmediateAlert(parent.email, alerts);
}
```

---

## PART 5: PROFESSIONAL USE CASES (B2B)

### Advocate Value Proposition

**Pain Points We Solve:**

1. **Document Review (4-8 hours → 30 minutes)**
   - Upload IEP → Get AI-powered compliance analysis
   - Automatic comparison to previous IEPs
   - Flag missing components, inadequate goals, service gaps
   - Generate review checklist

2. **Progress Monitoring (Ongoing burden → Automated)**
   - Access parent's homework analyses
   - Real-time data on goal progress
   - Evidence collection for annual review
   - Trend analysis and alerts

3. **Meeting Preparation (3-5 hours → 1-2 hours)**
   - Auto-generated meeting prep packet
   - Data-driven questions based on analysis
   - Progress charts and visualizations
   - Recommended goal revisions

4. **Client Communication (Time sink → Streamlined)**
   - Shared portal with parents
   - Automated progress summaries
   - Document sharing and collaboration
   - Secure messaging

5. **Research & Knowledge Base (2-4 hours → Minutes)**
   - Searchable case law database
   - Accommodation idea library
   - Sample IEP language
   - Disability-specific strategies

### Advocate Feature Set

```typescript
// Database schema for advocate features

create table advocates (
  id uuid primary key,
  user_id uuid references auth.users(id),

  -- Profile
  business_name text,
  credentials text[], -- ['COPAA SEAT', 'NSEAI BCEA']
  specializations text[], -- ['Autism', 'Dyslexia', 'ADHD']
  bio text,

  -- Contact
  phone text,
  email text not null,
  website text,

  -- Service area
  states_licensed text[],
  service_radius_miles int,
  accepts_virtual_clients boolean default true,

  -- Business
  hourly_rate numeric,
  accepts_new_clients boolean default true,

  -- Directory
  listed_in_directory boolean default false,
  directory_profile jsonb,

  created_at timestamptz default now()
);

create table advocate_client_relationships (
  id uuid primary key,
  advocate_id uuid references advocates(id),
  child_id uuid references children(id),
  parent_user_id uuid references auth.users(id),

  -- Relationship
  status text check (status in ('invited', 'active', 'paused', 'ended')),
  relationship_type text check (relationship_type in ('full_representation', 'consultation', 'document_review')),

  -- Permissions
  can_view_iep boolean default true,
  can_view_homework_analyses boolean default true,
  can_view_progress_data boolean default true,
  can_edit_notes boolean default true,
  can_communicate_with_parent boolean default true,

  -- Dates
  relationship_started_at timestamptz default now(),
  relationship_ended_at timestamptz,

  -- Billing (optional integration)
  billing_arrangement text, -- 'hourly', 'flat_fee', 'retainer'

  created_at timestamptz default now()
);

create table advocate_case_notes (
  id uuid primary key,
  advocate_id uuid references advocates(id),
  child_id uuid references children(id),

  note_type text check (note_type in ('general', 'meeting_notes', 'phone_call', 'email_summary', 'analysis', 'strategy')),

  title text,
  content text not null,

  -- Privacy
  visible_to_parent boolean default false, // Advocate can choose to share or keep private

  -- Tagging
  tags text[],
  related_goals text[], -- goal paths

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table advocate_tasks (
  id uuid primary key,
  advocate_id uuid references advocates(id),
  child_id uuid references children(id),

  task_type text check (task_type in ('document_review', 'meeting_prep', 'follow_up', 'research', 'parent_communication', 'other')),

  title text not null,
  description text,

  due_date date,
  priority text check (priority in ('low', 'medium', 'high', 'urgent')),
  status text check (status in ('todo', 'in_progress', 'completed', 'cancelled')) default 'todo',

  -- Time tracking (optional)
  estimated_hours numeric,
  actual_hours numeric,
  billable boolean default true,

  completed_at timestamptz,
  created_at timestamptz default now()
);
```

### Advocate Workflow Features

**1. AI-Powered IEP Compliance Review**

Upload IEP → Get instant analysis:
- ✅ All required IDEA components present
- ⚠️ Missing: Transition planning (required for age 16+)
- ⚠️ Goal 2: Not measurable (lacks specific criteria)
- ⚠️ Service hours: Reduced 30% from last year without explanation
- ⚠️ PLAAFP: Baseline data not provided for writing goal
- ✅ Parent concerns documented
- ⚠️ LRE: 80% time in separate setting (potentially not LRE)

**2. Comparison Tool**

Compare current IEP to previous year:
```
Reading Goal:
  Last year: "Improve to 3rd grade level by June 2025"
  This year: "Improve to 4th grade level by June 2026"
  Status: ✅ Goal advanced appropriately

Speech Therapy:
  Last year: 60 minutes/week
  This year: 45 minutes/week
  Status: ⚠️ Service reduced 25% - was PWN provided?

Math Support:
  Last year: 90 minutes/week (special ed teacher)
  This year: 60 minutes/week (paraprofessional support)
  Status: 🔴 ALERT: Service reduced AND provider changed to less qualified
```

**3. Meeting Prep Wizard**

Based on IEP analysis + parent's homework data:

```
📋 IEP ANNUAL REVIEW PREP - Emma Smith (Jan 15, 2026)

🎯 RECOMMENDED AGENDA:

1. Review Current Goal Progress:
   ✅ Reading Goal: ACHIEVED EARLY (target was 4.0, now at 4.5)
      → RECOMMEND: Advance goal to 5th grade level
      → EVIDENCE: 12 homework samples, avg 4.5 grade level

   ⚠️ Math Goal: BELOW TARGET (target 80%, current 40%)
      → RECOMMEND: Request additional support or service increase
      → EVIDENCE: 8 math worksheets, consistent struggle with word problems

   ✅ Writing Goal: ON TRACK (60% to target)
      → RECOMMEND: Continue current services

2. Questions to Ask:

   About Reading:
   • "Emma has exceeded her reading goal. Can we discuss advancing
      her to 5th grade curriculum and updating the goal?"
   • "What accommodations have been most effective in her reading growth?"

   About Math:
   • "The IEP states 90 min/week math support, but progress reports show
      only 60 min/week provided. Can you explain the discrepancy?"
   • "Emma consistently scores 90%+ on computation but 40% on word problems.
      What specific interventions are being used for word problem solving?"
   • "Should we consider an updated math evaluation to identify barriers?"

   About Services:
   • "I notice speech therapy was reduced from 60 to 45 min/week.
      What data supported this reduction?"
   • "Can we review the Prior Written Notice for this change?"

3. Documents to Bring:
   • Homework analysis summary (12 samples)
   • Progress chart showing reading improvement
   • Math worksheet examples showing word problem difficulties
   • Outside tutor's observations (if applicable)

4. Proposed Goal Revisions:
   [AI-generated draft goals based on current performance]

5. Proposed Service Changes:
   • Reading: Maintain current 60 min/week (working well)
   • Math: INCREASE to 120 min/week (not making adequate progress)
   • Writing: Maintain current 45 min/week (on track)
   • Speech: REQUEST data justifying reduction or restore to 60 min/week
```

**4. Parent Collaboration Portal**

Advocate invites parent → Parent accepts → Shared workspace:

```
ADVOCATE VIEW:
- All parent's uploaded documents
- All homework analyses and AI insights
- Progress charts
- Case notes (can choose to share with parent or keep private)
- Shared task list
- Secure messaging

PARENT VIEW:
- Their documents and analyses
- Advocate's shared notes
- Meeting prep materials
- Shared task list (e.g., "Please upload last evaluation report")
- Secure messaging with advocate

COLLABORATION FEATURES:
- Commenting on documents
- Shared meeting notes
- Task assignment ("Parent: Upload report card by Friday")
- Calendar integration (shared IEP meeting dates)
```

**5. Knowledge Base & Templates**

**Accommodation Library:**
Search "reading comprehension, 4th grade, dyslexia" → Get:
- Audiobooks for texts above reading level
- Graphic organizers for main idea/details
- Extended time for reading assignments (1.5x)
- Partner reading with more fluent reader
- Pre-teaching vocabulary
- Text-to-speech software
- Highlighted texts

**Sample IEP Language:**
Search "measurable reading comprehension goal, 4th grade" → Get:
```
"By [date], when given a grade-level fiction or nonfiction passage
(Lexile 600-700L) and related comprehension questions, [Student] will
answer literal and inferential comprehension questions with 80%
accuracy over 3 consecutive trials as measured by curriculum-based
assessments and teacher observation."
```

**Letter Templates:**
- Request for evaluation
- Request for IEP meeting
- Request for independent educational evaluation (IEE)
- Disagreement with IEP
- Request for Prior Written Notice

**Case Law Quick Reference:**
Search "lack of progress" → Get:
- Endrew F. v. Douglas County (2017): FAPE standard
- Relevant quotes and implications
- How to apply to current case

### Advocate Business Features

**1. Time Tracking & Billing**
- Log time per client/task
- Mark as billable/non-billable
- Generate invoices
- Track retainer balance

**2. Client Pipeline**
- Intake form builder
- Lead tracking (inquiry → consultation → contract)
- Automated follow-up emails
- Contract templates

**3. Analytics & Reporting**
- Cases by status
- Time spent by case phase
- Revenue by client
- Common issues identified (inform marketing)

**4. Referral Network**
- Directory of other professionals
- Track referrals sent/received
- Commission/affiliate management (if applicable)

---

## PART 6: GO-TO-MARKET STRATEGY

### Phase 1: Advocate Champion Program (Months 1-6)

**Goal:** 50 advocate beta users, 10 case studies

**Tactics:**
1. **Direct Outreach to Advocate Influencers**
   - Identify top advocates on Twitter/LinkedIn
   - Offer free lifetime access to founding advocates
   - Request 1-hour feedback sessions

2. **COPAA Partnership Development**
   - Attend annual conference (sponsor if budget allows)
   - Present at SEAT training program
   - Offer discounted licenses to COPAA members

3. **Content Marketing**
   - Blog: "How AI Can Save Advocates 10 Hours Per Case"
   - Webinar: "Building a Sustainable Advocacy Practice"
   - Case study: "How [Advocate] Serves 3x More Families with AI"

4. **Product Development**
   - Prioritize advocate feedback
   - Weekly releases based on user requests
   - Build advocate advisory board (5-7 power users)

**Success Metrics:**
- 50 active advocate users
- NPS > 50
- 10+ testimonials/case studies
- 3+ advocates serving 10+ families each on platform

### Phase 2: B2B Growth (Months 6-12)

**Goal:** 200 paying advocates, $300K ARR

**Tactics:**
1. **Referral Program**
   - Advocate refers advocate: Both get $50 credit
   - Tiered rewards: 5 referrals = free month

2. **Professional Association Partnerships**
   - NSEAI: Technology partner for certification program
   - State advocacy orgs: Preferred vendor status
   - The Arc: Chapter licensing deals

3. **Conference Circuit**
   - COPAA Annual Conference (booth + speaking)
   - State special ed conferences
   - Disability-specific org conferences (Autism, LDA, etc.)

4. **Content Scaling**
   - SEO: Rank for "special education advocate software"
   - YouTube: Tutorial series for advocates
   - Podcast: Interview successful advocates

5. **Sales Enablement**
   - 14-day free trial (no credit card)
   - Demo videos and self-service onboarding
   - ROI calculator: "If you serve 4 cases/month at $150/hr
     and save 2 hours per case with our tool, that's $1,200/month
     value for $149/month cost = 8x ROI"

**Success Metrics:**
- 200 paying advocates
- $149 average MRR
- $300K ARR
- 60% adoption of parent referral feature
- 20% MoM growth

### Phase 3: B2B2C Expansion (Months 12-18)

**Goal:** 500 advocates, 1,500 parent users, $800K ARR

**Tactics:**
1. **Advocate Referral Program Launch**
   - Advocates get custom referral link
   - Parents get 20% discount with advocate code
   - Advocates earn $50 per referred parent + $5/month recurring

2. **White-Label Offering**
   - Advocates can brand client portal
   - Custom domain (advocate.yourbrand.com)
   - Co-branded weekly summaries

3. **Parent Marketing (via Advocates)**
   - "How to Prepare for Your IEP Meeting" guide (advocate co-branded)
   - Parent webinar series (advocates as speakers)
   - Facebook groups: Advocates share tool with communities

4. **Freemium Launch**
   - Parents can upload IEP + get free basic analysis
   - Upgrade to Premium for ongoing tracking
   - "Find an Advocate" directory drives advocate-parent connections

**Success Metrics:**
- 500 advocates
- 1,500 parent users (3:1 parent-to-advocate ratio)
- $600K from advocates + $200K from parents = $800K ARR
- 40% of advocates actively referring parents
- 50% of parents came via advocate referral

### Phase 4: Enterprise & Scale (Months 18-24)

**Goal:** 1,000 advocates, 5,000 parents, 10 district pilots, $2.5M ARR

**Tactics:**
1. **School District Partnerships**
   - Value prop: Reduce due process costs, improve parent engagement
   - Pilot pricing: Free for 1 year, then $5-10 per IEP student
   - Start with forward-thinking special ed directors

2. **State Education Agency Relationships**
   - Position as compliance/transparency tool
   - Apply for state innovation grants
   - Case studies showing improved outcomes

3. **Integration Partnerships**
   - PowerSchool, Infinite Campus (SIS integrations)
   - IEP software providers (EasyIEP, Frontline)
   - Therapy platforms (synchronized progress data)

4. **Enterprise Features**
   - District admin dashboard
   - Bulk parent onboarding
   - Data privacy controls
   - SSO integration

5. **Advanced Parent Features**
   - Peer community (moderated forums)
   - AI chatbot for IEP questions
   - Benchmarking (compare to similar students, anonymized)

**Success Metrics:**
- 1,000 paying advocates ($1.2M ARR)
- 5,000 paying parents ($1M ARR)
- 10 district pilots ($300K ARR)
- Total: $2.5M ARR
- 30% gross margin (if using heavy AI processing)

---

## PART 7: TECHNICAL IMPLEMENTATION ROADMAP

### Month 6: Email-to-Analyze (Passive Intelligence Core)

**User Stories:**
1. As a parent, I can email homework photos to a unique address and get AI analysis
2. As a parent, I receive weekly summary emails with insights and recommendations
3. As an advocate, I can view parent's homework analyses and progress data

**Technical Tasks:**

Week 1-2: Email Infrastructure
- Set up inbound email routing (AWS SES or SendGrid)
- Create unique email addresses per child (homework@child-slug.iepcopilot.com)
- Email parsing and attachment extraction
- Store raw emails and attachments in Supabase Storage

Week 3-4: Content Extraction
- Google Document AI integration for OCR
- PDF text extraction (pdf-parse library)
- Image preprocessing (contrast, rotation)
- Text cleanup and normalization

Week 5-6: AI Analysis Pipeline
- Claude prompts for classification (content type, subject)
- Claude prompts for goal matching
- Claude prompts for performance analysis (reading, math, writing)
- Structured output parsing and validation

Week 7-8: Data Storage & Insights
- homework_analyses table implementation
- goal_progress_snapshots aggregation logic
- Weekly summary generation
- Email delivery (Resend or SendGrid)

**Database Migrations:**
```sql
-- Week 1
create table email_inbox (
  id uuid primary key,
  child_id uuid references children(id),

  message_id text unique not null,
  from_address text not null,
  to_address text not null,
  subject text,
  body_text text,
  body_html text,

  attachments jsonb default '[]'::jsonb,

  processed boolean default false,
  processed_at timestamptz,

  received_at timestamptz not null,
  created_at timestamptz default now()
);

-- Week 5
create table homework_analyses (
  -- [Schema from PART 3]
);

-- Week 7
create table goal_progress_snapshots (
  -- [Schema from PART 3]
);

create table weekly_summaries (
  -- [Schema from PART 3]
);
```

**Inngest Functions:**
```typescript
// email.received → process-inbound-email
// process-inbound-email → extract-content, classify-content, match-goals, analyze-performance, save-analysis, notify-parent

// Weekly cron → generate-weekly-summaries
// generate-weekly-summaries → fan-out per child → compile-week-data, generate-summary, send-email
```

### Month 9: Google Classroom Integration

**User Stories:**
1. As a parent, I can connect my Google account to sync my child's assignments
2. As a parent, I see Google Classroom assignments on my dashboard
3. As a parent, new grades trigger automatic analysis

**Technical Tasks:**

Week 1-2: OAuth Implementation
- Google OAuth 2.0 flow (consent screen, redirect handling)
- Token storage (encrypted) in school_integrations table
- Token refresh logic
- Disconnect/revoke functionality

Week 3-4: Google Classroom API Integration
- Fetch courses
- Fetch course work (assignments)
- Fetch student submissions
- Fetch grades and feedback
- Rate limiting and error handling

Week 5-6: Sync Logic
- Daily sync cron job
- Incremental sync (only new/updated since last sync)
- synced_assignments table upserts
- Trigger analysis for newly graded assignments

Week 7-8: UI & Notifications
- "Connect Google Classroom" button in settings
- Dashboard showing synced assignments
- Email notifications for new grades
- Sync status indicators

**API Integration:**
```typescript
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// After OAuth callback
oauth2Client.setCredentials({
  access_token: tokens.access_token,
  refresh_token: tokens.refresh_token,
  expiry_date: tokens.expiry_date
});

const classroom = google.classroom({ version: 'v1', auth: oauth2Client });

// Fetch courses
const courses = await classroom.courses.list({ studentId: 'me' });

// Fetch coursework
for (const course of courses.data.courses) {
  const courseWork = await classroom.courses.courseWork.list({
    courseId: course.id
  });

  // Fetch submissions
  for (const assignment of courseWork.data.courseWork) {
    const submissions = await classroom.courses.courseWork.studentSubmissions.list({
      courseId: course.id,
      courseWorkId: assignment.id,
      userId: 'me'
    });

    // Process and store
  }
}
```

### Month 12: Advocate Portal (B2B Launch)

**User Stories:**
1. As an advocate, I can create an account and profile
2. As an advocate, I can invite parents to share their IEP data with me
3. As an advocate, I can view client's IEP, homework analyses, and progress
4. As an advocate, I can add private case notes
5. As an advocate, I can generate meeting prep packets

**Technical Tasks:**

Week 1-2: Advocate Schema & Auth
- advocates table
- advocate_client_relationships table
- advocate_case_notes table
- Invitation flow (email with accept/decline)

Week 3-4: Advocate Dashboard
- Client list view
- Client detail view (IEP summary, goals, services)
- Homework analyses timeline
- Progress charts

Week 5-6: IEP Analysis Tools
- Upload IEP → AI compliance review
- IEP comparison tool (year-over-year)
- Highlight changes and concerns

Week 7-8: Meeting Prep Wizard
- Generate agenda based on IEP + progress data
- Suggest questions
- Export prep packet (PDF)

**Permissions & Security:**
```sql
-- Row Level Security policies

-- Advocates can only view clients they have active relationships with
create policy "Advocates can view their clients' data"
  on children
  for select
  using (
    id in (
      select child_id
      from advocate_client_relationships
      where advocate_id = (select id from advocates where user_id = auth.uid())
      and status = 'active'
      and can_view_iep = true
    )
  );

-- Parents must approve advocate access
create policy "Parents control advocate access"
  on advocate_client_relationships
  for update
  using (
    parent_user_id = auth.uid()
  );
```

### Month 15: Canvas Integration

**User Stories:**
1. As a parent, I can connect Canvas (similar to Google Classroom)

**Technical Tasks:**
- Reuse Google Classroom sync architecture
- Canvas API OAuth flow
- Canvas-specific endpoint mappings
- Unified synced_assignments table

**Timeline:** 4-6 weeks (parallel to Google Classroom implementation)

### Month 18: Advanced Analytics & Benchmarking

**User Stories:**
1. As a parent, I can see how my child's progress compares to typical growth rates
2. As an advocate, I can generate annual review reports with visualizations
3. As a parent, I receive proactive alerts when falling behind target

**Technical Tasks:**

Week 1-2: Benchmarking Data
- Integrate public datasets (NAEP, state assessment data)
- Calculate expected growth rates by grade/subject
- Anonymized peer comparison (opt-in)

Week 3-4: Advanced Visualizations
- Progress charts (baseline → target → current)
- Trend lines and projections
- Goal achievement probability estimates

Week 5-6: Predictive Analytics
- Machine learning models for goal achievement prediction
- Alert system for at-risk goals
- Recommendation engine (suggest interventions)

Week 7-8: Annual Review Report Generator
- Template-based report builder
- Data export (PDF, Excel)
- Shareable links for IEP teams

---

## PART 8: SUCCESS METRICS & MEASUREMENT

### Parent Engagement Metrics

**Primary Success Metric: Weekly Active Parents (WAP)**
- Definition: Parent who emails/uploads homework OR opens weekly summary
- Target: 40% of registered parents are weekly active
- Cohort analysis: Track retention curves by signup month

**Secondary Metrics:**

1. **Email-to-Analyze Usage**
   - Emails received per parent per week (target: 1-3)
   - Email open rate for weekly summaries (target: 60%+)
   - Time from email sent to analysis completed (target: <2 hours)

2. **Integration Adoption**
   - % parents who connect Google Classroom (target: 30%)
   - % with at least 1 integration active (target: 50%)
   - Synced assignments per week (measure engagement)

3. **Insight Value**
   - Parent satisfaction survey (quarterly): "Insights are helpful" >80% agree
   - Parent NPS (target: >40)
   - Feature request votes (prioritize roadmap)

4. **Retention**
   - 30-day retention (target: 60%)
   - 90-day retention (target: 40%)
   - Annual retention (target: 60%)
   - Churn reasons (exit survey)

5. **Conversion (Freemium → Premium)**
   - Free trial → Paid conversion (target: 15%)
   - Time to conversion (measure activation points)
   - Premium feature usage (which features drive upgrades?)

### Advocate Business Metrics

**Primary Success Metric: Paying Advocates**
- Target: 200 (Month 12), 500 (Month 18), 1,000 (Month 24)

**Secondary Metrics:**

1. **Advocate Acquisition**
   - Monthly new signups
   - Signup source (conference, referral, SEO, paid ads)
   - Free trial → Paid conversion (target: 25%)

2. **Advocate Engagement**
   - DAU/MAU ratio for advocates (target: 60%)
   - Features used per session
   - Time saved per case (measured via surveys)

3. **Advocate-Parent Referrals**
   - % advocates who refer parents (target: 40%)
   - Parents referred per advocate (target: 3)
   - Referral → Parent signup conversion (target: 50%)

4. **Advocate Retention & Expansion**
   - Monthly churn (target: <5%)
   - Upsells (Solo → Professional tier: target 20%)
   - Net revenue retention (target: >100%)

5. **Advocate Satisfaction**
   - NPS (target: >50)
   - "I would recommend to another advocate" (target: >80%)
   - Case studies and testimonials collected

### Product Quality Metrics

1. **AI Analysis Accuracy**
   - Human expert validation of 10% of analyses
   - Parent feedback: "This analysis was accurate" (target: >85%)
   - False positive rate for alerts (target: <10%)

2. **System Performance**
   - Email processing time (target: <30 min)
   - OCR accuracy (target: >95% for printed text)
   - API uptime (target: 99.9%)

3. **Support & Satisfaction**
   - Support ticket volume (measure as % of users)
   - Time to first response (target: <4 hours)
   - CSAT score (target: >90%)

### Business Health Metrics

1. **Revenue**
   - MRR (monthly recurring revenue)
   - ARR growth rate
   - Customer acquisition cost (CAC)
   - Lifetime value (LTV)
   - LTV:CAC ratio (target: >3)

2. **Unit Economics**
   - Average revenue per user (ARPU)
   - Cost per analysis (AI API costs)
   - Gross margin (target: >70% at scale)

3. **Growth Efficiency**
   - Magic number: (Net new ARR / Sales & marketing spend)
   - Target: >0.75 (efficient growth)

---

## APPENDIX: RESEARCH SOURCES SUMMARY

### Parent Needs Research (Agent a2806d6)
- 50+ sources on parent stress, app abandonment, privacy concerns
- Key insight: 90% app abandonment within 25 weeks, only 3% sustain health app use
- Validation: Parents WILL forward emails, connect integrations; WON'T do daily logging

### School Integration Research (Agent a163201)
- Integration complexity matrix for 15+ platforms
- API capabilities, rate limits, auth methods, market share
- Key insight: Google Classroom (24%) and Canvas (28%) are easiest, best APIs

### Educational Data Standards Research (Agent aa8f8f2)
- Ed-Fi SEDM, IDEA requirements, Lexile/NAEP/Lucy Calkins frameworks
- Competitor analysis (AbleSpace, fastIEP, Brolly, Sperro)
- Key insight: Reading proficiency at grade 3 predicts HS graduation (validates importance)

### Advocate Workflow Research (Agent ad04a94)
- Advocate pricing ($150-300/hr), services, pain points
- No specialized case management tools exist (market gap)
- Key insight: 4-8 hours on document review (highly automatable), willingness to pay $149-299/month

---

## CONCLUSION: STRATEGIC RECOMMENDATION

### Build This in Order:

**Phase 1 (Months 1-6): Foundation**
1. Complete pragmatic architecture (structured extraction, validators)
2. Email-to-analyze (passive intelligence core)
3. Weekly AI summaries
4. Basic parent dashboard

**Phase 2 (Months 6-12): Advocate-First**
1. Advocate portal (B2B launch)
2. IEP compliance review tool
3. Meeting prep wizard
4. Google Classroom integration (for parent data)

**Phase 3 (Months 12-18): B2B2C Network**
1. Advocate referral program
2. White-label offering
3. Parent freemium launch
4. Canvas integration

**Phase 4 (Months 18-24): Enterprise & Scale**
1. District partnerships
2. SIS integrations (PowerSchool, etc.)
3. Advanced analytics
4. Community features

### Why This Order Works:

1. **Validates product-market fit with paying customers (advocates) first**
2. **Advocates validate parent features** (won't recommend tools parents won't use)
3. **Builds distribution channel** before scaling parent acquisition
4. **Revenue funds development** (B2B pays for B2C customer acquisition)
5. **Network effects compound** (more advocates → more parents → more advocates)

### Critical Success Factors:

1. ✅ Passive intelligence (not active tracking)
2. ✅ FERPA compliance (non-negotiable)
3. ✅ Mobile-first web app (not native app barrier)
4. ✅ Email-based workflows (universal, no login friction)
5. ✅ Advocate partnerships (distribution & credibility)
6. ✅ Freemium model (deliver value before asking for payment)
7. ✅ Integration ecosystem (Google Classroom first, expand gradually)

### Risks & Mitigations:

| Risk | Mitigation |
|------|-----------|
| Parents don't forward emails | Make value prop immediate: First email → Get insight within 2 hours |
| AI analysis inaccurate | Human expert validation, parent feedback loop, confidence scores |
| Advocates don't adopt | Solve real pain (document review), offer free trial, case studies |
| School privacy concerns | FERPA compliance, parent-controlled data sharing, transparent policies |
| Integration APIs change/break | Monitor health, version compatibility, fallback to email-to-analyze |
| Can't compete with free IEP tools | Differentiate on passive intelligence + advocate network |

---

**Next Steps:**
1. Review this strategic plan
2. Validate assumptions with 5-10 parents and advocates (user interviews)
3. Finalize prioritization of Phase 1 features
4. Begin implementation starting with email-to-analyze infrastructure

This plan is built on 4 research streams totaling 100+ sources and represents a validated, evidence-based approach to building passive intelligence for IEP Copilot.
