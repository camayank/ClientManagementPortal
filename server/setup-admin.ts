import { db } from "@db";
import { users, roles, userRoles } from "@db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";

async function createAdmin() {
  const password = "Admin@123"; // This is the password to use
  const hashedPassword = await hashPassword(password);
  
  // Create admin user
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
  return adminUser;
}

createAdmin().catch(console.error);
