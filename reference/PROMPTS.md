# Reusable Prompts

## Code Generation Prompts

### Create New API Route
```
Generate a Next.js API route at /api/[endpoint] with:
- TypeScript types for request/response
- Zod schema validation for request body
- Proper error handling with user-friendly messages
- Authentication check via getSupabaseClient()
- RLS authorization using helper functions
- Returns JSON with consistent format: { success: boolean, data?: any, error?: string }
```

### Add New Background Job
```
Create an Inngest function in src/inngest/functions/ with:
- Event schema definition in src/inngest/client.ts
- Idempotent implementation (check if already processed)
- Proper error handling with retry logic
- Progress tracking via document status updates
- TypeScript types for event data
- Batch processing if handling large datasets
```

### Create New Database Table
```
Design a new database table with:
- UUID primary key with gen_random_uuid()
- Foreign key relationships with proper cascades
- Created_at/updated_at triggers
- Deleted_at for soft deletes
- Relevant indexes for query performance
- Row Level Security policy
- Enum types for constrained values
- JSONB fields for flexible metadata
```

### Add New UI Component
```
Create a React component in src/components/ with:
- TypeScript props interface
- Tailwind CSS for styling (no inline styles)
- Loading and error states
- Accessibility attributes (aria labels, etc.)
- Responsive design considerations
- Client component only if using browser APIs
- Server component by default
```

## Testing Prompts

### Smoke Test for New Feature
```
Add test to scripts/smoke-test.ts:
1. Create test data via API endpoints
2. Trigger background processing
3. Verify final state in database
4. Check all side effects (storage, events)
5. Cleanup test data
Include proper error handling and timeouts
```

### Unit Test for Utility Function
```
Create test in __tests__/ directory:
- Test happy path scenarios
- Test edge cases and error conditions
- Mock external dependencies
- Use describe/it/expect pattern
- Achieve 100% code coverage for critical functions
```

### Integration Test for API
```
Create API integration test:
- Test authentication requirements
- Test validation errors
- Test successful requests
- Test error responses
- Use actual Supabase test database
- Clean up test data after each test
```

## Deployment Prompts

### Add New Environment Variable
```
1. Add to .env.example with placeholder value
2. Add validation in src/lib/env.ts with Zod
3. Update README.md if user-facing
4. Configure in Vercel dashboard (both Preview and Production)
5. Add to deployment checklist if critical
```

### Database Migration
```
Create migration in supabase/migrations/:
1. Name with sequential number: 003_description.sql
2. Use IF NOT EXISTS for backward compatibility
3. Include indexes for performance
4. Add/update RLS policies if needed
5. Test on dev environment first
6. Document breaking changes
```

### Deploy New Version
```
Deployment checklist:
1. All tests passing locally
2. Smoke test successful
3. Version bumped in package.json
4. CHANGELOG.md updated
5. Migration tested on dev
6. PR merged to main
7. Monitor production deployment
8. Run smoke test on production
```

## Debugging Prompts

### Debug Document Processing Failure
```
Debugging steps for document processing:
1. Check document status in Supabase database
2. Review Inngest function logs for errors
3. Verify GCP credentials (WIF or service account)
4. Check Document AI processor availability
5. Validate PDF format and quality
6. Run smoke test with sample document
7. Check storage bucket permissions
8. Verify event emission in Inngest dashboard
```

### Debug Citation Verification Issues
```
Citation verification debugging:
1. Enable ENABLE_FUZZY_VERIFICATION temporarily
2. Check text normalization in text-normalize.ts
3. Review OCR quality and confidence scores
4. Verify bounding box calculations
5. Check for encoding issues
6. Test with known good quotes
7. Review overlap scoring algorithm
8. Check for Unicode normalization issues
```

### Debug Authentication Problems
```
Authentication debugging steps:
1. Verify JWT token format and expiration
2. Check RLS policy definitions
3. Test user ownership helper functions
4. Review Supabase auth configuration
5. Check CORS settings if client-side
6. Verify environment variables
7. Test with fresh auth session
8. Check audit log for access attempts
```

