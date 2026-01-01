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
 * IMPORTANT: This function must be called INSIDE handlers only.
 * Never call at module level to avoid Vercel build failures.
 * 
 * Uses service account key for Vercel (recommended best practice)
 */
function createDocAIClient(): DocumentProcessorServiceClient {
  // Get project ID
  const projectId = process.env.GCP_PROJECT_ID;
  
  if (!projectId) {
    throw new DocAIError(
      "GCP_PROJECT_ID environment variable is required",
      "MISSING_PROJECT_ID",
      false
    );
  }

  // Priority 1: Service Account Key (Vercel production)
  const serviceAccountKeyStr = process.env.GCP_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKeyStr) {
    try {
      // CRITICAL: Vercel env vars can mangle JSON in various ways:
      // 1. Literal \n instead of newlines in private_key
      // 2. Double-escaped \\n
      // 3. Other escaped characters
      // Parse the JSON first, then fix the private_key field specifically
      let credentials: Record<string, unknown>;

      try {
        // First try parsing as-is (works if properly formatted)
        credentials = JSON.parse(serviceAccountKeyStr);
      } catch {
        // If that fails, try fixing common escape issues in the raw string
        const fixedKeyStr = serviceAccountKeyStr
          .replace(/\\\\n/g, "\n")  // Double-escaped newlines
          .replace(/\\n/g, "\n");    // Single-escaped newlines
        credentials = JSON.parse(fixedKeyStr);
      }

      // Always fix newlines in private_key field (may still have literal \n)
      if (typeof credentials.private_key === "string") {
        credentials.private_key = (credentials.private_key as string).replace(/\\n/g, "\n");
      }

      // Create client with explicit credentials (bypasses auth library type issues)
      return new DocumentProcessorServiceClient({
        projectId: projectId,
        credentials: credentials,
      });
    } catch (error: any) {
      throw new DocAIError(
        `Failed to parse GCP_SERVICE_ACCOUNT_KEY: ${error.message}`,
        "INVALID_CREDENTIALS",
        false
      );
    }
  }
  
  // Priority 2: Service account JSON string (for local dev if keys are allowed)
  const jsonCredentials = process.env.GCP_SERVICE_ACCOUNT_JSON;
  
  if (jsonCredentials) {
    // Parse credentials from environment variable
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
    } catch {
      throw new DocAIError(
        "Failed to parse GCP_SERVICE_ACCOUNT_JSON. Ensure it contains valid JSON.",
        "INVALID_CREDENTIALS",
        false
      );
    }
  }
  
  // Priority 3: Default credential lookup (GOOGLE_APPLICATION_CREDENTIALS file or ADC)
  return new DocumentProcessorServiceClient();
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

// Layout Parser specific types
interface LayoutBlock {
  blockId?: string;
  textBlock?: {
    text: string;
    type: string; // "paragraph", "heading", etc.
  };
  tableBlock?: {
    headerRows?: Array<{ cells?: Array<{ blocks?: LayoutBlock[] }> }>;
    bodyRows?: Array<{ cells?: Array<{ blocks?: LayoutBlock[] }> }>;
  };
  listBlock?: {
    listEntries?: Array<{ blocks?: LayoutBlock[] }>;
  };
  pageSpan?: {
    pageStart: number;
    pageEnd: number;
  };
  boundingBox?: DocAIBoundingBox;
}

interface DocumentLayout {
  blocks?: LayoutBlock[];
}

interface DocAIDocument {
  text?: string;
  pages?: DocAIPage[];
  documentLayout?: DocumentLayout; // Layout Parser format
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

  const client = createDocAIClient();
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

    // Detect response format: Layout Parser vs OCR
    const isLayoutParser = !!document.documentLayout?.blocks?.length;
    const isOCRFormat = !!document.text && !!document.pages?.length;

    // Debug: Log what Document AI returned
    console.log("Document AI response:", {
      format: isLayoutParser ? "Layout Parser" : isOCRFormat ? "OCR" : "Unknown",
      hasPages: !!document.pages,
      pagesCount: document.pages?.length || 0,
      hasText: !!document.text,
      textLength: document.text?.length || 0,
      hasDocumentLayout: !!document.documentLayout,
      layoutBlocksCount: document.documentLayout?.blocks?.length || 0,
      textPreview: document.text?.substring(0, 200) || "No text field"
    });

