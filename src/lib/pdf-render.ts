// src/lib/pdf-render.ts
// Server-side PDF page rendering for consistent highlighting

import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";

const execFileAsync = promisify(execFile);

interface RenderOptions {
  format?: "png" | "webp" | "jpeg";
  quality?: number; // 1-100 for jpeg/webp
  maxWidth?: number;
  maxHeight?: number;
  dpi?: number;
}

interface RenderedPage {
  pageNumber: number;
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

/**
 * Render all pages of a PDF to images.
 * Uses pdftoppm (poppler-utils) for high-quality rendering.
 * 
 * Requires: poppler-utils installed (apt-get install poppler-utils)
 */
export async function renderPagesToImages(
  pdfBytes: Buffer,
  options: RenderOptions = {}
): Promise<RenderedPage[]> {
  const {
    format = "webp",
    quality = 85,
    maxWidth = 1200,
    dpi = 150,
  } = options;

  // Create temp directory for this operation
  const tempDir = join(tmpdir(), `pdf-render-${randomUUID()}`);
  await mkdir(tempDir, { recursive: true });

  const inputPath = join(tempDir, "input.pdf");
  const outputPrefix = join(tempDir, "page");

  try {
    // Write PDF to temp file
    await writeFile(inputPath, pdfBytes);

    // Build pdftoppm command
    const args = [
      "-r", String(dpi),
    ];

    // Output format
    if (format === "png") {
      args.push("-png");
    } else if (format === "jpeg") {
      args.push("-jpeg");
      args.push("-jpegopt", `quality=${quality}`);
    } else {
      // For webp, we render as PNG first then convert
      args.push("-png");
    }

    // Scale to max width if specified
    if (maxWidth) {
      args.push("-scale-to-x", String(maxWidth));
      args.push("-scale-to-y", "-1"); // Maintain aspect ratio
    }

    args.push(inputPath, outputPrefix);

    // Run pdftoppm
    await execFileAsync("pdftoppm", args);

    // Find and read rendered files
    const renderedPages: RenderedPage[] = [];
    
    // pdftoppm outputs files like: page-1.png, page-2.png, etc.
    // Or page-01.png, page-02.png for documents with >9 pages
    let pageNumber = 1;
    
    while (true) {
      // Try different naming patterns
      const possibleNames = [
        `page-${pageNumber}.${format === "webp" ? "png" : format}`,
        `page-${String(pageNumber).padStart(2, "0")}.${format === "webp" ? "png" : format}`,
        `page-${String(pageNumber).padStart(3, "0")}.${format === "webp" ? "png" : format}`,
      ];

      let pageBuffer: Buffer | null = null;
      let foundPath: string | null = null;

      for (const name of possibleNames) {
        const path = join(tempDir, name);
        try {
          pageBuffer = await readFile(path);
          foundPath = path;
          break;
        } catch {
          // File doesn't exist, try next pattern
        }
      }

      if (!pageBuffer || !foundPath) {
        break; // No more pages
      }

      // Convert to webp if requested
      let finalBuffer = pageBuffer;
      let finalFormat = format === "webp" ? "png" : format;

      if (format === "webp") {
        finalBuffer = await convertToWebp(pageBuffer, quality);
        finalFormat = "webp";
      }

      // Get image dimensions (simple approach: read from buffer)
      const dimensions = getImageDimensions(pageBuffer);

      renderedPages.push({
        pageNumber,
        buffer: finalBuffer,
        width: dimensions.width,
        height: dimensions.height,
        format: finalFormat,
      });

      // Clean up this page file
      await unlink(foundPath).catch(() => {});

      pageNumber++;
    }

    return renderedPages;
  } finally {
    // Clean up temp directory
    await cleanupDir(tempDir);
  }
}

/**
 * Render a single page of a PDF.
 */
export async function renderSinglePage(
  pdfBytes: Buffer,
  pageNumber: number,
  options: RenderOptions = {}
): Promise<RenderedPage> {
  const {
    format = "webp",
    quality = 85,
    maxWidth = 1200,
    dpi = 150,
  } = options;

  const tempDir = join(tmpdir(), `pdf-render-${randomUUID()}`);
  await mkdir(tempDir, { recursive: true });

  const inputPath = join(tempDir, "input.pdf");
  const outputPrefix = join(tempDir, "page");

  try {
    await writeFile(inputPath, pdfBytes);

    const args = [
      "-r", String(dpi),
      "-f", String(pageNumber),
      "-l", String(pageNumber),
    ];

    if (format === "png") {
      args.push("-png");
    } else if (format === "jpeg") {
      args.push("-jpeg");
      args.push("-jpegopt", `quality=${quality}`);
    } else {
      args.push("-png");
    }

    if (maxWidth) {
      args.push("-scale-to-x", String(maxWidth));
      args.push("-scale-to-y", "-1");
    }

    args.push(inputPath, outputPrefix);

    await execFileAsync("pdftoppm", args);

    // Find the output file
    const ext = format === "webp" ? "png" : format;
    const possibleNames = [
      `page-${pageNumber}.${ext}`,
      `page-${String(pageNumber).padStart(2, "0")}.${ext}`,
      `page-${String(pageNumber).padStart(3, "0")}.${ext}`,
    ];

    let pageBuffer: Buffer | null = null;

    for (const name of possibleNames) {
      try {
        pageBuffer = await readFile(join(tempDir, name));
        break;
      } catch {
        // Try next
      }
    }

    if (!pageBuffer) {
      throw new Error(`Failed to render page ${pageNumber}`);
    }

    let finalBuffer = pageBuffer;
    if (format === "webp") {
      finalBuffer = await convertToWebp(pageBuffer, quality);
    }

    const dimensions = getImageDimensions(pageBuffer);

    return {
      pageNumber,
      buffer: finalBuffer,
      width: dimensions.width,
      height: dimensions.height,
      format: format,
    };
  } finally {
    await cleanupDir(tempDir);
  }
}

/**
 * Convert PNG buffer to WebP using cwebp.
 * Requires: webp package installed (apt-get install webp)
 */
async function convertToWebp(pngBuffer: Buffer, quality: number): Promise<Buffer> {
  const tempDir = join(tmpdir(), `webp-convert-${randomUUID()}`);
  await mkdir(tempDir, { recursive: true });

  const inputPath = join(tempDir, "input.png");
  const outputPath = join(tempDir, "output.webp");

  try {
    await writeFile(inputPath, pngBuffer);
    
    await execFileAsync("cwebp", [
      "-q", String(quality),
      inputPath,
      "-o", outputPath,
    ]);

    return await readFile(outputPath);
  } catch (error) {
    // If cwebp fails, return original PNG
    console.warn("WebP conversion failed, returning PNG:", error);
    return pngBuffer;
  } finally {
    await cleanupDir(tempDir);
  }
}

/**
 * Get image dimensions from PNG buffer.
 * PNG header: bytes 16-19 = width, bytes 20-23 = height (big-endian)
 */
function getImageDimensions(buffer: Buffer): { width: number; height: number } {
  // Check PNG signature
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  // Check JPEG signature
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    // JPEG dimension parsing is more complex; return placeholder
    return { width: 0, height: 0 };
  }

  return { width: 0, height: 0 };
}

/**
 * Clean up a temp directory.
 */
async function cleanupDir(dir: string): Promise<void> {
  try {
    const { readdir, unlink, rmdir } = await import("fs/promises");
    const files = await readdir(dir);
    
    for (const file of files) {
      await unlink(join(dir, file)).catch(() => {});
    }
    
    await rmdir(dir).catch(() => {});
  } catch {
    // Ignore cleanup errors
  }
}
