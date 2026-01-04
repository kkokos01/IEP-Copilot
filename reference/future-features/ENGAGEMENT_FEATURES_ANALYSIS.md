# IEP Copilot: Engagement & Retention Strategy

**Core Problem:** IEP processing is once-a-year. How do we create daily/weekly value?

**Solution:** Build features around the child's **ongoing education journey** that leverage structured IEP data.

---

## The Data Flywheel

```
Upload IEP
    ↓
Extract structured goals/services
    ↓
Track progress toward goals (weekly)
    ↓
Collect evidence & observations
    ↓
Generate insights for annual review
    ↓
Upload next year's IEP
    ↓
Compare year-over-year → Show impact
```

**Key insight:** The longer parents use the platform, the more valuable it becomes.

---

## Feature Categories (Priority Order)

### Tier 1: Quick Wins (Add to Pragmatic Plan)

These drive engagement AND leverage structured extraction:

#### 1. Goal Progress Journal 📊

**User need:** "Is my child actually making progress on their IEP goals?"

**Feature:**
```
Weekly check-in prompts:
┌─────────────────────────────────────┐
│ 🎯 Goal: Read 20 min/day           │
│                                     │
│ This week, how often did your      │
│ child read independently?           │
│                                     │
│ [0] [1] [2] [3] [4] [5] [6] [7]    │
│                                     │
│ Add note (optional):                │
│ "Started chapter books! Excited     │
│  about Magic Tree House series."    │
│                                     │
│ [📷 Add photo/video evidence]       │
└─────────────────────────────────────┘

Progress over time:
Week 1: ██░░░░░ 2/7 days
Week 2: ████░░░ 4/7 days
Week 3: █████░░ 5/7 days ↗ Improving!
```

**Engagement driver:**
- Weekly notification: "Time to log this week's progress"
- Gamification: Streak counter, progress badges
- Social proof: "85% of parents log weekly. You're building great habits!"

**Leverages structured data:**
- Automatically extracts goals from IEP
- Pre-populates goal targets & measurement methods
- Links progress to specific goals in analytics

**Implementation:**
```sql
create table goal_progress_logs (
  id uuid primary key,
  child_id uuid references children(id),
  goal_id text,  -- JSON path: "/goals/0"

  -- Log data
  log_date date default current_date,
  value jsonb,  -- Flexible: could be number, text, boolean
  notes text,
  media_urls text[],

  -- Context
  logged_by uuid references auth.users(id),
  created_at timestamptz default now()
);
```

**Development time:** 1 week
**Engagement impact:** ⭐⭐⭐⭐⭐ (drives weekly return)

---

#### 2. Communication Hub 📧

**User need:** "All my school emails are scattered. I can't find the one about speech therapy."

**Feature:**
```
┌─────────────────────────────────────────┐
│ 📧 School Communications               │
├─────────────────────────────────────────┤
│ Link email account (Gmail, Outlook)    │
│                                         │
│ Auto-tagged by IEP topic:               │
│ • Speech Therapy (12 emails)            │
│ • Reading Support (8 emails)            │
│ • Annual Review (5 emails)              │
│ • Accommodations (3 emails)             │
│                                         │
│ Search: "baseline data"                 │
│ → Finds email mentioning baseline       │
│   + Links to relevant IEP section       │
└─────────────────────────────────────────┘
```

**Engagement driver:**
- Becomes single source of truth for school communication
- AI summaries: "3 new emails about upcoming IEP meeting"
- Smart replies: Suggest responses based on IEP data

**Leverages structured data:**
- Tags emails by goal area, service type
- Suggests relevant IEP sections when replying
- Flags discrepancies: "Email says 30 min/week, IEP says 60 min/week"

**Implementation:**
- Gmail/Outlook API integration
- Email parsing + AI classification
- Link emails to IEP sections

**Development time:** 2-3 weeks
**Engagement impact:** ⭐⭐⭐⭐ (daily return for active parents)

---

#### 3. Smart Calendar & Reminders 📅

**User need:** "I missed the deadline to request an evaluation!"

