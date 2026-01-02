# Two-Pane UI Implementation Plan

**Document Purpose:** Bring a new assistant up to speed on the IEP Copilot codebase and provide implementation guidance for the two-pane findings/document viewer UI.

**Last Updated:** 2026-01-01
**Stable Commit:** `0195af2` (Functional MVP)
**Author:** Claude (continuing from planning session)

---

## Executive Summary

IEP Copilot is a **functional MVP** that successfully processes IEP documents end-to-end. The backend is complete - documents upload, text extracts via Google Document AI, Claude generates findings with citations, and citations are verified against source text with bounding boxes stored.

**The next major feature is a two-pane UI** showing findings on the left and the PDF document on the right, with citation highlighting. This document provides everything needed to implement it.

---

## Part 1: Current Codebase State

### What Works (MVP Achieved 2026-01-01)

1. **User uploads PDF** via UI → stored in Supabase Storage
2. **Google Document AI** extracts text using Layout Parser
3. **Claude analyzes** content in 15-page batches
4. **Findings generated** with categories, summaries, and questions
5. **Citations verified** using adaptive matching (exact → normalized → fuzzy)
6. **Bounding boxes stored** for each citation (critical for highlighting!)
7. **UI displays findings** in single-column expandable cards

### Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Next.js 15 (App Router) | `/src/app` directory structure |
| Database | Supabase (PostgreSQL) | Row Level Security enabled |
| Auth | Supabase Auth | Email/password, JWT tokens |
| Storage | Supabase Storage | `documents` bucket |
| AI - Extraction | Google Document AI | Layout Parser processor |
| AI - Analysis | Anthropic Claude | claude-sonnet-4-20250514 |
| Background Jobs | Inngest | Event-driven, auto-retry |
| Styling | Tailwind CSS 3.4 | No component library yet |
| Deployment | Vercel | Auto-deploy on push to main |

### Current Route Structure

```
/src/app/
├── page.tsx                    # Login page
├── layout.tsx                  # Root layout
├── globals.css                 # Tailwind imports
├── dashboard/
│   └── page.tsx               # Children & cases overview
├── case/[id]/
│   └── page.tsx               # Document list + upload
├── document/[id]/
│   └── page.tsx               # Findings display (REFACTOR TARGET)
└── api/
    ├── documents/upload/       # Upload API
    ├── inngest/               # Inngest webhook
    └── debug/auth/            # Auth debugging
```

**Important:** There is NO `/app` prefix in routes. The original plan suggested `/app/dashboard`, `/app/cases/[id]`, etc. - that was a design preference, not current reality. **Keep current routes** - migration cost isn't worth it.

### Component Structure

**CRITICAL:** There is currently **NO `/src/components` directory**. All UI is built inline within page files using raw Tailwind classes. This needs to be created before building the two-pane UI.

Current patterns in pages:
- Buttons: `<button className="px-4 py-2 bg-blue-600 text-white rounded-md...">`
- Badges: `<span className="px-2 py-1 text-xs font-medium rounded-full...">`
- Cards: `<div className="bg-white shadow rounded-lg p-6">`

---

## Part 2: Database Schema (What Supports Two-Pane UI)

### Key Tables

#### `documents`
```sql
id              uuid PRIMARY KEY
case_id         uuid REFERENCES cases(id)
type            text  -- 'iep', 'evaluation', 'progress_report', etc.
source_filename text
storage_path    text  -- Path in Supabase Storage
status          text  -- 'uploaded'|'processing'|'extracted'|'analyzing'|'complete'|'analysis_failed'|'failed'
page_count      integer
is_partial_extraction boolean
created_at      timestamptz
```

#### `findings`
```sql
id                  uuid PRIMARY KEY
document_id         uuid REFERENCES documents(id)
case_id             uuid REFERENCES cases(id)
status              text  -- 'active'|'needs_review'|'dismissed'|'addressed'
category            text  -- 'services'|'goals'|'accommodations'|'baseline'|'placement'|'procedural'|'timeline'|'other'
title               text
summary             text
why_it_matters      text
questions_to_ask    text[]  -- Array of strings
confidence          float   -- 0.0 to 1.0
needs_review_reason text
created_at          timestamptz
```

