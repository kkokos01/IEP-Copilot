# Two-Pane UI Implementation Plan

**Document Purpose:** Bring a new assistant up to speed on the IEP Copilot codebase and provide implementation guidance for the two-pane findings/document viewer UI.

**Last Updated:** 2026-01-01
**Stable Commit:** `0195af2` (Functional MVP)
**Author:** Claude (continuing from planning session)
**Reviewed By:** External assistant (feedback incorporated)

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
confidence          float   -- 0.0 to 1.0 (YES, this IS populated - show in UI as subtle indicator)
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

### ⚠️ CRITICAL: Phase Order Rationale

**PDF rendering is the highest-risk item.** If react-pdf has issues with Next.js 15 App Router, signed URLs, or CORS, you need to know immediately - not after building all the components. The phases below are ordered by risk.

---

### Phase 1: PDF Rendering Proof-of-Concept (HIGHEST RISK - DO FIRST)

**Goal:** Prove PDF rendering works before building anything else.

**Install react-pdf:**
```bash
npm install react-pdf
```

**Create minimal PdfViewer component:**
```tsx
// /src/components/document/PdfViewer.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
// Note: CSS paths changed in react-pdf v10
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// IMPORTANT: This worker config is required for Next.js 15 App Router
// The unpkg approach may fail - use import.meta.url instead
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfViewerProps {
  url: string;
  pageNumber: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  highlightBbox?: { x0: number; y0: number; x1: number; y1: number } | null;
}

export function PdfViewer({
  url,
  pageNumber,
  onPageChange,
  totalPages,
  highlightBbox
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Measure container width for responsive PDF sizing
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32); // Account for padding
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <div ref={containerRef} className="relative h-full overflow-auto bg-gray-200 rounded-lg">
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-pulse text-gray-500">Loading PDF...</div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
          <div className="text-red-600 text-center p-4">
            <p className="font-medium">Failed to load PDF</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <Document
        file={url}
        onLoadSuccess={({ numPages }) => {
          setNumPages(numPages);
          setLoading(false);
        }}
        onLoadError={(err) => {
          setError(err.message);
          setLoading(false);
        }}
        className="flex justify-center py-4"
      >
        {/* CRITICAL: Wrapper div for highlight positioning */}
        {/* The highlight overlay must be inside this relative container */}
        <div className="relative inline-block">
          <Page
            pageNumber={pageNumber}
            width={containerWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-lg"
          />

          {/* Highlight overlay - positioned relative to the Page */}
          {highlightBbox && (
            <div
              style={{
                position: 'absolute',
                left: `${highlightBbox.x0 * 100}%`,
                top: `${highlightBbox.y0 * 100}%`,
                width: `${(highlightBbox.x1 - highlightBbox.x0) * 100}%`,
                height: `${(highlightBbox.y1 - highlightBbox.y0) * 100}%`,
                backgroundColor: 'rgba(255, 213, 0, 0.3)',
                border: '2px solid #f59e0b',
                pointerEvents: 'none',
                transition: 'all 0.2s ease-in-out',
              }}
              className="animate-pulse"
            />
          )}
        </div>
      </Document>

      {/* Page navigation */}
      {!loading && !error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-4">
          <button
            onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
            className="disabled:opacity-50 hover:bg-gray-100 p-1 rounded"
          >
            ◀
          </button>
          <span className="text-sm font-medium">
            Page {pageNumber} of {totalPages || numPages || '?'}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages || numPages || 1, pageNumber + 1))}
            disabled={pageNumber >= (totalPages || numPages || 1)}
            className="disabled:opacity-50 hover:bg-gray-100 p-1 rounded"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}
```

**Test in isolation before proceeding:**
```tsx
// Temporary test in document/[id]/page.tsx
const { data: signedUrl } = await supabase.storage
  .from('documents')
  .createSignedUrl(document.storage_path, 3600);

return (
  <div className="h-screen">
    <PdfViewer
      url={signedUrl.signedUrl}
      pageNumber={1}
      onPageChange={() => {}}
      totalPages={document.page_count}
    />
  </div>
);
```

