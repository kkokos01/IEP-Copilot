#!/usr/bin/env tsx

/**
 * Reset a user's password in Supabase
 *
 * Usage:
 *   npx tsx scripts/reset-user-password.ts --email=user@example.com --password=newpassword
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const args = process.argv.slice(2);
  const emailArg = args.find(a => a.startsWith('--email='));
  const passwordArg = args.find(a => a.startsWith('--password='));

  if (!emailArg || !passwordArg) {
    console.error('Usage: npx tsx scripts/reset-user-password.ts --email=user@example.com --password=newpassword');
    process.exit(1);
  }

  const email = emailArg.split('=')[1];
  const newPassword = passwordArg.split('=')[1];

  console.log('\n🔐 Password Reset Tool');
  console.log('='.repeat(50));
  console.log(`Email: ${email}`);
  console.log(`New Password: ${'*'.repeat(newPassword.length)}\n`);

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Get user by email
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.users.find(u => u.email === email);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.id}`);

    // Update password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (error) {
      console.error(`❌ Failed to update password: ${error.message}`);
      process.exit(1);
    }

    console.log(`\n✅ Password updated successfully!`);
    console.log(`\nYou can now log in with:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${newPassword}\n`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
