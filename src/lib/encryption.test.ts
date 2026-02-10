import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "./encryption";
import crypto from "crypto";

describe("Encryption Utils", () => {
    beforeAll(() => {
        // Mock environment variable
        process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
    });

    it("should encrypt and decrypt a string correctly", () => {
        const originalText = "minha-senha-secreta-123";
        const encrypted = encrypt(originalText);
        
        expect(encrypted).not.toBe(originalText);
        expect(encrypted).toContain(":"); // Check format iv:tag:content

        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(originalText);
    });

    it("should return original text if input is empty", () => {
        expect(encrypt("")).toBe("");
        expect(decrypt("")).toBe("");
    });

    it("should return original text if format is invalid (legacy support)", () => {
        const plainText = "texto-nao-criptografado";
        expect(decrypt(plainText)).toBe(plainText);
    });
});