**Feature:**
```
Automatic calendar population:
┌─────────────────────────────────────┐
│ 📅 January 2026                    │
├─────────────────────────────────────┤
│ 15 - Annual Review Meeting 🔴       │
│      (Must confirm attendance)      │
│                                     │
│ 31 - Progress Report Due 🟡         │
│      (Request if not received)      │
│                                     │
│ Upcoming in 60 days:                │
│ • Triennial Evaluation (Mar 15)    │
│ • Speech Therapy Re-eval (Apr 1)   │
└─────────────────────────────────────┘

Proactive reminders:
"⏰ Your annual review is in 30 days.
 Here's what to prepare:
 • Review current goals (2/5 need updates)
 • Collect evidence for reading goal
 • Draft questions about speech therapy"
```

**Engagement driver:**
- Weekly digest: "This week's IEP tasks"
- Push notifications for critical deadlines
- Sync to parent's personal calendar (Google Calendar, Apple Calendar)

**Leverages structured data:**
- Extracts dates from IEP (annual review, triennial eval)
- Calculates deadlines (60 days before annual review = prep time)
- Links reminders to specific goals/services

**Implementation:**
```sql
create table iep_events (
  id uuid primary key,
  child_id uuid references children(id),

  event_type text,  -- 'annual_review', 'progress_report', 'eval_due'
  event_date date not null,

  -- Auto-populated from IEP
  source_field text,  -- JSON path: "/dates/annual_review"

  -- Reminder settings
  reminder_days_before int[] default '{30, 7, 1}',

  status text default 'upcoming'
);
```

**Development time:** 1 week
**Engagement impact:** ⭐⭐⭐⭐ (monthly return)

---

### Tier 2: Medium-Term Features (Phase 6-8)

Build after core platform is solid:

#### 4. Advocacy Letter Generator 📝

**User need:** "I need to request an evaluation, but I don't know how to write the letter."

**Feature:**
```
Letter templates powered by IEP data:
┌─────────────────────────────────────┐
│ Generate Letter                     │
├─────────────────────────────────────┤
│ Purpose:                            │
│ ○ Request Evaluation                │
│ ○ Request Service Increase          │
│ ○ Dispute IEP Decision              │
│ ○ Request Accommodation             │
│                                     │
│ The letter will include:            │
│ ✓ Your child's info (auto-filled)  │
│ ✓ Current IEP services (auto)       │
│ ✓ Relevant legal rights             │
│ ✓ Timeline requirements              │
│                                     │
│ [Generate Draft]                    │
└─────────────────────────────────────┘

Output:
"Dear [District Name],

I am writing to formally request an independent
educational evaluation for [Child Name] in the
area of reading comprehension.

Current IEP (dated [Date]) includes:
- Reading support: 60 min/week
- Annual goal: Improve to 4th grade level
- Current baseline: 2nd grade level

Despite these services, [Child Name] is not
making adequate progress. Per IDEA regulations
(34 CFR §300.502), I am requesting...

[Legally compliant template with IEP data]"
```

**Engagement driver:**
- Used during advocacy moments (high stakes = memorable)
- Positions platform as advocacy partner, not just tool
- Shareable: "I got my evaluation approved using IEP Copilot!"

**Leverages structured data:**
- Auto-fills child info, current services, goals
- Identifies relevant issues (missing baseline → request evaluation)
- Suggests next steps based on IEP status

**Development time:** 2 weeks
**Engagement impact:** ⭐⭐⭐ (infrequent but high-value)

---

#### 5. Meeting Prep Wizard 🎯

**User need:** "I have an IEP meeting tomorrow and I'm not prepared!"

**Feature:**
```
AI-powered meeting preparation:
┌─────────────────────────────────────┐
│ 📋 IEP Meeting Prep                │
├─────────────────────────────────────┤
│ Meeting: Annual Review (Jan 15)    │
│                                     │
│ 📊 PREPARATION SUMMARY              │
│                                     │
│ 1. Review These Sections:           │
│    ⚠️ Goal 1 (Reading): No progress │
│       data logged                   │
│    ✓ Goal 2 (Math): On track       │
│    ⚠️ Services: Speech reduced      │
│       from 60→45 min last year     │
│                                     │
│ 2. Questions to Ask:                │
│    • "Why was baseline data not     │
│       included for writing goal?"   │
│    • "What evidence shows reading   │
│       support is working?"          │
│                                     │
│ 3. What to Bring:                   │
│    • Progress logs (12 entries)     │
│    • Email from teacher (Oct 3)     │
│    • Outside eval report            │
│                                     │
│ [Export to PDF] [Add to Notes]     │
└─────────────────────────────────────┘
```