## Feature Development Prompts

### Add New Document Type
```
To add support for a new document type:
1. Update document_type enum in database
2. Add type-specific validation
3. Update document upload API
4. Modify extraction prompts for new type
5. Add UI components for type-specific features
6. Update documentation
7. Add test documents
8. Update smoke test
```

### Implement New Finding Category
```
To add a new finding category:
1. Update finding_category enum
2. Add category-specific prompts
3. Update UI filters and display
4. Add category to analytics
5. Update documentation
6. Test with sample documents
7. Update export functionality
```

### Add Export Feature
```
Implement document export:
1. Choose format (PDF, Word, HTML)
2. Create template/layout
3. Include citations and highlights
4. Add user preferences
5. Implement download endpoint
6. Add progress indicator for large exports
7. Test with various document sizes
8. Add to user permissions
```

## Optimization Prompts

### Database Query Optimization
```
Optimize slow database query:
1. Run EXPLAIN ANALYZE on query
2. Identify missing indexes
3. Consider denormalization for complex joins
4. Add appropriate indexes
5. Rewrite query to use indexes
6. Consider materialized views
7. Add query result caching
8. Monitor performance after changes
```

### Reduce LLM Token Usage
```
Optimize LLM token consumption:
1. Remove redundant context
2. Use more concise prompts
3. Implement smarter batching
4. Cache frequent requests
5. Use smaller model for simple tasks
6. Implement prompt templates
7. Track token usage metrics
8. Consider fine-tuning for common patterns
```

### Improve Frontend Performance
```
Frontend optimization checklist:
1. Implement code splitting for large components
2. Add lazy loading for below-fold content
3. Optimize images and assets
4. Use React.memo for expensive renders
5. Implement virtual scrolling for long lists
6. Add loading skeletons
7. Minimize re-renders with proper keys
8. Use Next.js Image optimization
```

## Security Prompts

### Security Review for New Feature
```
Security review checklist:
1. Verify RLS policies cover new data
2. Check for SQL injection risks
3. Validate all user inputs with Zod
4. Ensure no secrets in client code
5. Review API rate limiting needs
6. Check authentication requirements
7. Verify audit logging
8. Test with unauthorized access
```

### Implement Audit Logging
```
Add audit logging for sensitive actions:
1. Create audit_log entry for action
2. Include user_id, entity_type, entity_id
3. Add relevant metadata
4. Log before and after states for updates
5. Include IP address and user agent
6. Ensure RLS on audit_log table
7. Add retention policy
8. Create audit report queries
```

## Maintenance Prompts

### Update Dependencies
```
Dependency update process:
1. Check for outdated packages
2. Review breaking changes in release notes
3. Update in development first
4. Run full test suite
5. Test critical paths manually
6. Update documentation if needed
7. Deploy to preview for final testing
8. Deploy to production
```

### Code Refactoring
```
Refactoring checklist:
1. Identify code smells and duplication
2. Ensure tests cover target code
3. Refactor in small, testable steps
4. Maintain backward compatibility
5. Update types and documentation
6. Run full test suite after changes
7. Performance test critical paths
8. Update CHANGELOG.md
```

## Troubleshooting Prompts

### Vercel Deployment Issues
```
Vercel deployment debugging:
1. Check build logs for errors
2. Verify all environment variables
3. Ensure runtime="nodejs" on API routes
4. Check for Node.js version compatibility
5. Verify build output size limits
6. Check for missing dependencies
7. Review function timeout settings
8. Test locally with production build
```

### Supabase Connection Issues
```
Database connection debugging:
1. Verify connection string format
2. Check pool configuration
3. Review RLS policy performance
4. Monitor connection pool usage
5. Check for long-running queries
6. Verify network connectivity
7. Review database size limits
8. Check backup/restore operations
```

### External Service Failures
```
External service debugging:
1. Check service status pages
2. Verify API keys and credentials
3. Review rate limits and quotas
4. Check for API changes
5. Test with minimal example
6. Review timeout configurations
7. Check for IP whitelisting
8. Implement circuit breaker pattern
```
