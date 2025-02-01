import { migrateRoles } from './migrate-roles';
import { migrateEnhancedRoles } from './migrate-enhanced-roles';
import { migrateCPARoles } from './migrate-cpa-roles';

export async function runMigrations() {
  try {
    console.log('Starting migrations...');

    // Run base role migration first
    await migrateRoles();
    console.log('Base roles migration completed');

    // Run enhanced roles migration
    await migrateEnhancedRoles();
    console.log('Enhanced roles migration completed');

    // Run CPA specific roles migration
    await migrateCPARoles();
    console.log('CPA roles migration completed');

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Self-executing async function when file is run directly
if (import.meta.url === import.meta.resolve('./index.ts')) {
  runMigrations()
    .then(() => {
      console.log('Migrations completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}