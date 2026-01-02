'use client';

import { Database } from '@/types/supabase';

type Citation = Database['public']['Tables']['citations']['Row'];

interface EvidencePanelProps {
  citations: Citation[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

export function EvidencePanel({
  citations,
  currentIndex,
  onNavigate,
  onClose,
}: EvidencePanelProps) {
  const citation = citations[currentIndex];
  if (!citation) return null;

  const verificationColors: Record<string, string> = {
    verified: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    skipped: 'bg-gray-100 text-gray-600',
  };

  const verificationLabels: Record<string, string> = {
    verified: 'Verified',
    failed: 'Not Found',
    pending: 'Pending',
    skipped: 'Skipped',
  };

  return (
    <div className="border-t bg-white shadow-lg animate-in slide-in-from-bottom duration-200">
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              Evidence {currentIndex + 1} of {citations.length}
            </span>
            <span className="text-sm text-gray-500">
              Page {citation.page_number}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close evidence panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quote */}
        <blockquote className="text-gray-800 border-l-4 border-blue-500 pl-4 py-2 my-3 bg-blue-50 rounded-r">
          <p className="italic text-sm leading-relaxed">
            &ldquo;{citation.quote_text}&rdquo;
          </p>
        </blockquote>

        {/* Footer with verification and navigation */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                verificationColors[citation.verification_status] || verificationColors.pending
              }`}
            >
              {citation.verification_status === 'verified' && '✓ '}
              {verificationLabels[citation.verification_status] || citation.verification_status}
            </span>
            {(citation as any).verification_method && citation.verification_status === 'verified' && (
              <span className="text-xs text-gray-500">
                ({(citation as any).verification_method} match)
              </span>
            )}
          </div>

          {/* Navigation buttons */}
          {citations.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                ◀ Prev
              </button>
              <button
                onClick={() => onNavigate(currentIndex + 1)}
                disabled={currentIndex === citations.length - 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next ▶
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
