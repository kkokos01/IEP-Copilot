# IEP Copilot: Complete Development & Go-to-Market Plan
## Foundational Architecture → B2B Launch → B2C Scale

**Document Purpose:** Detailed, actionable development roadmap from current state to dual-product market launch (B2B advocates + B2C parents) built on shared extraction infrastructure.

**Timeline:** 24 weeks to full market launch
**Approach:** Foundation-first, then B2B, then B2C
**Philosophy:** Build once, serve both markets

---

## EXECUTIVE SUMMARY

### Current State
- ✅ Basic IEP upload and OCR working
- ✅ Generic findings table (needs replacement)
- ⚠️ One-time use pattern (upload → review → churn)
- ❌ No engagement features
- ❌ No professional tools

### Target State (24 weeks)
- ✅ Structured IEP extraction with field-level evidence
- ✅ Passive intelligence (email-to-analyze, Google Classroom)
- ✅ Advocate portal with case management
- ✅ Parent dashboard with weekly insights
- ✅ 200 paying advocates ($300K ARR)
- ✅ 500 active parent users (advocate-referred)
- ✅ Product-market fit validated in both segments

### Why This Sequence Works

**Weeks 1-8: Foundation (Benefits Both Markets)**
- Structured extraction → Enables rich UI and analytics
- Passive intelligence → Core differentiation for both advocates and parents
- Shared infrastructure → No rework when adding second market

**Weeks 9-16: B2B Advocate Launch**
- Clearer product-market fit (they pay for time savings)
- Easier customer acquisition (professional networks)
- Validates parent features (advocates won't recommend bad UX)
- Revenue funds B2C marketing

**Weeks 17-24: B2C Parent Scale**
- Advocates become distribution channel
- Network effects from advocate directory
- Freemium model with proven value prop
- B2B revenue reduces CAC pressure

---

## PHASE 1: FOUNDATION ARCHITECTURE
**Duration:** 8 weeks
**Goal:** Replace generic findings with structured extraction, enable passive intelligence
**Team:** 1 developer full-time

### Week 1-2: Structured Extraction Infrastructure

**Objective:** Replace generic findings table with structured JSONB extraction

#### Technical Tasks

**Database Migration:**
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
```

**JSON Schema Definition:**

Create `src/schemas/iep_extraction.v1.schema.json`:

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

**Extraction Function:**

Create `src/lib/extraction/buildExtractionPrompt.ts`:

```typescript
import schema from '@/schemas/iep_extraction.v1.schema.json';

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
${pages.map((p, i) => `--- Page ${i + 1} ---\n${p.content}`).join('\n\n')}

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

**Inngest Function:**

Create `src/inngest/functions/extractIepStructuredData.ts`:

```typescript
import { inngest } from '@/inngest/client';
import { buildExtractionPrompt } from '@/lib/extraction/buildExtractionPrompt';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    // Trigger validation in next step
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

**Success Criteria:**
- ✅ New IEP uploads create `extracted_iep_data` records
- ✅ JSON structure matches schema
- ✅ All fields have evidence arrays
- ✅ Old findings table still works (parallel operation)

---

### Week 3: Validators (Separate from Extraction)

**Objective:** Deterministic validation rules that can run independently

#### Technical Tasks

**Database Migration:**

```sql
-- Validation issues table
create table validation_issues (
  id uuid primary key default uuid_generate_v4(),
  extracted_iep_data_id uuid references extracted_iep_data(id) on delete cascade,

  -- Issue details
  severity text check (severity in ('error', 'warning', 'info')) not null,
  category text not null, -- 'missing_field', 'invalid_format', 'compliance', 'quality'
  title text not null,
  message text not null,

  -- Field location
  field_path text, -- JSON path like '/goals/0/baseline/value'

  -- Status
  status text check (status in ('open', 'acknowledged', 'fixed', 'dismissed')) default 'open',
  dismissed_by uuid references auth.users(id),
  dismissed_at timestamptz,
  dismissal_reason text,

  -- Metadata
  validator_name text not null,
  validator_version text not null default '1.0',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_validation_issues_extraction on validation_issues(extracted_iep_data_id);
create index idx_validation_issues_status on validation_issues(status);
create index idx_validation_issues_severity on validation_issues(severity);
```

**Validator Functions:**

Create `src/lib/validators/iepValidators.ts`:

```typescript
export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'missing_field' | 'invalid_format' | 'compliance' | 'quality';
  title: string;
  message: string;
  fieldPath?: string;
  validatorName: string;
  validatorVersion: string;
}

export interface IEPData {
  student?: any;
  disability?: any;
  dates?: any;
  plaafp?: any;
  goals?: any[];
  services?: any[];
  accommodations?: any[];
}

// Validator: Required fields present
export function validateRequiredFields(data: IEPData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.student?.name?.value) {
    issues.push({
      severity: 'error',
      category: 'missing_field',
      title: 'Missing Student Name',
      message: 'Student name is required but was not found in the IEP',
      fieldPath: '/student/name/value',
      validatorName: 'validateRequiredFields',
      validatorVersion: '1.0',
    });
  }

  if (!data.student?.dateOfBirth?.value) {
    issues.push({
      severity: 'error',
      category: 'missing_field',
      title: 'Missing Date of Birth',
      message: 'Student date of birth is required but was not found',
      fieldPath: '/student/dateOfBirth/value',
      validatorName: 'validateRequiredFields',
      validatorVersion: '1.0',
    });
  }

  if (!data.goals || data.goals.length === 0) {
    issues.push({
      severity: 'error',
      category: 'missing_field',
      title: 'No Goals Found',
      message: 'IEP must contain at least one annual goal',
      fieldPath: '/goals',
      validatorName: 'validateRequiredFields',
      validatorVersion: '1.0',
    });
  }

  return issues;
}

