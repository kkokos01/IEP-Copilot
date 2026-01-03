import { inngest } from '@/inngest/client';
import { buildExtractionPrompt } from '@/lib/extraction/buildExtractionPrompt';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const extractIepStructuredData = inngest.createFunction(
  {
    id: 'extract-iep-structured-data',
    retries: 2,
  },
  { event: 'document.extracted' }, // Triggered after OCR completes
  async ({ event, step }) => {
    const { documentId } = event.data;

    // Get document pages (OCR text already extracted by processDocument)
    const pages = await step.run('get-document-pages', async () => {
      const { data, error } = await supabase
        .from('document_pages')
        .select('page_number, text')
        .eq('document_id', documentId)
        .order('page_number', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No pages found for document');
      }
      return data;
    });

    // Build extraction prompt
    const prompt = buildExtractionPrompt(pages);

    // Call Claude for structured extraction
    const extracted = await step.run('call-claude-extraction', async () => {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 16000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const textContent = message.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      // Parse JSON from response (Claude might wrap in markdown)
      const text = textContent.text;
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const jsonString = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonString);
    });

    // Basic validation
    await step.run('validate-extraction', async () => {
      if (!extracted.student || !extracted.goals || !Array.isArray(extracted.goals)) {
        throw new Error('Extraction missing required fields (student, goals)');
      }

      if (extracted.goals.length === 0) {
        throw new Error('No goals extracted from IEP');
      }
    });

    // Save to database
    const savedExtraction = await step.run('save-extraction', async () => {
      const { data, error } = await supabase
        .from('extracted_iep_data')
        .insert({
          document_id: documentId,
          data: extracted,
          schema_version: '1.0.0',
          model_used: 'claude-sonnet-4-5-20250929',
          extraction_prompt_version: '1.0',
          status: 'extracted',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    });

    // Trigger downstream events (for validators, analytics - Week 3+)
    await step.sendEvent('trigger-validation', {
      name: 'extraction.completed',
      data: {
        documentId,
        extractionId: savedExtraction.id,
      },
    });

    return { extractionId: savedExtraction.id };
  }
);
