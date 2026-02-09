
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
}

// Function to create a client for a specific URL
function createClient(url: string) {
    const pool = new pg.Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
}

// Main client (central)
const prisma = createClient(connectionString);

async function main() {
    try {
        console.log("Checking CrmUsers...");

        const users = await prisma.crmUser.findMany();
        console.log(`Found ${users.length} CrmUsers.`);

        for (const user of users) {
            console.log(`\nUser: ${user.email} (Role: ${user.role})`);
            const dbUrl = user.databaseUrl;

            if (!dbUrl) {
                console.log("  No databaseUrl configured.");
                continue;
            }

            console.log(`  Database URL: ${dbUrl === connectionString ? "Same as central" : "Different from central"}`);

            // Connect to tenant DB
            const tenantPrisma = (dbUrl === connectionString) ? prisma : createClient(dbUrl);

            try {
                const leadsCount = await tenantPrisma.lead.count();
                console.log(`  Leads count: ${leadsCount}`);

                const waContactsCount = await tenantPrisma.whatsAppContact.count();
                console.log(`  WhatsAppContact (users) count: ${waContactsCount}`);
            } catch (e) {
                console.error(`  Error checking tenant DB: ${e.message}`);
            } finally {
                if (dbUrl !== connectionString) {
                    await tenantPrisma.$disconnect();
                }
            }
        }

    } catch (e) {
        console.error("General error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
