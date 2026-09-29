CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "links" ADD COLUMN "embedding" vector(1536);

CREATE INDEX "links_embedding_hnsw_idx" ON "links" USING hnsw ("embedding" vector_cosine_ops);
