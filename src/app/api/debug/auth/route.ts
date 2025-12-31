import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check which auth method is configured
    const serviceAccountKey = process.env.GCP_SERVICE_ACCOUNT_KEY;
    const wifJson = process.env.GCP_WIF_CREDENTIALS_JSON;
    
    if (!serviceAccountKey && !wifJson) {
      return NextResponse.json({ 
        error: 'No GCP credentials found',
        message: 'Neither GCP_SERVICE_ACCOUNT_KEY nor GCP_WIF_CREDENTIALS_JSON is configured',
        envVars: {
          GCP_PROJECT_ID: !!process.env.GCP_PROJECT_ID,
          DOCAI_LOCATION: process.env.DOCAI_LOCATION,
          DOCAI_PROCESSOR_ID: process.env.DOCAI_PROCESSOR_ID,
          HAS_SERVICE_ACCOUNT_KEY: !!serviceAccountKey,
          HAS_WIF_CREDENTIALS: !!wifJson
        }
      }, { status: 500 });
    }

    // Return the auth configuration status
    return NextResponse.json({ 
      success: true,
      authMethod: serviceAccountKey ? 'SERVICE_ACCOUNT_KEY' : 'WIF',
      envVars: {
        GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
        DOCAI_LOCATION: process.env.DOCAI_LOCATION,
        DOCAI_PROCESSOR_ID: process.env.DOCAI_PROCESSOR_ID
      },
      recommendation: serviceAccountKey 
        ? 'Using service account key (recommended for Vercel)'
        : 'Using WIF (consider switching to service account key for reliability)'
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack,
      details: error.details || error.errors
    }, { status: 500 });
  }
}
