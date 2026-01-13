import { db } from "../lib/db";
import { user } from "../db/schema";
import { eq } from "drizzle-orm";

async function seedUsers() {
  console.log("🌱 Seeding users via API...");

  const users = [
    { name: "Admin User", email: "admin@example.com", password: "password123", role: "admin" },
    { name: "Manager User", email: "manager@example.com", password: "password123", role: "manager" },
    { name: "Regular User", email: "user@example.com", password: "password123", role: "user" },
  ];

  for (const userData of users) {
    try {
      const response = await fetch("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Origin": "http://localhost:3000"
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        console.log(`✅ Created ${userData.role}: ${userData.email}`);
        
        // Update role in database
        await db.update(user)
          .set({ role: userData.role as "user" | "manager" | "admin" })
          .where(eq(user.email, userData.email));
      } else {
        const error = await response.text();
        console.log(`⚠️  ${userData.email}: ${error}`);
      }
    } catch (error: any) {
      console.error(`❌ Error creating ${userData.email}:`, error.message);
    }
  }

  console.log("\n🎉 Seeding complete!");
  console.log("📝 Login credentials:");
  console.log("   Email: admin@example.com, manager@example.com, or user@example.com");
  console.log("   Password: password123");
  
  process.exit(0);
}

seedUsers();
