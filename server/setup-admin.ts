import { db } from "@db";
import { users, roles, userRoles } from "@db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { migrateEnhancedRoles } from "../db/migrations/migrate-enhanced-roles";

async function setupSystem() {
  try {
    // Create admin user if doesn't exist
    const adminPassword = "Admin@123";
    const hashedAdminPassword = await hashPassword(adminPassword);

    const [existingAdmin] = await db.select()
      .from(users)
      .where(eq(users.username, "admin@gmail.com"))
      .limit(1);

    if (!existingAdmin) {
      const [adminUser] = await db.insert(users)
        .values({
          username: "admin@gmail.com",
          password: hashedAdminPassword,
          role: "admin",
          email: "admin@gmail.com",
          fullName: "System Administrator"
        })
        .returning();

      // Get admin role
      const [adminRole] = await db.select()
        .from(roles)
        .where(eq(roles.name, "admin"))
        .limit(1);

      if (adminRole) {
        await db.insert(userRoles)
          .values({
            userId: adminUser.id,
            roleId: adminRole.id
          });
      }

      console.log("Admin user created successfully");
    }

    // Create client user if doesn't exist
    const clientPassword = "Client@123";
    const hashedClientPassword = await hashPassword(clientPassword);

    const [existingClient] = await db.select()
      .from(users)
      .where(eq(users.username, "client@gmail.com"))
      .limit(1);

    if (!existingClient) {
      const [clientUser] = await db.insert(users)
        .values({
          username: "client@gmail.com",
          password: hashedClientPassword,
          role: "client",
          email: "client@gmail.com",
          fullName: "Default Client"
        })
        .returning();

      // Get client role
      const [clientRole] = await db.select()
        .from(roles)
        .where(eq(roles.name, "client"))
        .limit(1);

      if (clientRole) {
        await db.insert(userRoles)
          .values({
            userId: clientUser.id,
            roleId: clientRole.id
          });
      }

      console.log("Client user created successfully");
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