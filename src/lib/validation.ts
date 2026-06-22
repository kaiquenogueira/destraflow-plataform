import { z } from "zod";

/**
 * Regras de validação compartilhadas entre o formulário (`"use client"`) e a
 * Server Action (`"use server"`) de cada domínio.
 *
 * Plain-TS sem diretiva (`use client`/`use server`/`server-only`) — importável
 * pelos DOIS lados da costura (precedente: `src/lib/phone.ts`). As regras
 * LOAD-BEARING (janela de agendamento de campanha e regex de telefone) têm dono
 * único aqui para não divergirem entre client e server, como já vinha acontecendo
 * (mesma lógica, mensagens divergentes).
 *
 * Concerns server-only NÃO vivem aqui: `xss()` (sanitização de conteúdo) e
 * `canonicalizePhone()` continuam na action. Aqui mora só a FORMA da validação.
 */

/** Nome de entidade (lead, campanha, template). */
export const nameSchema = z.string().min(2, "Nome deve ter pelo menos 2 caracteres");

/**
 * Telefone em forma E.164-ish (com `+` opcional, 11–15 dígitos). LOAD-BEARING:
 * porteiro antes de `canonicalizePhone`. A canonicalização real fica em `phone.ts`.
 */
export const phoneSchema = z
    .string()
    .regex(/^\+?[1-9]\d{10,14}$/, "Telefone inválido (ex: +5511999999999)");

/** Conteúdo mínimo do template de uma campanha. */
export const campaignTemplateSchema = z.string().min(10, "Template deve ter pelo menos 10 caracteres");

/** Conteúdo mínimo de um template salvo. */
export const templateContentSchema = z.string().min(10, "Conteúdo deve ter pelo menos 10 caracteres");

/**
 * Janela mínima de agendamento de campanha (regra de negócio LOAD-BEARING).
 * 9.5 min garante ~10 min no futuro com margem para latência/borda de ms.
 */
export const SCHEDULE_MIN_LEAD_MS = 9.5 * 60 * 1000;

export const SCHEDULE_ERROR_MESSAGE =
    "A campanha deve ser agendada com no mínimo 10 minutos de antecedência";

/**
 * `true` se a data está suficientemente no futuro. Datas inválidas/ausentes
 * (`new Date("")` → `NaN`) retornam `false` — porteiro de empty no lado client.
 */
export function isScheduledFarEnough(date: Date): boolean {
    return date.getTime() > Date.now() + SCHEDULE_MIN_LEAD_MS;
}