#### `citations` (CRITICAL FOR HIGHLIGHTING)
```sql
id                    uuid PRIMARY KEY
finding_id            uuid REFERENCES findings(id)
document_id           uuid REFERENCES documents(id)
page_number           integer        -- Which page the quote is on
quote_text            text           -- The exact quote
bbox                  jsonb          -- {x0, y0, x1, y1} normalized 0-1 coordinates
verification_status   text           -- 'pending'|'verified'|'failed'|'skipped'
verification_score    float          -- Confidence of the match
verification_method   text           -- 'exact'|'normalized'|'fuzzy'|'none'|'page_not_found'
created_at            timestamptz
```

#### `document_pages`
```sql
id                  uuid PRIMARY KEY
document_id         uuid REFERENCES documents(id)
page_number         integer
text                text           -- Full extracted text
text_normalized     text           -- OCR-normalized version
word_count          integer
image_storage_path  text           -- Optional rendered page image
confidence          float
```

#### `document_blocks`
```sql
id              uuid PRIMARY KEY
document_id     uuid REFERENCES documents(id)
page_number     integer
block_type      text           -- 'paragraph'|'heading'|'table'|'table_cell'|'list_item'|'other'
text            text
bbox            jsonb          -- {x0, y0, x1, y1} same as citations
reading_order   integer
```

### Bounding Box Format

Both `citations.bbox` and `document_blocks.bbox` use normalized coordinates:

```json
{
  "x0": 0.1,    // Left edge (10% from left)
  "y0": 0.2,    // Top edge (20% from top)
  "x1": 0.9,    // Right edge (90% from left)
  "y1": 0.25    // Bottom edge (25% from top)
}
```

To convert to CSS positioning on a PDF page:
```typescript
const style = {
  left: `${bbox.x0 * 100}%`,
  top: `${bbox.y0 * 100}%`,
  width: `${(bbox.x1 - bbox.x0) * 100}%`,
  height: `${(bbox.y1 - bbox.y0) * 100}%`,
};
```

---

## Part 3: Current Document Page Implementation

### File: `/src/app/document/[id]/page.tsx`

Current layout (single column):
```
┌─────────────────────────────────────────┐
│ ← Back to Case    Document Name         │
├─────────────────────────────────────────┤
│ Document Info Card                      │
│ (type, page count, status, dates)       │
├─────────────────────────────────────────┤
│ Findings Section                        │
│ ┌─────────────────────────────────────┐ │
│ │ Finding Card [Category Badge]       │ │
│ │ Title                               │ │
│ │ Summary text...                     │ │
│ │ Why it matters...                   │ │
│ │ Questions to ask: [list]            │ │
│ │ Confidence: 85%                     │ │
│ │ [Expand to show citations]          │ │
│ │   └─ Citation: Page 4, "Quote..."   │ │
│ │      [verified] [exact match]       │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Finding Card 2...                   │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### What's Missing for Two-Pane

1. **PDF Viewer component** - No react-pdf or similar
2. **Split pane layout** - Currently full-width single column
3. **Highlight overlay** - No component to draw bbox on PDF
4. **Page synchronization** - No state management for current page
5. **Evidence panel** - Citations shown inline, not in dedicated panel

---

## Part 4: Two-Pane UI Target Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Case    IEP - November 2024              [Print]      │
├───────────────────────────┬─────────────────────────────────────┤
│ Findings (35%)            │ Document Viewer (65%)               │
│                           │                                     │
│ ⚠ 2 of 12 pages could    │ ┌─────────────────────────────────┐ │
│   not be read             │ │                                 │ │
│                           │ │      [PDF Page Rendered]        │ │
│ [✓] Show only needs       │ │                                 │ │
│     review                │ │   ┌─────────────────────┐       │ │
│                           │ │   │ HIGHLIGHTED REGION  │       │ │
│ ▼ Services (3)            │ │   │ (yellow box)        │       │ │
│   ┌───────────────────┐   │ │   └─────────────────────┘       │ │
│   │ Speech therapy    │   │ │                                 │ │
│   │ reduced to 60min  │   │ │                                 │ │
│   │ ✓ Verified        │   │ └─────────────────────────────────┘ │
│   │ [Show evidence]   │   │                                     │
│   └───────────────────┘   │ Page 4 of 15  [◀] [▶]              │
│                           ├─────────────────────────────────────┤
│ ▼ Goals (5)               │ Evidence Panel (slides up)          │
│   ┌───────────────────┐   │ ┌─────────────────────────────────┐ │
│   │ Reading goal      │   │ │ "Speech and Language services   │ │
│   │ missing baseline  │   │ │ shall be provided for 60        │ │
│   │ ⚠ Needs Review   │   │ │ minutes per week..."            │ │
│   │ [Show evidence]   │   │ │                                 │ │
│   └───────────────────┘   │ │ Page 4 · ✓ Verified (exact)    │ │
│                           │ │ [◀ Prev] [Next ▶] (1 of 2)     │ │
│ ▶ Accommodations (2)      │ └─────────────────────────────────┘ │
└───────────────────────────┴─────────────────────────────────────┘
```

