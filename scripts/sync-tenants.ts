import { PrismaClient } from "@prisma/client";
import { execFile } from "child_process";
import { promisify } from "util";
import * as dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
// Estrito: nunca abrir conexão de tenant com texto plano (ADR-0007). Sem crypto hand-rolled.
import { decryptSecret } from "../src/lib/encryption";

// Carregar variáveis de ambiente
dotenv.config();

const execFileAsync = promisify(execFile);

function createPrismaClient(url: string) {
    const pool = new pg.Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
}

async function main() {
    console.log("🔄 Iniciando sincronização dos bancos de dados dos tenants...");

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL não definida");
    }

    // Conectar ao banco central usando o adapter (necessário pois o schema usa driverAdapters)
    const prisma = createPrismaClient(process.env.DATABASE_URL);

    try {
        // Buscar todos os usuários com banco configurado
        const users = await prisma.crmUser.findMany({
            where: {
                databaseUrl: { not: null }
            },
            select: {
                id: true,
                email: true,
                databaseUrl: true
            }
        });

        console.log(`📋 Encontrados ${users.length} tenants com banco configurado.`);

        for (const user of users) {
            if (!user.databaseUrl) continue;

            console.log(`\n🔹 Processando tenant: ${user.email} (${user.id})`);

            try {
                const connectionString = decryptSecret(user.databaseUrl);
                // Não logar a connection string (segredo), nem mascarada.

                // Executar prisma db push para este banco
                console.log("   🚀 Executando push...");
                
                // Usamos a flag --url para passar a conexão do tenant diretamente
                // Use execFile to prevent shell injection
                const args = [
                    'prisma', 
                    'db', 
                    'push', 
                    '--schema=prisma/schema.tenant.prisma', 
                    `--url=${connectionString}`
                ];

                const { stdout, stderr } = await execFileAsync('npx', args, {
                    env: { ...process.env },
                    shell: false
                });

                if (stdout) console.log(`   ✅ Sucesso:\n${stdout.trim().split('\n').map((l: string) => '      ' + l).join('\n')}`);
                if (stderr) console.error(`   ⚠️  Avisos/Erros:\n${stderr.trim().split('\n').map((l: string) => '      ' + l).join('\n')}`);

            } catch (error) {
                console.error(`   ❌ Erro ao sincronizar tenant ${user.email}:`, error);
            }
        }

        console.log("\n✨ Sincronização concluída!");

    } catch (error) {
        console.error("❌ Erro fatal:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