**If this fails:** Debug CORS, signed URLs, or worker configuration before continuing.

---

### Phase 2: Two-Pane Layout Shell

**Goal:** Get the split layout working with the proven PDF viewer.

```tsx
// /src/app/document/[id]/page.tsx
export default function DocumentPage({ params }: { params: { id: string } }) {
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <Link href={`/case/${document.case_id}`} className="text-blue-600 hover:underline">
          ← Back to Case
        </Link>
        <h1 className="font-medium">{document.source_filename}</h1>
        <button className="text-gray-600">Print</button>
      </header>

      {/* Two-pane content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Findings - 35% on desktop, full on mobile */}
        <div className="w-full md:w-[35%] border-r overflow-y-auto p-4">
          <p className="text-gray-500">Findings panel coming next...</p>
        </div>

        {/* Right: Document - hidden on mobile, 65% on desktop */}
        <div className="hidden md:flex md:w-[65%] flex-col">
          <PdfViewer
            url={pdfUrl}
            pageNumber={currentPage}
            onPageChange={setCurrentPage}
            totalPages={document.page_count}
          />
        </div>
      </div>
    </div>
  );
}
```

---

### Phase 3: Basic FindingsPanel (Data Display)

**Goal:** Show findings grouped by category, no styling polish yet.

```tsx
// /src/components/document/FindingsPanel.tsx
interface FindingsPanelProps {
  findings: Finding[];
  citations: Citation[];
  onShowEvidence: (findingId: string) => void;
  selectedFindingId: string | null;
}

export function FindingsPanel({
  findings,
  citations,
  onShowEvidence,
  selectedFindingId
}: FindingsPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['services', 'goals']) // Default expanded
  );
  const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(false);

  // Group findings by category
  const groupedFindings = findings.reduce((acc, finding) => {
    if (showOnlyNeedsReview && finding.status !== 'needs_review') return acc;
    const category = finding.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(finding);
    return acc;
  }, {} as Record<string, Finding[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter toggle */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showOnlyNeedsReview}
          onChange={(e) => setShowOnlyNeedsReview(e.target.checked)}
          className="rounded"
        />
        Show only needs review
      </label>

      {/* Category accordions */}
      {Object.entries(groupedFindings).map(([category, categoryFindings]) => (
        <div key={category} className="border rounded-lg">
          <button
            onClick={() => toggleCategory(category)}
            className="w-full px-4 py-3 flex items-center justify-between text-left font-medium"
          >
            <span className="capitalize">{category} ({categoryFindings.length})</span>
            <span>{expandedCategories.has(category) ? '▼' : '▶'}</span>
          </button>

          {expandedCategories.has(category) && (
            <div className="px-4 pb-4 space-y-3">
              {categoryFindings.map(finding => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  citations={citations.filter(c => c.finding_id === finding.id)}
                  isSelected={finding.id === selectedFindingId}
                  onShowEvidence={() => onShowEvidence(finding.id)}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

### Phase 4: Wire Up "Show Evidence" → Page Jump + Highlight

**Goal:** Connect finding selection to PDF navigation and highlighting.

```tsx
// In document/[id]/page.tsx - state management
const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
const [currentPage, setCurrentPage] = useState(1);
const [currentCitationIndex, setCurrentCitationIndex] = useState(0);
const [showEvidencePanel, setShowEvidencePanel] = useState(false);

// Derived state
const selectedCitations = citations.filter(c => c.finding_id === selectedFindingId);
const currentCitation = selectedCitations[currentCitationIndex];

// Action: show evidence for a finding
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

// Action: navigate between citations
const handleCitationNavigate = (index: number) => {
  setCurrentCitationIndex(index);
  const citation = selectedCitations[index];
  if (citation) {
    setCurrentPage(citation.page_number);
  }
};

