// src/lib/docai.ts
// Google Document AI Layout Parser integration

import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { preparePageTextForStorage } from "./text-normalize";

// =============================================================================
// CLIENT INITIALIZATION
// =============================================================================

/**
 * Create Document AI client with proper credentials.
 * 
 * Supports two modes:
 * 1. Local dev: Uses GOOGLE_APPLICATION_CREDENTIALS file path (default GCP behavior)
 * 2. Vercel/Production: Uses GCP_SERVICE_ACCOUNT_JSON env var containing the JSON string
 */
function createDocAIClient(): DocumentProcessorServiceClient {
  const jsonCredentials = process.env.GCP_SERVICE_ACCOUNT_JSON;
  
  if (jsonCredentials) {
    // Parse credentials from environment variable (for Vercel)
    try {
      const credentials = JSON.parse(jsonCredentials);
      
      // CRITICAL: Vercel env vars often store private keys with literal "\n" 
      // instead of actual newlines. This breaks GCP authentication.
      // Fix by replacing escaped newlines with real ones.
      const privateKey = (credentials.private_key || "").replace(/\\n/g, "\n");
      
      return new DocumentProcessorServiceClient({
        credentials: {
          client_email: credentials.client_email,
          private_key: privateKey,
        },
        projectId: credentials.project_id,
      });
    } catch (error) {
      throw new DocAIError(
        "Failed to parse GCP_SERVICE_ACCOUNT_JSON. Ensure it contains valid JSON.",
        "INVALID_CREDENTIALS",
        false
      );
    }
  }
  
  // Fall back to default credential lookup (GOOGLE_APPLICATION_CREDENTIALS file)
  return new DocumentProcessorServiceClient();
}

// Lazy-initialized client (created on first use)
let _client: DocumentProcessorServiceClient | null = null;

function getClient(): DocumentProcessorServiceClient {
  if (!_client) {
    _client = createDocAIClient();
  }
  return _client;
}

// =============================================================================
// TYPES
// =============================================================================

// Types for Document AI response (simplified)
interface DocAIBoundingBox {
  normalizedVertices: Array<{ x: number; y: number }>;
}

interface DocAIBlock {
  textAnchor?: {
    textSegments?: Array<{ startIndex?: string; endIndex?: string }>;
  };
  boundingBox?: DocAIBoundingBox;
  confidence?: number;
}

interface DocAIPage {
  pageNumber: number;
  dimension?: { width: number; height: number };
  blocks?: DocAIBlock[];
  paragraphs?: DocAIBlock[];
  tables?: Array<{
    headerRows?: Array<{ cells?: DocAIBlock[] }>;
    bodyRows?: Array<{ cells?: DocAIBlock[] }>;
    boundingBox?: DocAIBoundingBox;
  }>;
}

interface DocAIDocument {
  text?: string;
  pages?: DocAIPage[];
}

// Extracted types for our use
export interface ExtractedPage {
  pageNumber: number;
  text: string;
  textNormalized: string;
  wordCount: number;
  width?: number;
  height?: number;
  confidence?: number;
}

export interface ExtractedBlock {
  pageNumber: number;
  blockType: "paragraph" | "heading" | "table" | "table_cell" | "list_item" | "other";
  text: string;
  textNormalized: string;
  bbox: { x0: number; y0: number; x1: number; y1: number } | null;
  confidence: number | null;
  readingOrder: number;
}

export interface ExtractionResult {
  pages: ExtractedPage[];
  blocks: ExtractedBlock[];
  rawResponse?: DocAIDocument; // For debugging
}

// Configuration
interface DocAIConfig {
  projectId: string;
  location: string; // e.g., "us" or "eu"
  processorId: string;
}

/**
 * Process a PDF with Google Document AI Layout Parser.
 * Handles the 200-page limit by requiring pre-split chunks.
 */
