// src/app/api/documents/upload/route.ts
// API route to handle document uploads and trigger processing
//
// Flow:
// 1. Validate request (auth, file type, size)
// 2. Create document record in database
// 3. Upload file to Supabase Storage
// 4. Emit document.uploaded event to Inngest
// 5. Return document ID for client to poll status

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from '@/lib/supabase';
import { inngest } from "@/inngest/client";

// Limits
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["application/pdf"];

// Supabase admin client for server-side operations
// Note: Initialized inside handlers to avoid import-time errors

export async function POST(request: NextRequest) {
  try {
    // 1. Get auth token from header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }
    
    const token = authHeader.slice(7);
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const caseId = formData.get("caseId") as string | null;
    const documentType = (formData.get("type") as string) || "other";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!caseId) {
      return NextResponse.json(
        { error: "caseId is required" },
        { status: 400 }
      );
    }

    // 3. Validate file
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `File too large (${sizeMB} MB). Maximum size is ${MAX_FILE_SIZE_MB} MB.` },
        { status: 400 }
      );
    }

    // 4. Verify user owns the case
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from("cases")
      .select(`
        id,
        child:children!inner(user_id)
      `)
      .eq("id", caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    // Type assertion for the joined data
    const childData = caseData.child as unknown as { user_id: string };
    if (childData.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have access to this case" },
        { status: 403 }
      );
    }

    // 5. Create document record
    const { data: document, error: docError } = await supabaseAdmin
      .from("documents")
      .insert({
        case_id: caseId,
        type: documentType,
        source_filename: file.name,
        storage_path: "", // Will update after upload
        mime_type: file.type,
        file_size_bytes: file.size,
        status: "uploaded",
      })
      .select("id")
      .single();

    if (docError || !document) {
      console.error("Failed to create document record:", docError);
      return NextResponse.json(
        { error: "Failed to create document record" },
        { status: 500 }
      );
    }

    // 6. Upload to Supabase Storage
    const storagePath = `${user.id}/${document.id}/original.pdf`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await getSupabaseAdmin().storage
      .from("documents")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      // Clean up the document record
      await getSupabaseAdmin().from("documents").delete().eq("id", document.id);
      
      console.error("Failed to upload file:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      );
    }

    // 7. Update document with storage path
    await getSupabaseAdmin()
      .from("documents")
      .update({ storage_path: storagePath })
      .eq("id", document.id);

    // 8. Emit Inngest event to start processing
    await inngest.send({
      name: "document.uploaded",
      data: {
        documentId: document.id,
        userId: user.id,
      },
    });

    // 9. Return success
    return NextResponse.json({
      success: true,
      documentId: document.id,
      message: "Document uploaded and processing started",
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check document status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    // Get document with ownership check via RLS helper pattern
    const { data: document, error } = await supabaseAdmin
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
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Verify ownership
    const caseData = document.case as unknown as { child: { user_id: string } };
    if (caseData.child.user_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      id: document.id,
      status: document.status,
      pageCount: document.page_count,
      errorMessage: document.error_message,
      isPartialExtraction: document.is_partial_extraction,
      createdAt: document.created_at,
    });

  } catch (error: any) {
    console.error("Status check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
