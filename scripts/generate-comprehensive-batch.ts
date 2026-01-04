#!/usr/bin/env tsx

/**
 * Generate comprehensive batch of test documents including:
 * - IEPs
 * - Progress Reports
 * - Evaluation Reports
 *
 * This creates a realistic document set for each student showing:
 * - Their IEP goals
 * - Progress toward those goals over time
 * - Assessment data supporting services
 *
 * Usage:
 *   npx tsx scripts/generate-comprehensive-batch.ts
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

const OUTPUT_DIR = 'test-docs/generated/batch';

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Comprehensive test cases with IEPs, progress reports, and evaluations
const testCases = [
  // Student 1: Emma Martinez - Elementary, making high progress
  {
    name: 'Emma Martinez',
    documents: {
      ieps: [
        { filename: 'emma-martinez-2024-iep.pdf', state: 'CA', issues: ['vague-goals'], pages: 8 },
        { filename: 'emma-martinez-2025-iep.pdf', state: 'CA', issues: [], pages: 9 },
      ],
      progressReports: [
        { filename: 'emma-martinez-2024-Q1-progress.pdf', period: 'Q1', year: '2024', progress: 'medium' },
        { filename: 'emma-martinez-2024-Q2-progress.pdf', period: 'Q2', year: '2024', progress: 'high' },
        { filename: 'emma-martinez-2024-Q3-progress.pdf', period: 'Q3', year: '2024', progress: 'high' },
      ],
      evaluations: [
        { filename: 'emma-martinez-2023-psych-eval.pdf', type: 'psych', year: '2023', findings: 'mixed' },
        { filename: 'emma-martinez-2023-speech-eval.pdf', type: 'speech', year: '2023', findings: 'positive' },
      ],
    },
  },

  // Student 2: Liam Johnson - Middle school, consistent progress
  {
    name: 'Liam Johnson',
    documents: {
      ieps: [
        { filename: 'liam-johnson-2023-iep.pdf', state: 'TX', issues: ['outdated-eval'], pages: 8 },
        { filename: 'liam-johnson-2024-iep.pdf', state: 'TX', issues: [], pages: 10 },
      ],
      progressReports: [
        { filename: 'liam-johnson-2024-Q1-progress.pdf', period: 'Q1', year: '2024', progress: 'medium' },
        { filename: 'liam-johnson-2024-Q2-progress.pdf', period: 'Q2', year: '2024', progress: 'medium' },
      ],
      evaluations: [
        { filename: 'liam-johnson-2024-psych-eval.pdf', type: 'psych', year: '2024', findings: 'mixed' },
      ],
    },
  },

  // Student 3: Sophia Williams - High school, struggling with transitions
  {
    name: 'Sophia Williams',
    documents: {
      ieps: [
        { filename: 'sophia-williams-2024-iep.pdf', state: 'NY', issues: ['missing-transition'], pages: 12 },
        { filename: 'sophia-williams-2025-iep.pdf', state: 'NY', issues: [], pages: 15 },
      ],
      progressReports: [
        { filename: 'sophia-williams-2024-Q1-progress.pdf', period: 'Q1', year: '2024', progress: 'low' },
        { filename: 'sophia-williams-2024-Q2-progress.pdf', period: 'Q2', year: '2024', progress: 'medium' },
        { filename: 'sophia-williams-2024-Q3-progress.pdf', period: 'Q3', year: '2024', progress: 'medium' },
      ],
      evaluations: [
        { filename: 'sophia-williams-2024-psych-eval.pdf', type: 'psych', year: '2024', findings: 'concerning' },
        { filename: 'sophia-williams-2024-ot-eval.pdf', type: 'ot', year: '2024', findings: 'mixed' },
      ],
    },
  },

  // Student 4: Noah Brown - Multiple disabilities, slow but steady progress
  {
    name: 'Noah Brown',
    documents: {
      ieps: [
        { filename: 'noah-brown-2024-iep.pdf', state: 'AR', issues: ['missing-services'], pages: 9 },
        { filename: 'noah-brown-2025-iep.pdf', state: 'AR', issues: [], pages: 10 },
      ],
      progressReports: [
        { filename: 'noah-brown-2024-Q1-progress.pdf', period: 'Q1', year: '2024', progress: 'low' },
        { filename: 'noah-brown-2024-Q2-progress.pdf', period: 'Q2', year: '2024', progress: 'low' },
        { filename: 'noah-brown-2024-Q3-progress.pdf', period: 'Q3', year: '2024', progress: 'medium' },
      ],
      evaluations: [
        { filename: 'noah-brown-2023-psych-eval.pdf', type: 'psych', year: '2023', findings: 'concerning' },
        { filename: 'noah-brown-2023-speech-eval.pdf', type: 'speech', year: '2023', findings: 'concerning' },
        { filename: 'noah-brown-2023-ot-eval.pdf', type: 'ot', year: '2023', findings: 'mixed' },
      ],
    },
  },

  // Student 5: Ava Garcia - Young student, speech/language, excellent progress
  {
    name: 'Ava Garcia',
    documents: {
      ieps: [
        { filename: 'ava-garcia-2024-iep.pdf', state: 'MO', issues: ['incomplete-plaafp'], pages: 7 },
        { filename: 'ava-garcia-2025-iep.pdf', state: 'MO', issues: [], pages: 8 },
      ],
      progressReports: [
        { filename: 'ava-garcia-2024-Q1-progress.pdf', period: 'Q1', year: '2024', progress: 'medium' },
        { filename: 'ava-garcia-2024-Q2-progress.pdf', period: 'Q2', year: '2024', progress: 'high' },
        { filename: 'ava-garcia-2024-Q3-progress.pdf', period: 'Q3', year: '2024', progress: 'high' },
      ],
      evaluations: [
        { filename: 'ava-garcia-2024-speech-eval.pdf', type: 'speech', year: '2024', findings: 'positive' },
      ],
    },
  },
];

console.log('\n🚀 Comprehensive Batch Document Generator');
console.log('='.repeat(50));
console.log(`Creating documents for ${testCases.length} students`);

let totalDocs = 0;
testCases.forEach(student => {
  totalDocs += student.documents.ieps.length;
  totalDocs += student.documents.progressReports.length;
  totalDocs += student.documents.evaluations.length;
});

console.log(`Total documents: ${totalDocs}`);
console.log(`  - IEPs: ${testCases.reduce((sum, s) => sum + s.documents.ieps.length, 0)}`);
console.log(`  - Progress Reports: ${testCases.reduce((sum, s) => sum + s.documents.progressReports.length, 0)}`);
console.log(`  - Evaluations: ${testCases.reduce((sum, s) => sum + s.documents.evaluations.length, 0)}`);
console.log(`\nOutput: ${OUTPUT_DIR}/\n`);

let successCount = 0;
let failCount = 0;

for (const student of testCases) {
  console.log(`\n👤 ${student.name}`);
  console.log('-'.repeat(50));

  // Generate IEPs
  for (const doc of student.documents.ieps) {
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
      console.log(`   📄 IEP: ${doc.filename}`);
      execSync(command, { stdio: 'inherit' });
      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed: ${doc.filename}`);
      failCount++;
    }
  }

  // Generate Progress Reports
  for (const doc of student.documents.progressReports) {
    const outputPath = `${OUTPUT_DIR}/${doc.filename}`;

    const command = [
      'npx tsx scripts/generate-progress-report.ts',
      `--student="${student.name}"`,
      `--period=${doc.period}`,
      `--year=${doc.year}`,
      `--progress=${doc.progress}`,
      `--output=${outputPath}`,
    ].join(' ');

    try {
      console.log(`   📊 Progress: ${doc.filename} (${doc.progress})`);
      execSync(command, { stdio: 'inherit' });
      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed: ${doc.filename}`);
      failCount++;
    }
  }

  // Generate Evaluations
  for (const doc of student.documents.evaluations) {
    const outputPath = `${OUTPUT_DIR}/${doc.filename}`;

    const command = [
      'npx tsx scripts/generate-evaluation.ts',
      `--student="${student.name}"`,
      `--type=${doc.type}`,
      `--year=${doc.year}`,
      `--findings=${doc.findings}`,
      `--output=${outputPath}`,
    ].join(' ');

    try {
      console.log(`   🔬 Evaluation: ${doc.filename} (${doc.type}, ${doc.findings})`);
      execSync(command, { stdio: 'inherit' });
      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed: ${doc.filename}`);
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

console.log('Next Steps:');
console.log('1. Run: npx tsx scripts/upload-test-batch.ts');
console.log('2. Monitor processing: http://localhost:8288');
console.log('3. View analytics: http://localhost:3001/dashboard/analytics');
console.log('\nThis will show:');
console.log('  - Student progress over time (multiple quarters)');
console.log('  - Correlation between evaluation findings and progress');
console.log('  - Impact of IEP changes on student outcomes\n');
