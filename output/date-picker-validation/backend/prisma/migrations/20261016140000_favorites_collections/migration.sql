CREATE UNIQUE INDEX users_id_tenantId_key ON users (id,"tenantId");
CREATE TABLE favorites (
 id TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "userId" TEXT NOT NULL, "linkId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT favorites_owner_fk FOREIGN KEY ("userId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE,
 CONSTRAINT favorites_link_fk FOREIGN KEY ("linkId","tenantId") REFERENCES links(id,"tenantId") ON DELETE CASCADE,
 CONSTRAINT favorites_owner_link_key UNIQUE ("tenantId","userId","linkId"),
 CONSTRAINT favorites_identity_key UNIQUE (id,"tenantId","userId")
);
CREATE INDEX favorites_owner_page_idx ON favorites("tenantId","userId",id);
CREATE TABLE collections (
 id TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "userId" TEXT NOT NULL, name TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT collections_owner_fk FOREIGN KEY ("userId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE,
 CONSTRAINT collections_identity_key UNIQUE (id,"tenantId","userId"),
 CONSTRAINT collections_name_check CHECK (char_length(name) BETWEEN 1 AND 80),
 CONSTRAINT collections_version_check CHECK (version >= 0)
);
CREATE INDEX collections_owner_page_idx ON collections("tenantId","userId",id);
CREATE TABLE collection_items (
 "collectionId" TEXT NOT NULL, "favoriteId" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 position INTEGER NOT NULL CHECK (position >= 0),
 PRIMARY KEY ("collectionId","favoriteId"),
 CONSTRAINT collection_items_collection_fk FOREIGN KEY ("collectionId","tenantId","userId") REFERENCES collections(id,"tenantId","userId") ON DELETE CASCADE,
 CONSTRAINT collection_items_favorite_fk FOREIGN KEY ("favoriteId","tenantId","userId") REFERENCES favorites(id,"tenantId","userId") ON DELETE CASCADE,
 CONSTRAINT collection_items_position_key UNIQUE ("collectionId",position) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX collection_items_favorite_idx ON collection_items("favoriteId");
