import { NextResponse } from 'next/server';
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { writeFileSync, unlinkSync } from "fs";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    // Check if WIF env var is available
    const wifJson = process.env.GCP_WIF_CREDENTIALS_JSON;
    
    if (!wifJson) {
      return NextResponse.json({ 
        error: 'GCP_WIF_CREDENTIALS_JSON not found',
        envVars: {
          GCP_PROJECT_ID: !!process.env.GCP_PROJECT_ID,
          DOCAI_LOCATION: process.env.DOCAI_LOCATION,
          DOCAI_PROCESSOR_ID: process.env.DOCAI_PROCESSOR_ID,
          WIF_EXISTS: !!wifJson,
          WIF_LENGTH: wifJson?.length || 0
        }
      }, { status: 500 });
    }

    // Try to parse it
    const wif = JSON.parse(wifJson);
    
    // Test creating the Document AI client
    const tempPath = `/tmp/gcp-wif-${process.pid}-${randomUUID()}.json`;
    writeFileSync(tempPath, wifJson);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
    
    try {
      const client = new DocumentProcessorServiceClient();
      
      // Test listing processors
      const projectId = process.env.GCP_PROJECT_ID;
      const location = process.env.DOCAI_LOCATION || 'us';
      
      const [processors] = await client.listProcessors({
        parent: `projects/${projectId}/locations/${location}`
      });
      
      const processorId = process.env.DOCAI_PROCESSOR_ID || '';
      const processorExists = processorId && processors.some(p => p.name?.endsWith(processorId));
      
      return NextResponse.json({ 
        success: true,
        wifConfig: {
          type: wif.type,
          audience: wif.audience,
          environment_id: wif.credential_source?.environment_id,
          hasServiceAccount: !!wif.service_account_impersonation_url
        },
        documentAI: {
          projectId,
          location,
          processorId,
          processorExists,
          totalProcessors: processors.length,
          processorList: processors.map(p => ({
            id: p.name?.split('/').pop(),
            type: p.type,
            state: p.state
          }))
        }
      });
    } finally {
      // Clean up temp file
      if (tempPath) {
        try {
          unlinkSync(tempPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack,
      details: error.details || error.errors
    }, { status: 500 });
  }
}
