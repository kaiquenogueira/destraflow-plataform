import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";
import { decrypt, hashString, isCiphertext } from "./encryption";
import {
    encryptTenantCredentials,
    decryptTenantCredentials,
    decryptEvolutionPair,
    rehashEncryptedInstance,
} from "./tenant-credentials";

describe("tenant-credentials codec", () => {
    beforeAll(() => {
        process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
    });

    describe("encryptTenantCredentials", () => {
        it("emite apenas as chaves fornecidas (update parcial preservado)", () => {
            const out = encryptTenantCredentials({ evolutionApiKey: "k" });
            expect(Object.keys(out)).toEqual(["evolutionApiKey"]);
            expect("databaseUrl" in out).toBe(false);
            expect("evolutionInstance" in out).toBe(false);
            expect("evolutionInstanceHash" in out).toBe(false);
        });

        it("PAREIA evolutionInstance com evolutionInstanceHash sempre que a instância é fornecida", () => {
            const out = encryptTenantCredentials({ evolutionInstance: "minha-instancia" });
            expect(out.evolutionInstance).toBeDefined();
            expect(isCiphertext(out.evolutionInstance!)).toBe(true);
            expect(out.evolutionInstanceHash).toBe(hashString("minha-instancia"));
            // round-trip do ciphertext
            expect(decrypt(out.evolutionInstance!)).toBe("minha-instancia");
        });

        it("instância vazia => ciphertext vazio e hash null (nunca hash órfão)", () => {
            const out = encryptTenantCredentials({ evolutionInstance: "" });
            expect(out.evolutionInstance).toBe("");
            expect(out.evolutionInstanceHash).toBeNull();
        });

        it("evolutionApiKey truthy => ciphertext; vazio => null", () => {
            expect(isCiphertext(encryptTenantCredentials({ evolutionApiKey: "abc" }).evolutionApiKey!)).toBe(true);
            expect(encryptTenantCredentials({ evolutionApiKey: "" }).evolutionApiKey).toBeNull();
        });

        it("databaseUrl é criptografado e faz round-trip", () => {
            const url = "postgresql://u:p@h:5432/db";
            const out = encryptTenantCredentials({ databaseUrl: url });
            expect(isCiphertext(out.databaseUrl!)).toBe(true);
            expect(decrypt(out.databaseUrl!)).toBe(url);
        });

        it("trio completo (estilo createUser) emite os 4 campos com pareamento", () => {
            const out = encryptTenantCredentials({
                databaseUrl: "postgresql://u:p@h:5432/db",
                evolutionInstance: "inst",
                evolutionApiKey: "key",
            });
            expect(Object.keys(out).sort()).toEqual(
                ["databaseUrl", "evolutionApiKey", "evolutionInstance", "evolutionInstanceHash"].sort(),
            );
            expect(out.evolutionInstanceHash).toBe(hashString("inst"));
        });
    });

    describe("decryptTenantCredentials (exibição)", () => {
        it("round-trip do trio para strings; ausente => ''", () => {
            const enc = encryptTenantCredentials({
                databaseUrl: "postgresql://u:p@h:5432/db",
                evolutionInstance: "inst",
                evolutionApiKey: "key",
            });
            const dec = decryptTenantCredentials({
                databaseUrl: enc.databaseUrl,
                evolutionInstance: enc.evolutionInstance,
                evolutionApiKey: enc.evolutionApiKey,
            });
            expect(dec).toEqual({
                databaseUrl: "postgresql://u:p@h:5432/db",
                evolutionInstance: "inst",
                evolutionApiKey: "key",
            });
        });

        it("campos null/undefined viram '' (forma do formulário admin)", () => {
            expect(decryptTenantCredentials({})).toEqual({
                databaseUrl: "",
                evolutionInstance: "",
                evolutionApiKey: "",
            });
        });
    });

    describe("decryptEvolutionPair (uso do cliente)", () => {
        it("apiKey é undefined quando ausente, decriptado quando presente", () => {
            const enc = encryptTenantCredentials({ evolutionInstance: "inst", evolutionApiKey: "key" });
            expect(decryptEvolutionPair({ evolutionInstance: enc.evolutionInstance, evolutionApiKey: enc.evolutionApiKey }))
                .toEqual({ instanceName: "inst", apiKey: "key" });

            const noKey = encryptTenantCredentials({ evolutionInstance: "inst" });
            expect(decryptEvolutionPair({ evolutionInstance: noKey.evolutionInstance, evolutionApiKey: null }))
                .toEqual({ instanceName: "inst", apiKey: undefined });
        });
    });

    describe("rehashEncryptedInstance (reparo)", () => {
        it("re-deriva o hash a partir do ciphertext da instância", () => {
            const enc = encryptTenantCredentials({ evolutionInstance: "inst" });
            expect(rehashEncryptedInstance(enc.evolutionInstance!)).toBe(hashString("inst"));
            expect(rehashEncryptedInstance(enc.evolutionInstance!)).toBe(enc.evolutionInstanceHash);
        });
    });
});
