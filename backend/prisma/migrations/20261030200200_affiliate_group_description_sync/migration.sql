ALTER TABLE affiliate_groups ADD COLUMN "groupDescriptionAppliedHash" TEXT;
CREATE INDEX affiliate_groups_policy_due_idx ON affiliate_groups(enabled,"groupPolicyNextRunAt");
