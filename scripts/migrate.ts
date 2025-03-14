import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "../db";

async function main() {
  console.log("Starting database migration...");

  try {
    await migrate(db, { migrationsFolder: "db/migrations" });
    console.log("Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();