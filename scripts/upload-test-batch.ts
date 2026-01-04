#!/usr/bin/env tsx

/**
 * Upload batch-generated test IEP documents for a specific user
 *
 * This script:
 * 1. Creates test user (or uses existing)
 * 2. Creates children for each student
 * 3. Creates cases for each child
 * 4. Uploads all documents from the batch generation
 *
 * Usage:
 *   npx tsx scripts/upload-test-batch.ts [--email=test@example.com]
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import { basename } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const BATCH_DIR = 'test-docs/generated/batch';
const TEST_PASSWORD = 'test-password-123';

// Parse student name from filename (e.g., "emma-martinez-2024-vague-goals.pdf" -> "Emma Martinez")
function extractStudentName(filename: string): string {
  const parts = filename.split('-');
  if (parts.length >= 2) {
    const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const lastName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    return `${firstName} ${lastName}`;
  }
  return 'Unknown Student';
}

// Determine document type from filename
function getDocumentType(filename: string): 'iep' | 'progress_report' | 'evaluation' {
  if (filename.includes('progress')) return 'progress_report';
  if (filename.includes('eval')) return 'evaluation';
  return 'iep';
}

// Group files by student
function groupFilesByStudent(files: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const file of files) {
    const studentName = extractStudentName(file);
    if (!groups.has(studentName)) {
      groups.set(studentName, []);
    }
    groups.get(studentName)!.push(file);
  }

  return groups;
}

async function main() {
  const args = process.argv.slice(2);
  const emailArg = args.find(a => a.startsWith('--email='));
  const urlArg = args.find(a => a.startsWith('--url='));
  const testEmail = emailArg ? emailArg.split('=')[1] : `test.analytics.${Date.now()}@test.com`;
  const baseUrl = urlArg ? urlArg.split('=')[1] : 'http://localhost:3001';

  console.log('\n📤 Batch Document Upload Tool');
  console.log('='.repeat(50));
  console.log(`Test Email: ${testEmail}`);
  console.log(`Target URL: ${baseUrl}`);
  console.log(`Batch Directory: ${BATCH_DIR}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1. Create or get test user
    console.log('\n1️⃣  Setting up test user...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (authError && !authError.message.includes('already registered')) {
      throw authError;
    }

    const userId = authData?.user?.id || (await supabaseAdmin.auth.admin.listUsers())
      .data.users.find(u => u.email === testEmail)?.id;

    if (!userId) {
      throw new Error('Failed to create or find user');
    }

    console.log(`✅ User: ${userId}`);

    // Sign in
    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: TEST_PASSWORD,
    });

    if (!sessionData.session) {
      throw new Error('Failed to sign in');
    }

    // 2. Get files from batch directory
    console.log('\n2️⃣  Scanning batch directory...');
    const files = readdirSync(BATCH_DIR).filter(f => f.endsWith('.pdf'));
    console.log(`   Found ${files.length} PDF files`);

    if (files.length === 0) {
      console.log('\n⚠️  No files found. Run generate-test-batch.ts first!');
      process.exit(1);
    }

    // 3. Group files by student
    const studentGroups = groupFilesByStudent(files);
    console.log(`   Grouped into ${studentGroups.size} students\n`);

    // 4. Create children and cases
    const childMap = new Map<string, { childId: string; caseId: string }>();

    for (const [studentName, studentFiles] of studentGroups) {
      console.log(`👤 ${studentName} (${studentFiles.length} documents)`);

      // Create child
      const { data: child, error: childError } = await supabase
        .from('children')
        .insert({ name: studentName, user_id: userId })
        .select()
        .single();

      if (childError) {
        console.error(`   ❌ Failed to create child: ${childError.message}`);
        continue;
      }

      // Create case
      const { data: testCase, error: caseError } = await supabase
        .from('cases')
        .insert({ child_id: child.id, name: `${studentName} - Test Case` })
        .select()
        .single();

      if (caseError) {
        console.error(`   ❌ Failed to create case: ${caseError.message}`);
        continue;
      }

      childMap.set(studentName, { childId: child.id, caseId: testCase.id });
      console.log(`   ✅ Child: ${child.id} | Case: ${testCase.id}`);
    }

    // 5. Upload documents
    console.log('\n3️⃣  Uploading documents...\n');
    let uploadCount = 0;
    let failCount = 0;

    for (const [studentName, studentFiles] of studentGroups) {
      const childData = childMap.get(studentName);
      if (!childData) {
        console.log(`   ⚠️  Skipping ${studentName} - no child/case created`);
        continue;
      }

      for (const filename of studentFiles) {
        try {
          const documentId = randomUUID();
          const storagePath = `${userId}/${documentId}/original.pdf`;
          const filePath = `${BATCH_DIR}/${filename}`;
          const pdfBuffer = readFileSync(filePath);

          // Upload to storage
          await supabase.storage
            .from('documents')
            .upload(storagePath, pdfBuffer, { contentType: 'application/pdf' });

          // Create document record
          const docType = getDocumentType(filename);
          const response = await fetch(`${baseUrl}/api/documents/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionData.session.access_token}`
            },
            body: JSON.stringify({
              documentId,
              storagePath,
              caseId: childData.caseId,
              type: docType,
              fileName: filename,
              fileSize: pdfBuffer.length,
              mimeType: 'application/pdf'
            })
          });

          if (response.ok) {
            console.log(`   ✅ ${filename}`);
            uploadCount++;
          } else {
            const error = await response.text();
            console.error(`   ❌ ${filename}: ${error}`);
            failCount++;
          }
        } catch (error: any) {
          console.error(`   ❌ ${filename}: ${error.message}`);
          failCount++;
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Upload Summary');
    console.log('='.repeat(50));
    console.log(`✅ Uploaded: ${uploadCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`\n👤 Test User: ${testEmail}`);
    console.log(`🔑 Password: ${TEST_PASSWORD}`);
    console.log(`\nLogin and view analytics at: ${baseUrl}/dashboard/analytics\n`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
