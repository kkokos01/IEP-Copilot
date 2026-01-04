# Week 1-2: Structured Extraction Infrastructure

**Objective:** Replace generic findings table with structured JSONB extraction

**Prerequisites:** Review `SHARED_CONTEXT.md` for architecture decisions

## What You're Building

By end of week 2, you'll have:
1. New `extracted_iep_data` table storing structured JSON
2. JSON schema defining IEP structure with evidence
3. Claude-powered extraction pipeline via Inngest
4. Parallel operation with existing findings table (no breaking changes)

## Step 1: Database Migration

**File:** `supabase/migrations/YYYYMMDD_create_extracted_iep_data.sql`

```sql
-- New table for structured IEP data
create table extracted_iep_data (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references documents(id) on delete cascade,

  -- Structured extraction
  data jsonb not null,
  schema_version text not null default '1.0.0',

  -- Metadata
  model_used text not null, -- 'claude-sonnet-4-5-20250929'
  extraction_prompt_version text,
  extracted_at timestamptz default now(),

  -- Status tracking
  status text check (status in ('extracted', 'reviewed', 'approved')) default 'extracted',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,

  -- Search optimization
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(data->>'student_name', '') || ' ' ||
                           coalesce(data->>'school_name', '') || ' ' ||
                           coalesce(data::text, ''))
  ) stored,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_extracted_iep_document on extracted_iep_data(document_id);
create index idx_extracted_iep_status on extracted_iep_data(status);
create index idx_extracted_iep_search on extracted_iep_data using gin(search_vector);

-- Trigger for updated_at
create trigger set_extracted_iep_updated_at
  before update on extracted_iep_data
  for each row
  execute function update_updated_at_column();

-- Note: Assumes update_updated_at_column() function exists
-- If not, create it:
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
```

**Run Migration:**
```bash
# Local
supabase migration up

# Production (when ready)
supabase db push
```

**Verify:**
```sql
-- Check table exists
select * from information_schema.tables where table_name = 'extracted_iep_data';

-- Check indexes
select indexname from pg_indexes where tablename = 'extracted_iep_data';
```

## Step 2: JSON Schema Definition

