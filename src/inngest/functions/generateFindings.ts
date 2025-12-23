// src/inngest/functions/generateFindings.ts
// AI-powered findings generation with quote verification
//
// FIXES APPLIED:
// - #3: Bbox lookup uses overlap scoring instead of strict includes
// - #4: Deduplication uses citation signatures to avoid over-deduping
// - #5: Cleaner status logic (complete vs analysis_failed)
// - #10: Model version is configurable
// - NEW: Fuzzy verification is env-controlled
// - NEW: Partial extraction reduces confidence and shows warning

import { inngest } from "../client";
import { getSupabaseAdmin } from '@/lib/supabase';
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { verifyQuote, normalizeText } from "@/lib/text-normalize";

// Note: Supabase admin client is initialized inside functions
// to avoid import-time errors when environment variables are not set

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Configuration via environment
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
const ENABLE_FUZZY_VERIFICATION = process.env.ENABLE_FUZZY_VERIFICATION === "true";

// Processing limits
const PAGES_PER_BATCH = 15;
const MAX_FINDINGS_PER_BATCH = 6;

// =============================================================================
// SCHEMA DEFINITIONS
// =============================================================================

const CitationSchema = z.object({
  page_number: z.number().int().min(1),
  quote_text: z.string().min(12).max(500),
});

const FindingSchema = z.object({
  category: z.enum([
    "services",
    "goals", 
    "accommodations",
    "baseline",
    "placement",
    "procedural",
    "timeline",
    "other",
  ]),
  title: z.string().min(10).max(200),
  summary: z.string().min(30).max(1000),
  why_it_matters: z.string().max(500).optional().default(""),
  questions_to_ask: z.array(z.string().max(300)).max(5).default([]),
  citations: z.array(CitationSchema).min(1).max(4),
  confidence: z.number().min(0).max(1),
  needs_review: z.boolean(),
  needs_review_reason: z.string().optional().default(""),
});

const OutputSchema = z.object({
  findings: z.array(FindingSchema),
});

type Finding = z.infer<typeof FindingSchema>;
type Citation = z.infer<typeof CitationSchema>;

// =============================================================================
// PROMPTS
// =============================================================================

const SYSTEM_PROMPT = `You are a document analysis assistant that helps parents understand special education documents.

CRITICAL RULES:
1. You produce INFORMATIONAL observations only - never legal advice or recommendations.
2. Every finding MUST include at least one exact quote from the document.
3. Quotes must be VERBATIM - copied character-for-character from the page text provided.
4. If you cannot find an exact quote to support a finding, set needs_review=true.
5. Focus on clarity, missing information, inconsistencies, changes, or vague language.
6. Never use phrases like "you should", "I recommend", or "the law requires".

CATEGORIES TO LOOK FOR:
- services: Service types, frequencies, minutes per week/month, provider qualifications
- goals: Annual goals, measurability, baselines, progress criteria
- accommodations: Classroom accommodations, testing accommodations, assistive technology
- baseline: Present levels, current performance data, evaluation results
- placement: LRE, classroom setting, percentage of time in general education
- procedural: Timeline compliance, consent forms, meeting notices, PWN
- timeline: Dates, deadlines, annual review timing
- other: Anything else noteworthy

OUTPUT FORMAT:
You must respond with valid JSON matching this exact structure:
{
  "findings": [
    {
      "category": "services",
      "title": "Brief descriptive title (10-200 chars)",
      "summary": "Clear explanation of what you observed (30-1000 chars)",
      "why_it_matters": "Optional context for parents",
      "questions_to_ask": ["Question 1", "Question 2"],
      "citations": [
        {"page_number": 1, "quote_text": "Exact verbatim quote from that page"}
      ],
      "confidence": 0.85,
      "needs_review": false,
      "needs_review_reason": ""
    }
  ]
}`;

function buildUserPrompt(
  pages: Array<{ pageNumber: number; text: string }>,
  batchInfo?: { batchNumber: number; totalBatches: number },
  isPartialExtraction?: boolean
): string {
  const pageTexts = pages
    .map((p) => `=== PAGE ${p.pageNumber} ===\n${p.text}`)
    .join("\n\n");

  const batchContext = batchInfo
    ? `\nThis is batch ${batchInfo.batchNumber} of ${batchInfo.totalBatches}. Focus only on content from pages ${pages[0].pageNumber}-${pages[pages.length - 1].pageNumber}.`
    : "";

  const partialWarning = isPartialExtraction
    ? `\nNOTE: This document had extraction issues - some pages may be missing or have poor text quality. Be more conservative with confidence scores.`
    : "";

  return `Analyze this special education document and produce findings.

IMPORTANT REMINDERS:
- Every quote_text must be EXACTLY as it appears in the page text (character-for-character).
- Only include findings you can support with a direct quote.
- Produce up to ${MAX_FINDINGS_PER_BATCH} findings for this section.
- If the document is unclear or text extraction seems poor, note this in needs_review.
${batchContext}${partialWarning}

DOCUMENT TEXT:

${pageTexts}

Respond with valid JSON only. No markdown, no explanation, just the JSON object.`;
}

