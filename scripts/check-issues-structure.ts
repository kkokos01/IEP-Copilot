import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { getSupabaseAdmin } from '../src/lib/supabase';

async function test() {
  const documentIds = ['059677fd-a7a4-4e3c-a398-adc63191e957'];

  const { data: issues } = await getSupabaseAdmin()
    .from('validation_issues')
    .select(`
      id,
      severity,
      category,
      title,
      message,
      status,
      extracted_iep_data!inner (
        id,
        document_id
      )
    `)
    .in('extracted_iep_data.document_id', documentIds)
    .limit(2);

  console.log('Validation issues structure:');
  console.log(JSON.stringify(issues, null, 2));
}

test().then(() => process.exit(0));
