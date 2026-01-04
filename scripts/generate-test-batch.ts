#!/usr/bin/env tsx

/**
 * Generate a batch of synthetic IEP documents for testing analytics dashboard
 *
 * Creates multiple students with multiple IEPs each, covering various:
 * - Compliance issues
 * - States/formats
 * - Grades and disabilities
 * - Time periods
 *
 * Usage:
 *   npx tsx scripts/generate-test-batch.ts
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

const OUTPUT_DIR = 'test-docs/generated/batch';

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Define test students with various scenarios
const testCases = [
  // Student 1: Elementary student with multiple compliance issues
  {
    name: 'Emma Martinez',
    documents: [
      {
        filename: 'emma-martinez-2024-vague-goals.pdf',
        state: 'CA',
        issues: ['vague-goals', 'no-progress-method'],
        pages: 8,
      },
      {
        filename: 'emma-martinez-2023-missing-baseline.pdf',
        state: 'CA',
        issues: ['incomplete-plaafp', 'missing-services'],
        pages: 7,
      },
      {
        filename: 'emma-martinez-2025-current.pdf',
        state: 'CA',
        issues: ['parent-concerns'],
        pages: 9,
      },
    ],
  },

  // Student 2: Middle school student with transition needs
  {
    name: 'Liam Johnson',
    documents: [
      {
        filename: 'liam-johnson-2024-compliant.pdf',
        state: 'TX',
        issues: [],
        pages: 10,
      },
      {
        filename: 'liam-johnson-2023-overdue.pdf',
        state: 'TX',
        issues: ['outdated-eval', 'esy-missing'],
        pages: 8,
      },
    ],
  },

  // Student 3: High school student (16+) with transition plan issues
  {
    name: 'Sophia Williams',
    documents: [
      {
        filename: 'sophia-williams-2024-missing-transition.pdf',
        state: 'NY',
        issues: ['missing-transition', 'no-accommodations'],
        pages: 12,
      },
      {
        filename: 'sophia-williams-2023-signatures.pdf',
        state: 'NY',
        issues: ['missing-signature'],
        pages: 11,
      },
      {
        filename: 'sophia-williams-2025-comprehensive.pdf',
        state: 'NY',
        issues: [],
        pages: 15,
      },
    ],
  },

  // Student 4: Student with multiple disabilities
  {
    name: 'Noah Brown',
    documents: [
      {
        filename: 'noah-brown-2024-services.pdf',
        state: 'AR',
        issues: ['missing-services', 'no-progress-method'],
        pages: 9,
      },
      {
        filename: 'noah-brown-2025-updated.pdf',
        state: 'AR',
        issues: ['vague-goals'],
        pages: 10,
      },
    ],
  },

  // Student 5: Young student with speech/language impairment
  {
    name: 'Ava Garcia',
    documents: [
      {
        filename: 'ava-garcia-2024-plaafp.pdf',
        state: 'MO',
        issues: ['incomplete-plaafp', 'parent-concerns'],
        pages: 7,
      },
      {
        filename: 'ava-garcia-2023-minimal-issues.pdf',
        state: 'MO',
        issues: ['esy-missing'],
        pages: 6,
      },
      {
        filename: 'ava-garcia-2025-goals.pdf',
        state: 'MO',
        issues: ['vague-goals', 'no-progress-method'],
        pages: 8,
      },
    ],
  },

  // Student 6: Older elementary with accommodations needs
  {
    name: 'Mason Davis',
    documents: [
      {
        filename: 'mason-davis-2024-accommodations.pdf',
        state: 'CA',
        issues: ['no-accommodations'],
        pages: 9,
      },
      {
        filename: 'mason-davis-2023-multiple-issues.pdf',
        state: 'CA',
        issues: ['vague-goals', 'missing-services', 'outdated-eval'],
        pages: 8,
      },
    ],
  },
];

console.log('\n🚀 IEP Batch Test Document Generator');
console.log('='.repeat(50));
console.log(`Creating documents for ${testCases.length} students`);
console.log(`Total documents: ${testCases.reduce((sum, student) => sum + student.documents.length, 0)}`);
console.log(`Output: ${OUTPUT_DIR}/\n`);

let successCount = 0;
let failCount = 0;

for (const student of testCases) {
  console.log(`\n👤 ${student.name} (${student.documents.length} IEPs)`);
  console.log('-'.repeat(50));

  for (const doc of student.documents) {
    const outputPath = `${OUTPUT_DIR}/${doc.filename}`;
    const issuesArg = doc.issues.length > 0 ? `--issues=${doc.issues.join(',')}` : '';

    const command = [
      'npx tsx scripts/generate-test-iep.ts',
      `--name="${student.name}"`,
      `--state=${doc.state}`,
      `--pages=${doc.pages}`,
      `--output=${outputPath}`,
      issuesArg,
    ].filter(Boolean).join(' ');

    try {
      console.log(`   📄 ${doc.filename}`);
      console.log(`      State: ${doc.state} | Pages: ${doc.pages} | Issues: ${doc.issues.length > 0 ? doc.issues.join(', ') : 'none'}`);

      execSync(command, { stdio: 'inherit' });
      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed to generate ${doc.filename}`);
      failCount++;
    }
  }
}

console.log('\n' + '='.repeat(50));
console.log('📊 Generation Summary');
console.log('='.repeat(50));
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`\n📁 Documents saved to: ${OUTPUT_DIR}/\n`);

// Print usage instructions
console.log('Next Steps:');
console.log('1. Upload these documents through the UI to test the analytics dashboard');
console.log('2. Create separate user accounts or children for each student');
console.log('3. Monitor processing in Inngest dashboard: http://localhost:8288');
console.log('4. View analytics at: http://localhost:3001/dashboard/analytics\n');

// Print document summary by compliance issue
console.log('Documents by Compliance Issue:');
const issueCount: Record<string, number> = {};
for (const student of testCases) {
  for (const doc of student.documents) {
    for (const issue of doc.issues) {
      issueCount[issue] = (issueCount[issue] || 0) + 1;
    }
  }
}

if (Object.keys(issueCount).length > 0) {
  Object.entries(issueCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([issue, count]) => {
      console.log(`   - ${issue}: ${count} document(s)`);
    });
} else {
  console.log('   (No compliance issues in this batch)');
}

const compliantCount = testCases.reduce((sum, student) => {
  return sum + student.documents.filter(d => d.issues.length === 0).length;
}, 0);
console.log(`   - Compliant IEPs: ${compliantCount} document(s)\n`);
