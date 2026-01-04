# IEP Copilot: Passive Engagement Strategy

**Core Philosophy:** Parents are overwhelmed. Don't ask them to do more. **Analyze what already exists.**

---

## The Problem with "Progress Journals"

❌ **Active Tracking (My Original Approach):**
```
"Please log your child's reading progress every week"
→ One more thing on a busy parent's plate
→ Inconsistent logging = incomplete data
→ Feels like homework for parents
```

✅ **Passive Intelligence (Better Approach):**
```
"Forward your child's homework to track@iepcopilot.com"
→ Parents already see homework
→ AI analyzes automatically
→ Zero additional burden
```

---

## The Core Insight

**What parents already have:**
- Homework (daily)
- Teacher emails (weekly)
- Report cards (quarterly)
- Progress reports (quarterly)
- School portal access (Canvas, Google Classroom, PowerSchool)

**What we should build:**
Automatically analyze these existing artifacts against IEP goals.

---

## Feature: "Email-to-Analyze"

### How It Works

**Setup (one-time):**
```
Parent adds: homework@child-name.iepcopilot.com to contacts

Auto-forward rules (optional):
• Teacher emails → Auto-forward to IEP Copilot
• Google Classroom notifications → Auto-forward
• School portal emails → Auto-forward
```

**Daily Use:**
```
Child: "Mom, I finished my homework!"
Parent: Takes photo, emails to homework@...
   OR forwards teacher's email with attachment
   OR just CCs the email address when replying to teacher

System:
• Receives email/attachment
• Extracts content (OCR for images, parse PDFs)
• Matches to relevant IEP goals
• Analyzes against grade-level benchmarks
• Generates insight
```

### Example Flow

**Email received:**
```
From: parent@gmail.com
To: homework@emma-smith.iepcopilot.com
Subject: Reading homework
Attachment: worksheet.jpg
```

**AI Analysis:**
```
📄 Worksheet detected: Reading Comprehension

Content Analysis:
• Grade level: 3.5 (estimated using Lexile framework)
• Questions answered: 8/10 correct
• Inference questions: 3/4 correct
• Vocabulary questions: 5/6 correct

Matched to IEP Goal:
🎯 "Improve reading comprehension to 4th grade level"
   Baseline: 2nd grade (Sep 2025)
   Target: 4th grade (June 2026)
   Current: 3.5 grade level

📈 PROGRESS: On track!
   • Started: 2.0 grade level
   • Now: 3.5 grade level (+1.5 levels in 4 months)
   • Target: 4.0 grade level (0.5 levels to go)
   • Pace: Ahead of schedule

💡 INSIGHT:
Strong progress on literal comprehension.
Inference skills developing well.
Continue current reading support (60 min/week).
```

**Parent receives:**
```
📧 IEP Copilot Analysis

Emma's reading homework shows great progress! 📈

She's now reading at 3.5 grade level (up from 2.0 in Sept).
Goal target is 4.0 by June - she's ahead of schedule!

Strong areas: Vocabulary, literal comprehension
Growing areas: Making inferences from text

Current services (60 min/week reading support) are working well.

[View detailed analysis] [See progress chart]
```

---

## Feature: School Portal Integration

### What Parents Already Use

Most schools use one of these:
- **Google Classroom** (K-12, very common)
- **Canvas LMS** (higher ed, some K-12)
- **PowerSchool** (gradebook, attendance)
- **Schoology** (LMS)
- **Seesaw** (elementary, portfolio-based)

### Integration Approach

**Option 1: OAuth Integration (Best UX)**
```
[Connect Google Classroom]
→ OAuth flow
→ IEP Copilot reads:
   • Assignments submitted
   • Grades received
   • Teacher comments
   • Attachments (worksheets, essays)
→ Auto-analyze weekly
```

**Option 2: Email Forwarding (Fallback)**
```
Most systems email parents when:
• Assignment graded
• Teacher comment posted
• Progress report available

Setup auto-forward rule:
teacher-emails@iepcopilot.com
→ System parses and analyzes
```

### Example: Google Classroom Integration

