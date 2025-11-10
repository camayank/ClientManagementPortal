import { db } from "./index";
import { deadlineTemplates } from "./schema";

// Federal tax deadline templates
export const federalTaxTemplates = [
  {
    name: "Corporate Income Tax Return (Form 1120)",
    filingType: "income_tax",
    formNumber: "1120",
    jurisdiction: "Federal",
    entityTypes: ["c_corp"],
    frequencyRule: "annual",
    relativeDueDate: "FYE+3M+15D", // 3 months 15 days after fiscal year-end
    description: "Federal corporate income tax return for C-Corporations",
    requirements: ["Financial statements", "Trial balance", "Depreciation schedules"],
    estimatedTime: 8,
    isActive: true,
  },
  {
    name: "S-Corporation Income Tax Return (Form 1120-S)",
    filingType: "income_tax",
    formNumber: "1120-S",
    jurisdiction: "Federal",
    entityTypes: ["s_corp", "llc_s_corp"],
    frequencyRule: "annual",
    relativeDueDate: "FYE+3M+15D",
    description: "Federal S-Corporation income tax return",
    requirements: ["Financial statements", "K-1s", "Shareholder basis tracking"],
    estimatedTime: 10,
    isActive: true,
  },
  {
    name: "Partnership Tax Return (Form 1065)",
    filingType: "income_tax",
    formNumber: "1065",
    jurisdiction: "Federal",
    entityTypes: ["partnership", "llc_partnership"],
    frequencyRule: "annual",
    relativeDueDate: "FYE+3M+15D",
    description: "Federal partnership tax return",
    requirements: ["Financial statements", "K-1s", "Partner capital accounts"],
    estimatedTime: 10,
    isActive: true,
  },
  {
    name: "Quarterly Payroll Tax Return (Form 941)",
    filingType: "payroll_tax",
    formNumber: "941",
    jurisdiction: "Federal",
    entityTypes: ["c_corp", "s_corp", "partnership", "llc"],
    frequencyRule: "quarterly",
    relativeDueDate: "Q+1M", // Last day of month following quarter end
    description: "Employer's quarterly federal tax return",
    requirements: ["Payroll reports", "Wage and tax statements"],
    estimatedTime: 2,
    isActive: true,
  },
  {
    name: "Annual Federal Unemployment Tax (Form 940)",
    filingType: "payroll_tax",
    formNumber: "940",
    jurisdiction: "Federal",
    entityTypes: ["c_corp", "s_corp", "partnership", "llc"],
    frequencyRule: "annual",
    relativeDueDate: "01/31", // January 31
    description: "Federal unemployment (FUTA) tax return",
    requirements: ["Annual payroll report", "State unemployment filings"],
    estimatedTime: 2,
    isActive: true,
  },
  {
    name: "Corporate Tax Extension (Form 7004)",
    filingType: "tax_extension",
    formNumber: "7004",
    jurisdiction: "Federal",
    entityTypes: ["c_corp", "s_corp", "partnership"],
    frequencyRule: "annual",
    relativeDueDate: "FYE+3M+15D", // Same as original due date
    description: "Automatic extension of time to file business income tax return",
    requirements: ["Estimated tax liability"],
    estimatedTime: 1,
    isActive: true,
  },
];

