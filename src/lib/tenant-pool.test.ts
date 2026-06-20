import { describe, it, expect, vi } from "vitest";
import { createTenantPoolCache, type TenantPoolCache } from "./tenant-pool";
import type { PrismaClient as TenantPrismaClient } from "@/generated/prisma/tenant";

// Fake client identificável por chamada — não precisamos de pg real.
function fakeClientFactory() {
    let n = 0;
    return vi.fn(() => ({ id: ++n }) as unknown as TenantPrismaClient);
}

function conn(tenantId: string, encryptedUrl = `enc-${tenantId}`) {
    return { tenantId, encryptedUrl };
}

describe("tenant-pool — TenantPoolCache", () => {
    it("cache hit pela identidade do tenant: cria 1x e reusa", () => {
        const create = fakeClientFactory();
        const cache: TenantPoolCache = createTenantPoolCache({ create });

        const a = cache.getOrCreate(conn("t1"));
        const b = cache.getOrCreate(conn("t1"));

        expect(create).toHaveBeenCalledTimes(1);
        expect(a).toBe(b);
        expect(cache.size()).toBe(1);
        expect(cache.has("t1")).toBe(true);
    });

    it("identidade estável: mesma tenantId com encryptedUrl diferente ainda é 1 pool", () => {
        const create = fakeClientFactory();
        const cache = createTenantPoolCache({ create });

        cache.getOrCreate(conn("t1", "enc-a?x=1"));
        cache.getOrCreate(conn("t1", "enc-a?x=1&"));

        expect(create).toHaveBeenCalledTimes(1);
        expect(cache.size()).toBe(1);
    });

    it("respeita o cap: 11 tenants distintos com capacity=10 => size 10", () => {
        const create = fakeClientFactory();
        const cache = createTenantPoolCache({ create, capacity: 10 });

        for (let i = 1; i <= 11; i++) cache.getOrCreate(conn(`t${i}`));

        expect(cache.size()).toBe(10);
    });

    it("evicção LRU + teardown: tocar t1 antes de inserir t11 evicta t2 (onEvict 1x)", () => {
        const create = fakeClientFactory(); // t1 => {id:1}, t2 => {id:2}, ...
        const onEvict = vi.fn();
        const cache = createTenantPoolCache({ create, capacity: 10, onEvict });

        for (let i = 1; i <= 10; i++) cache.getOrCreate(conn(`t${i}`)); // t1..t10
        cache.getOrCreate(conn("t1")); // toca t1 => agora t2 é o mais antigo
        cache.getOrCreate(conn("t11")); // estoura cap => evicta t2

        expect(onEvict).toHaveBeenCalledTimes(1);
        expect(onEvict).toHaveBeenCalledWith({ id: 2 }); // o client de t2
        expect(cache.has("t2")).toBe(false);
        expect(cache.has("t1")).toBe(true);
        expect(cache.has("t11")).toBe(true);
        expect(cache.size()).toBe(10);
    });

    it("get não cria; capacity é exposto", () => {
        const create = fakeClientFactory();
        const cache = createTenantPoolCache({ create, capacity: 5 });

        expect(cache.get("t1")).toBeUndefined();
        expect(create).not.toHaveBeenCalled();
        expect(cache.capacity).toBe(5);
    });
});