**What we can access (with parent permission):**
```json
{
  "assignments": [
    {
      "title": "Reading: Charlotte's Web Ch 1-3",
      "description": "Answer comprehension questions",
      "dueDate": "2026-01-15",
      "status": "TURNED_IN",
      "grade": "8/10",
      "teacherFeedback": "Good understanding of main ideas. Work on inference questions.",
      "attachments": ["worksheet.pdf"]
    }
  ]
}
```

**Our Analysis:**
```
Assignment: Charlotte's Web Ch 1-3
Grade: 8/10 (80%)

Matched to IEP Goal: Reading Comprehension
• This assignment tests: Literal comprehension, inference
• Grade level: 4th grade text
• Performance: Strong (80%)

📈 Progress Update:
Emma is now successfully comprehending
4th grade texts - this meets her IEP goal target!

Recommend discussing with team:
✓ Goal achieved early (target was June 2026)
□ Consider advancing to 5th grade texts
□ Update goal in annual review (March 2026)
```

---

## Feature: Automatic Document Analysis

### What Parents Upload Anyway

**Report Cards (Quarterly):**
```
Parent uploads report card PDF
→ System extracts grades
→ Compares to IEP goals
→ Flags concerns

Example:
"Reading grade: C (down from B last quarter)
 IEP Goal: Improve reading to 4th grade level
 ⚠️ ALERT: Regression detected. Consider requesting
 additional support or evaluation update."
```

**Progress Reports (IEP-mandated):**
```
School sends IEP progress report
→ Parent uploads or forwards email
→ System extracts progress ratings
→ Compares to parent observations + homework data

Example:
"School says: 'Making adequate progress'
 Our data shows: 12 homework samples, avg 3.5 grade level
 ✓ ALIGNED: School assessment matches homework data"
```

**Teacher Emails:**
```
Teacher: "Emma struggled with the math test today"
→ Parent forwards to IEP Copilot
→ System flags for review

Context:
"Emma has IEP goal for math fluency.
 Last 3 homework assignments: 85%, 90%, 78%
 Teacher email: Struggled with test

 💡 RECOMMENDATION:
 This could indicate test anxiety vs. skill gap.
 Consider requesting:
 • Testing accommodation (extended time)
 • Practice with test format"
```

---

## Feature: AI-Powered Homework Analysis

### What We Can Detect

**Reading Comprehension:**
- Grade level (Lexile score estimation)
- Question types (literal, inferential, critical)
- Accuracy by question type
- Vocabulary level
- Reading fluency (if audio/video)

**Writing:**
- Sentence count
- Word count
- Grammar errors (auto-detected)
- Complexity (sentence structure)
- Organization (intro, body, conclusion)
- Grade level estimation

**Math:**
- Problem types (computation, word problems)
- Accuracy by problem type
- Common error patterns
- Grade level alignment

**Example: Math Worksheet Analysis**
```
Worksheet: Addition & Subtraction Word Problems

Problems: 10 total
Correct: 7/10 (70%)

Breakdown:
• Computation problems: 5/5 (100%) ✓
• Word problems: 2/5 (40%) ⚠️

Pattern detected:
Emma can calculate correctly but struggles
to extract numbers from word problems.

Matched to IEP Goal:
"Solve 2-step word problems with 80% accuracy"

Current performance: 40%
Target: 80%
Gap: -40 percentage points

💡 RECOMMENDATION:
Request additional support for:
• Reading comprehension in math context
• Visual representation of word problems
• Step-by-step problem-solving strategies
```

---

## Feature: Smart Insights Dashboard

### Parent View (Zero Effort)

```
┌─────────────────────────────────────────┐
│ 📊 Emma's Progress (This Month)        │
├─────────────────────────────────────────┤
│ 12 homework samples analyzed            │
│ 3 teacher emails processed              │
│ 1 progress report uploaded              │
│                                         │
│ 🎯 IEP Goal Progress:                  │
│                                         │
│ Reading Comprehension                   │
│ ████████░░ 85% to goal (↗ +15% vs last │
│ month)                                  │
│                                         │
│ Math Word Problems                      │
│ ████░░░░░░ 40% to goal (→ no change)   │
│ ⚠️ May need additional support          │
│                                         │
│ Written Expression                      │
│ ██████░░░░ 60% to goal (↗ +10%)        │
│                                         │
│ 💡 This Week's Insight:                │
│ Emma is excelling at reading            │
│ comprehension! Consider discussing      │
│ with team about advancing goal.         │
│                                         │
│ ⚠️ Action Needed:                       │
│ Math word problems show no progress.    │
│ Request support strategy review.        │
│                                         │
│ [View Details] [Export for IEP Meeting]│
└─────────────────────────────────────────┘
```

