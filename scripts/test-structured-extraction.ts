#!/usr/bin/env tsx

// Quick test for structured IEP extraction
// Uploads a real IEP and checks if structured data is extracted

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const TEST_IEP = resolve(process.cwd(), 'test-docs/generated/california-missing-transition.pdf');
const TEST_EMAIL = `test.extraction.${Date.now()}@test.com`;
const TEST_PASSWORD = 'test-password-123';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🧪 Testing Structured IEP Extraction\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1. Create test user
    console.log('1️⃣  Creating test user...');
    const { data: authData } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    const userId = authData!.user!.id;
    console.log(`✅ User: ${userId}\n`);

    // Sign in
    await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    // 2. Create child + case
    console.log('2️⃣  Creating child and case...');
    const { data: child, error: childError } = await supabase
      .from('children')
      .insert({ name: 'Test Child', user_id: userId })
      .select()
      .single();

    if (childError) {
      console.error('❌ Failed to create child:', childError);
      throw childError;
    }

    const { data: testCase, error: caseError } = await supabase
      .from('cases')
      .insert({ child_id: child!.id, name: 'Test Case' })
      .select()
      .single();

    if (caseError) {
      console.error('❌ Failed to create case:', caseError);
      throw caseError;
    }

    console.log(`✅ Case: ${testCase!.id}\n`);

    // 3. Upload IEP
    console.log('3️⃣  Uploading IEP...');
    const documentId = randomUUID();
    const storagePath = `${userId}/${documentId}/original.pdf`;
    const pdfBuffer = readFileSync(TEST_IEP);

    await supabase.storage
      .from('documents')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf' });

    const response = await fetch('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session!.access_token}`
      },
      body: JSON.stringify({
        documentId,
        storagePath,
        caseId: testCase!.id,
        type: 'iep',
        fileName: 'test-iep.pdf',
        fileSize: pdfBuffer.length,
        mimeType: 'application/pdf'
      })
    });

    const result = await response.json();
    console.log(`✅ Document uploaded: ${documentId}\n`);

    // 4. Wait for processing
    console.log('4️⃣  Waiting for extraction...');
    let attempts = 0;
    let extraction = null;

    while (attempts < 60) {
      await sleep(2000);
      attempts++;

      // Check document status
      const { data: doc } = await supabaseAdmin
        .from('documents')
        .select('status')
        .eq('id', documentId)
        .single();

      console.log(`   Status: ${doc?.status} (${attempts}/60)`);

      if (doc?.status === 'complete') {
        // Check for structured extraction
        const { data: extracted } = await supabaseAdmin
          .from('extracted_iep_data')
          .select('*')
          .eq('document_id', documentId)
          .single();

        if (extracted) {
          extraction = extracted;
          break;
        }
      }

      if (doc?.status === 'failed') {
        console.log('❌ Processing failed');
        break;
      }
    }

    if (extraction) {
      console.log('\n✅ SUCCESS! Structured extraction completed\n');
      console.log('📊 Extracted Data:');
      console.log(`   Student: ${extraction.data.student?.name?.value || 'Not found'}`);
      console.log(`   Goals: ${extraction.data.goals?.length || 0}`);
      console.log(`   Services: ${extraction.data.services?.length || 0}`);
      console.log(`   Schema Version: ${extraction.schema_version}`);
      console.log(`   Model: ${extraction.model_used}\n`);

      if (extraction.data.goals && extraction.data.goals.length > 0) {
        console.log('🎯 Sample Goal:');
        const goal = extraction.data.goals[0];
        console.log(`   Text: ${goal.goalText?.value?.substring(0, 100)}...`);
        console.log(`   Domain: ${goal.domain?.value}`);
        console.log(`   Evidence: ${goal.goalText?.evidence?.length || 0} citations\n`);
      }
    } else {
      console.log('\n❌ FAILED: No structured extraction found after 2 minutes\n');
    }

    // 5. Cleanup
    console.log('🧹 Cleaning up...');
    await supabaseAdmin.from('documents').delete().eq('id', documentId);
    await supabaseAdmin.from('cases').delete().eq('id', testCase!.id);
    await supabaseAdmin.from('children').delete().eq('id', child!.id);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    console.log('✅ Cleanup complete\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
