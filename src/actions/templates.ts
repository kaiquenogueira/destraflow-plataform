"use server";

import { requireTenantContext, getOptionalTenantContext } from "@/lib/tenant";
import type { Prisma } from "@/generated/prisma/tenant";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import xss from "xss";
import { nameSchema, templateContentSchema } from "@/lib/validation";

const createTemplateSchema = z.object({
    name: nameSchema,
    content: templateContentSchema,
});

const updateTemplateSchema = createTemplateSchema.partial().extend({
    id: z.string(),
});

export async function getTemplates() {
    const context = await getOptionalTenantContext();
    if (!context) return [];
    
    const templates = await context.tenantPrisma.template.findMany({
        orderBy: { createdAt: "desc" },
    });

    return templates;
}

export async function createTemplate(data: z.infer<typeof createTemplateSchema>) {
    const context = await requireTenantContext();
    
    const validated = createTemplateSchema.parse(data);

    const template = await context.tenantPrisma.template.create({
        data: {
            name: validated.name,
            content: xss(validated.content),
        },
    });

    revalidatePath("/templates");
    return { success: true, template };
}

export async function updateTemplate(data: z.infer<typeof updateTemplateSchema>) {
    const context = await requireTenantContext();
    
    const { id, content, ...updateData } = updateTemplateSchema.parse(data);

    const dataToUpdate: Prisma.TemplateUpdateInput = { ...updateData };
    if (content) {
        dataToUpdate.content = xss(content);
    }

    await context.tenantPrisma.template.update({
        where: { id },
        data: dataToUpdate,
    });

    revalidatePath("/templates");
    return { success: true };
}

export async function deleteTemplate(id: string) {
    const context = await requireTenantContext();
    
    await context.tenantPrisma.template.delete({
        where: { id },
    });

    revalidatePath("/templates");
    return { success: true };
}
