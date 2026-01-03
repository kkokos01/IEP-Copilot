import { inngest } from '../client';
import { createClient } from '@supabase/supabase-js';
import { validateIEP } from '@/lib/validators/iepValidators';
import type { IEPData } from '@/lib/validators/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const validateIepExtraction = inngest.createFunction(
  {
    id: 'validate-iep-extraction',
    name: 'Validate IEP Extraction',
    retries: 2,
  },
  { event: 'extraction.completed' },
  async ({ event, step }) => {
    const { documentId, extractionId } = event.data;

    // Step 1: Get extraction data
    const extraction = await step.run('get-extraction-data', async () => {
      const { data, error } = await supabase
        .from('extracted_iep_data')
        .select('id, data, document_id')
        .eq('id', extractionId)
        .single();

      if (error) {
        throw new Error(`Failed to get extraction: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Extraction ${extractionId} not found`);
      }

      return data;
    });

    // Step 2: Run validators
    const validationIssues = await step.run('run-validators', async () => {
      console.log('Running validators on extraction:', extractionId);

      const issues = validateIEP(extraction.data as IEPData);

      console.log(`Validators found ${issues.length} issues:`, {
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
        info: issues.filter(i => i.severity === 'info').length,
      });

      return issues;
    });

    // Step 3: Save validation issues to database
    if (validationIssues.length > 0) {
      await step.run('save-validation-issues', async () => {
        const issuesForDb = validationIssues.map((issue) => ({
          extracted_iep_data_id: extraction.id,
          severity: issue.severity,
          category: issue.category,
          title: issue.title,
          message: issue.message,
          field_path: issue.fieldPath,
          validator_name: issue.validatorName,
          validator_version: issue.validatorVersion,
        }));

        const { error } = await supabase
          .from('validation_issues')
          .insert(issuesForDb);

        if (error) {
          throw new Error(`Failed to save validation issues: ${error.message}`);
        }

        console.log(`Saved ${issuesForDb.length} validation issues to database`);
      });
    }

    // Step 4: Update document status with validation summary
    await step.run('update-document-metadata', async () => {
      const { error } = await supabase
        .from('documents')
        .update({
          metadata: {
            validation_complete: true,
            validation_issues_count: validationIssues.length,
            validation_errors: validationIssues.filter(i => i.severity === 'error').length,
            validation_warnings: validationIssues.filter(i => i.severity === 'warning').length,
          },
        })
        .eq('id', documentId);

      if (error) {
        console.error('Failed to update document metadata:', error);
        // Non-critical, don't throw
      }
    });

    return {
      documentId,
      extractionId,
      issuesFound: validationIssues.length,
      breakdown: {
        errors: validationIssues.filter(i => i.severity === 'error').length,
        warnings: validationIssues.filter(i => i.severity === 'warning').length,
        info: validationIssues.filter(i => i.severity === 'info').length,
      },
    };
  }
);
