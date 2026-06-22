import { describe, expect, it } from "vitest";
import { OUTBOUND_AUDIT_TYPE, decodeChatEnvelope, encodeOutboundAudit } from "./chat-envelope";

describe("chat-envelope", () => {
    describe("decodeChatEnvelope", () => {
        it.each([
            [{ type: "system", content: "oi" }, "outgoing", "oi"],
            [{ type: "outgoing", content: "oi" }, "outgoing", "oi"],
            [{ type: "incoming", content: "oi" }, "incoming", "oi"],
            [{ type: "human", content: "oi" }, "incoming", "oi"],
            [{ content: "oi" }, "incoming", "oi"],
            [{ type: "system" }, "outgoing", ""],
            [null, "incoming", ""],
            [undefined, "incoming", ""],
        ] as const)("decodes %j → { %s, %j }", (raw, direction, text) => {
            expect(decodeChatEnvelope(raw)).toEqual({ direction, text });
        });

        it("never leaks a raw object as text (non-string content → empty string)", () => {
            const decoded = decodeChatEnvelope({ type: "system", content: { a: 1 } });
            expect(decoded).toEqual({ direction: "outgoing", text: "" });
            expect(decoded.text).not.toContain("{");
        });

        it("never leaks JSON for an unknown shape", () => {
            const decoded = decodeChatEnvelope({ foo: "bar" });
            expect(decoded).toEqual({ direction: "incoming", text: "" });
        });
    });

    describe("encodeOutboundAudit", () => {
        it("encodes with the single outbound discriminator", () => {
            expect(encodeOutboundAudit("hello")).toEqual({ type: OUTBOUND_AUDIT_TYPE, content: "hello" });
        });
    });

    describe("writer ↔ reader round-trip (crosses the seam)", () => {
        it("encodeOutboundAudit → decodeChatEnvelope yields outgoing + same text", () => {
            // Importa o MESMO discriminador usado pelo writer: renomear a tag quebra este teste.
            expect(decodeChatEnvelope(encodeOutboundAudit("x"))).toEqual({
                direction: "outgoing",
                text: "x",
            });
        });
    });
});
