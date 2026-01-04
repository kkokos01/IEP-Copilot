#!/usr/bin/env tsx

/**
 * Generate synthetic Evaluation Report documents for testing
 *
 * Evaluation reports include psychoeducational, speech/language, OT, PT assessments
 *
 * Usage:
 *   npx tsx scripts/generate-evaluation.ts [options]
 *
 * Options:
 *   --student=Name                Student name
 *   --type=psych|speech|ot|pt    Evaluation type (default: psych)
 *   --year=2024                   Evaluation year
 *   --output=path.pdf             Output file path
 *   --findings=positive|mixed|concerning  Overall findings
 *
 * Examples:
 *   npx tsx scripts/generate-evaluation.ts --student="Emma Martinez" --type=speech --findings=mixed
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

interface EvaluationOptions {
  student: string;
  type: 'psych' | 'speech' | 'ot' | 'pt';
  year: string;
  findings: 'positive' | 'mixed' | 'concerning';
  output: string;
}

const EVALUATION_TYPES = {
  psych: {
    title: 'Psychoeducational Evaluation',
    areas: 'Cognitive abilities, academic achievement, processing skills, attention, memory, emotional functioning',
    assessments: 'WISC-V, WIAT-IV, Conners, BASC-3, clinical observation',
  },
  speech: {
    title: 'Speech-Language Evaluation',
    areas: 'Articulation, phonology, receptive language, expressive language, pragmatics, fluency',
    assessments: 'CELF-5, Goldman-Fristoe, PPVT-5, language samples, oral-motor exam',
  },
  ot: {
    title: 'Occupational Therapy Evaluation',
    areas: 'Fine motor skills, visual-motor integration, sensory processing, handwriting, self-care',
    assessments: 'Beery VMI, Bruininks-Oseretsky, SP-2, handwriting samples, functional observation',
  },
  pt: {
    title: 'Physical Therapy Evaluation',
    areas: 'Gross motor skills, strength, balance, coordination, gait, mobility',
    assessments: 'PDMS-2, muscle strength testing, range of motion, gait analysis, functional mobility',
  },
};

async function generateEvaluationContent(options: EvaluationOptions): Promise<string> {
  const anthropic = new Anthropic();

  const evalType = EVALUATION_TYPES[options.type];

  const prompt = `Generate a realistic ${evalType.title} for a student. This is for software testing - all data is fictional.

STUDENT INFORMATION:
- Name: ${options.student}
- Evaluation Type: ${evalType.title}
- Date of Evaluation: ${options.year}
- Overall Findings: ${options.findings.toUpperCase()}

Generate a complete evaluation report with these sections:

1. **Identifying Information**
   - Student name, DOB, grade, school
   - Evaluation date(s)
   - Evaluator name and credentials
   - Reason for referral

2. **Background Information**
   - Relevant developmental/medical/educational history
   - Previous evaluations or services
   - Parent and teacher concerns

3. **Assessment Methods**
   - List of standardized tests administered: ${evalType.assessments}
   - Observation
   - Record review
   - Interviews

4. **Behavioral Observations**
   - Student's demeanor during testing
   - Attention, effort, rapport
   - Test-taking approach

5. **Test Results and Interpretation**
   For each area assessed (${evalType.areas}):
   - Standard scores, percentile ranks, age/grade equivalents
   - Interpretation of scores (average, below average, above average)
   - Specific strengths and weaknesses
   - Clinical observations

6. **Summary and Diagnostic Impressions**
   - Integration of all findings
   - Diagnostic conclusions
   ${options.findings === 'positive' ? '- Student showing age-appropriate development' : ''}
   ${options.findings === 'mixed' ? '- Student showing some areas of concern requiring support' : ''}
   ${options.findings === 'concerning' ? '- Student demonstrating significant delays requiring intervention' : ''}

7. **Recommendations**
   - Eligibility determination (if applicable)
   - Suggested interventions and accommodations
   - Frequency/duration of recommended services
   - Strategies for home and school
   - Re-evaluation timeline

8. **Evaluator Signature and Credentials**

Use realistic test scores and educational language:
${options.findings === 'positive' ? '- Most standard scores 85-115 (average range)' : ''}
${options.findings === 'positive' ? '- Strengths outweigh challenges' : ''}
${options.findings === 'mixed' ? '- Mix of scores: some 85-115, some 70-84' : ''}
${options.findings === 'mixed' ? '- Clear profile of strengths and weaknesses' : ''}
${options.findings === 'concerning' ? '- Multiple scores below 70 (more than 2 SD below mean)' : ''}
${options.findings === 'concerning' ? '- Significant functional impact' : ''}

Format to be approximately 8-12 pages. Include specific test scores, tables, and detailed interpretations.

Output only the evaluation report content - no meta-commentary.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
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

async function createPDF(content: string, options: EvaluationOptions): Promise<Uint8Array> {
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

  const evalType = EVALUATION_TYPES[options.type];

  // Header
  currentPage.drawText(evalType.title.toUpperCase(), {
    x: margin,
    y: y,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 25;

  currentPage.drawText(`Student: ${options.student} | Date: ${options.year}`, {
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

function parseArgs(): EvaluationOptions {
  const args = process.argv.slice(2);
  const result: EvaluationOptions = {
    student: 'Test Student',
    type: 'psych',
    year: new Date().getFullYear().toString(),
    findings: 'mixed',
    output: '',
  };

  for (const arg of args) {
    if (arg.startsWith('--student=')) {
      result.student = arg.split('=')[1];
    } else if (arg.startsWith('--type=')) {
      result.type = arg.split('=')[1] as any;
    } else if (arg.startsWith('--year=')) {
      result.year = arg.split('=')[1];
    } else if (arg.startsWith('--findings=')) {
      result.findings = arg.split('=')[1] as any;
    } else if (arg.startsWith('--output=')) {
      result.output = arg.split('=')[1];
    }
  }

  if (!result.output) {
    const timestamp = Date.now();
    result.output = `test-docs/generated/evaluation-${result.type}-${result.student.toLowerCase().replace(/ /g, '-')}-${timestamp}.pdf`;
  }

  return result;
}

async function main() {
  const options = parseArgs();

  const evalType = EVALUATION_TYPES[options.type];

  console.log('\n🔬 Evaluation Report Generator');
  console.log('='.repeat(40));
  console.log(`Student: ${options.student}`);
  console.log(`Type: ${evalType.title}`);
  console.log(`Year: ${options.year}`);
  console.log(`Findings: ${options.findings}`);
  console.log(`Output: ${options.output}`);

  console.log('\n⏳ Generating evaluation content...');
  const content = await generateEvaluationContent(options);

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
