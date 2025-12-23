// src/inngest/functions/processDocument.ts
// Main document processing pipeline: upload → extract → persist
//
// FIXES APPLIED:
// - #1: PDF rendering is optional (disabled by default for Vercel)
// - #2: Partial extraction is tracked and surfaced to users
// - #5: Better error messages for file size limits
// - #6: Block insertion is idempotent (deletes before insert)

import { inngest } from "../client";
import { createClient } from "@supabase/supabase-js";
import { extractWithRetry, DocAIError } from "@/lib/docai";
import { splitPdfByPages, getPdfPageCount } from "@/lib/pdf-utils";
import type { ExtractedPage, ExtractedBlock } from "@/lib/docai";

// Supabase admin client (bypasses RLS for background jobs)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Document AI config
const DOCAI_CONFIG = {
  projectId: process.env.GCP_PROJECT_ID!,
  location: process.env.DOCAI_LOCATION || "us",
  processorId: process.env.DOCAI_PROCESSOR_ID!,
};

// Limits
const DOCAI_PAGE_LIMIT = 200;
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_RETRIES = 3;

// Feature flags
const ENABLE_SERVER_PDF_RENDER = process.env.ENABLE_SERVER_PDF_RENDER === "true";

/**
 * Main document processing function.
 * Triggered by: document.uploaded event
 */