### Key Interactions

1. **Click finding** → Expands to show "Show evidence" button
2. **Click "Show evidence"** →
   - PDF jumps to citation's page
   - Highlight overlay draws bbox
   - Evidence panel slides up with quote text
3. **Click "Next" in evidence panel** → Cycles through citations
4. **Toggle "Show only needs review"** → Filters findings list
5. **Click page nav** → PDF changes page, clears highlight

---

## Part 5: Implementation Phases

### Phase 0: Component Foundation (Prerequisite)

**Create `/src/components` structure:**

```
/src/components/
├── ui/
│   ├── Button.tsx
│   ├── Badge.tsx
│   ├── Card.tsx
│   ├── Accordion.tsx
│   └── Toggle.tsx
├── layout/
│   ├── PageHeader.tsx
│   └── TwoPaneLayout.tsx
└── document/
    ├── FindingsPanel.tsx
    ├── FindingCard.tsx
    ├── FindingsByCategory.tsx
    ├── PdfViewer.tsx
    ├── HighlightOverlay.tsx
    ├── EvidencePanel.tsx
    └── CitationCard.tsx
```

**Recommendation:** Install shadcn/ui for primitives:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button badge card accordion
```

### Phase 1: Two-Pane Layout Shell

**Goal:** Get the split layout working with placeholder content.

```tsx
// /src/app/document/[id]/page.tsx
export default function DocumentPage({ params }: { params: { id: string } }) {
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <PageHeader
        title={document.source_filename}
        backLink={`/case/${document.case_id}`}
      />

      {/* Two-pane content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Findings */}
        <div className="w-[35%] border-r overflow-y-auto p-4">
          <FindingsPanel
            findings={findings}
            selectedFinding={selectedFinding}
            onSelectFinding={setSelectedFinding}
          />
        </div>

        {/* Right: Document + Evidence */}
        <div className="w-[65%] flex flex-col">
          <div className="flex-1 bg-gray-100 p-4">
            {/* PDF placeholder initially */}
            <div className="bg-white h-full rounded-lg shadow flex items-center justify-center">
              PDF Viewer - Page {currentPage}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Phase 2: PDF Viewer Integration

**Install react-pdf:**
```bash
npm install react-pdf
```

**Create PdfViewer component:**
```tsx
// /src/components/document/PdfViewer.tsx
'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Required for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PdfViewerProps {
  url: string;
  pageNumber: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}

export function PdfViewer({ url, pageNumber, onPageChange, totalPages }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);

  return (
    <div className="relative bg-gray-200 rounded-lg overflow-hidden">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        className="flex justify-center"
      >
        <Page
          pageNumber={pageNumber}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="shadow-lg"
        />
      </Document>

      {/* Page navigation */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full shadow px-4 py-2 flex items-center gap-4">
        <button
          onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
          disabled={pageNumber <= 1}
          className="disabled:opacity-50"
        >
          ◀
        </button>
        <span className="text-sm">
          Page {pageNumber} of {totalPages || numPages || '?'}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, pageNumber + 1))}
          disabled={pageNumber >= totalPages}
          className="disabled:opacity-50"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
```

**Get signed URL for PDF:**
```typescript
// In your page or API
const { data: signedUrl } = await supabase.storage
  .from('documents')
  .createSignedUrl(document.storage_path, 3600); // 1 hour expiry
```

### Phase 3: Citation Highlighting

**Create HighlightOverlay component:**
```tsx
// /src/components/document/HighlightOverlay.tsx
interface HighlightOverlayProps {
  bbox: { x0: number; y0: number; x1: number; y1: number };
  color?: string;
}

export function HighlightOverlay({ bbox, color = 'rgba(255, 213, 0, 0.3)' }: HighlightOverlayProps) {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${bbox.x0 * 100}%`,
    top: `${bbox.y0 * 100}%`,
    width: `${(bbox.x1 - bbox.x0) * 100}%`,
    height: `${(bbox.y1 - bbox.y0) * 100}%`,
    backgroundColor: color,
    border: '2px solid #f59e0b',
    pointerEvents: 'none',
    transition: 'all 0.2s ease-in-out',
  };

  return <div style={style} className="animate-pulse" />;
}
```

**Integrate with PdfViewer:**
```tsx
<div className="relative">
  <Document file={url}>
    <Page pageNumber={pageNumber} />
  </Document>

  {highlightedCitation?.bbox && highlightedCitation.page_number === pageNumber && (
    <HighlightOverlay bbox={highlightedCitation.bbox} />
  )}
