import { PrismaClient } from "@prisma/client";
import { decrypt, hashString } from "../src/lib/encryption";
import * as dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Iniciando migração de hashes de instância...");

    const users = await prisma.crmUser.findMany({
        where: {
            evolutionInstanceHash: null,
            evolutionInstance: { not: null }
        },
        select: {
            id: true,
            evolutionInstance: true
        }
    });

    console.log(`Encontrados ${users.length} usuários para migrar.`);

    let success = 0;
    let errors = 0;

    for (const user of users) {
        try {
            if (!user.evolutionInstance) continue;

            const instanceName = decrypt(user.evolutionInstance);
            const hash = hashString(instanceName);

            await prisma.crmUser.update({
                where: { id: user.id },
                data: { evolutionInstanceHash: hash }
            });

            success++;
            process.stdout.write(".");
        } catch (error) {
            console.error(`\nErro ao migrar usuário ${user.id}:`, error);
            errors++;
        }
    }

    console.log(`\n\nMigração concluída!`);
    console.log(`Sucesso: ${success}`);
    console.log(`Erros: ${errors}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
