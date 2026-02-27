import 'dotenv/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { prisma } from '../src/lib/prisma';
import { decrypt } from '../src/lib/encryption';

const execAsync = promisify(exec);

import { Client } from 'pg';

async function migrateTenant(dbUrl: string, email: string) {
    console.log(`\nMigrating tenant DB for user: ${email}`);

    // 1. Conectar via pg para injetar os novos valores no ENUM e atualizar
    const client = new Client({ connectionString: dbUrl });
    try {
        await client.connect();

        // Ignora erro se o valor já existir
        const addEnumValue = async (val: string) => {
            try {
                await client.query(`ALTER TYPE "LeadTag" ADD VALUE '${val}'`);
            } catch (e: any) {
                if (e.code !== '42710') { // 42710 = duplicate_object
                    console.log(`Warning adding ${val}:`, e.message);
                }
            }
        };

        await addEnumValue('NEW');
        await addEnumValue('QUALIFICATION');
        await addEnumValue('PROSPECTING');
        await addEnumValue('CALL');
        await addEnumValue('MEETING');
        await addEnumValue('RETURN');

        console.log("Updating old tags to new tags...");
        await client.query(`UPDATE "leads" SET "tag" = 'NEW' WHERE "tag" = 'COLD'`);
        await client.query(`UPDATE "leads" SET "tag" = 'PROSPECTING' WHERE "tag" = 'WARM'`);
        await client.query(`UPDATE "leads" SET "tag" = 'MEETING' WHERE "tag" = 'HOT'`);

        await client.end();
    } catch (e) {
        console.error("Erro no passo SQL manual para", email, e);
        await client.end();
    }

    // 2. Rodar o prisma db push para alinhar o schema final (e remover as antigas se Prisma suportar)
    const command = `npx prisma db push --schema=prisma/schema.tenant.prisma --accept-data-loss --url="${dbUrl}"`;
    const { stdout, stderr } = await execAsync(command, {
        env: { ...process.env },
    });
    console.log(`Success for ${email}`);
    console.log("Output:", stdout.slice(0, 200) + "...");
}

async function main() {
    console.log("Fetching users with databaseUrl...");
    const users = await prisma.crmUser.findMany({
        where: { databaseUrl: { not: null } },
    });

    console.log(`Found ${users.length} users with configured databases.`);

    for (const user of users) {
        if (!user.databaseUrl) continue;

        try {
            const dbUrl = decrypt(user.databaseUrl);
            await migrateTenant(dbUrl, user.email);
        } catch (error: any) {
            console.error(`Error migrating tenant for ${user.email}:`, error?.message || error);
        }
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
