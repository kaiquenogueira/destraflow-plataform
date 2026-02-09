import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const KEY_HEX = process.env.DATA_ENCRYPTION_KEY;

if (!KEY_HEX) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATA_ENCRYPTION_KEY is not defined in environment variables");
  }
  console.warn("⚠️ DATA_ENCRYPTION_KEY not found. Encryption will fail in production.");
}

const getKey = () => {
    if (!KEY_HEX) {
        throw new Error("DATA_ENCRYPTION_KEY is missing");
    }
    return Buffer.from(KEY_HEX, "hex");
};

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
 * Descriptografa uma string
 */
export function decrypt(text: string): string {
  if (!text) return text;
  
  // Se não tiver o formato esperado (iv:authTag:content), assume que não está criptografado
  // Isso permite migração gradual de dados legados
  if (!text.includes(":")) return text;
  
  try {
    const parts = text.split(":");
    if (parts.length !== 3) return text;
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    // Em caso de erro (chave errada, dados corrompidos), retorna o original ou lança erro?
    // Melhor lançar erro para não usar lixo como connection string
    throw new Error("Falha ao descriptografar dados");
  }
}
