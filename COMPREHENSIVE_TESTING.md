# Comprehensive Test Data System

## Overview

This system generates **realistic, complete educational records** for test students, including:

1. **IEP Documents** - Goals, services, accommodations
2. **Progress Reports** - Quarterly tracking toward IEP goals
3. **Evaluation Reports** - Psychoeducational, speech, OT, PT assessments

This allows testing of:
- ✅ Document processing pipeline
- ✅ Structured data extraction
- ✅ Validation and compliance checking
- ✅ **Progress tracking over time**
- ✅ **Correlation between assessments and outcomes**
- ✅ **Analytics dashboard with real longitudinal data**

## Generated Test Dataset

### 5 Students, 35+ Documents

**Emma Martinez** (High Progress)
- 2 IEPs (2024, 2025)
- 3 Progress Reports (Q1: medium, Q2: high, Q3: high)
- 2 Evaluations (Psych: mixed, Speech: positive)
- **Story**: Started with vague goals, improved dramatically, now compliant IEP

**Liam Johnson** (Steady Progress)
- 2 IEPs (2023, 2024)
- 2 Progress Reports (Q1: medium, Q2: medium)
- 1 Evaluation (Psych: mixed)
- **Story**: Consistent student, needed updated evaluation, now on track

**Sophia Williams** (Struggling → Improving)
- 2 IEPs (2024 missing transition, 2025 comprehensive)
- 3 Progress Reports (Q1: low, Q2: medium, Q3: medium)
- 2 Evaluations (Psych: concerning, OT: mixed)
- **Story**: High school student with transition needs, slow improvement

**Noah Brown** (Multiple Disabilities, Slow Progress)
- 2 IEPs (2024, 2025)
- 3 Progress Reports (Q1: low, Q2: low, Q3: medium)
- 3 Evaluations (Psych: concerning, Speech: concerning, OT: mixed)
- **Story**: Complex needs, multiple services, gradual gains

**Ava Garcia** (Young Student, Excellent Progress)
- 2 IEPs (2024, 2025)
- 3 Progress Reports (Q1: medium, Q2: high, Q3: high)
- 1 Evaluation (Speech: positive)
- **Story**: Young student with speech delay, responding well to intervention

## What You Can Test

### Progress Tracking
- See how Emma's progress improved from Q1 (medium) to Q3 (high)
- Compare Noah's slow but steady gains across quarters
- Identify Sophia's turning point in Q2

### IEP vs. Outcomes
- Emma had vague goals (2024) → poor progress → revised IEP (2025) → better outcomes
- Sophia missing transition plan → struggling → comprehensive IEP → improving

### Evaluation Data
- Noah's concerning psych/speech evals justify intensive services
- Ava's positive speech eval shows intervention is working
- Sophia's concerning psych eval explains struggles, supports additional supports

### Analytics Insights
- **Trend Analysis**: Which students are improving? Declining?
- **Service Effectiveness**: Are students getting enough services showing better progress?
- **Compliance Impact**: Do compliant IEPs correlate with better outcomes?
- **Goal Quality**: Do measurable goals lead to better progress tracking?

## Quick Start

### Option 1: Full Comprehensive Batch (Recommended)

```bash
# Generate all documents (~10-15 minutes)
npx tsx scripts/generate-comprehensive-batch.ts

# Upload to test account
npx tsx scripts/upload-test-batch.ts
```

**What you get:**
- 10 IEPs
- 13 Progress Reports
- 8 Evaluations
- **Total: 31 documents** showing complete educational histories

### Option 2: IEPs Only (Faster)

```bash
# Generate just IEPs (~5 minutes)
npx tsx scripts/generate-test-batch.ts

# Upload
npx tsx scripts/upload-test-batch.ts
```

**What you get:**
- 15 IEPs with various compliance issues
- Good for testing extraction and validation
- No progress tracking

### Option 3: Custom Single Documents

```bash
# Generate specific IEP
npx tsx scripts/generate-test-iep.ts --name="Test Student" --issues=vague-goals

# Generate specific progress report
npx tsx scripts/generate-progress-report.ts --student="Test Student" --period=Q1 --progress=high

# Generate specific evaluation
npx tsx scripts/generate-evaluation.ts --student="Test Student" --type=speech --findings=positive
```

## Analytics Dashboard Features

Once documents are processed, view analytics at `/dashboard/analytics`:

### Overview Section
- Total documents by type (IEP, Progress Report, Evaluation)
- Processing status
- Structured extractions count

### Validation Issues
- Compliance problems across all IEPs
- Trending issues (most common problems)
- Severity breakdown

### Progress Tracking (NEW!)
- Student progress trends over time
- Average progress by quarter
- Students showing improvement vs. decline
- Correlation between IEP quality and progress

### Evaluation Insights (NEW!)
- Assessment results summary
- Services aligned with eval recommendations
- Re-evaluation timeline tracking

### Student Performance (NEW!)
- Individual student progress curves
- Goal attainment rates
- Service hours vs. outcomes
- Predicted trajectory

## Database Schema

Documents are linked and analyzable:

```
children
  └── cases
      └── documents
          ├── extracted_iep_data
          │   └── validation_issues
          ├── progress_data (future)
          └── evaluation_data (future)
```

## Roadmap

### Current (Week 6)
- ✅ IEP generation with compliance issues
- ✅ Progress report generation with varying levels
- ✅ Evaluation generation (4 types)
- ✅ Comprehensive batch system
- ✅ Upload automation
- ✅ Basic analytics dashboard

### Next (Week 7-8)
- [ ] Extract structured data from progress reports
- [ ] Extract structured data from evaluations
- [ ] Progress tracking visualizations (line charts)
- [ ] Goal attainment calculation
- [ ] Predictive analytics (trajectory)
- [ ] Automated insights ("Emma is improving rapidly")

### Future
- [ ] Homework/classwork samples
- [ ] Teacher communication
- [ ] Meeting notes
- [ ] Report card integration
- [ ] Real-time progress monitoring

## Testing Scenarios

### Scenario 1: Parent with Improving Child
**Student**: Emma Martinez
**Test**: Upload all Emma's documents
**Expected**: Analytics show clear improvement trend Q1→Q3, correlation with IEP revision

### Scenario 2: Parent with Struggling Child
**Student**: Sophia Williams
**Test**: Upload all Sophia's documents
**Expected**: Analytics flag concerning eval, show low progress, recommend IEP review

### Scenario 3: Parent with Multiple Children
**Test**: Upload documents for Emma + Liam
**Expected**: Dashboard shows comparison, identifies which child needs attention

### Scenario 4: Compliance Monitoring
**Test**: Upload all IEPs with various issues
**Expected**: Analytics aggregate issues, show most common problems, prioritize fixes

## Tips

1. **Start with Emma**: She has the most complete record (IEP + Progress + Evals)
2. **Compare Noah vs. Ava**: Similar age, different outcomes
3. **Track Sophia's Journey**: Shows real-world improvement arc
4. **Use for Demos**: Realistic data for showing product to stakeholders
5. **Test Edge Cases**: Generate custom documents with `--issues` flags

## Cleanup

```bash
# Remove generated files
rm -rf test-docs/generated/batch/*

# Remove test users (via Supabase admin)
# Or delete children/cases through UI
```

## Questions?

See individual generator scripts for detailed options:
- `scripts/generate-test-iep.ts`
- `scripts/generate-progress-report.ts`
- `scripts/generate-evaluation.ts`
- `scripts/generate-comprehensive-batch.ts`
- `scripts/upload-test-batch.ts`
