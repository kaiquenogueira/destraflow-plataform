"use server";

import { getTenantContext } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createTemplateSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    content: z.string().min(10, "Conteúdo deve ter pelo menos 10 caracteres"),
});

const updateTemplateSchema = createTemplateSchema.partial().extend({
    id: z.string(),
});

export async function getTemplates() {
    const context = await getTenantContext();
    if (!context) return [];
    
    const templates = await context.tenantPrisma.template.findMany({
        orderBy: { createdAt: "desc" },
    });

    return templates;
}

export async function createTemplate(data: z.infer<typeof createTemplateSchema>) {
    const context = await getTenantContext();
    if (!context) throw new Error("Banco de dados não configurado");
    
    const validated = createTemplateSchema.parse(data);

    const template = await context.tenantPrisma.template.create({
        data: validated,
    });

    revalidatePath("/templates");
    return { success: true, template };
}

export async function updateTemplate(data: z.infer<typeof updateTemplateSchema>) {
    const context = await getTenantContext();
    if (!context) throw new Error("Banco de dados não configurado");
    
    const { id, ...updateData } = updateTemplateSchema.parse(data);

    await context.tenantPrisma.template.update({
        where: { id },
        data: updateData,
    });

    revalidatePath("/templates");
    return { success: true };
}

export async function deleteTemplate(id: string) {
    const context = await getTenantContext();
    if (!context) throw new Error("Banco de dados não configurado");
    
    await context.tenantPrisma.template.delete({
        where: { id },
    });

    revalidatePath("/templates");
    return { success: true };
}
