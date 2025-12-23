// src/lib/pdf-utils.ts
// PDF manipulation utilities using pdf-lib

import { PDFDocument } from "pdf-lib";

/**
 * Get the page count of a PDF without fully parsing it.
 */
export async function getPdfPageCount(pdfBytes: Buffer): Promise<number> {
  const doc = await PDFDocument.load(pdfBytes, {
    updateMetadata: false,
  });
  return doc.getPageCount();
}

/**
 * Split a PDF into chunks of maxPages each.
 * Returns array of PDF buffers, one per chunk.
 */
export async function splitPdfByPages(
  pdfBytes: Buffer,
  maxPages: number
): Promise<Buffer[]> {
  const sourceDoc = await PDFDocument.load(pdfBytes);
  const totalPages = sourceDoc.getPageCount();
  const chunks: Buffer[] = [];

  for (let startPage = 0; startPage < totalPages; startPage += maxPages) {
    const endPage = Math.min(startPage + maxPages, totalPages);
    const pageIndices = Array.from(
      { length: endPage - startPage },
      (_, i) => startPage + i
    );

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(sourceDoc, pageIndices);
    
    for (const page of copiedPages) {
      newDoc.addPage(page);
    }

    const chunkBytes = await newDoc.save();
    chunks.push(Buffer.from(chunkBytes));
  }

  return chunks;
}

/**
 * Extract a single page from a PDF.
 */
export async function extractPage(
  pdfBytes: Buffer,
  pageNumber: number // 1-based
): Promise<Buffer> {
  const sourceDoc = await PDFDocument.load(pdfBytes);
  const pageIndex = pageNumber - 1;

  if (pageIndex < 0 || pageIndex >= sourceDoc.getPageCount()) {
    throw new Error(`Page ${pageNumber} out of range`);
  }

  const newDoc = await PDFDocument.create();
  const [copiedPage] = await newDoc.copyPages(sourceDoc, [pageIndex]);
  newDoc.addPage(copiedPage);

  const bytes = await newDoc.save();
  return Buffer.from(bytes);
}

/**
 * Merge multiple PDFs into one.
 */
export async function mergePdfs(pdfBuffers: Buffer[]): Promise<Buffer> {
  const mergedDoc = await PDFDocument.create();

  for (const pdfBytes of pdfBuffers) {
    const sourceDoc = await PDFDocument.load(pdfBytes);
    const pageIndices = Array.from(
      { length: sourceDoc.getPageCount() },
      (_, i) => i
    );
    const copiedPages = await mergedDoc.copyPages(sourceDoc, pageIndices);
    
    for (const page of copiedPages) {
      mergedDoc.addPage(page);
    }
  }

  const bytes = await mergedDoc.save();
  return Buffer.from(bytes);
}

/**
 * Get basic PDF metadata.
 */
export async function getPdfMetadata(pdfBytes: Buffer): Promise<{
  pageCount: number;
  title?: string;
  author?: string;
  creationDate?: Date;
  modificationDate?: Date;
}> {
  const doc = await PDFDocument.load(pdfBytes, {
    updateMetadata: false,
  });

  return {
    pageCount: doc.getPageCount(),
    title: doc.getTitle() || undefined,
    author: doc.getAuthor() || undefined,
    creationDate: doc.getCreationDate() || undefined,
    modificationDate: doc.getModificationDate() || undefined,
  };
}
