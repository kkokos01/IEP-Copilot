import { NextResponse } from 'next/server';

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
    
    return NextResponse.json({ 
      success: true,
      wifConfig: {
        type: wif.type,
        audience: wif.audience,
        environment_id: wif.credential_source?.environment_id,
        hasServiceAccount: !!wif.service_account_impersonation_url
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