// Pass highlight to PDF viewer
<PdfViewer
  url={pdfUrl}
  pageNumber={currentPage}
  onPageChange={(page) => {
    setCurrentPage(page);
    // Clear highlight when manually changing pages
    if (!selectedCitations.some(c => c.page_number === page)) {
      setShowEvidencePanel(false);
    }
  }}
  totalPages={document.page_count}
  highlightBbox={showEvidencePanel && currentCitation?.page_number === currentPage
    ? currentCitation.bbox
    : null}
/>
```

---

### Phase 5: Evidence Panel

**Goal:** Add the slide-up panel showing citation details.

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
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close evidence panel"
        >
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

function VerificationBadge({ status, method }: { status: string; method: string }) {
  const colors: Record<string, string> = {
    verified: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    skipped: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || colors.pending}`}>
      {status === 'verified' ? `✓ Verified (${method})` : status}
    </span>
  );
}
```

---

### Phase 6: Polish & Trust Features

**Goal:** Refine styling, add trust features.

1. **FindingCard styling** - Category colors, confidence indicator
2. **"Show only needs review" toggle** - Already in FindingsPanel
3. **Partial extraction warning** - Show if `document.is_partial_extraction`
4. **Print stylesheet** - See Part 12

---

### Phase 7: Accessibility & Keyboard Navigation

**Goal:** Make the UI accessible.

1. **Escape** closes evidence panel
2. **Arrow Left/Right** navigates citations when panel is open
3. **Arrow Up/Down** navigates findings
4. **Enter** on finding expands and shows evidence

```tsx
// Add to document/[id]/page.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showEvidencePanel) {
      setShowEvidencePanel(false);
    }
    if (showEvidencePanel && selectedCitations.length > 1) {
      if (e.key === 'ArrowLeft') {
        handleCitationNavigate(Math.max(0, currentCitationIndex - 1));
      }
      if (e.key === 'ArrowRight') {
        handleCitationNavigate(Math.min(selectedCitations.length - 1, currentCitationIndex + 1));
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [showEvidencePanel, currentCitationIndex, selectedCitations.length]);
```

---

## Part 6: State Management

### Recommended State Structure

```tsx
// In document/[id]/page.tsx

// Data (fetched on server)
// Using nested query for efficiency
const { document, findings } = await getDocumentData(documentId);

// UI state
const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
const [currentPage, setCurrentPage] = useState(1);
const [currentCitationIndex, setCurrentCitationIndex] = useState(0);
const [showEvidencePanel, setShowEvidencePanel] = useState(false);
const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(false);
const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
  new Set(['services', 'goals']) // Default expanded
);

// Derived state
const selectedFinding = findings.find(f => f.id === selectedFindingId);
const selectedCitations = selectedFinding?.citations || [];
const currentCitation = selectedCitations[currentCitationIndex];
```

---

## Part 7: Data Fetching

### Optimized Pattern (nested query)

```typescript
// Server component data fetching - JOIN findings and citations
async function getDocumentData(documentId: string) {
  const supabase = createServerClient();

  const [docResult, findingsResult] = await Promise.all([
    supabase
      .from('documents')
      .select('*, cases(child_id, children(name))')
      .eq('id', documentId)
      .single(),

    // Nested query: findings with their citations
    supabase
      .from('findings')
      .select(`
        *,
        citations (*)
      `)
      .eq('document_id', documentId)
      .order('category')
      .order('created_at'),
  ]);

  // Get signed URL for PDF
  const { data: signedUrl } = await supabase.storage
    .from('documents')
    .createSignedUrl(docResult.data?.storage_path || '', 3600);

  return {
    document: docResult.data,
    findings: findingsResult.data || [],
    pdfUrl: signedUrl?.signedUrl || '',
  };
}
```

---

## Part 8: Error & Loading States

### PDF Viewer States

| State | Display |
|-------|---------|
| Loading | Skeleton placeholder with pulsing animation |
| Error (CORS) | "Unable to load PDF. Please try refreshing." |
| Error (expired URL) | "Session expired. Please refresh the page." |
| Error (corrupted) | "This PDF cannot be displayed. The file may be corrupted." |

### Findings States

| State | Display |
|-------|---------|
| Loading | Skeleton cards with pulsing animation |
| Empty (no findings) | "No findings were identified in this document." |
| Empty (filtered) | "No findings need review. Clear the filter to see all." |
| Partial extraction | Yellow banner: "Some pages could not be read. Findings may be incomplete." |

### Implementation

```tsx
// Skeleton loader for findings
function FindingsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="border rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-full mb-1" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

