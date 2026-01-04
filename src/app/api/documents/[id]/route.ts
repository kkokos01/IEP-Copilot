import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Error codes and messages
const ERRORS = {
  AUTH_MISSING: {
    code: "AUTH_MISSING",
    message: "Authentication required",
    hint: "Please sign in to manage documents",
    status: 401,
  },
  AUTH_INVALID: {
    code: "AUTH_INVALID",
    message: "Invalid authentication token",
    hint: "Please sign in again",
    status: 401,
  },
  DOCUMENT_NOT_FOUND: {
    code: "DOCUMENT_NOT_FOUND",
    message: "Document not found",
    hint: "The document may have been deleted or you don't have permission to access it",
    status: 404,
  },
  INVALID_FILENAME: {
    code: "INVALID_FILENAME",
    message: "Invalid filename",
    hint: "Filename must be non-empty and less than 255 characters",
    status: 400,
  },
  INVALID_DOCUMENT_TYPE: {
    code: "INVALID_DOCUMENT_TYPE",
    message: "Invalid document type",
    hint: "Must be one of: iep, evaluation, progress_report, email, meeting_notes, prior_written_notice, other",
    status: 400,
  },
  DELETE_FAILED: {
    code: "DELETE_FAILED",
    message: "Failed to delete document",
    hint: "An error occurred while deleting the document. Please try again.",
    status: 500,
  },
  UPDATE_FAILED: {
    code: "UPDATE_FAILED",
    message: "Failed to update document",
    hint: "An error occurred while updating the document. Please try again.",
    status: 500,
  },
  STORAGE_CLEANUP_FAILED: {
    code: "STORAGE_CLEANUP_FAILED",
    message: "Document deleted but storage cleanup failed",
    hint: "The document record was deleted but some files may remain. Contact support if this persists.",
    status: 200, // Still return 200 since main operation succeeded
  },
} as const;

