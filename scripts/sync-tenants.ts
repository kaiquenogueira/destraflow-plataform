import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import { promisify } from "util";
import { createDecipheriv } from "crypto";
import * as dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Carregar variáveis de ambiente
dotenv.config();

const execAsync = promisify(exec);

// Configuração de criptografia
const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.DATA_ENCRYPTION_KEY;

if (!KEY_HEX) {
    throw new Error("DATA_ENCRYPTION_KEY is not defined");
}

function decrypt(text: string): string {
    if (!text || !text.includes(":")) {
        console.warn("⚠️ Formato inválido de string criptografada:", text);
        return text; // Tenta retornar como está se não estiver criptografado corretamente
    }
    const parts = text.split(":");
    if (parts.length !== 3) {
         console.warn("⚠️ Formato inválido de partes criptografadas:", text);
         return text;
    }
    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, Buffer.from(KEY_HEX!, "hex"), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

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
                const connectionString = decrypt(user.databaseUrl);
                
                // Mascarar a senha no log
                const maskedUrl = connectionString.replace(/:([^:@]+)@/, ":****@");
                console.log(`   URL: ${maskedUrl}`);

                // Executar prisma db push para este banco
                console.log("   🚀 Executando push...");
                
                // Usamos a flag --url para passar a conexão do tenant diretamente
                const { stdout, stderr } = await execAsync(`npx prisma db push --schema=prisma/schema.tenant.prisma --url="${connectionString}"`, {
                    env: { ...process.env }
                });

                if (stdout) console.log(`   ✅ Sucesso:\n${stdout.trim().split('\n').map(l => '      ' + l).join('\n')}`);
                if (stderr) console.error(`   ⚠️  Avisos/Erros:\n${stderr.trim().split('\n').map(l => '      ' + l).join('\n')}`);

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
