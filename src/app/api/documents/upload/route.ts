// src/app/api/documents/upload/route.ts
// API route to handle document record creation and trigger processing
//
// Flow (updated):
// 1. Validate request (auth, metadata)
// 2. Create document record in database
// 3. File is already uploaded to Supabase Storage by client
// 4. Emit document.uploaded event to Inngest
// 5. Return document ID for client to poll status

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from '@/lib/supabase';
import { inngest } from "@/inngest/client";

// Force Node.js runtime (required for file system operations in WIF auth)
export const runtime = "nodejs";

// =============================================================================
// ERROR CODES AND MESSAGES
// =============================================================================

interface ApiError {
  code: string;
  message: string;
  hint?: string;
  status: number;
}

const ERRORS = {
  // Authentication errors (401)
  AUTH_MISSING: {
    code: "AUTH_MISSING",
    message: "Please sign in to upload documents.",
    hint: "Make sure you're logged in and try again.",
    status: 401,
  },
  AUTH_INVALID: {
    code: "AUTH_INVALID",
    message: "Your session has expired. Please sign in again.",
    hint: "Try logging out and back in.",
    status: 401,
  },

  // Authorization errors (403)
  ACCESS_DENIED: {
    code: "ACCESS_DENIED",
    message: "You don't have permission to access this resource.",
    hint: "Make sure you're uploading to your own case.",
    status: 403,
  },

  // Validation errors (400)
  INVALID_CONTENT_TYPE: {
    code: "INVALID_CONTENT_TYPE",
    message: "Invalid request format.",
    hint: "The request must be sent as JSON.",
    status: 415,
  },
  MISSING_DOCUMENT_ID: {
    code: "MISSING_DOCUMENT_ID",
    message: "Document ID is required.",
    hint: "Please try uploading your document again.",
    status: 400,
  },
  MISSING_STORAGE_PATH: {
    code: "MISSING_STORAGE_PATH",
    message: "The file upload did not complete successfully.",
    hint: "Please try uploading your document again. If the problem persists, try a smaller file.",
    status: 400,
  },
  MISSING_CASE_ID: {
    code: "MISSING_CASE_ID",
    message: "Please select a case before uploading.",
    hint: "Create a new case or select an existing one from your dashboard.",
    status: 400,
  },
  MISSING_FILE_INFO: {
    code: "MISSING_FILE_INFO",
    message: "File information is incomplete.",
    hint: "Please try uploading your document again.",
    status: 400,
  },
  INVALID_FILE_TYPE: {
    code: "INVALID_FILE_TYPE",
    message: "This file type is not supported.",
    hint: "Please upload a PDF file. Other formats like Word documents should be converted to PDF first.",
    status: 400,
  },
  FILE_TOO_LARGE: {
    code: "FILE_TOO_LARGE",
    message: "This file is too large to process.",
    hint: "The maximum file size is 50MB. Try reducing the file size or splitting into smaller documents.",
    status: 400,
  },

  // Not found errors (404)
  CASE_NOT_FOUND: {
    code: "CASE_NOT_FOUND",
    message: "We couldn't find that case.",
    hint: "The case may have been deleted. Please select a different case or create a new one.",
    status: 404,
  },
  DOCUMENT_NOT_FOUND: {
    code: "DOCUMENT_NOT_FOUND",
    message: "We couldn't find that document.",
    hint: "The document may have been deleted or you may not have access to it.",
    status: 404,
  },

  // Server errors (500)
  DOCUMENT_CREATE_FAILED: {
    code: "DOCUMENT_CREATE_FAILED",
    message: "We couldn't save your document. Please try again.",
    hint: "If this problem persists, please contact support with error code DOCUMENT_CREATE_FAILED.",
    status: 500,
  },
  PROCESSING_START_FAILED: {
    code: "PROCESSING_START_FAILED",
    message: "Your document was saved but processing couldn't start.",
    hint: "Processing will be retried automatically. Check back in a few minutes.",
    status: 500,
  },
  INTERNAL_ERROR: {
    code: "INTERNAL_ERROR",
    message: "Something went wrong on our end.",
    hint: "Please try again. If the problem persists, contact support.",
    status: 500,
  },
} as const;

function errorResponse(error: ApiError, details?: string) {
  console.error(`[${error.code}] ${error.message}`, details ? `Details: ${details}` : "");

  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        hint: error.hint,
      },
    },
    { status: error.status }
  );
}

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

