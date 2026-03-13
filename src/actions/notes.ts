"use server";

import { getTenantContext } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createNoteSchema = z.object({
    leadId: z.string(),
    content: z.string().min(1, "A nota não pode estar vazia").max(2000, "Máximo de 2000 caracteres"),
});

export async function createNote(data: z.infer<typeof createNoteSchema>) {
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;
    const validated = createNoteSchema.parse(data);

    const note = await (tenantPrisma as any).leadNote.create({
        data: {
            leadId: validated.leadId,
            content: validated.content,
        },
    });

    revalidatePath(`/leads/${validated.leadId}`);
    return { success: true, note };
}

export async function getNotesByLeadId(leadId: string) {
    const validId = z.string().parse(leadId);
    const context = await getTenantContext();
    if (!context) {
        return [];
    }
    const { tenantPrisma } = context;

    const notes = await (tenantPrisma as any).leadNote.findMany({
        where: { leadId: validId },
        orderBy: { createdAt: "desc" },
    });

    return notes;
}

export async function deleteNote(id: string, leadId: string) {
    const validId = z.string().parse(id);
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

    await (tenantPrisma as any).leadNote.delete({
        where: { id: validId },
    });

    revalidatePath(`/leads/${leadId}`);
    return { success: true };
}