**Engagement driver:**
- High anxiety moment = high engagement
- Parents screenshot and share success stories
- AI analysis of "what changed" after meeting

**Leverages structured data:**
- Compares current IEP to last year's
- Flags issues (missing data, service reductions)
- Links progress logs to specific goals
- Generates data-driven questions

**Development time:** 2-3 weeks
**Engagement impact:** ⭐⭐⭐⭐ (1-2x per year, high-impact)

---

#### 6. Evidence Collection 📸

**User need:** "I wish I'd documented my child's progress for the annual review."

**Feature:**
```
Simple evidence capture:
┌─────────────────────────────────────┐
│ 📸 Capture Moment                  │
├─────────────────────────────────────┤
│ [Photo of child reading book]      │
│                                     │
│ Tag with goal:                      │
│ 🎯 Reading Comprehension Goal       │
│                                     │
│ Note:                               │
│ "Finished first chapter book!       │
│  Asked questions about plot."       │
│                                     │
│ Date: Jan 10, 2026                 │
│                                     │
│ [Save to Progress Journal]          │
└─────────────────────────────────────┘

Annual review export:
"Reading Comprehension Evidence (12 items)
 • Sep 15: Started reading 10 min/day
 • Oct 3: Finished first picture book independently
 • Jan 10: Finished first chapter book
 [Include in annual review packet]"
```

**Engagement driver:**
- Mobile-first (snap photo → tag goal → done)
- Builds portfolio over time
- "Parent's version" vs. "School's version" comparison

**Leverages structured data:**
- Tag media with specific goals
- Auto-organize by goal area
- Generate timeline for annual review

**Development time:** 1-2 weeks
**Engagement impact:** ⭐⭐⭐⭐⭐ (drives frequent use)

---

### Tier 3: Long-Term Platform Plays (Scale Required)

Only build when you have thousands of users:

#### 7. Community & Peer Support 👥

**User need:** "I feel alone in this. Are other parents dealing with the same issues?"

**Feature:**
- Anonymous forums by disability category, goal area
- "Ask an Advocate" Q&A (moderated)
- Success story library (searchable by situation)

**Why wait:**
- Needs critical mass (100+ active parents per category)
- Requires moderation (cost + complexity)
- Network effects kick in at scale

**Development time:** 4-6 weeks + ongoing moderation
**Engagement impact:** ⭐⭐⭐⭐⭐ (at scale)

---

#### 8. IEP Education Library 📚

**User need:** "What does 'LRE' mean? How do I read an evaluation?"

**Feature:**
- Contextual help: Hover over "LRE" → see definition + video
- Guided courses: "IEP 101", "How to Request Services"
- Resource library: State-specific regulations, IDEA rights

**Why wait:**
- Content creation burden (20+ hours per course)
- Only impactful if users return regularly
- Better as feature of mature product

**Development time:** Ongoing content creation
**Engagement impact:** ⭐⭐⭐ (nice-to-have)

---

## Recommended Roadmap Integration

### Add to Pragmatic Plan:

**Phase 4.5: Core Engagement Features (2-3 weeks)**

After analytics dashboard, before exports:

**Must-build (drives daily/weekly engagement):**
1. ✅ Goal Progress Journal (1 week)
   - Weekly check-ins
   - Progress visualization
   - Photo/video evidence

2. ✅ Smart Calendar (1 week)
   - Auto-populate from IEP dates
   - Deadline reminders
   - Prep time alerts (30 days before annual review)

3. ✅ Evidence Collection (1 week)
   - Mobile photo capture
   - Tag with goals
   - Build portfolio over time

**Should-build (drives retention):**
4. 🟡 Communication Hub (2-3 weeks) - **Phase 6**
   - Email integration (Gmail API)
   - Auto-tagging by IEP topic
   - Search across emails + IEP