const RETRY_PROMPT = `Your previous response had citations that could not be verified as exact quotes.

CRITICAL: The quote_text field must contain EXACTLY the same text that appears in the document - character for character, including punctuation and spacing.

Common mistakes to avoid:
- Adding or removing words
- Changing punctuation
- Paraphrasing instead of quoting
- Wrong page number

Please try again. If you cannot find an exact quote, set needs_review=true and explain why in needs_review_reason.

Respond with valid JSON only.`;

// =============================================================================
// MAIN FUNCTION
// =============================================================================

export const generateFindings = inngest.createFunction(
  {
    id: "generate-findings",
    retries: 2,
    onFailure: async ({ error, event }) => {
      const { documentId } = (event.data as any).documentId || event.data;
      await getSupabaseAdmin()
        .from("documents")
        .update({ 
          status: "analysis_failed",
          error_message: `Analysis failed: ${error.message}`,
        })
        .eq("id", documentId);
    },
  },
  { event: "document.extracted" },
  async ({ event, step }) => {
    const { documentId, pageCount, isPartial, extractedPages, expectedPages } = event.data;

    // Step 1: Load document and case info
    const doc = await step.run("load-document-info", async () => {
      const { data, error } = await getSupabaseAdmin()
        .from("documents")
        .select("id, case_id, type, source_filename")
        .eq("id", documentId)
        .single();

      if (error || !data) {
        throw new Error(`Document not found: ${documentId}`);
      }

      return data;
    });

    // Step 2: Mark as analyzing
    await step.run("mark-analyzing", async () => {
      await getSupabaseAdmin()
        .from("documents")
        .update({ status: "analyzing" })
        .eq("id", documentId);
    });

    // Step 3: Load extracted pages
    const pages = await step.run("load-pages", async () => {
      const { data, error } = await getSupabaseAdmin()
        .from("document_pages")
        .select("page_number, text, text_normalized")
        .eq("document_id", documentId)
        .order("page_number");

      if (error || !data || data.length === 0) {
        throw new Error("No extracted pages found");
      }

      return data.map((p) => ({
        pageNumber: p.page_number,
        text: p.text,
        textNormalized: p.text_normalized || normalizeText(p.text),
      }));
    });

    // Step 4: Load document blocks for bbox lookup
    const blocks = await step.run("load-blocks", async () => {
      const { data, error } = await getSupabaseAdmin()
        .from("document_blocks")
        .select("page_number, text, text_normalized, bbox")
        .eq("document_id", documentId)
        .not("bbox", "is", null);

      if (error) {
        console.error("Failed to load blocks:", error);
        return [];
      }

      return data || [];
    });

    // Build page map for verification
    const pageMap = new Map(pages.map((p) => [p.pageNumber, p]));

    // Process in batches
    const batches = createBatches(pages, PAGES_PER_BATCH);
    const totalBatches = batches.length;

    // Step 5: Generate findings for each batch
    const allVerifiedFindings = await step.run("generate-and-verify-all", async () => {
      const allFindings: VerifiedFinding[] = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchInfo = totalBatches > 1 
          ? { batchNumber: batchIndex + 1, totalBatches }
          : undefined;

        console.log(`Processing batch ${batchIndex + 1}/${totalBatches}`);

        let attempt = 1;
        const maxAttempts = 2;
        let batchFindings: VerifiedFinding[] = [];

        while (attempt <= maxAttempts) {
          const isRetry = attempt > 1;
          
          try {
            const llmResponse = await callLLM(batch, isRetry, batchInfo, isPartial);
            const parsed = parseAndValidate(llmResponse);
            
            if (!parsed.success) {
              console.error(`Batch ${batchIndex + 1}, attempt ${attempt}: Parse failed:`, parsed.error);
              attempt++;
              continue;
            }

            // Verify citations
            batchFindings = verifyCitations(parsed.data.findings, pageMap);

            const allVerified = batchFindings.every((v) =>
              v.citationResults.every((c) => c.verified)
            );

            if (allVerified) {
              console.log(`Batch ${batchIndex + 1}: All ${batchFindings.length} findings verified`);
              break;
            }

            attempt++;
          } catch (error) {
            console.error(`Batch ${batchIndex + 1}, attempt ${attempt} failed:`, error);
            attempt++;
          }
        }

        allFindings.push(...batchFindings);
      }

      return allFindings;
    });

    // Step 6: Deduplicate findings (FIX #4: use citation signatures)
    const deduplicatedFindings = deduplicateFindings(allVerifiedFindings);

    // Step 7: Persist findings and citations
    const { savedCount, needsReviewCount } = await step.run("persist-findings", async () => {
      let saved = 0;
      let needsReview = 0;

      for (const vf of deduplicatedFindings) {
        const finding = vf.finding;
        
        const hasUnverifiedCitations = vf.citationResults.some((c) => !c.verified);
        const finalStatus = hasUnverifiedCitations || finding.needs_review
          ? "needs_review"
          : "active";
        
        if (finalStatus === "needs_review") needsReview++;
        
        const finalNeedsReviewReason = hasUnverifiedCitations
          ? "One or more citations could not be verified as exact quotes."
          : finding.needs_review_reason || "";

        // Adjust confidence for partial extractions
        let adjustedConfidence = finding.confidence;
        if (isPartial) {
          adjustedConfidence = Math.min(adjustedConfidence, 0.7); // Cap confidence
        }

        // Insert finding
        const { data: findingRow, error: findingError } = await getSupabaseAdmin()
          .from("findings")
          .insert({
            document_id: documentId,
            case_id: doc.case_id,
            created_by: "ai",
            status: finalStatus,
            category: finding.category,
            title: finding.title,
            summary: finding.summary,
            why_it_matters: finding.why_it_matters || null,
            questions_to_ask: finding.questions_to_ask,
            confidence: adjustedConfidence,
            needs_review_reason: finalNeedsReviewReason || null,
            model_version: ANTHROPIC_MODEL,
          })
          .select("id")
          .single();

        if (findingError || !findingRow) {
          console.error("Failed to insert finding:", findingError);
          continue;
        }

        // Insert citations with bbox (FIX #3: overlap-based lookup)
        for (let i = 0; i < finding.citations.length; i++) {
          const citation = finding.citations[i];
          const verificationResult = vf.citationResults[i];

          // Find best matching bbox using overlap scoring
          const bbox = findBboxForCitationWithOverlap(
            citation.page_number,
            citation.quote_text,
            blocks
          );

          await getSupabaseAdmin().from("citations").insert({
            finding_id: findingRow.id,
            document_id: documentId,
            page_number: citation.page_number,
            quote_text: citation.quote_text,
            quote_text_normalized: normalizeText(citation.quote_text),
            bbox: bbox,
            verification_status: verificationResult.verified ? "verified" : "failed",
            verification_score: verificationResult.confidence,
            verified_at: verificationResult.verified ? new Date().toISOString() : null,
          });
        }

        saved++;
      }

      return { savedCount: saved, needsReviewCount: needsReview };
    });

    // Step 8: Update final status (FIX #5: cleaner logic)
    await step.run("update-final-status", async () => {
      // Simple, clear logic:
      // - analysis_failed: no findings could be saved
      // - complete: at least one finding saved (UI shows "X need review" badge)
      const finalStatus = savedCount === 0 ? "analysis_failed" : "complete";

      await getSupabaseAdmin()
        .from("documents")
        .update({ status: finalStatus })
        .eq("id", documentId);
    });

    return {
      success: true,
      documentId,
      findingsCount: savedCount,
      needsReviewCount,
      batchesProcessed: batches.length,
      isPartialExtraction: isPartial,
    };
  }
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

