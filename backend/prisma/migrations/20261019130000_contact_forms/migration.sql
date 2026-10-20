CREATE TABLE contact_forms (
 id TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "profileId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 0 CHECK(version>=0),
 UNIQUE("profileId"), UNIQUE("profileId","tenantId","ownerId"), UNIQUE(id,"tenantId"),
 FOREIGN KEY("profileId","tenantId","ownerId") REFERENCES profiles(id,"tenantId","ownerId") ON DELETE CASCADE
);
CREATE TABLE contact_form_revisions (
 id TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "formId" TEXT NOT NULL, number INTEGER NOT NULL CHECK(number>0),
 definition JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("formId",number), UNIQUE(id,"tenantId"),
 FOREIGN KEY("formId","tenantId") REFERENCES contact_forms(id,"tenantId") ON DELETE CASCADE
);
CREATE TABLE contact_submissions (
 id TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "formId" TEXT NOT NULL, "revisionId" TEXT NOT NULL,
 "requestKey" TEXT NOT NULL, fingerprint TEXT NOT NULL, answers JSONB NOT NULL, "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL,
 UNIQUE("formId","requestKey"),
 FOREIGN KEY("formId","tenantId") REFERENCES contact_forms(id,"tenantId") ON DELETE CASCADE,
 FOREIGN KEY("revisionId","tenantId") REFERENCES contact_form_revisions(id,"tenantId") ON DELETE CASCADE
);
CREATE INDEX contact_submissions_page_idx ON contact_submissions("formId",id);
CREATE INDEX contact_submissions_expiry_idx ON contact_submissions("expiresAt");
CREATE TABLE contact_rate_buckets (
 key TEXT PRIMARY KEY, "formId" TEXT NOT NULL REFERENCES contact_forms(id) ON DELETE CASCADE,
 count INTEGER NOT NULL CHECK(count>0), "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX contact_rate_expiry_idx ON contact_rate_buckets("expiresAt");
