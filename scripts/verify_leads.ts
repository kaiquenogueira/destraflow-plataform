
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to database...');

        // Count Leads
        const leadsCount = await prisma.lead.count();
        console.log(`Leads count: ${leadsCount}`);

        // Count WhatsApp Contacts (users table)
        // Note: The model is named WhatsAppContact in schema, but mapped to 'users' table
        // I need to check if WhatsAppContact is exported from client.
        // Based on schema, it should be.
        const usersCount = await prisma.whatsAppContact.count();
        console.log(`WhatsApp Contacts (users table) count: ${usersCount}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