5. 🟡 Advocacy Letter Generator (2 weeks) - **Phase 7**
   - Template library
   - Auto-fill from IEP data
   - Legal compliance check

6. 🟡 Meeting Prep Wizard (2-3 weeks) - **Phase 8**
   - AI-powered agenda
   - Question generator
   - Export prep packet

**Defer to scale:**
- Community features (need 1000+ users)
- Education library (ongoing content burden)

---

## Database Schema Additions

```sql
-- Goal progress tracking
create table goal_progress_logs (
  id uuid primary key,
  child_id uuid references children(id),
  extracted_iep_goals_id uuid references extracted_iep_goals(id),
  goal_path text not null,  -- JSON path: "/goals/0"

  log_date date default current_date,
  value jsonb,  -- Flexible: number, text, boolean, etc.
  notes text,
  media_urls text[],  -- Photo/video evidence

  logged_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Evidence collection
create table evidence_items (
  id uuid primary key,
  child_id uuid references children(id),
  goal_path text,  -- Link to specific goal

  item_type text check (item_type in ('photo', 'video', 'note', 'document')),
  storage_path text,

  caption text,
  captured_date date default current_date,

  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Email integration
create table linked_emails (
  id uuid primary key,
  child_id uuid references children(id),

  email_id text not null,  -- Gmail/Outlook ID
  subject text,
  from_address text,
  received_at timestamptz,

  -- AI-powered tagging
  tags text[],  -- ['speech_therapy', 'annual_review']
  linked_goal_paths text[],  -- ['/goals/0', '/services/1']

  -- Summary
  ai_summary text,

  created_at timestamptz default now()
);

-- Calendar events (already shown above)
create table iep_events (
  id uuid primary key,
  child_id uuid references children(id),
  event_type text,
  event_date date not null,
  source_field text,  -- Auto-populated from IEP
  reminder_days_before int[] default '{30, 7, 1}',
  status text default 'upcoming'
);
```

---

## Business Impact

### Retention Metrics (Projected)

**Without engagement features:**
- Upload IEP → Review → Churn
- 30-day retention: 20%
- Annual retention: 5% (only return for next IEP)

**With Tier 1 features (Progress Journal + Calendar):**
- Weekly check-ins drive return
- 30-day retention: 60%
- Annual retention: 40%

**With Tier 2 features (+ Communication Hub + Advocacy Tools):**
- Daily engagement for active parents
- 30-day retention: 75%
- Annual retention: 60%

### Monetization Opportunities

**Free Tier:**
- IEP upload + basic extraction
- 1 goal progress tracking
- Basic calendar

**Premium Tier ($9.99/month or $89/year):**
- Unlimited progress tracking
- Communication hub
- Advocacy letter generator
- Meeting prep wizard
- Evidence portfolio
- Year-over-year analytics
- Benchmarking

**Justification:** "Parents pay $200-500/hour for IEP advocates. We provide advocacy tools for <$100/year."

---

## Next Steps

1. **Validate with users:**
   - Survey: "Which features would make you use IEP Copilot weekly?"
   - User interviews: "How do you currently track goal progress?"

2. **Prioritize by impact:**
   - Goal Progress Journal: Highest engagement driver
   - Calendar: Lowest complexity, high utility
   - Communication Hub: Highest retention, highest complexity

3. **Integrate into pragmatic plan:**
   - Add Phase 4.5 (Core Engagement) before exports
   - Defer Tier 2 features to Phase 6-8
   - Don't build Tier 3 until 1000+ active users

4. **Measure success:**
   - Track DAU/MAU (daily active users / monthly active users)
   - Goal: MAU→WAU conversion >30% (monthly → weekly users)
   - Track feature usage: % of users logging progress weekly

---

## Key Insight

**The best engagement features create a data flywheel:**
- More usage → More data collected → More insights → More value → More usage

**Goal Progress Journal** is the highest-leverage feature:
- Low complexity (2 weeks to build)
- High engagement (weekly use)
- Creates compound value (data builds over time)
- Differentiates from competitors (no one else has this)
- Enables upsell (premium analytics on progress data)

Start here.