// Error boundary wrapper
function ErrorBoundary({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  // Use React's error boundary or react-error-boundary package
}
```

---

## Part 9: Responsive Design

### Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Desktop | >1024px | True two-pane: 35% | 65% |
| Large tablet | 900px - 1024px | Narrower two-pane: 40% | 60% |
| Small tablet | 768px - 900px | Stacked with tabs |
| Mobile | <768px | Single column, findings first |

### Tablet Strategy (Clarified)

**Keep side-by-side down to 900px** for simplicity. Below 900px, use tabs:

```tsx
// Responsive layout
<div className="flex flex-col h-screen">
  {/* Mobile/small tablet: Tab navigation */}
  <div className="md:hidden border-b">
    <button
      className={activeTab === 'findings' ? 'border-b-2 border-blue-500' : ''}
      onClick={() => setActiveTab('findings')}
    >
      Findings
    </button>
    <button
      className={activeTab === 'document' ? 'border-b-2 border-blue-500' : ''}
      onClick={() => setActiveTab('document')}
    >
      Document
    </button>
  </div>

  {/* Content */}
  <div className="flex-1 flex overflow-hidden">
    {/* Findings pane */}
    <div className={`
      ${activeTab === 'findings' ? 'block' : 'hidden'}
      md:block md:w-[40%] lg:w-[35%] border-r overflow-y-auto
    `}>
      <FindingsPanel ... />
    </div>

    {/* Document pane */}
    <div className={`
      ${activeTab === 'document' ? 'block' : 'hidden'}
      md:block md:w-[60%] lg:w-[65%] flex flex-col
    `}>
      <PdfViewer ... />
      {showEvidencePanel && <EvidencePanel ... />}
    </div>
  </div>
</div>
```

**Smart tab switching:** When user clicks "Show evidence" on mobile/tablet, auto-switch to Document tab.

---

## Part 10: URL State Sync (Optional Enhancement)

### Benefits
- Shareable links to specific findings/pages
- Browser back/forward works
- Refresh preserves position

### Implementation

```tsx
// URL pattern: /document/abc123?page=4&finding=xyz789

import { useSearchParams, useRouter } from 'next/navigation';

const searchParams = useSearchParams();
const router = useRouter();

// Read from URL on mount
useEffect(() => {
  const page = searchParams.get('page');
  const finding = searchParams.get('finding');
  if (page) setCurrentPage(parseInt(page));
  if (finding) {
    setSelectedFindingId(finding);
    setShowEvidencePanel(true);
  }
}, []);

// Update URL when state changes
useEffect(() => {
  const params = new URLSearchParams();
  if (currentPage > 1) params.set('page', currentPage.toString());
  if (selectedFindingId) params.set('finding', selectedFindingId);

  const newUrl = params.toString()
    ? `${pathname}?${params.toString()}`
    : pathname;

  router.replace(newUrl, { scroll: false });
}, [currentPage, selectedFindingId]);
```

---

## Part 11: Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `/src/lib/types/findings.ts` | TypeScript types for Finding, Citation, etc. |
| `/src/components/ui/Button.tsx` | Reusable button (or use shadcn) |
| `/src/components/ui/Badge.tsx` | Status badges |
| `/src/components/ui/Card.tsx` | Card container |
| `/src/components/ui/Accordion.tsx` | Collapsible sections |
| `/src/components/ui/Skeleton.tsx` | Loading placeholders |
| `/src/components/layout/PageHeader.tsx` | Page header with back button |
| `/src/components/document/FindingsPanel.tsx` | Left pane container |
| `/src/components/document/FindingCard.tsx` | Individual finding |
| `/src/components/document/FindingsByCategory.tsx` | Grouped accordion |
| `/src/components/document/PdfViewer.tsx` | PDF rendering |
| `/src/components/document/EvidencePanel.tsx` | Citation details |
| `/src/components/document/VerificationBadge.tsx` | Status pill |

### Modified Files

| File | Changes |
|------|---------|
| `/src/app/document/[id]/page.tsx` | Refactor to two-pane layout |
| `/src/app/globals.css` | Add print styles, animations |
| `/package.json` | Add react-pdf dependency |
| `next.config.js` | May need webpack config for pdf.js worker |

---

## Part 12: Print Stylesheet

```css
/* Add to globals.css */

@media print {
  /* Hide navigation and interactive elements */
  .no-print,
  button,
  nav,
  .pdf-viewer {
    display: none !important;
  }

  /* Reset layout to single column */
  .two-pane-layout {
    display: block !important;
  }

  /* Show findings in full width */
  .findings-panel {
    width: 100% !important;
    max-width: none !important;
  }

  /* Style findings for print */
  .finding-card {
    page-break-inside: avoid;
    border: 1px solid #e5e7eb;
    margin-bottom: 1rem;
    padding: 1rem;
  }

  /* Show all citations inline */
  .citation-inline {
    display: block !important;
    border-left: 3px solid #3b82f6;
    padding-left: 1rem;
    margin: 0.5rem 0;
    font-style: italic;
  }

  /* Page footer */
  @page {
    margin: 1in;
  }
}
```

---

## Part 13: Key Decisions Required

Before implementation, decide:

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| Component library | **shadcn/ui** | Fast, accessible, customizable with Tailwind |
| PDF rendering | **react-pdf client-side** | Simpler, signed URLs already working |
| State management | **useState for MVP** | Migrate to Zustand only if needed |
| Mobile approach | **Responsive two-pane** | Single codebase, test on real devices |

---

## Part 14: Success Criteria

The two-pane UI is complete when:

- [ ] PDF renders correctly in right pane (Phase 1 gate)
- [ ] User can see findings list on left, PDF on right (desktop)
- [ ] Clicking "Show evidence" jumps PDF to correct page
- [ ] Citation bbox is highlighted on PDF page
- [ ] Evidence panel shows quote text and verification status
- [ ] "Next/Prev" navigates between citations
- [ ] "Show only needs review" filters findings
- [ ] Loading states show skeletons, not spinners
- [ ] Error states have helpful messages
- [ ] Keyboard navigation works (Escape, arrows)
- [ ] Print view shows findings with inline citations
- [ ] Mobile/tablet view is usable (stacked or tabbed)

---

## Appendix A: Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Run linter

# Database
npx supabase db reset    # Reset local DB
npx supabase gen types   # Regenerate TypeScript types

# shadcn/ui (if using)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button badge card accordion

# Deployment
git push origin main     # Auto-deploys to Vercel
```

---

## Appendix B: Reference Files

| Document | Location | Purpose |
|----------|----------|---------|
| Project overview | `/reference/PROJECT.md` | Status, stack, health |
| Architecture decisions | `/reference/DECISIONS.md` | ADRs for key choices |
| TODO/Roadmap | `/reference/TODO.md` | Current sprint items |
| Database schema | `/supabase/migrations/001_init_iep_copilot.sql` | Full schema |
| Document AI integration | `/src/lib/docai.ts` | Text extraction |
| Findings generation | `/src/inngest/functions/generateFindings.ts` | AI analysis |

---

## Appendix C: Changelog

| Date | Changes |
|------|---------|
| 2026-01-01 | Initial version |
| 2026-01-01 | Incorporated external review feedback: reordered phases (PDF first), fixed worker config, fixed highlight positioning, added error/loading states, clarified tablet strategy, added keyboard nav, added URL sync option |

---

*This document should provide sufficient context for any assistant to implement the two-pane UI without needing to re-explore the codebase.*
