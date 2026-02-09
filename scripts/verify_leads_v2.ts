
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

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        console.log("Checking data counts...");

        try {
            const leadsCount = await prisma.lead.count();
            console.log(`Leads table count: ${leadsCount}`);
        } catch (e) {
            console.error("Error counting leads:", e.message);
        }

        try {
            const usersCount = await prisma.whatsAppContact.count();
            console.log(`WhatsAppContact (users table) count: ${usersCount}`);
        } catch (e) {
            console.error("Error counting WhatsAppContacts:", e.message);
        }

    } catch (e) {
        console.error("General error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