// Validator: Goal quality (measurability)
export function validateGoalMeasurability(data: IEPData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.goals) return issues;

  data.goals.forEach((goal, index) => {
    const goalText = goal.goalText?.value || '';

    // Check for measurable criteria
    const hasCriteria = /\d+%|\d+\/\d+|\d+ out of \d+|with \d+ accuracy/i.test(goalText);

    if (!hasCriteria) {
      issues.push({
        severity: 'warning',
        category: 'quality',
        title: `Goal ${index + 1}: Not Measurable`,
        message: 'Goal does not include specific measurable criteria (e.g., "80% accuracy", "4 out of 5 trials")',
        fieldPath: `/goals/${index}/goalText/value`,
        validatorName: 'validateGoalMeasurability',
        validatorVersion: '1.0',
      });
    }

    // Check for baseline
    if (!goal.baseline?.value) {
      issues.push({
        severity: 'warning',
        category: 'missing_field',
        title: `Goal ${index + 1}: Missing Baseline`,
        message: 'Goal does not have baseline data showing current level of performance',
        fieldPath: `/goals/${index}/baseline/value`,
        validatorName: 'validateGoalMeasurability',
        validatorVersion: '1.0',
      });
    }

    // Check for measurement method
    if (!goal.measurementMethod?.value) {
      issues.push({
        severity: 'info',
        category: 'missing_field',
        title: `Goal ${index + 1}: Measurement Method Not Specified`,
        message: 'Consider specifying how progress toward this goal will be measured',
        fieldPath: `/goals/${index}/measurementMethod/value`,
        validatorName: 'validateGoalMeasurability',
        validatorVersion: '1.0',
      });
    }
  });

  return issues;
}

// Validator: Date logic
export function validateDateLogic(data: IEPData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.dates) return issues;

  const startDate = data.dates.iepStartDate?.value ? new Date(data.dates.iepStartDate.value) : null;
  const endDate = data.dates.iepEndDate?.value ? new Date(data.dates.iepEndDate.value) : null;
  const reviewDate = data.dates.annualReviewDate?.value ? new Date(data.dates.annualReviewDate.value) : null;

  if (startDate && endDate && startDate >= endDate) {
    issues.push({
      severity: 'error',
      category: 'invalid_format',
      title: 'Invalid Date Range',
      message: 'IEP end date must be after start date',
      fieldPath: '/dates',
      validatorName: 'validateDateLogic',
      validatorVersion: '1.0',
    });
  }

  if (startDate && endDate) {
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff > 366) {
      issues.push({
        severity: 'warning',
        category: 'compliance',
        title: 'IEP Duration Exceeds One Year',
        message: 'IEPs must be reviewed at least annually. This IEP covers more than 365 days.',
        fieldPath: '/dates',
        validatorName: 'validateDateLogic',
        validatorVersion: '1.0',
      });
    }
  }

  if (reviewDate && new Date() > reviewDate) {
    const daysOverdue = Math.floor((new Date().getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));

    issues.push({
      severity: 'error',
      category: 'compliance',
      title: 'Annual Review Overdue',
      message: `Annual review was due ${daysOverdue} days ago. Schedule review meeting immediately.`,
      fieldPath: '/dates/annualReviewDate/value',
      validatorName: 'validateDateLogic',
      validatorVersion: '1.0',
    });
  }

  return issues;
}

// Validator: Service hours calculation
export function validateServiceHours(data: IEPData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.services || data.services.length === 0) {
    issues.push({
      severity: 'warning',
      category: 'missing_field',
      title: 'No Services Listed',
      message: 'No special education or related services found. All IEPs should specify services.',
      fieldPath: '/services',
      validatorName: 'validateServiceHours',
      validatorVersion: '1.0',
    });
    return issues;
  }

  // Check for services with missing frequency or duration
  data.services.forEach((service, index) => {
    if (!service.frequency?.value) {
      issues.push({
        severity: 'warning',
        category: 'missing_field',
        title: `Service ${index + 1}: Missing Frequency`,
        message: 'Service frequency not specified (e.g., "2 times per week")',
        fieldPath: `/services/${index}/frequency/value`,
        validatorName: 'validateServiceHours',
        validatorVersion: '1.0',
      });
    }

    if (!service.duration?.value) {
      issues.push({
        severity: 'warning',
        category: 'missing_field',
        title: `Service ${index + 1}: Missing Duration`,
        message: 'Service duration not specified (e.g., "30 minutes")',
        fieldPath: `/services/${index}/duration/value`,
        validatorName: 'validateServiceHours',
        validatorVersion: '1.0',
      });
    }
  });

  return issues;
}

// Main validator orchestrator
export function validateIEP(data: IEPData): ValidationIssue[] {
  return [
    ...validateRequiredFields(data),
    ...validateGoalMeasurability(data),
    ...validateDateLogic(data),
    ...validateServiceHours(data),
  ];
}
```

**Inngest Function:**

Create `src/inngest/functions/validateIepExtraction.ts`:

```typescript
import { inngest } from '@/inngest/client';
import { validateIEP } from '@/lib/validators/iepValidators';
import { supabase } from '@/lib/supabase';

