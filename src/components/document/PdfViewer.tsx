'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// IMPORTANT: This worker config is required for Next.js 15 App Router
// The unpkg approach may fail - use import.meta.url instead
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface PdfViewerProps {
  url: string;
  pageNumber: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  highlightBbox?: BoundingBox | null;
  /** Text to search for and highlight in the PDF text layer */
  searchText?: string | null;
}

export function PdfViewer({
  url,
  pageNumber,
  onPageChange,
  totalPages,
  highlightBbox,
  searchText
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageWrapperRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textLayerReady, setTextLayerReady] = useState(false);

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

  // Normalize text for fuzzy matching (handles OCR variations)
  const normalizeText = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/['']/g, "'") // Normalize quotes
      .replace(/[""]/g, '"')
      .replace(/—/g, '-')    // Normalize dashes
      .replace(/–/g, '-')
      .trim();
  }, []);

  // Highlight matching text in the text layer
  const highlightTextInLayer = useCallback(() => {
    if (!searchText || !pageWrapperRef.current) return;

    const textLayer = pageWrapperRef.current.querySelector('.react-pdf__Page__textContent');
    if (!textLayer) {
      console.log('[PdfViewer] Text layer not found');
      return;
    }

    // Clear previous highlights
    const existingHighlights = textLayer.querySelectorAll('.citation-highlight');
    existingHighlights.forEach(el => {
      el.classList.remove('citation-highlight');
      (el as HTMLElement).style.backgroundColor = '';
    });

    const spans = textLayer.querySelectorAll('span');
    if (spans.length === 0) {
      console.log('[PdfViewer] No text spans found in layer');
      return;
    }

    // Build full page text and track span positions
    const spanData: { span: Element; start: number; end: number; text: string }[] = [];
    let fullText = '';

    spans.forEach((span) => {
      const text = span.textContent || '';
      spanData.push({
        span,
        start: fullText.length,
        end: fullText.length + text.length,
        text
      });
      fullText += text;
    });

    // Normalize search text and page text
    const normalizedSearch = normalizeText(searchText);
    const normalizedPage = normalizeText(fullText);

    // Find match in normalized text
    const matchStart = normalizedPage.indexOf(normalizedSearch);

    if (matchStart === -1) {
      // Try progressively shorter substrings (first 80%, 60%, 40% of text)
      const searchLengths = [0.8, 0.6, 0.4].map(p => Math.floor(normalizedSearch.length * p));

      for (const len of searchLengths) {
        if (len < 20) break; // Don't search for very short strings
        const partialSearch = normalizedSearch.substring(0, len);
        const partialMatch = normalizedPage.indexOf(partialSearch);

        if (partialMatch !== -1) {
          console.log(`[PdfViewer] Partial match found (${len}/${normalizedSearch.length} chars)`);
          highlightSpansInRange(spanData, partialMatch, partialMatch + len);
          scrollToHighlight();
          return;
        }
      }

      console.log('[PdfViewer] No text match found for:', searchText.substring(0, 50) + '...');
      return;
    }

    console.log('[PdfViewer] Text match found at position:', matchStart);
    highlightSpansInRange(spanData, matchStart, matchStart + normalizedSearch.length);
    scrollToHighlight();
  }, [searchText, normalizeText]);

  // Helper to highlight spans that fall within a character range
  const highlightSpansInRange = (
    spanData: { span: Element; start: number; end: number; text: string }[],
    rangeStart: number,
    rangeEnd: number
  ) => {
    spanData.forEach(({ span, start, end }) => {
      // Check if this span overlaps with our search range
      const spanOverlaps = start < rangeEnd && end > rangeStart;

      if (spanOverlaps) {
        span.classList.add('citation-highlight');
        (span as HTMLElement).style.backgroundColor = 'rgba(255, 213, 0, 0.5)';
        (span as HTMLElement).style.borderRadius = '2px';
      }
    });
  };

  // Scroll to first highlighted element
  const scrollToHighlight = () => {
    setTimeout(() => {
      const highlight = pageWrapperRef.current?.querySelector('.citation-highlight');
      if (highlight) {
        highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Re-run highlighting when text layer is ready or search text changes
  useEffect(() => {
    if (textLayerReady && searchText) {
      // Small delay to ensure text layer DOM is fully populated
      const timeout = setTimeout(highlightTextInLayer, 150);
      return () => clearTimeout(timeout);
    }
  }, [textLayerReady, searchText, highlightTextInLayer, pageNumber]);

  // Reset text layer ready state when page changes
  useEffect(() => {
    setTextLayerReady(false);
  }, [pageNumber]);

  const effectiveTotalPages = totalPages || numPages || 1;

  return (
    <div ref={containerRef} className="relative h-full overflow-auto bg-gray-100 rounded-lg">
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500 text-sm">Loading PDF...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
          <div className="text-red-600 text-center p-4">
            <p className="font-medium">Failed to load PDF</p>
            <p className="text-sm mt-1">{error}</p>
            <p className="text-xs mt-2 text-red-400">Try refreshing the page</p>
          </div>
        </div>
      )}

      <Document
        file={url}
        onLoadSuccess={({ numPages }) => {
          setNumPages(numPages);
          setLoading(false);
          setError(null);
        }}
        onLoadError={(err) => {
          console.error('PDF load error:', err);
          setError(err.message || 'Unknown error loading PDF');
          setLoading(false);
        }}
        className="flex justify-center py-4"
        loading={null} // We handle loading state ourselves
      >
        {/* CRITICAL: Wrapper div for highlight positioning */}
        {/* The highlight overlay must be inside this relative container */}
        <div ref={pageWrapperRef} className="relative inline-block">
          <Page
            pageNumber={pageNumber}
            width={containerWidth}
            renderTextLayer={true}
            renderAnnotationLayer={false}
            className="shadow-lg"
            loading={null}
            onRenderSuccess={() => {
              // Mark text layer as ready after a brief delay for DOM population
              setTimeout(() => setTextLayerReady(true), 50);
            }}
          />

          {/* Fallback: Highlight overlay for bbox-based highlighting */}
          {highlightBbox && !searchText && !loading && !error && (
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
        <div className="sticky bottom-4 left-0 right-0 flex justify-center">
          <div className="bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-4">
            <button
              onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
              className="disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 p-1 rounded transition-colors"
              aria-label="Previous page"
            >
              ◀
            </button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              Page {pageNumber} of {effectiveTotalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(effectiveTotalPages, pageNumber + 1))}
              disabled={pageNumber >= effectiveTotalPages}
              className="disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 p-1 rounded transition-colors"
              aria-label="Next page"
            >
              ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
