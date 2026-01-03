import { NextResponse } from 'next/server';

export async function GET() {
  // SECURITY: Only enable this debug endpoint in development
  // In production, this could leak configuration details to attackers
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: 'Not found'
    }, { status: 404 });
  }

  try {
    // Check which auth method is configured
    const serviceAccountKey = process.env.GCP_SERVICE_ACCOUNT_KEY;
    const serviceAccountKeyBase64 = process.env.GCP_SERVICE_ACCOUNT_KEY_BASE64;
    const wifJson = process.env.GCP_WIF_CREDENTIALS_JSON;

    if (!serviceAccountKey && !serviceAccountKeyBase64 && !wifJson) {
      return NextResponse.json({
        error: 'No GCP credentials found',
        message: 'Neither GCP_SERVICE_ACCOUNT_KEY, GCP_SERVICE_ACCOUNT_KEY_BASE64, nor GCP_WIF_CREDENTIALS_JSON is configured',
        envVars: {
          HAS_GCP_PROJECT_ID: !!process.env.GCP_PROJECT_ID,
          HAS_DOCAI_LOCATION: !!process.env.DOCAI_LOCATION,
          HAS_DOCAI_PROCESSOR_ID: !!process.env.DOCAI_PROCESSOR_ID,
          HAS_SERVICE_ACCOUNT_KEY: !!serviceAccountKey,
          HAS_SERVICE_ACCOUNT_KEY_BASE64: !!serviceAccountKeyBase64,
          HAS_WIF_CREDENTIALS: !!wifJson
        }
      }, { status: 500 });
    }

    // Determine auth method (priority matches docai.ts)
    let authMethod = 'UNKNOWN';
    if (serviceAccountKeyBase64) {
      authMethod = 'SERVICE_ACCOUNT_KEY_BASE64';
    } else if (serviceAccountKey) {
      authMethod = 'SERVICE_ACCOUNT_KEY';
    } else if (wifJson) {
      authMethod = 'WIF';
    }

    // Return the auth configuration status (boolean flags only - no actual values)
    return NextResponse.json({
      success: true,
      authMethod,
      envVars: {
        HAS_GCP_PROJECT_ID: !!process.env.GCP_PROJECT_ID,
        HAS_DOCAI_LOCATION: !!process.env.DOCAI_LOCATION,
        HAS_DOCAI_PROCESSOR_ID: !!process.env.DOCAI_PROCESSOR_ID,
        HAS_SERVICE_ACCOUNT_KEY: !!serviceAccountKey,
        HAS_SERVICE_ACCOUNT_KEY_BASE64: !!serviceAccountKeyBase64,
        HAS_WIF_CREDENTIALS: !!wifJson
      },
      recommendation: authMethod === 'SERVICE_ACCOUNT_KEY_BASE64'
        ? 'Using base64 service account key (recommended for Vercel)'
        : authMethod === 'SERVICE_ACCOUNT_KEY'
        ? 'Using plain service account key (consider using base64 version)'
        : authMethod === 'WIF'
        ? 'Using WIF (consider switching to service account key for reliability)'
        : 'No valid credentials found'
    });
  } catch (error: any) {
    // SECURITY: Don't expose stack traces - only return sanitized error message
    return NextResponse.json({
      error: 'Configuration check failed',
      message: error.message || 'Unknown error'
      // Removed: stack, details (information disclosure)
    }, { status: 500 });
  }
}