    let pages: ExtractedPage[];
    let blocks: ExtractedBlock[];

    if (isLayoutParser) {
      // Layout Parser format: extract from documentLayout.blocks
      pages = extractPagesFromLayout(document, pageOffset);
      blocks = extractBlocksFromLayout(document, pageOffset);
    } else if (isOCRFormat) {
      // OCR format: extract from document.text and page.paragraphs
      pages = extractPagesFromOCR(document, pageOffset);
      blocks = extractBlocksFromOCR(document, pageOffset);
    } else {
      console.error("Unknown Document AI response format:", {
        keys: Object.keys(document),
        pagesKeys: document.pages?.[0] ? Object.keys(document.pages[0]) : [],
      });
      throw new DocAIError(
        "Unknown Document AI response format - neither Layout Parser nor OCR format detected",
        "UNKNOWN_FORMAT",
        false
      );
    }

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

// =============================================================================
// LAYOUT PARSER FORMAT EXTRACTION
// =============================================================================

/**
 * Extract page-level text from Layout Parser format.
 * Groups blocks by pageSpan and concatenates text.
 */
function extractPagesFromLayout(document: DocAIDocument, pageOffset: number): ExtractedPage[] {
  const layoutBlocks = document.documentLayout?.blocks || [];
  const pageCount = document.pages?.length || 0;

  if (pageCount === 0 || layoutBlocks.length === 0) {
    console.warn("Layout Parser: No pages or blocks found");
    return [];
  }

  // Group blocks by page
  const pageTexts: Map<number, string[]> = new Map();

  for (let i = 1; i <= pageCount; i++) {
    pageTexts.set(i, []);
  }

  // Recursively extract text from layout blocks
  function extractTextFromLayoutBlock(block: LayoutBlock): string {
    let text = "";

    if (block.textBlock?.text) {
      text += block.textBlock.text;
    }

    // Handle table blocks
    if (block.tableBlock) {
      const processRows = (rows?: Array<{ cells?: Array<{ blocks?: LayoutBlock[] }> }>) => {
        if (!rows) return;
        for (const row of rows) {
          if (!row.cells) continue;
          for (const cell of row.cells) {
            if (!cell.blocks) continue;
            for (const cellBlock of cell.blocks) {
              text += extractTextFromLayoutBlock(cellBlock) + " ";
            }
          }
          text += "\n";
        }
      };
      processRows(block.tableBlock.headerRows);
      processRows(block.tableBlock.bodyRows);
    }

    // Handle list blocks
    if (block.listBlock?.listEntries) {
      for (const entry of block.listBlock.listEntries) {
        if (!entry.blocks) continue;
        for (const listBlock of entry.blocks) {
          text += "• " + extractTextFromLayoutBlock(listBlock) + "\n";
        }
      }
    }

    return text;
  }

  // Process each layout block
  for (const block of layoutBlocks) {
    const pageNum = block.pageSpan?.pageStart || 1;
    const text = extractTextFromLayoutBlock(block);

    if (text.trim()) {
      const pageTextArray = pageTexts.get(pageNum);
      if (pageTextArray) {
        pageTextArray.push(text);
      }
    }
  }

  // Build extracted pages
  const pages: ExtractedPage[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const pageTextArray = pageTexts.get(i) || [];
    const pageText = pageTextArray.join("\n");
    const { text, textNormalized, wordCount } = preparePageTextForStorage(pageText);

    pages.push({
      pageNumber: pageOffset + i,
      text,
      textNormalized,
      wordCount,
      width: document.pages?.[i - 1]?.dimension?.width,
      height: document.pages?.[i - 1]?.dimension?.height,
      confidence: undefined, // Layout Parser doesn't provide per-page confidence
    });
  }

  console.log(`Layout Parser: Extracted ${pages.length} pages with ${layoutBlocks.length} blocks`);
  return pages;
}

/**
 * Extract blocks from Layout Parser format.
 */
function extractBlocksFromLayout(document: DocAIDocument, pageOffset: number): ExtractedBlock[] {
  const layoutBlocks = document.documentLayout?.blocks || [];
  const blocks: ExtractedBlock[] = [];
  let globalReadingOrder = 0;

  function mapBlockType(type?: string): ExtractedBlock["blockType"] {
    switch (type?.toLowerCase()) {
      case "heading":
      case "title":
        return "heading";
      case "list_item":
        return "list_item";
      case "table":
        return "table";
      case "table_cell":
        return "table_cell";
      default:
        return "paragraph";
    }
  }

  function processLayoutBlock(block: LayoutBlock) {
    const pageNumber = pageOffset + (block.pageSpan?.pageStart || 1);

    // Text blocks
    if (block.textBlock?.text) {
      const { textNormalized } = preparePageTextForStorage(block.textBlock.text);
      blocks.push({
        pageNumber,
        blockType: mapBlockType(block.textBlock.type),
        text: block.textBlock.text,
        textNormalized,
        bbox: convertBoundingBox(block.boundingBox),
        confidence: null,
        readingOrder: globalReadingOrder++,
      });
    }

    // Table blocks
    if (block.tableBlock) {
      const allCellTexts: string[] = [];

      const processRows = (rows?: Array<{ cells?: Array<{ blocks?: LayoutBlock[] }> }>) => {
        if (!rows) return;
        for (const row of rows) {
          if (!row.cells) continue;
          for (const cell of row.cells) {
            if (!cell.blocks) continue;
            const cellTexts: string[] = [];
            for (const cellBlock of cell.blocks) {
              if (cellBlock.textBlock?.text) {
                cellTexts.push(cellBlock.textBlock.text);
              }
            }
            if (cellTexts.length > 0) {
              const cellText = cellTexts.join(" ");
              allCellTexts.push(cellText);
              const { textNormalized } = preparePageTextForStorage(cellText);
              blocks.push({
                pageNumber,
                blockType: "table_cell",
                text: cellText,
                textNormalized,
                bbox: null, // Cell-level bbox not easily available
                confidence: null,
                readingOrder: globalReadingOrder++,
              });
            }
          }
        }
      };

      processRows(block.tableBlock.headerRows);
      processRows(block.tableBlock.bodyRows);

      if (allCellTexts.length > 0) {
        const tableText = allCellTexts.join(" | ");
        const { textNormalized } = preparePageTextForStorage(tableText);
        blocks.push({
          pageNumber,
          blockType: "table",
          text: tableText,
          textNormalized,
          bbox: convertBoundingBox(block.boundingBox),
          confidence: null,
          readingOrder: globalReadingOrder++,
        });
      }
    }

    // List blocks
    if (block.listBlock?.listEntries) {
      for (const entry of block.listBlock.listEntries) {
        if (!entry.blocks) continue;
        for (const listBlock of entry.blocks) {
          if (listBlock.textBlock?.text) {
            const { textNormalized } = preparePageTextForStorage(listBlock.textBlock.text);
            blocks.push({
              pageNumber,
              blockType: "list_item",
              text: listBlock.textBlock.text,
              textNormalized,
              bbox: convertBoundingBox(listBlock.boundingBox),
              confidence: null,
              readingOrder: globalReadingOrder++,
            });
          }
        }
      }
    }
  }

  for (const block of layoutBlocks) {
    processLayoutBlock(block);
  }

  console.log(`Layout Parser: Extracted ${blocks.length} blocks`);
  return blocks;
}

// =============================================================================
// OCR FORMAT EXTRACTION (legacy)
// =============================================================================

/**
 * Extract page-level text from OCR format (document.text + page.paragraphs).
 */
function extractPagesFromOCR(document: DocAIDocument, pageOffset: number): ExtractedPage[] {
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
 * Extract layout blocks with bounding boxes for highlighting (OCR format).
 */
function extractBlocksFromOCR(document: DocAIDocument, pageOffset: number): ExtractedBlock[] {
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
