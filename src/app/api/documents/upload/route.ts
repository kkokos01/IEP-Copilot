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

// Supabase admin client for server-side operations
// Note: Initialized inside handlers to avoid import-time errors

interface UploadRequest {
  documentId: string;
  storagePath: string;
  caseId: string;
  type: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export async function POST(request: NextRequest) {
  try {
    // 0. Validate Content-Type
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 415 }
      );
    }

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

    // 2. Parse JSON body
    const body: UploadRequest = await request.json();
    const { documentId, storagePath, caseId, type, fileName, fileSize, mimeType } = body;

    // Validate required fields
    if (!documentId || !storagePath || !caseId || !type || !fileName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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

    // 4. Create document record
    const { data: document, error: docError } = await getSupabaseAdmin()
      .from("documents")
      .insert({
        id: documentId, // Use client-generated ID
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
      console.error("Failed to create document record:", docError);
      return NextResponse.json(
        { error: "Failed to create document record" },
        { status: 500 }
      );
    }

    // 5. Emit Inngest event to start processing
    await inngest.send({
      name: "document.uploaded",
      data: {
        documentId: document.id,
        userId: user.id,
      },
    });

    // 6. Return success
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
