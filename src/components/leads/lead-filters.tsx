"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Calendar as CalendarIcon, Filter } from "lucide-react";
import { TAG_LABELS, type LeadTag } from "@/types";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function LeadFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const initialSearch = searchParams.get("search") || "";
    const initialTag = searchParams.get("tag") || "all";
    const initialDate = searchParams.get("date") || "";
    const initialAiPotential = searchParams.get("aiPotential") || "all";

    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [date, setDate] = useState(initialDate);

    const updateFilters = (updates: { search?: string; tag?: string; date?: string; aiPotential?: string }) => {
        const params = new URLSearchParams(searchParams.toString());
        
        if (updates.search !== undefined) {
            if (updates.search) params.set("search", updates.search);
            else params.delete("search");
        }

        if (updates.tag !== undefined) {
            if (updates.tag && updates.tag !== "all") params.set("tag", updates.tag);
            else params.delete("tag");
        }

        if (updates.date !== undefined) {
            if (updates.date) params.set("date", updates.date);
            else params.delete("date");
        }

        if (updates.aiPotential !== undefined) {
            if (updates.aiPotential && updates.aiPotential !== "all") params.set("aiPotential", updates.aiPotential);
            else params.delete("aiPotential");
        }

        params.set("page", "1");
        router.push(`/leads?${params.toString()}`);
    };

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm !== initialSearch) {
                updateFilters({ search: searchTerm });
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, initialSearch]);

    const handleTagChange = (value: string) => {
        const newTag = initialTag === value ? "all" : value;
        updateFilters({ tag: newTag });
    };

    const handleTodayClick = () => {
        const today = new Date().toISOString().split("T")[0];
        if (date === today) {
            setDate("");
            updateFilters({ date: "" });
        } else {
            setDate(today);
            updateFilters({ date: today });
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setDate(newDate);
        updateFilters({ date: newDate });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou telefone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-10"
                    />
                </div>
                <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                    <Select 
                        value={initialAiPotential} 
                        onValueChange={(value) => updateFilters({ aiPotential: value })}
                    >
                        <SelectTrigger className="w-[140px] h-10">
                            <SelectValue placeholder="Potencial AI" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos Potenciais</SelectItem>
                            <SelectItem value="Alta">Alta</SelectItem>
                            <SelectItem value="Média">Média</SelectItem>
                            <SelectItem value="Baixa">Baixa</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button 
                        variant={date === new Date().toISOString().split("T")[0] ? "default" : "outline"}
                        onClick={handleTodayClick}
                        className="whitespace-nowrap"
                        size="sm"
                    >
                        Hoje
                    </Button>
                    <div className="relative">
                        <Input 
                            type="date" 
                            value={date}
                            onChange={handleDateChange}
                            className="h-10 w-[150px]"
                        />
                    </div>
                    {date && (
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setDate("");
                                updateFilters({ date: "" });
                            }}
                            title="Limpar data"
                            aria-label="Limpar data"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Quick Tag Filters */}
            <div className="flex flex-wrap gap-2 items-center pb-2 overflow-x-auto">
                <Button
                    variant={initialTag === "all" ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => handleTagChange("all")}
                >
                    Todos
                </Button>
                {Object.entries(TAG_LABELS).map(([value, label]) => (
                    <Button
                        key={value}
                        variant={initialTag === value ? "default" : "outline"}
                        size="sm"
                        className={cn(
                            "rounded-full transition-colors",
                            initialTag === value 
                                ? "bg-primary text-primary-foreground" 
                                : "hover:bg-muted"
                        )}
                        onClick={() => handleTagChange(value)}
                    >
                        {label}
                    </Button>
                ))}
            </div>
        </div>
    );
}
