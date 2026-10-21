CREATE TABLE webhook_endpoints (
 id TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
 url TEXT NOT NULL, "eventTypes" TEXT[] NOT NULL CHECK(cardinality("eventTypes") BETWEEN 1 AND 3 AND "eventTypes"<@ARRAY['contact.received','link.approved','campaign.ended']::text[]), enabled BOOLEAN NOT NULL DEFAULT true,
 secret TEXT NOT NULL, "previousSecret" TEXT, "previousUntil" TIMESTAMP(3),
 version INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(id,"tenantId","ownerId"),
 FOREIGN KEY ("ownerId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE
);
CREATE TABLE outbound_events (
 id TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
 type TEXT NOT NULL, "occurrenceKey" TEXT NOT NULL, "resourceId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("tenantId","ownerId","occurrenceKey"), UNIQUE(id,"tenantId","ownerId"),
 FOREIGN KEY ("ownerId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE
);
CREATE INDEX webhook_endpoints_owner_idx ON webhook_endpoints("tenantId","ownerId");
CREATE INDEX outbound_events_created_idx ON outbound_events("createdAt");
CREATE TABLE webhook_deliveries (
 id TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
 "eventId" TEXT NOT NULL, "endpointId" TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SENDING','DELIVERED','FAILED','CANCELLED')), attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 20),
 budget INTEGER NOT NULL DEFAULT 5 CHECK(budget BETWEEN 5 AND 20),
 "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "lockedUntil" TIMESTAMP(3), "leaseId" TEXT, "statusCode" INTEGER, "errorCode" TEXT,
 UNIQUE("eventId","endpointId"), UNIQUE(id,"tenantId","ownerId"),
 FOREIGN KEY ("eventId","tenantId","ownerId") REFERENCES outbound_events(id,"tenantId","ownerId") ON DELETE CASCADE,
 FOREIGN KEY ("endpointId","tenantId","ownerId") REFERENCES webhook_endpoints(id,"tenantId","ownerId") ON DELETE CASCADE
);
CREATE INDEX webhook_deliveries_due_idx ON webhook_deliveries(status,"nextAttemptAt");
CREATE INDEX webhook_deliveries_owner_idx ON webhook_deliveries("tenantId","ownerId","eventId");
CREATE TABLE webhook_attempts (
 "deliveryId" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
 number INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "statusCode" INTEGER, "errorCode" TEXT,
 PRIMARY KEY("deliveryId",number),
 FOREIGN KEY ("deliveryId","tenantId","ownerId") REFERENCES webhook_deliveries(id,"tenantId","ownerId") ON DELETE CASCADE
);

-- Source records already commit every occurrence. Triggers preserve the same transaction
-- across automatic/human approvals and prevent a crash gap before recording the outbox.
CREATE FUNCTION queue_platform_webhook(t TEXT,o TEXT,k TEXT,occurrence TEXT,resource TEXT) RETURNS void LANGUAGE plpgsql AS $$
DECLARE event_id TEXT;
BEGIN
 IF o IS NULL OR NOT EXISTS(SELECT 1 FROM webhook_endpoints WHERE "tenantId"=t AND "ownerId"=o AND enabled AND k=ANY("eventTypes")) THEN RETURN; END IF;
 INSERT INTO outbound_events(id,"tenantId","ownerId",type,"occurrenceKey","resourceId") VALUES(gen_random_uuid()::text,t,o,k,occurrence,resource)
 ON CONFLICT("tenantId","ownerId","occurrenceKey") DO NOTHING;
 SELECT id INTO event_id FROM outbound_events WHERE "tenantId"=t AND "ownerId"=o AND "occurrenceKey"=occurrence;
 INSERT INTO webhook_deliveries(id,"tenantId","ownerId","eventId","endpointId") SELECT gen_random_uuid()::text,t,o,event_id,id FROM webhook_endpoints WHERE "tenantId"=t AND "ownerId"=o AND enabled AND k=ANY("eventTypes") ON CONFLICT DO NOTHING;
END $$;
CREATE FUNCTION capture_platform_webhook() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o TEXT;
BEGIN
 IF TG_TABLE_NAME='contact_submissions' THEN
  SELECT "ownerId" INTO o FROM contact_forms WHERE id=NEW."formId" AND "tenantId"=NEW."tenantId";
  PERFORM queue_platform_webhook(NEW."tenantId",o,'contact.received','contact:'||NEW.id,NEW.id);
 ELSIF TG_TABLE_NAME='operational_messages' THEN
  IF NEW.kind='MODERATION_EMAIL' AND NEW.payload->>'outcome'='published' THEN
   SELECT "ownerId" INTO o FROM links WHERE id=NEW."resourceId" AND "tenantId"=NEW."tenantId";
   PERFORM queue_platform_webhook(NEW."tenantId",o,'link.approved','approval:'||NEW.id,NEW."resourceId");
  END IF;
 ELSIF TG_TABLE_NAME='campaign_pages' THEN
  IF OLD.state='PUBLISHED' AND NEW.state='ARCHIVED' THEN
   PERFORM queue_platform_webhook(NEW."tenantId",NEW."ownerId",'campaign.ended','campaign:'||NEW.id||':'||NEW.version,NEW.id);
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER contact_webhook_outbox AFTER INSERT ON contact_submissions FOR EACH ROW EXECUTE FUNCTION capture_platform_webhook();
CREATE TRIGGER approval_webhook_outbox AFTER INSERT ON operational_messages FOR EACH ROW EXECUTE FUNCTION capture_platform_webhook();
CREATE TRIGGER campaign_webhook_outbox AFTER UPDATE ON campaign_pages FOR EACH ROW EXECUTE FUNCTION capture_platform_webhook();
