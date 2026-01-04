/**
 * Test script for child analytics API
 *
 * Usage: npx tsx scripts/test-child-analytics.ts
 */

import { getSupabaseAdmin } from '../src/lib/supabase';

async function testChildAnalytics() {
  console.log('Finding a child with IEPs...\n');

  // Find a child that has at least one IEP
  const { data: children, error: childrenError } = await getSupabaseAdmin()
    .from('children')
    .select(`
      id,
      name,
      user_id,
      cases!inner (
        id,
        documents!inner (
          id,
          type,
          status
        )
      )
    `)
    .eq('cases.documents.type', 'iep')
    .eq('cases.documents.status', 'complete')
    .limit(1);

  if (childrenError || !children || children.length === 0) {
    console.error('❌ No children with completed IEPs found');
    console.error('Error:', childrenError);
    return;
  }

  const testChild = children[0];
  console.log(`✅ Found child: ${testChild.name} (ID: ${testChild.id})`);
  console.log(`   User ID: ${testChild.user_id}\n`);

  // Get user auth token (this would normally come from the frontend)
  console.log('Getting user auth token...\n');
  const { data: { session }, error: sessionError } = await getSupabaseAdmin().auth.admin.getUserById(testChild.user_id);

  if (sessionError || !session) {
    console.error('❌ Failed to get user session');
    console.error('Error:', sessionError);
    return;
  }

  // Make API request
  console.log('Testing API route...\n');
  const baseUrl = process.env.VERCEL_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/children/${testChild.id}/analytics`, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
    const error = await response.text();
    console.error('Error:', error);
    return;
  }

  const data = await response.json();

  console.log('✅ API request successful!\n');
  console.log('Response structure:');
  console.log(JSON.stringify(data, null, 2));
}

testChildAnalytics().catch(console.error);
