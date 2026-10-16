CREATE TABLE profiles (
 id TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 "ownerId" TEXT NOT NULL, slug TEXT NOT NULL,
 name TEXT NOT NULL, bio TEXT NOT NULL DEFAULT '', "avatarAssetId" TEXT,
 "requiresAge" BOOLEAN NOT NULL DEFAULT false, "primaryItemId" TEXT,
 version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
 "publishedVersion" INTEGER, publication JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT profiles_owner_fk FOREIGN KEY ("ownerId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE,
 CONSTRAINT profiles_tenant_slug_key UNIQUE ("tenantId",slug),
 CONSTRAINT profiles_tenant_owner_key UNIQUE ("tenantId","ownerId"),
 CONSTRAINT profiles_identity_key UNIQUE (id,"tenantId","ownerId"),
 CONSTRAINT profiles_slug_check CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' AND slug NOT LIKE '%--%'),
 CONSTRAINT profiles_publication_check CHECK ((publication IS NULL AND "publishedVersion" IS NULL) OR (publication IS NOT NULL AND "publishedVersion" IS NOT NULL AND "publishedVersion" >= 0 AND "publishedVersion" <= version))
);
CREATE TABLE profile_categories (
 id TEXT NOT NULL, "profileId" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
 name TEXT NOT NULL, visible BOOLEAN NOT NULL, position INTEGER NOT NULL CHECK(position >= 0),
 PRIMARY KEY ("profileId",id),
 CONSTRAINT profile_categories_profile_fk FOREIGN KEY ("profileId","tenantId","ownerId") REFERENCES profiles(id,"tenantId","ownerId") ON DELETE CASCADE,
 CONSTRAINT profile_categories_position_key UNIQUE ("profileId",position)
);
CREATE TABLE profile_items (
 id TEXT NOT NULL, "profileId" TEXT NOT NULL, "categoryId" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
 type TEXT NOT NULL CHECK(type IN ('URL','CATALOG','SOCIAL')), label TEXT NOT NULL, destination TEXT NOT NULL, "linkId" TEXT,
 visible BOOLEAN NOT NULL, position INTEGER NOT NULL CHECK(position >= 0),
 PRIMARY KEY ("profileId",id),
 CONSTRAINT profile_items_profile_fk FOREIGN KEY ("profileId","tenantId","ownerId") REFERENCES profiles(id,"tenantId","ownerId") ON DELETE CASCADE,
 CONSTRAINT profile_items_category_fk FOREIGN KEY ("profileId","categoryId") REFERENCES profile_categories("profileId",id) ON DELETE CASCADE,
 CONSTRAINT profile_items_link_fk FOREIGN KEY ("linkId","tenantId") REFERENCES links(id,"tenantId") ON DELETE CASCADE,
 CONSTRAINT profile_items_destination_check CHECK ((type = 'CATALOG' AND "linkId" IS NOT NULL AND "linkId" = destination) OR (type <> 'CATALOG' AND "linkId" IS NULL)),
 CONSTRAINT profile_items_position_key UNIQUE ("profileId",position)
);
CREATE TABLE profile_assets (
 id TEXT NOT NULL, "tenantId" TEXT NOT NULL, "ownerId" TEXT NOT NULL, bytes BYTEA NOT NULL CHECK(octet_length(bytes) <= 262144),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("tenantId","ownerId",id),
 CONSTRAINT profile_assets_owner_fk FOREIGN KEY ("ownerId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE
);
