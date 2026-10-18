-- Bounded reconciliation scans open subscriptions and excludes recently queued reads.
CREATE INDEX "profile_subscriptions_status_updatedAt_idx" ON "profile_subscriptions"("status", "updatedAt");
CREATE INDEX "profile_billing_events_subscriptionId_kind_receivedAt_idx" ON "profile_billing_events"("subscriptionId", "kind", "receivedAt");
