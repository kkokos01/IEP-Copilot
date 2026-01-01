#!/usr/bin/env node

// Test script for real IEP documents
// Usage: npx tsx scripts/test-real-iep.ts <path-to-pdf>

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { basename } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://iep-copilot.vercel.app';

const TEST_EMAIL = `iep.test.${Date.now()}@gmail.com`;
const TEST_PASSWORD = 'test-password-123';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRealIEP(pdfPath: string) {
  // Validate file exists
  if (!existsSync(pdfPath)) {
    log(`❌ File not found: ${pdfPath}`, 'red');
    process.exit(1);
  }

  const fileName = basename(pdfPath);
  const pdfBuffer = readFileSync(pdfPath);

  log(`\n🚀 Testing Real IEP: ${fileName}`, 'cyan');
  log(`   Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`, 'blue');
  log('=' .repeat(50), 'cyan');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    log('❌ Missing Supabase environment variables', 'red');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let testUser: any = null;
  let testChild: any = null;
  let testCase: any = null;
  let testDocument: any = null;

  try {
    // Create test user
    log('\n📝 Creating test user...', 'blue');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (authError) throw authError;
    testUser = authData.user;
    log(`✅ User: ${testUser.id}`, 'green');

    // Sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (signInError) throw signInError;

    // Create child
    const { data: childData, error: childError } = await supabaseAdmin
      .from('children')
      .insert({ name: 'Test Child', user_id: testUser.id })
      .select()
      .single();
    if (childError) throw childError;
    testChild = childData;

    // Create case
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from('cases')
      .insert({ name: fileName.replace('.pdf', ''), child_id: testChild.id })
      .select()
      .single();
    if (caseError) throw caseError;
    testCase = caseData;
    log(`✅ Case: ${testCase.name}`, 'green');

    // Upload to storage
    log('\n📄 Uploading document...', 'blue');
    const documentId = randomUUID();
    const storagePath = `${testUser.id}/${documentId}/original.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });
    if (uploadError) throw uploadError;
    log(`✅ Uploaded to storage`, 'green');

    // Create document via API
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');

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
        fileName,
        fileSize: pdfBuffer.length,
        mimeType: 'application/pdf'
      })
    });

    if (!apiResponse.ok) {
      const err = await apiResponse.json();
      throw new Error(err.error || 'API error');
    }

    testDocument = { id: documentId };
    log(`✅ Document created: ${documentId}`, 'green');

    // Poll for completion (longer timeout for real documents)
    log('\n⏳ Processing document (this may take several minutes)...', 'blue');
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max

    while (attempts < maxAttempts) {
      attempts++;
      await sleep(10000);

      const statusResponse = await fetch(
        `${API_BASE_URL}/api/documents/upload?id=${testDocument.id}`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );

      if (!statusResponse.ok) continue;

      const result = await statusResponse.json();
      const docStatus = result.document?.status || result.status;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

      log(`   [${elapsed}s] Status: ${docStatus}`, 'blue');

      if (docStatus === 'complete') {
        log(`\n✅ Processing complete in ${elapsed}s!`, 'green');
        break;
      }

      if (docStatus === 'failed' || docStatus === 'analysis_failed') {
        const errMsg = result.document?.errorMessage || result.errorMessage;
        throw new Error(`Processing failed: ${errMsg}`);
      }
    }

    // Fetch results
    log('\n📊 Results:', 'cyan');

    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('page_count, status')
      .eq('id', testDocument.id)
      .single();
    log(`   Pages: ${doc?.page_count || 'unknown'}`, 'blue');

    const { data: findings } = await supabaseAdmin
      .from('findings')
      .select('id, category, title, severity')
      .eq('document_id', testDocument.id);

    log(`   Findings: ${findings?.length || 0}`, 'green');
    if (findings && findings.length > 0) {
      const bySeverity: Record<string, number> = {};
      findings.forEach(f => {
        bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
      });
      Object.entries(bySeverity).forEach(([sev, count]) => {
        const color = sev === 'high' ? 'red' : sev === 'medium' ? 'yellow' : 'green';
        log(`      ${sev}: ${count}`, color);
      });
    }

    const { data: citations } = await supabaseAdmin
      .from('citations')
      .select('id, verification_status, verification_method')
      .eq('document_id', testDocument.id);

    log(`   Citations: ${citations?.length || 0}`, 'green');
    if (citations && citations.length > 0) {
      const byMethod: Record<string, number> = {};
      citations.forEach(c => {
        const method = c.verification_method || 'unknown';
        byMethod[method] = (byMethod[method] || 0) + 1;
      });
      log(`   Verification methods:`, 'blue');
      Object.entries(byMethod).forEach(([method, count]) => {
        log(`      ${method}: ${count}`, 'cyan');
      });
    }

    log('\n✅ Test completed successfully!', 'green');
    return true;

  } catch (error) {
    log(`\n❌ Test failed: ${error}`, 'red');
    return false;
  } finally {
    // Cleanup
    log('\n🧹 Cleaning up...', 'blue');
    try {
      if (testDocument) await supabaseAdmin.from('documents').delete().eq('id', testDocument.id);
      if (testCase) await supabaseAdmin.from('cases').delete().eq('id', testCase.id);
      if (testChild) await supabaseAdmin.from('children').delete().eq('id', testChild.id);
      if (testUser) await supabaseAdmin.auth.admin.deleteUser(testUser.id);
      log('✅ Cleanup complete', 'green');
    } catch (e) {
      log(`⚠️  Cleanup error: ${e}`, 'yellow');
    }
  }
}

// Main
const pdfPath = process.argv[2];
if (!pdfPath) {
  log('Usage: npx tsx scripts/test-real-iep.ts <path-to-pdf>', 'yellow');
  log('\nExample:', 'blue');
  log('  npx tsx scripts/test-real-iep.ts test-docs/from-user/Texas-IEP-Example.pdf', 'cyan');
  process.exit(1);
}

testRealIEP(pdfPath)
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
