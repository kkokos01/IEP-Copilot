# Batch Test Data Generation

This directory contains scripts and documentation for generating realistic test data to populate the analytics dashboard.

## Overview

The batch testing approach creates multiple synthetic IEP documents for different students, each with various compliance issues, to simulate a real-world parent's dashboard with multiple children and historical IEPs.

## Test Data Structure

### Students Created (6 total):

1. **Emma Martinez** (3 IEPs)
   - 2024: Vague goals, no progress method
   - 2023: Incomplete PLAAFP, missing services
   - 2025: Parent concerns not addressed

2. **Liam Johnson** (2 IEPs)
   - 2024: Compliant IEP
   - 2023: Outdated evaluation, missing ESY

3. **Sophia Williams** (3 IEPs)
   - 2024: Missing transition plan, no accommodations
   - 2023: Missing signatures
   - 2025: Comprehensive, compliant

4. **Noah Brown** (2 IEPs)
   - 2024: Missing services, no progress method
   - 2025: Vague goals

5. **Ava Garcia** (3 IEPs)
   - 2024: Incomplete PLAAFP, parent concerns
   - 2023: Missing ESY consideration
   - 2025: Vague goals, no progress method

6. **Mason Davis** (2 IEPs)
   - 2024: No accommodations
   - 2023: Multiple issues (vague goals, missing services, outdated eval)

**Total: 15 documents across 6 students**

## Usage Instructions

### Step 1: Generate Test Documents

```bash
# Generate all test documents (takes ~5-10 minutes)
npx tsx scripts/generate-test-batch.ts
```

This creates 15 PDF documents in `test-docs/generated/batch/` with various compliance issues.

### Step 2: Upload to Test Account (Local Testing)

```bash
# Make sure Next.js dev server is running
npm run dev

# Upload all documents for a test user
npx tsx scripts/upload-test-batch.ts
```

This will:
- Create a test user account
- Create 6 children (one per student)
- Create cases for each child
- Upload all 15 documents
- Print login credentials

### Step 3: Monitor Processing

```bash
# Start Inngest dev server (if not already running)
npx inngest-cli@latest dev
```

Watch processing at: http://localhost:8288

### Step 4: View Analytics

1. Login with the test credentials printed by the upload script
2. Navigate to: http://localhost:3001/dashboard/analytics
3. View aggregated statistics across all documents

## Expected Analytics Results

Once all documents are processed, you should see:

### Overview:
- Total Documents: 15
- IEP Documents: 15
- Processed: 15
- Structured Extractions: 15

### Validation Issues:
- Multiple errors for:
  - Missing transition plans
  - Missing signatures
  - Missing services
- Multiple warnings for:
  - Vague goals
  - Incomplete PLAAFP
  - Missing ESY consideration
  - Parent concerns not addressed

### IEP Data Insights:
- Goals across various domains (Reading, Math, etc.)
- Services distribution
- Multiple students tracked

### Compliance Alerts:
- Several IEPs with quality issues
- Various compliance gaps

## Compliance Issues Coverage

The batch includes documents with these issues:

| Issue Type | Count | Example Documents |
|------------|-------|-------------------|
| vague-goals | 5 | Emma 2024, Ava 2025, Noah 2025, Mason 2023 |
| missing-transition | 1 | Sophia 2024 |
| incomplete-plaafp | 2 | Emma 2023, Ava 2024 |
| missing-services | 2 | Emma 2023, Noah 2024, Mason 2023 |
| no-progress-method | 4 | Emma 2024, Noah 2024, Ava 2025 |
| parent-concerns | 2 | Emma 2025, Ava 2024 |
| outdated-eval | 2 | Liam 2023, Mason 2023 |
| no-accommodations | 1 | Sophia 2024, Mason 2024 |
| missing-signature | 1 | Sophia 2023 |
| esy-missing | 2 | Liam 2023, Ava 2023 |
| Compliant IEPs | 3 | Liam 2024, Sophia 2025, Emma 2025 (partial) |

## Production Testing

For production testing on Vercel:

1. Generate documents locally:
   ```bash
   npx tsx scripts/generate-test-batch.ts
   ```

2. Upload documents manually through the UI:
   - Login to production site
   - Create children for each student
   - Create cases for each child
   - Upload documents via the upload UI

3. Monitor processing in Inngest Cloud dashboard

4. View analytics at: `https://your-app.vercel.app/dashboard/analytics`

## Customization

### Add More Students

Edit `scripts/generate-test-batch.ts` and add entries to the `testCases` array:

```typescript
{
  name: 'New Student',
  documents: [
    {
      filename: 'new-student-2024-issues.pdf',
      state: 'TX',
      issues: ['vague-goals', 'missing-services'],
      pages: 8,
    },
  ],
},
```

### Add More Compliance Issues

Available issues (see `scripts/generate-test-iep.ts`):
- `vague-goals`
- `missing-signature`
- `missing-transition`
- `incomplete-plaafp`
- `no-accommodations`
- `outdated-eval`
- `missing-services`
- `no-progress-method`
- `parent-concerns`
- `esy-missing`

### Change States

Available states: `TX`, `CA`, `NY`, `AR`, `MO` (can add more in generate-test-iep.ts)

## Cleanup

To remove test data:

```bash
# Remove generated PDFs
rm -rf test-docs/generated/batch/*

# Remove test user (via Supabase admin or SQL)
# Or just delete the user's children/cases through the UI
```

## Notes

- All data is **100% synthetic** - no real student information
- Documents are generated using Claude Sonnet 4 for realistic content
- Each generation takes ~30-60 seconds per document
- Total batch generation time: ~5-10 minutes
- Upload time: ~2-3 minutes (depends on processing pipeline)

## Troubleshooting

### Issue: Documents not processing

- Check Inngest dev server is running
- Check Next.js dev server is running
- Check GCP credentials are configured for Document AI

### Issue: Upload fails

- Ensure you're running the upload script with dev server on port 3001
- Check Supabase credentials in `.env.local`
- Verify storage bucket permissions

### Issue: Analytics shows zero

- Wait for documents to fully process (check Inngest dashboard)
- Verify validators ran (check validation_issues table)
- Ensure extraction completed (check extracted_iep_data table)

## Future Enhancements

- [ ] Add documents from different time periods to test timeline view
- [ ] Add documents with different disability categories
- [ ] Generate progress reports and evaluation documents
- [ ] Add multi-year IEPs to test compliance tracking
- [ ] Generate documents with photo/image content
- [ ] Add special edge cases (very long IEPs, very short IEPs)
