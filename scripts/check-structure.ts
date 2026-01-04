import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { getSupabaseAdmin } from '../src/lib/supabase';

async function test() {
  const { data: ieps } = await getSupabaseAdmin()
    .from('documents')
    .select(`
      id,
      cases!inner (
        id,
        child_id,
        children!inner (
          id,
          name,
          user_id
        )
      )
    `)
    .eq('cases.child_id', '9c09d982-45cb-4149-a578-d7e39478efd9')
    .eq('type', 'iep')
    .limit(1);

  console.log('Full structure:');
  console.log(JSON.stringify(ieps, null, 2));
}

test().then(() => process.exit(0));
