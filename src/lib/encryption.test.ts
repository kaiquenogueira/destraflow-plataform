import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt, decryptSecret, isCiphertext } from "./encryption";
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

    describe("isCiphertext", () => {
        it("é false para vazio, sem ':' e URL Postgres (múltiplos ':', não-hex)", () => {
            expect(isCiphertext("")).toBe(false);
            expect(isCiphertext("texto-sem-dois-pontos")).toBe(false);
            expect(isCiphertext("postgresql://u:p@h:5432/db")).toBe(false);
            expect(isCiphertext("aabb:ccdd")).toBe(false); // só 2 partes (authTag perdido)
        });

        it("é true para 3 partes hex e para a saída real de encrypt()", () => {
            expect(isCiphertext("aabb:ccdd:eeff")).toBe(true);
            expect(isCiphertext(encrypt("x"))).toBe(true);
        });
    });

    describe("decryptSecret (estrito — para credenciais de conexão)", () => {
        it("decifra um segredo realmente criptografado", () => {
            const url = "postgresql://u:p@h:5432/db";
            expect(decryptSecret(encrypt(url))).toBe(url);
        });

        it("LANÇA em URL Postgres em texto plano (nenhum pool é aberto com não-ciphertext)", () => {
            expect(() => decryptSecret("postgresql://u:p@h:5432/db")).toThrow(
                /não está em formato criptografado/
            );
        });

        it("LANÇA em string vazia", () => {
            expect(() => decryptSecret("")).toThrow();
        });

        it("LANÇA em ciphertext hex com chave/dados inválidos", () => {
            expect(() => decryptSecret("aabb:ccdd:eeff")).toThrow();
        });
    });

    describe("decrypt (tolerante — regressão da semântica legada)", () => {
        it("passthrough para vazio, texto plano e URL Postgres (ramo legado)", () => {
            expect(decrypt("")).toBe("");
            expect(decrypt("texto-nao-criptografado")).toBe("texto-nao-criptografado");
            expect(decrypt("postgresql://u:p@h:5432/db")).toBe("postgresql://u:p@h:5432/db");
        });

        it("decifra a saída real de encrypt()", () => {
            expect(decrypt(encrypt("x"))).toBe("x");
        });
    });
});