interface VerifiedFinding {
  finding: Finding;
  citationResults: Array<{
    citation: Citation;
    verified: boolean;
    confidence: number;
    matchType: string;
  }>;
}

function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

async function callLLM(
  pages: Array<{ pageNumber: number; text: string }>,
  isRetry: boolean,
  batchInfo?: { batchNumber: number; totalBatches: number },
  isPartialExtraction?: boolean
): Promise<string> {
  const userPrompt = isRetry
    ? RETRY_PROMPT + "\n\n" + buildUserPrompt(pages, batchInfo, isPartialExtraction)
    : buildUserPrompt(pages, batchInfo, isPartialExtraction);

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    messages: [
      { role: "user", content: userPrompt },
    ],
    system: SYSTEM_PROMPT,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from LLM");
  }

  return textBlock.text;
}

function parseAndValidate(
  llmResponse: string
): { success: true; data: z.infer<typeof OutputSchema> } | { success: false; error: string } {
  try {
    let cleaned = llmResponse.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    const validated = OutputSchema.parse(parsed);

    return { success: true, data: validated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function verifyCitations(
  findings: Finding[],
  pageMap: Map<number, { text: string; textNormalized: string }>
): VerifiedFinding[] {
  return findings.map((finding) => {
    const citationResults = finding.citations.map((citation) => {
      const page = pageMap.get(citation.page_number);

      if (!page) {
        return {
          citation,
          verified: false,
          confidence: 0,
          matchType: "page_not_found",
        };
      }

      // Use env-controlled fuzzy verification
      const result = verifyQuote(page.text, citation.quote_text, {
        minLength: 12,
        allowFuzzy: ENABLE_FUZZY_VERIFICATION,
        maxPageLengthForFuzzy: 6000,
        maxQuoteLengthForFuzzy: 150,
      });

      return {
        citation,
        verified: result.verified,
        confidence: result.confidence,
        matchType: result.matchType,
      };
    });

    return { finding, citationResults };
  });
}

/**
 * FIX #4: Improved deduplication using citation signatures
 * 
 * Two findings are duplicates only if they have:
 * - Same category
 * - Similar title
 * - Overlapping citation signatures (same pages + similar quotes)
 */
function deduplicateFindings(findings: VerifiedFinding[]): VerifiedFinding[] {
  const seen = new Map<string, VerifiedFinding>();
  
  for (const vf of findings) {
    // Create citation signature: sorted page numbers + first 20 chars of each normalized quote
    const citationSignature = vf.finding.citations
      .map(c => `${c.page_number}:${normalizeText(c.quote_text).slice(0, 20)}`)
      .sort()
      .join("|");
    
    // Create dedupe key from category + normalized title + citation signature
    const titleKey = normalizeText(vf.finding.title).slice(0, 40);
    const key = `${vf.finding.category}:${titleKey}:${citationSignature}`;
    
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, vf);
    } else {
      // Keep the one with higher confidence or more verified citations
      const existingVerified = existing.citationResults.filter(c => c.verified).length;
      const newVerified = vf.citationResults.filter(c => c.verified).length;
      
      if (newVerified > existingVerified || 
          (newVerified === existingVerified && vf.finding.confidence > existing.finding.confidence)) {
        seen.set(key, vf);
      }
    }
  }
  
  return Array.from(seen.values());
}

/**
 * FIX #3: Find bounding box using overlap scoring instead of strict includes
 * 
 * Improvements in v3.1:
 * - Filters common stopwords to avoid matching generic blocks
 * - Requires minimum number of "rare" (non-stopword) matches
 */

// Common words to ignore when matching (would match headers/footers/templates)
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
  'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all',
  'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also',
  // IEP-specific common words that appear everywhere
  'student', 'iep', 'will', 'goal', 'services', 'school', 'education', 'special',
  'meeting', 'date', 'page', 'annual', 'review',
]);

