"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    getWhatsAppStatus,
    generateQRCode,
    disconnectWhatsApp,
    saveEvolutionConfig,
} from "@/actions/whatsapp";
import { Loader2, QrCode, Power, PowerOff, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function WhatsAppPage() {
    const [status, setStatus] = useState<{
        connected: boolean;
        state: string;
    } | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [instanceName, setInstanceName] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [savingConfig, setSavingConfig] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const result = await getWhatsAppStatus();
            setStatus({ connected: result.connected, state: result.state });

            if (result.state === "not_configured") {
                setShowConfig(true);
            }
        } catch {
            setStatus({ connected: false, state: "error" });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Auto-refresh every 10 seconds when generating QR
    useEffect(() => {
        if (qrCode) {
            const interval = setInterval(fetchStatus, 10000);
            return () => clearInterval(interval);
        }
    }, [qrCode, fetchStatus]);

    const handleGenerateQR = async () => {
        setGenerating(true);
        setQrCode(null);
        try {
            const result = await generateQRCode();
            if (result.success && result.qrCode?.base64) {
                setQrCode(result.qrCode.base64);
                toast.success("QR Code gerado! Escaneie com seu WhatsApp");
            } else {
                toast.error(result.error || "Erro ao gerar QR Code");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao gerar QR Code");
        } finally {
            setGenerating(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm("Tem certeza que deseja desconectar o WhatsApp?")) return;

        setDisconnecting(true);
        try {
            const result = await disconnectWhatsApp();
            if (result.success) {
                setStatus({ connected: false, state: "disconnected" });
                setQrCode(null);
                toast.success("WhatsApp desconectado");
            } else {
                toast.error(result.error || "Erro ao desconectar");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao desconectar");
        } finally {
            setDisconnecting(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!instanceName.trim()) {
            toast.error("Nome da instância é obrigatório");
            return;
        }

        setSavingConfig(true);
        try {
            await saveEvolutionConfig(instanceName, apiKey || undefined);
            toast.success("Configuração salva!");
            setShowConfig(false);
            fetchStatus();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao salvar");
        } finally {
            setSavingConfig(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">WhatsApp</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie sua conexão com o WhatsApp
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowConfig(!showConfig)}
                >
                    <Settings className="h-4 w-4" />
                </Button>
            </div>

            {/* Config Card */}
            {showConfig && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Configuração da Instância</CardTitle>
                        <CardDescription>
                            Configure sua conexão com a Evolution API
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="instanceName">Nome da Instância *</Label>
                            <Input
                                id="instanceName"
                                value={instanceName}
                                onChange={(e) => setInstanceName(e.target.value)}
                                placeholder="minha-instancia"
                                className="h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="apiKey">API Key (opcional)</Label>
                            <Input
                                id="apiKey"
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Sua API Key"
                                className="h-12"
                            />
                        </div>
                        <Button
                            onClick={handleSaveConfig}
                            disabled={savingConfig}
                            className="w-full h-12"
                        >
                            {savingConfig ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                "Salvar Configuração"
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Status Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        Status da Conexão
                        <Badge
                            variant={status?.connected ? "default" : "destructive"}
                            className={status?.connected ? "bg-green-500" : ""}
                        >
                            {status?.connected ? "Conectado" : "Desconectado"}
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        Estado: {status?.state || "Desconhecido"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {status?.connected ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center p-8 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center">
                                        <Power className="h-8 w-8 text-white" />
                                    </div>
                                    <p className="font-medium text-green-700 dark:text-green-400">
                                        WhatsApp conectado e pronto para uso!
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                className="w-full h-12"
                                onClick={handleDisconnect}
                                disabled={disconnecting}
                            >
                                {disconnecting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Desconectando...
                                    </>
                                ) : (
                                    <>
                                        <PowerOff className="mr-2 h-4 w-4" />
                                        Desconectar
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {qrCode ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="p-4 bg-white rounded-lg">
                                        <Image
                                            src={qrCode}
                                            alt="QR Code WhatsApp"
                                            width={256}
                                            height={256}
                                            className="rounded"
                                        />
                                    </div>
                                    <p className="text-sm text-muted-foreground text-center">
                                        Abra o WhatsApp no seu celular e escaneie o código acima
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={fetchStatus}
                                        className="w-full"
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Verificar Conexão
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    className="w-full h-14 text-lg"
                                    onClick={handleGenerateQR}
                                    disabled={generating || status?.state === "not_configured"}
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Gerando QR Code...
                                        </>
                                    ) : (
                                        <>
                                            <QrCode className="mr-2 h-5 w-5" />
                                            Gerar QR Code
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
