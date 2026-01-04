#!/usr/bin/env tsx

/**
 * Generate synthetic Progress Report documents for testing
 *
 * Progress reports show student performance toward IEP goals over a specific period
 *
 * Usage:
 *   npx tsx scripts/generate-progress-report.ts [options]
 *
 * Options:
 *   --student=Name            Student name
 *   --period=Q1|Q2|Q3|Q4     Reporting period (default: Q1)
 *   --year=2024              School year
 *   --output=path.pdf        Output file path
 *   --progress=high|med|low  Overall progress level
 *
 * Examples:
 *   npx tsx scripts/generate-progress-report.ts --student="Emma Martinez" --period=Q1 --progress=high
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

interface ProgressReportOptions {
  student: string;
  period: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: string;
  progress: 'high' | 'medium' | 'low';
  output: string;
}

const PROGRESS_DESCRIPTIONS = {
  high: 'Student is making excellent progress and is on track to meet or exceed annual goals',
  medium: 'Student is making satisfactory progress toward annual goals but may need additional support',
  low: 'Student is making minimal progress and significant interventions are recommended',
};

const PERIOD_DATES = {
  Q1: { start: 'September 1', end: 'November 15' },
  Q2: { start: 'November 16', end: 'January 31' },
  Q3: { start: 'February 1', end: 'April 15' },
  Q4: { start: 'April 16', end: 'June 30' },
};

async function generateProgressReportContent(options: ProgressReportOptions): Promise<string> {
  const anthropic = new Anthropic();

  const periodDates = PERIOD_DATES[options.period];
  const progressDesc = PROGRESS_DESCRIPTIONS[options.progress];

  const prompt = `Generate a realistic IEP Progress Report for a student. This is for software testing - all data is fictional.

STUDENT INFORMATION:
- Name: ${options.student}
- Reporting Period: ${options.period} (${periodDates.start} - ${periodDates.end})
- School Year: ${options.year}-${parseInt(options.year) + 1}
- Overall Progress Level: ${options.progress.toUpperCase()}
- Progress Description: ${progressDesc}

Generate a complete progress report with these sections:

1. **Student Information**
   - Name, grade, school
   - Reporting period
   - Date of report

2. **IEP Goals Progress** (Include 4-5 goals across different domains)
   For each goal:
   - Goal text (from IEP)
   - Domain (Reading, Math, Writing, Social/Emotional, etc.)
   - Baseline data
   - Current performance level
   - Progress rating (Mastered / Making Progress / Some Progress / Little/No Progress)
   - Specific evidence/data (test scores, observation notes, work samples)
   - Teacher comments

3. **Services Provided**
   - List of special education and related services
   - Minutes provided this period
   - Service provider notes

4. **Accommodations Used**
   - Which accommodations were implemented
   - How effective they were

5. **Attendance**
   - Days present/absent
   - Impact on progress if applicable

6. **Recommendations**
   - What's working well
   - Areas needing additional support
   - Suggested parent activities

7. **Signatures**
   - Special education teacher
   - General education teacher (if applicable)
   - Service providers

Use realistic educational data and language. For ${options.progress} progress level:
${options.progress === 'high' ? '- Show strong data points (80-100% accuracy, consistent improvement)' : ''}
${options.progress === 'high' ? '- Positive teacher comments' : ''}
${options.progress === 'high' ? '- Student exceeding expectations' : ''}
${options.progress === 'medium' ? '- Show moderate data (60-75% accuracy, steady but slow progress)' : ''}
${options.progress === 'medium' ? '- Some goals on track, others need work' : ''}
${options.progress === 'medium' ? '- Suggestions for additional support' : ''}
${options.progress === 'low' ? '- Show concerning data (below 50% accuracy, inconsistent performance)' : ''}
${options.progress === 'low' ? '- Multiple goals showing little progress' : ''}
${options.progress === 'low' ? '- Recommendations for intervention changes' : ''}

Format to be approximately 3-4 pages. Include specific numbers, percentages, and data points.

Output only the progress report content - no meta-commentary.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  return textContent?.text || '';
}

function sanitizeText(text: string): string {
  return text
    .replace(/☐/g, '[ ]')
    .replace(/☑/g, '[X]')
    .replace(/☒/g, '[X]')
    .replace(/•/g, '-')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\x00-\x7F]/g, '');
}

async function createPDF(content: string, options: ProgressReportOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  content = sanitizeText(content);

  const fontSize = 11;
  const lineHeight = 14;
  const margin = 50;
  const pageWidth = 612;
  const pageHeight = 792;
  const maxWidth = pageWidth - (margin * 2);

  const lines: { text: string; bold: boolean }[] = [];
  const paragraphs = content.split('\n');

  for (const para of paragraphs) {
    if (para.trim() === '') {
      lines.push({ text: '', bold: false });
      continue;
    }

    const isHeader = para.startsWith('#') || (para === para.toUpperCase() && para.length < 80);
    const cleanPara = para.replace(/^#+\s*/, '');

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

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Header
  currentPage.drawText('IEP PROGRESS REPORT', {
    x: margin,
    y: y,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 25;

  const periodDates = PERIOD_DATES[options.period];
  currentPage.drawText(`${options.student} | Period: ${options.period} (${periodDates.start} - ${periodDates.end})`, {
    x: margin,
    y: y,
    size: 10,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 30;

  // Content
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

function parseArgs(): ProgressReportOptions {
  const args = process.argv.slice(2);
  const result: ProgressReportOptions = {
    student: 'Test Student',
    period: 'Q1',
    year: new Date().getFullYear().toString(),
    progress: 'medium',
    output: '',
  };

  for (const arg of args) {
    if (arg.startsWith('--student=')) {
      result.student = arg.split('=')[1];
    } else if (arg.startsWith('--period=')) {
      result.period = arg.split('=')[1] as any;
    } else if (arg.startsWith('--year=')) {
      result.year = arg.split('=')[1];
    } else if (arg.startsWith('--progress=')) {
      result.progress = arg.split('=')[1] as any;
    } else if (arg.startsWith('--output=')) {
      result.output = arg.split('=')[1];
    }
  }

  if (!result.output) {
    const timestamp = Date.now();
    result.output = `test-docs/generated/progress-report-${result.student.toLowerCase().replace(/ /g, '-')}-${result.period}-${timestamp}.pdf`;
  }

  return result;
}

async function main() {
  const options = parseArgs();

  console.log('\n📊 Progress Report Generator');
  console.log('='.repeat(40));
  console.log(`Student: ${options.student}`);
  console.log(`Period: ${options.period} (${options.year})`);
  console.log(`Progress Level: ${options.progress}`);
  console.log(`Output: ${options.output}`);

  console.log('\n⏳ Generating progress report content...');
  const content = await generateProgressReportContent(options);

  console.log('📄 Creating PDF...');
  const pdfBytes = await createPDF(content, options);

  mkdirSync(dirname(options.output), { recursive: true });
  writeFileSync(options.output, pdfBytes);

  console.log(`\n✅ Generated: ${options.output}`);
  console.log(`   Size: ${(pdfBytes.length / 1024).toFixed(1)} KB\n`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
