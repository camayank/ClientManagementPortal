# CA4CPA Web Application

## Overview

CA4CPA is an enterprise-grade client management platform designed specifically for CPA firms to streamline organizational workflows through an intelligent, secure digital workspace. The platform facilitates collaboration between US-based CPA offices and offshore teams, providing comprehensive tools for client onboarding, task management, document processing, quality control, and performance analytics.

The application serves multiple user roles including administrators, managers, partners, team leads, staff accountants, quality reviewers, compliance officers, and clients, each with carefully defined permissions and capabilities tailored to their responsibilities in the CPA workflow.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React + TypeScript with Vite as the build tool

**UI Framework**: shadcn/ui components built on Radix UI primitives, styled with Tailwind CSS

**State Management**: 
- TanStack Query (React Query) for server state management and caching
- React Context API for authentication state
- Local component state with React hooks

**Routing**: wouter for lightweight client-side routing

**Real-time Communication**: WebSocket integration for live updates on tasks, projects, and notifications

**Key Design Patterns**:
- Component composition with reusable UI primitives
- Custom hooks for business logic encapsulation (use-auth, use-websocket, use-task-sync, use-project-sync)
- Protected route pattern for role-based access control
- Error boundary pattern for graceful error handling

### Backend Architecture

**Framework**: Node.js with Express.js

**Authentication Strategy**: Passport.js with local strategy for username/password authentication

**Session Management**: Express-session with in-memory store (MemoryStore), configured for secure cookie handling

**API Design**: RESTful API architecture with modular route handlers organized by domain (tasks, documents, users, clients, reports)

**Security Layers**:
- Helmet.js for security headers
- CORS middleware with whitelist-based origin validation
- Rate limiting on sensitive endpoints (authentication, document uploads, user management)
- Role-based permission system with granular resource-action combinations
- Password hashing with bcrypt (10 salt rounds)

**Middleware Pipeline**:
1. Trust proxy configuration
2. CORS handling
3. Body parsing (JSON and URL-encoded)
4. Session management
5. Passport initialization
6. Security headers
7. Route-specific rate limiting
8. Permission checking
9. Error handling

### Database Architecture

**ORM**: Drizzle ORM for type-safe database operations

**Database**: PostgreSQL (configured but database-agnostic Drizzle implementation allows for flexibility)

**Schema Design**:
- **Users & Authentication**: users, roles, permissions, userRoles, rolePermissions tables for flexible RBAC
- **Client Management**: clients, clientEngagements, servicePackages tables
- **Task Management**: tasks, taskCategories, taskStatusHistory, taskDependencies for workflow tracking
- **Document Management**: documents, documentVersions, documentTags, documentAuditLogs, documentClassifications
- **Project Management**: projects, projectMilestones, projectActivities
- **Analytics**: analyticsMetrics, analyticsDataPoints, dashboardConfigs, reportTemplates
- **Quality Control**: qualityReviews, qualityFindings
- **SLA & Compliance**: slaMetrics, complianceReports, escalations

**Migration Strategy**: Custom migration scripts in db/migrations directory with role-based permission seeding

**Data Relationships**:
- Many-to-many relationships between users and roles
- One-to-many relationships for task assignments and reviews
- Hierarchical task dependencies
- Document version control with audit trails
- Project-based activity tracking

### Real-time Communication Architecture

**WebSocket Server**: Custom WebSocketService class managing connections

**Message Types**: chat, notification, activity, milestone updates

**Connection Management**:
- Session-based authentication for WebSocket connections
- Client mapping by userId for targeted messaging
- Heartbeat mechanism for connection health monitoring
- Automatic reconnection with exponential backoff (max 5 attempts)

**Subscription Model**: Users subscribe to specific projects or task streams, receiving real-time updates only for relevant changes

### Role-Based Access Control (RBAC)

**Role Hierarchy**:
1. **Admin**: Full system access
2. **Manager/Partner**: Strategic planning and high-level approvals
3. **Team Lead**: Task assignment and team coordination
4. **Staff Accountant**: Task execution and document processing
5. **Quality Reviewer**: Review and quality control
6. **Compliance Officer**: Regulatory compliance oversight
7. **Client**: Limited access to own projects and documents

**CPA-Specific Roles**:
- US Office Senior, US Office Reviewer, US Office Staff
- US Remote Senior, US Remote Reviewer, US Remote Staff
- Offshore Senior, Offshore Reviewer, Offshore Staff

**Permission System**: Resource-action based permissions (e.g., "clients:manage", "documents:read") mapped to roles through rolePermissions junction table

### Security Features

**Authentication Security**:
- Session-based authentication with secure HTTP-only cookies
- CSRF protection through SameSite cookie policy
- Password complexity requirements (minimum 8 characters)
- Rate limiting on login attempts (100 requests per 15 minutes)

**API Security**:
- Tiered rate limiting (general API, authentication, documents, user management)
- Input validation using Zod schemas
- SQL injection prevention through parameterized queries (Drizzle ORM)
- XSS protection via React's built-in escaping

**Data Security**:
- Document audit logging with IP address and user agent tracking
- Version control for critical documents
- Granular permission checks before data access

## External Dependencies

### Core Libraries

**Backend Dependencies**:
- `express` - Web application framework
- `passport` & `passport-local` - Authentication middleware
- `drizzle-orm` & `postgres` - Database ORM and PostgreSQL driver
- `bcrypt` - Password hashing
- `express-session` & `memorystore` - Session management
- `ws` - WebSocket implementation
- `helmet` - Security headers
- `cors` - Cross-origin resource sharing
- `express-rate-limit` - API rate limiting
- `winston` - Logging framework
- `multer` - File upload handling
- `zod` - Runtime type validation

**Frontend Dependencies**:
- `react` & `react-dom` - UI framework
- `@tanstack/react-query` - Server state management
- `wouter` - Routing
- `@radix-ui/*` - Headless UI primitives (30+ components)
- `tailwindcss` - Utility-first CSS framework
- `@hookform/resolvers` & `react-hook-form` - Form handling
- `@dnd-kit/*` - Drag and drop functionality
- `recharts` - Data visualization
- `lucide-react` - Icon library

### Development Tools

- `vite` - Build tool and development server
- `typescript` - Type safety
- `drizzle-kit` - Database migrations
- `esbuild` - Backend bundling for production
- `tsx` - TypeScript execution for development

### External Services (Configured for Integration)

**Database**: PostgreSQL (via DATABASE_URL environment variable)

**Session Storage**: In-memory store (production deployment would require Redis or similar)

**File Storage**: Local filesystem with uploads directory (AWS S3 or Google Drive API integration planned per documentation)

**Email Service**: Configured for nodemailer integration (OAuth providers like Google and GitHub are set up in auth-service.ts but require client credentials)

**Payment Processing**: Stripe or Razorpay integration mentioned in requirements (not yet implemented)

**Document Processing**: AI-based document classification system planned (not yet implemented)

### Environment Variables Required

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Server port (default: 5000)
- Optional OAuth credentials for Google/GitHub authentication
- Optional email service credentials for password reset functionality

### Planned Integrations

Based on attached documentation:
- AWS S3 or Google Drive API for document storage
- Digital signature integration for document approval workflows
- Advanced analytics with predictive insights
- Automated reporting with PDF/CSV export
- Multi-factor authentication (2FA) with speakeasy library (partially implemented)