-- Match Prisma's text parameters without casting a fixed-width CHAR column.
ALTER TABLE "link_reports" ALTER COLUMN "reporterKey" TYPE VARCHAR(64) USING "reporterKey"::VARCHAR(64);
