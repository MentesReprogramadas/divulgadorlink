-- Resolve a WhatsApp reply by the exact sent message, scoped to its tenant.
CREATE INDEX "operational_messages_tenantId_providerMessageId_idx" ON "operational_messages"("tenantId", "providerMessageId");
