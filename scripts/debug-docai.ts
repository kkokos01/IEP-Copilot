#!/usr/bin/env node

/**
 * Debug script to test Document AI directly
 * This helps identify why extraction returns 0 pages
 *
 * Usage: npx tsx scripts/debug-docai.ts <path-to-pdf>
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { readFileSync, existsSync, writeFileSync } from 'fs';

async function debugDocAI(pdfPath: string) {
  console.log("\n🔍 Document AI Debug Script");
  console.log("=".repeat(50));

  // Check file exists
  if (!existsSync(pdfPath)) {
    console.error(`❌ File not found: ${pdfPath}`);
    process.exit(1);
  }

  // Load PDF
  const pdfBuffer = readFileSync(pdfPath);
  console.log(`📄 PDF loaded: ${pdfPath}`);
  console.log(`   Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
  console.log(`   First 10 bytes: ${pdfBuffer.slice(0, 10).toString()}`);

  // Check environment
  console.log("\n🔧 Environment:");
  console.log(`   GCP_PROJECT_ID: ${process.env.GCP_PROJECT_ID ? '✅ set' : '❌ missing'}`);
  console.log(`   DOCAI_LOCATION: ${process.env.DOCAI_LOCATION || 'us (default)'}`);
  console.log(`   DOCAI_PROCESSOR_ID: ${process.env.DOCAI_PROCESSOR_ID ? '✅ set' : '❌ missing'}`);
  console.log(`   GCP_SERVICE_ACCOUNT_KEY: ${process.env.GCP_SERVICE_ACCOUNT_KEY ? '✅ set' : '❌ missing'}`);

  const projectId = process.env.GCP_PROJECT_ID!;
  const location = process.env.DOCAI_LOCATION || "us";
  const processorId = process.env.DOCAI_PROCESSOR_ID!;

  if (!projectId || !processorId) {
    console.error("\n❌ Missing required environment variables");
    process.exit(1);
  }

  // Create client
  console.log("\n📡 Creating Document AI client...");
  let client: DocumentProcessorServiceClient;

  const serviceAccountKeyStr = process.env.GCP_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKeyStr) {
    try {
      const credentials = JSON.parse(serviceAccountKeyStr);
      console.log(`   Using service account: ${credentials.client_email}`);
      client = new DocumentProcessorServiceClient({
        projectId,
        credentials,
      });
    } catch (e: any) {
      console.error(`❌ Failed to parse credentials: ${e.message}`);
      process.exit(1);
    }
  } else {
    console.log("   Using default credentials");
    client = new DocumentProcessorServiceClient();
  }

  // Build processor path
  const processorPath = `projects/${projectId}/locations/${location}/processors/${processorId}`;
  console.log(`   Processor: ${processorPath}`);

  // Make request
  console.log("\n⏳ Calling Document AI...");
  const startTime = Date.now();

  try {
    const [result] = await client.processDocument({
      name: processorPath,
      rawDocument: {
        content: pdfBuffer.toString("base64"),
        mimeType: "application/pdf",
      },
      processOptions: {
        ocrConfig: {
          enableNativePdfParsing: true,
        },
      },
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Response received in ${elapsed}s`);

    // Analyze response
    const document = result.document;
    console.log("\n📊 Response Analysis:");
    console.log(`   document exists: ${!!document}`);

    if (document) {
      console.log(`   document.text exists: ${!!document.text}`);
      console.log(`   document.text length: ${document.text?.length || 0}`);
      console.log(`   document.pages exists: ${!!document.pages}`);
      console.log(`   document.pages length: ${document.pages?.length || 0}`);

      if (document.text) {
        console.log(`\n📝 Text preview (first 500 chars):`);
        console.log(document.text.substring(0, 500));
      }

      if (document.pages && document.pages.length > 0) {
        console.log(`\n📄 Page details:`);
        document.pages.forEach((page, i) => {
          console.log(`   Page ${i + 1}:`);
          console.log(`     - pageNumber: ${page.pageNumber}`);
          console.log(`     - dimension: ${page.dimension?.width}x${page.dimension?.height}`);
          console.log(`     - paragraphs: ${page.paragraphs?.length || 0}`);
          console.log(`     - blocks: ${page.blocks?.length || 0}`);
          console.log(`     - tables: ${page.tables?.length || 0}`);
        });
      }

      // Save raw response for inspection
      const outputPath = 'reference/debug-docai-response.json';
      writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(`\n💾 Full response saved to: ${outputPath}`);
    }

  } catch (error: any) {
    console.error(`\n❌ Document AI error:`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Details: ${JSON.stringify(error.details, null, 2)}`);
  }
}

// Main
const pdfPath = process.argv[2];
if (!pdfPath) {
  console.log("Usage: npx tsx scripts/debug-docai.ts <path-to-pdf>");
  console.log("\nExample:");
  console.log("  npx tsx scripts/debug-docai.ts test-docs/from-user/Texas-IEP-Example.pdf");
  process.exit(1);
}

debugDocAI(pdfPath);
