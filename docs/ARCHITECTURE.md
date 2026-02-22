# DestraFlow Architecture Principles

## 1. Webhooks & Messaging Events

**Forbidden Component:** Direct Webhook Endpoints for Messaging
**Reason:** All conversational logic, message syncs, and delivery lifecycle events are managed through our standalone **N8N integration**. 

**Rule:**
- **DO NOT** implement `[POST] /api/webhook/*` endpoints in the Next.js application to receive WhatsApp or Evolution API events.
- If you need to manipulate message status, use the database or rely on N8N to write to the database directly. The Next.js app should rely strictly on the database as the source of truth for message histories, without passively listening to vendor webhooks.

## 2. API Design & Authentication
- Next.js API Routes must be protected by NextAuth or specific rate limiting where strictly necessary.
