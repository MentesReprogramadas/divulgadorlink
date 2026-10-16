CREATE INDEX links_related_niche_idx ON links ("tenantId", "nicheId", id) WHERE status='PUBLISHED';
CREATE INDEX links_related_network_idx ON links ("tenantId", "networkId", id) WHERE status='PUBLISHED';
