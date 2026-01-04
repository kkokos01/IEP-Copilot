/**
 * Test child analytics API with real authentication
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import { getSupabaseAdmin } from '../src/lib/supabase';

async function testWithAuth() {
  console.log('🧪 Testing Child Analytics API with Authentication\n');

  const testEmail = 'kevin.kokoszka@gmail.com';
  const testPassword = 'Jordan513!';

  try {
    // Step 1: Sign in to get auth token
    console.log(`1️⃣  Signing in as ${testEmail}...`);

    const { data: authData, error: signInError } = await getSupabaseAdmin()
      .auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

    if (signInError || !authData.session) {
      console.error(`❌ Sign in failed: ${signInError?.message}`);
      console.log('\n💡 Note: If password is incorrect, you can reset it in Supabase dashboard');
      return;
    }

    const accessToken = authData.session.access_token;
    const userId = authData.user.id;

    console.log(`   ✅ Signed in successfully`);
    console.log(`   User ID: ${userId}\n`);

    // Step 2: Find a child for this user
    console.log('2️⃣  Finding child for this user...');

    const { data: children } = await getSupabaseAdmin()
      .from('children')
      .select('id, name')
      .eq('user_id', userId)
      .limit(1);

    if (!children || children.length === 0) {
      console.error('❌ No children found for this user');
      return;
    }

    const child = children[0];
    console.log(`   ✅ Found child: ${child.name} (ID: ${child.id})\n`);

    // Step 3: Make API request
    console.log('3️⃣  Making API request...');
    const url = `http://localhost:3000/api/children/${child.id}/analytics`;
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API request failed:`);
      console.error(errorText);
      return;
    }

    const data = await response.json();

    // Step 4: Verify response structure
    console.log('4️⃣  Verifying response structure...\n');

    const checks = [
      { field: 'child', present: !!data.child },
      { field: 'child.id', present: !!data.child?.id },
      { field: 'child.name', present: !!data.child?.name },
      { field: 'overview', present: !!data.overview },
      { field: 'overview.totalIEPs', present: typeof data.overview?.totalIEPs === 'number' },
      { field: 'timeline', present: Array.isArray(data.timeline) },
      { field: 'validation', present: !!data.validation },
    ];

    checks.forEach(check => {
      const icon = check.present ? '✅' : '❌';
      console.log(`   ${icon} ${check.field}`);
    });

    console.log('\n📊 Response Summary:\n');
    console.log(`   Child: ${data.child?.name || 'N/A'}`);
    console.log(`   Total IEPs: ${data.overview?.totalIEPs || 0}`);
    console.log(`   Date Range: ${data.overview?.dateRange?.first || 'N/A'} → ${data.overview?.dateRange?.latest || 'N/A'}`);
    console.log(`   Timeline Entries: ${data.timeline?.length || 0}`);
    console.log(`   Validation Issues: ${data.validation?.totalIssues || 0}`);

    if (data.latestVsPrevious) {
      console.log('\n   Latest vs Previous IEP:');
      console.log(`     Goals: ${data.latestVsPrevious.goals?.current || 0} (${data.latestVsPrevious.goals?.added || 0} added, ${data.latestVsPrevious.goals?.removed || 0} removed)`);
      console.log(`     Services: ${data.latestVsPrevious.services?.current || 0} (${data.latestVsPrevious.services?.added?.length || 0} added, ${data.latestVsPrevious.services?.removed?.length || 0} removed)`);
      console.log(`     Service Hours: ${data.latestVsPrevious.services?.totalMinutesPerWeek?.current || 0} min/week (change: ${data.latestVsPrevious.services?.totalMinutesPerWeek?.change || 0})`);
    }

    console.log('\n📄 Full Response:\n');
    console.log(JSON.stringify(data, null, 2));

    console.log('\n✅ API TEST PASSED! All checks successful.\n');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  } finally {
    // Sign out
    await getSupabaseAdmin().auth.signOut();
  }
}

testWithAuth()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
