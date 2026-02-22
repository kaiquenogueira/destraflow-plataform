import { prisma } from "../lib/prisma";
import { decrypt } from "../lib/encryption";

async function main() {
    const users = await prisma.crmUser.findMany({ select: { id: true, email: true, evolutionInstance: true } });
    for (const user of users) {
        let instance = "none";
        if (user.evolutionInstance) {
            try {
                instance = decrypt(user.evolutionInstance);
            } catch (e) {
                instance = "decryption failed";
            }
        }
        console.log(`User ${user.email} (${user.id}): ${instance}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
