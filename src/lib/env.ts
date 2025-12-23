// src/lib/env.ts
// Runtime-only environment validation with caching
// NEVER import at module level - call only inside handlers

import { z } from 'zod';

// Environment schema
const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // GCP
  GCP_PROJECT_ID: z.string().min(1),
  DOCAI_LOCATION: z.enum(['us', 'eu']),
  DOCAI_PROCESSOR_ID: z.string().min(1),
  GCP_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GCP_WIF_CREDENTIALS_JSON: z.string().optional(),
  
  // Anthropic
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().optional(),
  
  // Inngest
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),
  
  // Optional features
  ENABLE_SERVER_PDF_RENDER: z.string().optional(),
  ENABLE_FUZZY_VERIFICATION: z.string().optional(),
});

// Type for validated environment
export type ValidatedEnv = z.infer<typeof envSchema>;

// Cache for validated environment (runtime-only)
let validatedEnv: ValidatedEnv | null = null;

/**
 * Get validated environment variables.
 * Call ONLY inside handlers, never at module level.
 * 
 * @returns Validated environment variables
 */
export function getValidatedEnv(): ValidatedEnv {
  // Return cached result if already validated
  if (validatedEnv) {
    return validatedEnv;
  }
  
  // Validate and cache
  validatedEnv = envSchema.parse(process.env);
  return validatedEnv;
}

/**
 * Check if environment has been validated.
 * Useful for debugging.
 */
export function isEnvValidated(): boolean {
  return validatedEnv !== null;
}
