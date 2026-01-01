# TODO

## 🎯 Focus This Week
**Week of Jan 1-7, 2026**

- [x] **Fix OCR normalization** for better citation verification accuracy ✅ DONE
- [x] **Implement user-friendly error messages** with actionable guidance ✅ DONE
- [x] **Set up monitoring and alerting** for document processing failures ✅ DONE (Sentry)
- [ ] **Add document processing progress indicators** with real-time updates
- [ ] **Create onboarding flow** for beta users with tutorial

### Completed This Sprint ✅

#### OCR Normalization & Adaptive Fuzzy Matching (2026-01-01)
- ✅ Enabled fuzzy verification by default (`ENABLE_FUZZY_VERIFICATION !== "false"`)
- ✅ Implemented adaptive multi-tier verification: exact → normalized → fuzzy
- ✅ Added verification statistics logging for monitoring OCR quality
- ✅ Store `verification_method` in citations for tracking
- ✅ Added database migration `002_add_verification_method.sql`
- 🔲 Still need: Test with real-world scanned IEP documents

#### User-Friendly Error Messages (2026-01-01)
- ✅ Replaced technical errors with user-friendly messages
- ✅ Added error codes for support tracking (AUTH_INVALID, FILE_TOO_LARGE, etc.)
- ✅ Added helpful hints for each error type
- ✅ Added file type and size validation
- ✅ Added status messages for document processing states
- 🔲 Still need: Create error message component library (frontend)

#### Monitoring & Alerting (2026-01-01)
- ✅ Installed and configured Sentry (`@sentry/nextjs`)
- ✅ Created client, server, and edge config files
- ✅ Updated `next.config.js` with Sentry wrapper
- ✅ Added Sentry env vars to `.env.example`
- 🔲 Still need: Configure Sentry DSN in production

### Critical Path Items (Remaining)

- [ ] **Add document processing progress indicators**
  - Real-time WebSocket updates via Inngest
  - Show current step (uploading → extracting → analyzing)
  - Display estimated time remaining

- [ ] **Create onboarding flow for beta users**
  - Welcome tour of key features
  - Sample document upload tutorial
  - Progress tracking for first documents

### High Priority Features
- [ ] **Document comparison** (IEP vs evaluation)
  - Side-by-side view of recommendations
  - Highlight discrepancies in services/goals
  - Generate comparison reports
  
- [ ] **Request letter generation**
  - Template-based letter creation
  - Auto-populate with document findings
  - Export to PDF with proper formatting

### Bug Fixes
- [ ] **Handle malformed PDFs gracefully**
  - Add PDF validation before upload
  - Provide specific error messages for corrupted files
  - Offer PDF repair suggestions
  
- [ ] **Fix partial extraction recovery**
  - Implement retry logic for failed pages
  - Allow manual page re-extraction
  - Better visual indication of partial success
  
- [ ] **Improve timeout handling**
  - Implement checkpointing for long documents
  - Add resumable processing
  - Better timeout communication to users

### Infrastructure & Monitoring
- [ ] **Migrate to Vercel OIDC for GCP authentication**
  - Currently using Base64-encoded service account keys
  - OIDC eliminates credential management entirely
  - See DECISIONS.md for detailed requirements
  - Docs: https://vercel.com/docs/security/secure-backend-access/oidc/gcp

- [ ] **Set up monitoring and alerting**
  - Document processing failure rate alerts
  - LLM cost tracking and budgets
  - Database performance monitoring
  - Error tracking integration (Sentry)

## Next Sprint - User Feedback & Iteration (v3.3)

### Based on Beta Feedback
- [ ] **Refine finding categories**
  - Add more specific issue types
  - Allow custom finding tags
  - Improve finding prioritization
  
- [ ] **Enhanced citation viewer**
  - Interactive PDF highlighting
  - Jump to citation location
  - Show surrounding context
  
- [ ] **Collaboration features**
  - Share documents with advocates
  - Comment on findings
  - Track resolution status

### Performance Improvements
- [ ] **Optimize document processing**
  - Parallel page processing
  - Smarter batching strategy
  - Reduce LLM token usage
  
- [ ] **Improve search functionality**
  - Full-text search across documents
  - Semantic search capabilities
  - Save search queries

## Future Roadmap

### Q2 2025 - Professional Features
- [ ] **Meeting preparation tools**
  - Pre-meeting checklists
  - Discussion point generator
  - Meeting minutes template
  
- [ ] **Deadline tracking system**
  - IEP review reminders
  - Evaluation due dates
  - State-specific timeline tracking
  
- [ ] **Analytics dashboard**
  - Document processing statistics
  - Common issues identification
  - Trend analysis over time

### Q3 2025 - Platform Expansion
- [ ] **Mobile app**
  - iOS and Android apps
  - Offline document viewing
  - Push notifications for deadlines
  
- [ ] **District-wide features**
  - Multi-user organization accounts
  - Standardized templates
  - Bulk document processing
  
- [ ] **Integration capabilities**
  - SIS integration options
  - Calendar integration
  - Email document forwarding

### Q4 2025 - AI Enhancements
- [ ] **Advanced AI features**
  - Document summarization
  - Predictive issue detection
  - Automated recommendation engine
  
- [ ] **Multi-language support**
  - Spanish language support
  - Document translation
  - Localization for state regulations

### Future Ideas
- [ ] **Video analysis**
  - Meeting recording analysis
  - Speech-to-text integration
  - Non-verbal cue detection
  
- [ ] **Community features**
  - Parent forums
  - Advocate directory
  - Resource sharing
  
- [ ] **Compliance automation**
  - Automatic compliance checking
  - Regulation updates tracking
  - Custom state rule engines

## Technical Debt

### Code Quality
- [ ] **Add comprehensive unit tests**
  - Test utility functions
  - Mock external services
  - Achieve 80% coverage
  
- [ ] **Improve TypeScript types**
  - Remove any types
  - Add generic constraints
  - Better error type handling
  
- [ ] **Refactor large functions**
  - Break down `processDocument.ts`
  - Extract reusable components
  - Simplify complex logic

### Documentation
- [ ] **API documentation**
  - OpenAPI/Swagger specs
  - Interactive API explorer
  - SDK documentation
  
- [ ] **Component documentation**
  - Storybook setup
  - Component usage examples
  - Design system documentation

### Security
- [ ] **Security audit**
  - Third-party security assessment
  - Penetration testing
  - Compliance verification
  
- [ ] **Access control improvements**
  - Role-based permissions
  - Granular document sharing
  - Audit log enhancements

## Blocked Items
- [ ] **HIPAA compliance certification** - Waiting on legal review
- [ ] **School district partnerships** - Requires compliance certification
- [ ] **Advanced analytics** - Need more data on usage patterns

## Resource Allocation

### Development Focus
- 60% Features (beta prep, user feedback)
- 25% Bug fixes and stability
- 15% Technical debt and infrastructure

### Testing Priorities
- All new features must have smoke tests
- Critical paths need unit tests
- Manual testing with real documents weekly

### Deployment Schedule
- Beta: End of January 2025
- v3.3: Mid-February 2025
- v4.0 (Professional): End of March 2025
