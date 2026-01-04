# Test Documents

This directory contains test data systems for comprehensive testing of the document processing pipeline.

## Test Data Systems

### 🎯 Recommended: Comprehensive Test System
**File:** [`COMPREHENSIVE_TESTING.md`](./COMPREHENSIVE_TESTING.md)

Complete educational records for 5 students with 35+ documents:
- IEP Documents
- Progress Reports (quarterly tracking)
- Evaluation Reports (psychoeducational, speech, OT, PT)

**Use this for:**
- Testing progress tracking over time
- Testing correlation between assessments and outcomes
- Analytics dashboard with longitudinal data
- Complete end-to-end pipeline testing

### 📦 Batch IEP Testing
**File:** [`BATCH_TESTING.md`](./BATCH_TESTING.md)

Simpler batch system with 6 students and 15 IEP documents only.

**Use this for:**
- Quick testing of IEP extraction
- Testing compliance validation
- Faster test data generation (~5 minutes vs 10-15 minutes)

---

## ⚠️ IMPORTANT: Privacy & Security

- **NEVER** commit real student documents to version control
- Use only **anonymized** or **synthetic** documents
- Remove all personally identifiable information (PII):
  - Student names, dates of birth
  - Parent/guardian names
  - School names, addresses
  - Case numbers, student IDs
  - Evaluator names and signatures

This folder is included in `.gitignore` to prevent accidental commits.

## Directory Structure

### `/generated/batch/`
**Purpose:** Generated synthetic IEP documents from batch testing system

### `/generated/comprehensive/`
**Purpose:** Generated comprehensive educational records (IEPs + Progress Reports + Evaluations)

### `/real-samples/` (if you add real documents)
**Purpose:** Real-world IEP samples for testing edge cases

**Required subdirectories:**
- `scanned/` - Test OCR accuracy and text normalization
- `multi-column/` - Test layout detection and reading order
- `tables/` - Test table extraction and structure
- `handwritten/` - Test handling of handwritten content
- `poor-quality/` - Test error handling and partial extraction
- `large-documents/` - Test performance and timeout handling

---

## Getting Started

### Quick Start - Comprehensive System (Recommended)

```bash
# Generate all documents (~10-15 minutes)
npx tsx scripts/generate-comprehensive-batch.ts

# Upload to test account
npx tsx scripts/upload-test-batch.ts
```

### Quick Start - Batch IEPs Only (Faster)

```bash
# Generate just IEPs (~5 minutes)
npx tsx scripts/generate-test-batch.ts

# Upload
npx tsx scripts/upload-test-batch.ts
```

---

## Adding Real Test Documents

If you need to test with real IEP documents:

### Step 1: Anonymize
Use a PDF editor to redact all PII before adding documents:
- Black out names, dates of birth
- Remove addresses, phone numbers
- Replace with placeholders: "[STUDENT NAME]", "[SCHOOL NAME]"

### Step 2: Categorize
Create the subdirectories if needed:
```bash
mkdir -p test-docs/real-samples/{scanned,multi-column,tables,handwritten,poor-quality,large-documents}
```

Place the document in the most relevant subdirectory based on its primary testing purpose.

### Step 3: Name Descriptively
Use naming convention: `category-description-pages.pdf`

Examples:
- `scanned-low-quality-15.pdf`
- `tables-service-delivery-complex-3.pdf`
- `large-full-iep-with-evals-87.pdf`

---

## Running Tests

### Manual Testing
```bash
# Upload a test document via UI
npm run dev
# Navigate to dashboard → Upload document → Select from test-docs/

# Monitor processing in Inngest dashboard
open http://localhost:8288
```

### Smoke Test Integration
```bash
# Test with specific document
npm run smoke-test -- --file=test-docs/generated/batch/emma-martinez-2024.pdf

# Test with all documents in a category
npm run smoke-test -- --dir=test-docs/generated/batch/
```

---

## Security Reminder

**Before adding ANY document:**
1. ✅ Verify all PII is removed
2. ✅ Check file is not password-protected
3. ✅ Confirm file size is reasonable (<50MB)
4. ✅ Test locally before committing

**This folder is gitignored, but be careful!**

---

## Questions?

- For comprehensive test system: See [`COMPREHENSIVE_TESTING.md`](./COMPREHENSIVE_TESTING.md)
- For batch IEP testing: See [`BATCH_TESTING.md`](./BATCH_TESTING.md)
- For generating custom synthetic documents: See `/scripts/generate-test-iep.ts`
