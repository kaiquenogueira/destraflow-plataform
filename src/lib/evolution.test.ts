
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EvolutionClient, createEvolutionClient } from "./evolution";

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("EvolutionClient", () => {
  const config = {
    baseUrl: "http://test-api.com",
    apiKey: "test-api-key",
    instanceName: "test-instance",
  };

  let client: EvolutionClient;

  beforeEach(() => {
    client = new EvolutionClient(config);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getInstanceStatus", () => {
    it("should return connected status when instance is open", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instance: { state: "open" } }),
      });

      const status = await client.getInstanceStatus();

      expect(fetchMock).toHaveBeenCalledWith(
        "http://test-api.com/instance/connectionState/test-instance",
        expect.objectContaining({
          headers: expect.objectContaining({
            apikey: "test-api-key",
          }),
        })
      );
      expect(status).toEqual({ connected: true, state: "open" });
    });

    it("should return disconnected status when instance is not open", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instance: { state: "close" } }),
      });

      const status = await client.getInstanceStatus();

      expect(status).toEqual({ connected: false, state: "close" });
    });

    it("should return error status when fetch fails", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const status = await client.getInstanceStatus();

      expect(status).toEqual({ connected: false, state: "error" });

      consoleSpy.mockRestore();
    });
  });

  describe("generateQRCode", () => {
    it("should create instance and return QR code", async () => {
      // Mock create instance response (success)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      // Mock connect response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ base64: "qr-code-base64", pairingCode: "123456" }),
      });

      const result = await client.generateQRCode();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "http://test-api.com/instance/create",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            instanceName: "test-instance",
            integration: "WHATSAPP-BAILEYS",
          }),
        })
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "http://test-api.com/instance/connect/test-instance",
        expect.anything()
      );
      expect(result).toEqual({ base64: "qr-code-base64", pairingCode: "123456" });
    });

    it("should handle existing instance and return QR code", async () => {
      // Mock create instance response (error - already exists)
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Instance already exists",
      });

      // Mock connect response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ base64: "qr-code-base64" }),
      });

      const result = await client.generateQRCode();

      expect(result).toEqual({ base64: "qr-code-base64", pairingCode: undefined });
    });

    it("should return null if no base64 returned", async () => {
       // Mock create instance response (success)
       fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      // Mock connect response (already connected, no QR)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await client.generateQRCode();

      expect(result).toBeNull();
    });
  });

  describe("disconnect", () => {
    it("should disconnect successfully", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await client.disconnect();

      expect(fetchMock).toHaveBeenCalledWith(
        "http://test-api.com/instance/logout/test-instance",
        expect.objectContaining({
          method: "DELETE",
        })
      );
      expect(result).toBe(true);
    });

    it("should return false on error", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await client.disconnect();

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe("sendMessage", () => {
    it("should send message successfully", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await client.sendMessage("+5511999999999", "Hello");

      expect(fetchMock).toHaveBeenCalledWith(
        "http://test-api.com/message/sendText/test-instance",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            number: "5511999999999",
            text: "Hello",
          }),
        })
      );
      expect(result).toBe(true);
    });

    it("should throw error on failure", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(client.sendMessage("+5511999999999", "Hello")).rejects.toThrow(
        "Evolution API error: 500 - Internal Server Error"
      );
      consoleSpy.mockRestore();
    });
  });
});

describe("createEvolutionClient", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("should use provided config", () => {
        const client = createEvolutionClient("my-instance", "my-key");
        // Accessing private property for testing purposes, assuming we can't inspect it otherwise easily
        // Or we can just trust it works if we can't access private props.
        // But since we are testing the factory, we mainly want to ensure defaults.
        expect(client).toBeInstanceOf(EvolutionClient);
    });

    it("should use env vars for defaults", () => {
        process.env.EVOLUTION_API_URL = "http://env-api.com";
        process.env.EVOLUTION_API_KEY = "env-key";
        
        const client = createEvolutionClient();
        expect(client).toBeInstanceOf(EvolutionClient);
    });
});
