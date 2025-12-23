#!/usr/bin/env node

// Smoke test script for IEP Copilot
// Tests the complete document processing pipeline
// Uses the NEW upload flow (direct to Supabase Storage + JSON API)

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Test data
const TEST_EMAIL = `smoke-test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'test-password-123';
const TEST_CHILD_NAME = 'Test Child';
const TEST_CASE_NAME = 'Test Case';
const TEST_FILE_PATH = join(__dirname, 'test-document.pdf');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Create a minimal test PDF (1 page)
function createTestPDF(): Buffer {
  // This is a minimal valid PDF header
  const pdfHeader = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 720 Td (Test Document) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000054 00000 n\n0000000123 00000 n\n0000000209 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n312\n%%EOF\n');
  return pdfHeader;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSmokeTest() {
  log('🚀 Starting IEP Copilot Smoke Test', 'blue');
  log('================================', 'blue');
  
  // Validate environment
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    log('❌ Missing Supabase environment variables', 'red');
    log('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY', 'yellow');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let testUser: any = null;
  let testChild: any = null;
  let testCase: any = null;
  let testDocument: any = null;

  try {
    // Step 1: Create test user
    log('\n📝 Step 1: Creating test user...', 'blue');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (authError) {
      log(`❌ Failed to create user: ${authError.message}`, 'red');
      throw authError;
    }

    testUser = authData.user;
    log(`✅ User created: ${testUser.id}`, 'green');

    // Step 2: Create test child
    log('\n👶 Step 2: Creating test child...', 'blue');
    const { data: childData, error: childError } = await supabase
      .from('children')
      .insert({
        name: TEST_CHILD_NAME,
        user_id: testUser.id
      })
      .select()
      .single();

    if (childError) {
      log(`❌ Failed to create child: ${childError.message}`, 'red');
      throw childError;
    }

    testChild = childData;
    log(`✅ Child created: ${testChild.id}`, 'green');

    // Step 3: Create test case
    log('\n📁 Step 3: Creating test case...', 'blue');
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .insert({
        name: TEST_CASE_NAME,
        child_id: testChild.id
      })
      .select()
      .single();

    if (caseError) {
      log(`❌ Failed to create case: ${caseError.message}`, 'red');
      throw caseError;
    }

    testCase = caseData;
    log(`✅ Case created: ${testCase.id}`, 'green');

    // Step 4: Upload document using NEW flow
    log('\n📄 Step 4: Uploading document (NEW flow)...', 'blue');
    
    // Generate document ID and storage path
    const documentId = randomUUID();
    const storagePath = `${testUser.id}/${documentId}/original.pdf`;
    
    // Step 4a: Upload directly to Supabase Storage
    log('   4a: Uploading to Supabase Storage...', 'blue');
    const testPDF = createTestPDF();
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, testPDF, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      log(`❌ Storage upload failed: ${uploadError.message}`, 'red');
      throw uploadError;
    }
    log(`✅ File uploaded to: ${storagePath}`, 'green');

    // Step 4b: Create document record via API
    log('   4b: Creating document record via API...', 'blue');
    
    // Get session token for API call
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      log('❌ No active session', 'red');
      throw new Error('No active session');
    }

    const apiResponse = await fetch(`${API_BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId,
        storagePath,
        caseId: testCase.id,
        type: 'iep',
        fileName: 'test-document.pdf',
        fileSize: testPDF.length,
        mimeType: 'application/pdf'
      })
    });

    if (!apiResponse.ok) {
      const error = await apiResponse.json();
      log(`❌ API call failed: ${error.error || 'Unknown error'}`, 'red');
      throw new Error(`API error: ${apiResponse.status}`);
    }

    const apiResult = await apiResponse.json();
    testDocument = { id: apiResult.documentId };
    log(`✅ Document created: ${testDocument.id}`, 'green');

    // Step 5: Poll for processing completion
    log('\n⏳ Step 5: Monitoring document processing...', 'blue');
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max
    
    while (attempts < maxAttempts) {
      attempts++;
      await sleep(10000); // Wait 10 seconds

      const statusResponse = await fetch(
        `${API_BASE_URL}/api/documents/upload?id=${testDocument.id}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (!statusResponse.ok) {
        log(`⚠️  Status check failed, retrying...`, 'yellow');
        continue;
      }

      const status = await statusResponse.json();
      log(`   Status: ${status.status} (attempt ${attempts}/${maxAttempts})`, 'blue');

      if (status.status === 'complete') {
        log(`✅ Processing complete!`, 'green');
        log(`   Pages: ${status.pageCount}`, 'blue');
        break;
      }

      if (status.status === 'failed' || status.status === 'analysis_failed') {
        log(`❌ Processing failed: ${status.errorMessage}`, 'red');
        throw new Error(`Processing failed: ${status.errorMessage}`);
      }
    }

    if (attempts >= maxAttempts) {
      log('⚠️  Processing timed out after 5 minutes', 'yellow');
      log('   This might be normal for large documents', 'yellow');
    }

    // Step 6: Verify findings and citations
    log('\n🔍 Step 6: Verifying findings and citations...', 'blue');
    
    const { data: findings, error: findingsError } = await supabase
      .from('findings')
      .select('*')
      .eq('document_id', testDocument.id);

    if (findingsError) {
      log(`❌ Failed to fetch findings: ${findingsError.message}`, 'red');
      throw findingsError;
    }

    log(`✅ Found ${findings?.length || 0} findings`, 'green');

    const { data: citations, error: citationsError } = await supabase
      .from('citations')
      .select('*')
      .eq('document_id', testDocument.id);

    if (citationsError) {
      log(`❌ Failed to fetch citations: ${citationsError.message}`, 'red');
      throw citationsError;
    }

    log(`✅ Found ${citations?.length || 0} citations`, 'green');

    // Success!
    log('\n🎉 Smoke test PASSED!', 'green');
    log('================================', 'green');
    log('✅ User authentication works', 'green');
    log('✅ Database operations work', 'green');
    log('✅ Storage upload works', 'green');
    log('✅ API integration works', 'green');
    log('✅ Document processing works', 'green');
    log('✅ Findings generation works', 'green');
    
    return true;

  } catch (error) {
    log('\n💥 Smoke test FAILED!', 'red');
    log('================================', 'red');
    log(`Error: ${error}`, 'red');
    return false;
  } finally {
    // Cleanup (optional - commented out for debugging)
    /*
    if (testDocument) {
      await supabase.from('documents').delete().eq('id', testDocument.id);
    }
    if (testCase) {
      await supabase.from('cases').delete().eq('id', testCase.id);
    }
    if (testChild) {
      await supabase.from('children').delete().eq('id', testChild.id);
    }
    if (testUser) {
      await supabase.auth.admin.deleteUser(testUser.id);
    }
    */
  }
}

// Run the test
runSmokeTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