function errorResponse(error: (typeof ERRORS)[keyof typeof ERRORS]) {
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

// Valid document types
const VALID_DOCUMENT_TYPES = [
  'iep',
  'evaluation',
  'progress_report',
  'email',
  'meeting_notes',
  'prior_written_notice',
  'other',
] as const;

/**
 * GET /api/documents/[id]
 * Get document details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(ERRORS.AUTH_MISSING);
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);

    if (authError || !user) {
      return errorResponse(ERRORS.AUTH_INVALID);
    }

    const { id: documentId } = await params;

    // Get document with ownership verification (use admin client, verify manually)
    const { data: document, error: docError } = await getSupabaseAdmin()
      .from("documents")
      .select(`
        *,
        cases!inner(
          id,
          name,
          children!inner(
            id,
            name,
            user_id
          )
        )
      `)
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return errorResponse(ERRORS.DOCUMENT_NOT_FOUND);
    }

    // Verify ownership - explicit check required when using admin client
    if (document.cases.children.user_id !== user.id) {
      return errorResponse(ERRORS.DOCUMENT_NOT_FOUND);
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error: any) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          hint: "Please try again later",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/documents/[id]
 * Update document metadata (rename, recategorize)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(ERRORS.AUTH_MISSING);
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);

    if (authError || !user) {
      return errorResponse(ERRORS.AUTH_INVALID);
    }

    const { id: documentId } = await params;
    const body = await request.json();

    // Validate updates
    const updates: any = {};

    // Rename operation
    if (body.source_filename !== undefined) {
      const filename = body.source_filename.trim();
      if (!filename || filename.length > 255) {
        return errorResponse(ERRORS.INVALID_FILENAME);
      }
      updates.source_filename = filename;
    }

    // Recategorize operation
    if (body.type !== undefined) {
      if (!VALID_DOCUMENT_TYPES.includes(body.type)) {
        return errorResponse(ERRORS.INVALID_DOCUMENT_TYPE);
      }
      updates.type = body.type;
    }

    // IEP-specific date updates
    if (body.effective_date !== undefined) {
      updates.effective_date = body.effective_date;
    }
    if (body.meeting_date !== undefined) {
      updates.meeting_date = body.meeting_date;
    }

    // No updates provided
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: true,
        message: "No updates provided",
      });
    }

    // Add updated timestamp
    updates.updated_at = new Date().toISOString();

    // Get current document for audit log and ownership verification
    const { data: currentDoc, error: fetchError } = await getSupabaseAdmin()
      .from("documents")
      .select("*, cases!inner(id, children!inner(user_id))")
      .eq("id", documentId)
      .single();

    if (fetchError || !currentDoc) {
      return errorResponse(ERRORS.DOCUMENT_NOT_FOUND);
    }

    // Verify ownership - explicit check required when using admin client
    if (currentDoc.cases.children.user_id !== user.id) {
      return errorResponse(ERRORS.DOCUMENT_NOT_FOUND);
    }

    // Update document using admin client (ownership already verified)
    const { data: updatedDoc, error: updateError } = await getSupabaseAdmin()
      .from("documents")
      .update(updates)
      .eq("id", documentId)
      .select()
      .single();

    if (updateError) {
      console.error("Document update error:", updateError);
      return errorResponse(ERRORS.UPDATE_FAILED);
    }

    // Audit log
    try {
      await getSupabaseAdmin()
        .from("audit_log")
        .insert({
          user_id: user.id,
          entity_type: "document",
          entity_id: documentId,
          case_id: currentDoc.case_id,
          action: "update",
          metadata: {
            updates,
            old_values: {
              source_filename: currentDoc.source_filename,
              type: currentDoc.type,
              effective_date: currentDoc.effective_date,
              meeting_date: currentDoc.meeting_date,
            },
          },
        });
    } catch (auditError) {
      // Don't fail the request if audit log fails
      console.error("Audit log error:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Document updated successfully",
      document: updatedDoc,
    });
  } catch (error: any) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          hint: "Please try again later",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id]
 * Delete document and clean up storage
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(ERRORS.AUTH_MISSING);
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);

    if (authError || !user) {
      return errorResponse(ERRORS.AUTH_INVALID);
    }

    const { id: documentId } = await params;

    // Get document for storage cleanup, audit log, and ownership verification
    const { data: document, error: docError } = await getSupabaseAdmin()
      .from("documents")
      .select(`
        *,
        cases!inner(
          id,
          children!inner(
            user_id
          )
        )
      `)
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return errorResponse(ERRORS.DOCUMENT_NOT_FOUND);
    }

    // Verify ownership - explicit check required when using admin client
    if (document.cases.children.user_id !== user.id) {
      return errorResponse(ERRORS.DOCUMENT_NOT_FOUND);
    }

    // Store info for cleanup and audit
    const storagePath = document.storage_path;
    const caseId = document.case_id;
    const metadata = {
      source_filename: document.source_filename,
      type: document.type,
      storage_path: storagePath,
      file_size_bytes: document.file_size_bytes,
      page_count: document.page_count,
    };

    // Delete from database using admin client (cascades to all dependent data)
    const { error: deleteError } = await getSupabaseAdmin()
      .from("documents")
      .delete()
      .eq("id", documentId);

    if (deleteError) {
      console.error("Document deletion error:", deleteError);
      return errorResponse(ERRORS.DELETE_FAILED);
    }

    // Clean up storage (bypass RLS with admin client)
    let storageCleanupError = false;
    try {
      // Extract user ID and document ID from storage path
      // Format: {userId}/{documentId}/original.pdf
      const pathParts = storagePath.split("/");
      if (pathParts.length >= 2) {
        const userId = pathParts[0];
        const docId = pathParts[1];

        // List all files for this document
        const { data: files, error: listError } = await getSupabaseAdmin()
          .storage
          .from("documents")
          .list(`${userId}/${docId}`);

        if (!listError && files && files.length > 0) {
          // Remove all files
          const filePaths = files.map(f => `${userId}/${docId}/${f.name}`);
          const { error: removeError } = await getSupabaseAdmin()
            .storage
            .from("documents")
            .remove(filePaths);

          if (removeError) {
            console.error("Storage removal error:", removeError);
            storageCleanupError = true;
          }

          // Also try to remove the directory-level files (original.pdf, etc.)
          const { error: dirRemoveError } = await getSupabaseAdmin()
            .storage
            .from("documents")
            .remove([storagePath]);

          if (dirRemoveError) {
            console.error("Storage directory removal error:", dirRemoveError);
          }
        }
      }
    } catch (storageError) {
      console.error("Storage cleanup error:", storageError);
      storageCleanupError = true;
    }

    // Audit log
    try {
      await getSupabaseAdmin()
        .from("audit_log")
        .insert({
          user_id: user.id,
          entity_type: "document",
          entity_id: documentId,
          case_id: caseId,
          action: "delete",
          metadata,
        });
    } catch (auditError) {
      // Don't fail the request if audit log fails
      console.error("Audit log error:", auditError);
    }

    // Return success, warn if storage cleanup failed
    if (storageCleanupError) {
      return NextResponse.json({
        success: true,
        warning: ERRORS.STORAGE_CLEANUP_FAILED.message,
        message: "Document deleted successfully, but some storage files may remain",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          hint: "Please try again later",
        },
      },
      { status: 500 }
    );
  }
}