**File:** `src/schemas/iep_extraction.v1.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "IEP Extraction Schema",
  "version": "1.0.0",
  "type": "object",
  "required": ["student", "dates", "goals"],
  "properties": {
    "student": {
      "type": "object",
      "description": "Student demographic information",
      "x-extraction-hint": "Usually found in header or first page",
      "required": ["name", "dateOfBirth", "grade"],
      "properties": {
        "name": {
          "type": "object",
          "properties": {
            "value": { "type": "string" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        },
        "dateOfBirth": {
          "type": "object",
          "properties": {
            "value": { "type": "string", "format": "date" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        },
        "grade": {
          "type": "object",
          "properties": {
            "value": { "type": "string" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        },
        "school": {
          "type": "object",
          "properties": {
            "value": { "type": "string" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        },
        "district": {
          "type": "object",
          "properties": {
            "value": { "type": "string" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        },
        "primaryLanguage": {
          "type": "object",
          "properties": {
            "value": { "type": "string" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        }
      }
    },

    "disability": {
      "type": "object",
      "description": "Primary and secondary disability categories",
      "properties": {
        "primary": {
          "type": "object",
          "properties": {
            "value": {
              "type": "string",
              "enum": [
                "Specific Learning Disability",
                "Speech or Language Impairment",
                "Other Health Impairment",
                "Autism",
                "Emotional Disturbance",
                "Intellectual Disability",
                "Multiple Disabilities",
                "Orthopedic Impairment",
                "Traumatic Brain Injury",
                "Visual Impairment",
                "Hearing Impairment",
                "Deaf-Blindness",
                "Developmental Delay"
              ]
            },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        },
        "secondary": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "value": { "type": "string" },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          }
        }
      }
    },

    "dates": {
      "type": "object",
      "description": "Important IEP dates and timelines",
      "properties": {
        "iepStartDate": {
          "type": "object",
          "properties": {
            "value": { "type": "string", "format": "date" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        },
        "iepEndDate": {
          "type": "object",
          "properties": {
            "value": { "type": "string", "format": "date" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        },
        "annualReviewDate": {
          "type": "object",
          "properties": {
            "value": { "type": "string", "format": "date" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        },
        "triennialEvaluationDate": {
          "type": "object",
          "properties": {
            "value": { "type": "string", "format": "date" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        },
        "nextProgressReportDate": {
          "type": "object",
          "properties": {
            "value": { "type": "string", "format": "date" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        }
      }
    },

    "plaafp": {
      "type": "object",
      "description": "Present Levels of Academic Achievement and Functional Performance",
      "x-extraction-hint": "Look for sections titled PLAAFP, Present Levels, Current Performance",
      "properties": {
        "academicStrengths": {
          "type": "object",
          "properties": {
            "value": { "type": "string" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        },
        "academicNeeds": {
          "type": "object",
          "properties": {
            "value": { "type": "string" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        },
        "functionalStrengths": {
          "type": "object",
          "properties": {
            "value": { "type": "string" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        },
        "functionalNeeds": {
          "type": "object",
          "properties": {
            "value": { "type": "string" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        },
        "parentConcerns": {
          "type": "object",
          "properties": {
            "value": { "type": "string" },
            "evidence": { "$ref": "#/definitions/Evidence" }
          }
        }
      }
    },

    "goals": {
      "type": "array",
      "description": "Annual goals and short-term objectives",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["goalText", "domain"],
        "properties": {
          "goalText": {
            "type": "object",
            "description": "Full text of the annual goal",
            "properties": {
              "value": { "type": "string" },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          },
          "domain": {
            "type": "object",
            "description": "Goal category or subject area",
            "properties": {
              "value": {
                "type": "string",
                "enum": [
                  "Reading/Literacy",
                  "Mathematics",
                  "Written Expression",
                  "Communication/Speech",
                  "Social/Emotional/Behavioral",
                  "Adaptive/Daily Living",
                  "Motor Skills",
                  "Transition",
                  "Other"
                ]
              },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          },
          "baseline": {
            "type": "object",
            "description": "Current level of performance",
            "properties": {
              "value": { "type": "string" },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          },
          "target": {
            "type": "object",
            "description": "Expected level of achievement",
            "properties": {
              "value": { "type": "string" },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          },
          "measurementMethod": {
            "type": "object",
            "description": "How progress will be measured",
            "properties": {
              "value": { "type": "string" },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          },
          "progressMonitoringFrequency": {
            "type": "object",
            "properties": {
              "value": { "type": "string" },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          }
        }
      }
    },

    "services": {
      "type": "array",
      "description": "Special education and related services",
      "items": {
        "type": "object",
        "properties": {
          "serviceType": {
            "type": "object",
            "properties": {
              "value": { "type": "string" },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          },
          "frequency": {
            "type": "object",
            "description": "How often service is provided (e.g., '2 times per week')",
            "properties": {
              "value": { "type": "string" },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          },
          "duration": {
            "type": "object",
            "description": "Length of each session (e.g., '30 minutes')",
            "properties": {
              "value": { "type": "string" },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          },
          "location": {
            "type": "object",
            "properties": {
              "value": { "type": "string" },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          },
          "provider": {
            "type": "object",
            "properties": {
              "value": { "type": "string" },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          },
          "startDate": {
            "type": "object",
            "properties": {
              "value": { "type": "string", "format": "date" },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          },
          "endDate": {
            "type": "object",
            "properties": {
              "value": { "type": "string", "format": "date" },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          }
        }
      }
    },

    "accommodations": {
      "type": "array",
      "description": "Accommodations and modifications",
      "items": {
        "type": "object",
        "properties": {
          "description": {
            "type": "object",
            "properties": {
              "value": { "type": "string" },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          },
          "category": {
            "type": "object",
            "properties": {
              "value": {
                "type": "string",
                "enum": ["Presentation", "Response", "Setting", "Timing/Scheduling"]
              },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          },
          "appliesTo": {
            "type": "object",
            "properties": {
              "value": {
                "type": "string",
                "enum": ["Classroom", "Testing", "Both"]
              },
              "evidence": { "$ref": "#/definitions/Evidence" }
            }
          }
        }
      }
    }
  },

  "definitions": {
    "Evidence": {
      "type": "array",
      "description": "Source evidence for extracted field",
      "items": {
        "type": "object",
        "properties": {
          "page": { "type": "integer", "minimum": 1 },
          "quote": { "type": "string" },
          "bbox": {
            "type": "object",
            "properties": {
              "x0": { "type": "number", "minimum": 0, "maximum": 1 },
              "y0": { "type": "number", "minimum": 0, "maximum": 1 },
              "x1": { "type": "number", "minimum": 0, "maximum": 1 },
              "y1": { "type": "number", "minimum": 0, "maximum": 1 }
            }
          },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
        }
      }
    }
  }
}
```

