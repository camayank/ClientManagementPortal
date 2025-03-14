import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "../db";
import { logger } from "../server/utils/logger";

async function main() {
  try {
    logger.info("Starting database migration...");
    await migrate(db, { migrationsFolder: "db/migrations" });
    logger.info("Migration completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
