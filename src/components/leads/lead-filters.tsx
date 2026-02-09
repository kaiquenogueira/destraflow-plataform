"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { TAG_LABELS } from "@/types";
import { useState, useEffect } from "react";

export function LeadFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const initialSearch = searchParams.get("search") || "";
    const initialTag = searchParams.get("tag") || "all";

    const [searchTerm, setSearchTerm] = useState(initialSearch);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm !== initialSearch) {
                const params = new URLSearchParams(searchParams.toString());
                if (searchTerm) {
                    params.set("search", searchTerm);
                } else {
                    params.delete("search");
                }
                params.set("page", "1");
                router.push(`/leads?${params.toString()}`);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, router, searchParams, initialSearch]);

    const handleTagChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== "all") {
            params.set("tag", value);
        } else {
            params.delete("tag");
        }
        params.set("page", "1");
        router.push(`/leads?${params.toString()}`);
    };

    return (
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nome ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12"
                />
            </div>
            <div className="w-full sm:w-[200px]">
                <Select value={initialTag} onValueChange={handleTagChange}>
                    <SelectTrigger className="h-12 w-full">
                        <SelectValue placeholder="Todas as tags" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as tags</SelectItem>
                        {Object.entries(TAG_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
