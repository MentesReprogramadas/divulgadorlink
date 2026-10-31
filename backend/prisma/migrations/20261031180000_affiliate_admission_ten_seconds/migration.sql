-- Lower only the former default; explicitly longer waits remain unchanged.
ALTER TABLE affiliate_segments
 DROP CONSTRAINT "affiliate_segments_groupAutoApproveDelaySeconds_check",
 ADD CONSTRAINT "affiliate_segments_groupAutoApproveDelaySeconds_check"
 CHECK ("groupAutoApproveDelaySeconds" BETWEEN 10 AND 86400),
 ALTER COLUMN "groupAutoApproveDelaySeconds" SET DEFAULT 10;

WITH changed AS (
 UPDATE affiliate_segments SET "groupAutoApproveDelaySeconds" = 10
 WHERE "groupAutoApproveDelaySeconds" = 120 RETURNING id, "tenantId"
)
UPDATE affiliate_group_admissions AS admission
SET "eligibleAt" = admission."firstSeenAt" + INTERVAL '10 seconds'
FROM affiliate_groups AS groups, changed
WHERE admission."groupId" = groups.id AND admission."tenantId" = changed."tenantId"
 AND groups."segmentId" = changed.id AND groups."tenantId" = changed."tenantId"
 AND admission.state = 'PENDING';

-- Malformed stored configuration remains blocked by the existing validation.
DO $$
DECLARE setting RECORD; policy JSONB;
BEGIN
 FOR setting IN SELECT id, value FROM configs WHERE key = 'AFFILIATE_GROUP_POLICY_DEFAULTS' LOOP
  BEGIN
   policy := setting.value::jsonb;
  EXCEPTION WHEN invalid_text_representation THEN CONTINUE;
  END;
  IF policy->'autoApproveDelaySeconds' = '120'::jsonb THEN
   UPDATE configs SET value = jsonb_set(policy, '{autoApproveDelaySeconds}', '10'::jsonb)::text WHERE id = setting.id;
  END IF;
 END LOOP;
END $$;

UPDATE affiliate_groups AS groups SET "groupPolicyNextRunAt" = LEAST(groups."groupPolicyNextRunAt", CURRENT_TIMESTAMP)
FROM affiliate_segments AS segment
WHERE groups."segmentId" = segment.id AND groups."tenantId" = segment."tenantId"
 AND groups.enabled AND segment.enabled AND segment."groupPolicyEnabled"
 AND segment."groupAutoApproveDelaySeconds" = 10;
