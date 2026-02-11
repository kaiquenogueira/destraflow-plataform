
import { decrypt, hashString } from "../src/lib/encryption";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  // Import prisma after dotenv.config() has run to ensure DATABASE_URL is set
  const { prisma } = await import("../src/lib/prisma");

  try {
    console.log("Starting backfill of evolutionInstanceHash...");

    // Find all users who have an evolutionInstance set but no hash
    const usersToUpdate = await prisma.crmUser.findMany({
      where: {
        evolutionInstance: { not: null },
        evolutionInstanceHash: null,
      },
    });

    console.log(`Found ${usersToUpdate.length} users to update.`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const user of usersToUpdate) {
      try {
        if (!user.evolutionInstance) continue;

        const instanceName = decrypt(user.evolutionInstance);
        const hash = hashString(instanceName);

        await prisma.crmUser.update({
          where: { id: user.id },
          data: { evolutionInstanceHash: hash },
        });

        console.log(`Updated user ${user.email} with hash for instance: ${instanceName}`);
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update user ${user.email}:`, error);
        errorCount++;
      }
    }

    console.log("Backfill complete.");
    console.log(`Success: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);

  } catch (error) {
    console.error("Fatal error in main:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
