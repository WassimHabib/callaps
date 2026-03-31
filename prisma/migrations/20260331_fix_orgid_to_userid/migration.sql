-- Migration: fix orgId values after Clerk-to-custom-auth migration
-- Previously orgId was set to Clerk organization IDs.
-- Now orgId should equal userId (each user is their own org).

-- Tables with both userId and orgId: set orgId = userId

-- agents
UPDATE "agents" SET "orgId" = "userId"
WHERE "userId" IS NOT NULL AND ("orgId" IS NULL OR "orgId" != "userId");

-- campaigns
UPDATE "campaigns" SET "orgId" = "userId"
WHERE "userId" IS NOT NULL AND ("orgId" IS NULL OR "orgId" != "userId");

-- contacts
UPDATE "contacts" SET "orgId" = "userId"
WHERE "userId" IS NOT NULL AND ("orgId" IS NULL OR "orgId" != "userId");

-- calls
UPDATE "calls" SET "orgId" = "userId"
WHERE "userId" IS NOT NULL AND ("orgId" IS NULL OR "orgId" != "userId");

-- webhook_configs
UPDATE "webhook_configs" SET "orgId" = "userId"
WHERE "userId" IS NOT NULL AND ("orgId" IS NULL OR "orgId" != "userId");

-- phone_numbers
UPDATE "phone_numbers" SET "orgId" = "userId"
WHERE "userId" IS NOT NULL AND ("orgId" != "userId");

-- appointments
UPDATE "appointments" SET "orgId" = "userId"
WHERE "userId" IS NOT NULL AND ("orgId" IS NULL OR "orgId" != "userId");

-- company_profiles
UPDATE "company_profiles" SET "orgId" = "userId"
WHERE "userId" IS NOT NULL AND ("orgId" != "userId");

-- api_keys
UPDATE "api_keys" SET "orgId" = "userId"
WHERE "userId" IS NOT NULL AND ("orgId" != "userId");

-- cloned_voices (uses createdBy instead of userId)
UPDATE "cloned_voices" SET "orgId" = "createdBy"
WHERE "createdBy" IS NOT NULL AND ("orgId" != "createdBy");

-- call_demands: update via join with calls table
UPDATE "call_demands" cd
SET "orgId" = c."userId"
FROM "calls" c
WHERE cd."callId" = c."id"
  AND c."userId" IS NOT NULL
  AND cd."orgId" != c."userId";

-- weekly_reports: update via matching orgId to a user
-- These had orgId = clerkOrgId; we need to find which user owned that org.
-- Since agents had the same orgId, we can match via agents table.
UPDATE "weekly_reports" wr
SET "orgId" = a."userId"
FROM (SELECT DISTINCT "orgId" AS old_org, "userId" FROM "agents" WHERE "userId" IS NOT NULL) a
WHERE wr."orgId" = a.old_org
  AND wr."orgId" != a."userId";

-- subscriptions: same approach via agents
UPDATE "subscriptions" s
SET "orgId" = a."userId"
FROM (SELECT DISTINCT "orgId" AS old_org, "userId" FROM "agents" WHERE "userId" IS NOT NULL) a
WHERE s."orgId" = a.old_org
  AND s."orgId" != a."userId";

-- invoices: same approach via agents
UPDATE "invoices" i
SET "orgId" = a."userId"
FROM (SELECT DISTINCT "orgId" AS old_org, "userId" FROM "agents" WHERE "userId" IS NOT NULL) a
WHERE i."orgId" = a.old_org
  AND i."orgId" != a."userId";

-- admin_clients: update clientOrgId to match the client's user ID
UPDATE "admin_clients" SET "clientOrgId" = "clientId"
WHERE "clientOrgId" != "clientId";
