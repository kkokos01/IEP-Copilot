# IEP Copilot

AI-powered IEP document analysis with verified citations.

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Fill in .env.local with your credentials (see Setup Guide below)

# 4. Start Next.js dev server
npm run dev

# 5. Start Inngest dev server (separate terminal)
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js on Vercel)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST /api/documents/upload                                                 │
│    → Validate auth + file                                                   │
│    → Create document record                                                 │
│    → Upload to Supabase Storage                                            │
│    → Emit document.uploaded event                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INNGEST (Background Jobs)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  document.uploaded → processDocument                                        │
│    ├── Extract with Google Document AI                                      │
│    ├── Track partial extraction failures                                   │
│    └── Emit document.extracted                                              │
│                                                                             │
│  document.extracted → generateFindings                                      │
│    ├── Process in 15-page batches                                          │
│    ├── Verify citations                                                     │
│    └── Calculate bboxes via overlap scoring                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SUPABASE (Database + Storage)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL: documents, findings, citations, etc.                          │
│  Storage: documents/{userId}/{docId}/original.pdf                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Setup Guide

### A. Supabase Setup (Dev + Prod)

**1. Create two Supabase projects:**
- `iep-copilot-dev` (for development/preview)
- `iep-copilot-prod` (for production)

**2. Apply database schema:**

```bash
# Install Supabase CLI
npm i -g supabase

# Login
supabase login

# Apply to DEV
supabase link --project-ref <DEV_PROJECT_REF>
supabase db push

# Later, apply to PROD
supabase link --project-ref <PROD_PROJECT_REF>
supabase db push
```