## Step 3: Extraction Prompt Builder

**File:** `src/lib/extraction/buildExtractionPrompt.ts`

```typescript
import schema from '@/schemas/iep_extraction.v1.schema.json';

interface PageWithContent {
  page_number: number;
  content: string;
}

export function buildExtractionPrompt(pages: PageWithContent[]): string {
  return `You are an expert at extracting structured data from IEP (Individualized Education Program) documents.

TASK: Extract information from this IEP document according to the schema provided.

IMPORTANT INSTRUCTIONS:
1. For EVERY field, include evidence showing where you found the information
2. Evidence should include: page number, exact quote, bounding box (normalized 0-1), confidence (0-1)
3. If a field is not found, omit it from the output (don't include null or empty values)
4. Use exact quotes from the document, not paraphrased text
5. For dates, use YYYY-MM-DD format
6. For student name, use full legal name as written in document

DOCUMENT PAGES:
${pages.map((p, i) => `--- Page ${p.page_number} ---\n${p.content}`).join('\n\n')}

EXTRACTION SCHEMA:
${JSON.stringify(schema, null, 2)}

RESPONSE FORMAT:
Return valid JSON matching the schema. Include evidence arrays for all fields.

Example field with evidence:
{
  "value": "Student will improve reading comprehension",
  "evidence": [
    {
      "page": 3,
      "quote": "Student will improve reading comprehension to 4th grade level",
      "bbox": { "x0": 0.1, "y0": 0.3, "x1": 0.9, "y1": 0.35 },
      "confidence": 0.95
    }
  ]
}

Begin extraction:`;
}
```

## Step 4: Inngest Extraction Function

**File:** `src/inngest/functions/extractIepStructuredData.ts`

```typescript
import { inngest } from '@/inngest/client';
import { buildExtractionPrompt } from '@/lib/extraction/buildExtractionPrompt';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const extractIepStructuredData = inngest.createFunction(
  {
    id: 'extract-iep-structured-data',
    retries: 2,
  },
  { event: 'document.processed' },
  async ({ event, step }) => {
    const { documentId } = event.data;

    // Get document pages
    const pages = await step.run('get-document-pages', async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('page_number, content')
        .eq('document_id', documentId)
        .order('page_number', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No pages found for document');
      return data;
    });

    // Build extraction prompt
    const prompt = buildExtractionPrompt(pages);

    // Call Claude for extraction
    const extracted = await step.run('call-claude-extraction', async () => {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 16000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const textContent = message.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      // Parse JSON from response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      return JSON.parse(jsonMatch[0]);
    });

    // Validate against schema (basic validation)
    await step.run('validate-extraction', async () => {
      if (!extracted.student || !extracted.goals || !Array.isArray(extracted.goals)) {
        throw new Error('Extraction missing required fields');
      }

      if (extracted.goals.length === 0) {
        throw new Error('No goals extracted from IEP');
      }
    });

    // Save to database
    const savedExtraction = await step.run('save-extraction', async () => {
      const { data, error } = await supabase
        .from('extracted_iep_data')
        .insert({
          document_id: documentId,
          data: extracted,
          schema_version: '1.0.0',
          model_used: 'claude-sonnet-4-5-20250929',
          extraction_prompt_version: '1.0',
          status: 'extracted',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    });

    // Trigger downstream events
    await step.sendEvent('trigger-validation', {
      name: 'extraction.completed',
      data: {
        documentId,
        extractionId: savedExtraction.id,
      },
    });

    return { extractionId: savedExtraction.id };
  }
);
```

## Step 5: Register Function with Inngest

**File:** `src/inngest/functions/index.ts` (or update existing)

```typescript
import { extractIepStructuredData } from './extractIepStructuredData';
// ... other imports

export const functions = [
  extractIepStructuredData,
  // ... other functions
];
```

**File:** `src/app/api/inngest/route.ts` (verify this exists)

```typescript
import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { functions } from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
```

## Step 6: Trigger Extraction on Document Upload

**Option A: Modify existing upload flow**

Find where you currently trigger `document.processed` event and ensure it includes `documentId`:

```typescript
// In your document upload handler
await inngest.send({
  name: 'document.processed',
  data: {
    documentId: uploadedDocument.id,
  },
});
```

**Option B: Test manually via Inngest Dev Server**

```bash
# Start Inngest dev server
npx inngest-cli@latest dev

# In another terminal, send test event
curl -X POST http://localhost:8288/e/inngest \
  -H "Content-Type: application/json" \
  -d '{
    "name": "document.processed",
    "data": {
      "documentId": "your-test-document-id"
    }
  }'
```

## Testing Checklist

**Week 1 Milestones:**
- [ ] Database migration runs successfully
- [ ] JSON schema file created and valid
- [ ] Extraction prompt builder returns formatted prompt
- [ ] Can manually test prompt in Claude.ai with sample IEP pages

**Week 2 Milestones:**
- [ ] Inngest function registered and visible in dev server
- [ ] Function processes test document end-to-end
- [ ] Extracted data saved to `extracted_iep_data` table
- [ ] `extraction.completed` event triggers (visible in Inngest logs)
- [ ] Can query extracted data: `select data from extracted_iep_data limit 1;`

## Success Criteria

By end of week 2:

- ✅ New IEP uploads create `extracted_iep_data` records
- ✅ JSON structure matches schema (student, goals, dates present)
- ✅ All fields have evidence arrays with page numbers and quotes
- ✅ Old findings table still works (no breaking changes to existing flow)
- ✅ Can view raw extracted JSON in database

**Quality Checks:**
- Test with 3-5 diverse IEP formats
- Manually verify: student name, 2-3 goals, IEP dates extracted correctly
- Check evidence: quotes should match source document
- Cost: Should be ~$0.45-0.60 per extraction (Claude API)

## Common Issues & Solutions

**Issue:** "No JSON found in Claude response"
- **Solution:** Claude sometimes adds markdown formatting. Update regex to: `/```json\n(\{[\s\S]*\})\n```/` or strip markdown before parsing.

**Issue:** Extraction missing required fields
- **Solution:** IEP format might be non-standard. Add more examples to prompt or adjust schema to make fields optional initially.

**Issue:** Evidence quotes don't match source
- **Solution:** OCR quality issue. Check `pages.content` matches actual PDF. May need to improve Document AI processor settings.

**Issue:** Processing timeout (>60s)
- **Solution:** Large IEPs. Consider chunking or using streaming API. Inngest default timeout is 5 minutes, should be fine for most.

## Next Steps

After Week 1-2 completion:
1. Proceed to `week-3-validators.md`
2. Keep existing findings table until UI is ready (week 4-5)
3. Monitor extraction quality daily (sample 5-10 IEPs per day)
4. Document any schema changes needed (will affect validators in week 3)

---

*Week 1-2 Implementation Guide*
*Last Updated: 2026-01-03*
