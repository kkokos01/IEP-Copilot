// src/app/api/inngest/route.ts
// Inngest webhook handler for Next.js App Router

import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { processDocument } from "@/inngest/functions/processDocument";
import { generateFindings } from "@/inngest/functions/generateFindings";
import { extractIepStructuredData } from "@/inngest/functions/extractIepStructuredData";
import { validateIepExtraction } from "@/inngest/functions/validateIepExtraction";

// Force Node.js runtime (required for Document AI and PDF processing)
export const runtime = "nodejs";

// Export all HTTP methods that Inngest needs
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processDocument,
    generateFindings,
    extractIepStructuredData,
    validateIepExtraction,
  ],
});

// Increase timeout for long-running functions
export const maxDuration = 300; // 5 minutes (Vercel Pro limit)
