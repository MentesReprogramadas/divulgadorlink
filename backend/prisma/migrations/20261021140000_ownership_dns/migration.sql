ALTER TABLE ownership_challenges ADD COLUMN method TEXT NOT NULL DEFAULT 'HTTPS_FILE';
ALTER TABLE ownership_challenges ADD CONSTRAINT ownership_method_check CHECK (method IN ('HTTPS_FILE', 'DNS_TXT'));
