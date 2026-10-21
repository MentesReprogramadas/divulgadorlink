ALTER TABLE contact_submissions ADD COLUMN status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW','IN_PROGRESS','DONE')),
 ADD COLUMN version INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "firstHandledAt" TIMESTAMP(3),
 ADD COLUMN "sourceSlug" TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX contact_submissions_id_tenant_key ON contact_submissions(id,"tenantId");
CREATE INDEX contact_submissions_status_idx ON contact_submissions("formId",status,id);
UPDATE contact_submissions s SET "sourceSlug"=p.slug FROM contact_forms f JOIN profiles p ON p.id=f."profileId" AND p."tenantId"=f."tenantId" WHERE s."formId"=f.id AND s."tenantId"=f."tenantId";
CREATE FUNCTION capture_contact_origin() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 SELECT p.slug INTO NEW."sourceSlug" FROM contact_forms f JOIN profiles p ON p.id=f."profileId" AND p."tenantId"=f."tenantId" WHERE f.id=NEW."formId" AND f."tenantId"=NEW."tenantId";
 RETURN NEW;
END $$;
CREATE TRIGGER contact_origin BEFORE INSERT ON contact_submissions FOR EACH ROW EXECUTE FUNCTION capture_contact_origin();
CREATE TABLE contact_notes (
 id TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "contactId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
 text TEXT NOT NULL CHECK(char_length(text) BETWEEN 1 AND 2000),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY("contactId","tenantId") REFERENCES contact_submissions(id,"tenantId") ON DELETE CASCADE
);
CREATE INDEX contact_notes_contact_idx ON contact_notes("contactId","createdAt",id);
CREATE TABLE contact_history (
 "contactId" TEXT NOT NULL,"tenantId" TEXT NOT NULL,version INTEGER NOT NULL,
 "actorId" TEXT NOT NULL,kind TEXT NOT NULL,"fromStatus" TEXT,"toStatus" TEXT,"noteId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY("contactId",version),
 FOREIGN KEY("contactId","tenantId") REFERENCES contact_submissions(id,"tenantId") ON DELETE CASCADE
);