export const processDocument = inngest.createFunction(
  {
    id: "process-document",
    retries: MAX_RETRIES,
    onFailure: async ({ error, event }) => {
      const { documentId } = event.data;
      await updateDocumentStatus(documentId, "failed", {
        errorMessage: error.message,
        errorDetails: { stack: error.stack },
      });
    },
  },
  { event: "document.uploaded" },
  async ({ event, step }) => {
    const { documentId, userId } = event.data;

    // Step 1: Load document metadata
    const doc = await step.run("load-document", async () => {
      const { data, error } = await supabaseAdmin
        .from("documents")
        .select("id, case_id, storage_path, source_filename, type, file_size_bytes")
        .eq("id", documentId)
        .single();

      if (error || !data) {
        throw new Error(`Document not found: ${documentId}`);
      }

      return data;
    });

    // Step 2: Mark as processing
    await step.run("mark-processing", async () => {
      await updateDocumentStatus(documentId, "processing", {
        extractionStartedAt: new Date().toISOString(),
      });
    });

    // Step 3: Download PDF from storage
    const pdfBytes = await step.run("download-pdf", async () => {
      const { data, error } = await supabaseAdmin.storage
        .from("documents")
        .download(doc.storage_path);

      if (error || !data) {
        throw new Error(`Failed to download PDF: ${error?.message}`);
      }

      return Buffer.from(await data.arrayBuffer());
    });

    // Step 4: Validate file size
    await step.run("validate-file-size", async () => {
      if (pdfBytes.length > MAX_FILE_SIZE_BYTES) {
        const sizeMB = (pdfBytes.length / (1024 * 1024)).toFixed(1);
        throw new FileTooLargeError(
          `This file is ${sizeMB} MB, which exceeds the ${MAX_FILE_SIZE_MB} MB limit. ` +
          `Please upload a smaller file or split your document into parts.`
        );
      }
    });

    // Step 5: Check page count and split if needed
    const pdfChunks = await step.run("prepare-chunks", async () => {
      const pageCount = await getPdfPageCount(pdfBytes);

      if (pageCount <= DOCAI_PAGE_LIMIT) {
        return [{ bytes: pdfBytes, pageOffset: 0, pageCount }];
      }

      console.log(`Document has ${pageCount} pages, splitting into chunks...`);
      const chunks = await splitPdfByPages(pdfBytes, DOCAI_PAGE_LIMIT);
      
      return chunks.map((bytes, index) => ({
        bytes,
        pageOffset: index * DOCAI_PAGE_LIMIT,
        pageCount: Math.min(DOCAI_PAGE_LIMIT, pageCount - index * DOCAI_PAGE_LIMIT),
      }));
    });

    // Step 6: Extract each chunk with Document AI
    // FIX #2: Track partial extraction failures
    const extractionResult = await step.run("extract-all-chunks", async () => {
      const results: Array<{
        pageOffset: number;
        pages: ExtractedPage[];
        blocks: ExtractedBlock[];
      }> = [];
      
      const failedChunks: Array<{
        pageOffset: number;
        pageCount: number;
        error: string;
      }> = [];

      for (const chunk of pdfChunks) {
        try {
          const result = await extractWithRetry(chunk.bytes, DOCAI_CONFIG, {
            pageOffset: chunk.pageOffset,
            maxRetries: 2,
          });

          results.push({
            pageOffset: chunk.pageOffset,
            pages: result.pages,
            blocks: result.blocks,
          });
        } catch (error: any) {
          console.error(`Extraction failed for chunk at offset ${chunk.pageOffset}:`, error);
          
          // Track the failure
          failedChunks.push({
            pageOffset: chunk.pageOffset,
            pageCount: chunk.pageCount,
            error: error.message || "Unknown error",
          });
          
          // Non-retryable errors fail the whole job
          if (error instanceof DocAIError && !error.retryable) {
            throw error;
          }
          
          // For retryable errors, continue with other chunks
        }
      }

      if (results.length === 0) {
        throw new Error("All extraction chunks failed");
      }

      // Calculate extraction completeness
      const totalExpectedPages = pdfChunks.reduce((sum, c) => sum + c.pageCount, 0);
      const extractedPages = results.reduce((sum, r) => sum + r.pages.length, 0);
      const isPartial = failedChunks.length > 0;

      return {
        results,
        failedChunks,
        isPartial,
        totalExpectedPages,
        extractedPages,
      };
    });

    // Step 7: Persist extracted pages
    const totalPages = await step.run("persist-pages", async () => {
      let pageCount = 0;

      for (const result of extractionResult.results) {
        for (const page of result.pages) {
          const { error } = await supabaseAdmin.from("document_pages").upsert(
            {
              document_id: documentId,
              page_number: page.pageNumber,
              text: page.text,
              text_normalized: page.textNormalized,
              word_count: page.wordCount,
              confidence: page.confidence,
            },
            { onConflict: "document_id,page_number" }
          );

          if (error) {
            console.error(`Failed to persist page ${page.pageNumber}:`, error);
          } else {
            pageCount++;
          }
        }
      }

      return pageCount;
    });

    // Step 8: Persist extracted blocks (delete-then-insert for idempotency)
    await step.run("persist-blocks", async () => {
      // Delete existing blocks (handles retries)
      const { error: deleteError } = await supabaseAdmin
        .from("document_blocks")
        .delete()
        .eq("document_id", documentId);
      
      if (deleteError) {
        console.error("Failed to delete existing blocks:", deleteError);
      }

      // Insert fresh blocks
      for (const result of extractionResult.results) {
        const blocksToInsert = result.blocks.map((block) => ({
          document_id: documentId,
          page_number: block.pageNumber,
          block_type: block.blockType,
          text: block.text,
          text_normalized: block.textNormalized,
          bbox: block.bbox,
          confidence: block.confidence,
          reading_order: block.readingOrder,
        }));

        // Insert in batches of 100
        for (let i = 0; i < blocksToInsert.length; i += 100) {
          const batch = blocksToInsert.slice(i, i + 100);
          const { error } = await supabaseAdmin.from("document_blocks").insert(batch);

          if (error) {
            console.error(`Failed to persist block batch:`, error);
          }
        }
      }
    });

    // Step 9: Optional server-side PDF rendering
    if (ENABLE_SERVER_PDF_RENDER) {
      await step.run("render-page-images", async () => {
        try {
          const { renderPagesToImages } = await import("@/lib/pdf-render");
          
          const images = await renderPagesToImages(pdfBytes, {
            format: "webp",
            quality: 80,
            maxWidth: 1200,
          });

          for (const image of images) {
            const imagePath = `${userId}/${documentId}/pages/${image.pageNumber}.webp`;
            
            const { error: uploadError } = await supabaseAdmin.storage
              .from("documents")
              .upload(imagePath, image.buffer, {
                contentType: "image/webp",
                upsert: true,
              });

            if (uploadError) {
              console.error(`Failed to upload page image ${image.pageNumber}:`, uploadError);
              continue;
            }

            await supabaseAdmin.from("document_pages").update({
              image_storage_path: imagePath,
              image_width: image.width,
              image_height: image.height,
            }).eq("document_id", documentId).eq("page_number", image.pageNumber);
          }
        } catch (error) {
          console.error("Page image rendering failed (optional):", error);
        }
      });
    }

    // Step 10: Mark as extracted with partial extraction info
    await step.run("mark-extracted", async () => {
      // FIX #2: Store extraction warnings for partial extractions
      const updateData: Record<string, any> = {
        status: "extracted",
        page_count: totalPages,
        extraction_completed_at: new Date().toISOString(),
        is_partial_extraction: extractionResult.isPartial, // Explicit boolean for easy UI queries
      };

      if (extractionResult.isPartial) {
        const failedPageRanges = extractionResult.failedChunks
          .map(c => `pages ${c.pageOffset + 1}-${c.pageOffset + c.pageCount}`)
          .join(", ");
        
        updateData.error_message = 
          `Extraction partially failed (${failedPageRanges}). ` +
          `Findings may be incomplete. Consider re-uploading a clearer copy or splitting the file.`;
        
        updateData.error_details = {
          partial_extraction: true,
          failed_chunks: extractionResult.failedChunks,
          extracted_pages: extractionResult.extractedPages,
          expected_pages: extractionResult.totalExpectedPages,
        };
      }

      await supabaseAdmin
        .from("documents")
        .update(updateData)
        .eq("id", documentId);
    });

    // Step 11: Emit event for analysis with partial flag
    await step.run("emit-extracted-event", async () => {
      await inngest.send({
        name: "document.extracted",
        data: {
          documentId,
          pageCount: totalPages,
          isPartial: extractionResult.isPartial, // FIX #2: Pass partial flag
          extractedPages: extractionResult.extractedPages,
          expectedPages: extractionResult.totalExpectedPages,
        },
      });
    });

    return {
      success: true,
      documentId,
      pageCount: totalPages,
      blockCount: extractionResult.results.reduce((sum, r) => sum + r.blocks.length, 0),
      isPartial: extractionResult.isPartial,
      failedChunks: extractionResult.failedChunks,
    };
  }
);

/**
 * Custom error for file size violations.
 */
class FileTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileTooLargeError";
  }
}

/**
 * Helper to update document status.
 */
async function updateDocumentStatus(
  documentId: string,
  status: string,
  extras: Record<string, any> = {}
): Promise<void> {
  const updateData: Record<string, any> = { status };

  if (extras.errorMessage) updateData.error_message = extras.errorMessage;
  if (extras.errorDetails) updateData.error_details = extras.errorDetails;
  if (extras.pageCount) updateData.page_count = extras.pageCount;
  if (extras.extractionStartedAt) updateData.extraction_started_at = extras.extractionStartedAt;
  if (extras.extractionCompletedAt) updateData.extraction_completed_at = extras.extractionCompletedAt;

  const { error } = await supabaseAdmin
    .from("documents")
    .update(updateData)
    .eq("id", documentId);

  if (error) {
    console.error(`Failed to update document status:`, error);
  }
}