export const validateIepExtraction = inngest.createFunction(
  { id: 'validate-iep-extraction' },
  { event: 'extraction.completed' },
  async ({ event, step }) => {
    const { extractionId } = event.data;

    // Get extraction data
    const extraction = await step.run('get-extraction', async () => {
      const { data, error } = await supabase
        .from('extracted_iep_data')
        .select('id, data')
        .eq('id', extractionId)
        .single();

      if (error) throw error;
      return data;
    });

    // Run validators
    const issues = await step.run('run-validators', async () => {
      return validateIEP(extraction.data);
    });

    // Save issues to database
    if (issues.length > 0) {
      await step.run('save-validation-issues', async () => {
        const { error } = await supabase
          .from('validation_issues')
          .insert(
            issues.map(issue => ({
              extracted_iep_data_id: extractionId,
              ...issue,
            }))
          );

        if (error) throw error;
      });
    }

    return { issueCount: issues.length };
  }
);
```

**Success Criteria:**
- ✅ Validators run after extraction completes
- ✅ Issues saved to validation_issues table
- ✅ Can re-run validators without re-extracting (add manual trigger)
- ✅ Different severity levels (error, warning, info)

---

### Week 4-5: Evidence-Based UI

**Objective:** Build UI showing extracted data with field-level source citations

#### Technical Tasks

**React Components:**

Create `src/components/iep/EvidenceLink.tsx`:

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileText } from 'lucide-react';

interface Evidence {
  page: number;
  quote: string;
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  confidence?: number;
}

interface EvidenceLinkProps {
  evidence?: Evidence[];
  documentId: string;
}

export function EvidenceLink({ evidence, documentId }: EvidenceLinkProps) {
  if (!evidence || evidence.length === 0) {
    return null;
  }

  const primaryEvidence = evidence[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <FileText className="h-3 w-3 mr-1" />
          Page {primaryEvidence.page}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="space-y-2">
          <div className="text-sm font-medium">Source Evidence</div>
          <div className="text-sm text-muted-foreground">
            Page {primaryEvidence.page}
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            "{primaryEvidence.quote}"
          </div>
          {primaryEvidence.confidence && (
            <div className="text-xs text-muted-foreground">
              Confidence: {(primaryEvidence.confidence * 100).toFixed(0)}%
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => {
              // Navigate to document viewer at specific page
              window.location.href = `/documents/${documentId}?page=${primaryEvidence.page}`;
            }}
          >
            View in Document
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

Create `src/components/iep/GoalsReviewTable.tsx`:

```typescript
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EvidenceLink } from './EvidenceLink';
import { Pencil, Check, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Goal {
  goalText?: {
    value: string;
    evidence?: any[];
  };
  domain?: {
    value: string;
    evidence?: any[];
  };
  baseline?: {
    value: string;
    evidence?: any[];
  };
  target?: {
    value: string;
    evidence?: any[];
  };
  measurementMethod?: {
    value: string;
    evidence?: any[];
  };
}

interface GoalsReviewTableProps {
  goals: Goal[];
  documentId: string;
  onUpdate?: (index: number, field: string, newValue: string) => void;
}

export function GoalsReviewTable({ goals, documentId, onUpdate }: GoalsReviewTableProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (row: number, field: string, currentValue: string) => {
    setEditingCell({ row, field });
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (editingCell && onUpdate) {
      onUpdate(editingCell.row, editingCell.field, editValue);
    }
    setEditingCell(null);
  };

  const cancelEdit = () => {
    setEditingCell(null);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>Goal</TableHead>
            <TableHead>Baseline</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Measurement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {goals.map((goal, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{index + 1}</TableCell>

              {/* Domain */}
              <TableCell>
                <div className="space-y-1">
                  <Badge variant="outline">
                    {goal.domain?.value || 'Not specified'}
                  </Badge>
                  <EvidenceLink evidence={goal.domain?.evidence} documentId={documentId} />
                </div>
              </TableCell>

              {/* Goal Text */}
              <TableCell className="max-w-md">
                {editingCell?.row === index && editingCell?.field === 'goalText' ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit}>
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-sm">{goal.goalText?.value || 'Not found'}</div>
                    <div className="flex items-center gap-2">
                      <EvidenceLink evidence={goal.goalText?.evidence} documentId={documentId} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => startEdit(index, 'goalText', goal.goalText?.value || '')}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                )}
              </TableCell>

              {/* Baseline */}
              <TableCell>
                <div className="space-y-1">
                  <div className="text-sm">{goal.baseline?.value || 'Missing'}</div>
                  <EvidenceLink evidence={goal.baseline?.evidence} documentId={documentId} />
                </div>
              </TableCell>

              {/* Target */}
              <TableCell>
                <div className="space-y-1">
                  <div className="text-sm">{goal.target?.value || 'Missing'}</div>
                  <EvidenceLink evidence={goal.target?.evidence} documentId={documentId} />
                </div>
              </TableCell>

              {/* Measurement Method */}
              <TableCell>
                <div className="space-y-1">
                  <div className="text-sm">{goal.measurementMethod?.value || 'Not specified'}</div>
                  <EvidenceLink evidence={goal.measurementMethod?.evidence} documentId={documentId} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

Create `src/components/iep/ValidationIssuesPanel.tsx`:

```typescript
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, Info, X, Check } from 'lucide-react';

interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  fieldPath?: string;
  status: 'open' | 'acknowledged' | 'fixed' | 'dismissed';
}

interface ValidationIssuesPanelProps {
  issues: ValidationIssue[];
  onDismiss?: (issueId: string) => void;
  onAcknowledge?: (issueId: string) => void;
}

const severityIcons = {
  error: <AlertCircle className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

const severityColors = {
  error: 'destructive',
  warning: 'warning',
  info: 'secondary',
} as const;

export function ValidationIssuesPanel({ issues, onDismiss, onAcknowledge }: ValidationIssuesPanelProps) {
  const openIssues = issues.filter(i => i.status === 'open');

  if (openIssues.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-green-600">
          <Check className="h-5 w-5" />
          <div className="font-medium">No issues found</div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          This IEP passed all validation checks.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {openIssues.map((issue) => (
        <Card key={issue.id} className="p-4">
          <div className="flex items-start gap-3">
            <Badge variant={severityColors[issue.severity]} className="mt-0.5">
              {severityIcons[issue.severity]}
            </Badge>

            <div className="flex-1 space-y-1">
              <div className="font-medium">{issue.title}</div>
              <div className="text-sm text-muted-foreground">{issue.message}</div>
              {issue.fieldPath && (
                <div className="text-xs text-muted-foreground font-mono">
                  {issue.fieldPath}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {onAcknowledge && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAcknowledge(issue.id)}
                >
                  Acknowledge
                </Button>
              )}
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss(issue.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

**Page Integration:**

Update `src/app/documents/[id]/page.tsx`:

```typescript
import { GoalsReviewTable } from '@/components/iep/GoalsReviewTable';
import { ValidationIssuesPanel } from '@/components/iep/ValidationIssuesPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function DocumentPage({ params }: { params: { id: string } }) {
  // Fetch extraction and validation issues
  const extraction = await getExtraction(params.id);
  const issues = await getValidationIssues(extraction.id);

  return (
    <div className="container py-8">
      <Tabs defaultValue="goals">
        <TabsList>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="accommodations">Accommodations</TabsTrigger>
          <TabsTrigger value="validation">
            Validation
            {issues.filter(i => i.status === 'open').length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {issues.filter(i => i.status === 'open').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <GoalsReviewTable
            goals={extraction.data.goals || []}
            documentId={params.id}
            onUpdate={handleGoalUpdate}
          />
        </TabsContent>

        <TabsContent value="validation">
          <ValidationIssuesPanel
            issues={issues}
            onDismiss={handleDismissIssue}
            onAcknowledge={handleAcknowledgeIssue}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Success Criteria:**
- ✅ Users see extracted data in clean tables
- ✅ Every field shows "Page X" link to source
- ✅ Clicking evidence link shows exact quote
- ✅ Users can edit fields inline
- ✅ Validation issues displayed with severity indicators

---

### Week 6: Analytics Dashboard (IEP Summary)

**Objective:** Auto-generate insights from structured IEP data

#### Database Migration

```sql
-- Pre-computed IEP analytics
create table iep_analytics (
  id uuid primary key default uuid_generate_v4(),
  extracted_iep_data_id uuid references extracted_iep_data(id) on delete cascade unique,
  child_id uuid references children(id),

  -- Service summary
  total_service_minutes_per_week int,
  service_breakdown jsonb, -- { "Special Ed": 90, "Speech": 60, "OT": 30 }

  -- Goal summary
  total_goals int,
  goals_by_domain jsonb, -- { "Reading": 2, "Math": 1, "Writing": 1 }
  goals_with_baseline int,
  goals_with_measurement int,

  -- Date flags
  annual_review_date date,
  triennial_eval_date date,
  days_until_annual_review int,

  -- Compliance flags
  is_review_overdue boolean default false,
  has_missing_baselines boolean default false,
  has_unmeasurable_goals boolean default false,

  computed_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_iep_analytics_child on iep_analytics(child_id);
create index idx_iep_analytics_extraction on iep_analytics(extracted_iep_data_id);
```

#### Analytics Computation

Create `src/lib/analytics/computeIepAnalytics.ts`:

```typescript
interface IEPAnalytics {
  total_service_minutes_per_week: number;
  service_breakdown: Record<string, number>;
  total_goals: number;
  goals_by_domain: Record<string, number>;
  goals_with_baseline: number;
  goals_with_measurement: number;
  annual_review_date: string | null;
  triennial_eval_date: string | null;
  days_until_annual_review: number | null;
  is_review_overdue: boolean;
  has_missing_baselines: boolean;
  has_unmeasurable_goals: boolean;
}

export function computeIepAnalytics(data: any): IEPAnalytics {
  // Service minutes calculation
  let totalMinutes = 0;
  const serviceBreakdown: Record<string, number> = {};

  if (data.services) {
    data.services.forEach((service: any) => {
      const freq = service.frequency?.value || '';
      const dur = service.duration?.value || '';
      const serviceType = service.serviceType?.value || 'Unknown';

      // Parse frequency (e.g., "2 times per week" -> 2)
      const freqMatch = freq.match(/(\d+)/);
      const freqNum = freqMatch ? parseInt(freqMatch[1]) : 0;

      // Parse duration (e.g., "30 minutes" -> 30)
      const durMatch = dur.match(/(\d+)/);
      const durNum = durMatch ? parseInt(durMatch[1]) : 0;

      const minutesPerWeek = freqNum * durNum;
      totalMinutes += minutesPerWeek;

      serviceBreakdown[serviceType] = (serviceBreakdown[serviceType] || 0) + minutesPerWeek;
    });
  }

  // Goal analysis
  const goals = data.goals || [];
  const goalsByDomain: Record<string, number> = {};
  let goalsWithBaseline = 0;
  let goalsWithMeasurement = 0;
  let hasUnmeasurableGoals = false;

  goals.forEach((goal: any) => {
    const domain = goal.domain?.value || 'Other';
    goalsByDomain[domain] = (goalsByDomain[domain] || 0) + 1;

    if (goal.baseline?.value) {
      goalsWithBaseline++;
    }

    if (goal.measurementMethod?.value) {
      goalsWithMeasurement++;
    }

    // Check if goal text has measurable criteria
    const goalText = goal.goalText?.value || '';
    const hasCriteria = /\d+%|\d+\/\d+|\d+ out of \d+|with \d+ accuracy/i.test(goalText);
    if (!hasCriteria) {
      hasUnmeasurableGoals = true;
    }
  });

  // Date calculations
  const annualReviewDate = data.dates?.annualReviewDate?.value || null;
  const triennialEvalDate = data.dates?.triennialEvaluationDate?.value || null;

  let daysUntilReview = null;
  let isOverdue = false;

  if (annualReviewDate) {
    const reviewDate = new Date(annualReviewDate);
    const today = new Date();
    daysUntilReview = Math.floor((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    isOverdue = daysUntilReview < 0;
  }

  return {
    total_service_minutes_per_week: totalMinutes,
    service_breakdown: serviceBreakdown,
    total_goals: goals.length,
    goals_by_domain: goalsByDomain,
    goals_with_baseline: goalsWithBaseline,
    goals_with_measurement: goalsWithMeasurement,
    annual_review_date: annualReviewDate,
    triennial_eval_date: triennialEvalDate,
    days_until_annual_review: daysUntilReview,
    is_review_overdue: isOverdue,
    has_missing_baselines: goalsWithBaseline < goals.length,
    has_unmeasurable_goals: hasUnmeasurableGoals,
  };
}
```

#### Inngest Function

Create `src/inngest/functions/computeIepAnalytics.ts`:

```typescript
import { inngest } from '@/inngest/client';
import { computeIepAnalytics } from '@/lib/analytics/computeIepAnalytics';
import { supabase } from '@/lib/supabase';

export const computeAnalytics = inngest.createFunction(
  { id: 'compute-iep-analytics' },
  { event: 'extraction.completed' },
  async ({ event, step }) => {
    const { extractionId, documentId } = event.data;

    // Get extraction data
    const extraction = await step.run('get-extraction', async () => {
      const { data, error } = await supabase
        .from('extracted_iep_data')
        .select('id, data, document_id')
        .eq('id', extractionId)
        .single();

      if (error) throw error;
      return data;
    });

    // Get child_id from document
    const childId = await step.run('get-child-id', async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('child_id')
        .eq('id', extraction.document_id)
        .single();

      if (error) throw error;
      return data.child_id;
    });

    // Compute analytics
    const analytics = await step.run('compute-analytics', async () => {
      return computeIepAnalytics(extraction.data);
    });

    // Save to database
    await step.run('save-analytics', async () => {
      const { error } = await supabase
        .from('iep_analytics')
        .upsert({
          extracted_iep_data_id: extractionId,
          child_id: childId,
          ...analytics,
        }, {
          onConflict: 'extracted_iep_data_id'
        });

      if (error) throw error;
    });

    return analytics;
  }
);
```

#### Dashboard UI

Create `src/components/iep/IEPDashboard.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Target, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface IEPDashboardProps {
  analytics: any;
  extraction: any;
}

export function IEPDashboard({ analytics, extraction }: IEPDashboardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Service Hours Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Service Hours</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.floor(analytics.total_service_minutes_per_week / 60)}h {analytics.total_service_minutes_per_week % 60}m
          </div>
          <p className="text-xs text-muted-foreground">per week</p>
          <div className="mt-4 space-y-2">
            {Object.entries(analytics.service_breakdown).map(([service, minutes]) => (
              <div key={service} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{service}</span>
                <span className="font-medium">{minutes} min</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Goals Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">IEP Goals</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.total_goals}</div>
          <p className="text-xs text-muted-foreground">annual goals</p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">With baseline data</span>
              <span className="font-medium">
                {analytics.goals_with_baseline}/{analytics.total_goals}
              </span>
            </div>
            <Progress
              value={(analytics.goals_with_baseline / analytics.total_goals) * 100}
              className="h-2"
            />
          </div>
          <div className="mt-3 space-y-1">
            {Object.entries(analytics.goals_by_domain).map(([domain, count]) => (
              <Badge key={domain} variant="outline" className="mr-1">
                {domain}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Annual Review */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Annual Review</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {analytics.is_review_overdue ? (
            <>
              <div className="text-2xl font-bold text-red-600">Overdue</div>
              <p className="text-xs text-muted-foreground">
                {Math.abs(analytics.days_until_annual_review)} days past due
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">
                {analytics.days_until_annual_review} days
              </div>
              <p className="text-xs text-muted-foreground">until review</p>
            </>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            Due: {new Date(analytics.annual_review_date).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compliance</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.has_missing_baselines && (
              <Badge variant="warning" className="w-full justify-start">
                Missing baseline data
              </Badge>
            )}
            {analytics.has_unmeasurable_goals && (
              <Badge variant="warning" className="w-full justify-start">
                Goals not measurable
              </Badge>
            )}
            {!analytics.has_missing_baselines && !analytics.has_unmeasurable_goals && (
              <Badge variant="success" className="w-full justify-start">
                No issues detected
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Success Criteria:**
- ✅ Analytics auto-compute after extraction
- ✅ Dashboard shows service hours, goal counts, review dates
- ✅ Visual indicators for compliance issues
- ✅ No manual data entry required

---

### Week 7-8: Passive Intelligence Core (Email-to-Analyze)

**Objective:** Enable parents to email documents/images → Get automatic AI analysis without manual upload

#### Strategic Approach

**Core Capability:**
Parents forward emails (homework, progress reports, teacher notes) to a unique address (e.g., `analyze@iepcopilot.com`) and receive AI-generated insights automatically.

**Key Architectural Decisions:**

1. **Email Infrastructure:**
   - Use SendGrid Inbound Parse or AWS SES for receiving emails
   - Each user gets unique forwarding address: `{user_id}@analyze.iepcopilot.com`
   - Extract attachments (PDF, images) and body text
   - Store in `passive_submissions` table with source metadata

2. **Document Classification:**
   - Use Claude to classify document type: homework, progress report, teacher communication, other
   - Different analysis prompts based on document type
   - Link to relevant IEP goals when possible (using existing extraction data)

3. **Analysis Engine:**
   - Reuse OCR pipeline from weeks 1-2 for image/PDF processing
   - Context-aware prompts: include relevant IEP goals, recent submissions, accommodations
   - Generate parent-friendly insights: what went well, areas of concern, alignment with IEP

4. **Notification Strategy:**
   - Email response within 5 minutes of submission
   - Optional: Weekly digest of all submissions
   - Dashboard view of submission history

**Database Schema (High-level):**
```sql
-- Passive submissions from email
create table passive_submissions (
  id uuid primary key,
  user_id uuid references auth.users(id),
  child_id uuid references children(id),

  -- Source metadata
  from_email text,
  subject text,
  received_at timestamptz,

  -- Content
  document_type text, -- 'homework', 'progress_report', 'teacher_note'
  raw_content text,
  extracted_content jsonb,

  -- Analysis
  analysis_completed boolean default false,
  analysis jsonb, -- AI-generated insights
  linked_goals uuid[], -- IEP goals referenced

  created_at timestamptz default now()
);
```

**Success Criteria:**
- ✅ Email → analysis pipeline works end-to-end
- ✅ 90%+ emails processed within 5 minutes
- ✅ Analysis references relevant IEP goals
- ✅ Parents can view submission history in dashboard

**Dependencies for Later Phases:**
- This capability is critical for both B2B (advocates analyze student work) and B2C (parents get ongoing insights)
- Quality of analysis depends on extraction quality from weeks 1-6
- If extraction schema changes, may need to adjust how goals are linked

**What NOT to detail now:**
- Exact prompt templates (will iterate based on user feedback)
- Specific UI components (depends on learnings from weeks 4-5)
- Advanced features like OCR improvement (depends on accuracy from production data)

---

## PHASE 2: B2B ADVOCATE LAUNCH
**Duration:** 8 weeks (Weeks 9-16)
**Goal:** 50 advocate beta users → 200 paying advocates ($300K ARR)

### Strategic Overview

**Why B2B First:**
- Clearer value prop: time savings = billable hours
- Easier customer acquisition: professional networks, LinkedIn, conferences
- Higher willingness to pay: business expense, not personal budget
- Validates parent features: advocates won't recommend bad UX to clients
- Creates distribution: advocates refer parent clients

**Core B2B Value Proposition:**
"Cut IEP review time from 2 hours to 20 minutes. Spend more time advocating, less time reading."

### Week 9-10: Case Management Foundation

**Key Capabilities:**
- Multi-client workspace (advocates manage 5-50 families)
- Client invitation system with permission controls
- Advocate-specific analytics: time saved per case, compliance trends across portfolio
- Private notes (visible only to advocate, not parent)

**Architectural Decisions:**

1. **Multi-tenancy Model:**
   - `advocate_clients` junction table linking advocates to families
   - Row-level security (RLS) ensuring advocates only see their clients
   - Permission levels: view-only, edit, admin

2. **Time Tracking:**
   - Automatic: track time from upload to review complete
   - Compare to baseline (2 hours manual review)
   - Dashboard showing cumulative time saved

3. **Billing/Subscription:**
   - Stripe integration for recurring billing
   - Tiered pricing: Starter ($99/mo, 10 clients), Pro ($299/mo, 50 clients), Enterprise (custom)
   - 14-day free trial, no credit card required

**Success Criteria:**
- ✅ Advocates can manage multiple client families
- ✅ Time-saved metrics calculate accurately
- ✅ Stripe billing works for all tiers
- ✅ RLS prevents data leakage between advocates

**Defer to Implementation:**
- Exact UI for client dashboard (depends on advocate beta feedback)
- Advanced features like client groups/tags (depends on usage patterns)
- Integrations with practice management software (depends on market demand)

### Week 11-12: Advocate-Specific Features

**Key Capabilities:**
- **Comparison Tool:** Compare IEP across years or against district averages
- **Report Generator:** Export professional PDF reports for parents/lawyers
- **Template Library:** Save common recommendations, boilerplate text
- **Collaboration:** Share case with co-advocates (permissions-based)

**Architectural Decisions:**

1. **Comparison Engine:**
   - Diff algorithm for structured IEP data (goals, services, accommodations)
   - Visual diff UI showing what changed year-over-year
   - Requires consistent extraction schema (depends on weeks 1-6 stability)

2. **PDF Export:**
   - Use React-PDF or Puppeteer for server-side rendering
   - Professional branding (advocate's logo, contact info)
   - Include evidence citations, compliance issues, recommendations

3. **Template System:**
   - Simple JSONB storage of reusable text snippets
   - Variables for child name, goal, etc.
   - Searchable template library

**Success Criteria:**
- ✅ Comparison tool shows meaningful year-over-year changes
- ✅ Exported PDFs look professional (beta advocate feedback)
- ✅ Templates save advocates 30+ min per case

**Defer to Implementation:**
- Advanced comparison (e.g., against state/district benchmarks) - needs data partnerships
- White-label branding options - depends on enterprise demand
- Template marketplace (advocates share templates) - depends on community growth

### Week 13-14: Beta Launch & Feedback Loop

**Objective:** Get 50 beta advocates using product, gather feedback

**Go-to-Market Strategy:**

1. **Outreach Channels:**
   - LinkedIn: Target "IEP advocate", "special education consultant"
   - Facebook groups: Special education professional communities
   - Conferences: Council of Parent Attorneys and Advocates (COPAA)
   - Warm intros: Ask existing network for referrals

2. **Beta Offer:**
   - Free for 90 days
   - 1:1 onboarding call
   - Direct Slack/email access to founder
   - Early adopter pricing: 50% off first year

3. **Feedback Collection:**
   - Weekly check-in calls with 10 most active advocates
   - In-app feedback widget
   - Track feature usage: what's used most, what's ignored
   - NPS survey at 30 days

**Success Criteria:**
- ✅ 50 advocates signed up
- ✅ 30+ actively using (uploaded ≥3 IEPs)
- ✅ 80%+ say "faster than manual review"
- ✅ Identify top 3 feature requests

**Key Learnings to Extract:**
- Do time-saved metrics resonate? (affects marketing messaging)
- Which features are must-haves vs. nice-to-haves? (affects roadmap)
- What's blocking higher usage? (affects retention strategy)
- Would they pay? How much? (validates pricing)

### Week 15-16: Iterate & Paid Conversion

**Objective:** Fix critical issues, convert beta users to paid

**Iteration Focus:**
- Fix top 3 usability issues from beta feedback
- Add 1-2 most-requested features (if quick wins)
- Polish onboarding flow (reduce time to first value)
- Create help docs, video tutorials

**Conversion Strategy:**
- Email sequence: 90-day beta → 30-day paid trial → full price
- Offer: 50% off first year for beta participants
- Positioning: "You've saved X hours already, imagine at scale..."
- 1:1 conversion calls with power users

**Success Criteria:**
- ✅ 200 total advocates signed up (50 beta + 150 new)
- ✅ 50+ paying subscribers (25% conversion)
- ✅ $15K MRR ($180K ARR)
- ✅ NPS ≥40
- ✅ Churn <10% monthly

**Metrics to Track:**
- Time to first IEP uploaded (activation)
- Time to 10 IEPs uploaded (power user threshold)
- Feature usage distribution (what drives retention)
- Referral rate (advocates referring other advocates)

**What Changes in Phase 3 (B2C):**
- If advocates don't value multi-client management → affects parent family plans
- If comparison tool is a killer feature → prioritize for parents (comparing to peers)
- If PDF export is critical → parents may want similar reports
- If pricing is too high → adjust B2C pricing accordingly

---

## PHASE 3: B2C PARENT SCALE
**Duration:** 8 weeks (Weeks 17-24)
**Goal:** 500 active parent users (advocate-referred + organic)

### Strategic Overview

**Why B2C After B2B:**
- Advocates become distribution channel (each refers 2-5 parent clients)
- Product validated by professionals (builds trust with parents)
- B2B revenue funds B2C customer acquisition
- Shared infrastructure reduces development cost

**Core B2C Value Proposition:**
"Understand your child's IEP. Track progress weekly. Free forever."

**Freemium Model:**
- Free tier: Basic IEP analysis, limited passive submissions (5/month)
- Pro tier ($19/mo): Unlimited passive submissions, historical trends, priority support
- Family tier ($29/mo): Multiple children, advocate directory access

### Week 17-18: Parent Dashboard & Onboarding

**Key Capabilities:**
- Simplified onboarding: Upload IEP → See insights in 2 minutes
- Parent-friendly language (no jargon, explain terms)
- Weekly email digest: "Here's what happened with [Child]'s IEP this week"
- Progress tracking: Manual check-ins on goal progress

**Architectural Decisions:**

1. **Simplified Information Architecture:**
   - Remove advocate-specific features (case management, billing tools)
   - Focus on single-child view (most parents have 1 child with IEP)
   - Contextual help tooltips explaining special ed terms

2. **Engagement Loops:**
   - Weekly email: "How is [Child] doing on [Goal]?"
   - In-app prompts: "It's been 2 weeks, update progress on reading goal?"
   - Gamification: "3 weeks of updates! You're staying engaged!"

3. **Progressive Disclosure:**
   - First visit: Show only goals and next review date
   - Week 2: Introduce passive intelligence (email-to-analyze)
   - Week 4: Show compliance issues, if any
   - Week 6: Offer pro upgrade for historical trends

**Success Criteria:**
- ✅ 80%+ parents complete onboarding (upload IEP)
- ✅ 50%+ return in week 2 (engagement signal)
- ✅ 30%+ use passive submission feature
- ✅ 5-10% convert to Pro within 30 days

**Defer to Implementation:**
- Exact email copy, send times (A/B test in production)
- Specific UI layouts (depends on parent user testing)
- Advanced features like goal progress charts (depends on data availability)

### Week 19-20: Advocate Directory & Referral Network

**Key Capabilities:**
- Public advocate directory (opt-in for advocates)
- Parents can search by location, specialty, price range
- Built-in messaging for parent → advocate inquiries
- Advocates get leads, parents get trusted professionals

**Architectural Decisions:**

1. **Directory Schema:**
   - Advocates opt in, set profile (bio, specialties, pricing, availability)
   - Search by zip code radius, specialty tags, review ratings
   - Connection tracking: parent inquiry → advocate response → hired

2. **Monetization:**
   - Free for advocates (builds B2B stickiness)
   - Small fee (10-15%) on connections that convert to paid engagements
   - Or: advocates pay for featured listings ($50/mo)

3. **Trust & Safety:**
   - Require verified credentials (advocate certification)
   - Parent reviews/ratings (after engagement)
   - Dispute resolution process

**Success Criteria:**
- ✅ 50+ advocates in directory (25% of B2B users)
- ✅ 100+ parent inquiries sent
- ✅ 20+ successful connections (parent hired advocate)
- ✅ Advocates report directory as "valuable benefit"

**Network Effects:**
- More advocates → more value for parents → more parents sign up
- More parents → more leads for advocates → more advocates join
- Creates defensible moat (can't be easily replicated without network)

### Week 21-22: Growth Experiments

**Objective:** Find scalable acquisition channels for parents

**Channels to Test:**

1. **Advocate Referrals:**
   - Give advocates unique referral links
   - Offer: Parent gets 1 month Pro free, advocate gets $10 credit
   - Track conversion rate per advocate

2. **Facebook Groups:**
   - Join 20-30 special ed parent groups
   - Provide value: answer questions, share insights
   - Mention tool when relevant (not spammy)
   - Track: group → signup conversion

3. **SEO/Content:**
   - Write 10-15 blog posts: "How to read your IEP", "What is FAPE?", etc.
   - Target long-tail keywords parents search
   - Track: organic search → signup

4. **Partnerships:**
   - Reach out to parent advocacy orgs (e.g., Understood.org, CHADD)
   - Offer free tool for their community
   - Co-marketing: they promote, we provide value

**Success Criteria:**
- ✅ Identify 1-2 channels with <$50 CAC
- ✅ 200+ signups from growth experiments
- ✅ 30%+ of signups from advocate referrals (validates network effect)

**What to Learn:**
- Which channel has best retention? (not just signups)
- What messaging resonates? (save time, reduce stress, advocate for child)
- What's the conversion funnel? (signup → onboard → active → paid)

### Week 23-24: Retention & Monetization

**Objective:** Keep parents engaged long-term, convert to paid

**Retention Strategies:**

1. **Passive Intelligence Reminders:**
   - If parent hasn't submitted anything in 2 weeks: "Forward us homework for free analysis"
   - Make it stupid simple: email or text message submission

2. **Milestone Notifications:**
   - "Annual review in 30 days - here's what to prepare"
   - "Progress report due this week - how is [Child] doing on goals?"
   - Use IEP dates from extraction (weeks 1-6)

3. **Community Building:**
   - Parent forum (powered by Discourse or built-in)
   - Monthly webinars: IEP tips, Q&A with advocates
   - Success stories: "How [Parent] used IEP Copilot to..."

**Monetization Optimization:**

1. **Value Ladder:**
   - Free: 5 passive submissions/month
   - Pro ($19/mo): Unlimited submissions, historical trends
   - Premium ($39/mo): 1:1 advocate consultation included
   - Enterprise: School districts buying for all parents

2. **Conversion Triggers:**
   - Hit free limit on passive submissions → upgrade prompt
   - 30 days active → "See how you've improved, upgrade for trends"
   - Advocate referral → "Your advocate recommends Pro for..."

**Success Criteria:**
- ✅ 500 total active parents (uploaded IEP in last 30 days)
- ✅ 30-day retention ≥40%
- ✅ 90-day retention ≥25%
- ✅ 10% paid conversion rate ($9.5K MRR from parents)
- ✅ Combined ARR: $180K (B2B) + $114K (B2C) = $294K

**Key Metrics Dashboard:**
- Daily Active Users (DAU) / Monthly Active Users (MAU)
- Engagement rate (% uploading or submitting weekly)
- Churn rate (monthly cohort retention)
- NPS by user type (parent vs advocate)
- Revenue by segment (B2B vs B2C)

---

## IMPLEMENTATION PLANNING GUIDELINES

### When to Detail (2-3 Weeks Before Phase)

As you approach each phase, create detailed implementation plans:

**For Database Schemas:**
- Run migration plan by 1-2 experienced devs
- Consider performance implications (indexes, RLS)
- Plan for backward compatibility
- Write rollback procedures

**For UI Components:**
- Create Figma mockups with real data
- User test with 3-5 target users
- Build component library incrementally
- Plan for mobile responsive design

**For Integrations (Stripe, email, etc.):**
- Review API documentation thoroughly
- Understand rate limits, costs, quotas
- Plan for webhook failures (retries, dead letter queues)
- Set up staging environment testing

**For AI/LLM Features:**
- Prototype prompts in Claude.ai first
- Test with 20-30 diverse documents
- Measure accuracy, cost, latency
- Plan for prompt versioning

### Adaptation Triggers

**Re-plan if any of these occur:**

1. **Extraction accuracy <85%** (weeks 1-6):
   - May need different extraction approach
   - Could delay passive intelligence timeline
   - Might require manual review workflow

2. **B2B beta feedback is negative** (weeks 13-14):
   - Pivot features or positioning
   - May delay B2C launch to fix core issues
   - Could change pricing model

3. **Retention <20% at 30 days** (any phase):
   - Core value prop not resonating
   - Need to fix engagement before scaling
   - May require product pivot

4. **Costs exceed $5/user** (ongoing):
   - LLM/infrastructure costs too high
   - Need to optimize prompts or architecture
   - May affect pricing model

### Success Metrics by Phase

**Phase 1 (Foundation):**
- Extraction accuracy ≥85%
- Processing time <2 min per IEP
- Evidence quality: ≥90% citations valid
- Cost per extraction <$2

**Phase 2 (B2B Launch):**
- 200 paying advocates
- $15K+ MRR
- NPS ≥40
- Time saved per case ≥90 minutes

**Phase 3 (B2C Scale):**
- 500 active parents (30-day)
- 10% paid conversion
- 30-day retention ≥40%
- Combined ARR ≥$250K

### Team & Resources

**Phase 1 (Weeks 1-8):**
- 1 full-stack developer
- 1 designer (part-time, weeks 4-5)
- Budget: $5K (LLM costs, tools)

**Phase 2 (Weeks 9-16):**
- 1 full-stack developer
- 1 founder (sales, customer success)
- Budget: $10K (ads, conferences, tools)

**Phase 3 (Weeks 17-24):**
- 1-2 full-stack developers
- 1 growth marketer (part-time)
- 1 customer success (part-time)
- Budget: $20K (marketing, content, tools)

---

## CONCLUSION

This plan balances detailed execution (weeks 1-6) with strategic flexibility (weeks 7-24). The foundation phase is detailed because it's closest and most certain. Later phases are high-level to allow for learning and adaptation.

**Key Principles:**
1. **Build once, serve both markets** - shared extraction infrastructure
2. **Validate with B2B first** - clearer value, easier sales
3. **Scale with B2C second** - advocates become distribution
4. **Iterate based on data** - don't over-plan before learning

**Next Steps:**
1. Begin Week 1-2 implementation (structured extraction)
2. Schedule detailed planning session 2 weeks before each phase
3. Set up metrics dashboard from day 1
4. Document learnings weekly to inform later phases

**Critical Success Factors:**
- Extraction quality drives everything (invest in weeks 1-6)
- Advocate feedback determines B2C features (listen closely)
- Network effects create moat (prioritize directory, referrals)
- Retention > Acquisition (fix engagement before scaling)

---

*Document Version: 1.0*
*Last Updated: 2026-01-03*
*Status: Foundation detailed, phases strategic*
