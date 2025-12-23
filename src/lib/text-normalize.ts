// src/lib/text-normalize.ts
// Robust text normalization for OCR output and quote verification

/**
 * Common OCR issues and their fixes:
 * - Ligatures (ﬁ → fi, ﬂ → fl, ﬀ → ff, etc.)
 * - Smart quotes (" " ' ' → " ')
 * - Various dashes (– — ‐ ‑ → -)
 * - Zero-width characters
 * - Line-break hyphenation
 * - Inconsistent whitespace
 * - Common OCR misreads (l/1, O/0, rn/m)
 */

// Ligature mappings
const LIGATURES: Record<string, string> = {
  'ﬁ': 'fi',
  'ﬂ': 'fl',
  'ﬀ': 'ff',
  'ﬃ': 'ffi',
  'ﬄ': 'ffl',
  'ﬅ': 'st',
  'ﬆ': 'st',
  'Ꜳ': 'AA',
  'ꜳ': 'aa',
  'Æ': 'AE',
  'æ': 'ae',
  'Œ': 'OE',
  'œ': 'oe',
};

// Quote normalization
const QUOTES: Record<string, string> = {
  '"': '"',
  '"': '"',
  '„': '"',
  '‟': '"',
  ''': "'",
  ''': "'",
  '‚': "'",
  '‛': "'",
  '«': '"',
  '»': '"',
  '‹': "'",
  '›': "'",
};

// Dash normalization
const DASHES: Record<string, string> = {
  '–': '-', // en dash
  '—': '-', // em dash
  '‐': '-', // hyphen
  '‑': '-', // non-breaking hyphen
  '‒': '-', // figure dash
  '―': '-', // horizontal bar
  '⁃': '-', // hyphen bullet
  '−': '-', // minus sign
};

// Zero-width and invisible characters to remove
const INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/g;

/**
 * Normalize text for storage and verification matching.
 * This is the "canonical" form used for substring matching.
 */
export function normalizeText(text: string): string {
  let result = text;

  // 1. Remove zero-width and invisible characters
  result = result.replace(INVISIBLE_CHARS, '');

  // 2. Replace ligatures
  for (const [ligature, replacement] of Object.entries(LIGATURES)) {
    result = result.replaceAll(ligature, replacement);
  }

  // 3. Normalize quotes
  for (const [fancy, plain] of Object.entries(QUOTES)) {
    result = result.replaceAll(fancy, plain);
  }

  // 4. Normalize dashes
  for (const [dash, hyphen] of Object.entries(DASHES)) {
    result = result.replaceAll(dash, hyphen);
  }

  // 5. Handle line-break hyphenation: "word-\n" → "word"
  result = result.replace(/-\s*\n\s*/g, '');

  // 6. Collapse all whitespace (newlines, tabs, multiple spaces) to single space
  result = result.replace(/\s+/g, ' ');

  // 7. Trim
  result = result.trim();

  // 8. Normalize to NFC (canonical Unicode composition)
  result = result.normalize('NFC');

  return result;
}

/**
 * More aggressive normalization for fuzzy matching.
 * Use this when exact match fails but you want to find "close enough" matches.
 */
export function normalizeTextAggressive(text: string): string {
  let result = normalizeText(text);

  // Lowercase for case-insensitive matching
  result = result.toLowerCase();

  // Remove all punctuation except essential ones
  result = result.replace(/[^\w\s-]/g, '');

  // Collapse multiple spaces again (after punctuation removal)
  result = result.replace(/\s+/g, ' ');

  return result.trim();
}

/**
 * Verify that a quote exists in the page text.
 * Returns verification result with match details.
 */
export interface VerificationResult {
  verified: boolean;
  matchType: 'exact' | 'normalized' | 'fuzzy' | 'none';
  confidence: number; // 0-1, where 1 is exact match
  matchedText?: string; // The actual text that matched
  position?: number; // Start position in normalized text
}