// State tax deadline templates
export const stateTaxTemplates = [
  {
    name: "California Corporate Tax Return (Form 100)",
    filingType: "income_tax",
    formNumber: "100",
    jurisdiction: "California",
    entityTypes: ["c_corp"],
    frequencyRule: "annual",
    relativeDueDate: "FYE+4M+15D", // 4 months 15 days after FYE
    description: "California corporate franchise/income tax return",
    requirements: ["Federal return", "Apportionment schedule"],
    estimatedTime: 6,
    isActive: true,
  },
  {
    name: "California LLC Tax Return (Form 568)",
    filingType: "income_tax",
    formNumber: "568",
    jurisdiction: "California",
    entityTypes: ["llc", "llc_partnership", "llc_s_corp"],
    frequencyRule: "annual",
    relativeDueDate: "FYE+3M+15D",
    description: "California LLC tax return",
    requirements: ["Federal return", "K-1s", "Annual fee payment"],
    estimatedTime: 6,
    isActive: true,
  },
  {
    name: "California Annual Minimum Franchise Tax",
    filingType: "franchise_tax",
    formNumber: "3522",
    jurisdiction: "California",
    entityTypes: ["llc", "llc_partnership", "llc_s_corp"],
    frequencyRule: "annual",
    relativeDueDate: "04/15",
    description: "California LLC annual minimum franchise tax ($800)",
    requirements: ["Payment voucher"],
    estimatedTime: 1,
    isActive: true,
  },
  {
    name: "New York Corporate Tax Return (Form CT-3)",
    filingType: "income_tax",
    formNumber: "CT-3",
    jurisdiction: "New York",
    entityTypes: ["c_corp"],
    frequencyRule: "annual",
    relativeDueDate: "FYE+3M+15D",
    description: "New York corporate franchise tax return",
    requirements: ["Federal return", "Apportionment schedule"],
    estimatedTime: 6,
    isActive: true,
  },
  {
    name: "New York Partnership Tax Return (Form IT-204)",
    filingType: "income_tax",
    formNumber: "IT-204",
    jurisdiction: "New York",
    entityTypes: ["partnership", "llc_partnership"],
    frequencyRule: "annual",
    relativeDueDate: "FYE+3M+15D",
    description: "New York partnership return",
    requirements: ["Federal return", "K-1s"],
    estimatedTime: 6,
    isActive: true,
  },
  {
    name: "Texas Franchise Tax Report",
    filingType: "franchise_tax",
    formNumber: "05-158",
    jurisdiction: "Texas",
    entityTypes: ["c_corp", "s_corp", "llc", "partnership"],
    frequencyRule: "annual",
    relativeDueDate: "05/15", // May 15
    description: "Texas franchise tax (margin tax) report",
    requirements: ["Revenue report", "Cost of goods sold"],
    estimatedTime: 4,
    isActive: true,
  },
  {
    name: "Florida Corporate Income Tax (Form F-1120)",
    filingType: "income_tax",
    formNumber: "F-1120",
    jurisdiction: "Florida",
    entityTypes: ["c_corp"],
    frequencyRule: "annual",
    relativeDueDate: "FYE+4M",
    description: "Florida corporate income tax return",
    requirements: ["Federal return"],
    estimatedTime: 4,
    isActive: true,
  },
];

// Annual report templates
export const annualReportTemplates = [
  {
    name: "Delaware Annual Franchise Tax (Corporation)",
    filingType: "annual_report",
    formNumber: "Annual Franchise Tax",
    jurisdiction: "Delaware",
    entityTypes: ["c_corp", "s_corp"],
    frequencyRule: "annual",
    relativeDueDate: "03/01", // March 1
    description: "Delaware corporate annual franchise tax",
    requirements: ["Authorized shares", "Payment"],
    estimatedTime: 1,
    isActive: true,
  },
  {
    name: "Delaware Annual Tax (LLC)",
    filingType: "annual_report",
    formNumber: "Annual Tax",
    jurisdiction: "Delaware",
    entityTypes: ["llc"],
    frequencyRule: "annual",
    relativeDueDate: "06/01", // June 1
    description: "Delaware LLC annual tax ($300)",
    requirements: ["Payment"],
    estimatedTime: 1,
    isActive: true,
  },
  {
    name: "Wyoming Annual Report (LLC)",
    filingType: "annual_report",
    formNumber: "Annual Report",
    jurisdiction: "Wyoming",
    entityTypes: ["llc"],
    frequencyRule: "annual",
    relativeDueDate: "FORMATION_ANNIVERSARY",
    description: "Wyoming LLC annual report",
    requirements: ["Current address", "Registered agent", "$60 fee"],
    estimatedTime: 1,
    isActive: true,
  },
  {
    name: "Nevada Annual List (Corporation)",
    filingType: "annual_report",
    formNumber: "Annual List",
    jurisdiction: "Nevada",
    entityTypes: ["c_corp", "s_corp"],
    frequencyRule: "annual",
    relativeDueDate: "FORMATION_ANNIVERSARY",
    description: "Nevada corporate annual list",
    requirements: ["Officer/director list", "Filing fee"],
    estimatedTime: 1,
    isActive: true,
  },
  {
    name: "California Statement of Information (LLC)",
    filingType: "annual_report",
    formNumber: "SI-550",
    jurisdiction: "California",
    entityTypes: ["llc"],
    frequencyRule: "biennial", // Every 2 years
    relativeDueDate: "FORMATION_ANNIVERSARY",
    description: "California LLC Statement of Information",
    requirements: ["Member/manager info", "$20 fee"],
    estimatedTime: 1,
    isActive: true,
  },
];

