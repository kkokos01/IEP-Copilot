# IEP Copilot

## First 5 minutes

**IEP Copilot** is an AI-powered platform that helps parents and advocates analyze special education documents with verified citations.

**Status**: Working MVP (v3.2) preparing for beta users
**Last Updated**: 2026-01-01
**Current Focus**: Beta preparation - OCR accuracy improvements, error handling, and monitoring  

## Quick Links
- [📋 TODO.md](./TODO.md) - Current sprint focus and roadmap
- [🏗️ ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture and design
- [🤖 CONTEXT.md](./CONTEXT.md) - AI assistant guidelines and preferences
- [✅ DECISIONS.md](./DECISIONS.md) - Architecture decision records
- [⚡ PROMPTS.md](./PROMPTS.md) - Reusable prompts for common tasks
- [🚀 GETTING-STARTED.md](./GETTING-STARTED.md) - Setup and deployment guide
- [📝 SESSIONS.md](./SESSIONS.md) - Recent development sessions
- [📐 CONVENTIONS.md](./CONVENTIONS.md) - Code conventions and standards

## Project Overview

IEP Copilot transforms how parents and advocates navigate special education documents. Using advanced AI, the system extracts content from PDFs, identifies potential issues, and provides verifiable citations back to the source document.

### Core Problem Solved
- Parents struggle to understand complex IEP documents
- Identifying missing services or inadequate accommodations requires expertise
- Verifying compliance with special education law is challenging
- Advocates need efficient tools to review multiple documents

### Key Features Implemented
- ✅ Secure document upload with direct Supabase Storage integration
- ✅ Google Document AI extraction with layout parsing (supports both OCR and Layout Parser formats)
- ✅ AI-powered findings generation with verified citations
- ✅ Row Level Security for multi-tenant data isolation
- ✅ Event-driven background processing with retries
- ✅ Partial extraction tracking and recovery
- ✅ Automated database migrations via GitHub Actions

## Key Decisions Made

### Architecture Choices
- **Event-driven architecture** with Inngest for reliability and observability
- **Workload Identity Federation** instead of service keys for better security
- **Row Level Security** for multi-tenant data isolation
- **Batched processing** (15-page chunks) to handle large documents within LLM limits
- **Direct storage uploads** to bypass Vercel's request body size limits

### Technology Stack
- Supabase for rapid full-stack development with built-in auth
- Google Document AI for best-in-class PDF layout extraction
- Anthropic Claude Sonnet for nuanced document analysis
- Next.js 15 with App Router for optimal performance
- TypeScript strict mode for type safety

## Known Issues & Blockers

### Current Blockers
- **OCR Quality**: ✅ IMPROVED - Adaptive fuzzy matching now enabled by default
- **Error Messages**: ✅ FIXED - User-friendly errors with codes and hints
- **Large Documents**: Processing timeouts on PDFs >100 pages (still needs checkpointing)

### Security Concerns
- ⚠️ Real API keys were previously in `.env.example` (now fixed)
- Need to implement comprehensive audit logging
- Consider adding rate limiting for document uploads

### Technical Debt
- PDF rendering is optional and should be removed if not used
- ✅ Error handling improved in upload API (structured errors with codes)
- ✅ Monitoring configured (Sentry) - needs DSN in production

## Development Guidelines

### Before Adding New Features
1. Run `npm run smoke-test` to ensure pipeline works
2. Check if feature affects document processing timeouts
3. Verify RLS policies cover new data
4. Update type definitions if needed

### Deployment Process
- PR branches → Preview deployment (uses dev Supabase)
- Merge to main → Production deployment (uses prod Supabase)
- Migrations are applied automatically via GitHub Actions

### Testing Philosophy
- Always run smoke test before deploying
- Test with real IEP documents when possible
- Verify both happy path and error scenarios

## Project Health
- ✅ Build passing
- ✅ Smoke test passing
- ✅ Automated migrations working
- ✅ Preview deployments functional
- ✅ Sentry error tracking configured
- ✅ Adaptive fuzzy verification enabled
- ⚠️ Need beta user feedback
- ⚠️ Need to apply migration 002 to database
- ⚠️ Need to configure Sentry DSN in production

## Target Users

### Primary: Parents
- Often stressed and overwhelmed
- May not understand educational jargon
- Need clear, actionable information
- Want to ensure child receives appropriate services

### Secondary: Advocates
- Professional or volunteer advocates
- Understand special education law
- Need efficient document review tools
- Represent multiple families

## Business Context
- **Market**: 7.2 million students in special education (US)
- **Pain Point**: Complex documents, legal requirements, power imbalance
- **Solution**: Democratize access to document analysis
- **Compliance**: FERPA, COPPA, IDEA requirements
