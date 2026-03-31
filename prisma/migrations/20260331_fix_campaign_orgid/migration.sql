-- Fix orgId for records linked to campaigns that have NULL userId
-- These were missed by the previous migration because userId was NULL

-- Calls: get userId from their campaign owner
UPDATE "calls" cl
SET "userId" = c."userId", "orgId" = c."userId"
FROM "campaigns" c
WHERE cl."campaignId" = c."id"
  AND c."userId" IS NOT NULL
  AND (cl."userId" IS NULL OR cl."orgId" IS NULL OR cl."orgId" != c."userId");

-- Contacts: get userId from their campaign owner
UPDATE "contacts" ct
SET "userId" = c."userId", "orgId" = c."userId"
FROM "campaigns" c
WHERE ct."campaignId" = c."id"
  AND c."userId" IS NOT NULL
  AND (ct."userId" IS NULL OR ct."orgId" IS NULL OR ct."orgId" != c."userId");

-- Call demands: update via calls -> campaigns
UPDATE "call_demands" cd
SET "orgId" = c."userId"
FROM "calls" cl
JOIN "campaigns" c ON cl."campaignId" = c."id"
WHERE cd."callId" = cl."id"
  AND c."userId" IS NOT NULL
  AND cd."orgId" != c."userId";
