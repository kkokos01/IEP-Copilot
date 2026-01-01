# Test Documents

This directory contains real-world IEP documents for comprehensive testing of the document processing pipeline.

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

### `/scanned/`
**Purpose:** Test OCR accuracy and text normalization

Documents to include:
- Scanned PDFs with varying quality
- Documents with OCR artifacts (l/1, O/0 confusion)
- Low-resolution scans
- Grayscale vs. color scans

**Expected challenges:**
- Character recognition errors
- Ligature handling (fi, fl, ffi)
- Smart quotes vs. straight quotes
- Encoding issues

---

### `/multi-column/`
**Purpose:** Test layout detection and reading order

Documents to include:
- Two-column layouts
- Three-column layouts
- Mixed single/multi-column pages
- Nested columns

**Expected challenges:**
- Incorrect reading order
- Text blocks merged across columns
- Citation bbox calculation spanning columns

---

### `/tables/`
**Purpose:** Test table extraction and structure

Documents to include:
- Service delivery tables (frequency, duration, location)
- Goal tracking tables
- Accommodation lists in table format
- Complex nested tables

**Expected challenges:**
- Table cells merged incorrectly
- Header rows not detected
- Spanning cells causing layout issues

---

### `/handwritten/`
**Purpose:** Test handling of handwritten content

Documents to include:
- IEPs with handwritten notes
- Progress reports with handwritten comments
- Meeting notes with annotations
- Mixed typed/handwritten documents

**Expected challenges:**
- OCR may fail on handwritten sections
- Need to gracefully handle unextractable text
- User messaging about partial extraction

---

### `/poor-quality/`
**Purpose:** Test error handling and partial extraction

Documents to include:
- Low-resolution scans (<150 DPI)
- Faded or light text
- Skewed/rotated pages
- Stained or damaged documents

**Expected challenges:**
- Low OCR confidence scores
- Partial extraction failures
- Citation verification failures
- Need for clear user feedback

---

### `/large-documents/`
**Purpose:** Test performance and timeout handling

Documents to include:
- Full IEP with all evaluations (50-100+ pages)
- Complete case files
- Multi-year progress reports

**Expected challenges:**
- Processing timeouts
- Batching logic
- Memory usage
- Checkpoint/resume functionality

---

## Adding Test Documents

### Step 1: Anonymize
Use a PDF editor to redact all PII before adding documents:
- Black out names, dates of birth
- Remove addresses, phone numbers
- Replace with placeholders: "[STUDENT NAME]", "[SCHOOL NAME]"

### Step 2: Categorize
Place the document in the most relevant subdirectory based on its primary testing purpose.

### Step 3: Name Descriptively
Use naming convention: `category-description-pages.pdf`

Examples:
- `scanned-low-quality-15.pdf`
- `tables-service-delivery-complex-3.pdf`
- `large-full-iep-with-evals-87.pdf`

### Step 4: Document Expectations
Add an entry to `test-expectations.md` (see below) with:
- Filename
- What you're testing
- Known issues to expect
- Success criteria

---

## Test Expectations

Create a `test-expectations.md` file alongside this README with entries like:

```markdown
## scanned-low-quality-15.pdf
- **Testing**: OCR accuracy on low-resolution scans
- **Expected issues**: Some character confusion (l/1, O/0)
- **Success criteria**:
  - ✅ All pages extracted
  - ✅ >80% citation verification success
  - ✅ Fuzzy matching catches OCR errors

## tables-service-delivery-complex-3.pdf
- **Testing**: Complex nested table extraction
- **Expected issues**: Some table cells may merge incorrectly
- **Success criteria**:
  - ✅ Service hours extracted correctly
  - ✅ Table structure mostly preserved
  - ✅ Citations reference correct table cells
```

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
The smoke test script will be updated to accept a file path parameter:

```bash
# Test with specific document
npm run smoke-test -- --file=test-docs/scanned/low-quality-15.pdf

# Test with all documents in a category
npm run smoke-test -- --dir=test-docs/scanned/
```

---

## What Documents Do We Need?

### High Priority (Need ASAP)
- [ ] At least 2 scanned IEPs with OCR artifacts
- [ ] 1 document with service delivery tables
- [ ] 1 large document (50+ pages) for timeout testing

### Medium Priority (Nice to Have)
- [ ] Multi-column layout document
- [ ] Poor quality scan for error handling testing
- [ ] Document with handwritten notes

### Low Priority (Future Testing)
- [ ] Non-English documents (Spanish IEPs)
- [ ] Heavily redacted documents
- [ ] Documents with embedded images

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

If you're unsure whether a document is appropriate for testing:
1. Err on the side of caution - don't add it
2. Further anonymize if needed
3. Consider creating a synthetic document instead

For synthetic document generation, see: `/scripts/create-test-pdf.ts`
