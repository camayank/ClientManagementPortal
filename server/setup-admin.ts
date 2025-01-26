import { db } from "@db";
import { users, roles, userRoles } from "@db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { migrateEnhancedRoles } from "../db/migrations/migrate-enhanced-roles";

async function setupSystem() {
  try {
    // Create admin user
    const password = "Admin@123"; // This is the password to use
    const hashedPassword = await hashPassword(password);

    // Create admin user if doesn't exist
    const [existingAdmin] = await db.select()
      .from(users)
      .where(eq(users.username, "admin@gmail.com"))
      .limit(1);

    if (!existingAdmin) {
      const [adminUser] = await db.insert(users)
        .values({
          username: "admin@gmail.com",
          password: hashedPassword,
          role: "admin",
          email: "admin@gmail.com"
        })
        .returning();

      // Get admin role
      const [adminRole] = await db.select()
        .from(roles)
        .where(eq(roles.name, "admin"))
        .limit(1);

      if (adminRole) {
        // Assign admin role
        await db.insert(userRoles)
          .values({
            userId: adminUser.id,
            roleId: adminRole.id
          });
      }

      console.log("Admin user created successfully");
    }

    // Migrate enhanced roles
    await migrateEnhancedRoles();
    console.log("Enhanced roles migration completed");

  } catch (error) {
    console.error("Setup failed:", error);
    throw error;
  }
}

setupSystem().catch(console.error);