interface UploadRequest {
  documentId: string;
  storagePath: string;
  caseId: string;
  type: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = ["application/pdf"];

function validateUploadRequest(body: Partial<UploadRequest>): ApiError | null {
  if (!body.documentId) return ERRORS.MISSING_DOCUMENT_ID;
  if (!body.storagePath) return ERRORS.MISSING_STORAGE_PATH;
  if (!body.caseId) return ERRORS.MISSING_CASE_ID;
  if (!body.type || !body.fileName) return ERRORS.MISSING_FILE_INFO;

  // File type validation
  if (body.mimeType && !ALLOWED_MIME_TYPES.includes(body.mimeType)) {
    return ERRORS.INVALID_FILE_TYPE;
  }

  // File size validation
  if (body.fileSize && body.fileSize > MAX_FILE_SIZE) {
    return ERRORS.FILE_TOO_LARGE;
  }

  return null;
}

// =============================================================================
// API HANDLERS
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // 0. Validate Content-Type
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return errorResponse(ERRORS.INVALID_CONTENT_TYPE);
    }

    // 1. Get auth token from header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(ERRORS.AUTH_MISSING);
    }

    const token = authHeader.slice(7);

    // Verify the token and get user
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);

    if (authError || !user) {
      return errorResponse(ERRORS.AUTH_INVALID, authError?.message);
    }

    // 2. Parse and validate JSON body
    let body: UploadRequest;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ERRORS.INVALID_CONTENT_TYPE, "Invalid JSON");
    }

    const validationError = validateUploadRequest(body);
    if (validationError) {
      return errorResponse(validationError);
    }

    const { documentId, storagePath, caseId, type, fileName, fileSize, mimeType } = body;

    // 3. Verify user owns the case
    const { data: caseData, error: caseError } = await getSupabaseAdmin()
      .from("cases")
      .select(`
        id,
        child:children!inner(user_id)
      `)
      .eq("id", caseId)
      .single();

    if (caseError || !caseData) {
      return errorResponse(ERRORS.CASE_NOT_FOUND, caseError?.message);
    }

    // Type assertion for the joined data
    const childData = caseData.child as unknown as { user_id: string };
    if (childData.user_id !== user.id) {
      return errorResponse(ERRORS.ACCESS_DENIED);
    }

    // 4. Create document record
    const { data: document, error: docError } = await getSupabaseAdmin()
      .from("documents")
      .insert({
        id: documentId,
        case_id: caseId,
        type: type,
        source_filename: fileName,
        storage_path: storagePath,
        mime_type: mimeType,
        file_size_bytes: fileSize,
        status: "uploaded",
      })
      .select("id")
      .single();

    if (docError || !document) {
      return errorResponse(ERRORS.DOCUMENT_CREATE_FAILED, docError?.message);
    }

    // 5. Emit Inngest event to start processing
    try {
      await inngest.send({
        name: "document.uploaded",
        data: {
          documentId: document.id,
          userId: user.id,
        },
      });
    } catch (inngestError: any) {
      // Document was created but processing couldn't start
      // Don't fail the request - processing will be retried
      console.error("Failed to emit Inngest event:", inngestError);
      return NextResponse.json({
        success: true,
        documentId: document.id,
        message: "Document uploaded. Processing will start shortly.",
        warning: "Processing queue is busy. Your document will be processed soon.",
      });
    }

    // 6. Return success
    return NextResponse.json({
      success: true,
      documentId: document.id,
      message: "Document uploaded successfully! Processing will begin shortly.",
    });

  } catch (error: any) {
    return errorResponse(ERRORS.INTERNAL_ERROR, error?.message);
  }
}

// GET endpoint to check document status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(ERRORS.AUTH_MISSING);
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);

    if (authError || !user) {
      return errorResponse(ERRORS.AUTH_INVALID, authError?.message);
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return errorResponse(ERRORS.MISSING_DOCUMENT_ID);
    }

    // Get document with ownership check via RLS helper pattern
    const { data: document, error } = await getSupabaseAdmin()
      .from("documents")
      .select(`
        id,
        status,
        page_count,
        error_message,
        is_partial_extraction,
        created_at,
        case:cases!inner(
          id,
          child:children!inner(user_id)
        )
      `)
      .eq("id", documentId)
      .single();

    if (error || !document) {
      return errorResponse(ERRORS.DOCUMENT_NOT_FOUND, error?.message);
    }

    // Verify ownership
    const caseData = document.case as unknown as { child: { user_id: string } };
    if (caseData.child.user_id !== user.id) {
      return errorResponse(ERRORS.ACCESS_DENIED);
    }

    // Map status to user-friendly message
    const statusMessages: Record<string, string> = {
      uploaded: "Your document is queued for processing.",
      processing: "Extracting text from your document...",
      extracted: "Text extraction complete. Starting analysis...",
      analyzing: "Analyzing your document for potential issues...",
      complete: "Analysis complete! Your findings are ready to review.",
      analysis_failed: "We encountered an issue analyzing your document.",
      failed: "We couldn't process your document.",
    };

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        status: document.status,
        statusMessage: statusMessages[document.status] || "Processing...",
        pageCount: document.page_count,
        errorMessage: document.error_message,
        isPartialExtraction: document.is_partial_extraction,
        createdAt: document.created_at,
      },
    });

  } catch (error: any) {
    return errorResponse(ERRORS.INTERNAL_ERROR, error?.message);
  }
}
