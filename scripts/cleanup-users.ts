import { db } from "../lib/db";
import { user, account } from "../db/schema";
import { inArray } from "drizzle-orm";

async function cleanupUsers() {
  console.log("🧹 Cleaning up test users...");

  const emails = ["admin@example.com", "manager@example.com", "user@example.com"];

  try {
    // Delete accounts first (foreign key constraint)
    const usersToDelete = await db.select().from(user).where(inArray(user.email, emails));
    const userIds = usersToDelete.map(u => u.id);
    
    if (userIds.length > 0) {
      await db.delete(account).where(inArray(account.userId, userIds));
      await db.delete(user).where(inArray(user.id, userIds));
      console.log(`✅ Deleted ${userIds.length} users`);
    } else {
      console.log("ℹ️  No users to delete");
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }

  process.exit(0);
}

cleanupUsers();