export function verifyQuote(
  pageText: string,
  quoteText: string,
  options: {
    minLength?: number;
    allowFuzzy?: boolean;
    fuzzyThreshold?: number;
    maxPageLengthForFuzzy?: number;
    maxQuoteLengthForFuzzy?: number;
  } = {}
): VerificationResult {
  const { 
    minLength = 12, 
    allowFuzzy = false,  // CHANGED: Disabled by default for performance
    fuzzyThreshold = 0.85,
    maxPageLengthForFuzzy = 6000,  // Don't fuzzy match on very long pages
    maxQuoteLengthForFuzzy = 150,   // Don't fuzzy match very long quotes
  } = options;

  // Reject quotes that are too short
  if (quoteText.trim().length < minLength) {
    return {
      verified: false,
      matchType: 'none',
      confidence: 0,
    };
  }

  // Try exact match first
  if (pageText.includes(quoteText)) {
    return {
      verified: true,
      matchType: 'exact',
      confidence: 1.0,
      matchedText: quoteText,
      position: pageText.indexOf(quoteText),
    };
  }

  // Try normalized match
  const normalizedPage = normalizeText(pageText);
  const normalizedQuote = normalizeText(quoteText);

  if (normalizedPage.includes(normalizedQuote)) {
    return {
      verified: true,
      matchType: 'normalized',
      confidence: 0.95,
      matchedText: normalizedQuote,
      position: normalizedPage.indexOf(normalizedQuote),
    };
  }

  // Try fuzzy match if allowed AND within performance bounds
  if (allowFuzzy) {
    // Performance guards: skip fuzzy matching if text is too long
    const quoteTooLong = normalizedQuote.length > maxQuoteLengthForFuzzy;
    const pageTooLong = normalizedPage.length > maxPageLengthForFuzzy;
    
    if (!quoteTooLong && !pageTooLong) {
      const fuzzyResult = findFuzzyMatch(normalizedPage, normalizedQuote, fuzzyThreshold);
      if (fuzzyResult) {
        return {
          verified: true,
          matchType: 'fuzzy',
          confidence: fuzzyResult.score,
          matchedText: fuzzyResult.matched,
          position: fuzzyResult.position,
        };
      }
    }
  }

  return {
    verified: false,
    matchType: 'none',
    confidence: 0,
  };
}

/**
 * Find a fuzzy match using sliding window and Levenshtein-like scoring.
 * This catches minor OCR errors like l/1, O/0 confusion.
 */
function findFuzzyMatch(
  haystack: string,
  needle: string,
  threshold: number
): { score: number; matched: string; position: number } | null {
  const needleLen = needle.length;
  
  // Don't fuzzy match very short strings (too many false positives)
  if (needleLen < 20) return null;
  
  // Sliding window: check each substring of haystack
  // Allow window to be slightly larger/smaller than needle
  const windowSizes = [needleLen, needleLen - 1, needleLen + 1, needleLen - 2, needleLen + 2];
  
  let bestMatch: { score: number; matched: string; position: number } | null = null;

  for (const windowSize of windowSizes) {
    if (windowSize < 10) continue;
    
    for (let i = 0; i <= haystack.length - windowSize; i++) {
      const window = haystack.substring(i, i + windowSize);
      const score = similarityScore(needle, window);
      
      if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { score, matched: window, position: i };
      }
    }
  }

  return bestMatch;
}

/**
 * Calculate similarity score between two strings (0-1).
 * Uses a simple character-level comparison optimized for OCR errors.
 */
function similarityScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  // Use aggressive normalization for comparison
  const aNorm = normalizeTextAggressive(a);
  const bNorm = normalizeTextAggressive(b);

  if (aNorm === bNorm) return 0.98;

  // Simple Levenshtein-based similarity
  const maxLen = Math.max(aNorm.length, bNorm.length);
  const distance = levenshteinDistance(aNorm, bNorm);
  
  return 1 - (distance / maxLen);
}

/**
 * Levenshtein distance (edit distance) between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Use two-row optimization for memory efficiency
  let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  let currRow = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    currRow[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,      // deletion
        currRow[j - 1] + 1,  // insertion
        prevRow[j - 1] + cost // substitution
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[b.length];
}

/**
 * Pre-normalize page text for storage in document_pages.text_normalized
 */
export function preparePageTextForStorage(rawText: string): {
  text: string;
  textNormalized: string;
  wordCount: number;
} {
  const text = rawText.trim();
  const textNormalized = normalizeText(text);
  const wordCount = textNormalized.split(/\s+/).filter(Boolean).length;

  return { text, textNormalized, wordCount };
}