</div>
```

### Phase 4: Evidence Panel

**Create EvidencePanel component:**
```tsx
// /src/components/document/EvidencePanel.tsx
interface EvidencePanelProps {
  citations: Citation[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

export function EvidencePanel({ citations, currentIndex, onNavigate, onClose }: EvidencePanelProps) {
  const citation = citations[currentIndex];

  if (!citation) return null;

  return (
    <div className="border-t bg-white p-4 shadow-lg animate-slide-up">
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm text-gray-500">
          Evidence {currentIndex + 1} of {citations.length}
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>

      <blockquote className="text-gray-800 italic border-l-4 border-blue-500 pl-4 my-3">
        "{citation.quote_text}"
      </blockquote>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Page {citation.page_number}</span>
          <VerificationBadge
            status={citation.verification_status}
            method={citation.verification_method}
          />
        </div>

        {citations.length > 1 && (
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              ◀ Prev
            </button>
            <button
              onClick={() => onNavigate(currentIndex + 1)}
              disabled={currentIndex === citations.length - 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              Next ▶
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Phase 5: Trust Features

1. **"Show only needs review" toggle:**
```tsx
const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(false);

const filteredFindings = showOnlyNeedsReview
  ? findings.filter(f => f.status === 'needs_review')
  : findings;
```

2. **Verification badges:**
```tsx
function VerificationBadge({ status, method }: { status: string; method: string }) {
  const colors = {
    verified: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colors[status]}`}>
      {status === 'verified' ? `✓ Verified (${method})` : status}
    </span>
  );
}
```

3. **Print stylesheet** (add to globals.css):
```css
@media print {
  /* Hide navigation and controls */
  .no-print { display: none !important; }

  /* Show findings in single column */
  .print-findings {
    width: 100% !important;
    page-break-inside: avoid;
  }

  /* Include citations inline */
  .print-citation {
    border-left: 3px solid #3b82f6;
    padding-left: 1rem;
    margin: 0.5rem 0;
  }
}
```

---

## Part 6: State Management

### Recommended State Structure

```tsx
// In document/[id]/page.tsx

// Data (fetched)
const [document, setDocument] = useState<Document | null>(null);
const [findings, setFindings] = useState<Finding[]>([]);
const [citations, setCitations] = useState<Citation[]>([]);

// UI state
const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
const [currentPage, setCurrentPage] = useState(1);
const [currentCitationIndex, setCurrentCitationIndex] = useState(0);
const [showEvidencePanel, setShowEvidencePanel] = useState(false);
const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(false);

// Derived
const selectedFinding = findings.find(f => f.id === selectedFindingId);
const selectedCitations = citations.filter(c => c.finding_id === selectedFindingId);
const currentCitation = selectedCitations[currentCitationIndex];

// Actions
const handleShowEvidence = (findingId: string) => {
  setSelectedFindingId(findingId);
  setCurrentCitationIndex(0);
  setShowEvidencePanel(true);

  // Jump to first citation's page
  const firstCitation = citations.find(c => c.finding_id === findingId);
  if (firstCitation) {
    setCurrentPage(firstCitation.page_number);
  }
};

const handleCitationNavigate = (index: number) => {
  setCurrentCitationIndex(index);
  const citation = selectedCitations[index];
  if (citation) {
    setCurrentPage(citation.page_number);
  }
};
```

---

## Part 7: Data Fetching

### Current Pattern (in page.tsx)

```typescript
// Server component data fetching
async function getDocumentData(documentId: string) {
  const supabase = createServerClient();

  const [docResult, findingsResult, citationsResult] = await Promise.all([
    supabase
      .from('documents')
      .select('*, cases(child_id, children(name))')
      .eq('id', documentId)
      .single(),

    supabase
      .from('findings')
      .select('*')
      .eq('document_id', documentId)
      .order('category')
      .order('created_at'),

    supabase
      .from('citations')
      .select('*')
      .eq('document_id', documentId),
  ]);

  return {
    document: docResult.data,
    findings: findingsResult.data || [],
    citations: citationsResult.data || [],
  };
}
```

### PDF URL Generation

```typescript
// Get signed URL for PDF viewing
async function getPdfUrl(storagePath: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 3600); // 1 hour

  if (error) throw error;
  return data.signedUrl;
}
```

---

## Part 8: Responsive Design

### Desktop (>1024px)
- True two-pane: 35% findings | 65% document
- Evidence panel slides up from bottom of right pane

### Tablet (768px - 1024px)
- Stacked with tabs: [Findings] [Document]
- Switch between views
- Evidence panel as modal

### Mobile (<768px)
- Single column, findings first
- "View in document" button opens PDF in new view
- Evidence as bottom sheet

```tsx
// Responsive wrapper
<div className="flex flex-col lg:flex-row h-screen">
  {/* Findings - full width on mobile, 35% on desktop */}
  <div className="w-full lg:w-[35%] lg:border-r overflow-y-auto">
    <FindingsPanel ... />
  </div>

  {/* Document - hidden on mobile by default, 65% on desktop */}
  <div className="hidden lg:flex lg:w-[65%] flex-col">
    <PdfViewer ... />
  </div>
</div>
```

---

## Part 9: Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `/src/components/ui/Button.tsx` | Reusable button (or use shadcn) |
| `/src/components/ui/Badge.tsx` | Status badges |
| `/src/components/ui/Card.tsx` | Card container |
| `/src/components/ui/Accordion.tsx` | Collapsible sections |
| `/src/components/layout/PageHeader.tsx` | Page header with back button |
| `/src/components/document/FindingsPanel.tsx` | Left pane container |
| `/src/components/document/FindingCard.tsx` | Individual finding |
| `/src/components/document/FindingsByCategory.tsx` | Grouped accordion |
| `/src/components/document/PdfViewer.tsx` | PDF rendering |
| `/src/components/document/HighlightOverlay.tsx` | Bbox highlight |
| `/src/components/document/EvidencePanel.tsx` | Citation details |
| `/src/components/document/VerificationBadge.tsx` | Status pill |

### Modified Files

| File | Changes |
|------|---------|
| `/src/app/document/[id]/page.tsx` | Refactor to two-pane layout |
| `/src/app/globals.css` | Add print styles, animations |
| `/package.json` | Add react-pdf dependency |

---

## Part 10: Key Decisions Required

Before implementation, decide:

1. **Component library?**
   - Option A: Add shadcn/ui (recommended - faster, accessible)
   - Option B: Build primitives from scratch (more control, slower)

2. **PDF rendering approach?**
   - Option A: react-pdf client-side (recommended - simpler)
   - Option B: Server-rendered page images (already have code, more complex)

3. **State management?**
   - Option A: useState in page component (fine for MVP)
   - Option B: Zustand/Jotai (if state gets complex)

4. **Mobile approach?**
   - Option A: Responsive two-pane (recommended)
   - Option B: Separate mobile routes

---

## Part 11: Success Criteria

The two-pane UI is complete when:

- [ ] User can see findings list on left, PDF on right (desktop)
- [ ] Clicking "Show evidence" jumps PDF to correct page
- [ ] Citation bbox is highlighted on PDF page
- [ ] Evidence panel shows quote text and verification status
- [ ] "Next/Prev" navigates between citations
- [ ] "Show only needs review" filters findings
- [ ] Print view shows findings with inline citations
- [ ] Mobile view is usable (stacked or tabbed)

---

## Appendix: Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Run linter

# Database
npx supabase db reset    # Reset local DB
npx supabase gen types   # Regenerate TypeScript types

# Deployment
git push origin main     # Auto-deploys to Vercel
```

---

## Appendix: Reference Files

| Document | Location | Purpose |
|----------|----------|---------|
| Project overview | `/reference/PROJECT.md` | Status, stack, health |
| Architecture decisions | `/reference/DECISIONS.md` | ADRs for key choices |
| TODO/Roadmap | `/reference/TODO.md` | Current sprint items |
| Database schema | `/supabase/migrations/001_init_iep_copilot.sql` | Full schema |
| Document AI integration | `/src/lib/docai.ts` | Text extraction |
| Findings generation | `/src/inngest/functions/generateFindings.ts` | AI analysis |

---

*This document should provide sufficient context for any assistant to implement the two-pane UI without needing to re-explore the codebase.*
