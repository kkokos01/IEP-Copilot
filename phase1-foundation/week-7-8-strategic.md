# Week 7-8: Passive Intelligence (Strategic Overview)

**Objective:** Enable parents to email documents → Get automatic AI analysis

**Status:** High-level approach only. Detail this 2 weeks before implementation (end of week 5).

## Core Capability

Parents forward emails (homework, progress reports, teacher notes) to unique address and receive AI-generated insights automatically.

**Example Flow:**
1. Parent emails photo of homework to `analyze@iepcopilot.com`
2. System extracts attachment, runs OCR (reuses week 1-2 pipeline)
3. Claude analyzes in context of child's IEP goals
4. Email response within 5 minutes: "Great job on math! This aligns with Goal #2..."
5. Analysis saved to dashboard for later review

## Key Architectural Decisions

**1. Email Infrastructure:**
- Use SendGrid Inbound Parse or AWS SES for receiving emails
- Each user gets unique forwarding address: `{user_id}@analyze.iepcopilot.com`
- Extract attachments (PDF, images) and body text
- Store in `passive_submissions` table with source metadata

**2. Document Classification:**
- Use Claude to classify: homework, progress report, teacher communication, other
- Different analysis prompts based on document type
- Link to relevant IEP goals automatically

**3. Analysis Engine:**
- Reuse OCR pipeline from weeks 1-2
- Context-aware prompts: include relevant IEP goals, recent submissions, accommodations
- Generate parent-friendly insights (no jargon)

**4. Notification Strategy:**
- Email response within 5 minutes
- Optional: Weekly digest of all submissions
- Dashboard view of submission history

## Database Schema (High-level)

```sql
create table passive_submissions (
  id uuid primary key,
  user_id uuid references auth.users(id),
  child_id uuid references children(id),

  -- Source
  from_email text,
  subject text,
  received_at timestamptz,

  -- Content
  document_type text, -- 'homework', 'progress_report', 'teacher_note'
  raw_content text,
  extracted_content jsonb,

  -- Analysis
  analysis_completed boolean default false,
  analysis jsonb,
  linked_goals uuid[], -- IEP goals referenced

  created_at timestamptz default now()
);
```

## Success Criteria

- ✅ Email → analysis pipeline works end-to-end
- ✅ 90%+ emails processed within 5 minutes
- ✅ Analysis references relevant IEP goals
- ✅ Parents can view submission history in dashboard

## Dependencies for Later Phases

**This capability is critical for both B2B and B2C:**
- B2B: Advocates analyze student work from parents
- B2C: Parents get ongoing insights without manual uploads

**Quality depends on weeks 1-6:**
- If extraction schema changes, may need to adjust goal linking
- If OCR quality poor, passive submissions will suffer
- Cost model (~$0.50/submission) depends on Claude pricing

## What NOT to Detail Now

- ❌ Exact prompt templates (will iterate based on user feedback)
- ❌ Specific UI components (depends on learnings from weeks 4-5)
- ❌ Advanced features like OCR improvement (depends on production data accuracy)
- ❌ Integration with Google Classroom API (nice-to-have, not MVP)

## When to Detail

**Schedule detailed planning session:**
- End of week 5 (2 weeks before week 7)
- After validating extraction quality with production IEPs
- After understanding actual costs and latency from weeks 1-6

**What to have ready:**
- 10-20 sample emails/homework to test with
- Actual cost data from Claude API (weeks 1-6)
- User feedback on extraction quality
- Decision: SendGrid vs AWS SES (research pricing, features)

## Implementation Approach (When Ready)

**Week 7:**
- Email receiving infrastructure
- Basic document classification
- Manual testing with sample submissions

**Week 8:**
- Analysis prompt engineering
- Goal linking logic
- Dashboard UI for submission history
- Email notification system

## Risks & Mitigations

**Risk:** Email parsing is fragile (attachments, encoding issues)
- **Mitigation:** Start with simple cases (single image attachment). Add complexity incrementally.

**Risk:** Analysis quality varies wildly
- **Mitigation:** Prototype prompts in Claude.ai first. Test with 20+ diverse documents before shipping.

**Risk:** Cost spirals (parents submit 10+ things/day)
- **Mitigation:** Implement rate limits (5 free/month, then paid). Monitor costs closely.

**Risk:** Spam/abuse (people forward random emails)
- **Mitigation:** Email validation, rate limiting, user auth required.

## Next Steps After Week 6

1. **Validate Foundation (Weeks 1-6):**
   - Test with 10-20 diverse IEPs
   - Measure: accuracy, cost, latency
   - Gather user feedback

2. **Schedule Week 7-8 Planning (End of Week 5):**
   - Review this strategic overview
   - Detail implementation approach
   - Choose email provider
   - Prototype analysis prompts

3. **Prepare Test Data:**
   - Collect 20 sample homework/progress reports
   - Get permission from parents to use anonymized data
   - Create test cases (good homework, struggling homework, teacher concerns)

---

*Week 7-8 Strategic Overview - Detail before implementation*
*Last Updated: 2026-01-03*
