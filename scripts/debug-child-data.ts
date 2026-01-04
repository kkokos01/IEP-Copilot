/**
 * Debug script to check child data structure
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { getSupabaseAdmin } from '../src/lib/supabase';

async function debugChildData() {
  const childId = '9c09d982-45cb-4149-a578-d7e39478efd9';
  const userId = 'acfb3585-ba1c-419b-8543-cbf5d64a9849';

  console.log('🔍 Debugging child data structure\n');
  console.log(`Child ID: ${childId}`);
  console.log(`User ID: ${userId}\n`);

  // Check child record
  console.log('1️⃣  Checking child record...');
  const { data: child, error: childError } = await getSupabaseAdmin()
    .from('children')
    .select('*')
    .eq('id', childId)
    .single();

  if (childError) {
    console.error(`❌ Error: ${childError.message}`);
  } else {
    console.log(`   ✅ Child exists: ${child.name}`);
    console.log(`   User ID match: ${child.user_id === userId ? '✅' : '❌'} (${child.user_id})`);
  }

  // Check cases for this child
  console.log('\n2️⃣  Checking cases...');
  const { data: cases, error: casesError } = await getSupabaseAdmin()
    .from('cases')
    .select('*')
    .eq('child_id', childId);

  if (casesError) {
    console.error(`❌ Error: ${casesError.message}`);
  } else {
    console.log(`   ✅ Found ${cases?.length || 0} cases`);
    cases?.forEach(c => {
      console.log(`      - Case: ${c.name} (ID: ${c.id})`);
    });
  }

  // Check documents for each case
  console.log('\n3️⃣  Checking documents...');
  for (const caseRecord of cases || []) {
    const { data: docs, error: docsError } = await getSupabaseAdmin()
      .from('documents')
      .select('id, type, status, effective_date, source_filename')
      .eq('case_id', caseRecord.id);

    if (docsError) {
      console.error(`   ❌ Error for case ${caseRecord.id}: ${docsError.message}`);
    } else {
      console.log(`   Case "${caseRecord.name}": ${docs?.length || 0} documents`);
      docs?.forEach(d => {
        console.log(`      - ${d.source_filename || 'Unnamed'} (Type: ${d.type}, Status: ${d.status}, Date: ${d.effective_date || 'null'})`);
      });
    }
  }

  // Now test the exact query from the API
  console.log('\n4️⃣  Testing exact API query...');
  const { data: ieps, error: iepsError } = await getSupabaseAdmin()
    .from('documents')
    .select(`
      id,
      effective_date,
      meeting_date,
      status,
      case_id,
      cases!inner (
        id,
        child_id,
        children!inner (
          id,
          name,
          user_id
        )
      ),
      extracted_iep_data (
        id,
        data,
        extracted_at
      )
    `)
    .eq('cases.child_id', childId)
    .eq('type', 'iep')
    .eq('status', 'complete')
    .order('effective_date', { ascending: false });

  if (iepsError) {
    console.error(`   ❌ Query error: ${iepsError.message}`);
  } else {
    console.log(`   ✅ Query returned ${ieps?.length || 0} IEPs`);

    if (ieps && ieps.length > 0) {
      console.log(`\n   First IEP structure:`);
      console.log(`   - IEP ID: ${ieps[0].id}`);
      console.log(`   - Status: ${ieps[0].status}`);
      console.log(`   - Cases type: ${typeof ieps[0].cases} (${Array.isArray(ieps[0].cases) ? 'array' : 'object'})`);

      if (Array.isArray(ieps[0].cases)) {
        console.log(`   - Cases length: ${ieps[0].cases.length}`);
        if (ieps[0].cases.length > 0) {
          const firstCase = ieps[0].cases[0] as any;
          console.log(`   - First case ID: ${firstCase.id}`);
          console.log(`   - Children type: ${typeof firstCase.children} (${Array.isArray(firstCase.children) ? 'array' : 'object'})`);

          if (Array.isArray(firstCase.children)) {
            console.log(`   - Children length: ${firstCase.children.length}`);
            if (firstCase.children.length > 0) {
              const firstChild = firstCase.children[0];
              console.log(`   - First child ID: ${firstChild.id}`);
              console.log(`   - First child user_id: ${firstChild.user_id}`);
              console.log(`   - Match: ${firstChild.user_id === userId ? '✅' : '❌'}`);
            }
          }
        }
      }
    } else {
      console.log(`\n   ⚠️  No IEPs returned by API query`);
      console.log(`   This means no documents match: type='iep' AND status='complete'`);
    }
  }

  console.log('\n✅ Debug complete\n');
}

debugChildData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
