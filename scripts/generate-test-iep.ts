#!/usr/bin/env node

/**
 * Generate synthetic IEP documents for testing
 *
 * Usage:
 *   npx tsx scripts/generate-test-iep.ts [options]
 *
 * Options:
 *   --state=TX|CA|NY|AR|MO    State format (default: TX)
 *   --issues=issue1,issue2    Compliance issues to include
 *   --pages=N                 Approximate page count (default: 8)
 *   --output=path.pdf         Output file path
 *   --name=StudentName        Student name (default: random)
 *
 * Available issues:
 *   vague-goals         - Goals without measurable criteria
 *   missing-signature   - Missing required signatures
 *   missing-transition  - No transition plan for student 16+
 *   incomplete-plaafp   - Vague present levels section
 *   no-accommodations   - Missing testing accommodations
 *   outdated-eval       - References old evaluation data
 *   missing-services    - Services section incomplete
 *   no-progress-method  - No method for measuring progress
 *   parent-concerns     - Parent concerns not addressed
 *   esy-missing         - No ESY consideration documented
 *
 * Examples:
 *   npx tsx scripts/generate-test-iep.ts --issues=vague-goals,missing-signature
 *   npx tsx scripts/generate-test-iep.ts --state=CA --pages=12 --output=test-docs/california-test.pdf
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Fake data generators
const FIRST_NAMES = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'James', 'Sophia', 'Mason', 'Isabella', 'Lucas'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const SCHOOLS = ['Lincoln Elementary', 'Washington Middle School', 'Jefferson High School', 'Roosevelt Academy', 'Franklin Learning Center'];
const DISTRICTS = ['Unified School District', 'Independent School District', 'Public Schools', 'Area Schools'];
const DISABILITIES = ['Specific Learning Disability', 'Speech or Language Impairment', 'Autism', 'Other Health Impairment', 'Emotional Disturbance'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(yearsAgo: number = 0): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - yearsAgo);
  date.setMonth(Math.floor(Math.random() * 12));
  date.setDate(Math.floor(Math.random() * 28) + 1);
  return date.toLocaleDateString('en-US');
}

function generateStudentInfo(providedName?: string) {
  const firstName = providedName?.split(' ')[0] || randomItem(FIRST_NAMES);
  const lastName = providedName?.split(' ')[1] || randomItem(LAST_NAMES);
  const age = Math.floor(Math.random() * 12) + 5; // 5-16
  const grade = Math.max(0, Math.min(12, age - 5));

  return {
    name: `${firstName} ${lastName}`,
    dob: randomDate(age),
    age,
    grade: grade === 0 ? 'K' : grade.toString(),
    studentId: Math.random().toString().slice(2, 10),
    school: randomItem(SCHOOLS),
    district: `${randomItem(LAST_NAMES)} ${randomItem(DISTRICTS)}`,
    disability: randomItem(DISABILITIES),
    iepDate: randomDate(0),
    annualReviewDate: randomDate(-1),
    reevalDate: randomDate(-3),
  };
}

const ISSUE_PROMPTS: Record<string, string> = {
  'vague-goals': `Include 2-3 IEP goals that are vague and not measurable. Use language like "will improve reading" or "will do better in math" without specific criteria, baselines, or measurement methods.`,

  'missing-signature': `In the signature section, leave one or more signature lines blank or with only a date but no signature. Include a note like "Parent signature pending" or just leave the line empty.`,

  'missing-transition': `For a student age 16+, either omit the transition plan section entirely or include only a brief mention without post-secondary goals, activities, or agency involvement.`,

  'incomplete-plaafp': `Make the Present Levels of Academic Achievement and Functional Performance (PLAAFP) section vague. Use general statements like "Student struggles in reading" without specific data, assessments, or current performance levels.`,

  'no-accommodations': `Omit or leave blank the testing accommodations section, or include only generic accommodations without specifics for state assessments.`,

  'outdated-eval': `Reference evaluation data that is more than 3 years old. Include phrases like "According to the 2019 evaluation..." or "Based on testing from three years ago..."`,

  'missing-services': `Make the services section incomplete - list some services without frequency, duration, or location. Or list minutes per week without specifying who provides the service.`,

  'no-progress-method': `For goals, omit how progress will be measured and reported. Don't include progress monitoring schedules or data collection methods.`,

  'parent-concerns': `Include a parent concerns section that says "Parent expressed concerns about reading progress" but don't address these concerns anywhere else in the document or in the goals.`,

  'esy-missing': `Either omit Extended School Year (ESY) consideration entirely or include only "ESY: No" without any documentation of how this decision was made or what data was considered.`,
};

async function generateIEPContent(
  student: ReturnType<typeof generateStudentInfo>,
  state: string,
  issues: string[],
  pageTarget: number
): Promise<string> {
  const anthropic = new Anthropic();

  const issueInstructions = issues
    .filter(i => ISSUE_PROMPTS[i])
    .map(i => `- ${ISSUE_PROMPTS[i]}`)
    .join('\n');

  const prompt = `Generate a realistic Individualized Education Program (IEP) document for a student in ${state}. This is for software testing purposes only - all data is fictional.

STUDENT INFORMATION:
- Name: ${student.name}
- Date of Birth: ${student.dob}
- Age: ${student.age}
- Grade: ${student.grade}
- Student ID: ${student.studentId}
- School: ${student.school}
- District: ${student.district}
- Primary Disability: ${student.disability}
- IEP Date: ${student.iepDate}
- Annual Review Due: ${student.annualReviewDate}
- Reevaluation Due: ${student.reevalDate}

Generate a complete IEP document with these sections:
1. Student Information & Demographics
2. Present Levels of Academic Achievement and Functional Performance (PLAAFP)
3. Annual Goals (at least 4 goals across different areas)
4. Special Education and Related Services
5. Supplementary Aids and Services
6. Testing Accommodations
7. Least Restrictive Environment (LRE) Statement
8. Extended School Year (ESY) Consideration
9. Transition Services (if student is 14+)
10. IEP Team Signatures

${issues.length > 0 ? `
IMPORTANT - Include these specific compliance issues (for testing our document analysis):
${issueInstructions}
` : ''}

Format the document to be approximately ${pageTarget} pages when converted to PDF (roughly ${pageTarget * 400} words).

Use realistic educational language and formatting. Include section headers, tables where appropriate (for services, goals), and standard IEP terminology.

Output only the IEP content - no meta-commentary.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  return textContent?.text || '';
}

// Sanitize text to remove characters that WinAnsi encoding can't handle
function sanitizeText(text: string): string {
  return text
    .replace(/☐/g, '[ ]')  // Empty checkbox
    .replace(/☑/g, '[X]')  // Checked checkbox
    .replace(/☒/g, '[X]')  // X'd checkbox
    .replace(/•/g, '-')    // Bullet
    .replace(/–/g, '-')    // En dash
    .replace(/—/g, '-')    // Em dash
    .replace(/'/g, "'")    // Smart quote
    .replace(/'/g, "'")    // Smart quote
    .replace(/"/g, '"')    // Smart quote
    .replace(/"/g, '"')    // Smart quote
    .replace(/…/g, '...')  // Ellipsis
    .replace(/[^\x00-\x7F]/g, ''); // Remove any remaining non-ASCII
}

async function createPDF(content: string, student: ReturnType<typeof generateStudentInfo>): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Sanitize the content
  content = sanitizeText(content);

  const fontSize = 11;
  const lineHeight = 14;
  const margin = 50;
  const pageWidth = 612; // Letter size
  const pageHeight = 792;
  const maxWidth = pageWidth - (margin * 2);

  // Split content into lines that fit the page width
  const lines: { text: string; bold: boolean }[] = [];
  const paragraphs = content.split('\n');

  for (const para of paragraphs) {
    if (para.trim() === '') {
      lines.push({ text: '', bold: false });
      continue;
    }

    // Check if it's a header (all caps or starts with #)
    const isHeader = para.startsWith('#') || (para === para.toUpperCase() && para.length < 80);
    const cleanPara = para.replace(/^#+\s*/, '');

    // Word wrap
    const words = cleanPara.split(' ');
    let currentLine = '';
    const activeFont = isHeader ? boldFont : font;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = activeFont.widthOfTextAtSize(testLine, isHeader ? 12 : fontSize);

      if (width > maxWidth && currentLine) {
        lines.push({ text: currentLine, bold: isHeader });
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push({ text: currentLine, bold: isHeader });
    }
  }

  // Create pages
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Add header to first page
  currentPage.drawText('INDIVIDUALIZED EDUCATION PROGRAM', {
    x: margin,
    y: y,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 25;
  currentPage.drawText(`Student: ${student.name} | Grade: ${student.grade} | Date: ${student.iepDate}`, {
    x: margin,
    y: y,
    size: 10,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 30;

  // Add content
  for (const line of lines) {
    if (y < margin + 20) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    if (line.text) {
      currentPage.drawText(line.text, {
        x: margin,
        y: y,
        size: line.bold ? 12 : fontSize,
        font: line.bold ? boldFont : font,
        color: rgb(0, 0, 0),
      });
    }
    y -= lineHeight;
  }

  return pdfDoc.save();
}

function parseArgs(): { state: string; issues: string[]; pages: number; output: string; name?: string } {
  const args = process.argv.slice(2);
  const result = {
    state: 'TX',
    issues: [] as string[],
    pages: 8,
    output: '',
    name: undefined as string | undefined,
  };

  for (const arg of args) {
    if (arg.startsWith('--state=')) {
      result.state = arg.split('=')[1].toUpperCase();
    } else if (arg.startsWith('--issues=')) {
      result.issues = arg.split('=')[1].split(',').map(i => i.trim());
    } else if (arg.startsWith('--pages=')) {
      result.pages = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--output=')) {
      result.output = arg.split('=')[1];
    } else if (arg.startsWith('--name=')) {
      result.name = arg.split('=')[1];
    }
  }

  if (!result.output) {
    const timestamp = Date.now();
    const issueStr = result.issues.length > 0 ? `-${result.issues[0]}` : '';
    result.output = `test-docs/generated/synthetic-iep-${result.state}${issueStr}-${timestamp}.pdf`;
  }

  return result;
}

async function main() {
  const args = parseArgs();

  console.log('\n🔧 IEP Test Document Generator');
  console.log('='.repeat(40));
  console.log(`State: ${args.state}`);
  console.log(`Target pages: ${args.pages}`);
  console.log(`Issues: ${args.issues.length > 0 ? args.issues.join(', ') : 'none (compliant IEP)'}`);
  console.log(`Output: ${args.output}`);

  // Validate issues
  const invalidIssues = args.issues.filter(i => !ISSUE_PROMPTS[i]);
  if (invalidIssues.length > 0) {
    console.log(`\n⚠️  Unknown issues: ${invalidIssues.join(', ')}`);
    console.log('Available issues:');
    Object.keys(ISSUE_PROMPTS).forEach(i => console.log(`  - ${i}`));
    process.exit(1);
  }

  const student = generateStudentInfo(args.name);
  console.log(`\n📋 Student: ${student.name} (Grade ${student.grade})`);
  console.log(`   Disability: ${student.disability}`);

  console.log('\n⏳ Generating IEP content with Claude...');
  const content = await generateIEPContent(student, args.state, args.issues, args.pages);

  console.log('📄 Creating PDF...');
  const pdfBytes = await createPDF(content, student);

  // Ensure output directory exists
  mkdirSync(dirname(args.output), { recursive: true });

  writeFileSync(args.output, pdfBytes);
  console.log(`\n✅ Generated: ${args.output}`);
  console.log(`   Size: ${(pdfBytes.length / 1024).toFixed(1)} KB`);

  // Show available issues for reference
  if (args.issues.length === 0) {
    console.log('\n💡 Tip: Add --issues=vague-goals,missing-signature to include compliance issues');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