export async function extractWithDocAI(
  pdfBytes: Buffer,
  config: DocAIConfig,
  options: {
    pageOffset?: number; // For multi-chunk documents
    includeRawResponse?: boolean;
  } = {}
): Promise<ExtractionResult> {
  const { pageOffset = 0, includeRawResponse = false } = options;

  // Validate PDF size (Document AI has limits)
  const MAX_INLINE_SIZE = 20 * 1024 * 1024; // 20MB for inline processing
  if (pdfBytes.length > MAX_INLINE_SIZE) {
    throw new DocAIError(
      "PDF too large for inline processing. Use GCS-based processing for files > 20MB.",
      "SIZE_LIMIT_EXCEEDED",
      false
    );
  }

  const client = getClient();
  const processorPath = `projects/${config.projectId}/locations/${config.location}/processors/${config.processorId}`;

  try {
    const [result] = await client.processDocument({
      name: processorPath,
      rawDocument: {
        content: pdfBytes.toString("base64"),
        mimeType: "application/pdf",
      },
      // Request layout parsing features
      processOptions: {
        ocrConfig: {
          enableNativePdfParsing: true,
          // Use latest OCR model
        },
      },
    });

    const document = result.document as DocAIDocument | undefined;
    if (!document) {
      throw new DocAIError("No document in response", "EMPTY_RESPONSE", false);
    }

    // Extract pages
    const pages = extractPages(document, pageOffset);
    
    // Extract blocks with bounding boxes
    const blocks = extractBlocks(document, pageOffset);

    return {
      pages,
      blocks,
      rawResponse: includeRawResponse ? document : undefined,
    };
  } catch (error: any) {
    // Handle specific Google Cloud errors
    if (error.code === 3) {
      // INVALID_ARGUMENT
      throw new DocAIError(
        `Invalid document: ${error.message}`,
        "INVALID_DOCUMENT",
        false
      );
    }
    if (error.code === 8) {
      // RESOURCE_EXHAUSTED (rate limit)
      throw new DocAIError(
        "Rate limit exceeded. Retry with backoff.",
        "RATE_LIMIT",
        true
      );
    }
    if (error.code === 14) {
      // UNAVAILABLE
      throw new DocAIError(
        "Service temporarily unavailable. Retry with backoff.",
        "UNAVAILABLE",
        true
      );
    }

    // Re-throw if already a DocAIError
    if (error instanceof DocAIError) throw error;

    // Wrap unknown errors
    throw new DocAIError(
      `Document AI error: ${error.message}`,
      "UNKNOWN",
      false
    );
  }
}

/**
 * Extract page-level text from Document AI response.
 */
function extractPages(document: DocAIDocument, pageOffset: number): ExtractedPage[] {
  if (!document.pages || !document.text) return [];

  const fullText = document.text;

  return document.pages.map((page, index) => {
    // Get text for this page by finding all text anchors
    let pageText = "";
    let totalConfidence = 0;
    let confidenceCount = 0;

    // Collect text from paragraphs (most reliable)
    if (page.paragraphs) {
      for (const para of page.paragraphs) {
        const text = getTextFromAnchor(para.textAnchor, fullText);
        if (text) pageText += text + "\n";
        if (para.confidence !== undefined) {
          totalConfidence += para.confidence;
          confidenceCount++;
        }
      }
    }

    // Fallback: collect from blocks if no paragraphs
    if (!pageText && page.blocks) {
      for (const block of page.blocks) {
        const text = getTextFromAnchor(block.textAnchor, fullText);
        if (text) pageText += text + "\n";
        if (block.confidence !== undefined) {
          totalConfidence += block.confidence;
          confidenceCount++;
        }
      }
    }

    const { text, textNormalized, wordCount } = preparePageTextForStorage(pageText);

    return {
      pageNumber: pageOffset + index + 1, // 1-based
      text,
      textNormalized,
      wordCount,
      width: page.dimension?.width,
      height: page.dimension?.height,
      confidence: confidenceCount > 0 ? totalConfidence / confidenceCount : undefined,
    };
  });
}

/**
 * Extract layout blocks with bounding boxes for highlighting.
 */
