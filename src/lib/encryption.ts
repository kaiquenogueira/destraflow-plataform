import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

const getKey = () => {
    const key = process.env.DATA_ENCRYPTION_KEY;
    if (!key) {
        throw new Error("DATA_ENCRYPTION_KEY is missing");
    }
    return Buffer.from(key, "hex");
};

/**
 * Gera um hash SHA-256 de uma string (para busca exata sem revelar o dado)
 */
export function hashString(text: string): string {
    if (!text) return "";
    return createHash("sha256").update(text).digest("hex");
}

/**
 * Criptografa uma string
 * Formato de saída: iv:authTag:encryptedData (tudo em hex)
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  try {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, getKey(), iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag().toString("hex");
    
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Falha ao criptografar dados");
  }
}

/**
 * Retorna true se a string tem o shape ciphertext iv:authTag:content
 * (exatamente 3 partes hexadecimais não-vazias). É a política única de
 * "isto parece criptografado" — usada por decrypt (tolerante) e decryptSecret (estrito).
 */
export function isCiphertext(text: string): boolean {
  if (!text) return false;
  const parts = text.split(":");
  return parts.length === 3 && parts.every((p) => /^[0-9a-f]+$/i.test(p) && p.length > 0);
}

/**
 * Núcleo de decifragem AES-256-GCM. Assume que já recebeu ciphertext válido
 * (iv:authTag:content) — NUNCA repassa texto plano; lança em chave/dados inválidos.
 */
function decryptCipher(text: string): string {
  try {
    const [ivHex, authTagHex, encryptedHex] = text.split(":");

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, getKey(), iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    // Lança para não usar lixo como connection string.
    throw new Error("Falha ao descriptografar dados");
  }
}

/**
 * Descriptografa TOLERANDO dados legados em texto plano (passthrough se não for
 * ciphertext). NÃO use para credenciais que abrem conexão — use decryptSecret.
 * Mantido para campos em migração gradual (evolutionInstance/evolutionApiKey,
 * edição de admin).
 */
export function decrypt(text: string): string {
  if (!isCiphertext(text)) return text; // vazio / sem ":" / != 3 partes hex => verbatim (legado)
  return decryptCipher(text);
}

/**
 * Decifra um segredo que DEVE estar em ciphertext (iv:authTag:content).
 * Lança se o valor estiver vazio ou não for ciphertext — NUNCA repassa texto plano.
 * Use para credenciais que vão abrir conexões (databaseUrl).
 */
export function decryptSecret(text: string): string {
  if (!isCiphertext(text)) {
    throw new Error("Credencial não está em formato criptografado (esperado iv:authTag:content)");
  }
  return decryptCipher(text);
}
