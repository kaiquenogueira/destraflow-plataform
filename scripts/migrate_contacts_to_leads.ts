
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

function createClient(url: string) {
    const pool = new pg.Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
}

const prisma = createClient(connectionString);

async function main() {
    try {
        console.log("Starting FAST migration: Contacts -> Leads...");

        const users = await prisma.crmUser.findMany();
        console.log(`Found ${users.length} CrmUsers.`);

        for (const user of users) {
            console.log(`\nProcessing User: ${user.email}`);
            const dbUrl = user.databaseUrl;

            if (!dbUrl) {
                console.log("  No databaseUrl configured. Skiping.");
                continue;
            }

            const tenantPrisma = (dbUrl === connectionString) ? prisma : createClient(dbUrl);

            try {
                const contacts = await tenantPrisma.whatsAppContact.findMany();
                console.log(`  Found ${contacts.length} contacts.`);

                // Fetch all existing leads phones
                const existingLeads = await tenantPrisma.lead.findMany({
                    select: { phone: true }
                });
                const existingLeadPhones = new Set(existingLeads.map(l => l.phone));
                console.log(`  Found ${existingLeads.length} existing leads.`);

                const newLeadsData = contacts
                    .filter(c => c.whatsapp && !existingLeadPhones.has(c.whatsapp))
                    .map(c => ({
                        name: c.name || c.whatsapp || "Unknown",
                        phone: c.whatsapp!,
                        tag: "COLD", // Enum value as string
                        interest: "Migrated from WhatsApp Contact"
                    }));

                if (newLeadsData.length > 0) {
                    console.log(`  Preparing to insert ${newLeadsData.length} new leads...`);
                    try {
                        // Try batch insert
                        const result = await tenantPrisma.lead.createMany({
                            data: newLeadsData,
                            skipDuplicates: true
                        });
                        console.log(`  Successfully migrated ${result.count} leads.`);
                    } catch (batchError) {
                        console.error("  Batch insert failed, fallback to sequential:", batchError.message);
                        // Fallback if createMany fails (e.g. some constraint)
                        let count = 0;
                        for (const lead of newLeadsData) {
                            try {
                                await tenantPrisma.lead.create({ data: lead });
                                count++;
                            } catch (e) { }
                        }
                        console.log(`  Sequentially migrated ${count} leads.`);
                    }
                } else {
                    console.log("  No new leads to migrate.");
                }

            } catch (e) {
                console.error(`  Error processing tenant: ${e.message}`);
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