const MIN_RARE_MATCHES = 3; // Require at least 3 non-stopword matches

function findBboxForCitationWithOverlap(
  pageNumber: number,
  quoteText: string,
  blocks: Array<{ page_number: number; text: string | null; text_normalized: string | null; bbox: any }>
): any | null {
  const MIN_OVERLAP_THRESHOLD = 0.35;
  
  // Tokenize quote into words, filtering stopwords
  const normalizedQuote = normalizeText(quoteText);
  const allWords = normalizedQuote.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const rareWords = allWords.filter(w => !STOPWORDS.has(w));
  
  // If quote is mostly stopwords, fall back to all words but require higher threshold
  const useWords = rareWords.length >= MIN_RARE_MATCHES ? rareWords : allWords;
  const threshold = rareWords.length >= MIN_RARE_MATCHES ? MIN_OVERLAP_THRESHOLD : 0.5;
  
  if (useWords.length === 0) return null;
  
  // Find blocks on the same page
  const pageBlocks = blocks.filter(b => b.page_number === pageNumber && b.bbox);
  
  if (pageBlocks.length === 0) return null;
  
  let bestBlock: { bbox: any; overlapScore: number; rareMatches: number } | null = null;
  
  for (const block of pageBlocks) {
    const blockText = block.text_normalized || (block.text ? normalizeText(block.text) : "");
    const blockTextLower = blockText.toLowerCase();
    
    // Count matches
    let matchedWords = 0;
    let matchedRareWords = 0;
    
    for (const word of allWords) {
      if (blockTextLower.includes(word)) {
        matchedWords++;
        if (!STOPWORDS.has(word)) {
          matchedRareWords++;
        }
      }
    }
    
    const overlapScore = matchedWords / allWords.length;
    
    // Must meet threshold AND have enough rare word matches
    if (overlapScore >= threshold && matchedRareWords >= Math.min(MIN_RARE_MATCHES, rareWords.length)) {
      if (!bestBlock || 
          matchedRareWords > bestBlock.rareMatches ||
          (matchedRareWords === bestBlock.rareMatches && overlapScore > bestBlock.overlapScore)) {
        bestBlock = { bbox: block.bbox, overlapScore, rareMatches: matchedRareWords };
      }
    }
  }
  
  return bestBlock?.bbox || null;
}