**Key Features:**
- Auto-populated from emails/uploads
- No manual logging required
- Proactive alerts ("Action needed")
- Export-ready for meetings

---

## Technical Implementation

### Email Processing Pipeline

```typescript
// Inngest function triggered by inbound email
export const processInboundEmail = inngest.createFunction(
  { id: "process-inbound-email" },
  { event: "email.received" },
  async ({ event, step }) => {
    const { emailId, childId, attachments } = event.data;

    // Step 1: Extract content
    const content = await step.run("extract-content", async () => {
      const extracted = [];
      for (const attachment of attachments) {
        if (attachment.type === 'image') {
          // OCR for images
          const text = await ocrImage(attachment.url);
          extracted.push({ type: 'worksheet', text });
        } else if (attachment.type === 'pdf') {
          // Extract PDF text
          const text = await extractPdfText(attachment.url);
          extracted.push({ type: 'document', text });
        }
      }
      return extracted;
    });

    // Step 2: Classify content type
    const classified = await step.run("classify-content", async () => {
      // Use LLM to determine: homework, test, essay, report card, etc.
      return await classifyContent(content);
    });

    // Step 3: Match to IEP goals
    const matched = await step.run("match-goals", async () => {
      const iep = await getLatestIep(childId);
      // Find relevant goals based on content
      return matchContentToGoals(classified, iep.goals);
    });

    // Step 4: Analyze against goals
    const analysis = await step.run("analyze", async () => {
      const results = [];
      for (const match of matched) {
        const result = await analyzeAgainstGoal({
          content: classified,
          goal: match.goal,
          baseline: match.goal.baseline,
          target: match.goal.target,
        });
        results.push(result);
      }
      return results;
    });

    // Step 5: Generate insight
    const insight = await step.run("generate-insight", async () => {
      return await generateInsight({
        analysis,
        historicalData: await getHistoricalProgress(childId),
        upcomingDeadlines: await getUpcomingDeadlines(childId),
      });
    });

    // Step 6: Save to database
    await step.run("save-analysis", async () => {
      await supabase.from('homework_analyses').insert({
        child_id: childId,
        email_id: emailId,
        content_type: classified.type,
        matched_goals: matched.map(m => m.goal.id),
        analysis: analysis,
        insight: insight,
      });
    });

    // Step 7: Notify parent
    await step.run("notify-parent", async () => {
      await sendEmail({
        to: parentEmail,
        subject: `📊 ${childName}'s ${classified.type} analyzed`,
        body: formatInsightEmail(insight, analysis),
      });
    });
  }
);
```

### Database Schema

```sql
-- Homework/work samples
create table homework_analyses (
  id uuid primary key,
  child_id uuid references children(id),

  -- Source
  email_id text,
  uploaded_file_path text,
  integration_source text,  -- 'google_classroom', 'canvas', 'email'

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

-- Progress tracking (auto-populated)
create table goal_progress_snapshots (
  id uuid primary key,
  child_id uuid references children(id),
  goal_path text not null,

  -- Computed from homework analyses
  snapshot_date date default current_date,
  estimated_level numeric,  -- e.g., 3.5 grade level
  accuracy_rate numeric,    -- e.g., 0.85 (85%)
  sample_count int,         -- How many samples in this period

  -- Trend
  trend text,  -- 'improving', 'stable', 'regressing'

  computed_at timestamptz default now()
);

-- Integration connections
create table school_integrations (
  id uuid primary key,
  child_id uuid references children(id),

  integration_type text,  -- 'google_classroom', 'canvas', 'powerschool'
  credentials jsonb,      -- OAuth tokens (encrypted)

  last_sync_at timestamptz,
  sync_enabled boolean default true,

  created_at timestamptz default now()
);
```

---

## User Experience Flow

### Onboarding (One-Time Setup)

```
Step 1: Upload IEP
→ System extracts goals

Step 2: Connect Data Sources (optional)
┌─────────────────────────────────────┐
│ How should we track progress?      │
├─────────────────────────────────────┤
│ ✓ Email forwarding                 │
│   Forward to: homework@emma.iep...  │
│   [Copy email address]              │
│                                     │
│ ○ Google Classroom (Recommended)   │
│   [Connect Google Account]          │
│                                     │
│ ○ Manual upload                     │
│   Upload homework/reports anytime   │
│                                     │
│ You can change this later           │
└─────────────────────────────────────┘

Step 3: Done!
"We'll analyze Emma's work and email you insights.
 No logging required - just forward or upload."
```

### Weekly Parent Experience

```
Monday:
• Forward homework photo → System analyzes
• Receive insight: "Reading improving!"

Wednesday:
• Google Classroom auto-syncs assignment
• Receive alert: "Math test score below target"

Friday:
• Weekly summary email:
  "This week: 3 homework samples, 2 teacher emails
   Overall: On track for 2/3 goals
   Action needed: Request math support review"
```

### Zero Effort Required

Parent never:
- ❌ Logs into a dashboard daily
- ❌ Fills out progress forms
- ❌ Manually tracks anything

Parent only:
- ✅ Forwards emails they already get
- ✅ Reads weekly summary emails
- ✅ Acts on recommendations

---

## Business Model

### Free Tier
- Email 1 homework/week
- Basic analysis
- Monthly summary

### Premium Tier ($9.99/month)
- Unlimited homework analysis
- School portal integration (Google Classroom, etc.)
- Real-time alerts
- Detailed insights
- Annual review report generation
- Benchmarking (compare to peers)

### Value Proposition
"Stop guessing if your child is making progress.
 Forward their homework, get data-driven insights."

---

## Competitive Moat

**Why this is hard to replicate:**
1. **Structured IEP extraction** (you built this already)
2. **Domain-specific AI models** (reading level, math accuracy)
3. **Multi-modal analysis** (images, PDFs, text, grades)
4. **Longitudinal tracking** (progress over time)
5. **IEP goal matching** (linking work to specific goals)

**No competitor has:**
- Passive progress tracking
- Automated homework → IEP goal analysis
- Zero-effort parent experience

---

## Recommended Integration into Pragmatic Plan

**Replace "Phase 4.5: Core Engagement"** with:

**Phase 4.5: Passive Intelligence (2-3 weeks)**

1. **Email-to-Analyze** (1 week)
   - Inbound email processing
   - OCR for images
   - PDF text extraction
   - Basic content classification

2. **AI Homework Analysis** (1-2 weeks)
   - Reading level estimation
   - Math accuracy analysis
   - Writing assessment
   - Match to IEP goals

3. **Insight Generation** (1 week)
   - Weekly summary emails
   - Progress snapshots
   - Proactive alerts

**Defer to Phase 6:**
- Google Classroom integration (complex OAuth)
- Advanced analytics (trend detection)
- Benchmarking

---

## Key Metrics

**Engagement:**
- Email forwards per week (target: 2+)
- Weekly summary open rate (target: 60%+)
- Parent satisfaction: "Helpful without being burdensome"

**Retention:**
- Parents using email forwarding: 40%+
- Parents reading weekly summaries: 70%+
- Annual retention: 60%+ (vs. 5% without)

**Product-Market Fit Signal:**
- "I just forward homework and IEP Copilot tells me if my kid is on track"
- "I don't have to log anything, it just works"
- "For the first time, I have data to back up my gut feeling"

---

## This Aligns With Your Vision

✅ "Can kids CC an email or upload homework?"
   → Yes, email-to-analyze

✅ "Have system assess against IEP goals?"
   → Yes, automatic goal matching + analysis

✅ "Parents engaged WITHOUT additional burden?"
   → Yes, passive intelligence, zero logging

✅ "Parents engaged in education and learning?"
   → Yes, weekly insights drive informed conversations with child + school

**Result:** Parents become informed advocates without becoming data entry clerks.