**3. Create storage bucket (in each project's dashboard):**
- Bucket name: `documents`
- Private: Yes

**4. Add storage policy (run in SQL editor):**

```sql
create policy "Users can access own documents"
on storage.objects for all
using (
  bucket_id = 'documents' and
  (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'documents' and
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**5. Set up authentication:**
- Go to Authentication → Providers
- Enable Email/Password (minimum)
- Configure redirect URLs for your domains

---

### B. Google Cloud Setup (Document AI)

**1. Create a GCP project** (or use existing)

**2. Enable Document AI API:**
```
APIs & Services → Enable APIs → Search "Document AI" → Enable
```

**3. Create a Layout Parser processor:**
- Go to Document AI → Processors → Create
- Choose "Layout Parser"
- Select region (us or eu)
- Note the processor ID

**4. Set up authentication (choose ONE method):**

---

#### Option A: Workload Identity Federation (Recommended for Production)

**Why use this?** No service account keys to manage, more secure, works with Vercel's OIDC.

**Setup steps:**
1. **Create Workload Identity Pool:**
   ```bash
   gcloud iam workload-identity-pools create vercel-pool \
     --location=global \
     --display-name="Vercel Pool"
   ```

2. **Create Workload Identity Provider:**
   ```bash
   gcloud iam workload-identity-pools providers create vercel-provider \
     --location=global \
     --workload-identity-pool=vercel-pool \
     --display-name="Vercel Provider" \
     --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor" \
     --issuer-uri="https://token.actions.githubusercontent.com"
   ```

3. **Create service account:**
   ```bash
   gcloud iam service-accounts create iep-copilot-docai \
     --display-name="IEP Copilot Document AI"
   ```

4. **Grant Document AI role:**
   ```bash
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:iep-copilot-docai@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/documentai.apiUser"
   ```

5. **Allow Vercel to impersonate:**
   ```bash
   gcloud iam service-accounts add-iam-policy-binding \
     iep-copilot-docai@PROJECT_ID.iam.gserviceaccount.com \
     --role="roles/iam.workloadIdentityUser" \
     --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/vercel-pool/attribute.actor/VERCEL_PROJECT_ID"
   ```

6. **In Vercel:**
   - Go to Project Settings → Environment Variables
   - Add: `GOOGLE_APPLICATION_CREDENTIALS` with value:
     ```
     {
       "type": "external_account",
       "audience": "//iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/vercel-pool/providers/vercel-provider",
       "subject_token_type": "urn:ietf:params:oauth:token-type:jwt",
       "token_url": "https://sts.googleapis.com/v1/oauth/token",
       "service_account_impersonation_url": "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/iep-copilot-docai@PROJECT_ID.iam.gserviceaccount.com:generateAccessToken",
       "credential_source": {
         "url": "https://token.actions.githubusercontent.com",
         "headers": {
           "Authorization": "Bearer ${ACTIONS_ID_TOKEN_REQUEST_TOKEN}",
           "Accept": "application/vnd.github.v3+json"
         },
         "environment_id": "vercel"
       }
     }
     ```

---

#### Option B: Service Account JSON (Local Development Only)

**Note:** Many organizations block JSON key creation. Use only for local development.

1. **Create service account:**
   - IAM & Admin → Service Accounts → Create
   - Name: `iep-copilot-docai`
   - Grant role: "Document AI API User"
   - Create JSON key → Download

2. **Set environment variable (local only):**
   - `GOOGLE_APPLICATION_CREDENTIALS` = path to JSON file
   - OR `GCP_SERVICE_ACCOUNT_JSON` = entire JSON file contents as a string

---

**5. Set common environment variables:**
- `GCP_PROJECT_ID` = Your GCP project ID
- `DOCAI_LOCATION` = Processor region (us or eu)
- `DOCAI_PROCESSOR_ID` = Your processor ID from step 3

---

### C. Vercel Deployment

**1. Push to GitHub**

**2. Import in Vercel:**
- New Project → Import your repo
- Framework: Next.js (auto-detected)

**3. Configure environment variables:**

| Scope | Variables |
|-------|-----------|
| **Preview** (Dev) | `NEXT_PUBLIC_SUPABASE_URL` (dev), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (dev), `SUPABASE_SERVICE_ROLE_KEY` (dev) |
| **Production** | Same keys, production values |
| **Both** | `ANTHROPIC_API_KEY`, `GCP_*` vars, `INNGEST_*` vars |

**4. Deploy:**
- PR branches → Preview (uses Dev Supabase)
- Merge to main → Production (uses Prod Supabase)

---

### D. Inngest Setup

**1. Create account at [app.inngest.com](https://app.inngest.com)**

**2. Create an app** and get your keys:
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`

**3. Connect to Vercel:**
- Inngest dashboard → Apps → Connect
- Select your Vercel project
- The `/api/inngest` endpoint is auto-discovered

---

## Database Migrations

**Golden rule:** Never modify the database manually. Always use migrations.

**Creating a new migration:**
```bash
# Create migration file
touch supabase/migrations/002_add_feature.sql

# Edit the file with your SQL changes

# Apply to dev
supabase link --project-ref <DEV_REF>
supabase db push

# Test thoroughly, then apply to prod
supabase link --project-ref <PROD_REF>
supabase db push
```

**Automated migrations (GitHub Actions):**
- PRs with migration changes → Applied to DEV automatically
- Merge to main → Applied to PROD automatically
- See `.github/workflows/migrations.yml`

Required GitHub secrets:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DEV_PROJECT_REF`
- `SUPABASE_PROD_PROJECT_REF`
- `SUPABASE_DEV_DB_PASSWORD`
- `SUPABASE_PROD_DB_PASSWORD`

---

## Upload Flow

To avoid Vercel's request body size limits, documents are uploaded in two steps:

### Step 1: Upload file directly to Supabase Storage
```javascript
// Client-side code
const { data: { session } } = await supabase.auth.getSession();
const documentId = crypto.randomUUID();
const storagePath = `${session.user.id}/${documentId}/original.pdf`;

// Upload directly to storage
const { error } = await supabase.storage
  .from('documents')
  .upload(storagePath, file, {
    contentType: 'application/pdf',
    upsert: false
  });
```

### Step 2: Create document record via API
```javascript
// Then call API with metadata
const response = await fetch('/api/documents/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    documentId,
    storagePath,
    caseId: 'case-uuid',
    type: 'iep',
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type
  })
});
```

### Storage Path Convention
- **Format**: `{userId}/{documentId}/original.pdf`
- **Enforced by**: RLS policies in Supabase
- **Important**: Must match exactly or uploads will fail

---

## API Reference

### POST /api/documents/upload

Create a document record and trigger processing. 
**Note**: Files must be uploaded directly to Supabase Storage first (see Upload Flow below).

**Headers:**
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Body:**
```json
{
  "documentId": "uuid",
  "storagePath": "user-id/uuid/original.pdf",
  "caseId": "uuid",
  "type": "iep" | "evaluation" | "progress_report" | "other",
  "fileName": "document.pdf",
  "fileSize": 1234567,
  "mimeType": "application/pdf"
}
```

**Response:**
```json
{
  "success": true,
  "documentId": "uuid",
  "message": "Document uploaded and processing started"
}
```

**Error Response (415):**
```json
{
  "error": "Content-Type must be application/json"
}
```

### GET /api/documents/upload?id=<documentId>

Check document processing status.

**Response:**
```json
{
  "id": "uuid",
  "status": "complete",
  "pageCount": 25,
  "errorMessage": null,
  "isPartialExtraction": false,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

---

## Smoke Test Checklist

### Local Development
- [ ] `npm run dev` starts without errors
- [ ] Inngest dev server connects
- [ ] Can create user account (Supabase Auth)
- [ ] Can create child → case
- [ ] Can upload PDF via API
- [ ] Document status progresses: uploaded → processing → extracted → analyzing → complete
- [ ] Findings appear with verified citations

### Preview (Dev Environment)
- [ ] Vercel preview deployment works
- [ ] DocAI extraction succeeds (check Inngest logs)
- [ ] LLM analysis produces findings
- [ ] Citations show verification status

### Production
- [ ] Production deployment works
- [ ] All flows work as in preview
- [ ] Error messages are user-friendly

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `GCP_PROJECT_ID` | Yes | Google Cloud project ID |
| `DOCAI_LOCATION` | Yes | Document AI location (`us` or `eu`) |
| `DOCAI_PROCESSOR_ID` | Yes | Document AI processor ID |
| `GCP_SERVICE_ACCOUNT_JSON` | Yes* | Service account JSON (for Vercel) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `ANTHROPIC_MODEL` | No | Model version (default: claude-sonnet-4-20250514) |
| `INNGEST_EVENT_KEY` | Yes | Inngest event key |
| `INNGEST_SIGNING_KEY` | Yes | Inngest signing key |
| `ENABLE_SERVER_PDF_RENDER` | No | Server-side PDF rendering (default: false) |
| `ENABLE_FUZZY_VERIFICATION` | No | Fuzzy quote matching (default: false) |

---

## Troubleshooting

### Upload Issues

**"Content-Type must be application/json"**
- You're sending FormData instead of JSON
- Follow the two-step Upload Flow above
- Ensure client uploads to Supabase Storage first

**"Storage upload failed"**
- Check RLS policy: storage path must be `{userId}/{documentId}/original.pdf`
- Verify user is authenticated
- Ensure storage bucket exists and is named `documents`

**"Document not found" after upload**
- Storage path mismatch between client and server
- Check that `storagePath` in API call matches actual upload location

### Document Processing Issues

**"Analysis failed" in document status**
- Check GCP credentials: WIF config or service account JSON
- Verify Document AI processor ID and location
- Check Inngest function logs for detailed errors

**No findings generated**
- Document may have failed extraction
- Check if document was processed successfully
- Verify Anthropic API key is valid

### Common Errors

**Build fails with "supabaseUrl is required"**
- Environment variables missing during build
- Ensure all Supabase vars are set in Vercel
- Check .env.local for local development

**Vercel deployment fails**
- Check runtime="nodejs" is set on API routes using Node APIs
- Verify all environment variables are configured
- Check build logs for specific errors

*For local dev, you can use `GOOGLE_APPLICATION_CREDENTIALS` file path instead.

---

## Project Structure

```
├── .github/workflows/
│   └── migrations.yml        # Automated DB migrations
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── documents/
│   │       │   └── upload/route.ts  # Upload API
│   │       └── inngest/route.ts     # Inngest webhook
│   ├── inngest/
│   │   ├── client.ts                # Event types
│   │   └── functions/
│   │       ├── processDocument.ts   # Extraction
│   │       └── generateFindings.ts  # AI analysis
│   └── lib/
│       ├── docai.ts                 # Document AI client
│       ├── pdf-utils.ts             # PDF manipulation
│       ├── pdf-render.ts            # Optional rendering
│       └── text-normalize.ts        # OCR normalization
├── supabase/
│   └── migrations/
│       └── 001_init_iep_copilot.sql # Database schema
├── .env.example
├── package.json
└── README.md
```

---

## Version History

### v3.1 (Current)
- Upload API route added
- GitHub Actions for automated migrations
- `is_partial_extraction` column for easier UI queries
- Bbox overlap scoring filters stopwords
- Requires minimum "rare" token matches

### v3
- GCP credentials newline handling
- Partial extraction tracking
- Overlap-based bbox lookup
- Improved deduplication
- Env-controlled fuzzy verification

### v2
- PDF rendering optional (Vercel compatible)
- Batched LLM processing
- Idempotent block insertion
- RLS security hardening

### v1
- Initial implementation
