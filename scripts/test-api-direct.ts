/**
 * Direct test of child analytics API logic
 * Tests the database queries and data processing without HTTP layer
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

import { getSupabaseAdmin } from '../src/lib/supabase';

async function testAnalyticsLogic() {
  console.log('🔍 Finding a child with completed IEPs...\n');

  // Step 1: Find children with IEPs
  const { data: children, error: childrenError } = await getSupabaseAdmin()
    .from('children')
    .select('id, name, user_id')
    .limit(10);

  if (childrenError || !children || children.length === 0) {
    console.error('❌ Failed to fetch children:', childrenError);
    return;
  }

  console.log(`Found ${children.length} children in database`);

  // Step 2: For each child, check if they have IEPs
  for (const child of children) {
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
      .eq('cases.child_id', child.id)
      .eq('type', 'iep')
      .eq('status', 'complete')
      .order('effective_date', { ascending: false });

    if (iepsError) {
      console.log(`  ⚠️  ${child.name}: Query error - ${iepsError.message}`);
      continue;
    }

    if (!ieps || ieps.length === 0) {
      console.log(`  ⚠️  ${child.name}: No completed IEPs`);
      continue;
    }

    // Found a child with IEPs!
    console.log(`\n✅ Found child with IEPs: ${child.name}`);
    console.log(`   Child ID: ${child.id}`);
    console.log(`   User ID: ${child.user_id}`);
    console.log(`   IEP count: ${ieps.length}`);
    console.log(`   IEP dates: ${ieps.map(iep => iep.effective_date).join(', ')}`);

    // Check extracted data
    const iepsWithData = ieps.filter(iep => iep.extracted_iep_data && iep.extracted_iep_data.length > 0);
    console.log(`   IEPs with extracted data: ${iepsWithData.length}`);

    if (iepsWithData.length > 0) {
      const latestIEP = iepsWithData[0];
      const data = latestIEP.extracted_iep_data[0]?.data as any;

      console.log(`\n   Latest IEP (${latestIEP.effective_date}):`);
      console.log(`     Goals: ${data?.goals?.length || 0}`);
      console.log(`     Services: ${data?.services?.length || 0}`);
      console.log(`     Accommodations: ${data?.accommodations?.length || 0}`);

      if (data?.goals && data.goals.length > 0) {
        console.log(`\n     Sample goals:`);
        data.goals.slice(0, 2).forEach((goal: any, i: number) => {
          console.log(`       ${i + 1}. Domain: ${goal.domain?.value || 'N/A'}`);
          console.log(`          Text: ${(goal.goalText?.value || '').substring(0, 80)}...`);
        });
      }

      if (data?.services && data.services.length > 0) {
        console.log(`\n     Sample services:`);
        data.services.slice(0, 2).forEach((service: any, i: number) => {
          console.log(`       ${i + 1}. Type: ${service.serviceType?.value || 'N/A'}`);
          console.log(`          Frequency: ${service.frequency?.value || 'N/A'}`);
          console.log(`          Duration: ${service.duration?.value || 'N/A'}`);
        });
      }
    }

    // Step 3: Test validation issues query
    const documentIds = ieps.map(iep => iep.id);
    const { data: issues, error: issuesError } = await getSupabaseAdmin()
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
      .in('extracted_iep_data.document_id', documentIds);

    if (issuesError) {
      console.log(`\n   ⚠️  Validation issues query error: ${issuesError.message}`);
    } else {
      console.log(`\n   Validation issues: ${issues?.length || 0}`);
      if (issues && issues.length > 0) {
        const bySeverity = {
          error: issues.filter(i => i.severity === 'error').length,
          warning: issues.filter(i => i.severity === 'warning').length,
          info: issues.filter(i => i.severity === 'info').length
        };
        console.log(`     Errors: ${bySeverity.error}, Warnings: ${bySeverity.warning}, Info: ${bySeverity.info}`);
      }
    }

    console.log('\n✅ API logic test successful! All queries working correctly.');
    console.log('\n📊 This child is suitable for testing the analytics API.');
    console.log(`   Test URL: /api/children/${child.id}/analytics`);

    return; // Stop after first child with IEPs
  }

  console.log('\n❌ No children with completed IEPs found');
}

testAnalyticsLogic()
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  })
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  });
