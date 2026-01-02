#!/usr/bin/env node

// Check bbox values in citations table
// Usage: npx tsx scripts/check-bbox.ts

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkBbox() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('📊 Checking citations bbox data...\n');

  // Get all citations with their bbox values
  const { data: citations, error } = await supabase
    .from('citations')
    .select('id, document_id, page_number, quote_text, bbox, verification_status')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching citations:', error.message);
    process.exit(1);
  }

  if (!citations || citations.length === 0) {
    console.log('No citations found in database');
    process.exit(0);
  }

  console.log(`Found ${citations.length} citations (showing up to 50 most recent)\n`);

  // Analyze bbox values
  let withBbox = 0;
  let withoutBbox = 0;
  let nullBbox = 0;
  let emptyBbox = 0;

  console.log('Citation Analysis:');
  console.log('==================');

  for (const citation of citations) {
    const bboxStatus = analyzeBbox(citation.bbox);

    if (bboxStatus === 'valid') withBbox++;
    else if (bboxStatus === 'null') nullBbox++;
    else if (bboxStatus === 'empty') emptyBbox++;
    else withoutBbox++;

    // Show first 10 in detail
    if (citations.indexOf(citation) < 10) {
      console.log(`\nCitation ${citation.id.slice(0, 8)}...:`);
      console.log(`  Page: ${citation.page_number}`);
      console.log(`  Quote: "${citation.quote_text?.slice(0, 60)}..."`);
      console.log(`  Verification: ${citation.verification_status}`);
      console.log(`  bbox: ${JSON.stringify(citation.bbox)}`);
      console.log(`  bbox status: ${bboxStatus}`);
    }
  }

  console.log('\n\nSummary:');
  console.log('========');
  console.log(`Total citations: ${citations.length}`);
  console.log(`With valid bbox: ${withBbox} (${((withBbox/citations.length)*100).toFixed(1)}%)`);
  console.log(`With null bbox: ${nullBbox} (${((nullBbox/citations.length)*100).toFixed(1)}%)`);
  console.log(`With empty bbox: ${emptyBbox} (${((emptyBbox/citations.length)*100).toFixed(1)}%)`);
  console.log(`Other issues: ${withoutBbox} (${((withoutBbox/citations.length)*100).toFixed(1)}%)`);

  if (nullBbox + emptyBbox === citations.length) {
    console.log('\n⚠️  ALL citations have null/empty bbox!');
    console.log('   This is why highlights are not appearing on PDFs.');
    console.log('   The bbox data is not being populated during extraction/verification.');
  } else if (withBbox === 0) {
    console.log('\n⚠️  No citations have valid bbox coordinates!');
  } else {
    console.log(`\n✅ ${withBbox} citations have valid bbox coordinates`);
  }

  // Also check document_blocks for bbox
  console.log('\n\n📊 Checking document_blocks for bbox data...');

  const { data: blocks, error: blocksError } = await supabase
    .from('document_blocks')
    .select('id, document_id, page_number, block_type, bbox')
    .limit(20);

  if (blocksError) {
    console.log('Error fetching blocks:', blocksError.message);
  } else if (!blocks || blocks.length === 0) {
    console.log('No document_blocks found');
  } else {
    let blocksWithBbox = 0;
    for (const block of blocks) {
      if (analyzeBbox(block.bbox) === 'valid') blocksWithBbox++;
    }
    console.log(`Found ${blocks.length} blocks, ${blocksWithBbox} with valid bbox`);

    if (blocks.length > 0) {
      console.log('\nFirst block sample:');
      console.log(JSON.stringify(blocks[0], null, 2));
    }
  }
}

function analyzeBbox(bbox: any): 'valid' | 'null' | 'empty' | 'invalid' {
  if (bbox === null || bbox === undefined) return 'null';
  if (typeof bbox !== 'object') return 'invalid';
  if (Object.keys(bbox).length === 0) return 'empty';

  // Check for expected properties
  if ('x0' in bbox && 'y0' in bbox && 'x1' in bbox && 'y1' in bbox) {
    const { x0, y0, x1, y1 } = bbox;
    if (typeof x0 === 'number' && typeof y0 === 'number' &&
        typeof x1 === 'number' && typeof y1 === 'number') {
      return 'valid';
    }
  }

  return 'invalid';
}

checkBbox().catch(console.error);