// Sales tax templates (common states)
export const salesTaxTemplates = [
  {
    name: "California Sales Tax Return",
    filingType: "sales_tax",
    formNumber: "CDTFA-401",
    jurisdiction: "California",
    entityTypes: ["c_corp", "s_corp", "llc", "partnership"],
    frequencyRule: "quarterly",
    relativeDueDate: "Q+1M", // End of month following quarter
    description: "California sales and use tax return",
    requirements: ["Sales records by location"],
    estimatedTime: 2,
    isActive: true,
  },
  {
    name: "Texas Sales Tax Return",
    filingType: "sales_tax",
    formNumber: "01-114",
    jurisdiction: "Texas",
    entityTypes: ["c_corp", "s_corp", "llc", "partnership"],
    frequencyRule: "monthly",
    relativeDueDate: "MONTH+20D", // 20th of following month
    description: "Texas sales and use tax return",
    requirements: ["Sales records"],
    estimatedTime: 2,
    isActive: true,
  },
  {
    name: "Florida Sales Tax Return",
    filingType: "sales_tax",
    formNumber: "DR-15",
    jurisdiction: "Florida",
    entityTypes: ["c_corp", "s_corp", "llc", "partnership"],
    frequencyRule: "monthly",
    relativeDueDate: "MONTH+20D",
    description: "Florida sales and use tax return",
    requirements: ["Sales records"],
    estimatedTime: 2,
    isActive: true,
  },
  {
    name: "New York Sales Tax Return",
    filingType: "sales_tax",
    formNumber: "ST-100",
    jurisdiction: "New York",
    entityTypes: ["c_corp", "s_corp", "llc", "partnership"],
    frequencyRule: "quarterly",
    relativeDueDate: "Q+20D",
    description: "New York sales tax return",
    requirements: ["Sales records by county"],
    estimatedTime: 2,
    isActive: true,
  },
];

// BOI (Beneficial Ownership Information) - New FinCEN requirement
export const boiTemplates = [
  {
    name: "BOI Initial Report (FinCEN)",
    filingType: "boi_report",
    formNumber: "BOIR",
    jurisdiction: "Federal",
    entityTypes: ["llc", "c_corp", "s_corp"],
    frequencyRule: "one_time", // Due 90 days after formation for new entities
    relativeDueDate: "FORMATION+90D",
    description: "Beneficial Ownership Information Report (FinCEN)",
    requirements: ["Beneficial owner info", "Company applicant info", "ID documents"],
    estimatedTime: 2,
    isActive: true,
    metadata: {
      links: ["https://fincen.gov/boi"],
      notes: "Required for entities formed after Jan 1, 2024. Existing entities have until Jan 1, 2025.",
    },
  },
];

/**
 * Seed all compliance deadline templates into the database
 */
export async function seedComplianceTemplates() {
  try {
    console.log("🌱 Seeding compliance deadline templates...");

    const allTemplates = [
      ...federalTaxTemplates,
      ...stateTaxTemplates,
      ...annualReportTemplates,
      ...salesTaxTemplates,
      ...boiTemplates,
    ];

    // Check if templates already exist to avoid duplicates
    const existingTemplates = await db.select().from(deadlineTemplates);

    if (existingTemplates.length > 0) {
      console.log(`ℹ️  Found ${existingTemplates.length} existing templates. Skipping seed to avoid duplicates.`);
      console.log("   To re-seed, delete existing templates first.");
      return;
    }

    // Insert all templates
    for (const template of allTemplates) {
      await db.insert(deadlineTemplates).values(template);
    }

    console.log(`✅ Successfully seeded ${allTemplates.length} deadline templates:`);
    console.log(`   - Federal tax templates: ${federalTaxTemplates.length}`);
    console.log(`   - State tax templates: ${stateTaxTemplates.length}`);
    console.log(`   - Annual report templates: ${annualReportTemplates.length}`);
    console.log(`   - Sales tax templates: ${salesTaxTemplates.length}`);
    console.log(`   - BOI templates: ${boiTemplates.length}`);
  } catch (error) {
    console.error("❌ Failed to seed compliance templates:", error);
    throw error;
  }
}

// Self-executing when run directly
if (import.meta.url === import.meta.resolve('./seed-compliance-templates.ts')) {
  seedComplianceTemplates()
    .then(() => {
      console.log("🎉 Compliance template seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}
