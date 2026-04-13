"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { importLeadsFromCSV, type ImportResult } from "@/actions/leads";
import {
    Upload,
    Download,
    FileSpreadsheet,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import * as XLSX from "xlsx";

// Mapeamento de cabeçalhos PT → campo interno (acento-insensitive)
const HEADER_MAP: Record<string, string> = {
    nome: "name",
    name: "name",
    telefone: "phone",
    phone: "phone",
    celular: "phone",
    whatsapp: "phone",
    interesse: "interest",
    interest: "interest",
    etapa: "tag",
    tag: "tag",
    status: "tag",
    fase: "tag",
};

// Cabeçalhos obrigatórios (pelo menos um de cada grupo deve existir)
const REQUIRED_HEADERS = {
    name: ["nome", "name"],
    phone: ["telefone", "phone", "celular", "whatsapp"],
};

interface ParsedLead {
    name: string;
    phone: string;
    interest?: string;
    tag?: string;
}

type ImportStep = "upload" | "preview" | "importing" | "result";

function normalizeHeaderKey(raw: string): string {
    return raw
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function validateHeaders(rawHeaders: string[]): { valid: boolean; missing: string[] } {
    const normalized = rawHeaders.map(normalizeHeaderKey);
    const missing: string[] = [];

    // Verificar se tem pelo menos uma coluna de "name"
    const hasName = REQUIRED_HEADERS.name.some((h) => normalized.includes(h));
    if (!hasName) missing.push("nome");

    // Verificar se tem pelo menos uma coluna de "phone"
    const hasPhone = REQUIRED_HEADERS.phone.some((h) => normalized.includes(h));
    if (!hasPhone) missing.push("telefone");

    return { valid: missing.length === 0, missing };
}

function mapRowToLead(row: Record<string, string>): ParsedLead {
    const lead: Partial<ParsedLead> = {};

    for (const [rawKey, value] of Object.entries(row)) {
        const normalizedKey = normalizeHeaderKey(rawKey);
        const mappedField = HEADER_MAP[normalizedKey];
        if (mappedField && value) {
            (lead as Record<string, string>)[mappedField] = value.trim();
        }
    }

    return lead as ParsedLead;
}

export function LeadImport() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<ImportStep>("upload");
    const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
    const [fileName, setFileName] = useState("");
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const resetState = () => {
        setStep("upload");
        setParsedLeads([]);
        setFileName("");
        setResult(null);
        setImporting(false);
        setDragOver(false);
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) resetState();
        setOpen(isOpen);
    };

    const downloadTemplate = () => {
        const csvContent =
            "nome,telefone,interesse,etapa\n" +
            "João Silva,+5511999999999,Investimentos,NEW\n" +
            "Maria Santos,+5521988888888,Seguros,QUALIFICATION\n" +
            "Pedro Souza,(11) 97777-7777,Consultoria,PROSPECTING\n";

        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "template_leads_destraflow.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

    const processRows = useCallback((headers: string[], rows: Record<string, string>[], file: File) => {
        // Validar cabeçalhos obrigatórios
        const headerValidation = validateHeaders(headers);
        if (!headerValidation.valid) {
            toast.error(
                `Cabeçalhos obrigatórios não encontrados: ${headerValidation.missing.join(", ")}. ` +
                `Verifique se sua planilha possui as colunas "nome" e "telefone".`
            );
            return;
        }

        if (rows.length === 0) {
            toast.error("Arquivo vazio ou sem dados válidos");
            return;
        }

        // Mapear para formato interno
        const mapped = rows.map(mapRowToLead);

        // Filtrar linhas completamente vazias
        const validLeads = mapped.filter((l) => l.name || l.phone);

        if (validLeads.length === 0) {
            toast.error("Nenhum dado válido encontrado após processar o arquivo.");
            return;
        }

        setFileName(file.name);
        setParsedLeads(validLeads);
        setStep("preview");
    }, []);

    const parseCSV = useCallback((file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: "UTF-8",
            complete: (results) => {
                const headers = results.meta.fields || [];
                processRows(headers, results.data as Record<string, string>[], file);
            },
            error: (error) => {
                toast.error(`Erro ao ler CSV: ${error.message}`);
            },
        });
    }, [processRows]);

    const parseXLSX = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "array" });

                // Usar primeira aba
                const sheetName = workbook.SheetNames[0];
                if (!sheetName) {
                    toast.error("Planilha vazia — nenhuma aba encontrada.");
                    return;
                }

                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
                    defval: "",
                    raw: false,
                });

                if (jsonData.length === 0) {
                    toast.error("Planilha vazia ou sem dados válidos.");
                    return;
                }

                // Extrair cabeçalhos da primeira linha
                const headers = Object.keys(jsonData[0] || {});
                processRows(headers, jsonData, file);
            } catch (err) {
                toast.error("Erro ao processar arquivo XLSX. Verifique se o arquivo não está corrompido.");
            }
        };
        reader.onerror = () => {
            toast.error("Erro ao ler o arquivo.");
        };
        reader.readAsArrayBuffer(file);
    }, [processRows]);

    const parseFile = useCallback((file: File) => {
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Arquivo muito grande. Máximo 5MB.");
            return;
        }

        const isCSV = file.name.endsWith(".csv") ||
            file.type === "text/csv" ||
            file.type === "text/plain";

        const isXLSX = file.name.endsWith(".xlsx") ||
            file.name.endsWith(".xls") ||
            file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            file.type === "application/vnd.ms-excel";

        if (!isCSV && !isXLSX) {
            toast.error("Formato não suportado. Use .csv ou .xlsx");
            return;
        }

        if (isCSV) {
            parseCSV(file);
        } else {
            parseXLSX(file);
        }
    }, [parseCSV, parseXLSX]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) parseFile(file);
    };

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) parseFile(file);
        },
        [parseFile]
    );

    const handleImport = async () => {
        setImporting(true);
        setStep("importing");

        try {
            const importResult = await importLeadsFromCSV(parsedLeads);
            setResult(importResult);
            setStep("result");

            if (importResult.imported > 0) {
                toast.success(`${importResult.imported} lead(s) importado(s) com sucesso!`);
                router.refresh();
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao importar leads");
            setStep("preview");
        } finally {
            setImporting(false);
        }
    };

    const previewLeads = parsedLeads.slice(0, 5);
    const hasMoreLeads = parsedLeads.length > 5;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                    <Upload className="h-4 w-4" />
                    Importar Planilha
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Importar Leads
                    </DialogTitle>
                    <DialogDescription>
                        Importe seus leads a partir de um arquivo CSV ou XLSX
                    </DialogDescription>
                </DialogHeader>

                {/* STEP: UPLOAD */}
                {step === "upload" && (
                    <div className="space-y-4">
                        {/* Dropzone */}
                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragOver(true);
                            }}
                            onDragLeave={() => setDragOver(false)}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                                transition-all duration-200
                                ${
                                    dragOver
                                        ? "border-primary bg-primary/5 scale-[1.02]"
                                        : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                                }
                            `}
                        >
                            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                            <p className="text-sm font-medium">
                                Arraste seu arquivo aqui ou clique para selecionar
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Formatos: .csv, .xlsx • Máximo: 5MB • Até 5.000 leads
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>

                        {/* Template download */}
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                            <div className="flex items-center gap-2">
                                <Download className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Template de Exemplo</p>
                                    <p className="text-xs text-muted-foreground">
                                        Baixe o modelo com os cabeçalhos corretos
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
                                <Download className="h-3.5 w-3.5" />
                                Baixar CSV
                            </Button>
                        </div>

                        {/* Campos obrigatórios */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2">
                                Cabeçalhos obrigatórios na planilha:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                <Badge variant="default" className="text-xs">
                                    nome *
                                </Badge>
                                <Badge variant="default" className="text-xs">
                                    telefone *
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    interesse
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    etapa
                                </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2">
                                * Obrigatórios. O telefone será normalizado para +55 automaticamente.
                                Etapas aceitas: Novo, Qualificação, Prospecção, Ligação, Reunião, Retorno, Perdido, Cliente.
                                Duplicados já existentes na base serão ignorados.
                            </p>
                        </div>
                    </div>
                )}

                {/* STEP: PREVIEW */}
                {step === "preview" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{fileName}</span>
                            </div>
                            <Badge variant="secondary">{parsedLeads.length} leads encontrados</Badge>
                        </div>

                        <div className="border rounded-md overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Telefone</TableHead>
                                        <TableHead>Interesse</TableHead>
                                        <TableHead>Etapa</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewLeads.map((lead, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="text-sm">
                                                {lead.name || (
                                                    <span className="text-red-500 text-xs">
                                                        <XCircle className="inline h-3 w-3 mr-1" />
                                                        Vazio
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm font-mono">
                                                {lead.phone || (
                                                    <span className="text-red-500 text-xs">
                                                        <XCircle className="inline h-3 w-3 mr-1" />
                                                        Vazio
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {lead.interest || "-"}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {lead.tag ? (
                                                    <Badge variant="outline" className="text-xs">
                                                        {lead.tag}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-xs text-muted-foreground">
                                                        NEW
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {hasMoreLeads && (
                                <div className="px-4 py-2 bg-muted/30 text-center text-xs text-muted-foreground border-t">
                                    ... e mais {parsedLeads.length - 5} leads
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={resetState}>
                                <X className="mr-2 h-4 w-4" />
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleImport}
                                disabled={importing}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                Importar {parsedLeads.length} Leads
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP: IMPORTING */}
                {step === "importing" && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <div className="text-center">
                            <p className="font-medium">Importando leads...</p>
                            <p className="text-sm text-muted-foreground">
                                Processando {parsedLeads.length} registros
                            </p>
                        </div>
                    </div>
                )}

                {/* STEP: RESULT */}
                {step === "result" && result && (
                    <div className="space-y-4">
                        {/* Summary cards */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
                                <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-600" />
                                <p className="text-lg font-bold text-green-700 dark:text-green-400">
                                    {result.imported}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-500">Importados</p>
                            </div>
                            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 text-center">
                                <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
                                <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
                                    {result.skipped}
                                </p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-500">Duplicados</p>
                            </div>
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center">
                                <XCircle className="h-5 w-5 mx-auto mb-1 text-red-600" />
                                <p className="text-lg font-bold text-red-700 dark:text-red-400">
                                    {result.errors.length}
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-500">Erros</p>
                            </div>
                        </div>

                        {/* Error details */}
                        {result.errors.length > 0 && (
                            <div className="border rounded-md max-h-[200px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[60px]">Linha</TableHead>
                                            <TableHead className="w-[80px]">Campo</TableHead>
                                            <TableHead>Erro</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {result.errors.slice(0, 20).map((err, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-xs font-mono">{err.row}</TableCell>
                                                <TableCell className="text-xs">{err.field}</TableCell>
                                                <TableCell className="text-xs text-red-500">{err.message}</TableCell>
                                            </TableRow>
                                        ))}
                                        {result.errors.length > 20 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                                                    ... e mais {result.errors.length - 20} erros
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        <Button className="w-full" onClick={() => handleClose(false)}>
                            Fechar
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
