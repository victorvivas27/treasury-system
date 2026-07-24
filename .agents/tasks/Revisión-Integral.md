# Full Project Audit & Refactoring

Your goal is to perform a complete review of the entire project and leave it in a production-ready state.

## Objectives

1. Analyze the entire codebase.
2. Understand the architecture, business logic, and dependencies.
3. Detect bugs, broken functionality, incomplete implementations, dead code, duplicated code, and technical debt.
4. Identify security vulnerabilities, performance issues, scalability problems, and bad coding practices.
5. Review both frontend and backend.
6. Verify that the frontend and backend communicate correctly.
7. Validate APIs, routing, authentication, authorization, database access, caching, logging, error handling, and configuration.
8. Ensure the application builds successfully and all features work end-to-end.

## Frontend Review

- Review folder structure.
- Remove unused components.
- Fix broken pages.
- Fix UI inconsistencies.
- Improve responsive behavior.
- Improve accessibility.
- Optimize rendering performance.
- Reduce unnecessary re-renders.
- Improve state management.
- Remove duplicated logic.
- Improve typing.
- Fix linting errors.
- Fix TypeScript errors.
- Improve loading and error states.

## Backend Review

- Review architecture.
- Verify API endpoints.
- Validate business logic.
- Fix bugs.
- Improve error handling.
- Improve logging.
- Validate authentication and authorization.
- Review database queries.
- Optimize slow queries.
- Remove unused services.
- Improve validation.
- Improve security.
- Improve code organization.
- Review environment configuration.

## Database

- Review schema.
- Detect missing indexes.
- Detect redundant tables.
- Review migrations.
- Validate foreign keys.
- Detect data consistency issues.

## Code Quality

- Remove dead code.
- Remove unused dependencies.
- Remove duplicated code.
- Improve naming.
- Improve project structure.
- Improve maintainability.
- Improve readability.
- Follow best practices.
- Follow SOLID principles.
- Follow DRY.
- Follow KISS.

## Testing

- Detect missing tests.
- Fix broken tests.
- Add unit tests where appropriate.
- Add integration tests where appropriate.
- Verify critical user flows.

## Performance

- Identify bottlenecks.
- Optimize rendering.
- Optimize API calls.
- Optimize database queries.
- Reduce bundle size.
- Improve lazy loading.
- Improve caching strategy.

## Security

- Review secrets management.
- Detect exposed credentials.
- Detect insecure endpoints.
- Validate input sanitization.
- Prevent SQL Injection.
- Prevent XSS.
- Prevent CSRF.
- Review authentication flow.

## Documentation

Create or update a `README.md` containing:

### Project Overview

Explain what the project does.

### Architecture

Describe the frontend, backend, database, and external services.

### Technologies

List all technologies and versions.

### Installation

Explain how to install and run the project.

### Environment Variables

Document every required environment variable.

### Project Structure

Explain the folder organization.

### Issues Found

Create a detailed list including:

- Critical issues
- High priority issues
- Medium priority issues
- Low priority issues

For each issue include:

- Description
- Root cause
- Impact
- Solution implemented

### Improvements Implemented

List every improvement made.

### Remaining Recommendations

List improvements that were not implemented and explain why.

### Breaking Changes

Document any breaking changes.

### Migration Notes

Document any migration steps if required.

### Performance Improvements

Summarize performance optimizations.

### Security Improvements

Summarize security fixes.

### Final Checklist

Include checkboxes confirming:

- Frontend working
- Backend working
- APIs working
- Authentication working
- Database working
- Build successful
- Tests passing
- Lint passing
- Type checking passing
- Production ready

## Execution Rules

- Do not stop after identifying problems.
- Fix every issue that can be safely fixed.
- Refactor when necessary.
- Preserve existing functionality unless it is clearly broken.
- Keep commits small and logical (if using version control).
- Explain major architectural decisions.
- Do not introduce unnecessary complexity.
- Verify every fix before considering it complete.

The final goal is to leave the project cleaner, faster, more secure, easier to maintain, and fully functional. The final deliverable must include an updated `README.md` documenting all findings, fixes, improvements, and recommendations.
