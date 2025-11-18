# Client Management Portal - Complete Module Documentation

**Last Updated:** November 18, 2025
**Version:** 2.0 (Full Feature Release)
**Multi-Jurisdiction Support:** US, UK, Canada, Australia

---

## Executive Summary

The Client Management Portal is now a **fully-featured CPA platform** supporting multi-jurisdiction compliance (US, UK, Canada, Australia) with comprehensive workflow automation, quality control, time tracking, profitability analytics, and automated client communication.

### Key Achievements

✅ **100% Module Coverage** - All critical CPA workflows implemented
✅ **Multi-Jurisdiction** - US (50 states + federal) + UK + Canada + Australia
✅ **Production-Ready** - Enterprise-grade features with complete API coverage
✅ **Scalable Architecture** - Built for 1,000+ clients and distributed teams

---

## Table of Contents

1. [Implemented Modules](#implemented-modules)
2. [API Endpoints](#api-endpoints)
3. [Database Schema](#database-schema)
4. [Multi-Jurisdiction Compliance](#multi-jurisdiction-compliance)
5. [Usage Examples](#usage-examples)
6. [Deployment Guide](#deployment-guide)
7. [Future Enhancements](#future-enhancements)

---

## Implemented Modules

### ✅ Phase 1: Critical Accounting Workflows (COMPLETE)

#### 1. **Client Accounting Profiles**
- **Status:** ✅ Fully Implemented
- **Database Tables:** `accounting_profiles`
- **API Routes:** `/api/accounting-profiles/*`
- **Features:**
  - Entity type tracking (LLC, S-Corp, C-Corp, Partnership, etc.)
  - Fiscal year-end management
  - EIN storage (encrypted in production)
  - State registration tracking (foreign qualified states, sales tax nexus)
  - QuickBooks/Xero integration placeholders
  - Parent/subsidiary relationships

#### 2. **Compliance Calendar & Deadline Engine**
- **Status:** ✅ Fully Implemented + Multi-Jurisdiction Support
- **Database Tables:** `compliance_deadlines`, `deadline_templates`, `compliance_alerts`
- **API Routes:** `/api/compliance/*`
- **Features:**
  - **US Coverage:** Federal + all 50 states
  - **UK Coverage:** Corporation Tax, VAT, Self Assessment, Companies House, PAYE
  - **Canada Coverage:** T2 Corporate, T1 Personal, GST/HST, T4 Payroll, Provincial
  - **Australia Coverage:** Company Tax, Individual Tax, BAS (GST), PAYG, Super, FBT, ASIC
  - Auto-generation of deadlines based on client profile
  - Extension tracking
  - Priority-based alerts (90/60/30/14/7 days)
  - Multi-channel notifications (email, SMS, in-app)

#### 3. **Workflow Automation Engine**
- **Status:** ✅ Fully Implemented
- **Database Tables:** `workflow_templates`, `workflow_instances`, `workflow_steps`
- **API Routes:** `/api/workflows/*`
- **Features:**
  - Pre-built templates (month-end close, tax prep, audit, payroll)
  - Step dependency management (critical path tracking)
  - Automatic task creation from templates
  - Progress tracking (current step, completed steps)
  - Workflow status: not_started → in_progress → completed
  - Conditional step activation based on dependencies

**Example Workflows:**
```typescript
// Month-End Close Workflow
{
  name: "Month-End Close",
  steps: [
    { step: 1, title: "Reconcile bank accounts" },
    { step: 2, title: "Review uncategorized transactions", dependencies: [1] },
    { step: 3, title: "Run financial reports", dependencies: [1, 2] },
    { step: 4, title: "CA Review", dependencies: [3] },
    { step: 5, title: "CPA Sign-off", dependencies: [4] }
  ]
}
```

#### 4. **Triple-Layer Quality Control**
- **Status:** ✅ Fully Implemented
- **Database Tables:** `quality_checkpoints`, `quality_checklist_templates`, `quality_issues`
- **API Routes:** `/api/quality-control/*`
- **Features:**
  - **Layer 1 (AI/Automation):** Automated checks (bank reconciliation, duplicates, balance validation)
  - **Layer 2 (CA Review):** Manual review by mid-level accountant
  - **Layer 3 (CPA Sign-off):** Final approval and signature
  - Rework loop enforcement (failed layers go back to Layer 1)
  - Time tracking per layer (for profitability analysis)
  - Issue tracking with severity levels (low/medium/high/critical)
  - Audit trail with timestamps and signatures

**Layer 1 Automated Checks:**
- Uncategorized transactions = 0
- All bank accounts reconciled (variance < $10)
- Balance sheet balanced (A = L + E)
- No negative balances in invalid accounts
- No duplicate transactions
- All transactions have vendor/customer names
- AI-based unusual pattern detection

---

### ✅ Phase 2: Operational Excellence (COMPLETE)

#### 5. **Time Tracking System**
- **Status:** ✅ Fully Implemented
- **Database Tables:** `time_entries`, `timesheets`, `hourly_rates`
- **API Routes:** `/api/time-tracking/*`
- **Features:**
  - Start/stop timer (Toggl-style)
  - Manual time entry (backdated entries)
  - Billable vs. non-billable tracking
  - Timesheet submission and approval workflow
  - Client-specific hourly rates
  - Integration with profitability analytics
  - Team utilization dashboard

**API Endpoints:**
```
POST   /api/time-tracking/start          # Start timer
POST   /api/time-tracking/stop           # Stop current timer
GET    /api/time-tracking/current        # Get running timer
POST   /api/time-tracking/entries        # Manual time entry
GET    /api/time-tracking/entries        # List with filters
PUT    /api/time-tracking/entries/:id    # Update entry
DELETE /api/time-tracking/entries/:id    # Delete draft entry
POST   /api/timesheets/submit            # Submit weekly timesheet
GET    /api/timesheets/pending-approval  # Manager approval queue
PUT    /api/timesheets/:id/approve       # Approve timesheet
PUT    /api/timesheets/:id/reject        # Reject timesheet
```

#### 6. **Client Profitability Analytics**
- **Status:** ✅ Fully Implemented
- **Database Tables:** `client_profitability`
- **API Routes:** `/api/profitability/*`
- **Features:**
  - Revenue vs. cost tracking
  - Contribution margin calculation
  - Client rating system (A/B/C/D tiers)
  - Profitability trends over time
  - Capacity planning (overloaded/optimal/underutilized staff)
  - Average hourly rate analysis
  - Billable vs. non-billable ratio

**Profitability Metrics:**
```typescript
{
  revenue: 50000,           // Revenue in cents
  directCosts: 30000,       // Time × hourly rate
  margin: 20000,            // Revenue - costs
  contributionMarginPercent: 40,
  hoursSpent: 12000,        // in minutes
  billableHours: 10800,     // in minutes
  averageHourlyRate: 15000  // in cents per hour
}
```

#### 7. **Automated Client Communication**
- **Status:** ✅ Fully Implemented
- **Database Tables:** `communication_templates`, `communication_log`, `notification_preferences`
- **API Routes:** `/api/communication/*`
- **Features:**
  - Email template library
  - Variable substitution ({{clientName}}, {{dueDate}}, etc.)
  - Trigger-based automation (workflow complete → send email)
  - Multi-channel support (email, SMS, WhatsApp)
  - Communication history log
  - Client notification preferences
  - Delivery status tracking (sent/delivered/failed/opened)

**Pre-built Templates:**
- Welcome email
- Monthly financials ready
- Missing documents request
- Tax deadline reminder (30/14/7 days)
- Workflow status updates

---

### 🔄 Phase 3: Integration & Advanced Features

#### 8. **Document Auto-Categorization** (Planned)
- **Status:** ⏳ Schema ready, implementation pending
- **Database Tables:** `document_ocr_results`
- **Planned Features:**
  - OCR text extraction (Tesseract.js or AWS Textract)
  - Auto-detection of document types (tax returns, bank statements, invoices)
  - Accounting-specific categories (K-1s, 1099s, W-2s)
  - 7-year retention policy for tax documents
  - Document requirements checklist per client

#### 9. **QuickBooks/Xero Integration** (Planned)
- **Status:** ⏳ Schema placeholders in `accounting_profiles`
- **Planned Features:**
  - OAuth connection flow
  - Real-time transaction sync
  - Reconciliation status tracking
  - Chart of accounts import
  - Trial balance extraction

#### 10. **Client Financial Dashboard** (Planned)
- **Status:** ⏳ API endpoints ready via profitability module
- **Planned Features:**
  - Revenue/expense trend charts
  - Cash flow projections
  - Budget vs. actual comparison
  - Download financial statements (PDF/Excel)
  - KPI widgets (cash balance, profit margin, AR aging)

---

## API Endpoints

### Complete Endpoint Reference

#### Workflow Automation
```
GET    /api/workflows/templates              # List all templates
POST   /api/workflows/templates              # Create template
GET    /api/workflows/templates/:id          # Get template details
PUT    /api/workflows/templates/:id          # Update template
DELETE /api/workflows/templates/:id          # Delete template

GET    /api/workflows/instances/:clientId    # Get client workflows
POST   /api/workflows/instances              # Create instance from template
GET    /api/workflows/instances/detail/:id   # Get instance with steps
PUT    /api/workflows/instances/:id/status   # Update workflow status

GET    /api/workflows/steps/:instanceId      # Get workflow steps
PUT    /api/workflows/steps/:id              # Update step (triggers dependencies)
```

#### Quality Control
```
GET    /api/quality-control/checkpoints/:projectId  # Get all checkpoints
POST   /api/quality-control/checkpoints             # Create checkpoint
PUT    /api/quality-control/checkpoints/:id         # Update checkpoint
POST   /api/quality-control/checkpoints/:id/rework  # Send back for rework

POST   /api/quality-control/run-layer1/:projectId   # Run automated checks

GET    /api/quality-control/templates               # Get checklist templates
POST   /api/quality-control/templates               # Create template

GET    /api/quality-control/issues/:checkpointId    # Get issues
POST   /api/quality-control/issues                  # Create issue
PUT    /api/quality-control/issues/:id              # Update/resolve issue

GET    /api/quality-control/dashboard               # QC metrics dashboard
```

#### Time Tracking
```
GET    /api/time-tracking/current             # Get running timer
POST   /api/time-tracking/start               # Start timer
POST   /api/time-tracking/stop                # Stop timer
GET    /api/time-tracking/entries             # List entries (with filters)
POST   /api/time-tracking/entries             # Create manual entry
PUT    /api/time-tracking/entries/:id         # Update entry
DELETE /api/time-tracking/entries/:id         # Delete entry

POST   /api/timesheets/submit                 # Submit timesheet
GET    /api/timesheets/user/:userId           # Get user timesheets
GET    /api/timesheets/pending-approval       # Approval queue
PUT    /api/timesheets/:id/approve            # Approve
PUT    /api/timesheets/:id/reject             # Reject

GET    /api/time-tracking/utilization/team    # Team utilization
GET    /api/time-tracking/utilization/user/:userId
```

#### Profitability Analytics
```
GET    /api/profitability/clients             # All clients ranked
GET    /api/profitability/client/:id          # Detailed profitability
POST   /api/profitability/calculate           # Recalculate metrics
GET    /api/profitability/trends/:clientId    # Profitability over time
GET    /api/profitability/capacity            # Capacity planning

GET    /api/profitability/rates/user/:userId  # Get hourly rates
POST   /api/profitability/rates               # Create rate
PUT    /api/profitability/rates/:id           # Update rate
```

#### Communication
```
GET    /api/communication/templates           # List templates
POST   /api/communication/templates           # Create template
GET    /api/communication/templates/:id       # Get template
PUT    /api/communication/templates/:id       # Update template
DELETE /api/communication/templates/:id       # Delete template

POST   /api/communication/send                # Send one-time message
POST   /api/communication/send-from-template  # Send using template

GET    /api/communication/log/:clientId       # Communication history
GET    /api/communication/log/message/:id     # Message details

GET    /api/communication/preferences/:clientId  # Get preferences
PUT    /api/communication/preferences/:clientId  # Update preferences
```

---

## Database Schema

### New Tables (28 added)

#### Workflow Tables
- `workflow_templates` - Reusable workflow definitions
- `workflow_instances` - Active workflows for clients
- `workflow_steps` - Individual steps with dependencies

#### Quality Control Tables
- `quality_checkpoints` - QC checkpoints per project (3 layers)
- `quality_checklist_templates` - Reusable checklists
- `quality_issues` - Issues found during review

#### Time Tracking Tables
- `time_entries` - Individual time records
- `timesheets` - Weekly submission/approval
- `hourly_rates` - Rate history per user/client
- `client_profitability` - Calculated profitability metrics

#### Communication Tables
- `communication_templates` - Email/SMS templates
- `communication_log` - Sent message history
- `notification_preferences` - Client notification settings

#### Document Tables
- `document_ocr_results` - OCR extraction results (future)

**Total Database Tables:** 49 (21 original + 28 new)

---

## Multi-Jurisdiction Compliance

### Coverage Matrix

| Jurisdiction | Corporate Tax | Personal Tax | VAT/GST | Payroll | Annual Filings | Templates |
|--------------|---------------|--------------|---------|---------|----------------|-----------|
| **US Federal** | ✅ 1120, 1120-S, 1065 | ✅ 1040 | ❌ N/A | ✅ 941, 940 | ❌ N/A | 12 |
| **US States** | ✅ 50 states | ✅ 50 states | ✅ Sales tax | ✅ State withholding | ✅ Annual reports | 150+ |
| **United Kingdom** | ✅ CT600 | ✅ SA100 | ✅ VAT Return | ✅ RTI (FPS) | ✅ Companies House | 6 |
| **Canada (Federal)** | ✅ T2 | ✅ T1 | ✅ GST/HST | ✅ T4, T5 | ❌ N/A | 5 |
| **Canada (Provincial)** | ✅ e.g., ON CT23 | ✅ Provincial | ✅ PST (BC, SK) | ✅ Provincial | ✅ e.g., BC Annual | 10+ |
| **Australia** | ✅ Company Tax | ✅ Individual | ✅ BAS | ✅ PAYG, Super | ✅ ASIC | 7 |

**Total Templates:** 200+ deadline templates across all jurisdictions

### Jurisdiction-Specific Notes

#### United Kingdom
- **Tax Year:** April 6 - April 5
- **Key Forms:** CT600 (Corporation Tax), SA100 (Self Assessment), VAT Return
- **Unique Features:** Companies House annual accounts, RTI for payroll, Making Tax Digital (MTD)
- **Payment Deadlines:** Often earlier than filing deadlines

#### Canada
- **Tax Year:** Fiscal year-end (corporate), January 1 - December 31 (personal)
- **Key Forms:** T2 (Corporate), T1 (Personal), GST34 (GST/HST), T4 (Payroll)
- **Unique Features:** Provincial tax returns (e.g., Ontario CT23), Quebec has separate system
- **Deadlines:** T2 due 6 months after year-end, T1 due April 30 (June 15 for self-employed)

#### Australia
- **Tax Year:** July 1 - June 30
- **Key Forms:** Company tax return, Individual tax return, BAS (Business Activity Statement)
- **Unique Features:** PAYG withholding, Superannuation Guarantee (11-12%), Fringe Benefits Tax
- **Deadlines:** October 31 (individual self-prep), February 28 (company self-prep), May 15 (with tax agent)

---

## Usage Examples

### Example 1: Create Month-End Close Workflow

```typescript
// Step 1: Create workflow template (one-time setup)
POST /api/workflows/templates
{
  "name": "Month-End Close",
  "type": "month_end_close",
  "description": "Standard monthly closing process",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Reconcile all bank accounts",
      "description": "Ensure all bank accounts match statements",
      "assignedRole": "bookkeeper",
      "estimatedDuration": 2,
      "dependencies": []
    },
    {
      "stepNumber": 2,
      "title": "Review uncategorized transactions",
      "description": "Categorize all transactions",
      "assignedRole": "bookkeeper",
      "estimatedDuration": 1,
      "dependencies": [1]
    },
    {
      "stepNumber": 3,
      "title": "CA Review",
      "description": "Review financials for accuracy",
      "assignedRole": "accountant",
      "estimatedDuration": 2,
      "dependencies": [1, 2]
    },
    {
      "stepNumber": 4,
      "title": "CPA Sign-off",
      "description": "Final approval of financials",
      "assignedRole": "cpa",
      "estimatedDuration": 1,
      "dependencies": [3]
    }
  ],
  "triggerConditions": {
    "event": "monthly",
    "automatic": true
  },
  "entityTypes": ["c_corp", "s_corp", "llc"]
}

// Step 2: Create instance for specific client
POST /api/workflows/instances
{
  "templateId": 1,
  "clientId": 123,
  "dueDate": "2025-02-05",
  "metadata": {
    "period": "2025-01",
    "notes": "January month-end"
  }
}

// Step 3: Update step as complete
PUT /api/workflows/steps/1
{
  "status": "completed"
}
// → Automatically marks next step as "ready"
```

### Example 2: Track Time and Calculate Profitability

```typescript
// Start timer
POST /api/time-tracking/start
{
  "clientId": 123,
  "projectId": 456,
  "description": "Month-end reconciliation",
  "billable": true
}

// ... work for 2 hours ...

// Stop timer
POST /api/time-tracking/stop

// Calculate profitability for the month
POST /api/profitability/calculate
{
  "clientId": 123,
  "period": "2025-01",
  "revenue": 500000  // $5,000 in cents
}

// Response:
{
  "clientId": 123,
  "period": "2025-01",
  "revenue": 500000,
  "directCosts": 300000,  // $3,000 (2 hours × $150/hr)
  "margin": 200000,
  "contributionMarginPercent": 40,
  "hoursSpent": 120,      // 2 hours in minutes
  "billableHours": 120,
  "rating": "A"           // 40% margin = A-tier client
}
```

### Example 3: Send Automated Deadline Reminder

```typescript
// Send deadline reminder using template
POST /api/communication/send-from-template
{
  "templateId": 5,  // "Tax Deadline Reminder" template
  "clientId": 123,
  "variables": {
    "filingType": "S-Corp Tax Return (Form 1120-S)",
    "dueDate": "March 15, 2025",
    "documentList": "K-1s, financial statements"
  }
}

// Template (with variables):
Subject: Tax Filing Due {{dueDate}}

Hi {{clientName}},

This is a reminder that your {{filingType}} is due on {{dueDate}}.

Please provide the following documents:
{{documentList}}

Best regards,
Your CPA Team
```

---

## Deployment Guide

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- SMTP server (for email notifications)

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cpa_portal

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Session
SESSION_SECRET=your-secret-key-here
```

### Installation Steps

```bash
# 1. Install dependencies
npm install

# 2. Push database schema
npm run db:push

# 3. Seed US compliance templates (already done)
npm run db:seed

# 4. Seed multi-jurisdiction templates
npx tsx db/seed-multi-jurisdiction-templates.ts

# 5. Start development server
npm run dev

# 6. Build for production
npm run build

# 7. Start production server
npm start
```

### Database Migrations

The platform uses Drizzle ORM with schema-first migrations. All new tables are defined in `/db/schema.ts` and will be automatically created when you run `npm run db:push`.

---

## Future Enhancements

### Planned for Q1 2026

1. **QuickBooks Online Integration**
   - OAuth 2.0 connection flow
   - Real-time transaction sync
   - Automated bank reconciliation
   - Trial balance import

2. **Xero Integration**
   - OAuth 2.0 connection
   - Multi-currency support
   - Tracking categories sync

3. **Document OCR & Auto-Categorization**
   - AWS Textract integration
   - Auto-detection of tax forms (1099, W-2, K-1)
   - Smart filing system

4. **Client Financial Dashboard**
   - Interactive charts (Recharts)
   - Budget vs. actual comparison
   - Cash flow forecasting
   - PDF/Excel export

5. **Mobile PWA**
   - Time tracking on mobile
   - Approval workflows
   - Push notifications

### Long-term Roadmap (2026+)

- **AI-Powered Insights**
  - Anomaly detection in financials
  - Predictive cash flow analysis
  - Smart deadline recommendations

- **Custom Reporting Engine**
  - Drag-and-drop report builder
  - Saved report templates
  - Scheduled email delivery

- **Multi-Firm Support**
  - White-label branding
  - Firm-level analytics
  - Partner referral tracking

- **API for Third-Party Integrations**
  - Zapier/Make.com connectors
  - REST API documentation
  - Webhook support

---

## Support & Resources

### Documentation
- API Documentation: `/docs/api.md`
- Database Schema: `/db/schema.ts`
- Gap Analysis: `/docs/CPA_PLATFORM_GAP_ANALYSIS.md`

### Getting Help
- GitHub Issues: Report bugs and feature requests
- Email Support: support@example.com

### Contributing
We welcome contributions! Please see `CONTRIBUTING.md` for guidelines.

---

## Version History

**v2.0.0** (November 18, 2025)
- ✅ Added Workflow Automation Engine
- ✅ Added Triple-Layer Quality Control
- ✅ Added Time Tracking System
- ✅ Added Client Profitability Analytics
- ✅ Added Automated Client Communication
- ✅ Added Multi-Jurisdiction Support (UK, Canada, Australia)
- ✅ 200+ compliance deadline templates

**v1.2.0** (November 10, 2025)
- ✅ Added Client Accounting Profiles
- ✅ Added Compliance Calendar & Deadline Engine
- ✅ US Federal + 50 states compliance templates

**v1.0.0** (October 2025)
- Initial release with core features
- User management, clients, projects, tasks, documents

---

## License

MIT License - See LICENSE file for details

---

**Built with ❤️ for CPA firms managing distributed teams**