function extractBlocks(document: DocAIDocument, pageOffset: number): ExtractedBlock[] {
  if (!document.pages || !document.text) return [];

  const fullText = document.text;
  const blocks: ExtractedBlock[] = [];
  let globalReadingOrder = 0;

  for (let pageIndex = 0; pageIndex < document.pages.length; pageIndex++) {
    const page = document.pages[pageIndex];
    const pageNumber = pageOffset + pageIndex + 1;

    // Extract paragraphs
    if (page.paragraphs) {
      for (const para of page.paragraphs) {
        const text = getTextFromAnchor(para.textAnchor, fullText);
        if (!text) continue;

        const { textNormalized } = preparePageTextForStorage(text);

        blocks.push({
          pageNumber,
          blockType: "paragraph",
          text,
          textNormalized,
          bbox: convertBoundingBox(para.boundingBox),
          confidence: para.confidence ?? null,
          readingOrder: globalReadingOrder++,
        });
      }
    }

    // Extract tables
    if (page.tables) {
      for (const table of page.tables) {
        // Add table as a block
        const allCellTexts: string[] = [];
        
        const processRows = (rows: typeof table.headerRows) => {
          if (!rows) return;
          for (const row of rows) {
            if (!row.cells) continue;
            for (const cell of row.cells) {
              const cellText = getTextFromAnchor(cell.textAnchor, fullText);
              if (cellText) {
                allCellTexts.push(cellText);
                
                // Also add individual cells for fine-grained highlighting
                const { textNormalized } = preparePageTextForStorage(cellText);
                blocks.push({
                  pageNumber,
                  blockType: "table_cell",
                  text: cellText,
                  textNormalized,
                  bbox: convertBoundingBox(cell.boundingBox),
                  confidence: cell.confidence ?? null,
                  readingOrder: globalReadingOrder++,
                });
              }
            }
          }
        };

        processRows(table.headerRows);
        processRows(table.bodyRows);

        // Add composite table block
        if (allCellTexts.length > 0) {
          const tableText = allCellTexts.join(" | ");
          const { textNormalized } = preparePageTextForStorage(tableText);
          blocks.push({
            pageNumber,
            blockType: "table",
            text: tableText,
            textNormalized,
            bbox: convertBoundingBox(table.boundingBox),
            confidence: null,
            readingOrder: globalReadingOrder++,
          });
        }
      }
    }
  }

  return blocks;
}

/**
 * Extract text from a text anchor reference.
 */
function getTextFromAnchor(
  textAnchor: DocAIBlock["textAnchor"],
  fullText: string
): string {
  if (!textAnchor?.textSegments) return "";

  return textAnchor.textSegments
    .map((segment) => {
      const start = parseInt(segment.startIndex || "0", 10);
      const end = parseInt(segment.endIndex || "0", 10);
      return fullText.substring(start, end);
    })
    .join("");
}

/**
 * Convert Document AI bounding box to normalized format.
 */
function convertBoundingBox(
  bbox?: DocAIBoundingBox
): { x0: number; y0: number; x1: number; y1: number } | null {
  if (!bbox?.normalizedVertices || bbox.normalizedVertices.length < 4) {
    return null;
  }

  const vertices = bbox.normalizedVertices;
  
  // Find min/max to handle any vertex ordering
  const xs = vertices.map((v) => v.x ?? 0);
  const ys = vertices.map((v) => v.y ?? 0);

  return {
    x0: Math.min(...xs),
    y0: Math.min(...ys),
    x1: Math.max(...xs),
    y1: Math.max(...ys),
  };
}

/**
 * Custom error class for Document AI errors.
 */
export class DocAIError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean
  ) {
    super(message);
    this.name = "DocAIError";
  }
}

/**
 * Retry wrapper with exponential backoff for retryable errors.
 */
export async function extractWithRetry(
  pdfBytes: Buffer,
  config: DocAIConfig,
  options: {
    pageOffset?: number;
    maxRetries?: number;
    initialDelayMs?: number;
  } = {}
): Promise<ExtractionResult> {
  const { maxRetries = 3, initialDelayMs = 1000, ...extractOptions } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await extractWithDocAI(pdfBytes, config, extractOptions);
    } catch (error: any) {
      lastError = error;

      // Don't retry non-retryable errors
      if (error instanceof DocAIError && !error.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = initialDelayMs * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
      console.log(`DocAI attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
