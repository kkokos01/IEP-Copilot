# AI Assistant Context

## Coding Preferences

### General Philosophy
- **TypeScript strict mode** always enabled - no `any` types without explicit justification
- **Functional programming patterns** over classes where appropriate (pure functions, immutability)
- **Minimal external dependencies** - prefer built-in Node.js/Next.js solutions
- **Comprehensive error handling** with user-friendly messages, never expose internal errors
- **Security-first approach** - RLS on all tables, WIF instead of service keys, no exposed secrets

### Code Style
- Use explicit return types for functions
- Prefer `const` over `let`, avoid `var`
- Use early returns to reduce nesting
- Implement proper error boundaries in React
- Use Zod for all external data validation
- Follow Next.js App Router conventions

### Patterns to Use
- **Server Actions** for mutations and data fetching
- **React Query/SWR** pattern for client-side caching
- **Idempotent functions** for all background jobs
- **Event-driven architecture** for async operations
- **Soft deletes** instead of hard deletes
- **Audit logging** for sensitive operations

### Patterns to Avoid
- Direct database queries from client code
- Heavy ORMs - use Supabase client directly
- Complex state management libraries
- Storing secrets in environment variables that go to client
- Synchronous operations in API routes
- Mutating props directly

## Libraries and Frameworks

### Approved Libraries
- **Supabase** - Database, auth, storage (core infrastructure)
- **Inngest** - Background job processing
- **Zod** - Runtime type validation
- **Google Auth Library** - GCP authentication
- **PDF-lib** - PDF manipulation (server-side only)
- **TailwindCSS** - Styling

### Use Judiciously
- External UI libraries (prefer custom components)
- Heavy date libraries (use native Date/Intl)
- Animation libraries (CSS preferred)

### Avoid
- Additional authentication providers
- Client-side PDF processing
- Heavy form libraries (use native forms)
- Non-essential analytics

## Project Constraints

### Technical Constraints
- **Vercel deployment limits**:
  - Request body size: 4.5MB (bypass with direct uploads)
  - Function execution time: 10 minutes max
  - Memory: 1GB max
- **Database**: PostgreSQL via Supabase, must support RLS
- **File storage**: Supabase Storage only
- **PDF processing**: Must work server-side only

### Business Constraints
- **HIPAA considerations**: Educational records are sensitive
- **Must scale** to 1000+ concurrent users
- **Must support** documents up to 100 pages
- **Response time**: Analysis should complete within 5 minutes
- **Availability**: 99.9% uptime required during school year

### Compliance Requirements
- COPPA compliance for users under 13
- FERPA compliance for educational records
- State-specific special education regulations
- Data retention policies (7 years recommended)

## Domain Knowledge

### IEP Document Types
- **IEP (Individualized Education Program)**: Main legal document
- **Evaluation**: Psychoeducational, speech, OT, PT evaluations
- **Progress Reports**: Quarterly/biannual progress updates
- **Prior Written Notice (PWN)**: Notice of changes/refusals
- **Meeting Notes**: IEP team meeting documentation
- **Email/Correspondence**: Communication with school

### Key IEP Components
- **Present Levels of Performance**: Current abilities and needs
- **Goals**: SMART goals with measurable objectives
- **Services**: Frequency, duration, location of special services
- **Accommodations**: Classroom and testing modifications
- **Placement**: General education, special education, or mix
- **Timeline**: Dates for implementation and review

### Common Issues to Identify
- Missing or vague goals
- Insufficient service minutes
- Lack of progress monitoring
- Non-compliant timelines
- Missing accommodations
- Inappropriate placement
- Lack of parent participation

### Legal Framework
- **IDEA (Individuals with Disabilities Education Act)**: Federal law
- **Section 504**: Civil rights law for disabilities
- **State regulations**: Often stricter than federal
- **Due process rights**: Parent rights to dispute resolution

## User Personas

### Primary: Parents
- Often stressed and overwhelmed
- May not understand educational jargon
- Need clear, actionable information
- Want to ensure child receives appropriate services
- Time-constrained, need quick answers

### Secondary: Advocates
- Professional or volunteer advocates
- Understand special education law
- Need efficient document review tools
- Represent multiple families
- Require detailed citations for disputes

### Tertiary: School Staff (Future)
- Special education teachers
- School psychologists
- Administrators
- Need efficient IEP drafting tools

## Testing Philosophy

### Must Test
- Document upload and processing pipeline
- Citation verification accuracy
- RLS policy enforcement
- Error handling edge cases
- Authentication and authorization

### Test Strategy
- Smoke tests for full pipeline
- Unit tests for critical business logic
- Integration tests for API endpoints
- Manual testing with real documents
- Load testing for scaling

### When to Test vs. When to Ship

#### Always test
- Document upload and processing pipeline
- Citation verification accuracy
- RLS policy enforcement
- Authentication and authorization
- Database migrations

#### Test after shipping (can ship to preview first)
- UI/UX improvements
- Performance optimizations
- New finding categories
- Export functionality

#### Never skip testing
- Anything affecting document processing
- Security changes
- Database schema changes
- Authentication/authorization logic

### Test Data
- Use synthetic IEP documents for testing
- Never use real student data
- Test edge cases (poor quality PDFs, large files)
- Test failure scenarios

## Debugging Guidelines

### Common Issues
1. **Document processing failures**
   - Check GCP credentials (WIF or service account)
   - Verify Document AI processor exists
   - Review Inngest function logs
   - Check PDF quality and format

2. **Citation verification failures**
   - Enable fuzzy matching temporarily
   - Check text normalization
   - Review OCR quality
   - Verify bounding box calculations

3. **Authentication issues**
   - Check RLS policies
   - Verify JWT token format
   - Review user ownership functions

### Debug Tools
- Inngest dashboard for job monitoring
- Supabase logs for database queries
- Vercel logs for API errors
- Smoke test script for end-to-end testing

## Performance Optimization

### Database
- Use indexes on foreign keys and common queries
- Implement proper pagination
- Cache frequently accessed data
- Use materialized views for complex queries

### Document Processing
- Batch LLM requests (15-page chunks)
- Parallelize where possible
- Implement retry logic with backoff
- Cache extraction results

### Frontend
- Lazy load components
- Optimize PDF rendering
- Use streaming for large responses
- Implement proper loading states

## Security Best Practices

### Data Protection
- All tables must have RLS enabled
- Use service role key only server-side
- Implement audit logging
- Encrypt sensitive data at rest

### Access Control
- Verify user ownership on all operations
- Use JWT tokens with short expiry
- Implement rate limiting
- Monitor for suspicious activity

### External Services
- Use Workload Identity Federation
- Rotate credentials regularly
- Limit service account permissions
- Monitor API usage and costs
