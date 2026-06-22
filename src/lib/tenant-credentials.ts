import { encrypt, decrypt, hashString } from "@/lib/encryption";

/**
 * Codec puro das credenciais de tenant armazenadas no `CrmUser` (CRM DB).
 *
 * Dono ÚNICO de três conhecimentos que antes viviam espalhados em ações e
 * Server Components:
 *  1. Qual é o conjunto de campos secretos: `databaseUrl`, `evolutionInstance`,
 *     `evolutionApiKey` (o `evolutionPhone` NÃO é criptografado e fica fora daqui).
 *  2. A invariante de pareamento `evolutionInstance` ↔ `evolutionInstanceHash`:
 *     o hash de busca exata é SEMPRE derivado junto com o ciphertext da instância,
 *     nunca em separado — fechando a classe de bug que exigiu scripts de reparo.
 *  3. Como cada campo é decriptado para cada consumo (exibição vs. uso).
 *
 * NÃO abre pool, NÃO cria cliente Evolution, NÃO faz rede — é transformação pura
 * de colunas. Por isso é DISTINTO do "resolver de tenant gordo" rejeitado em
 * ADR-0005 R1 (que forçaria over-fetch de pool/cliente/rede). A decriptação
 * ESTRITA de `databaseUrl` que abre conexão continua sendo responsabilidade do
 * seam de conexão (`decryptSecret` em `prisma.ts` / `tenant-sync.ts`), não deste codec.
 */

/** Entrada plaintext para escrita. Chave ausente (`undefined`) = campo não tocado. */
export interface TenantCredentialInput {
    databaseUrl?: string;
    evolutionInstance?: string;
    evolutionApiKey?: string;
}

/** Campos prontos para gravar no `CrmUser` (já criptografados / hasheados). */
export interface EncryptedTenantCredentials {
    databaseUrl?: string;
    evolutionInstance?: string;
    evolutionInstanceHash?: string | null;
    evolutionApiKey?: string | null;
}

/** Shape mínimo lido do `CrmUser` para decriptar. */
export interface StoredTenantCredentials {
    databaseUrl?: string | null;
    evolutionInstance?: string | null;
    evolutionApiKey?: string | null;
}

/**
 * Criptografa as credenciais fornecidas. Só emite as chaves presentes na entrada
 * (chave `undefined` = não tocar → preserva semântica de update parcial). Sempre
 * que `evolutionInstance` é fornecido, `evolutionInstanceHash` é emitido junto
 * (hash quando há valor; `null` quando vazio) — pareamento impossível de esquecer.
 */
export function encryptTenantCredentials(
    input: TenantCredentialInput,
): EncryptedTenantCredentials {
    const out: EncryptedTenantCredentials = {};

    if (input.databaseUrl !== undefined) {
        out.databaseUrl = encrypt(input.databaseUrl);
    }

    if (input.evolutionInstance !== undefined) {
        const instance = input.evolutionInstance;
        out.evolutionInstance = encrypt(instance);
        out.evolutionInstanceHash = instance ? hashString(instance) : null;
    }

    if (input.evolutionApiKey !== undefined) {
        out.evolutionApiKey = input.evolutionApiKey ? encrypt(input.evolutionApiKey) : null;
    }

    return out;
}

/**
 * Decripta o trio para EXIBIÇÃO/EDIÇÃO (ex.: formulário de admin). Tudo string;
 * `""` quando o campo está vazio/ausente. Usa `decrypt` tolerante porque esses
 * valores não abrem conexão — só preenchem a UI.
 */
export function decryptTenantCredentials(user: StoredTenantCredentials): {
    databaseUrl: string;
    evolutionInstance: string;
    evolutionApiKey: string;
} {
    return {
        databaseUrl: decrypt(user.databaseUrl ?? ""),
        evolutionInstance: decrypt(user.evolutionInstance ?? ""),
        evolutionApiKey: decrypt(user.evolutionApiKey ?? ""),
    };
}

/**
 * Decripta APENAS o par Evolution para USO (montar o cliente). `apiKey` é
 * `undefined` quando ausente — o shape que `createEvolutionClient(instance, apiKey?)`
 * espera. Não decripta `databaseUrl` (que tem seam estrito próprio).
 */
export function decryptEvolutionPair(user: StoredTenantCredentials): {
    instanceName: string;
    apiKey?: string;
} {
    return {
        instanceName: decrypt(user.evolutionInstance ?? ""),
        apiKey: user.evolutionApiKey ? decrypt(user.evolutionApiKey) : undefined,
    };
}

/**
 * Re-deriva o `evolutionInstanceHash` a partir do ciphertext armazenado da
 * instância (decripta → hasheia). Único ponto que o script de reparo usa para
 * consertar linhas legadas onde o pareamento se perdeu.
 */
export function rehashEncryptedInstance(encryptedInstance: string): string {
    return hashString(decrypt(encryptedInstance));
}
