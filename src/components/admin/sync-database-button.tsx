"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Database, Check, AlertTriangle } from "lucide-react";
import { syncTenantDatabase } from "@/actions/tenant-sync";
import { toast } from "sonner";

interface SyncDatabaseButtonProps {
  userId: string;
  hasDatabaseUrl: boolean;
}

export function SyncDatabaseButton({ userId, hasDatabaseUrl }: SyncDatabaseButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    if (!hasDatabaseUrl) {
      toast.error("Usuário sem URL de banco de dados configurada");
      return;
    }

    setLoading(true);
    try {
      const result = await syncTenantDatabase(userId);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(`Erro: ${result.message}`);
        console.error(result.details);
      }
    } catch (error) {
      toast.error("Erro ao tentar sincronizar");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!hasDatabaseUrl) {
    return (
      <Button variant="outline" size="sm" disabled title="Configure a URL do banco primeiro">
        <Database className="mr-2 h-4 w-4 text-muted-foreground" />
        Sincronizar DB
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSync} 
      disabled={loading}
      className="border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:hover:bg-blue-950 dark:hover:text-blue-300"
      title="Executa 'prisma db push' no banco do cliente para criar/atualizar tabelas"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Database className="mr-2 h-4 w-4" />
      )}
      Sincronizar Schema
    </Button>
  );
}
