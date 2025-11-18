import { db } from "./index";
import { deadlineTemplates } from "./schema";
import { eq } from "drizzle-orm";

/**
 * Multi-Jurisdiction Compliance Deadline Templates
 * Covers: United Kingdom, Canada, Australia
 */

export const multiJurisdictionTemplates = [
  // ========================================
  // UNITED KINGDOM TAX DEADLINES
  // ========================================
  {
    name: "UK Corporation Tax Return (CT600)",
    filingType: "Corporation Tax",
    formNumber: "CT600",
    jurisdiction: "United Kingdom",
    entityTypes: ["c_corp", "llc"],
    frequencyRule: "annual",
    relativeDueDate: "12 months after accounting period end",
    description: "Annual Corporation Tax return must be filed within 12 months of accounting period end. Tax payment due 9 months and 1 day after period end.",
    requirements: [
      "Company accounts",
      "Corporation Tax computation",
      "Supplementary pages if applicable",
      "iXBRL tagged accounts"
    ],
    estimatedTime: 480, // 8 hours
    isActive: true,
    metadata: {
      links: ["https://www.gov.uk/government/organisations/hm-revenue-customs"],
      notes: "Payment deadline is earlier than filing deadline"
    }
  },
  {
    name: "UK VAT Return (Quarterly)",
    filingType: "VAT",
    formNumber: "VAT Return",
    jurisdiction: "United Kingdom",
    entityTypes: ["c_corp", "llc", "partnership"],
    frequencyRule: "quarterly",
    relativeDueDate: "1 month and 7 days after quarter end",
    description: "Quarterly VAT return must be filed online within 1 month and 7 days after the end of the VAT period.",
    requirements: [
      "Sales records",
      "Purchase records",
      "VAT account",
      "MTD-compatible software"
    ],
    estimatedTime: 120, // 2 hours
    isActive: true,
    metadata: {
      links: ["https://www.gov.uk/vat-returns"],
      notes: "Making Tax Digital (MTD) required for most businesses"
    }
  },
  {
    name: "UK Self Assessment Tax Return",
    filingType: "Income Tax",
    formNumber: "SA100",
    jurisdiction: "United Kingdom",
    entityTypes: ["sole_prop", "partnership"],
    frequencyRule: "annual",
    relativeDueDate: "January 31 following tax year",
    description: "Self Assessment tax return for the year ending April 5. Online filing deadline: January 31. Paper filing: October 31.",
    requirements: [
      "SA100 main return",
      "Supplementary pages (SA103 for self-employment)",
      "Records of income and expenses",
      "P60/P45 if applicable"
    ],
    estimatedTime: 240, // 4 hours
    isActive: true,
    metadata: {
      links: ["https://www.gov.uk/self-assessment-tax-returns"],
      notes: "Tax year runs April 6 to April 5"
    }
  },
  {
    name: "UK Companies House Annual Accounts",
    filingType: "Annual Accounts",
    formNumber: "AA01",
    jurisdiction: "United Kingdom",
    entityTypes: ["c_corp", "llc"],
    frequencyRule: "annual",
    relativeDueDate: "9 months after accounting reference date",
    description: "Annual accounts must be filed with Companies House within 9 months of year-end for private companies.",
    requirements: [
      "Balance sheet",
      "Profit and loss account",
      "Directors' report",
      "Auditor's report (if applicable)"
    ],
    estimatedTime: 360, // 6 hours
    isActive: true,
    metadata: {
      links: ["https://www.gov.uk/file-your-company-accounts-and-tax-return"],
      notes: "Public companies have 6 months"
    }
  },
  {
    name: "UK Confirmation Statement (Annual Return)",
    filingType: "Annual Return",
    formNumber: "CS01",
    jurisdiction: "United Kingdom",
    entityTypes: ["c_corp", "llc"],
    frequencyRule: "annual",
    relativeDueDate: "14 days after review date",
    description: "Annual confirmation of company details must be filed at least once every 12 months.",
    requirements: [
      "Current company details",
      "Shareholder information",
      "SIC codes",
      "PSC register"
    ],
    estimatedTime: 60, // 1 hour
    isActive: true,
    metadata: {
      links: ["https://www.gov.uk/file-confirmation-statement-with-companies-house"],
      notes: "Formerly known as Annual Return (AR01)"
    }
  },
  {
    name: "UK PAYE and NIC Returns (RTI)",
    filingType: "Payroll Tax",
    formNumber: "FPS",
    jurisdiction: "United Kingdom",
    entityTypes: ["c_corp", "llc", "partnership"],
    frequencyRule: "monthly",
    relativeDueDate: "On or before payment date",
    description: "Real Time Information (RTI) submission required on or before each payday.",
    requirements: [
      "Full Payment Submission (FPS)",
      "Employer Payment Summary (EPS) if applicable",
      "Payroll records"
    ],
    estimatedTime: 30, // 30 minutes per payroll
    isActive: true,
    metadata: {
      links: ["https://www.gov.uk/running-payroll"],
      notes: "Real-time reporting required"
    }
  },

  // ========================================
  // CANADA TAX DEADLINES
  // ========================================
  {
    name: "Canada T2 Corporate Income Tax Return",
    filingType: "Corporate Income Tax",
    formNumber: "T2",
    jurisdiction: "Canada (Federal)",
    entityTypes: ["c_corp"],
    frequencyRule: "annual",
    relativeDueDate: "6 months after fiscal year-end",
    description: "T2 Corporation Income Tax Return must be filed within 6 months of the end of the tax year. Tax payment due 2-3 months after year-end.",
    requirements: [
      "T2 return",
      "Financial statements",
      "GIFI (General Index of Financial Information)",
      "Provincial/territorial forms"
    ],
    estimatedTime: 480, // 8 hours
    isActive: true,
    metadata: {
      links: ["https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t2.html"],
      notes: "Earlier payment deadline for Canadian-controlled private corporations"
    }
  },
  {
    name: "Canada GST/HST Return",
    filingType: "GST/HST",
    formNumber: "GST34",
    jurisdiction: "Canada (Federal)",
    entityTypes: ["c_corp", "llc", "partnership"],
    frequencyRule: "quarterly",
    relativeDueDate: "1 month after quarter end",
    description: "GST/HST return due one month after the end of the reporting period for quarterly filers.",
    requirements: [
      "Sales records",
      "Purchase records",
      "Input tax credits documentation",
      "GST/HST collected and paid"
    ],
    estimatedTime: 120, // 2 hours
    isActive: true,
    metadata: {
      links: ["https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html"],
      notes: "Frequency depends on annual revenue"
    }
  },
  {
    name: "Canada T1 Personal Income Tax Return",
    filingType: "Personal Income Tax",
    formNumber: "T1",
    jurisdiction: "Canada (Federal)",
    entityTypes: ["sole_prop", "partnership"],
    frequencyRule: "annual",
    relativeDueDate: "April 30 (June 15 for self-employed)",
    description: "Personal income tax return. Deadline: April 30 for most; June 15 for self-employed (but tax payment due April 30).",
    requirements: [
      "T1 return",
      "T2125 (business income)",
      "T4 slips",
      "Receipts for deductions"
    ],
    estimatedTime: 240, // 4 hours
    isActive: true,
    metadata: {
      links: ["https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return.html"],
      notes: "Tax year is calendar year (January 1 - December 31)"
    }
  },
  {
    name: "Canada T4 Summary (Payroll)",
    filingType: "Payroll Tax",
    formNumber: "T4",
    jurisdiction: "Canada (Federal)",
    entityTypes: ["c_corp", "llc", "partnership"],
    frequencyRule: "annual",
    relativeDueDate: "Last day of February",
    description: "T4 slips and summary must be filed by the last day of February for the previous calendar year.",
    requirements: [
      "T4 slips for all employees",
      "T4 Summary",
      "Payroll records",
      "CPP/EI remittances"
    ],
    estimatedTime: 180, // 3 hours
    isActive: true,
    metadata: {
      links: ["https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll.html"],
      notes: "Must provide slips to employees by same deadline"
    }
  },
  {
    name: "Canada T5 Investment Income",
    filingType: "Investment Income",
    formNumber: "T5",
    jurisdiction: "Canada (Federal)",
    entityTypes: ["c_corp", "partnership"],
    frequencyRule: "annual",
    relativeDueDate: "Last day of February",
    description: "T5 slips reporting investment income (interest, dividends, etc.) must be filed by last day of February.",
    requirements: [
      "T5 slips",
      "T5 Summary",
      "Investment income records"
    ],
    estimatedTime: 120, // 2 hours
    isActive: true,
    metadata: {
      links: ["https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t5.html"],
      notes: "Required for investment income over $50"
    }
  },

  // ========================================
  // AUSTRALIA TAX DEADLINES
  // ========================================
  {
    name: "Australia Company Income Tax Return",
    filingType: "Company Tax",
    formNumber: "Company tax return",
    jurisdiction: "Australia",
    entityTypes: ["c_corp"],
    frequencyRule: "annual",
    relativeDueDate: "February 28 (or May 15 with tax agent)",
    description: "Company income tax return for year ending June 30. Self-preparer deadline: February 28. Tax agent: May 15.",
    requirements: [
      "Company tax return",
      "Financial statements",
      "Tax reconciliation",
      "Franking account statement"
    ],
    estimatedTime: 480, // 8 hours
    isActive: true,
    metadata: {
      links: ["https://www.ato.gov.au/Business/Income-and-deductions-for-business/"],
      notes: "Australian tax year: July 1 - June 30"
    }
  },
  {
    name: "Australia Individual Income Tax Return",
    filingType: "Individual Tax",
    formNumber: "Individual tax return",
    jurisdiction: "Australia",
    entityTypes: ["sole_prop", "partnership"],
    frequencyRule: "annual",
    relativeDueDate: "October 31 (or May 15 with tax agent)",
    description: "Individual tax return for year ending June 30. Self-lodgment: October 31. Tax agent: May 15.",
    requirements: [
      "Individual tax return",
      "Payment summaries",
      "Deduction receipts",
      "Investment statements"
    ],
    estimatedTime: 240, // 4 hours
    isActive: true,
    metadata: {
      links: ["https://www.ato.gov.au/Individuals/Lodging-your-tax-return/"],
      notes: "Use myTax for online lodgment"
    }
  },
  {
    name: "Australia GST Return (BAS - Quarterly)",
    filingType: "GST (BAS)",
    formNumber: "BAS",
    jurisdiction: "Australia",
    entityTypes: ["c_corp", "llc", "partnership"],
    frequencyRule: "quarterly",
    relativeDueDate: "28 days after quarter end (or 25th of month after quarter)",
    description: "Business Activity Statement (BAS) reporting GST. Quarterly filers: 28 days after quarter end.",
    requirements: [
      "Sales records",
      "Purchase records",
      "GST collected and paid",
      "PAYG withholding"
    ],
    estimatedTime: 120, // 2 hours
    isActive: true,
    metadata: {
      links: ["https://www.ato.gov.au/Business/BAS/"],
      notes: "Can be monthly or quarterly depending on turnover"
    }
  },
  {
    name: "Australia PAYG Payment Summary",
    filingType: "Payroll Tax",
    formNumber: "Payment summary",
    jurisdiction: "Australia",
    entityTypes: ["c_corp", "llc", "partnership"],
    frequencyRule: "annual",
    relativeDueDate: "July 14",
    description: "PAYG payment summaries and annual report must be provided to employees and lodged with ATO by July 14.",
    requirements: [
      "Payment summaries for employees",
      "PAYG withholding annual report",
      "Payroll records"
    ],
    estimatedTime: 180, // 3 hours
    isActive: true,
    metadata: {
      links: ["https://www.ato.gov.au/Business/PAYG-withholding/"],
      notes: "Moving to Single Touch Payroll (STP)"
    }
  },
  {
    name: "Australia Superannuation Guarantee",
    filingType: "Superannuation",
    formNumber: "Super guarantee",
    jurisdiction: "Australia",
    entityTypes: ["c_corp", "llc", "partnership"],
    frequencyRule: "quarterly",
    relativeDueDate: "28 days after quarter end",
    description: "Superannuation guarantee contributions must be paid quarterly within 28 days of quarter end.",
    requirements: [
      "Employee super fund details",
      "Contribution calculations",
      "Payment records"
    ],
    estimatedTime: 90, // 1.5 hours
    isActive: true,
    metadata: {
      links: ["https://www.ato.gov.au/Business/Super-for-employers/"],
      notes: "Currently 11% of ordinary time earnings (increasing to 12%)"
    }
  },
  {
    name: "Australia FBT Return",
    filingType: "Fringe Benefits Tax",
    formNumber: "FBT return",
    jurisdiction: "Australia",
    entityTypes: ["c_corp"],
    frequencyRule: "annual",
    relativeDueDate: "May 25 (or June 25 with tax agent)",
    description: "Fringe Benefits Tax return for FBT year ending March 31.",
    requirements: [
      "FBT return",
      "FBT records",
      "Employee declarations",
      "Benefit valuations"
    ],
    estimatedTime: 360, // 6 hours
    isActive: true,
    metadata: {
      links: ["https://www.ato.gov.au/Business/Fringe-benefits-tax/"],
      notes: "FBT year runs April 1 to March 31"
    }
  },
  {
    name: "Australia ASIC Annual Review",
    filingType: "Annual Review",
    formNumber: "Annual review",
    jurisdiction: "Australia (ASIC)",
    entityTypes: ["c_corp"],
    frequencyRule: "annual",
    relativeDueDate: "Within 2 months of review date",
    description: "ASIC annual review to confirm company details. Due date depends on company registration anniversary.",
    requirements: [
      "Company details confirmation",
      "Director details",
      "Shareholder information",
      "Annual review fee"
    ],
    estimatedTime: 60, // 1 hour
    isActive: true,
    metadata: {
      links: ["https://asic.gov.au/for-business/"],
      notes: "Review date is company registration anniversary month"
    }
  },

  // ========================================
  // PROVINCIAL/STATE-LEVEL (Examples)
  // ========================================
  {
    name: "Ontario Corporate Tax Return (CT23)",
    filingType: "Provincial Corporate Tax",
    formNumber: "CT23",
    jurisdiction: "Ontario, Canada",
    entityTypes: ["c_corp"],
    frequencyRule: "annual",
    relativeDueDate: "6 months after fiscal year-end",
    description: "Ontario corporate tax return must be filed within 6 months of fiscal year-end.",
    requirements: [
      "CT23 return",
      "Federal T2 return",
      "Financial statements"
    ],
    estimatedTime: 180, // 3 hours
    isActive: true,
    metadata: {
      links: ["https://www.ontario.ca/page/corporation-tax"],
      notes: "Must coordinate with federal T2 filing"
    }
  },
  {
    name: "New South Wales Payroll Tax",
    filingType: "State Payroll Tax",
    formNumber: "Payroll tax return",
    jurisdiction: "New South Wales, Australia",
    entityTypes: ["c_corp", "llc"],
    frequencyRule: "monthly",
    relativeDueDate: "7th day of following month",
    description: "NSW Payroll Tax return for employers with annual wages above threshold.",
    requirements: [
      "Monthly payroll tax return",
      "Payroll records",
      "Employee wages summary"
    ],
    estimatedTime: 90, // 1.5 hours
    isActive: true,
    metadata: {
      links: ["https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/payroll-tax"],
      notes: "Threshold currently $1.2M annual wages"
    }
  }
];

export async function seedMultiJurisdictionTemplates() {
  console.log("Seeding multi-jurisdiction compliance deadline templates...");

  try {
    for (const template of multiJurisdictionTemplates) {
      // Check if template already exists
      const existing = await db
        .select()
        .from(deadlineTemplates)
        .where(eq(deadlineTemplates.name, template.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(deadlineTemplates).values(template);
        console.log(`✓ Created template: ${template.name} (${template.jurisdiction})`);
      } else {
        console.log(`- Skipped (exists): ${template.name}`);
      }
    }

    console.log("\n✅ Multi-jurisdiction templates seeded successfully!");
    console.log(`\nCoverage:`);
    console.log(`- United Kingdom: 6 templates`);
    console.log(`- Canada (Federal): 5 templates`);
    console.log(`- Australia (Federal): 7 templates`);
    console.log(`- Provincial/State: 2 examples`);
    console.log(`\nTotal: ${multiJurisdictionTemplates.length} templates`);
  } catch (error) {
    console.error("Error seeding multi-jurisdiction templates:", error);
    throw error;
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMultiJurisdictionTemplates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
