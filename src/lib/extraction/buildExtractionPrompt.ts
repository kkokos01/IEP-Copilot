import schema from '@/schemas/iep_extraction.v1.schema.json';

export interface PageWithContent {
  page_number: number;
  text: string;
}

export function buildExtractionPrompt(pages: PageWithContent[]): string {
  return `You are an expert at extracting structured data from IEP (Individualized Education Program) documents.

TASK: Extract information from this IEP document according to the schema provided.

IMPORTANT INSTRUCTIONS:
1. For EVERY field, include evidence showing where you found the information
2. Evidence should include: page number, exact quote, bounding box (normalized 0-1), confidence (0-1)
3. If a field is not found, omit it from the output (don't include null or empty values)
4. Use exact quotes from the document, not paraphrased text
5. For dates, use YYYY-MM-DD format
6. For student name, use full legal name as written in document

DOCUMENT PAGES:
${pages.map((p) => `--- Page ${p.page_number} ---\n${p.text}`).join('\n\n')}

EXTRACTION SCHEMA:
${JSON.stringify(schema, null, 2)}

RESPONSE FORMAT:
Return valid JSON matching the schema. Include evidence arrays for all fields.

Example field with evidence:
{
  "value": "Student will improve reading comprehension",
  "evidence": [
    {
      "page": 3,
      "quote": "Student will improve reading comprehension to 4th grade level",
      "bbox": { "x0": 0.1, "y0": 0.3, "x1": 0.9, "y1": 0.35 },
      "confidence": 0.95
    }
  ]
}

Begin extraction:`;
}
