interface EvolutionConfig {
    baseUrl: string;
    apiKey: string;
    instanceName: string;
}

interface InstanceStatus {
    connected: boolean;
    state: string;
    phoneNumber?: string;
}

interface QRCodeResponse {
    base64: string;
    pairingCode?: string;
}

class EvolutionClient {
    private config: EvolutionConfig;

    constructor(config: EvolutionConfig) {
        this.config = config;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.config.baseUrl}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                apikey: this.config.apiKey,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Evolution API error: ${response.status} - ${error}`);
        }

        return response.json();
    }

    async getInstanceStatus(): Promise<InstanceStatus> {
        try {
            const data = await this.request<{ instance: { state: string }; }>(
                `/instance/connectionState/${this.config.instanceName}`
            );

            return {
                connected: data.instance?.state === "open",
                state: data.instance?.state || "disconnected",
            };
        } catch (error) {
            console.error("Error getting instance status:", error);
            return {
                connected: false,
                state: "error",
            };
        }
    }

    async generateQRCode(): Promise<QRCodeResponse | null> {
        try {
            // Primeiro, tenta criar a instância se não existir
            try {
                await this.request(`/instance/create`, {
                    method: "POST",
                    body: JSON.stringify({
                        instanceName: this.config.instanceName,
                        integration: "WHATSAPP-BAILEYS",
                    }),
                });
            } catch {
                // Instância já pode existir, ignorar erro
            }

            // Conectar e obter QR Code
            const data = await this.request<{ base64?: string; pairingCode?: string }>(
                `/instance/connect/${this.config.instanceName}`
            );

            if (data.base64) {
                return {
                    base64: data.base64,
                    pairingCode: data.pairingCode,
                };
            }

            return null;
        } catch (error) {
            console.error("Error generating QR code:", error);
            throw error;
        }
    }

    async disconnect(): Promise<boolean> {
        try {
            await this.request(`/instance/logout/${this.config.instanceName}`, {
                method: "DELETE",
            });
            return true;
        } catch (error) {
            console.error("Error disconnecting:", error);
            return false;
        }
    }

    async sendMessage(phone: string, text: string): Promise<boolean> {
        try {
            // Normalizar número de telefone
            const number = phone.replace(/\D/g, "");

            await this.request(`/message/sendText/${this.config.instanceName}`, {
                method: "POST",
                body: JSON.stringify({
                    number,
                    text,
                }),
            });

            return true;
        } catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
    }
}

export function createEvolutionClient(
    instanceName?: string,
    apiKey?: string
): EvolutionClient {
    return new EvolutionClient({
        baseUrl: process.env.EVOLUTION_API_URL || "http://localhost:8080",
        apiKey: apiKey || process.env.EVOLUTION_API_KEY || "",
        instanceName: instanceName || "default",
    });
}

export type { EvolutionClient, InstanceStatus, QRCodeResponse };
